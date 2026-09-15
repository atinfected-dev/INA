import { prisma } from '@ina/db';
import {
  ACHIEVEMENT_CATEGORIES,
  SUBJECT_METRIC_KEYS,
  METRIC_LABELS,
  TIER_ORDER,
  slugify,
  unitForMetric,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementTier,
  type MetricKey,
  type TierStep,
} from '@ina/core';
import { loadSubjectMetrics } from './achievement-metrics';
import type { RecordEntry } from './records';
import type { HallOfFameHolder } from './hall-of-fame';
import { CLASS_NAMES, formatAmount, formatNumber } from './wow';

/**
 * Content officers add themselves.
 *
 * Both kinds ride on the machinery the built-in content uses. A custom
 * achievement is a row naming a metric and its steps and is evaluated by the
 * same function as the forty in code; a computed record is "the highest value
 * of a metric" over the same per-person numbers. Nothing here has a query of
 * its own, which is what keeps an officer's entry as honest as a built-in one.
 *
 * Manual records are the exception and are marked as such: a first-kill date
 * or a guild event is real history the logs cannot know, and the reader is
 * told that a person, not a log, is the source.
 */

export const CUSTOM_PREFIX = 'custom:';

export class ContentError extends Error {}

const HOUR = 3_600_000;

function isMetric(value: string): value is MetricKey {
  return (SUBJECT_METRIC_KEYS as string[]).includes(value);
}

function isCategory(value: string): value is AchievementCategory {
  return value in ACHIEVEMENT_CATEGORIES;
}

function isTier(value: unknown): value is AchievementTier {
  return typeof value === 'string' && (TIER_ORDER as readonly string[]).includes(value);
}

/** Steps stored as JSON are checked, never trusted, before they reach the evaluator. */
function parseSteps(raw: unknown): TierStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: TierStep[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { tier, threshold } = item as { tier?: unknown; threshold?: unknown };
    if (!isTier(tier) || typeof threshold !== 'number' || !Number.isFinite(threshold)) continue;
    steps.push({ tier, threshold });
  }
  return steps.sort((a, b) => a.threshold - b.threshold);
}

// --- Achievements ------------------------------------------------------------

export interface CustomAchievementRow extends AchievementDefinition {
  createdAt: Date;
}

export async function loadCustomAchievements(): Promise<CustomAchievementRow[]> {
  const rows = await prisma.customAchievement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const definitions: CustomAchievementRow[] = [];
  for (const row of rows) {
    if (!isMetric(row.metric) || !isCategory(row.category)) continue;
    const steps = parseSteps(row.steps);
    if (steps.length === 0) continue;
    definitions.push({
      id: CUSTOM_PREFIX + row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      metric: row.metric,
      unit: unitForMetric(row.metric),
      steps,
      createdAt: row.createdAt,
    });
  }
  return definitions;
}

export interface NewAchievement {
  name: string;
  description: string;
  category: string;
  metric: string;
  /** Threshold per tier, in the unit a person would type: hours for time metrics. */
  thresholds: Partial<Record<AchievementTier, string>>;
}

export async function createCustomAchievement(input: NewAchievement): Promise<void> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2) throw new ContentError('Der Name ist zu kurz.');
  if (description.length < 4) throw new ContentError('Die Beschreibung fehlt.');
  if (!isCategory(input.category)) throw new ContentError('Unbekannte Kategorie.');
  if (!isMetric(input.metric)) throw new ContentError('Unbekannte Kennzahl.');

  const unit = unitForMetric(input.metric);
  const steps: TierStep[] = [];
  for (const tier of TIER_ORDER) {
    const raw = input.thresholds[tier]?.trim();
    if (!raw) continue;
    const typed = Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(typed) || typed <= 0) {
      throw new ContentError(`Die Schwelle für ${tier} ist keine Zahl.`);
    }
    steps.push({ tier, threshold: unit === 'hours' ? typed * HOUR : typed });
  }
  if (steps.length === 0) throw new ContentError('Mindestens eine Stufe braucht eine Schwelle.');

  // Tiers must climb: a Silver below Bronze would award the wrong tier
  // without ever failing loudly.
  for (let i = 1; i < steps.length; i += 1) {
    if (steps[i]!.threshold <= steps[i - 1]!.threshold) {
      throw new ContentError('Die Schwellen müssen von Stufe zu Stufe steigen.');
    }
  }

  await prisma.customAchievement.create({
    data: {
      name,
      description,
      category: input.category,
      metric: input.metric,
      unit,
      steps: steps as unknown as object,
    },
  });
}

export async function deleteCustomAchievement(id: string): Promise<void> {
  await prisma.customAchievement.deleteMany({ where: { id } });
}

// --- Records ---------------------------------------------------------------

export interface CustomRecordRow {
  id: string;
  label: string;
  formula: string;
  metric: string | null;
  value: string | null;
  holder: string | null;
  holderClass: string | null;
  context: string | null;
  createdAt: Date;
}

export async function listCustomRecords(): Promise<CustomRecordRow[]> {
  return prisma.customRecord.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      formula: true,
      metric: true,
      value: true,
      holder: true,
      holderClass: true,
      context: true,
      createdAt: true,
    },
  });
}

function formatMetricValue(value: number, metric: MetricKey): string {
  const unit = unitForMetric(metric);
  if (unit === 'hours') return `${formatNumber(Math.floor(value / HOUR))} Std.`;
  if (unit === 'amount') return formatAmount(value);
  return formatNumber(value);
}

