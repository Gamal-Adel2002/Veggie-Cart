import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function storeFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/store${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useStoreStatus() {
  return useQuery<{ open: boolean }>({
    queryKey: ["/api/store/status"],
    queryFn: () => storeFetch("/status"),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useStoreSettings() {
  return useQuery<{ schedule: Record<string, { enabled: boolean; startTime: string; endTime: string }> }>({
    queryKey: ["/api/store/settings"],
    queryFn: () => storeFetch("/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    { schedule: Record<string, { enabled: boolean; startTime: string; endTime: string }> },
    Error,
    { schedule: Record<string, { enabled: boolean; startTime: string; endTime: string }> }
  >({
    mutationFn: (data) =>
      storeFetch("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/status"] });
    },
  });
}
