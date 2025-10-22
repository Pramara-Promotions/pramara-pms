/* eslint-disable no-console */
// api/index.js
// ====================================================================
// [LANDMARK 0] BOOTSTRAP & GLOBAL MIDDLEWARE
// ====================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// [LMK: UPLOADS — DISK STORAGE]
const fs = require('fs');
const multer = require('multer');

const UPLOAD_ROOT = path.resolve(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });



const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage });

/** @type {any} */ const rateLimit = require('express-rate-limit');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { getPresignedPutUrl, getPresignedGetUrl } = require('./lib/storage');

const projectsRouter = require('./routes/projects');
let uploadRouter = null;
try { uploadRouter = require('./routes/upload'); } catch {}
const { documentsRouter } = require('./routes/documents');
const rolesRouter = require('./routes/roles');
const { adminRouter } = require('./routes/admin');
const { departmentsRouter } = require('./routes/departments');
const { devicesRouter } = require('./routes/devices');
const { auditRouter } = require('./routes/audit');
const { temporaryPermissionsRouter } = require('./routes/temporaryPermissions');
const { permissionRequestsRouter } = require('./routes/permissionRequests');
const { notificationsRouter } = require('./routes/notifications');
const app = express();

app.set('trust proxy', 1);

// CORS must be registered before any routes
app.use(
  cors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: process.env.MAX_UPLOAD_BYTES || '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, 'public', 'uploads')));

// Register routers for /api/* endpoints
app.use('/api', projectsRouter);
if (uploadRouter) app.use('/api', uploadRouter);
app.use('/api', documentsRouter);
app.use('/api', rolesRouter);
app.use('/api', adminRouter);
app.use('/api', departmentsRouter);
app.use('/api', devicesRouter);
app.use('/api', auditRouter);
app.use('/api', temporaryPermissionsRouter);
app.use('/api', permissionRequestsRouter);
app.use('/api', notificationsRouter);

function publicUrlForKey(key) {
  const base = process.env.PUBLIC_FILES_BASE || '';
  return base ? `${base.replace(/\/$/, '')}/${key}` : null;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// ====================================================================
// [LANDMARK 1] DEBUG & HEALTH
// ====================================================================
app.get('/api/debug', (req, res) => {
  res.json({
    hasTokenCookie: typeof req.cookies?.token === 'string',
    tokenCookieSample: req.cookies?.token?.slice(0, 20) || null,
    authHeader: req.get('authorization') || null,
    cookies: req.headers.cookie || null,
  });
});

app.get('/', (_req, res) => {
  res.send('✅ API is running');
});

// ====================================================================
// [LANDMARK AUTH] VERY-LIGHT AUTH STUB (DEV-ONLY)
// Frontend expects: POST /api/auth/login, POST /api/auth/logout, GET /api/me
// - Sets an httpOnly cookie "token" on login
// - /api/me returns a minimal user object if cookie is present
// Replace later with real JWT/user lookup.
// ====================================================================

const DEV_AUTH_EMAIL = process.env.DEV_AUTH_EMAIL || 'admin@pramara.local';
const DEV_AUTH_NAME  = process.env.DEV_AUTH_NAME  || 'Admin User';

// Helper: read boolean from env
function envTrue(v) { return String(v || '').toLowerCase() === 'true'; }

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password /* mfa */ } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // DEV ACCEPTANCE:
    // Accept any password for the configured dev email; otherwise 401.
    if (String(email).toLowerCase() !== DEV_AUTH_EMAIL.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set a simple dev token (replace with JWT later)
    const token = 'dev-token-' + Date.now();

    // cookie options – secure only in prod with HTTPS
    const secureCookies = envTrue(process.env.COOKIE_SECURE);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
    });

    return res.json({
      ok: true,
      user: { email: DEV_AUTH_EMAIL, name: DEV_AUTH_NAME, roles: ['admin'] },
    });
  } catch (e) {
    console.error('auth:login', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  try {
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  } catch (e) {
    console.error('auth:logout', e);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    // Minimal identity for dev. Replace with DB/JWT lookup later.
    return res.json({
      email: DEV_AUTH_EMAIL,
      name: DEV_AUTH_NAME,
      roles: ['admin'],
    });
  } catch (e) {
    console.error('auth:me', e);
    res.status(500).json({ error: 'Failed to read session' });
  }
});

