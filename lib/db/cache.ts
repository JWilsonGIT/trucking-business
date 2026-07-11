// Tiny invalidation bus — the async analog of teamplan's Store version+listeners.
// Any mutation calls invalidate(); every mounted useQuery re-runs its fetcher.
let version = 0;
const listeners = new Set<() => void>();

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getVersion(): number {
  return version;
}

export function getServerVersion(): number {
  return 0;
}

export function invalidate() {
  version += 1;
  listeners.forEach((l) => l());
}
