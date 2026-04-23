// Slim degradation ladder.
// Each step re-runs toSlim() with tighter options and appends a marker string.

import type { DesignFull, DesignSlim } from "../schema";
import { toSlim } from "./toSlim";

export const DEGRADE_MARKERS = {
  textSummary: "textSummary:20->10",
  sectionTree: "sectionTree:3->2",
  tokens: "tokens:dropped"
} as const;

export interface DegradeStep {
  id: keyof typeof DEGRADE_MARKERS;
  marker: string;
  apply: (full: DesignFull) => DesignSlim;
}

export const DEGRADE_LADDER: DegradeStep[] = [
  {
    id: "textSummary",
    marker: DEGRADE_MARKERS.textSummary,
    apply: (full) =>
      toSlim(full, { textSummaryLimit: 10, sectionDepthLimit: 3, includeTokens: true })
  },
  {
    id: "sectionTree",
    marker: DEGRADE_MARKERS.sectionTree,
    apply: (full) =>
      toSlim(full, { textSummaryLimit: 10, sectionDepthLimit: 2, includeTokens: true })
  },
  {
    id: "tokens",
    marker: DEGRADE_MARKERS.tokens,
    apply: (full) =>
      toSlim(full, { textSummaryLimit: 10, sectionDepthLimit: 2, includeTokens: false })
  }
];
