import { useEffect, useState } from "react";

export function useStations(projectId: number) {
  const [stations, setStations] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/stations`, { credentials: 'include' })
      .then(r => r.json())
      .then(setStations)
      .catch(() => setStations([]));
  }, [projectId]);
  return { stations };
}