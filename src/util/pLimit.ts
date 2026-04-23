// Minimal semaphore-style concurrency limiter.
// Returns a wrapped scheduler: queued promises run at most `n` at once.
export function pLimit(n: number): <T>(fn: () => Promise<T>) => Promise<T> {
  if (n <= 0) throw new Error("pLimit requires n >= 1");
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= n) return;
    const run = queue.shift();
    if (run) run();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(
          (v) => { active--; resolve(v); next(); },
          (e) => { active--; reject(e); next(); }
        );
      };
      queue.push(run);
      next();
    });
}
