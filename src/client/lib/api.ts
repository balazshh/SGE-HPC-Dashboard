import { useEffect, useState } from "react";

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setData(null);
    setError(null);
    setLoading(true);

    fetch(path, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${response.status}`);
        }

        return response.json() as Promise<T>;
      })
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Request failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, error, loading };
}
