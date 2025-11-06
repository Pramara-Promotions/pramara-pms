import { apiGet, apiPost } from '../../lib/api';

export function presignDocumentUpload(input: { projectId: string | number; filename: string; contentType?: string; sizeBytes?: number }) {
  return apiPost('/api/documents/presign', {
    projectId: input.projectId,
    filename: input.filename,
    contentType: input.contentType || 'application/octet-stream',
    sizeBytes: input.sizeBytes,
  });
}

export function getDocumentGetUrl(key: string) {
  const qs = new URLSearchParams();
  qs.set('key', key);
  return apiGet(`/api/documents/url?${qs.toString()}`);
}
