// Self-documenting meta builder used by both Slim and Full dumps.

import { HOW_TO_USE, SCHEMA_URL, SCHEMA_VERSION, TOOL_ID, type Meta } from "./schema";

// Version is injected at build time from package.json. For dev we accept a default.
const VERSION = "0.1.0";

export interface MetaInput {
  fileKey: string | null;
  fileName: string;
  pageId: string;
  pageName: string;
  stats: Meta["stats"];
  degraded?: string[];
}

export function buildMeta(input: MetaInput): Meta {
  return {
    fileKey: input.fileKey,
    fileName: input.fileName,
    pageId: input.pageId,
    pageName: input.pageName,
    tool: `${TOOL_ID}@${VERSION}`,
    generatedAt: new Date().toISOString(),
    degraded: input.degraded ?? [],
    stats: input.stats
  };
}

export function buildEnvelopeHeader() {
  return {
    $schema: SCHEMA_URL,
    schemaVersion: SCHEMA_VERSION,
    _howToUse: HOW_TO_USE
  };
}
