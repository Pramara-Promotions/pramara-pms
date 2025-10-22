// api/routes/documents.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/* ────────────────────────────────────────────────────────────
   Auth guard: support default or named export; safe fallback
   ──────────────────────────────────────────────────────────── */
let _auth = null;
try {
  _auth = require("../middleware/authGuard"); // could be a function OR { authGuard }
} catch (e) {
  console.warn("[documents] authGuard not found at ../middleware/authGuard:", e?.message);
}
let authGuard = _auth && typeof _auth === "function" ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== "function") {
  console.warn("[documents] authGuard is not a function. Using NO-OP middleware so server can boot.");
  authGuard = (_req, _res, next) => next();
}

// Permission guard for RBAC
const { permissionGuard } = require("../middleware/permissionGuard");

/* ────────────────────────────────────────────────────────────
   Use unified storage layer (supports S3/R2/MinIO)
   ──────────────────────────────────────────────────────────── */
let getPresignedPutUrl, getPresignedGetUrl;
let STORAGE_READY = false;

try {
  const storage = require("../lib/storage");
  getPresignedPutUrl = storage.getPresignedPutUrl;
  getPresignedGetUrl = storage.getPresignedGetUrl;
  STORAGE_READY = true;
  console.log("[documents] Using unified storage layer (S3/R2/MinIO)");
} catch (e) {
  console.warn("[documents] Storage not configured:", e?.message);
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === "function";
}

const toInt = (v) => Number.parseInt(v, 10);

function buildPublicUrl(key) {
  // For presigned URL-based storage, return null
  // Frontend will request presigned GET URLs instead
  return null;
}

/* ────────────────────────────────────────────────────────────
   Routes
   ──────────────────────────────────────────────────────────── */

/**
 * GET /api/documents?projectId=123
 * List documents (optionally filtered by project)
 * Only returns root documents (parentId is null) to avoid showing all revisions
 */
router.get("/documents", authGuard, permissionGuard('DOC_VIEW'), async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.json([]);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const where = projectId ? { projectId, parentId: null } : { parentId: null };
    const rows = await prisma.projectDocument.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        documentStations: {
          include: {
            station: true
          }
        }
      }
    });
    res.json(rows);
  } catch (e) {
    console.error("GET /documents failed:", e);
    res.json([]);
  }
});

/**
 * GET /api/documents/:id
 * Read a single document row
 */
router.get("/documents/:id", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const row = await prisma.projectDocument.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("GET /documents/:id failed:", e);
    res.status(500).json({ error: "Failed to load document" });
  }
});

/**
 * POST /api/documents
 * Body: { projectId, kind?, title?, key?, url?, version? }
 * - If only "key" is provided (S3 object key), we attempt to build a public URL.
 */
