// api/routes/departments.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// List all departments
router.get('/departments', authGuard, permissionGuard('USER_VIEW'), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department by ID
router.get('/departments/:id', authGuard, permissionGuard('USER_VIEW'), async (req, res) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            roles: {
              include: {
                role: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department (Admin only)
router.post('/departments', authGuard, permissionGuard('USER_CREATE'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });
    
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Department with this name already exists' });
    }
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.put('/departments/:id', authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null })
      }
    });
    
    res.json(department);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Department not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Department with this name already exists' });
    }
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (only if no users)
router.delete('/departments/:id', authGuard, permissionGuard('USER_DELETE'), async (req, res) => {
  try {
    // Check if department has users
    const userCount = await prisma.user.count({
      where: { departmentId: req.params.id }
    });
    
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department with ${userCount} users. Please reassign users first.` 
      });
    }
    
    await prisma.department.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Department not found' });
    }
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = { departmentsRouter: router };