/** Custom records as the records page shows them, computed where they can be. */
export async function loadCustomRecords(): Promise<RecordEntry[]> {
  const rows = await listCustomRecords();
  if (rows.length === 0) return [];

  const needsMetrics = rows.some((row) => row.metric !== null);
  const subjects = needsMetrics ? await loadSubjectMetrics() : [];

  return rows.map((row): RecordEntry => {
    const key = CUSTOM_PREFIX + row.id;

    if (row.metric !== null && isMetric(row.metric)) {
      const metric = row.metric;
      // Lower is better for exactly one metric; everything else is a maximum.
      const lowerIsBetter = metric === 'firstNightIndex';
      const candidates = subjects.filter((s) => s.metrics[metric] > 0);
      const best = candidates.sort((a, b) =>
        lowerIsBetter ? a.metrics[metric] - b.metrics[metric] : b.metrics[metric] - a.metrics[metric],
      )[0];

      return {
        key,
        label: row.label,
        formula: `${row.formula} (${METRIC_LABELS[metric]}, pro Person über alle Charaktere.)`,
        value: best ? formatMetricValue(best.metrics[metric], metric) : '—',
        holder: best?.name ?? null,
        holderClass: best?.className ?? null,
        context: row.context,
        ...(best ? {} : { unavailable: 'Noch niemand hat hier einen Wert.' }),
      };
    }

    return {
      key,
      label: row.label,
      formula: `${row.formula} — manuell eingetragen, nicht aus den Logs berechnet.`,
      value: row.value ?? '—',
      holder: row.holder,
      holderClass: row.holderClass,
      context: row.context,
    };
  });
}

export interface NewRecord {
  label: string;
  formula: string;
  metric: string;
  value: string;
  holder: string;
  holderClass: string;
  context: string;
}

export async function createCustomRecord(input: NewRecord): Promise<void> {
  const label = input.label.trim();
  const formula = input.formula.trim();
  if (label.length < 2) throw new ContentError('Die Bezeichnung ist zu kurz.');
  if (formula.length < 4) throw new ContentError('Die Erklärung fehlt.');

  const metric = input.metric.trim();
  if (metric !== '' && !isMetric(metric)) throw new ContentError('Unbekannte Kennzahl.');

  const value = input.value.trim();
  const holder = input.holder.trim();
  const holderClass = input.holderClass.trim();
  if (metric === '' && value === '') {
    throw new ContentError('Ohne Kennzahl braucht ein Rekord einen eingetragenen Wert.');
  }
  if (holderClass !== '' && !(CLASS_NAMES as readonly string[]).includes(holderClass)) {
    throw new ContentError('Unbekannte Klasse.');
  }

  await prisma.customRecord.create({
    data: {
      label,
      formula,
      metric: metric === '' ? null : metric,
      unit: metric === '' ? null : unitForMetric(metric as MetricKey),
      value: metric === '' ? value : null,
      holder: metric === '' && holder !== '' ? holder : null,
      holderClass: metric === '' && holderClass !== '' ? holderClass : null,
      context: input.context.trim() === '' ? null : input.context.trim(),
    },
  });
}

export async function deleteCustomRecord(id: string): Promise<void> {
  await prisma.customRecord.deleteMany({ where: { id } });
}

// --- Hall of Fame titles ---------------------------------------------------

/** A stable id from the title, made unique against the ones that exist. */
export function titleId(title: string, existing: readonly string[]): string {
  const base = slugify(title) || 'titel';
  let candidate = base;
  let n = 2;
  while (existing.includes(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

// --- Manual Hall of Fame titles ----------------------------------------------

export interface CustomTitleRow {
  id: string;
  title: string;
  subtitle: string;
  holder: string;
  holderClass: string | null;
  note: string | null;
  createdAt: Date;
}

export async function listCustomTitles(): Promise<CustomTitleRow[]> {
  return prisma.customTitle.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      holder: true,
      holderClass: true,
      note: true,
      createdAt: true,
    },
  });
}

/**
 * Manual titles in the shape the Hall of Fame renders.
 *
 * No value and exactly one holder: a title given by hand has no number to
 * show and cannot be tied. The note takes the value's place on the plaque
 * ("verliehen 2026", "seit dem ersten Abend").
 */
export async function loadManualTitles(): Promise<HallOfFameHolder[]> {
  const rows = await listCustomTitles();
  return rows.map((row) => ({
    title: {
      id: CUSTOM_PREFIX + row.id,
      title: row.title,
      subtitle: row.subtitle,
      metric: 'manual',
      direction: 'highest',
    },
    name: row.holder,
    className: row.holderClass,
    value: null,
    tiedWith: [{ name: row.holder, className: row.holderClass }],
    unit: 'count',
    note: row.note ?? 'Von der Gilde verliehen',
  }));
}

export interface NewTitle {
  title: string;
  subtitle: string;
  holder: string;
  holderClass: string;
  note: string;
}

export async function createCustomTitle(input: NewTitle): Promise<void> {
  const title = input.title.trim();
  const subtitle = input.subtitle.trim();
  const holder = input.holder.trim();
  const holderClass = input.holderClass.trim();
  if (title.length < 2) throw new ContentError('Der Titel ist zu kurz.');
  if (subtitle.length < 4) throw new ContentError('Die Begründung fehlt — wofür gibt es den Titel?');
  if (holder.length < 2) throw new ContentError('Ein Titel braucht einen Träger.');
  if (holderClass !== '' && !(CLASS_NAMES as readonly string[]).includes(holderClass)) {
    throw new ContentError('Unbekannte Klasse.');
  }

  await prisma.customTitle.create({
    data: {
      title,
      subtitle,
      holder,
      holderClass: holderClass === '' ? null : holderClass,
      note: input.note.trim() === '' ? null : input.note.trim(),
    },
  });
}

export async function deleteCustomTitle(id: string): Promise<void> {
  await prisma.customTitle.deleteMany({ where: { id } });
}