// ====================================================================
// [LANDMARK 2] PROJECTS CRUD (simple)
// ====================================================================
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { id: 'asc' } });
    res.json(projects);
  } catch (e) {
    console.error('projects:list', e);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (e) {
    console.error('projects:get', e);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects', authLimiter, async (req, res) => {
  try {
    const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
    const proj = await prisma.project.create({
      data: {
        code: String(code),
        name: String(name),
        sku: sku ? String(sku) : null,
        quantity: Number(quantity || 0),
        cutoffDate: cutoffDate ? new Date(cutoffDate) : null,
        pantoneCode: pantoneCode ?? null,
      },
    });
    res.json(proj);
  } catch (e) {
    console.error('projects:create', e);
    res.status(500).json({ error: 'Create project failed' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
    const patch = {
      ...(code !== undefined ? { code: String(code) } : {}),
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(sku !== undefined ? { sku: sku ? String(sku) : null } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(cutoffDate !== undefined ? { cutoffDate: cutoffDate ? new Date(cutoffDate) : null } : {}),
      ...(pantoneCode !== undefined ? { pantoneCode } : {}),
    };
    const proj = await prisma.project.update({ where: { id }, data: patch });
    res.json(proj);
  } catch (e) {
    console.error('projects:update', e);
    res.status(500).json({ error: 'Update project failed' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('projects:delete', e);
    res.status(500).json({ error: 'Delete project failed' });
  }
});

// ====================================================================
// [LANDMARK 3] PROJECT SETTINGS — SKU ATTR LAYOUT + LAST PO
//   Uses ProjectPref (projectId, skuAttrKeys, lastPo)
// ====================================================================
app.get('/api/projects/:id/sku-attribute-layout', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const pref = await prisma.projectPref.findUnique({ where: { projectId } }).catch(() => null);
    res.json({ keys: (pref?.skuAttrKeys ?? []), lastPo: pref?.lastPo ?? null });
  } catch (e) {
    console.error('layout:get', e);
    res.status(500).json({ error: 'Failed to load layout' });
  }
});

app.post('/api/projects/:id/sku-attribute-layout', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    const pref = await prisma.projectPref.upsert({
      where: { projectId },
      create: { projectId, skuAttrKeys: keys, lastPo: null },
      update: { skuAttrKeys: keys },
    });
    res.json({ ok: true, keys: pref.skuAttrKeys ?? [] });
  } catch (e) {
    console.error('layout:post', e);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

// ====================================================================
// [LANDMARK 4] PO PDF UPLOAD (PRESIGN + CONFIRM + LIST)
//   Uses PurchaseOrder (projectId, poNumber, fileKey)
//   Also updates ProjectPref.lastPo.
// ====================================================================
app.post('/api/projects/:id/po/presign', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { poNumber, filename, contentType, sizeBytes } = req.body || {};
    if (!poNumber || !filename) {
      return res.status(400).json({ error: 'poNumber and filename are required' });
    }
    const { url, key } = await getPresignedPutUrl({ projectId, filename, contentType, sizeBytes });
    res.json({ putUrl: url, key });
  } catch (e) {
    console.error('po:presign', e);
    res.status(500).json({ error: 'Failed to presign PO upload' });
  }
});

app.post('/api/projects/:id/po/confirm', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { poNumber, key } = req.body || {};
    if (!poNumber || !key) return res.status(400).json({ error: 'poNumber and key are required' });

    const po = await prisma.purchaseOrder.upsert({
      where: { projectId_poNumber: { projectId, poNumber: String(poNumber) } },
      update: { fileKey: String(key) },
      create: { projectId, poNumber: String(poNumber), fileKey: String(key) },
    });

    await prisma.projectPref.upsert({
      where: { projectId },
      create: { projectId, lastPo: String(poNumber) },
      update: { lastPo: String(poNumber) },
    });

    let url = null;
    try {
      url = (await getPresignedGetUrl({ key: po.fileKey })).url;
    } catch (_) {}

    res.json({ ok: true, poNumber: po.poNumber, url });
  } catch (e) {
    console.error('po:confirm', e);
    res.status(500).json({ error: 'Failed to confirm PO' });
  }
});

app.get('/api/projects/:id/pos', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const list = await prisma.purchaseOrder.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const out = await Promise.all(
      list.map(async (po) => {
        try {
          const { url } = await getPresignedGetUrl({ key: po.fileKey });
          return { poNumber: po.poNumber, url, createdAt: po.createdAt };
        } catch {
          return { poNumber: po.poNumber, url: null, createdAt: po.createdAt };
        }
      })
    );

    res.json(out);
  } catch (e) {
    console.error('po:list', e);
    res.status(500).json({ error: 'Failed to load POs' });
  }
});

/**************************************
 * [LANDMARK: PO LOOKUP – GET /po/:poNumber]
 * Purpose: Allow UI to check if a PO already exists
 * Returns 200 always with {exists:boolean, poNumber, url?}
 **************************************/
app.get('/api/projects/:id/po/:poNumber', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const poNumber = String(req.params.poNumber || '').trim();
    if (!projectId || !poNumber) {
      return res.status(200).json({ exists: false, poNumber });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { projectId_poNumber: { projectId, poNumber } },
    });

    if (!po) {
      return res.status(200).json({ exists: false, poNumber });
    }

    // sign a short-lived GET URL for preview
    let url = null;
    try {
      const { getPresignedGetUrl } = require('./lib/storage');
      const signed = await getPresignedGetUrl({ key: po.fileKey });
      url = signed?.url || null;
    } catch (_) {}

    return res.status(200).json({ exists: true, poNumber, url, createdAt: po.createdAt });
  } catch (e) {
    console.error('[po:lookup] failed', e);
    // Still return a non-error payload to keep UI clean
    return res.status(200).json({ exists: false, poNumber: String(req.params.poNumber || '') });
  }
});
/* [END LANDMARK: PO LOOKUP] */

/**************************************
 * [LMK: PO LEGACY MULTIPART UPLOAD]
 * UI fallback: POST /api/projects/:id/po
 * Fields: file (PDF), poNumber (text)
 **************************************/
