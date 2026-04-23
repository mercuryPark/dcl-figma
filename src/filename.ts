// Deterministic file name builder: figma.{fileSlug}.{pageSlug}.{slim|full}.json

import { slugify } from "./util/slugify";

export function buildFilename(args: {
  fileName: string;
  pageName: string | null;  // null => "all"
  kind: "slim" | "full";
}): string {
  const fileSlug = slugify(args.fileName) || "untitled";
  const pageSlug = args.pageName === null ? "all" : (slugify(args.pageName) || "page");
  return `figma.${fileSlug}.${pageSlug}.${args.kind}.json`;
}
