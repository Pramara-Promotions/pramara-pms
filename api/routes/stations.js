// api/routes/stations.js
/**
 * Station Hierarchy Management Routes
 * Manages Factory → Floor → Section → Room → Station hierarchy
 * Includes Station Types and Maintenance Logs
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { learningEngine } = require('../lib/learningEngine');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// FACTORY CRUD
// ============================================================================

// Get all factories
router.get('/factories', authGuard, async (req, res) => {
  try {
    const factories = await prisma.factory.findMany({
      include: {
        _count: {
          select: { floors: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    
    res.json(factories);
  } catch (error) {
    console.error('Error fetching factories:', error);
    res.status(500).json({ error: 'Failed to fetch factories' });
  }
});

// Create factory
router.post('/factories', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { name, code, location, address, contactPerson, contactPhone } = req.body;
    
    const factory = await prisma.factory.create({
      data: {
        name,
        code,
        location,
        address,
        contactPerson,
        contactPhone,
      },
    });
    
    res.status(201).json(factory);
  } catch (error) {
    console.error('Error creating factory:', error);
    res.status(500).json({ error: 'Failed to create factory' });
  }
});

// Update factory
router.put('/factories/:id', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const factory = await prisma.factory.update({
      where: { id: parseInt(id) },
      data: updates,
    });
    
    res.json(factory);
  } catch (error) {
    console.error('Error updating factory:', error);
    res.status(500).json({ error: 'Failed to update factory' });
  }
});

// Delete factory
router.delete('/factories/:id', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.factory.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Factory deleted successfully' });
  } catch (error) {
    console.error('Error deleting factory:', error);
    res.status(500).json({ error: 'Failed to delete factory' });
  }
});

// ============================================================================
// FLOOR CRUD
// ============================================================================

// Get floors for a factory
router.get('/factories/:factoryId/floors', authGuard, async (req, res) => {
  try {
    const { factoryId } = req.params;
    
    const floors = await prisma.floor.findMany({
      where: { factoryId: parseInt(factoryId) },
      include: {
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { floorNumber: 'asc' },
    });
    
    res.json(floors);
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

// Create floor
router.post('/floors', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { factoryId, name, floorNumber } = req.body;
    
    const floor = await prisma.floor.create({
      data: {
        factoryId,
        name,
        floorNumber,
      },
    });
    
    res.status(201).json(floor);
  } catch (error) {
    console.error('Error creating floor:', error);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

// Update floor
router.put('/floors/:id', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const floor = await prisma.floor.update({
      where: { id: parseInt(id) },
      data: updates,
    });
    
    res.json(floor);
  } catch (error) {
    console.error('Error updating floor:', error);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

// ============================================================================
// SECTION CRUD
// ============================================================================

// Get sections for a floor
router.get('/floors/:floorId/sections', authGuard, async (req, res) => {
  try {
    const { floorId } = req.params;
    
    const sections = await prisma.section.findMany({
      where: { floorId: parseInt(floorId) },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Create section
router.post('/sections', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { floorId, name, description } = req.body;
    
    const section = await prisma.section.create({
      data: {
        floorId,
        name,
        description,
      },
    });
    
    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// ============================================================================
// ROOM CRUD
// ============================================================================

// Get rooms for a section
router.get('/sections/:sectionId/rooms', authGuard, async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const rooms = await prisma.room.findMany({
      where: { sectionId: parseInt(sectionId) },
      include: {
        _count: {
          select: { stations: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create room
router.post('/rooms', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { sectionId, name, roomNumber, description } = req.body;
    
    const room = await prisma.room.create({
      data: {
        sectionId,
        name,
        roomNumber,
        description,
      },
    });
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// ============================================================================
// STATION CRUD
// ============================================================================

// Get all stations with filters
router.get('/stations', authGuard, async (req, res) => {
  try {
    const { roomId, stationTypeId, status, search } = req.query;
    
    const where = {};
    if (roomId) where.roomId = parseInt(roomId);
    if (stationTypeId) where.stationTypeId = parseInt(stationTypeId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const stations = await prisma.station.findMany({
      where,
      include: {
        Room: {
          include: {
            Section: {
              include: {
                Floor: {
                  include: {
                    Factory: true,
                  },
                },
              },
            },
          },
        },
        StationType: true,
        _count: {
          select: {
            maintenanceLogs: true,
            productionEntries: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    
    res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Get station by ID with full details
router.get('/stations/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    
    const station = await prisma.station.findUnique({
      where: { id: parseInt(id) },
      include: {
        Room: {
          include: {
            Section: {
              include: {
                Floor: {
                  include: {
                    Factory: true,
                  },
                },
              },
            },
          },
        },
        StationType: true,
        maintenanceLogs: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// Create station
router.post('/stations', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { roomId, stationTypeId, name, code, description, capacity } = req.body;
    
    const station = await prisma.station.create({
      data: {
        roomId,
        stationTypeId,
        name,
        code,
        description,
        capacity: capacity || 1,
      },
      include: {
        Room: true,
        StationType: true,
      },
    });
    
    res.status(201).json(station);
  } catch (error) {
    console.error('Error creating station:', error);
    res.status(500).json({ error: 'Failed to create station' });
  }
});

// Update station
router.put('/stations/:id', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const station = await prisma.station.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        Room: true,
        StationType: true,
      },
    });
    
    // If status changed to 'down', trigger notification
    if (updates.status === 'down') {
      // TODO: Trigger equipment downtime alert
      console.log(`Station ${id} marked as down - notification should be sent`);
    }
    
    res.json(station);
  } catch (error) {
    console.error('Error updating station:', error);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

// ============================================================================
// STATION TYPE CRUD
// ============================================================================

// Get all station types
router.get('/station-types', authGuard, async (req, res) => {
  try {
    const types = await prisma.stationType.findMany({
      include: {
        _count: {
          select: { stations: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(types);
  } catch (error) {
    console.error('Error fetching station types:', error);
    res.status(500).json({ error: 'Failed to fetch station types' });
  }
});

// Create station type
router.post('/station-types', authGuard, permissionGuard('admin'), async (req, res) => {
  try {
    const { name, code, description, defaultSkills } = req.body;
    
    const type = await prisma.stationType.create({
      data: {
        name,
        code,
        description,
        defaultSkills: defaultSkills || [],
      },
    });
    
    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating station type:', error);
    res.status(500).json({ error: 'Failed to create station type' });
  }
});

// ============================================================================
// MAINTENANCE LOG
// ============================================================================

// Get maintenance logs for a station
router.get('/stations/:stationId/maintenance', authGuard, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { limit = 50 } = req.query;
    
    const logs = await prisma.maintenanceLog.findMany({
      where: { stationId: parseInt(stationId) },
      orderBy: { startTime: 'desc' },
      take: parseInt(limit),
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

// Create maintenance log
router.post('/maintenance', authGuard, async (req, res) => {
  try {
    const { stationId, maintenanceType, description, performedBy, startTime, endTime, cost, notes } = req.body;
    
    const duration = endTime 
      ? Math.floor((new Date(endTime) - new Date(startTime)) / 60000) 
      : null;
    
    const log = await prisma.maintenanceLog.create({
      data: {
        stationId,
        maintenanceType,
        description,
        performedBy,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration,
        cost,
        notes,
      },
      include: {
        Station: true,
      },
    });
    
    // Update station status if maintenance is starting
    if (!endTime) {
      await prisma.station.update({
        where: { id: stationId },
        data: { status: 'maintenance' },
      });
    }
    
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
});

// Update maintenance log (e.g., mark as complete)
router.put('/maintenance/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { endTime, cost, notes } = req.body;
    
    const existing = await prisma.maintenanceLog.findUnique({
      where: { id },
    });
    
    const duration = endTime && existing.startTime
      ? Math.floor((new Date(endTime) - new Date(existing.startTime)) / 60000)
      : existing.duration;
    
    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        duration,
        cost,
        notes,
      },
      include: {
        Station: true,
      },
    });
    
    // Update station status if maintenance is complete
    if (endTime) {
      await prisma.station.update({
        where: { id: log.stationId },
        data: { status: 'operational' },
      });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error updating maintenance log:', error);
    res.status(500).json({ error: 'Failed to update maintenance log' });
  }
});

// ============================================================================
// HIERARCHY TREE VIEW
// ============================================================================

// Get complete station hierarchy
router.get('/hierarchy', authGuard, async (req, res) => {
  try {
    const factories = await prisma.factory.findMany({
      where: { active: true },
      include: {
        floors: {
          where: { active: true },
          include: {
            sections: {
              where: { active: true },
              include: {
                rooms: {
                  where: { active: true },
                  include: {
                    stations: {
                      where: { active: true },
                      include: {
                        StationType: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    
    res.json(factories);
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

module.exports = router;
