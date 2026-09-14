import { graphql } from './generated/gql';

/**
 * Every Warcraft Logs operation used by this project.
 *
 * These are validated against the committed schema at codegen time, so a typo
 * or an invented field breaks the build rather than a production import.
 */

export const RateLimitDocument = graphql(`
query RateLimit {
  rateLimitData {
    limitPerHour
    pointsSpentThisHour
    pointsResetIn
  }
}
`);

/**
 * Expansions, raids, bosses and difficulties all come from the API so a new
 * Classic expansion needs a sync run, not a code change. Note that Expansion
 * carries no start/end dates - those are derived from report timestamps.
 */
export const GuildByNameDocument = graphql(`
query GuildByName($name: String!, $serverSlug: String!, $serverRegion: String!) {
  guildData {
    guild(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
      id
      name
      faction {
        id
        name
      }
      server {
        id
        name
        slug
        region {
          id
          slug
          name
        }
      }
    }
  }
}
`);

export const WorldReferenceDocument = graphql(`
query WorldReference {
  worldData {
    expansions {
      id
      name
      zones {
        id
        name
        frozen
        difficulties {
          id
          name
          sizes
        }
        partitions {
          id
          name
          compactName
          default
        }
        encounters {
          id
          name
          journalID
        }
      }
    }
  }
}
`);

/**
 * Report discovery. `startTime` is a UNIX timestamp in milliseconds; incremental
 * syncs pass the newest known report start minus an overlap window, so logs
 * uploaded late are still picked up.
 * Fights plus the actor table they reference.
 *
 * ReportFight.startTime/endTime are offsets in milliseconds RELATIVE TO the
 * report start - absolute time is report.startTime + fight.startTime.
 *
 * friendlyPlayers, friendlySpecs and friendlyItemLevels are parallel arrays
 * indexed in lockstep; friendlyPlayers holds actor ids that resolve against
 * masterData.actors.
 */
export const GuildReportsDocument = graphql(`
query GuildReports(
  $guildName: String!
  $guildServerSlug: String!
  $guildServerRegion: String!
  $startTime: Float
  $endTime: Float
  $limit: Int
  $page: Int
) {
  reportData {
    reports(
      guildName: $guildName
      guildServerSlug: $guildServerSlug
      guildServerRegion: $guildServerRegion
      startTime: $startTime
      endTime: $endTime
      limit: $limit
      page: $page
    ) {
      total
      per_page
      current_page
      last_page
      has_more_pages
      data {
        code
        title
        startTime
        endTime
        revision
        visibility
        zone {
          id
          name
        }
        owner {
          id
          name
        }
      }
    }
  }
}
`);

/**
 * Aggregated per-fight tables. The API returns untyped JSON here, so the shape
 * is validated at runtime in the importer rather than by codegen.
 */
export const ReportFightsDocument = graphql(`
query ReportFights($code: String!, $killType: KillType) {
  reportData {
    report(code: $code) {
      code
      title
      startTime
      endTime
      revision
      segments
      visibility
      region {
        slug
      }
      guild {
        id
        name
        faction {
          name
        }
        server {
          slug
          region {
            slug
          }
        }
      }
      zone {
        id
        name
        expansion {
          id
          name
        }
      }
      masterData {
        logVersion
        gameVersion
        actors(type: "Player") {
          id
          name
          server
          type
          subType
          gameID
        }
      }
      fights(killType: $killType) {
        id
        name
        encounterID
        difficulty
        size
        kill
        startTime
        endTime
        bossPercentage
        fightPercentage
        lastPhase
        averageItemLevel
        hardModeLevel
        completeRaid
        inProgress
        wipeCalledTime
        friendlyPlayers
        friendlySpecs
        friendlyItemLevels
      }
    }
  }
}
`);

/**
 * Parse percentiles. Warcraft Logs only ranks kills, so wipes return nothing.
 */
export const ReportTableDocument = graphql(`
query ReportTable($code: String!, $dataType: TableDataType!, $fightIDs: [Int]) {
  reportData {
    report(code: $code) {
      code
      table(dataType: $dataType, fightIDs: $fightIDs, killType: All)
    }
  }
}
`);

export const ReportRankingsDocument = graphql(`
query ReportRankings(
  $code: String!
  $fightIDs: [Int]
  $playerMetric: ReportRankingMetricType
  $timeframe: RankingTimeframeType
) {
  reportData {
    report(code: $code) {
      code
      rankings(fightIDs: $fightIDs, playerMetric: $playerMetric, timeframe: $timeframe)
    }
  }
}
`);

/**
 * Reports for a zone, without a guild filter.
 *
 * Used to obtain a real report for development and verification before the
 * guild is configured, and later as a fallback when a guild's logs were
 * uploaded to personal rather than guild logs.
 */
export const ReportsByZoneDocument = graphql(`
query ReportsByZone($zoneID: Int!, $limit: Int, $page: Int) {
  reportData {
    reports(zoneID: $zoneID, limit: $limit, page: $page) {
      total
      has_more_pages
      data {
        code
        title
        startTime
        endTime
        revision
        zone { id name }
        guild { id name server { slug region { slug } } }
      }
    }
  }
}
`);

/**
 * Deaths for a whole report, with the actor table needed to resolve them.
 *
 * Each entry carries the fight it belongs to, so one call per report yields
 * per-fight deaths without any time matching. `killingBlow` names the ability
 * explicitly — the cause never has to be inferred from the damage breakdown.
 */
export const ReportDeathsDocument = graphql(`
query ReportDeaths($code: String!, $fightIDs: [Int]) {
  reportData {
    report(code: $code) {
      code
      startTime
      region { slug }
      masterData {
        actors(type: "Player") {
          id
          name
          server
        }
      }
      table(dataType: Deaths, fightIDs: $fightIDs, killType: All)
    }
  }
}
`);

/**
 * Damage taken for a single fight, with the actor table to resolve it.
 *
 * Deliberately one fight per call: the endpoint sums several fights together
 * and offers no per-fight breakdown, so asking for a whole night would give a
 * total that could only be split up by guessing.
 */
export const ReportDamageTakenDocument = graphql(`
query ReportDamageTaken($code: String!, $fightIDs: [Int]) {
  reportData {
    report(code: $code) {
      code
      region { slug }
      masterData {
        actors(type: "Player") {
          id
          name
          server
        }
      }
      table(dataType: DamageTaken, fightIDs: $fightIDs, killType: All)
    }
  }
}
`);