router.post("/documents", authGuard, permissionGuard('DOC_UPLOAD'), async (req, res) => {
  try {
    if (!hasModel("projectDocument")) {
      // Echo back minimally so UI proceeds even if schema isn't ready
      const { projectId, kind, title, key, url, version } = req.body || {};
      return res.status(200).json({
        id: Date.now(),
        projectId: Number(projectId),
        kind: kind || null,
        title: title || null,
        key: key || null,
        url: url || (key ? buildPublicUrl(key) : null),
        version: version != null ? Number(version) : 1,
        createdAt: new Date().toISOString(),
      });
    }

    const { 
      projectId, 
      kind, 
      title, 
      key, 
      storageKey,
      contentType,
      url, 
      version, 
      referenceUrl, 
      approvalEmails, 
      notificationEmails 
    } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const row = await prisma.projectDocument.create({
      data: {
        projectId: Number(projectId),
        kind: kind || null,
        title: title || null,
        key: key || null,
        storageKey: storageKey || key || null,
        contentType: contentType || null,
        url: url || null, // Don't auto-generate URL, let the /url endpoint do it on demand
        version: version != null ? Number(version) : 1,
        referenceUrl: referenceUrl || null,
        approvalEmails: approvalEmails || null,
        notificationEmails: notificationEmails || null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error("POST /documents failed:", e);
    res.status(400).json({ error: "Create document failed" });
  }
});

/**
 * PUT /api/documents/:id
 * Update a document
 */
router.put("/documents/:id", authGuard, permissionGuard('DOC_EDIT'), async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const { 
      kind, 
      title, 
      url, 
      version, 
      active,
      referenceUrl, 
      approvalEmails, 
      notificationEmails,
      tags,
      notes,
      uploadedBy,
      approvedBy,
      approverRole,
      approvedAt,
      approvalProof,
      verifiedBy,
      verifierRole,
      verifiedAt,
      verificationProof,
      affectedTeams,
      isStandard,
      sourceChangeId
    } = req.body || {};
    
    const updateData = {};
    if (kind !== undefined) updateData.kind = kind;
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (version !== undefined) updateData.version = Number(version);
    if (active !== undefined) updateData.active = Boolean(active);
    if (referenceUrl !== undefined) updateData.referenceUrl = referenceUrl;
    if (approvalEmails !== undefined) updateData.approvalEmails = approvalEmails;
    if (notificationEmails !== undefined) updateData.notificationEmails = notificationEmails;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;
    if (uploadedBy !== undefined) updateData.uploadedBy = uploadedBy;
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy;
    if (approverRole !== undefined) updateData.approverRole = approverRole;
    if (approvedAt !== undefined) updateData.approvedAt = approvedAt ? new Date(approvedAt) : null;
    if (approvalProof !== undefined) updateData.approvalProof = approvalProof;
    if (verifiedBy !== undefined) updateData.verifiedBy = verifiedBy;
    if (verifierRole !== undefined) updateData.verifierRole = verifierRole;
    if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : null;
    if (verificationProof !== undefined) updateData.verificationProof = verificationProof;
    if (affectedTeams !== undefined) updateData.affectedTeams = affectedTeams;
    if (isStandard !== undefined) updateData.isStandard = Boolean(isStandard);
    if (sourceChangeId !== undefined) updateData.sourceChangeId = sourceChangeId;

    const row = await prisma.projectDocument.update({
      where: { id },
      data: updateData,
    });
    res.json(row);
  } catch (e) {
    console.error("PUT /documents/:id failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Update failed" });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes only the DB row; S3 object deletion is optional.
 */

// Delete a single version (if root, promote next available revision to root if any)
router.delete("/documents/:id", authGuard, permissionGuard('DOC_DELETE'), async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.json({ ok: true });
    const id = toInt(req.params.id);
    const doc = await prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // If root, check for revisions
    if (!doc.parentId) {
      const revisions = await prisma.projectDocument.findMany({ where: { parentId: doc.id }, orderBy: [{ version: "asc" }] });
      if (revisions.length > 0) {
        // Promote the earliest revision to root (parentId: null)
        const promote = revisions[0];
        await prisma.projectDocument.update({ where: { id: promote.id }, data: { parentId: null } });
        // Reassign any other revisions to new root
        for (const r of revisions.slice(1)) {
          await prisma.projectDocument.update({ where: { id: r.id }, data: { parentId: promote.id } });
        }
      }
    }
    await prisma.projectDocument.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /documents/:id failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Delete failed" });
  }
});

// Delete all versions in a chain (root + all revisions)
router.delete("/documents/:id/all", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.json({ ok: true });
    const id = toInt(req.params.id);
    const doc = await prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });
    const rootId = doc.parentId ? doc.parentId : doc.id;
    await prisma.projectDocument.deleteMany({ where: { OR: [{ id: rootId }, { parentId: rootId }] } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /documents/:id/all failed:", e);
    res.status(500).json({ error: "Delete all failed" });
  }
});

/**
 * POST /api/documents/presign
 * Body: { projectId, filename, contentType?, sizeBytes? }
 * Returns: { url, key, method: "PUT", headers: { "Content-Type": ... } }
 */
router.post("/documents/presign", authGuard, permissionGuard('DOC_UPLOAD'), async (req, res) => {
  try {
    if (!STORAGE_READY) {
      return res
        .status(503)
        .json({ error: "Storage not configured." });
    }
    const { projectId, filename, contentType = "application/octet-stream", sizeBytes } = req.body || {};
    if (!projectId || !filename) {
      return res.status(400).json({ error: "Missing 'projectId' or 'filename' in body" });
    }

    const result = await getPresignedPutUrl({ projectId, filename, contentType, sizeBytes });
    res.json({ ...result, method: "PUT", headers: { "Content-Type": contentType } });
  } catch (e) {
    console.error("POST /documents/presign failed:", e);
    res.status(500).json({ error: e.message || "Presign failed" });
  }
});

/**
 * POST /api/documents/:id/revise
 * Create a new revision of a document (with custom version and revision note)
 * Body: { ...fields, version, revisionNote }
 */
