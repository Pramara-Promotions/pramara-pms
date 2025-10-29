// web/src/pages/projects/tabs/OverviewTab.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useProjectAlerts } from "../hooks/useProjectAlerts";
import { useProjectContext } from "../ProjectContext";
import { apiGet } from "../../../lib/api.js";

type Project = {
  id: number;
  code: string;
  name: string;
  status?: string | null;
  quantity?: number | null; // if present
};

export default function OverviewTab() {
  const project = useProjectContext();
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  const { count, loading } = useProjectAlerts(project?.id);

  // Compute total order quantity from SKUs
  const [skuQty, setSkuQty] = useState<number | null>(null);
  const [skuLoading, setSkuLoading] = useState<boolean>(true);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setSkuLoading(true);
        const rows: any[] = await apiGet(`/api/projects/${project.id}/skus`);
        const total = Array.isArray(rows)
          ? rows.reduce((sum, r) => sum + Number(r.orderQty || 0), 0)
          : 0;
        if (alive) setSkuQty(total);
      } catch (_e) {
        if (alive) setSkuQty(null);
      } finally {
        if (alive) setSkuLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [project.id]);

  return (
    <div className="space-y-4">
      {/* Summary cards (Pantone removed from project level) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Open alerts">{loading ? "…" : count}</Card>

        <Card title="Quantity">
          {skuLoading ? "…" : skuQty ?? "—"}
        </Card>

        <Card title="Status">
          {project?.status ?? "—"}
        </Card>
      </div>

      {/* TODO: Later — surface Pantone per SKU inside List/Files tab (SKU details) */}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
      <div className="text-sm text-gray-500 dark:text-neutral-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{children}</div>
    </div>
  );
}
