const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ------------ Helpers: get rules & evaluate ----------------
const DEFAULT_RULES = (project) => [
  { key: "QC.rejected",       level: "AMBER", threshold: 1,    recipients: ["lead@local"], enabled: true },
  { key: "QC.rejected",       level: "RED",   threshold: 1000, recipients: ["ops@local","admin@local"], enabled: true },
  { key: "Inventory.shortfall", level: "AMBER", threshold: 1,    recipients: ["lead@local"], enabled: true },
  { key: "Inventory.shortfall", level: "RED",   threshold: 3000, recipients: ["ops@local","admin@local"], enabled: true },
  // Pantone mismatch is always AMBER unless you change it
  { key: "Pantone.mismatch", level: "AMBER", threshold: 0, recipients: ["lead@local"], enabled: true },
];

async function ensureRules(projectId) {
  const count = await prisma.alertRule.count({ where: { projectId }});
  if (count > 0) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }});
  const rows = DEFAULT_RULES(p).map(r => ({
    projectId,
    key: r.key,
    level: r.level,
    threshold: r.threshold,
    recipients: JSON.stringify(r.recipients),
    enabled: r.enabled
  }));
  await prisma.alertRule.createMany({ data: rows });
}

async function getRules(projectId, key) {
  await ensureRules(projectId);
  return prisma.alertRule.findMany({
    where: { projectId, key, enabled: true },
    orderBy: { threshold: "asc" }, // low → high
  });
}

/** Return "RED" | "AMBER" | null based on rules for a numeric value */
async function levelFromRules(projectId, key, value) {
  const rules = await getRules(projectId, key); // sorted asc
  let picked = null;
  for (const r of rules) {
    if (value >= r.threshold) picked = r.level;
  }
  return picked; // last that matches
}

function recipientsFor(level, rules) {
  // collect recipients for the chosen level only
  const r = rules.filter(x => x.level === level);
  if (r.length === 0) return [];
  try { return JSON.parse(r[0].recipients || "[]"); } catch { return []; }
}

// ---------------- health/demo ----------------
app.get("/api/hello", (_req, res) => res.json({ message: "Pramara PMS API is alive 🚀" }));

// ---------------- dev seed ----------------
app.post("/api/dev/seed", async (_req, res) => {
  const count = await prisma.project.count();
  let project;
  if (count === 0) {
    project = await prisma.project.create({
      data: {
        code: "PRJ-0001",
        name: "Figurine – Wave A",
        sku: "FG-A-75MM",
        quantity: 50000,
        cutoffDate: new Date("2025-10-28T00:00:00.000Z"),
        pantoneCode: "186C",
      },
    });
  } else {
    project = await prisma.project.findFirst({ orderBy: { id: "asc" } });
  }
  await ensureRules(project.id);
  res.json({ ok: true, project });
});

