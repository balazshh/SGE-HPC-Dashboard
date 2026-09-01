import { useEffect, useState } from "react";

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    setError(null);
    setLoading(true);

    void fetch(path, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
      })
      .then((nextData) => {
        if (!controller.signal.aborted) setData(nextData);
      })
      .catch((nextError) => {
        if (!controller.signal.aborted && !(nextError instanceof DOMException && nextError.name === "AbortError")) {
          setError(nextError instanceof Error ? nextError.message : "Request failed");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [path]);

  return { data, error, loading };
}