app.post('/api/projects/:id/po', upload.single('file'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const poNumber = String(req.body?.poNumber || '').trim();
    if (!projectId || !poNumber || !req.file) {
      return res.status(400).send('projectId, poNumber and file are required');
    }

    await prisma.purchaseOrder.upsert({
      where: { projectId_poNumber: { projectId, poNumber } },
      update: { fileKey: req.file.filename },
      create: { projectId, poNumber, fileKey: req.file.filename },
    });

    await prisma.projectPref.upsert({
      where: { projectId },
      create: { projectId, lastPo: poNumber },
      update: { lastPo: poNumber },
    });

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ ok: true, url });
  } catch (e) {
    console.error('po:legacy-upload', e);
    res.status(500).send('PO upload failed');
  }
});

// [LMK: LANDMARK 4 — DELETE PO FILE]
app.delete('/api/projects/:id/po/:poNumber', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const poNumber = String(req.params.poNumber || '').trim();
    if (!projectId || !poNumber) return res.status(400).json({ error: 'projectId and poNumber required' });

    const found = await prisma.purchaseOrder.findUnique({
      where: { projectId_poNumber: { projectId, poNumber } },
    });
    if (!found) return res.status(404).json({ error: 'PO not found' });

    // Keep the row (auditability), but clear fileKey => treated as "no file"
    await prisma.purchaseOrder.update({
      where: { projectId_poNumber: { projectId, poNumber } },
      data: { fileKey: '' },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('po:delete', e);
    res.status(500).json({ error: 'Failed to delete PO' });
  }
});

// ====================================================================
// [LANDMARK 5] SKU IMAGE PRESIGN (OPTIONAL PREVIEW URL)
// ====================================================================
app.post('/api/projects/:id/sku-image/presign', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { filename, contentType, sizeBytes } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    const { url, key } = await getPresignedPutUrl({ projectId, filename, contentType, sizeBytes });

    let publicUrl = publicUrlForKey(key);
    if (!publicUrl) {
      try {
        publicUrl = (await getPresignedGetUrl({ key })).url;
      } catch (_) {}
    }

    res.json({ putUrl: url, key, publicUrl: publicUrl || null });
  } catch (e) {
    console.error('sku-image:presign', e);
    res.status(500).json({ error: 'Failed to presign image upload' });
  }
});

// ====================================================================
// [LANDMARK 5B] PROJECT DOCUMENT PRESIGN (UPLOAD) + GET URL
// --------------------------------------------------------------------
// NOTE: We presign PUT to upload directly from the browser to MinIO.
//       We also expose a small helper to fetch a short-lived GET URL
//       for opening files stored internally (no public URL case).
// ====================================================================
app.post('/api/projects/:id/documents/presign', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { filename, contentType, sizeBytes } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    const { url, key } = await getPresignedPutUrl({ projectId, filename, contentType, sizeBytes });

    // Try to compute a browser-accessible URL if configured; else sign a short-lived GET.
    let publicUrl = publicUrlForKey(key);
    if (!publicUrl) {
      try {
        publicUrl = (await getPresignedGetUrl({ key })).url;
      } catch (_) {}
    }

    res.json({ putUrl: url, key, publicUrl: publicUrl || null });
  } catch (e) {
    console.error('doc:presign', e);
    res.status(500).json({ error: 'Failed to presign document upload' });
  }
});

app.get('/api/documents/:docId/url', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Helper to sign or build a URL for a given key
    const makeUrlForKey = async (key) => {
      if (!key) return null;
      let url = null;
      try {
        const signed = await getPresignedGetUrl({ key });
        url = signed?.url || null;
      } catch (err) {
        console.log('[doc:get-url] Presigned GET failed, trying public URL:', err.message);
      }
      if (!url) {
        const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
        const MINIO_BUCKET = process.env.MINIO_BUCKET;
        const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
        if (MINIO_ENDPOINT && MINIO_BUCKET) {
          const endpoint = MINIO_ENDPOINT.startsWith('http://') || MINIO_ENDPOINT.startsWith('https://')
            ? MINIO_ENDPOINT
            : `${MINIO_USE_SSL ? 'https://' : 'http://'}${MINIO_ENDPOINT}`;
          url = `${endpoint.replace(/\/+$/, '')}/${encodeURIComponent(MINIO_BUCKET)}/${key.split('/').map(encodeURIComponent).join('/')}`;
        }
      }
      if (!url) url = publicUrlForKey(key);
      return url;
    };

    // If we have a stored key, this is an internally stored object.
    // Prefer a fresh, short-lived signed GET URL every time to avoid stale links.
    if (doc.key || doc.storageKey) {
      let url = null;
      const keyToUse = doc.key || doc.storageKey;
      url = await makeUrlForKey(keyToUse);
      if (!url) return res.status(500).json({ error: 'Failed to generate URL for key: ' + keyToUse });
      return res.json({ url });
    }

    // Otherwise, if explicit URL is stored (shared/external), just return it as-is.
    if (doc.url) return res.json({ url: doc.url });

    // Fallback: if this is a root document lacking a key/url, try to find
    // the latest active revision (or highest version) in the same chain that has a key.
    try {
      const rootId = doc.parentId ? doc.parentId : doc.id;
      const chain = await prisma.projectDocument.findMany({
        where: { OR: [{ id: rootId }, { parentId: rootId }] },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      });
      // Prefer active with key; else highest version with key
      const candidate = chain.find((d) => d.active && (d.key || d.storageKey)) || chain.find((d) => d.key || d.storageKey);
      const candKey = candidate?.key || candidate?.storageKey;
      if (candKey) {
        const url = await makeUrlForKey(candKey);
        if (url) return res.json({ url, fromDocumentId: candidate.id });
      }
    } catch (e) {
      console.warn('[doc:get-url] Fallback to revision failed:', e?.message);
    }

    return res.status(400).json({ error: 'Document has no stored key or URL' });
  } catch (e) {
    console.error('doc:get-url', e);
    res.status(500).json({ error: 'Failed to generate document URL' });
  }
});

