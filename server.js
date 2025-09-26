const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --------- severity defaults (simple for now) ----------
const THRESHOLDS = {
  qc: { redRejected: 1000 },
  inventory: { redShortfall: 3000 },
};
const levelForQC = (rej) => (rej >= THRESHOLDS.qc.redRejected ? "RED" : rej > 0 ? "AMBER" : null);
const levelForPantoneMismatch = () => "AMBER";
const levelForInventoryShortfall = (t) => (t >= THRESHOLDS.inventory.redShortfall ? "RED" : t > 0 ? "AMBER" : null);

// ---------------- health/demo ----------------
app.get("/api/hello", (_req, res) => res.json({ message: "Pramara PMS API is alive 🚀" }));

// ---------------- dev seed (creates 1 sample project if none) ----------------
app.post("/api/dev/seed", async (_req, res) => {
  const count = await prisma.project.count();
  if (count > 0) {
    const first = await prisma.project.findFirst({ orderBy: { id: "asc" } });
    return res.json({ ok: true, message: "Already seeded", project: first });
  }
  const project = await prisma.project.create({
    data: {
      code: "PRJ-0001",
      name: "Figurine – Wave A",
      sku: "FG-A-75MM",
      quantity: 50000,
      cutoffDate: new Date("2025-10-28T00:00:00.000Z"),
      pantoneCode: "186C",
    },
  });
  res.json({ ok: true, message: "Seeded", project });
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

// ---------------- QC (strict validation + alerts) ----------------
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

  const qcLevel = levelForQC(qc.rejected);
  if (qcLevel) {
    await prisma.alert.create({
      data: {
        projectId,
        type: "QC",
        level: qcLevel,
        message: `QC rejected ${qc.rejected} unit(s) in ${qc.batchCode || "batch"} (reason: ${qc.reason}). Check materials/packaging.`,
      },
    });
  }
  if (qc.pantoneMatch === "Mismatch") {
    await prisma.alert.create({
      data: {
        projectId,
        type: "Pantone",
        level: levelForPantoneMismatch(),
        message: `Pantone mismatch in ${qc.batchCode || "batch"} — expected ${project.pantoneCode || "N/A"}.`,
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

// ---------------- inventory needs (with alert) ----------------
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
  const invLevel = levelForInventoryShortfall(totalShort);
  if (invLevel) {
    await prisma.alert.create({
      data: {
        projectId,
        type: "Inventory",
        level: invLevel,
        message: `Inventory shortfall detected: total shortage ${totalShort} unit(s) across materials.`,
      },
    });
  }

  res.json({ ok: true, updated: created });
});

app.get("/api/projects/:id/inventory/needs", async (req, res) => {
  const projectId = Number(req.params.id);
  const needs = await prisma.inventoryNeed.findMany({ where: { projectId }, orderBy: { id: "asc" } });
  res.json(needs);
});

// ---------------- simple planner (backward from cutoff) ----------------
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

// ---------------- start ----------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
