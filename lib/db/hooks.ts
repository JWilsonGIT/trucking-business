"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { subscribe, getVersion, getServerVersion, invalidate } from "./cache";

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch `fn()` and re-run it whenever the cache is invalidated (any mutation).
 * `key` identifies the query for the effect dependency; keep it stable.
 */
export function useQuery<T>(key: string, fn: () => Promise<T>): QueryState<T> & {
  refetch: () => void;
} {
  const v = useSyncExternalStore(subscribe, getVersion, getServerVersion);
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState((p) => ({ ...p, loading: true, error: null }));
    fn()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (alive)
          setState({
            data: undefined,
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);

  const refetch = useCallback(() => invalidate(), []);
  return { ...state, refetch };
}

/** Wrap an async mutation; on success invalidate the cache so queries refetch. */
export function useMutation<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: A): Promise<T> => {
      setPending(true);
      setError(null);
      try {
        const result = await fn(...args);
        invalidate();
        return result;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { mutate, pending, error };
}
