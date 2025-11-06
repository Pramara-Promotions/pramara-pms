const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');

const prisma = new PrismaClient();

// ==================== FACTORY ROUTES ====================

// GET /api/factories - List all factories
router.get('/factories', authGuard, async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    
    if (active !== undefined) {
      where.active = active === 'true';
    }

    const factories = await prisma.factory.findMany({
      where,
      include: {
        Floor: {
          where: { active: true },
          include: {
            Section: {
              where: { active: true },
              include: {
                Room: {
                  where: { active: true },
                  include: {
                    Station: {
                      where: { active: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate counts
    const factoriesWithCounts = factories.map(factory => ({
      ...factory,
      floorCount: factory.Floor.length,
      sectionCount: factory.Floor.reduce((sum, floor) => sum + floor.Section.length, 0),
      roomCount: factory.Floor.reduce((sum, floor) => 
        sum + floor.Section.reduce((sectionSum, section) => sectionSum + section.Room.length, 0), 0),
      stationCount: factory.Floor.reduce((sum, floor) => 
        sum + floor.Section.reduce((sectionSum, section) => 
          sectionSum + section.Room.reduce((roomSum, room) => roomSum + room.Station.length, 0), 0), 0)
    }));

    res.json(factoriesWithCounts);
  } catch (error) {
    console.error('Error fetching factories:', error);
    res.status(500).json({ error: 'Failed to fetch factories' });
  }
});

// GET /api/factories/:id - Get single factory with full hierarchy
router.get('/factories/:id', authGuard, async (req, res) => {
  try {
    const factoryId = parseInt(req.params.id);

    const factory = await prisma.factory.findUnique({
      where: { id: factoryId },
      include: {
        Floor: {
          where: { active: true },
          include: {
            Section: {
              where: { active: true },
              include: {
                Room: {
                  where: { active: true },
                  include: {
                    Station: {
                      where: { active: true },
                      include: {
                        project: true,
                        StationType: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { floorNumber: 'asc' }
        }
      }
    });

    if (!factory) {
      return res.status(404).json({ error: 'Factory not found' });
    }

    res.json(factory);
  } catch (error) {
    console.error('Error fetching factory:', error);
    res.status(500).json({ error: 'Failed to fetch factory' });
  }
});

// POST /api/factories - Create new factory
router.post('/factories', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const { name, code, location, address, contactPerson, contactPhone, active = true } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check if code already exists
    const existing = await prisma.factory.findUnique({
      where: { code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Factory code already exists' });
    }

    const factory = await prisma.factory.create({
      data: {
        name,
        code,
        location,
        address,
        contactPerson,
        contactPhone,
        active
      }
    });

    res.status(201).json(factory);
  } catch (error) {
    console.error('Error creating factory:', error);
    res.status(500).json({ error: 'Failed to create factory' });
  }
});

// PUT /api/factories/:id - Update factory
router.put('/factories/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const factoryId = parseInt(req.params.id);
    const { name, code, location, address, contactPerson, contactPhone, active } = req.body;

    // Check if code is being changed and conflicts
    if (code) {
      const existing = await prisma.factory.findFirst({
        where: { 
          code,
          id: { not: factoryId }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Factory code already exists' });
      }
    }

    const factory = await prisma.factory.update({
      where: { id: factoryId },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(location !== undefined && { location }),
        ...(address !== undefined && { address }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      }
    });

    res.json(factory);
  } catch (error) {
    console.error('Error updating factory:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Factory not found' });
    }
    res.status(500).json({ error: 'Failed to update factory' });
  }
});

// DELETE /api/factories/:id - Soft delete factory
router.delete('/factories/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const factoryId = parseInt(req.params.id);

    // Soft delete by setting active to false
    const factory = await prisma.factory.update({
      where: { id: factoryId },
      data: { active: false }
    });

    res.json({ message: 'Factory deactivated', factory });
  } catch (error) {
    console.error('Error deleting factory:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Factory not found' });
    }
    res.status(500).json({ error: 'Failed to delete factory' });
  }
});

// ==================== FLOOR ROUTES ====================

// GET /api/factories/:factoryId/floors - List floors in factory
router.get('/factories/:factoryId/floors', authGuard, async (req, res) => {
  try {
    const factoryId = parseInt(req.params.factoryId);

    const floors = await prisma.floor.findMany({
      where: { 
        factoryId,
        active: true
      },
      include: {
        Section: {
          where: { active: true },
          include: {
            Room: {
              where: { active: true },
              include: {
                Station: { where: { active: true } }
              }
            }
          }
        }
      },
      orderBy: { floorNumber: 'asc' }
    });

    // Add counts
    const floorsWithCounts = floors.map(floor => ({
      ...floor,
      sectionCount: floor.Section.length,
      roomCount: floor.Section.reduce((sum, section) => sum + section.Room.length, 0),
      stationCount: floor.Section.reduce((sum, section) => 
        sum + section.Room.reduce((roomSum, room) => roomSum + room.Station.length, 0), 0)
    }));

    res.json(floorsWithCounts);
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

// POST /api/floors - Create new floor
router.post('/floors', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const { factoryId, name, floorNumber, active = true } = req.body;

    if (!factoryId || !name || floorNumber === undefined) {
      return res.status(400).json({ error: 'Factory ID, name, and floor number are required' });
    }

    // Check if floor number already exists in this factory
    const existing = await prisma.floor.findFirst({
      where: {
        factoryId: parseInt(factoryId),
        floorNumber: parseInt(floorNumber)
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Floor number already exists in this factory' });
    }

    const floor = await prisma.floor.create({
      data: {
        factoryId: parseInt(factoryId),
        name,
        floorNumber: parseInt(floorNumber),
        active
      },
      include: {
        Factory: true
      }
    });

    res.status(201).json(floor);
  } catch (error) {
    console.error('Error creating floor:', error);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

// PUT /api/floors/:id - Update floor
router.put('/floors/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const floorId = parseInt(req.params.id);
    const { name, floorNumber, active } = req.body;

    const floor = await prisma.floor.update({
      where: { id: floorId },
      data: {
        ...(name && { name }),
        ...(floorNumber !== undefined && { floorNumber: parseInt(floorNumber) }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      }
    });

    res.json(floor);
  } catch (error) {
    console.error('Error updating floor:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Floor not found' });
    }
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

// DELETE /api/floors/:id - Soft delete floor
router.delete('/floors/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const floorId = parseInt(req.params.id);

    const floor = await prisma.floor.update({
      where: { id: floorId },
      data: { active: false }
    });

    res.json({ message: 'Floor deactivated', floor });
  } catch (error) {
    console.error('Error deleting floor:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Floor not found' });
    }
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

// ==================== SECTION ROUTES ====================

// GET /api/floors/:floorId/sections - List sections on floor
router.get('/floors/:floorId/sections', authGuard, async (req, res) => {
  try {
    const floorId = parseInt(req.params.floorId);

    const sections = await prisma.section.findMany({
      where: { 
        floorId,
        active: true
      },
      include: {
        Room: {
          where: { active: true },
          include: {
            Station: { where: { active: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add counts
    const sectionsWithCounts = sections.map(section => ({
      ...section,
      roomCount: section.Room.length,
      stationCount: section.Room.reduce((sum, room) => sum + room.Station.length, 0)
    }));

    res.json(sectionsWithCounts);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST /api/sections - Create new section
router.post('/sections', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const { floorId, name, description, active = true } = req.body;

    if (!floorId || !name) {
      return res.status(400).json({ error: 'Floor ID and name are required' });
    }

    const section = await prisma.section.create({
      data: {
        floorId: parseInt(floorId),
        name,
        description,
        active
      },
      include: {
        Floor: {
          include: {
            Factory: true
          }
        }
      }
    });

    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// PUT /api/sections/:id - Update section
router.put('/sections/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);
    const { name, description, active } = req.body;

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      }
    });

    res.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE /api/sections/:id - Soft delete section
router.delete('/sections/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: { active: false }
    });

    res.json({ message: 'Section deactivated', section });
  } catch (error) {
    console.error('Error deleting section:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// ==================== ROOM ROUTES ====================

// GET /api/sections/:sectionId/rooms - List rooms in section
router.get('/sections/:sectionId/rooms', authGuard, async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId);

    const rooms = await prisma.room.findMany({
      where: { 
        sectionId,
        active: true
      },
      include: {
        Station: {
          where: { active: true },
          include: {
            project: true,
            StationType: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add station count
    const roomsWithCounts = rooms.map(room => ({
      ...room,
      stationCount: room.Station.length
    }));

    res.json(roomsWithCounts);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms - List all rooms (for dropdowns)
router.get('/rooms', authGuard, async (req, res) => {
  try {
    const { factoryId, floorId, sectionId } = req.query;
    const where = { active: true };

    if (sectionId) {
      where.sectionId = parseInt(sectionId);
    } else if (floorId) {
      where.Section = {
        floorId: parseInt(floorId),
        active: true
      };
    } else if (factoryId) {
      where.Section = {
        Floor: {
          factoryId: parseInt(factoryId),
          active: true
        },
        active: true
      };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        Section: {
          include: {
            Floor: {
              include: {
                Factory: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /api/rooms - Create new room
router.post('/rooms', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const { sectionId, name, roomNumber, description, active = true } = req.body;

    if (!sectionId || !name) {
      return res.status(400).json({ error: 'Section ID and name are required' });
    }

    const room = await prisma.room.create({
      data: {
        sectionId: parseInt(sectionId),
        name,
        roomNumber,
        description,
        active
      },
      include: {
        Section: {
          include: {
            Floor: {
              include: {
                Factory: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT /api/rooms/:id - Update room
router.put('/rooms/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { name, roomNumber, description, active } = req.body;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name && { name }),
        ...(roomNumber !== undefined && { roomNumber }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      }
    });

    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id - Soft delete room
router.delete('/rooms/:id', authGuard, permissionGuard('FACILITY_MANAGE'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { active: false }
    });

    res.json({ message: 'Room deactivated', room });
  } catch (error) {
    console.error('Error deleting room:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ==================== ANALYTICS & REPORTING ====================

// GET /api/factories/:id/analytics - Factory performance analytics
router.get('/factories/:id/analytics', authGuard, async (req, res) => {
  try {
    const factoryId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;

    // Get factory with all hierarchy
    const factory = await prisma.factory.findUnique({
      where: { id: factoryId },
      include: {
        Floor: {
          include: {
            Section: {
              include: {
                Room: {
                  include: {
                    Station: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!factory) {
      return res.status(404).json({ error: 'Factory not found' });
    }

    // Collect all station IDs
    const stationIds = factory.Floor.flatMap(floor =>
      floor.Section.flatMap(section =>
        section.Room.flatMap(room =>
          room.Station.map(station => station.id)
        )
      )
    );

    // Get production data
    const productionData = await prisma.productionEntry.findMany({
      where: {
        stationId: { in: stationIds },
        ...(startDate && endDate && {
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        })
      },
      include: {
        Station: true
      }
    });

    // Calculate metrics
    const totalOutput = productionData.reduce((sum, entry) => sum + entry.actualQty, 0);
    const totalTarget = productionData.reduce((sum, entry) => sum + entry.targetQty, 0);
    const totalRejected = productionData.reduce((sum, entry) => sum + entry.rejectedQty, 0);

    const efficiency = totalTarget > 0 ? (totalOutput / totalTarget) * 100 : 0;
    const qualityRate = totalOutput > 0 ? ((totalOutput - totalRejected) / totalOutput) * 100 : 0;

    res.json({
      factory: {
        id: factory.id,
        name: factory.name,
        code: factory.code
      },
      hierarchy: {
        floors: factory.Floor.length,
        sections: factory.Floor.reduce((sum, f) => sum + f.Section.length, 0),
        rooms: factory.Floor.reduce((sum, f) => sum + f.Section.reduce((s, sec) => s + sec.Room.length, 0), 0),
        stations: stationIds.length
      },
      production: {
        totalOutput,
        totalTarget,
        totalRejected,
        efficiency: efficiency.toFixed(2),
        qualityRate: qualityRate.toFixed(2),
        entriesCount: productionData.length
      },
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'present'
      }
    });
  } catch (error) {
    console.error('Error fetching factory analytics:', error);
    res.status(500).json({ error: 'Failed to fetch factory analytics' });
  }
});

module.exports = router;