/**************************************
 * [LMK: SKU IMAGE LEGACY MULTIPART]
 * UI fallback: POST /api/projects/:id/sku-image
 * Field: file (image)
 **************************************/
app.post('/api/projects/:id/sku-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('file is required');
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ ok: true, url, publicUrl: url, key: req.file.filename });
  } catch (e) {
    console.error('sku-image:legacy-upload', e);
    res.status(500).send('Image upload failed');
  }
});

// ====================================================================
// [LANDMARK 6] PROJECT SKUs (CRUD)
//   Enforces: If poNumber is provided, PurchaseOrder must exist.
//   NOTE: ProjectSku has no imageUrl field in your schema — not stored.
// ====================================================================
app.get('/api/project-skus', async (req, res) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const rows = await prisma.projectSku.findMany({
      where: { projectId },
      orderBy: [{ poNumber: 'asc' }, { id: 'asc' }],
    });
    res.json(rows);
  } catch (e) {
    console.error('sku:list', e);
    res.status(500).json({ error: 'Failed to load SKUs' });
  }
});

app.post('/api/project-skus', async (req, res) => {
  try {
    const b = req.body || {};
    const projectId = Number(b.projectId);
    if (!projectId || !b.code) return res.status(400).json({ error: 'projectId and code required' });

    if (b.poNumber) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { projectId_poNumber: { projectId, poNumber: String(b.poNumber) } },
      });
      if (!po) return res.status(400).json({ error: 'PO PDF required', needsPO: true, poNumber: String(b.poNumber) });
    }

    const sku = await prisma.projectSku.create({
      data: {
        projectId,
        poNumber: b.poNumber ? String(b.poNumber) : null,
        code: String(b.code),
        name: b.name || null,
        color: b.color || null,
        type: b.type || null,
        orderQty: b.orderQty ? Number(b.orderQty) : null,
        attributes: b.attributesJson ? JSON.parse(b.attributesJson) : (b.attributes || undefined),
      },
    });

    if (b.poNumber) {
      await prisma.projectPref.upsert({
        where: { projectId },
        create: { projectId, lastPo: String(b.poNumber) },
        update: { lastPo: String(b.poNumber) },
      });
    }

    res.json(sku);
  } catch (e) {
    console.error('sku:create', e);
    res.status(500).json({ error: 'Create SKU failed' });
  }
});

app.put('/api/project-skus/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    const cur = await prisma.projectSku.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ error: 'SKU not found' });

    if (b.poNumber) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { projectId_poNumber: { projectId: cur.projectId, poNumber: String(b.poNumber) } },
      });
      if (!po) return res.status(400).json({ error: 'PO PDF required', needsPO: true, poNumber: String(b.poNumber) });
    }

    const updated = await prisma.projectSku.update({
      where: { id },
      data: {
        ...(b.poNumber !== undefined ? { poNumber: b.poNumber ? String(b.poNumber) : null } : {}),
        ...(b.name !== undefined ? { name: b.name || null } : {}),
        ...(b.color !== undefined ? { color: b.color || null } : {}),
        ...(b.type !== undefined ? { type: b.type || null } : {}),
        ...(b.orderQty !== undefined ? { orderQty: b.orderQty ? Number(b.orderQty) : null } : {}),
        ...(b.attributesJson !== undefined
          ? { attributes: b.attributesJson ? JSON.parse(b.attributesJson) : null }
          : (b.attributes !== undefined ? { attributes: b.attributes } : {})),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error('sku:update', e);
    res.status(500).json({ error: 'Update SKU failed' });
  }
});

app.delete('/api/project-skus/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.projectSku.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('sku:delete', e);
    res.status(500).json({ error: 'Delete SKU failed' });
  }
});

// [LMK: LANDMARK 6 — HELPERS]
function ensurePoExistsOr400({ projectId, poNumber }) {
  return prisma.purchaseOrder.findUnique({
    where: { projectId_poNumber: { projectId, poNumber: String(poNumber) } },
  });
}

// ====================================================================
// [LANDMARK 7] ALERT RULES (ensure defaults) + ALERTS actions
// ====================================================================
async function ensureRules(projectId) {
  const count = await prisma.alertRule.count({ where: { projectId } });
  if (count === 0) {
    await prisma.alertRule.createMany({
      data: [
        { projectId, key: 'QC.rejected',         level: 'AMBER', threshold: 1,    recipients: 'lead@local',            enabled: true },
        { projectId, key: 'QC.rejected',         level: 'RED',   threshold: 1000, recipients: 'ops@local,admin@local', enabled: true },
        { projectId, key: 'Inventory.shortfall', level: 'AMBER', threshold: 1,    recipients: 'lead@local',            enabled: true },
        { projectId, key: 'Inventory.shortfall', level: 'RED',   threshold: 3000, recipients: 'ops@local,admin@local', enabled: true },
        { projectId, key: 'Pantone.mismatch',    level: 'AMBER', threshold: 0,    recipients: 'lead@local',            enabled: true },
      ],
    });
  }
}

