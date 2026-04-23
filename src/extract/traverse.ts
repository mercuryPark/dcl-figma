// Async DFS traversal with a 50-node yield cadence.
// Each visit hands the raw SceneNode to a dispatcher callback.

export interface TraverseOptions {
  includeHidden: boolean;
  yieldEvery: number;
  onNodeCount?: (n: number) => void;
  shouldCancel?: () => boolean;
}

const YIELD = () => new Promise<void>((r) => setTimeout(r, 0));

export async function traverseAsync(
  roots: readonly SceneNode[],
  visit: (node: SceneNode, depth: number) => Promise<void>,
  opts: TraverseOptions
): Promise<number> {
  let counter = 0;
  let cancelled = false;
  const yieldEvery = opts.yieldEvery > 0 ? opts.yieldEvery : 50;

  async function walk(node: SceneNode, depth: number): Promise<void> {
    if (cancelled) return;
    if (opts.shouldCancel?.()) { cancelled = true; return; }
    if (!opts.includeHidden && node.visible === false) return;

    await visit(node, depth);
    counter++;
    if (opts.onNodeCount && counter % 10 === 0) opts.onNodeCount(counter);
    if (counter % yieldEvery === 0) await YIELD();

    const children = (node as unknown as { children?: readonly SceneNode[] }).children;
    if (children && children.length) {
      for (const c of children) {
        if (cancelled) return;
        await walk(c, depth + 1);
      }
    }
  }

  for (const r of roots) {
    if (cancelled) break;
    await walk(r, 0);
  }
  if (opts.onNodeCount) opts.onNodeCount(counter);
  return counter;
}
