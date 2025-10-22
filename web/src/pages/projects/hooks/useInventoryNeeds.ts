// @ts-nocheck
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";

export function useInventoryNeeds(projectId: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const json = await apiGet(`/api/projects/${projectId}/inventory/needs`);
    setData(json);
  }
  async function recompute(needs: any[]) {
    await apiPost(`/api/projects/${projectId}/inventory/recompute`, { needs });
    await refresh();
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const json = await apiGet(`/api/projects/${projectId}/inventory/needs`);
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load inventory needs");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  return { data, loading, error, recompute, refresh };
}