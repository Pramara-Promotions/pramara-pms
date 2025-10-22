import { useCallback, useEffect, useState } from "react";
// path from /pages/projects/hooks → /lib/api.js
import { apiGet, apiPost, apiPut, apiDelete } from "../../../lib/api.js";

export type ProjectDocument = {
  id: number;
  projectId: number;
  kind: string;
  title: string;
  url: string;
  version: number;
  active: boolean;
  activeVersion?: number; // The version number of the active revision
  tags?: string[] | null;
  notes?: string | null;
  uploadedBy?: string | null;
  approvedBy?: string | null;
  approverRole?: string | null;
  approvedAt?: string | null;
  approvalProof?: string | null;
  verifiedBy?: string | null;
  verifierRole?: string | null;
  verifiedAt?: string | null;
  verificationProof?: string | null;
  affectedTeams?: string[] | null;
  isStandard?: boolean;
  sourceChangeId?: number | null;
  referenceUrl?: string | null;
  approvalEmails?: any | null; // JSON field
  notificationEmails?: any | null; // JSON field
};

export function useProjectDocuments(projectId: number) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(projectId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/projects/${projectId}/documents`);
      const docs = data as ProjectDocument[];
      
      // For each root document, fetch its revisions to find the active version
      const enriched = await Promise.all(
        docs.map(async (doc) => {
          try {
            const revisions = await apiGet(`/api/documents/${doc.id}/revisions`);
            const activeRev = Array.isArray(revisions) 
              ? revisions.find((r: any) => r.active) 
              : null;
            // If an active revision exists, use its version; otherwise use the root's version
            return {
              ...doc,
              activeVersion: activeRev?.version ?? doc.version,
              active: !!activeRev || doc.active
            };
          } catch {
            return { ...doc, activeVersion: doc.version };
          }
        })
      );
      
      setDocuments(enriched as ProjectDocument[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const addDocument = useCallback(
    async (payload: Partial<ProjectDocument>) => {
      await apiPost(`/api/projects/${projectId}/documents`, payload);
      await load();
    },
    [projectId, load]
  );

  const updateDocument = useCallback(
    async (docId: number, patch: Partial<ProjectDocument>) => {
      await apiPut(`/api/documents/${docId}`, patch);
      await load();
    },
    [load]
  );

  const deleteDocument = useCallback(
    async (docId: number) => {
      await apiDelete(`/api/documents/${docId}`);
      await load();
    },
    [load]
  );

  return { documents, loading, error, reload: load, addDocument, updateDocument, deleteDocument };
}