// ---------------- projects ----------------
app.post("/api/projects", async (req, res) => {
  const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
  if (!code || !name || !sku || !quantity || !cutoffDate) {
    return res.status(400).json({ error: "Required: code, name, sku, quantity, cutoffDate (ISO)" });
  }
  try {
    const project = await prisma.project.create({
      data: {
        code,
        name,
        sku,
        quantity: Number(quantity),
        cutoffDate: new Date(cutoffDate),
        pantoneCode: pantoneCode || null,
      },
    });
    await ensureRules(project.id);
    res.status(201).json(project);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

app.get("/api/projects", async (_req, res) => {
  const list = await prisma.project.findMany({ orderBy: { id: "asc" } });
  res.json(list);
});

app.get("/api/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

// ---------------- alert rules CRUD ----------------
app.get("/api/projects/:id/alert-rules", async (req, res) => {
  const projectId = Number(req.params.id);
  await ensureRules(projectId);
  const rules = await prisma.alertRule.findMany({ where: { projectId }, orderBy: [{ key: "asc" }, { level: "asc" }, { threshold: "asc" }]});
  res.json(rules);
});

app.put("/api/projects/:id/alert-rules", async (req, res) => {
  const projectId = Number(req.params.id);
  const incoming = Array.isArray(req.body) ? req.body : [];
  // naive replace-all for simplicity
  await prisma.alertRule.deleteMany({ where: { projectId } });
  const rows = incoming.map(r => ({
    projectId,
    key: String(r.key),
    level: String(r.level),
    threshold: Number(r.threshold || 0),
    recipients: JSON.stringify(r.recipients || []),
    enabled: r.enabled !== false,
  }));
  await prisma.alertRule.createMany({ data: rows });
  const saved = await prisma.alertRule.findMany({ where: { projectId }, orderBy: [{ key: "asc" }, { level: "asc" }, { threshold: "asc" }]});
  res.json(saved);
});

// ---------------- QC with rule-based alerts ----------------
app.post("/api/projects/:id/qc", async (req, res) => {
  const projectId = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  let { batchCode = "", passed = 0, rejected = 0, reason = "", pantoneMatch = "NA" } = req.body || {};

  const passedNum = Math.max(0, Number(passed) || 0);
  const rejectedNum = Math.max(0, Number(rejected) || 0);
  const reasonText = String(reason || "").trim();
  const pantone = String(pantoneMatch || "NA").trim();

  if (rejectedNum > 0 && !reasonText) return res.status(400).json({ error: "Reason is required when rejected > 0." });
  const allowedPantone = new Set(["Match", "Mismatch", "NA"]);
  if (!allowedPantone.has(pantone)) return res.status(400).json({ error: 'pantoneMatch must be "Match"|"Mismatch"|"NA"' });

  const qc = await prisma.qCRecord.create({
    data: {
      projectId,
      batchCode,
      passed: passedNum,
      rejected: rejectedNum,
      reason: rejectedNum > 0 ? reasonText : reasonText || "NA",
      pantoneMatch: pantone,
    },
  });

  // QC rejected level via rules
  const qcLevel = await levelFromRules(projectId, "QC.rejected", qc.rejected);
  if (qcLevel) {
    const rules = await getRules(projectId, "QC.rejected");
    const to = recipientsFor(qcLevel, rules);
    await prisma.alert.create({
      data: {
        projectId,
        type: "QC",
        level: qcLevel,
        message: `QC rejected ${qc.rejected} unit(s) in ${qc.batchCode || "batch"} (reason: ${qc.reason}). Notify: ${to.join(", ") || "—"}`,
      },
    });
  }
  // Pantone mismatch rule (always AMBER by default)
  if (qc.pantoneMatch === "Mismatch") {
    const rules = await getRules(projectId, "Pantone.mismatch");
    const to = recipientsFor("AMBER", rules);
    await prisma.alert.create({
      data: {
        projectId,
        type: "Pantone",
        level: "AMBER",
        message: `Pantone mismatch in ${qc.batchCode || "batch"} — expected ${project.pantoneCode || "N/A"}. Notify: ${to.join(", ") || "—"}`,
      },
    });
  }

  res.status(201).json(qc);
});

app.get("/api/projects/:id/qc", async (req, res) => {
  const projectId = Number(req.params.id);
  const list = await prisma.qCRecord.findMany({ where: { projectId }, orderBy: { id: "asc" } });
  res.json(list);
});

// ---------------- alerts ----------------
app.get("/api/projects/:id/alerts", async (req, res) => {
  const projectId = Number(req.params.id);
  const list = await prisma.alert.findMany({
    where: { projectId },
    orderBy: [{ level: "desc" }, { id: "desc" }],
  });
  res.json(list);
});

// ---------------- inventory with rule-based alert ----------------
app.post("/api/projects/:id/inventory/recompute", async (req, res) => {
  const projectId = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const list = Array.isArray(req.body?.needs) ? req.body.needs : [];
  const now = new Date();

  await prisma.inventoryNeed.deleteMany({ where: { projectId } });

  const created = [];
  for (const n of list) {
    const required = Math.max(0, Number(n.requiredQty || 0));
    const available = Math.max(0, Number(n.availableQty || 0));
    const shortfall = Math.max(0, required - available);
    const rec = await prisma.inventoryNeed.create({
      data: {
        projectId,
        material: String(n.material || "UNKNOWN"),
        requiredQty: required,
        availableQty: available,
        shortfall,
        updatedAt: now,
      },
    });
    created.push(rec);
  }

  const totalShort = created.reduce((s, x) => s + x.shortfall, 0);
  const invLevel = await levelFromRules(projectId, "Inventory.shortfall", totalShort);
  if (invLevel) {
    const rules = await getRules(projectId, "Inventory.shortfall");
    const to = recipientsFor(invLevel, rules);
    await prisma.alert.create({
      data: {
        projectId,
        type: "Inventory",
        level: invLevel,
        message: `Inventory shortfall detected: total shortage ${totalShort} unit(s). Notify: ${to.join(", ") || "—"}`,
      },
    });
  }

  res.json({ ok: true, updated: created });
});

// ---------------- planner (unchanged) ----------------
app.post("/api/projects/:id/plan/simulate", async (req, res) => {
  const projectId = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const quantity = Number(req.body?.quantity || project.quantity);
  const cutoffDate = new Date(req.body?.cutoffDate || project.cutoffDate);
  const buffers = {
    shippingDays: Number(req.body?.buffers?.shippingDays ?? 2),
    qcDays: Number(req.body?.buffers?.qcDays ?? 1),
  };
  const stages = Array.isArray(req.body?.stages) ? req.body.stages : [];
  if (stages.length === 0) return res.status(400).json({ error: "stages[] required with {name, unitsPerDay}" });

  function simulate(multiplier) {
    const plan = [];
    let currentEnd = new Date(cutoffDate);
    currentEnd.setDate(currentEnd.getDate() - buffers.shippingDays - buffers.qcDays);

    for (let i = stages.length - 1; i >= 0; i--) {
      const s = stages[i];
      const capacity = Math.max(1, Number(s.unitsPerDay || 0)) * multiplier;
      const daysNeeded = Math.ceil(quantity / capacity);

      const end = new Date(currentEnd);
      const start = new Date(end);
      start.setDate(start.getDate() - daysNeeded + 1);

      plan.unshift({
        stage: s.name,
        unitsPerDay: capacity,
        daysNeeded,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      currentEnd = new Date(start);
      currentEnd.setDate(currentEnd.getDate() - 1);
    }

    const overallStart = new Date(plan[0].startDate);
    const today = new Date();
    const slackDays = Math.floor((overallStart - today) / (1000 * 60 * 60 * 24));
    const risk = slackDays >= 2 ? "GREEN" : slackDays >= 0 ? "AMBER" : "RED";

    return { multiplier, plan, buffers, overallStart: overallStart.toISOString(), overallEnd: cutoffDate.toISOString(), slackDays, risk };
  }

  const scenarios = [1, 1.25, 1.5, 2].map(simulate);
  res.json({ quantity, cutoffDate: cutoffDate.toISOString(), scenarios });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
