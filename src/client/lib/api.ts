import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiOptions {
  refreshMs?: number;
}

const REQUEST_TIMEOUT_MS = 30_000;

export function useApi<T>(path: string, { refreshMs = 0 }: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const dataRef = useRef<T | null>(null);

  const refetch = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let retryCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const clearTimer = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const schedule = (delay: number) => {
      clearTimer();
      if (refreshMs <= 0 || document.visibilityState !== "visible" || disposed) return;
      timer = setTimeout(() => void request(true), delay);
    };

    const request = async (background: boolean) => {
      if (disposed || inFlight) return;
      inFlight = true;
      const requestController = new AbortController();
      controller = requestController;
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        requestController.abort();
      }, REQUEST_TIMEOUT_MS);
      const hasData = dataRef.current !== null;

      if (background || hasData) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetch(path, {
          cache: "no-store",
          credentials: "include",
          signal: requestController.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${response.status}`);
        }

        const nextData = await response.json() as T;
        if (disposed) return;
        dataRef.current = nextData;
        setData(nextData);
        retryCount = 0;
        schedule(refreshMs);
      } catch (nextError) {
        if (disposed || (requestController.signal.aborted && !timedOut)) return;
        setError(timedOut ? "Request timed out" : nextError instanceof Error ? nextError.message : "Request failed");
        retryCount += 1;
        const retryDelay = refreshMs > 0
          ? Math.min(refreshMs * 2 ** Math.min(retryCount, 4), 15 * 60_000)
          : 0;
        if (retryDelay > 0) schedule(retryDelay);
      } finally {
        clearTimeout(timeout);
        if (!disposed) {
          inFlight = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const onVisibilityChange = () => {
      clearTimer();
      if (document.visibilityState === "visible") void request(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (refreshMs <= 0 || document.visibilityState === "visible") void request(false);

    return () => {
      disposed = true;
      clearTimer();
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [path, refreshMs, requestVersion]);

  return { data, error, loading, refreshing, refetch };
}
