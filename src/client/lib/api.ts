import { useEffect, useState } from "react";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setData(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(path, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${response.status}`);
        }

        setData(await response.json() as T);
      } catch (nextError) {
        if (!(nextError instanceof DOMException && nextError.name === "AbortError")) {
          setError(nextError instanceof Error ? nextError.message : "Request failed");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [path]);

  return { data, error, loading };
}
