# Forever talent data

One file per class, compiled by a one-off script from the dataset of
**[Deradon/wow-forever-talent-calc](https://github.com/Deradon/wow-forever-talent-calc)**
(MIT License, Copyright (c) 2026 Deradon). The compiled files keep only what
the calculator needs: rendered rank texts, positions, prerequisites, and a
status against the Classic Era baseline.

What the upstream project says about its data, and what therefore holds here:

- Forever talents were read from the BlizzCon 2026 demo stream, one hovered
  tooltip at a time. Only rank 1 was ever on screen; ranks 2+ are scaled from
  the matching Classic Era talent (`caveats: ["ranks"]`).
- A few readings sit below the upstream confidence threshold
  (`caveats: ["reading"]`).
- The rules — 51 points, 5 per row, first point at level 10 — are Classic's,
  assumed for Forever.
- One talent is missing (mage, Fire, row 1 column 3): it was never hovered.
- The Classic Era baseline is client build 1.15.9.69722.

`status` per talent: `new` (no Classic counterpart), `changed` (text or rank
count differs; the Classic text is kept in `classic`), `moved` (same text,
other cell), `unchanged`. Classic-only talents appear in the `classic` trees
with `status: "removed"`.

Talent names, descriptions and icons are Blizzard Entertainment's and are not
covered by the MIT license. Named icons load from Blizzard's render CDN; the
72 icons without a canonical name are the upstream video crops, stored under
`public/talent-icons/`.
