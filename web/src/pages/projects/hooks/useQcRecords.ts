// @ts-nocheck
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";

export function useQcRecords(projectId: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const json = await apiGet(`/api/projects/${projectId}/qc`);
    setData(json);
  }
  async function add(record: any) {
    await apiPost(`/api/projects/${projectId}/qc`, record);
    await refresh();
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const json = await apiGet(`/api/projects/${projectId}/qc`);
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load QC");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  return { data, loading, error, add, refresh };
}