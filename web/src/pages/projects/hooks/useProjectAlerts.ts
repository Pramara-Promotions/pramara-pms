import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../../lib/api.js";

export function useProjectAlerts(projectId: number) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(projectId)) return;
    setLoading(true);
    setError(null);
    try {
      const alerts = await apiGet(`/api/projects/${projectId}/alerts?openOnly=true`);
      setCount(Array.isArray(alerts) ? alerts.length : 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { count, loading, error, reload: load };
}