app.get('/api/projects/:id/alert-rules', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await ensureRules(id);
    const rules = await prisma.alertRule.findMany({
      where: { projectId: id },
      orderBy: [{ key: 'asc' }, { level: 'asc' }],
    });
    res.json(
      rules.map(r => ({
        ...r,
        recipients: r.recipients ? r.recipients.split(',').map(s => s.trim()).filter(Boolean) : [],
      }))
    );
  } catch (e) {
    console.error('rules:list', e);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

app.put('/api/projects/:id/alert-rules', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const incoming = Array.isArray(req.body) ? req.body : [];
    await prisma.alertRule.deleteMany({ where: { projectId: id } });
    for (const r of incoming) {
      await prisma.alertRule.create({
        data: {
          projectId: id,
          key: String(r.key),
          level: String(r.level),
          threshold: Number(r.threshold ?? 0),
          recipients: (Array.isArray(r.recipients) ? r.recipients : String(r.recipients || '').split(','))
            .map(s => String(s).trim()).filter(Boolean).join(','),
          enabled: Boolean(r.enabled ?? true),
        },
      });
    }
    const rules = await prisma.alertRule.findMany({ where: { projectId: id } });
    res.json(rules);
  } catch (e) {
    console.error('rules:save', e);
    res.status(500).json({ error: 'Failed to save alert rules' });
  }
});

app.get('/api/projects/:id/alerts', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const openOnly = String(req.query.openOnly || 'false').toLowerCase() === 'true';
    const alerts = await prisma.alert.findMany({
      where: { projectId: id, ...(openOnly ? { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { actions: true },
    });
    res.json(alerts);
  } catch (e) {
    console.error('alerts:list', e);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.post('/api/alerts/:alertId/ack', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const { by = 'unknown', note = '' } = req.body || {};
    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED', actions: { create: { action: 'ACK', by, note } } },
      include: { actions: true },
    });
    res.json(updated);
  } catch (e) {
    console.error('alerts:ack', e);
    res.status(500).json({ error: 'Ack failed' });
  }
});

app.post('/api/alerts/:alertId/comment', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const { by = 'unknown', note = '' } = req.body || {};
    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });
    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { actions: { create: { action: 'COMMENT', by, note } } },
      include: { actions: true },
    });
    res.json(updated);
  } catch (e) {
    console.error('alerts:comment', e);
    res.status(500).json({ error: 'Comment failed' });
  }
});

app.post('/api/alerts/:alertId/resolve', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const {
      by = 'unknown', note = '', correctiveActions = '',
      preventRecurrence = '', costImpact = null, costNote = '', close = true,
    } = req.body || {};

    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });

    const toCents = (n) => (n == null || n === '' ? null : Math.round(Number(n) * 100));

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: close ? 'RESOLVED' : 'ACKNOWLEDGED',
        actions: { create: {
          action: 'RESOLVE',
          by, note, correctiveActions, preventRecurrence,
          costImpactCents: toCents(costImpact), costNote,
        } },
      },
      include: { actions: true },
    });
    res.json(updated);
  } catch (e) {
    console.error('alerts:resolve', e);
    res.status(500).json({ error: 'Resolve failed' });
  }
});

// ====================================================================
// [LANDMARK 8] QC (intake + list)
// ====================================================================
app.post('/api/projects/:id/qc', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { batchCode, passed = 0, rejected = 0, reason = 'unspecified', pantoneMatch = 'Match' } = req.body || {};
    const record = await prisma.qCRecord.create({
      data: {
        projectId,
        batchCode: batchCode || null,
        passed: Number(passed),
        rejected: Number(rejected),
        reason,
        pantoneMatch,
      },
    });

    const rules = await prisma.alertRule.findMany({ where: { projectId, key: 'QC.rejected', enabled: true } });
    for (const rule of rules) {
      const threshold = Number(rule.threshold || 0);
      if (rejected >= threshold) {
        await prisma.alert.create({
          data: { projectId, level: rule.level, message: `QC rejected ${rejected} unit(s) in ${batchCode || 'batch'}.` },
        });
      }
    }

    if (pantoneMatch === 'Mismatch') {
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      const expected = proj?.pantoneCode || 'N/A';
      const pRules = await prisma.alertRule.findMany({ where: { projectId, key: 'Pantone.mismatch', enabled: true } });
      for (const rule of pRules) {
        await prisma.alert.create({
          data: { projectId, level: rule.level, message: `Pantone mismatch — expected ${expected}.` },
        });
      }
    }

    res.json({ ok: true, recordId: record.id });
  } catch (e) {
    console.error('qc:post', e);
    res.status(500).json({ error: 'QC save failed' });
  }
});

app.get('/api/projects/:id/qc', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const records = await prisma.qCRecord.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    res.json(records);
  } catch (e) {
    console.error('qc:get', e);
    res.status(500).json({ error: 'Failed to fetch QC records' });
  }
});

// ====================================================================
// [LANDMARK 9] INVENTORY NEEDS (list only; recompute can be added later)
// ====================================================================
app.get('/api/projects/:id/inventory/needs', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const needs = await prisma.inventoryNeed.findMany({ where: { projectId }, orderBy: { updatedAt: 'desc' } });
    res.json(needs);
  } catch (e) {
    console.error('inv:needs', e);
    res.status(500).json({ error: 'Failed to fetch inventory needs' });
  }
});

