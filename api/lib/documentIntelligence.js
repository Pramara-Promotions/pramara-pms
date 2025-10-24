// api/lib/documentIntelligence.js
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');

let Tesseract = null;
try { Tesseract = require('tesseract.js'); } catch {}

const prisma = new PrismaClient();

const MAX_IMMEDIATE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DELAYED_BYTES = 25 * 1024 * 1024;  // 25MB
const MAX_BACKGROUND_BYTES = 100 * 1024 * 1024; // 100MB

function pickProcessingMode(sizeBytes) {
  if (sizeBytes <= MAX_IMMEDIATE_BYTES) return 'immediate';
  if (sizeBytes <= MAX_DELAYED_BYTES) return 'delayed';
  if (sizeBytes <= MAX_BACKGROUND_BYTES) return 'background';
  return 'rejected';
}

function basicFieldExtractors(text) {
  const fields = [];
  const push = (name, value, confidence, method, extra = {}) => fields.push({ name, value, confidence, method, ...extra });
  
  const raw = String(text || '');
  const normalized = raw.replace(/\u00A0/g, ' '); // nbsp -> space
  const upper = normalized.toUpperCase();
  const lines = upper.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // ---------- PO Number (multiple) ----------
  const poSet = new Set();
  const pushPo = (val, conf = 92, method = 'regex') => {
    const v = String(val || '').trim();
    if (!v) return;
    // exclude obviously wrong tokens
    if (/^[A-Z]{3,}$/.test(v)) return; // words with no digits
    if (poSet.has(v)) return;
    poSet.add(v);
    push('poNumber', v, conf, method);
  };

  // Pattern: Purchase Order / PO ...
  for (const m of upper.matchAll(/\b(PURCHASE\s*ORDER|PO)\s*(?:NO\.?|NUMBER|#)?\s*[:#-]?\s*([A-Z0-9-]{3,})/g)) {
    pushPo(m[2], 93, 'regex');
  }

  // Fallback: scan first 40 lines for a standalone 6-10 digit number likely to be PO
  for (const l of lines.slice(0, 40)) {
    // Ignore lines that look like phone numbers or addresses
    if (/PHONE|TEL|MOBILE|FAX/.test(l)) continue;
    const m = l.match(/\b(\d{6,10})\b/);
    if (m) pushPo(m[1], 70, 'lines');
  }

  // ---------- SKU / Part / Item codes ----------
  // Prefer tokens that contain both letters and digits
  const skuSet = new Set();
  const markSku = (val, conf = 85, method = 'regex') => {
    const v = String(val || '').trim();
    if (!/[A-Z]/i.test(v) || !/\d/.test(v)) return; // need letters + digits
    if (v.length < 4 || v.length > 24) return;
    if (skuSet.has(v)) return;
    skuSet.add(v);
    push('skuCode', v, conf, method);
  };

  // 1) Labeled patterns
  const skuLikePatterns = [
    /\bSKU\s*(?:CODE)?\s*[:#-]?\s*([A-Z0-9_.\-]{3,})/g,
    /\bPART\s*(?:NO\.?|NUMBER)?\s*[:#-]?\s*([A-Z0-9_.\-]{3,})/g,
    /\bITEM\s*(?:CODE|NO\.?|NUMBER)?\s*[:#-]?\s*([A-Z0-9_.\-]{3,})/g
  ];
  for (const re of skuLikePatterns) {
    for (const m of upper.matchAll(re)) markSku(m[1], 86, 'regex');
  }

  // 2) Table header heuristic: find line with PART and QTY, then parse following lines
  const headerIdx = lines.findIndex(l => /(PART|ITEM|ITEM#|PART#)\b/.test(l) && /QTY|QUANTITY/.test(l));
  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 25); i++) {
      const l = lines[i];
      // Take the first token-like entry on the line that looks like a code
      const tokens = (l.match(/\b[A-Z0-9][A-Z0-9_.\-]{3,}\b/g) || []).slice(0, 5);
      for (const t of tokens) markSku(t, 83, 'table');
    }
  }

  // ---------- Quantity ----------
  let qtyMatch = upper.match(/\bQTY\b\s*[:#-]?\s*(\d{1,9})/);
  if (!qtyMatch && headerIdx >= 0) {
    // Look in the next few lines for an isolated number
    for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 10) && !qtyMatch; i++) {
      const m = lines[i].match(/\b(\d{1,9})\b/);
      if (m) qtyMatch = m;
    }
  }
  if (qtyMatch) push('quantity', qtyMatch[1], 88, 'regex');

  // ---------- Pantone ----------
  const pantone = upper.match(/PANTONE\s*[:#-]?\s*([A-Z0-9\-\s]+?)(?:\n|\r|$)/);
  if (pantone) push('pantoneCode', pantone[1].trim(), 80, 'regex');

  // ---------- Date ----------
  const dateMatch = normalized.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
  if (dateMatch) push('date', dateMatch[1], 75, 'regex');

  // ---------- Email ----------
  const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) push('contactEmail', emailMatch[0], 85, 'regex');

  // ---------- Phone (require at least 10 digits and a separator) ----------
  const phoneMatch = normalized.match(/(?=.{10,})(\+?\d[\d\s().-]{9,}\d)/);
  if (phoneMatch) push('contactPhone', phoneMatch[1], 70, 'regex');

  // ---------- Vendor-specific: HIT PROMOTIONAL PRODUCTS ----------
  if (/\bHIT\s+PROMOTIONAL\b/.test(upper)) {
    // PO variants seen: "Purchase Order#" or small box with number
    for (const m of upper.matchAll(/PURCHASE\s*ORDER\s*#\s*([A-Z0-9-]{3,})/g)) pushPo(m[1], 95, 'vendor-hit');
    // Table tends to include PART # column; reinforce codes that contain both letters and digits
    for (let i = 0; i < Math.min(lines.length, 80); i++) {
      const l = lines[i];
      if (!/(PART|ITEM)\s*#|PRODUCT\s*DESCRIPTION/.test(l)) continue;
      for (let j = i + 1; j < Math.min(lines.length, i + 30); j++) {
        const row = lines[j];
        const tokens = row.match(/\b[A-Z]+[A-Z0-9_.-]{2,}\b/g) || [];
        for (const tok of tokens) if (/[A-Z]/.test(tok) && /\d/.test(tok)) markSku(tok, 87, 'vendor-hit');
      }
      break;
    }
  }

  return fields;
}

async function extractFromPDF(buffer) {
  const result = await pdfParse(buffer);
  const text = result.text || '';
  const fields = basicFieldExtractors(text);
  return { text, fields, meta: { pages: result.numpages || 1, info: result.info || {} } };
}

async function extractFromDOCX(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  const text = value || '';
  const fields = basicFieldExtractors(text);
  return { text, fields };
}

async function extractFromXLSX(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name;
  const rows = [];
  
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowValues = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowValues.push(cell.text || cell.value?.toString() || '');
    });
    rows.push(rowValues);
  });
  
  const text = rows.map(r => (r || []).join(' \t ')).join('\n');
  const fields = basicFieldExtractors(text);
  return { text, fields, meta: { sheet: sheetName, rows: rows.length } };
}

async function extractFromImage(buffer) {
  if (!Tesseract) return { text: '', fields: [], meta: { ocr: 'unavailable' } };
  const { data } = await Tesseract.recognize(buffer, 'eng');
  const text = data.text || '';
  const fields = basicFieldExtractors(text);
  return { text, fields, meta: { ocr: 'tesseract', confidence: data.confidence } };
}

class DocumentIntelligenceService {
  async createJob({
    entity, entityId = null,
    filename, mimeType, sizeBytes,
    sourceType = 'upload', sourceId = null,
    fileKey = null, filePath = null,
    meta = null,
  }) {
    const mode = pickProcessingMode(sizeBytes || 0);
    const job = await prisma.documentExtractionJob.create({
      data: {
        entity, entityId,
        filename, mimeType,
        fileKey, filePath,
        fileSize: Number(sizeBytes || 0),
        sourceType, sourceId,
        meta,
        processingMode: mode,
        status: mode === 'immediate' ? 'processing' : mode === 'rejected' ? 'failed' : 'queued'
      }
    });
    return job;
  }

  async processJob(jobId, buffer) {
    const job = await prisma.documentExtractionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    let result = { text: '', fields: [], meta: {} };
    const type = (job.mimeType || '').toLowerCase();

    try {
      if (type.includes('pdf')) {
        result = await extractFromPDF(buffer);
      } else if (type.includes('word') || job.filename?.toLowerCase().endsWith('.docx')) {
        result = await extractFromDOCX(buffer);
      } else if (type.includes('excel') || /\.xlsx?$/i.test(job.filename || '')) {
        result = await extractFromXLSX(buffer);
      } else if (type.startsWith('image/')) {
        result = await extractFromImage(buffer);
      } else {
        // Fallback: treat as text
        const text = buffer.toString('utf8');
        result = { text, fields: basicFieldExtractors(text), meta: {} };
      }

      // Persist fields
      const avg = result.fields.length
        ? Math.round(result.fields.reduce((a, f) => a + (f.confidence || 0), 0) / result.fields.length)
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.documentExtractionJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            methodSummary: result.meta?.ocr ? result.meta.ocr : 'regex',
            confidenceAvg: avg
          }
        });

        if (result.fields.length) {
          await tx.documentExtractionField.createMany({
            data: result.fields.map(f => ({
              jobId: job.id,
              name: f.name,
              value: String(f.value ?? ''),
              confidence: Number(f.confidence ?? 0),
              method: f.method || 'regex',
              sourcePage: f.sourcePage || null,
              sourceFile: job.filename,
              sourceCoordinates: f.sourceCoordinates || null,
              unit: f.unit || null,
              structured: f.structured || null
            }))
          });
        }
      });

      return { jobId: job.id, status: 'completed', fields: result.fields };
    } catch (err) {
      await prisma.documentExtractionJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: err.message }
      });
      return { jobId: job.id, status: 'failed', error: err.message };
    }
  }
}

const documentIntelligence = new DocumentIntelligenceService();
module.exports = { documentIntelligence, DocumentIntelligenceService };
