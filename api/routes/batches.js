const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');
const batchUtils = require('../lib/batchUtils');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/batches - List all batches
router.get('/', async (req, res) => {
  try {
    const { projectId, status, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { batchCode: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            BatchMovement: true,
            QCSubmission: true,
            wipLedgers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// GET /api/batches/:id - Get single batch with full genealogy
router.get('/:id', async (req, res) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        parentBatch: {
          select: {
            id: true,
            batchCode: true,
            status: true,
            currentQty: true,
            targetQty: true
          }
        },
        subBatches: {
          select: {
            id: true,
            batchCode: true,
            status: true,
            currentQty: true,
            targetQty: true,
            currentStationId: true,
            Station: {
              select: { id: true, name: true, code: true }
            }
          }
        },
        assemblyComponents: {
          include: {
            componentBatch: {
              select: {
                id: true,
                batchCode: true,
                status: true,
                currentQty: true,
                targetQty: true,
                ProjectSku: {
                  select: { id: true, code: true, name: true }
                }
              }
            }
          }
        },
        usedInAssemblies: {
          include: {
            assemblyBatch: {
              select: {
                id: true,
                batchCode: true,
                status: true,
                currentQty: true,
                targetQty: true,
                ProjectSku: {
                  select: { id: true, code: true, name: true }
                }
              }
            }
          }
        },
        BatchMovement: {
          include: {
            Station_BatchMovement_fromStationIdToStation: { select: { id: true, name: true } },
            Station_BatchMovement_toStationIdToStation: { select: { id: true, name: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
        QCSubmission: {
          select: {
            id: true,
            submittedAt: true,
            overallPass: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
        wipLedgers: {
          select: {
            id: true,
            transactionDate: true,
            transactionType: true,
            quantity: true,
            balanceQuantity: true,
          },
          orderBy: { transactionDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            BatchMovement: true,
            QCSubmission: true,
            wipLedgers: true
          }
        }
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// POST /api/batches - Create new batch (Phase 2 spec)
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      projectSkuId,
      stationId,
      quantity,
      operatorId,
      materialLots,
      totalWeight,
      containerWeight,
      unitWeight,
      quantityMethod,
      subSkuIdentifier,
      batchNumber
    } = req.body;

    if (!projectId || !quantity) {
      return res.status(400).json({ error: 'projectId and quantity are required' });
    }

    // Resolve or create a SKU if not provided (schema requires projectSkuId)
    let resolvedSkuId = projectSkuId ? Number(projectSkuId) : null;
    if (!resolvedSkuId) {
      // Try to find any SKU for this project; else create a minimal one
      const existingSku = await prisma.projectSku.findFirst({ where: { projectId: Number(projectId) } });
      if (existingSku) {
        resolvedSkuId = existingSku.id;
      } else {
        const autoCode = (batchNumber ? String(batchNumber) : `AUTO-${Date.now()}`).slice(0, 32);
        const createdSku = await prisma.projectSku.create({
          data: {
            projectId: Number(projectId),
            code: autoCode,
            name: 'Auto-generated for batch',
            orderQty: null,
          }
        });
        resolvedSkuId = createdSku.id;
      }
    }

    // Generate batch code using utility (prefer provided batchNumber)
    const sequenceNumber = Date.now() % 1000;
    const projectCode = `PRJ-${projectId}`;
    const skuCode = `SKU-${resolvedSkuId}`;
    const generatedCode = batchUtils.generateBatchCode(projectCode, skuCode, sequenceNumber);
    const batchCode = batchNumber ? String(batchNumber) : generatedCode;

    // Calculate quantity if weight provided
    let calculatedQty = Number(quantity);
    if (quantityMethod === 'weighed' && totalWeight && containerWeight && unitWeight) {
      calculatedQty = batchUtils.calculateQuantityFromWeight(totalWeight, containerWeight, unitWeight).calculatedQty;
    }

    // Create batch record
    const batch = await prisma.batch.create({
      data: {
        id: `B-${Date.now()}`,
        batchCode,
        projectId: Number(projectId),
        projectSkuId: Number(resolvedSkuId),
        currentStationId: stationId ? Number(stationId) : null,
        targetQty: Number(quantity),
        currentQty: 0,
        rejectedQty: 0,
        totalWeight: totalWeight ?? null,
        containerWeight: containerWeight ?? null,
        calculatedQty: calculatedQty ?? null,
        quantityMethod: quantityMethod || 'count',
        materialLots: materialLots || {},
        subBatchIdentifier: subSkuIdentifier || null,
        status: 'in_progress',
        createdBy: operatorId || req.user?.id || 'system',
      },
    });

    // Create initial BatchMovement record if station provided
    if (stationId) {
      await prisma.batchMovement.create({
        data: {
          id: `BM-${Date.now()}`,
          batchId: batch.id,
          fromStationId: null,
          toStationId: Number(stationId),
          qty: Number(quantity),
          operatorId: operatorId || req.user?.id || 'system',
          timestamp: new Date(),
          condition: 'good',
          photos: [],
        },
      });
    }

    // Generate QR code for batch
    const qrCodeDataURL = await batchUtils.generateBatchQRCode(batch.id, batchCode);

    // Generate handover sheet URL
    const handoverSheetUrl = batchUtils.generateHandoverSheet(batch, stationId);

    // Return batch with QR code
    res.status(201).json({ 
      id: batch.id, 
      batchCode, 
      status: 'in_progress', 
      projectId: Number(projectId),
      qrCodeUrl: `/api/batches/${batch.id}/qr-code`,
      qrCodeDataURL: qrCodeDataURL // Base64 data URL for immediate display
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch', details: error.message });
  }
});

// POST /api/batches/:id/move - Record batch movement (Phase 2 spec)
router.post('/:id/move', async (req, res) => {
  try {
    const { toStationId, operatorId, quantity, condition, notes, photos, isPartialMove, remainingQuantity } = req.body;
    const batchId = req.params.id;

    // Validate required fields
    if (!toStationId) {
      return res.status(400).json({ error: 'toStationId is required' });
    }

    // Get current batch for validation
    const currentBatch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { 
        currentStationId: true, 
        currentQty: true, 
        status: true,
        batchCode: true 
      }
    });

    if (!currentBatch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (currentBatch.status === 'completed' || currentBatch.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot move batch with status: ${currentBatch.status}` });
    }

    // Validate station exists
    const toStation = await prisma.station.findUnique({
      where: { id: Number(toStationId) }
    });

    if (!toStation) {
      return res.status(404).json({ error: 'Destination station not found' });
    }

    // Validate quantity
    const moveQty = Number(quantity) || currentBatch.currentQty;
    if (moveQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    if (moveQty > currentBatch.currentQty) {
      return res.status(400).json({ error: `Quantity (${moveQty}) exceeds current batch quantity (${currentBatch.currentQty})` });
    }

    // Validate condition enum
    const validConditions = ['good', 'damaged', 'rejected', 'rework'];
    const moveCondition = condition || 'good';
    if (!validConditions.includes(moveCondition)) {
      return res.status(400).json({ error: `Invalid condition. Must be one of: ${validConditions.join(', ')}` });
    }

    // Create movement record
    const movement = await prisma.batchMovement.create({
      data: {
        id: `BM-${Date.now()}`,
        batchId,
        fromStationId: currentBatch.currentStationId,
        toStationId: Number(toStationId),
        qty: moveQty,
        operatorId: operatorId || req.user?.id || 'system',
        condition: moveCondition,
        notes: notes || null,
        photos: photos || [],
        timestamp: new Date(),
      },
      include: {
        Station_BatchMovement_fromStationIdToStation: { select: { id: true, name: true, code: true } },
        Station_BatchMovement_toStationIdToStation: { select: { id: true, name: true, code: true } },
      },
    });

    // Update batch current station and quantity
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: { 
        currentStationId: Number(toStationId),
        // Don't change currentQty here - that's handled by WIP logging
      },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
      }
    });

    // If partial move, create sub-batch (stub for now)
    let subBatch = null;
    if (isPartialMove && remainingQuantity) {
      subBatch = { id: 'sub-batch-stub', quantity: remainingQuantity };
    }

    res.status(201).json({ 
      success: true,
      movement,
      batch: updatedBatch,
      subBatch
    });
  } catch (error) {
    console.error('Error recording batch movement:', error);
    res.status(500).json({ error: 'Failed to record batch movement' });
  }
});

// GET /api/batches/:id/movements - Get movement history
router.get('/:id/movements', async (req, res) => {
  try {
    const batchId = req.params.id;
    const { page = '1', limit = '50' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [movements, total] = await Promise.all([
      prisma.batchMovement.findMany({
        where: { batchId },
        include: {
          Station_BatchMovement_fromStationIdToStation: {
            select: { id: true, name: true, code: true }
          },
          Station_BatchMovement_toStationIdToStation: {
            select: { id: true, name: true, code: true }
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      prisma.batchMovement.count({ where: { batchId } })
    ]);

    res.json({
      movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching batch movements:', error);
    res.status(500).json({ error: 'Failed to fetch batch movements' });
  }
});

// POST /api/batches/:id/movements/:movementId/photos - Upload photos to movement
router.post('/:id/movements/:movementId/photos', async (req, res) => {
  try {
    const { movementId } = req.params;
    const { photoUrls } = req.body; // Array of URLs from frontend upload

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: 'photoUrls array is required' });
    }

    // Validate movement exists
    const movement = await prisma.batchMovement.findUnique({
      where: { id: movementId }
    });

    if (!movement) {
      return res.status(404).json({ error: 'Movement not found' });
    }

    // Append new photos to existing photos array
    const existingPhotos = movement.photos || [];
    const updatedPhotos = [...existingPhotos, ...photoUrls];

    // Update movement with new photos
    const updatedMovement = await prisma.batchMovement.update({
      where: { id: movementId },
      data: { photos: updatedPhotos }
    });

    res.json({
      success: true,
      photos: updatedPhotos,
      movement: updatedMovement
    });
  } catch (error) {
    console.error('Error uploading photos to movement:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// POST /api/batches/:id/split - Sub-batch creation
router.post('/:id/split', async (req, res) => {
  try {
    const parentBatchId = req.params.id;
    const { subBatches } = req.body; // Array of { identifier, quantity, notes }

    // Validation: subBatches array required
    if (!subBatches || !Array.isArray(subBatches) || subBatches.length === 0) {
      return res.status(400).json({ error: 'subBatches array is required and must not be empty' });
    }

    // Get parent batch
    const parentBatch = await prisma.batch.findUnique({
      where: { id: parentBatchId },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } }
      }
    });

    if (!parentBatch) {
      return res.status(404).json({ error: 'Parent batch not found' });
    }

    // Validation: Parent batch cannot already be split
    if (parentBatch.status === 'split') {
      return res.status(400).json({ error: 'Batch has already been split' });
    }

    // Validation: Check if parent already has sub-batches
    const existingSubBatches = await prisma.batch.count({
      where: { parentBatchId }
    });

    if (existingSubBatches > 0) {
      return res.status(400).json({ error: 'Batch already has sub-batches. Cannot split again.' });
    }

    // Validation: Identifiers must be unique
    const identifiers = subBatches.map(sb => sb.identifier);
    const uniqueIdentifiers = new Set(identifiers);
    if (identifiers.length !== uniqueIdentifiers.size) {
      return res.status(400).json({ error: 'Sub-batch identifiers must be unique' });
    }

    // Validation: All quantities must be valid numbers > 0
    for (const sb of subBatches) {
      const qty = Number(sb.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for sub-batch ${sb.identifier}` });
      }
    }

    // Validation: Sum of quantities must not exceed parent quantity
    const totalQuantity = subBatches.reduce((sum, sb) => sum + Number(sb.quantity), 0);
    if (totalQuantity > parentBatch.currentQty) {
      return res.status(400).json({ 
        error: `Total sub-batch quantity (${totalQuantity}) exceeds parent batch quantity (${parentBatch.currentQty})` 
      });
    }

    // Create sub-batches
    const createdSubBatches = [];
    
    for (const sb of subBatches) {
      const subBatchCode = `${parentBatch.batchCode}-${sb.identifier}`;
      const qty = Number(sb.quantity);

      // Generate QR code for sub-batch
      const subBatchId = `B-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeDataURL = await batchUtils.generateBatchQRCode(subBatchId, subBatchCode);

      // Create sub-batch record
      const subBatch = await prisma.batch.create({
        data: {
          id: subBatchId,
          batchCode: subBatchCode,
          projectId: parentBatch.projectId,
          projectSkuId: parentBatch.projectSkuId,
          targetQty: qty,
          currentQty: qty,
          rejectedQty: 0,
          currentStationId: parentBatch.currentStationId,
          status: 'in_progress',
          parentBatchId: parentBatchId,
          qrCodeUrl: `/api/batches/${subBatchId}/qr-code`,
          qrCodeDataURL: qrCodeDataURL,
          createdAt: new Date(),
        },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      createdSubBatches.push(subBatch);
    }

    // Update parent batch status to 'split'
    await prisma.batch.update({
      where: { id: parentBatchId },
      data: { status: 'split' }
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdSubBatches.length} sub-batches`,
      parentBatch: {
        id: parentBatch.id,
        batchCode: parentBatch.batchCode,
        status: 'split'
      },
      subBatches: createdSubBatches
    });
  } catch (error) {
    console.error('Error splitting batch:', error);
    res.status(500).json({ error: 'Failed to split batch' });
  }
});

// POST /api/batches/:id/reject - Create rejection batch from defects
router.post('/:id/reject', async (req, res) => {
  const parentBatchId = req.params.id;
  const { operatorId, stationId, reason, quantity, photos, notes, reworkRequired } = req.body;

  try {
    // Validate request body
    if (!operatorId || !stationId || !reason || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: operatorId, stationId, reason, quantity' });
    }

    // Validate quantity is a positive number
    const rejectionQty = Number(quantity);
    if (isNaN(rejectionQty) || rejectionQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    // Fetch parent batch
    const parentBatch = await prisma.batch.findUnique({
      where: { id: parentBatchId },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } }
      }
    });

    if (!parentBatch) {
      return res.status(404).json({ error: 'Parent batch not found' });
    }

    // Validate rejection quantity doesn't exceed current quantity
    if (rejectionQty > parentBatch.currentQty) {
      return res.status(400).json({ 
        error: `Rejection quantity (${rejectionQty}) exceeds current quantity (${parentBatch.currentQty})` 
      });
    }

    // Count existing rejection batches to generate sequence number
    const existingRejections = await prisma.batch.count({
      where: {
        parentBatchId: parentBatchId,
        isRejection: true
      }
    });

    const rejectionSeq = existingRejections + 1;
    const rejectionCode = `${parentBatch.batchCode}-REJ${String(rejectionSeq).padStart(2, '0')}`;
    const rejectionId = `B-REJ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Generate QR code for rejection batch
    const qrCodeDataURL = await batchUtils.generateBatchQRCode(rejectionId, rejectionCode);

    // Create rejection batch record
    const rejectionBatch = await prisma.batch.create({
      data: {
        id: rejectionId,
        batchCode: rejectionCode,
        projectId: parentBatch.projectId,
        projectSkuId: parentBatch.projectSkuId,
        targetQty: rejectionQty,
        currentQty: rejectionQty,
        rejectedQty: 0,
        currentStationId: stationId,
        parentBatchId: parentBatchId,
        isRejection: true,
        rejectionReason: reason,
        reworkRequired: reworkRequired || false,
        status: 'rejected',
        qrCodeUrl: `/api/batches/${rejectionId}/qr-code`,
        qrCodeDataURL: qrCodeDataURL,
        createdAt: new Date(),
      },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Update parent batch: increment rejectedQty, decrement currentQty
    await prisma.batch.update({
      where: { id: parentBatchId },
      data: {
        rejectedQty: { increment: rejectionQty },
        currentQty: { decrement: rejectionQty }
      }
    });

    // Create batch movement record for rejection
    await prisma.batchMovement.create({
      data: {
        batchId: parentBatchId,
        fromStationId: parentBatch.currentStationId,
        toStationId: stationId,
        operatorId: operatorId,
        quantity: rejectionQty,
        condition: 'rejected',
        notes: notes || `Rejected: ${reason}`,
        photos: photos || [],
        timestamp: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: `Created rejection batch ${rejectionCode}`,
      rejectionBatch: rejectionBatch,
      parentBatch: {
        id: parentBatch.id,
        batchCode: parentBatch.batchCode,
        currentQty: parentBatch.currentQty - rejectionQty,
        rejectedQty: parentBatch.rejectedQty + rejectionQty
      }
    });
  } catch (error) {
    console.error('Error creating rejection batch:', error);
    res.status(500).json({ error: 'Failed to create rejection batch' });
  }
});

// POST /api/batches/:id/rework-complete - Mark rejection batch as reworked
router.post('/:id/rework-complete', async (req, res) => {
  const rejectionBatchId = req.params.id;
  const { operatorId, stationId, notes, photos } = req.body;

  try {
    // Validate request body
    if (!operatorId || !stationId) {
      return res.status(400).json({ error: 'Missing required fields: operatorId, stationId' });
    }

    // Fetch rejection batch
    const rejectionBatch = await prisma.batch.findUnique({
      where: { id: rejectionBatchId },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } }
      }
    });

    if (!rejectionBatch) {
      return res.status(404).json({ error: 'Rejection batch not found' });
    }

    // Validate this is a rejection batch
    if (!rejectionBatch.isRejection) {
      return res.status(400).json({ error: 'This batch is not a rejection batch' });
    }

    // Validate rework was required
    if (!rejectionBatch.reworkRequired) {
      return res.status(400).json({ error: 'This rejection batch does not require rework' });
    }

    // Validate not already reworked
    if (rejectionBatch.reworkCompleted) {
      return res.status(400).json({ error: 'This rejection batch has already been reworked' });
    }

    // Update rejection batch to completed rework
    const updatedRejectionBatch = await prisma.batch.update({
      where: { id: rejectionBatchId },
      data: {
        reworkCompleted: true,
        status: 'reworked',
        completedAt: new Date()
      },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Update parent batch: increment reworkedQty
    if (rejectionBatch.parentBatchId) {
      await prisma.batch.update({
        where: { id: rejectionBatch.parentBatchId },
        data: {
          reworkedQty: { increment: rejectionBatch.currentQty }
        }
      });
    }

    // Create batch movement record for rework completion
    await prisma.batchMovement.create({
      data: {
        batchId: rejectionBatchId,
        fromStationId: rejectionBatch.currentStationId,
        toStationId: stationId,
        operatorId: operatorId,
        quantity: rejectionBatch.currentQty,
        condition: 'reworked',
        notes: notes || 'Rework completed',
        photos: photos || [],
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: `Rework completed for ${rejectionBatch.batchCode}`,
      rejectionBatch: updatedRejectionBatch
    });
  } catch (error) {
    console.error('Error completing rework:', error);
    res.status(500).json({ error: 'Failed to complete rework' });
  }
});

// POST /api/batches/assemble - Create assembly batch from multiple source batches
router.post('/assemble', async (req, res) => {
  const { 
    projectId, 
    assemblyStationId, 
    operatorId, 
    sourceBatches, 
    outputQuantity, 
    outputSkuId, 
    notes 
  } = req.body;

  try {
    // Validate required fields
    if (!projectId || !assemblyStationId || !operatorId || !sourceBatches || !outputQuantity || !outputSkuId) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, assemblyStationId, operatorId, sourceBatches, outputQuantity, outputSkuId' 
      });
    }

    // Validate sourceBatches is array with at least 2 items
    if (!Array.isArray(sourceBatches) || sourceBatches.length < 2) {
      return res.status(400).json({ 
        error: 'sourceBatches must be an array with at least 2 batches' 
      });
    }

    // Validate outputQuantity is positive
    const assemblyQty = Number(outputQuantity);
    if (isNaN(assemblyQty) || assemblyQty <= 0) {
      return res.status(400).json({ error: 'outputQuantity must be a positive number' });
    }

    // Fetch project and SKU
    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const outputSku = await prisma.projectSku.findUnique({ where: { id: Number(outputSkuId) } });
    if (!outputSku) {
      return res.status(404).json({ error: 'Output SKU not found' });
    }

    // Fetch station
    const station = await prisma.station.findUnique({ where: { id: Number(assemblyStationId) } });
    if (!station) {
      return res.status(404).json({ error: 'Assembly station not found' });
    }

    // Fetch and validate all source batches
    const sourceBatchIds = sourceBatches.map(sb => sb.batchId);
    const fetchedSourceBatches = await prisma.batch.findMany({
      where: { id: { in: sourceBatchIds } },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Check all batches exist
    if (fetchedSourceBatches.length !== sourceBatchIds.length) {
      const foundIds = fetchedSourceBatches.map(b => b.id);
      const missingIds = sourceBatchIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        error: `Source batches not found: ${missingIds.join(', ')}` 
      });
    }

    // Validate quantities
    const quantityValidation = sourceBatches.map(sb => {
      const batch = fetchedSourceBatches.find(b => b.id === sb.batchId);
      const requestedQty = Number(sb.quantityUsed);
      
      if (isNaN(requestedQty) || requestedQty <= 0) {
        return { valid: false, batchId: sb.batchId, error: 'Invalid quantity' };
      }
      
      if (requestedQty > batch.currentQty) {
        return { 
          valid: false, 
          batchId: sb.batchId, 
          error: `Insufficient quantity (requested: ${requestedQty}, available: ${batch.currentQty})` 
        };
      }
      
      return { valid: true, batchId: sb.batchId };
    });

    const invalidBatches = quantityValidation.filter(v => !v.valid);
    if (invalidBatches.length > 0) {
      return res.status(400).json({ 
        error: 'Quantity validation failed', 
        details: invalidBatches 
      });
    }

    // Generate assembly batch code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const assemblyCode = `ASM-${timestamp}-${random}`;
    const assemblyId = `B-ASM-${timestamp}-${random}`;

    // Generate QR code for assembly batch
    const qrCodeDataURL = await batchUtils.generateBatchQRCode(assemblyId, assemblyCode);

    // Create assembly batch
    const assemblyBatch = await prisma.batch.create({
      data: {
        id: assemblyId,
        batchCode: assemblyCode,
        projectId: Number(projectId),
        projectSkuId: Number(outputSkuId),
        targetQty: assemblyQty,
        currentQty: assemblyQty,
        rejectedQty: 0,
        currentStationId: Number(assemblyStationId),
        isAssembly: true,
        status: 'assembled',
        qrCodeUrl: `/api/batches/${assemblyId}/qr-code`,
        qrCodeDataURL: qrCodeDataURL,
        createdAt: new Date(),
      },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Create assembly component records and update source batches
    const componentRecords = [];
    const updatedSourceBatches = [];

    for (const sb of sourceBatches) {
      const quantityUsed = Number(sb.quantityUsed);
      
      // Create assembly component record
      const component = await prisma.assemblyComponent.create({
        data: {
          assemblyBatchId: assemblyId,
          componentBatchId: sb.batchId,
          quantityUsed: quantityUsed,
          notes: sb.notes || null
        }
      });
      componentRecords.push(component);

      // Update source batch: decrement currentQty
      const updatedBatch = await prisma.batch.update({
        where: { id: sb.batchId },
        data: {
          currentQty: { decrement: quantityUsed }
        },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });
      updatedSourceBatches.push(updatedBatch);
    }

    // Create batch movement record for assembly creation
    await prisma.batchMovement.create({
      data: {
        batchId: assemblyId,
        fromStationId: null,
        toStationId: Number(assemblyStationId),
        operatorId: Number(operatorId),
        quantity: assemblyQty,
        condition: 'good',
        notes: notes || `Assembly created from ${sourceBatches.length} source batches`,
        photos: [],
        timestamp: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: `Assembly batch ${assemblyCode} created from ${sourceBatches.length} source batches`,
      assemblyBatch: assemblyBatch,
      componentRecords: componentRecords,
      updatedSourceBatches: updatedSourceBatches
    });
  } catch (error) {
    console.error('Error creating assembly:', error);
    res.status(500).json({ error: 'Failed to create assembly batch' });
  }
});

// GET /api/batches/:id/trace-forward - Trace batch forward to end products
router.get('/:id/trace-forward', async (req, res) => {
  const batchId = req.params.id;

  try {
    // Recursive function to build forward trace tree
    const buildForwardTree = async (batchId, visited = new Set()) => {
      // Prevent circular references
      if (visited.has(batchId)) {
        return null;
      }
      visited.add(batchId);

      // Get batch details
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      if (!batch) {
        return null;
      }

      // Find sub-batches (batches split from this one)
      const subBatches = await prisma.batch.findMany({
        where: { parentBatchId: batchId },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      // Find assemblies (batches this was assembled into)
      const assemblies = await prisma.batch.findMany({
        where: {
          assemblyComponents: {
            some: {
              componentBatchId: batchId
            }
          }
        },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      // Recursively build tree for each child
      const subBatchTrees = await Promise.all(
        subBatches.map(sb => buildForwardTree(sb.id, visited))
      );

      const assemblyTrees = await Promise.all(
        assemblies.map(asm => buildForwardTree(asm.id, visited))
      );

      return {
        batch: {
          id: batch.id,
          batchCode: batch.batchCode,
          status: batch.status,
          currentQty: batch.currentQty,
          targetQty: batch.targetQty,
          rejectedQty: batch.rejectedQty,
          isRejection: batch.isRejection,
          isAssembly: batch.isAssembly,
          project: batch.Project,
          sku: batch.ProjectSku,
          station: batch.Station,
          createdAt: batch.createdAt,
          completedAt: batch.completedAt
        },
        subBatches: subBatchTrees.filter(t => t !== null),
        assemblies: assemblyTrees.filter(t => t !== null)
      };
    };

    const traceTree = await buildForwardTree(batchId);

    if (!traceTree) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({
      success: true,
      rootBatchId: batchId,
      trace: traceTree
    });
  } catch (error) {
    console.error('Error tracing forward:', error);
    res.status(500).json({ error: 'Failed to trace batch forward' });
  }
});

// GET /api/batches/:id/trace-backward - Trace batch backward to source materials
router.get('/:id/trace-backward', async (req, res) => {
  const batchId = req.params.id;

  try {
    // Recursive function to build backward trace tree
    const buildBackwardTree = async (batchId, visited = new Set()) => {
      // Prevent circular references
      if (visited.has(batchId)) {
        return null;
      }
      visited.add(batchId);

      // Get batch details
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } },
          parentBatch: {
            select: {
              id: true,
              batchCode: true,
              status: true,
              currentQty: true,
              targetQty: true
            }
          }
        }
      });

      if (!batch) {
        return null;
      }

      // Get material lots used in this batch
      const materialLots = await prisma.wipLedger.findMany({
        where: { batchId: batchId },
        distinct: ['lotNumber'],
        select: {
          lotNumber: true,
          materialName: true,
          quantityUsed: true,
          timestamp: true
        },
        orderBy: { timestamp: 'desc' }
      });

      // Get assembly components (if this is an assembly)
      const components = await prisma.assemblyComponent.findMany({
        where: { assemblyBatchId: batchId },
        include: {
          componentBatch: {
            include: {
              Project: { select: { id: true, name: true } },
              ProjectSku: { select: { id: true, skuCode: true, name: true } },
              Station: { select: { id: true, name: true, code: true } }
            }
          }
        }
      });

      // Recursively build tree for parent
      let parentTree = null;
      if (batch.parentBatch) {
        parentTree = await buildBackwardTree(batch.parentBatch.id, visited);
      }

      // Recursively build tree for each component
      const componentTrees = await Promise.all(
        components.map(comp => buildBackwardTree(comp.componentBatch.id, visited))
      );

      return {
        batch: {
          id: batch.id,
          batchCode: batch.batchCode,
          status: batch.status,
          currentQty: batch.currentQty,
          targetQty: batch.targetQty,
          rejectedQty: batch.rejectedQty,
          isRejection: batch.isRejection,
          isAssembly: batch.isAssembly,
          project: batch.Project,
          sku: batch.ProjectSku,
          station: batch.Station,
          createdAt: batch.createdAt,
          completedAt: batch.completedAt
        },
        parentBatch: parentTree,
        componentBatches: componentTrees.filter(t => t !== null),
        materialLots: materialLots
      };
    };

    const traceTree = await buildBackwardTree(batchId);

    if (!traceTree) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({
      success: true,
      rootBatchId: batchId,
      trace: traceTree
    });
  } catch (error) {
    console.error('Error tracing backward:', error);
    res.status(500).json({ error: 'Failed to trace batch backward' });
  }
});

// GET /api/batches/material-recall - Find all batches affected by material lot
router.get('/material-recall', async (req, res) => {
  const { lotNumber } = req.query;

  try {
    if (!lotNumber) {
      return res.status(400).json({ error: 'Missing required parameter: lotNumber' });
    }

    // Find all batches that used this material lot
    const wipEntries = await prisma.wipLedger.findMany({
      where: { lotNumber: String(lotNumber) },
      include: {
        batch: {
          include: {
            Project: { select: { id: true, name: true } },
            ProjectSku: { select: { id: true, skuCode: true, name: true } },
            Station: { select: { id: true, name: true, code: true } }
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const affectedBatchIds = [...new Set(wipEntries.map(entry => entry.batchId))];

    // For each affected batch, trace forward to find all downstream batches
    const downstreamBatches = new Map();
    
    const traceDownstream = async (batchId, visited = new Set()) => {
      if (visited.has(batchId)) return;
      visited.add(batchId);

      // Find sub-batches
      const subBatches = await prisma.batch.findMany({
        where: { parentBatchId: batchId },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      for (const sb of subBatches) {
        downstreamBatches.set(sb.id, sb);
        await traceDownstream(sb.id, visited);
      }

      // Find assemblies
      const assemblies = await prisma.batch.findMany({
        where: {
          assemblyComponents: {
            some: { componentBatchId: batchId }
          }
        },
        include: {
          Project: { select: { id: true, name: true } },
          ProjectSku: { select: { id: true, skuCode: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        }
      });

      for (const asm of assemblies) {
        downstreamBatches.set(asm.id, asm);
        await traceDownstream(asm.id, visited);
      }
    };

    // Trace downstream for each directly affected batch
    for (const batchId of affectedBatchIds) {
      await traceDownstream(batchId);
    }

    // Get full details of directly affected batches
    const directlyAffectedBatches = wipEntries.map(entry => ({
      batch: {
        id: entry.batch.id,
        batchCode: entry.batch.batchCode,
        status: entry.batch.status,
        currentQty: entry.batch.currentQty,
        targetQty: entry.batch.targetQty,
        project: entry.batch.Project,
        sku: entry.batch.ProjectSku,
        station: entry.batch.Station,
        createdAt: entry.batch.createdAt
      },
      materialUsage: {
        lotNumber: entry.lotNumber,
        materialName: entry.materialName,
        quantityUsed: entry.quantityUsed,
        timestamp: entry.timestamp
      }
    }));

    // Convert downstream map to array
    const downstreamBatchList = Array.from(downstreamBatches.values()).map(batch => ({
      id: batch.id,
      batchCode: batch.batchCode,
      status: batch.status,
      currentQty: batch.currentQty,
      targetQty: batch.targetQty,
      project: batch.Project,
      sku: batch.ProjectSku,
      station: batch.Station,
      createdAt: batch.createdAt,
      relationship: batch.parentBatchId ? 'sub-batch' : batch.isAssembly ? 'assembly' : 'derived'
    }));

    res.json({
      success: true,
      lotNumber: String(lotNumber),
      summary: {
        directlyAffected: directlyAffectedBatches.length,
        downstreamAffected: downstreamBatchList.length,
        totalAffected: directlyAffectedBatches.length + downstreamBatchList.length
      },
      directlyAffectedBatches,
      downstreamBatches: downstreamBatchList
    });
  } catch (error) {
    console.error('Error finding material recall:', error);
    res.status(500).json({ error: 'Failed to find affected batches' });
  }
});

// GET /api/batches/operator-tracking - Find all batches touched by operator
router.get('/operator-tracking', async (req, res) => {
  const { operatorId, startDate, endDate } = req.query;

  try {
    if (!operatorId) {
      return res.status(400).json({ error: 'Missing required parameter: operatorId' });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(String(startDate));
    }
    if (endDate) {
      dateFilter.lte = new Date(String(endDate));
    }

    // Find all movements by operator
    const movements = await prisma.batchMovement.findMany({
      where: {
        operatorId: Number(operatorId),
        ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
      },
      include: {
        batch: {
          include: {
            Project: { select: { id: true, name: true } },
            ProjectSku: { select: { id: true, skuCode: true, name: true } }
          }
        },
        fromStation: { select: { id: true, name: true, code: true } },
        toStation: { select: { id: true, name: true, code: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Find all QC submissions by operator
    const qcSubmissions = await prisma.qCSubmission.findMany({
      where: {
        operatorId: Number(operatorId),
        ...(Object.keys(dateFilter).length > 0 && { submittedAt: dateFilter })
      },
      include: {
        batch: {
          include: {
            Project: { select: { id: true, name: true } },
            ProjectSku: { select: { id: true, skuCode: true, name: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Get unique batches touched
    const batchIds = new Set([
      ...movements.map(m => m.batchId),
      ...qcSubmissions.map(q => q.batchId)
    ]);

    // Group activities by batch
    const batchActivities = Array.from(batchIds).map(batchId => {
      const batchMovements = movements.filter(m => m.batchId === batchId);
      const batchQC = qcSubmissions.filter(q => q.batchId === batchId);
      
      const batch = batchMovements[0]?.batch || batchQC[0]?.batch;

      return {
        batch: {
          id: batch.id,
          batchCode: batch.batchCode,
          status: batch.status,
          currentQty: batch.currentQty,
          targetQty: batch.targetQty,
          project: batch.Project,
          sku: batch.ProjectSku
        },
        activities: {
          movements: batchMovements.map(m => ({
            id: m.id,
            fromStation: m.fromStation,
            toStation: m.toStation,
            quantity: m.quantity,
            condition: m.condition,
            timestamp: m.timestamp,
            notes: m.notes
          })),
          qcSubmissions: batchQC.map(q => ({
            id: q.id,
            result: q.result,
            notes: q.notes,
            submittedAt: q.submittedAt
          })),
          totalActions: batchMovements.length + batchQC.length
        }
      };
    });

    // Sort by most recent activity
    batchActivities.sort((a, b) => {
      const aLatest = Math.max(
        ...a.activities.movements.map(m => new Date(m.timestamp).getTime()),
        ...a.activities.qcSubmissions.map(q => new Date(q.submittedAt).getTime())
      );
      const bLatest = Math.max(
        ...b.activities.movements.map(m => new Date(m.timestamp).getTime()),
        ...b.activities.qcSubmissions.map(q => new Date(q.submittedAt).getTime())
      );
      return bLatest - aLatest;
    });

    res.json({
      success: true,
      operatorId: Number(operatorId),
      dateRange: {
        start: startDate || null,
        end: endDate || null
      },
      summary: {
        batchesTouched: batchIds.size,
        totalMovements: movements.length,
        totalQCSubmissions: qcSubmissions.length,
        totalActions: movements.length + qcSubmissions.length
      },
      batches: batchActivities
    });
  } catch (error) {
    console.error('Error tracking operator:', error);
    res.status(500).json({ error: 'Failed to track operator activities' });
  }
});

// GET /api/batches/:id/handover-sheet - Generate printable handover sheet
router.get('/:id/handover-sheet', async (req, res) => {
  try {
    const batchId = req.params.id;

    // Get batch with all related data
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        parentBatch: {
          select: { id: true, batchCode: true, status: true }
        },
        subBatches: {
          select: {
            id: true,
            batchCode: true,
            currentQty: true,
            status: true,
            Station: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: {
            BatchMovement: true,
            QCSubmission: true,
            wipLedgers: true
          }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get movement history
    const movements = await prisma.batchMovement.findMany({
      where: { batchId },
      include: {
        Station_BatchMovement_fromStationIdToStation: {
          select: { id: true, name: true, code: true }
        },
        Station_BatchMovement_toStationIdToStation: {
          select: { id: true, name: true, code: true }
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    // Generate QR code data URL
    const qrCodeDataURL = await batchUtils.generateBatchQRCode(batch.id, batch.batchCode);

    // Generate HTML handover sheet
    const html = batchUtils.generateHandoverSheet(batch, movements, qrCodeDataURL);

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error generating handover sheet:', error);
    res.status(500).json({ error: 'Failed to generate handover sheet' });
  }
});

// GET /api/batches/:id/qr-code - QR code generation
router.get('/:id/qr-code', async (req, res) => {
  try {
    const batchId = req.params.id;
    const size = parseInt(req.query.size) || 300;
    const format = req.query.format || 'png';

    // Get batch to retrieve batch code
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, batchCode: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Generate QR code as buffer
    const qrCodeBuffer = await batchUtils.generateBatchQRCodeBuffer(batch.id, batch.batchCode, size);

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="batch-${batch.batchCode}-qr.png"`);
    res.send(qrCodeBuffer);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// POST /api/batches/scan-qr - Parse scanned QR code and return batch details
router.post('/scan-qr', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'qrData is required' });
    }

    // Parse QR code data
    const { batchId, batchCode } = batchUtils.parseBatchQRCode(qrData);

    // Get full batch details
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            BatchMovement: true,
            QCSubmission: true,
            wipLedgers: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found', batchCode });
    }

    res.json({
      success: true,
      batch,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error parsing QR code:', error);
    res.status(400).json({ error: 'Invalid QR code data', details: error.message });
  }
});

// PUT /api/batches/:id - Update batch
router.put('/:id', async (req, res) => {
  try {
    const {
      currentQty,
      rejectedQty,
      currentStationId,
      status,
      completedQuantity,
      machineId,
      materialLots,
    } = req.body;

    const updateData = {};
    if (currentQty !== undefined) updateData.currentQty = parseInt(currentQty);
    if (rejectedQty !== undefined) updateData.rejectedQty = parseInt(rejectedQty);
    if (currentStationId !== undefined) updateData.currentStationId = currentStationId ? parseInt(currentStationId) : null;
    if (status !== undefined) updateData.status = status;
    if (machineId !== undefined) updateData.machineId = machineId;
    if (materialLots !== undefined) updateData.materialLots = materialLots;
    if (completedQuantity !== undefined) updateData.currentQty = parseInt(completedQuantity);

    if (status === 'completed' || status === 'closed') {
      updateData.completedAt = new Date();
    }

    const batch = await prisma.batch.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true } },
      },
    });

    res.json(batch);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

// (duplicate move route removed to avoid conflicts)
// DELETE /api/batches/:id - Delete batch
router.delete('/:id', async (req, res) => {
  try {
    await prisma.batch.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

// GET /api/batches/analytics/summary - Batch analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const [totalBatches, byStatus, productionStats] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.batch.aggregate({
        where,
        _sum: {
          targetQty: true,
          currentQty: true,
          rejectedQty: true,
        },
        _avg: {
          currentQty: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    const totalTarget = productionStats._sum.targetQty || 0;
    const totalProduced = productionStats._sum.currentQty || 0;
    const totalRejected = productionStats._sum.rejectedQty || 0;
    const completionRate = totalTarget > 0 ? (totalProduced / totalTarget) * 100 : 0;

    res.json({
      totalBatches,
      byStatus: statusCounts,
      totalTarget,
      totalProduced,
      totalRejected,
      completionRate,
      avgProduced: productionStats._avg.currentQty || 0,
    });
  } catch (error) {
    console.error('Error fetching batch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