// ====================================================================
// [LANDMARK 10] PRE-PRODUCTION STEPS (aligned to schema: step/status/dueDate)
// ====================================================================
app.get('/api/projects/:id/preprod', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const steps = await prisma.preProdStep.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
    res.json(steps);
  } catch (e) {
    console.error('preprod:list', e);
    res.status(500).json({ error: 'Failed to fetch pre-production steps' });
  }
});

app.post('/api/projects/:id/preprod', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { step, status = 'PLANNED', dueDate } = req.body || {};
    const row = await prisma.preProdStep.create({
      data: {
        projectId,
        step: String(step),
        status: String(status),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.json(row);
  } catch (e) {
    console.error('preprod:create', e);
    res.status(500).json({ error: 'Failed to create pre-production step' });
  }
});

app.put('/api/preprod/:stepId', async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    const { step, status, dueDate } = req.body || {};
    const existing = await prisma.preProdStep.findUnique({ where: { id: stepId } });
    if (!existing) return res.status(404).json({ error: 'Step not found' });

    const updated = await prisma.preProdStep.update({
      where: { id: stepId },
      data: {
        ...(step !== undefined ? { step: String(step) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error('preprod:update', e);
    res.status(500).json({ error: 'Failed to update pre-production step' });
  }
});

app.delete('/api/preprod/:stepId', async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    await prisma.preProdStep.delete({ where: { id: stepId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('preprod:delete', e);
    res.status(500).json({ error: 'Failed to delete pre-production step' });
  }
});

// ====================================================================
// [LANDMARK 11] COMPLIANCE, CHANGES, DOCUMENTS, VARIANCES
//   (aligned to your schema fields)
// ====================================================================

// --- Compliance ---
app.get('/api/projects/:id/compliance', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.complianceItem.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('comp:list', e);
    res.status(500).json({ error: 'Failed to fetch compliance items' });
  }
});

app.post('/api/projects/:id/compliance', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      type, status = 'PLANNED', owner, labName,
      dueDate, requestedAt, submittedAt, approvedAt,
      documentUrl, remarks,
    } = req.body || {};

    const item = await prisma.complianceItem.create({
      data: {
        projectId,
        type: String(type),
        status: String(status),
        owner: owner || null,
        labName: labName || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        requestedAt: requestedAt ? new Date(requestedAt) : null,
        submittedAt: submittedAt ? new Date(submittedAt) : null,
        approvedAt: approvedAt ? new Date(approvedAt) : null,
        documentUrl: documentUrl || null,
        remarks: remarks || null,
      },
    });

    res.json(item);
  } catch (e) {
    console.error('comp:create', e);
    res.status(500).json({ error: 'Failed to create compliance item' });
  }
});

