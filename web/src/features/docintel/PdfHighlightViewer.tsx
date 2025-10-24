import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// In Vite, we can import the worker as a URL
// @ts-ignore - vite will handle the ?url import
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export type PdfHighlightViewerProps = {
  url: string;
  highlight?: string | null;
  page?: number | null;
  scale?: number;
  className?: string;
  exact?: boolean; // per-glyph style boxes instead of a single rect
};

export default function PdfHighlightViewer({ url, highlight, page, scale = 1.2, className, exact = true }: PdfHighlightViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Cross-page matches
  type Rect = { x:number; y:number; width:number; height:number };
  type Match = { page:number; rects: Rect[] };
  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState(0); // index into flattened rects across pages
  const [zoom, setZoom] = useState(scale);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);
      try {
        const pdf = await (pdfjsLib as any).getDocument({ url, withCredentials: true }).promise;
        if (cancelled) return;
        const numPages = pdf.numPages || 1;

        // Build matches across all pages when highlight is present
        const hl = (highlight || '').trim();
        const all: Match[] = [];
        if (hl) {
          const query = hl.toUpperCase();
          for (let pn = 1; pn <= numPages; pn++) {
            const pg = await pdf.getPage(pn);
            const viewportTmp = pg.getViewport({ scale: zoom });
            const textContent: any = await pg.getTextContent({ disableCombineTextItems: true });
            const rects: Rect[] = [];
            const transform = (pdfjsLib as any).Util.transform;
            const viewportTransform = viewportTmp.transform;
            for (const item of textContent.items || []) {
              const str: string = String(item.str || '');
              if (!str) continue;
              const up = str.toUpperCase();
              const idx = up.indexOf(query);
              if (idx >= 0) {
                const tx = transform(viewportTransform, item.transform);
                const x = tx[4];
                const y = tx[5];
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const totalWidth = item.width * viewportTmp.scale;
                // Approximate per-char width across the string
                const perChar = totalWidth / Math.max(1, str.length);
                const height = fontHeight;
                if (exact) {
                  for (let k = 0; k < query.length; k++) {
                    const startX = x + perChar * (idx + k);
                    rects.push({ x: startX, y: viewportTmp.height - y - height, width: perChar, height });
                  }
                } else {
                  const startX = x + perChar * idx;
                  const width = perChar * query.length;
                  rects.push({ x: startX, y: viewportTmp.height - y - height, width, height });
                }
              }
            }
            if (rects.length) all.push({ page: pn, rects });
          }
          setMatches(all);
        } else {
          setMatches([]);
        }

        // Determine which page to render
        const flattened = all.flatMap(m => m.rects.map((_, i) => ({ page: m.page, idx: i })));
        const activePage = flattened.length ? flattened[Math.min(active, flattened.length - 1)].page : (Math.min(Math.max(1, page || 1), numPages));
        const p = await pdf.getPage(activePage);
        const viewport = p.getViewport({ scale: zoom });

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        canvas.width = viewport.width | 0;
        canvas.height = viewport.height | 0;

        // Clear overlay
        if (overlayRef.current) overlayRef.current.innerHTML = '';

        await p.render({ canvasContext: ctx, viewport }).promise;

        // Text extraction for simple highlight (item-level)
        // Draw rects for current page
        if (overlayRef.current) {
          const div = overlayRef.current;
          div.style.position = 'absolute';
          div.style.left = '0';
          div.style.top = '0';
          div.style.width = canvas.width + 'px';
          div.style.height = canvas.height + 'px';
          div.style.pointerEvents = 'none';
          const rects = all.find(m => m.page === activePage)?.rects || [];
          const totalRects = flattened.length;
          const thisPageStart = flattened.findIndex(f => f.page === activePage);
          for (let i = 0; i < rects.length; i++) {
            const f = rects[i];
            const globalIdx = (thisPageStart >= 0 ? thisPageStart : 0) + i;
            const box = document.createElement('div');
            box.style.position = 'absolute';
            box.style.left = `${f.x}px`;
            box.style.top = `${f.y}px`;
            box.style.width = `${f.width}px`;
            box.style.height = `${f.height}px`;
            const isActive = totalRects ? (globalIdx === Math.min(active, totalRects - 1)) : false;
            box.style.background = isActive ? 'rgba(0, 153, 255, 0.3)' : 'rgba(255, 215, 0, 0.25)';
            box.style.border = isActive ? '2px solid rgba(0, 153, 255, 0.9)' : '1px solid rgba(255, 165, 0, 0.8)';
            box.style.borderRadius = '2px';
            div.appendChild(box);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to render PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (canvasRef.current) run();
    return () => { cancelled = true; };
  }, [url, highlight, page, zoom, active]);

  if (error) {
    return (
      <div className={className}>
        <div className="p-3 text-sm text-red-600">PDF render error: {error}</div>
        <iframe src={url} title="PDF Fallback" className="w-full h-[70vh]" />
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">Loading PDF…</div>}
      <canvas ref={canvasRef} className="w-full h-auto block" />
      <div ref={overlayRef} />
      {/* Toolbar */}
      <div className="absolute right-2 top-2 flex items-center gap-2 bg-white/80 backdrop-blur px-2 py-1 rounded shadow text-xs">
        <button className="px-2 py-0.5 border rounded" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}>-</button>
        <div>{(zoom*100).toFixed(0)}%</div>
        <button className="px-2 py-0.5 border rounded" onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))}>+</button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        {(() => {
          const total = matches.flatMap(m => m.rects).length;
          const dec = () => setActive(a => total ? (a - 1 + total) % total : 0);
          const inc = () => setActive(a => total ? (a + 1) % total : 0);
          return (
            <>
              <button className="px-2 py-0.5 border rounded disabled:opacity-50" disabled={!total} onClick={dec}>Prev</button>
              <div>{total ? `${Math.min(active+1, total)}/${total}` : '0/0'}</div>
              <button className="px-2 py-0.5 border rounded disabled:opacity-50" disabled={!total} onClick={inc}>Next</button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
