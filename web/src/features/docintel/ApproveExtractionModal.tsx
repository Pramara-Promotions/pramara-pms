import { useMemo, useState } from 'react';
import PdfHighlightViewer from './PdfHighlightViewer';
import { http } from '../../lib/http';

type Field = { name: string; value: string; confidence?: number; method?: string; sourceFile?: string; sourcePage?: number };

export default function ApproveExtractionModal({
  job,
  fields,
  onClose,
  onApproved,
  fallbackUrl,
}: {
  job: any;
  fields: Field[];
  onClose: () => void;
  onApproved: () => void;
  fallbackUrl?: string | null;
}) {
  // Group candidates by field name for conflict resolution
  const groups = useMemo(() => {
    const map = new Map<string, Field[]>();
    for (const f of fields) {
      const list = map.get(f.name) || [];
      list.push(f);
      map.set(f.name, list);
    }
    // sort each group by confidence desc
    for (const [k, list] of map) {
      list.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      map.set(k, list);
    }
    return map;
  }, [fields]);

  // For each field name, select exactly one candidate (default: highest confidence)
  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [name, list] of Array.from(groups.entries())) {
      if (list.length > 0) init[name] = `${list[0].name}::${list[0].value}`;
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const chosen = useMemo(() => {
    const out: Field[] = [];
    for (const [name, list] of Array.from(groups.entries())) {
      const key = picked[name];
      if (!key) continue;
      const [n, v] = key.split('::');
      const match = list.find(f => f.name === n && String(f.value) === v);
      if (match) out.push(match);
    }
    return out;
  }, [groups, picked]);

  async function approve() {
    setSubmitting(true);
    try {
      const res = await http(`/doc-intelligence/jobs/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedFields: chosen.map(f => ({ name: f.name, value: f.value })), apply: true }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Approval failed');
      onApproved();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  }

  const [showSource, setShowSource] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [focusValue, setFocusValue] = useState<string>('');
  const [focusPage, setFocusPage] = useState<number | null>(null);

  async function openSourceInline() {
    try {
      if (showSource) { setShowSource(false); return; }
      if (!sourceUrl) {
        const res = await http(`/doc-intelligence/jobs/${job.id}/source-url`);
        if (res.ok) {
          const data = await res.json();
          if (data?.url) setSourceUrl(data.url);
          else if (fallbackUrl) setSourceUrl(fallbackUrl);
        } else {
          // When inline extraction used (fileBase64), server may not have fileKey
          if (fallbackUrl) setSourceUrl(fallbackUrl);
        }
      }
      setShowSource(true);
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b flex-shrink-0">
          <div>
            <div className="font-semibold text-base sm:text-lg">Review extracted data</div>
            <div className="text-xs text-gray-500">Source: {job.filename} ({job.mimeType})</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openSourceInline} className="text-blue-600 text-xs sm:text-sm hover:underline">{showSource ? 'Hide Source' : 'View Source'}</button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl px-2">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={`grid gap-4 ${showSource ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <div className="border rounded divide-y">
                {Array.from(groups.entries()).map(([name, list]) => (
                <div key={name} className="p-2">
                  <div className="text-sm font-semibold mb-1">{name}</div>
                  <div className="space-y-1">
                    {list.map((f, i) => {
                      const key = `${f.name}::${f.value}`;
                      return (
                        <label key={i} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 border">
                          <input
                            type="radio"
                            name={`pick-${name}`}
                            checked={picked[name] === key}
                            onChange={() => {
                              setPicked(p => ({ ...p, [name]: key }));
                              setFocusValue(String(f.value || ''));
                              setFocusPage(typeof f.sourcePage === 'number' ? f.sourcePage : null);
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-sm">{String(f.value)}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-3">
                              {f.confidence != null && <span>Confidence: {f.confidence}%</span>}
                              {f.method && <span>Method: {f.method}</span>}
                              {(f.sourceFile || f.sourcePage != null) && (
                                <span>From: {f.sourceFile || job.filename}{f.sourcePage != null ? ` p.${f.sourcePage}` : ''}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(String(f.value || '')); }}
                            title="Copy value"
                          >Copy</button>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              </div>
            </div>
            {showSource && (
              <div className="rounded border overflow-hidden min-h-[400px] relative">
                <button
                  type="button"
                  className="absolute right-2 top-2 z-10 bg-white/90 border rounded px-2 py-1 text-xs"
                  onClick={() => {
                    const host = document.getElementById('di-source-host');
                    if (host) host.classList.toggle('col-span-2');
                  }}
                >Expand</button>
                <div id="di-source-host" className="w-full">
                {sourceUrl ? (
                  <>
                    <div className="p-2 border-b text-xs text-gray-600 flex items-center justify-between">
                      <div className="truncate">
                        Focus: {focusValue ? <span className="font-medium">{focusValue}</span> : <span>None</span>}
                        {focusPage != null && <span className="ml-2">(page {focusPage})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {focusValue && (
                          <button className="text-blue-600 hover:underline" onClick={() => navigator.clipboard?.writeText(focusValue)}>Copy</button>
                        )}
                      </div>
                    </div>
                    <PdfHighlightViewer url={sourceUrl} highlight={focusValue} page={focusPage ?? undefined} className="w-full" exact={true} />
                  </>
                ) : (
                  <div className="p-4 text-sm text-gray-500">Loading source…</div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 pt-3 border-t flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-600">Fields chosen: {chosen.length} / {groups.size}</div>
          <div className="flex gap-2">
            <button className="px-3 sm:px-4 py-2 rounded border text-sm hover:bg-gray-50" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="px-3 sm:px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60" onClick={approve} disabled={submitting || chosen.length === 0}>
              {submitting ? 'Applying…' : 'Approve & Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
