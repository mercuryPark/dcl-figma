// Per-node SVG export wrapper. Failures are caught so the surrounding pipeline
// can continue producing a dump even when some vectors choke.

export interface SvgExportResult {
  svg?: string;
  failed: boolean;
}

export async function exportNodeSvg(node: SceneNode): Promise<SvgExportResult> {
  try {
    // `format: "SVG_STRING"` returns a string directly per Figma API contract.
    // The sandbox lacks TextDecoder, so we never try to decode a byte buffer here.
    const anyNode = node as unknown as {
      exportAsync: (opts: { format: string }) => Promise<string>;
    };
    const svg = await anyNode.exportAsync({ format: "SVG_STRING" });
    if (typeof svg !== "string") return { failed: true };
    return { svg, failed: false };
  } catch (err) {
    console.warn("[svg/export] failed for", node.id, err);
    return { failed: true };
  }
}
