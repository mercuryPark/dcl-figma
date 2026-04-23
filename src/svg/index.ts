// SVG export pipeline. pLimit(10) concurrency + hard cap 100.
// Attaches the resulting svg string onto the corresponding extracted node's `svg` field,
// or sets `svgExportFailed: true` when a single export fails.

import type { AnyNode } from "../schema";
import { pLimit } from "../util/pLimit";
import { exportNodeSvg } from "./export";
import { isSvgCandidate } from "./filter";

export const SVG_CAP = 100;
export const SVG_CONCURRENCY = 10;

export interface SvgRunResult {
  exported: number;
  failed: number;
  capped: number;
}

export async function runSvgExport(
  candidates: ReadonlyArray<{ node: SceneNode; out: AnyNode }>,
  opts: { enabled: boolean } = { enabled: false }
): Promise<SvgRunResult> {
  if (!opts.enabled) return { exported: 0, failed: 0, capped: 0 };

  const matched = candidates.filter((c) => isSvgCandidate(c.node));
  const chosen = matched.slice(0, SVG_CAP);
  const capped = matched.length - chosen.length;

  const limit = pLimit(SVG_CONCURRENCY);
  let exported = 0;
  let failed = 0;

  await Promise.all(
    chosen.map((c) =>
      limit(async () => {
        const res = await exportNodeSvg(c.node);
        const target = c.out as { svg?: string; svgExportFailed?: boolean };
        if (res.failed) {
          target.svgExportFailed = true;
          failed++;
        } else if (res.svg) {
          target.svg = res.svg;
          exported++;
        }
      })
    )
  );

  return { exported, failed, capped };
}