app.put('/api/compliance/:itemId', async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const {
      type, status, owner, labName,
      dueDate, requestedAt, submittedAt, approvedAt,
      documentUrl, remarks,
    } = req.body || {};

    const existing = await prisma.complianceItem.findUnique({ where: { id: itemId } });
    if (!existing) return res.status(404).json({ error: 'Compliance item not found' });

    const updated = await prisma.complianceItem.update({
      where: { id: itemId },
      data: {
        ...(type !== undefined ? { type: String(type) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(owner !== undefined ? { owner: owner || null } : {}),
        ...(labName !== undefined ? { labName: labName || null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(requestedAt !== undefined ? { requestedAt: requestedAt ? new Date(requestedAt) : null } : {}),
        ...(submittedAt !== undefined ? { submittedAt: submittedAt ? new Date(submittedAt) : null } : {}),
        ...(approvedAt !== undefined ? { approvedAt: approvedAt ? new Date(approvedAt) : null } : {}),
        ...(documentUrl !== undefined ? { documentUrl: documentUrl || null } : {}),
        ...(remarks !== undefined ? { remarks: remarks || null } : {}),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error('comp:update', e);
    res.status(500).json({ error: 'Failed to update compliance item' });
  }
});

app.delete('/api/compliance/:itemId', async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    await prisma.complianceItem.delete({ where: { id: itemId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('comp:delete', e);
    res.status(500).json({ error: 'Failed to delete compliance item' });
  }
});

// --- Change Log ---
app.get('/api/projects/:id/changes', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.changeLog.findMany({
      where: { projectId },
      orderBy: [{ requestedAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('change:list', e);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
});

app.post('/api/projects/:id/changes', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { type, description, requestedBy, impact } = req.body || {};

    const item = await prisma.changeLog.create({
      data: {
        projectId,
        type: String(type),
        description: description || null,
        requestedBy: requestedBy || 'UNKNOWN',
        impact: Array.isArray(impact) ? impact : null,
        approvalRequired: true,
        approvalStatus: 'PENDING',
      },
    });

    await prisma.alert.create({
      data: { projectId, level: 'AMBER', message: `Change requested: ${item.type} (Pending Approval)` },
    });

    res.json(item);
  } catch (e) {
    console.error('change:create', e);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

app.put('/api/changes/:changeId/approve', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    const { approvedBy, approvalStatus, approvalProof } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const existing = await prisma.changeLog.findUnique({ where: { id: changeId } });
    if (!existing) return res.status(404).json({ error: 'Change not found' });

    const updated = await prisma.changeLog.update({
      where: { id: changeId },
      data: {
        approvalStatus,
        approvedBy: approvedBy || null,
        approvalProof: approvalProof || null,
        approvalDate: new Date(),
      },
    });

    await prisma.alert.create({
      data: {
        projectId: existing.projectId,
        level: approvalStatus === 'REJECTED' ? 'RED' : 'GREEN',
        message: `Change ${approvalStatus}: ${existing.type}${approvalProof ? ` — proof: ${approvalProof}` : ''}`,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error('change:approve', e);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

app.put('/api/changes/:changeId', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    const { description, impact } = req.body || {};

    const existing = await prisma.changeLog.findUnique({ where: { id: changeId } });
    if (!existing) return res.status(404).json({ error: 'Change not found' });

    const updated = await prisma.changeLog.update({
      where: { id: changeId },
      data: {
        ...(description !== undefined ? { description: description || null } : {}),
        ...(impact !== undefined ? { impact: Array.isArray(impact) ? impact : null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error('change:update', e);
    res.status(500).json({ error: 'Failed to update change' });
  }
});

app.delete('/api/changes/:changeId', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    await prisma.changeLog.delete({ where: { id: changeId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('change:delete', e);
    res.status(500).json({ error: 'Failed to delete change' });
  }
});

// --- Documents ---
app.get('/api/projects/:id/documents', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.projectDocument.findMany({
      where: { projectId, parentId: null }, // Only return root documents, not revisions
      orderBy: [{ kind: 'asc' }, { title: 'asc' }, { version: 'desc' }],
      include: {
        documentStations: {
          include: {
            station: true
          }
        }
      }
    });
    res.json(items);
  } catch (e) {
    console.error('doc:list', e);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/projects/:id/documents', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      kind, title, url, key, storageKey, contentType,
      version, active, tags, notes, uploadedBy,
      approvedBy, approverRole, approvedAt, approvalProof,
      verifiedBy, verifierRole, verifiedAt, verificationProof,
      affectedTeams, isStandard, sourceChangeId,
    } = req.body || {};

    const siblings = await prisma.projectDocument.findMany({
      where: { projectId, kind: String(kind), title: String(title) },
      select: { version: true, active: true },
    });
    const nextVersion = version ? Number(version)
      : (siblings.length ? Math.max(...siblings.map(s => s.version)) + 1 : 1);

    if (active === true && siblings.length) {
      await prisma.projectDocument.updateMany({
        where: { projectId, kind: String(kind), title: String(title), active: true },
        data: { active: false },
      });
    }

    const item = await prisma.projectDocument.create({
      data: {
        projectId,
        kind: String(kind),
        title: String(title),
        url: url || null,
        key: key || null,
        storageKey: storageKey || null,
        contentType: contentType || null,
        version: nextVersion,
        active: Boolean(active) || false,
        tags: Array.isArray(tags) ? tags : null,
        notes: notes || null,
        uploadedBy: uploadedBy || null,

        approvedBy: approvedBy || null,
        approverRole: approverRole || null,
        approvedAt: approvedAt ? new Date(approvedAt) : null,
        approvalProof: approvalProof || null,

        verifiedBy: verifiedBy || null,
        verifierRole: verifierRole || null,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
        verificationProof: verificationProof || null,

        affectedTeams: Array.isArray(affectedTeams) ? affectedTeams : null,
        isStandard: Boolean(isStandard) || false,
        sourceChangeId: sourceChangeId ? Number(sourceChangeId) : null,
      },
    });

    res.json(item);
  } catch (e) {
    console.error('doc:create', e);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.put('/api/documents/:docId', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    const {
      active, notes, tags, url, title, key, storageKey, contentType,
      approvedBy, approverRole, approvedAt, approvalProof,
      verifiedBy, verifierRole, verifiedAt, verificationProof,
      affectedTeams, isStandard, sourceChangeId,
    } = req.body || {};

    const existing = await prisma.projectDocument.findUnique({ where: { id: docId } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    if (active === true) {
      await prisma.projectDocument.updateMany({
        where: { projectId: existing.projectId, kind: existing.kind, title: title ?? existing.title, active: true },
        data: { active: false },
      });
    }

    const updated = await prisma.projectDocument.update({
      where: { id: docId },
      data: {
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(url !== undefined ? { url: url || null } : {}),
        ...(title !== undefined ? { title: title || existing.title } : {}),
        ...(key !== undefined ? { key: key || null } : {}),
        ...(storageKey !== undefined ? { storageKey: storageKey || null } : {}),
        ...(contentType !== undefined ? { contentType: contentType || null } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : null } : {}),

        ...(approvedBy !== undefined ? { approvedBy: approvedBy || null } : {}),
        ...(approverRole !== undefined ? { approverRole: approverRole || null } : {}),
        ...(approvedAt !== undefined ? { approvedAt: approvedAt ? new Date(approvedAt) : null } : {}),
        ...(approvalProof !== undefined ? { approvalProof: approvalProof || null } : {}),

        ...(verifiedBy !== undefined ? { verifiedBy: verifiedBy || null } : {}),
        ...(verifierRole !== undefined ? { verifierRole: verifierRole || null } : {}),
        ...(verifiedAt !== undefined ? { verifiedAt: verifiedAt ? new Date(verifiedAt) : null } : {}),
        ...(verificationProof !== undefined ? { verificationProof: verificationProof || null } : {}),

        ...(affectedTeams !== undefined ? { affectedTeams: Array.isArray(affectedTeams) ? affectedTeams : null } : {}),
        ...(isStandard !== undefined ? { isStandard: Boolean(isStandard) } : {}),
        ...(sourceChangeId !== undefined ? { sourceChangeId: sourceChangeId ? Number(sourceChangeId) : null } : {}),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error('doc:update', e);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

app.delete('/api/documents/:docId', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    await prisma.projectDocument.delete({ where: { id: docId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('doc:delete', e);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// --- Variances ---
app.get('/api/projects/:id/variances', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.varianceItem.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('var:list', e);
    res.status(500).json({ error: 'Failed to fetch variances' });
  }
});

app.post('/api/projects/:id/variances', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { category, field, expected, actual, sourceDocId, remarks } = req.body || {};
    if (!category || !field || !expected || !actual) {
      return res.status(400).json({ error: 'category, field, expected, actual are required' });
    }

    let linkDocId = null;
    if (sourceDocId !== undefined && sourceDocId !== null && sourceDocId !== '') {
      const sId = Number(sourceDocId);
      const doc = await prisma.projectDocument.findUnique({ where: { id: sId } });
      if (!doc || doc.projectId !== projectId) {
        return res.status(400).json({ error: 'sourceDocId does not exist for this project' });
      }
      linkDocId = sId;
    }

    const item = await prisma.varianceItem.create({
      data: {
        projectId,
        category: String(category),
        field: String(field),
        expected: String(expected),
        actual: String(actual),
        sourceDocId: linkDocId,
        remarks: remarks || null,
        status: 'DEVIATION',
      },
    });

    await prisma.alert.create({
      data: {
        projectId,
        level: 'RED',
        message: `Variance: ${item.category}/${item.field} — expected "${item.expected}", got "${item.actual}".`,
      },
    });

    res.json(item);
  } catch (e) {
    console.error('var:create', e);
    res.status(500).json({ error: 'Failed to create variance' });
  }
});

app.put('/api/variances/:varId', async (req, res) => {
  try {
    const varId = Number(req.params.varId);
    const { status, remarks, resolvedAt } = req.body || {};
    const existing = await prisma.varianceItem.findUnique({ where: { id: varId } });
    if (!existing) return res.status(404).json({ error: 'Variance not found' });

    const updated = await prisma.varianceItem.update({
      where: { id: varId },
      data: {
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(remarks !== undefined ? { remarks: remarks || null } : {}),
        ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
        ...(status && (status === 'WAIVER' || status === 'RESOLVED') && !resolvedAt ? { resolvedAt: new Date() } : {}),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error('var:update', e);
    res.status(500).json({ error: 'Failed to update variance' });
  }
});

app.delete('/api/variances/:varId', async (req, res) => {
  try {
    const varId = Number(req.params.varId);
    await prisma.varianceItem.delete({ where: { id: varId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('var:delete', e);
    res.status(500).json({ error: 'Failed to delete variance' });
  }
});

// ====================================================================
// [LANDMARK 12] SIMPLE BACKWARD PLAN SIMULATOR (no DB writes)
// ====================================================================
app.post('/api/projects/:id/plan/simulate', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const {
      quantity = proj.quantity,
      cutoffDate = proj.cutoffDate,
      buffers = { shippingDays: 2, qcDays: 1 },
      stages = [], // [{ name, unitsPerDay }]
    } = req.body || {};

    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ error: 'stages[] required' });
    }

    const cutoff = new Date(cutoffDate);
    const afterShipping = new Date(cutoff);
    afterShipping.setDate(afterShipping.getDate() - Number(buffers.shippingDays || 0));
    const productionEnd = new Date(afterShipping);
    productionEnd.setDate(productionEnd.getDate() - Number(buffers.qcDays || 0));

    const multipliers = [1.0, 1.1, 1.25];

    const scenarios = multipliers.map(mult => {
      const plan = [];
      let cursor = new Date(productionEnd);

      for (let i = stages.length - 1; i >= 0; i--) {
        const s = stages[i];
        const upd = Math.max(0, Number(s.unitsPerDay || 0)) * mult;
        const daysNeeded = upd > 0 ? Math.ceil(Number(quantity) / upd) : Infinity;

        const stageEnd = new Date(cursor);
        const stageStart = new Date(cursor);
        stageStart.setDate(stageStart.getDate() - (isFinite(daysNeeded) ? daysNeeded : 0));

        plan.unshift({
          stage: s.name || `Stage${i + 1}`,
          startDate: stageStart.toISOString(),
          endDate: stageEnd.toISOString(),
          daysNeeded: isFinite(daysNeeded) ? daysNeeded : 0,
          unitsPerDay: Math.floor(upd),
        });

        cursor = stageStart;
      }

      const startOfFirst = new Date(plan[0].startDate);
      const today = new Date();
      const diffDays = Math.floor((startOfFirst - today) / (24 * 3600 * 1000));
      const risk = diffDays < 0 ? 'RED' : diffDays < 3 ? 'AMBER' : 'GREEN';

      return { multiplier: mult, risk, slackDays: diffDays, plan };
    });

    res.json({
      projectId,
      quantity,
      cutoffDate: new Date(cutoffDate).toISOString(),
      buffers,
      scenarios,
    });
  } catch (e) {
    console.error('plan:simulate', e);
    res.status(500).json({ error: 'Plan simulate failed' });
  }
});

// ====================================================================
// [LANDMARK 13] GLOBAL ERROR HANDLER & SERVER START
// ====================================================================
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
