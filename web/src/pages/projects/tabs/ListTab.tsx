// @ts-nocheck
import React, { useMemo } from "react";
import { useQcRecords } from "../hooks/useQcRecords";
import { useInventoryNeeds } from "../hooks/useInventoryNeeds";
import { useProjectContext } from "../ProjectContext";

export default function ListTab() {
  const project = useProjectContext();
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  const projectId = useMemo(() => Number(project?.id), [project?.id]);

  const { data: qc, loading: qcLoading, error: qcError } = useQcRecords(projectId);
  const { data: needs, loading: invLoading, error: invError } = useInventoryNeeds(projectId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel title="QC Records" loading={qcLoading} error={qcError}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr><th>Batch</th><th>Passed</th><th>Rejected</th><th>Reason</th><th>Pantone</th><th>Date</th></tr>
          </thead>
          <tbody>
            {(qc ?? []).map(r => (
              <tr key={r.id} className="border-t dark:border-neutral-800">
                <td className="py-2">{r.batchCode}</td>
                <td>{r.passed}</td>
                <td>{r.rejected}</td>
                <td>{r.reason}</td>
                <td>{r.pantoneMatch}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Inventory needs" loading={invLoading} error={invError}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr><th>Material</th><th>Required</th><th>Available</th><th>Shortfall</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {(needs ?? []).map(n => (
              <tr key={n.id} className="border-t dark:border-neutral-800">
                <td className="py-2">{n.material}</td>
                <td>{n.requiredQty}</td>
                <td>{n.availableQty}</td>
                <td className={n.shortfall > 0 ? "text-red-600" : ""}>{n.shortfall}</td>
                <td>{new Date(n.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Panel({ title, children, loading, error }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-3">
        {loading ? <div className="text-sm text-gray-500">Loading…</div>
        : error ? <div className="text-sm text-red-600">{error}</div>
        : children}
      </div>
    </section>
  );
}