router.post("/documents/:id/revise", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const orig = await prisma.projectDocument.findUnique({ where: { id } });
    if (!orig) return res.status(404).json({ error: "Original document not found" });
    
    // Find the root document - all revisions should point to the root
    const rootId = orig.parentId ? orig.parentId : orig.id;
    // Determine the next version number based on the maximum version in the chain
    let chainMax = 0;
    try {
      const aggr = await prisma.projectDocument.aggregate({
        where: { OR: [{ id: rootId }, { parentId: rootId }] },
        _max: { version: true }
      });
      chainMax = Number(aggr?._max?.version || 0);
    } catch (_) {}
    
    const {
      kind, title, url, referenceUrl, key, storageKey, contentType, notes, tags,
      approvalEmails, notificationEmails, version, revisionNote, active, stations
    } = req.body || {};
    
    // When a new file is uploaded (key provided), clear url
    // When url is explicitly provided (external link), clear key/storageKey
    const hasNewFile = key !== undefined && key !== null;
    const hasExternalUrl = url !== undefined && url !== null && !hasNewFile;
    
    // Create new revision, link to root document
    // Compute new version: if provided and <= chainMax, bump to chainMax+1; if not provided, use chainMax+1
    let newVersion = Number(version || 0);
    if (!Number.isFinite(newVersion) || newVersion <= chainMax) newVersion = chainMax + 1;

    const newDoc = await prisma.projectDocument.create({
      data: {
        projectId: orig.projectId,
        parentId: rootId, // Always link to root, not immediate parent
        kind: kind ?? orig.kind,
        title: title ?? orig.title,
        url: hasNewFile ? null : (hasExternalUrl ? url : orig.url),
        referenceUrl: referenceUrl ?? orig.referenceUrl,
        key: hasNewFile ? key : (hasExternalUrl ? null : orig.key),
        storageKey: hasNewFile ? storageKey : (hasExternalUrl ? null : orig.storageKey),
        contentType: contentType ?? orig.contentType,
        notes: notes ?? orig.notes,
        tags: tags ?? orig.tags,
        approvalEmails: approvalEmails ?? orig.approvalEmails,
        notificationEmails: notificationEmails ?? orig.notificationEmails,
        version: newVersion,
        revisionNote: revisionNote || null,
        active: active === true,
      },
      include: { revisions: true }
    });
    // Optionally tag stations
    if (Array.isArray(stations) && stations.length > 0) {
      for (const stationId of stations) {
        await prisma.documentStation.create({
          data: { documentId: newDoc.id, stationId: Number(stationId) }
        });
      }
    }
    res.status(201).json(newDoc);
  } catch (e) {
    console.error("POST /documents/:id/revise failed:", e);
    res.status(400).json({ error: "Revision failed" });
  }
});

/**
 * GET /api/documents/:id/revisions
 * Get all revisions for a document (including itself)
 */
router.get("/documents/:id/revisions", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.json([]);
    const id = toInt(req.params.id);
    // Find root document (no parent) if this is a revision
    let doc = await prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });
    let rootId = doc.parentId ? doc.parentId : doc.id;
    // Get all revisions (including root)
    const revisions = await prisma.projectDocument.findMany({
      where: { OR: [{ id: rootId }, { parentId: rootId }] },
      orderBy: [{ version: "asc" }]
    });
    res.json(revisions);
  } catch (e) {
    console.error("GET /documents/:id/revisions failed:", e);
    res.status(500).json({ error: "Failed to load revisions" });
  }
});

/**
 * POST /api/documents/:id/activate
 * Activate a document version (deactivate others in the same chain)
 */
router.post("/documents/:id/activate", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const doc = await prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });
    // Find rootId for this revision chain
    let rootId = doc.parentId ? doc.parentId : doc.id;
    // Deactivate all in chain
    await prisma.projectDocument.updateMany({
      where: { OR: [{ id: rootId }, { parentId: rootId }] },
      data: { active: false }
    });
    // Activate this one
    await prisma.projectDocument.update({ where: { id }, data: { active: true } });
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /documents/:id/activate failed:", e);
    res.status(500).json({ error: "Activate failed" });
  }
});

/**
 * POST /api/documents/:id/deactivate
 * Deactivate a document version
 */
router.post("/documents/:id/deactivate", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    await prisma.projectDocument.update({ where: { id }, data: { active: false } });
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /documents/:id/deactivate failed:", e);
    res.status(500).json({ error: "Deactivate failed" });
  }
});

/**
 * POST /api/documents/:id/tag-stations
 * Tag a document to one or more stations (replaces all tags)
 * Body: { stationIds: [1,2,3] }
 */
router.post("/documents/:id/tag-stations", authGuard, async (req, res) => {
  try {
    if (!hasModel("projectDocument")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const { stationIds } = req.body || {};
    if (!Array.isArray(stationIds)) return res.status(400).json({ error: "stationIds required" });
    // Remove old tags
    await prisma.documentStation.deleteMany({ where: { documentId: id } });
    // Add new tags
    for (const stationId of stationIds) {
      await prisma.documentStation.create({ data: { documentId: id, stationId: Number(stationId) } });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /documents/:id/tag-stations failed:", e);
    res.status(500).json({ error: "Tagging failed" });
  }
});

module.exports = { documentsRouter: router };