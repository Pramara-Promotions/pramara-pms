const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const authGuard = require('../middleware/authGuard')

/**
 * GET /api/user/preferences
 * Get user preferences including pinned items
 */
router.get('/preferences', authGuard, async (req, res) => {
  try {
    const userId = req.user.id
    
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    })
    
    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          pinnedItems: [],
          theme: 'light'
        }
      })
    }
    
    res.json(preferences)
    
  } catch (error) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

/**
 * PUT /api/user/preferences
 * Update user preferences
 */
router.put('/preferences', authGuard, async (req, res) => {
  try {
    const userId = req.user.id
    const { pinnedItems, homeLayout, theme, notifications } = req.body
    
    const data = {}
    if (pinnedItems !== undefined) data.pinnedItems = pinnedItems
    if (homeLayout !== undefined) data.homeLayout = homeLayout
    if (theme !== undefined) data.theme = theme
    if (notifications !== undefined) data.notifications = notifications
    
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data
      }
    })
    
    res.json(preferences)
    
  } catch (error) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

/**
 * POST /api/user/preferences/pin
 * Add a pinned item
 */
router.post('/preferences/pin', authGuard, async (req, res) => {
  try {
    const userId = req.user.id
    const { type, label, icon, link, query, projectId } = req.body
    
    if (!label || !link) {
      return res.status(400).json({ error: 'Label and link are required' })
    }
    
    // Get existing preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    })
    
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          pinnedItems: []
        }
      })
    }
    
    // Parse existing pinned items
    const pinnedItems = Array.isArray(preferences.pinnedItems) 
      ? preferences.pinnedItems 
      : []
    
    // Check if already pinned
    const exists = pinnedItems.some(item => item.link === link)
    if (exists) {
      return res.status(400).json({ error: 'Item already pinned' })
    }
    
    // Add new pin
    const newPin = {
      id: `pin_${Date.now()}`,
      type: type || 'custom',
      label,
      icon: icon || 'bookmark',
      link,
      query,
      projectId
    }
    
    const updatedPins = [...pinnedItems, newPin]
    
    // Update preferences
    const updated = await prisma.userPreferences.update({
      where: { userId },
      data: {
        pinnedItems: updatedPins
      }
    })
    
    res.json(updated)
    
  } catch (error) {
    console.error('Error adding pin:', error)
    res.status(500).json({ error: 'Failed to add pin' })
  }
})

/**
 * DELETE /api/user/preferences/pin/:pinId
 * Remove a pinned item
 */
router.delete('/preferences/pin/:pinId', authGuard, async (req, res) => {
  try {
    const userId = req.user.id
    const { pinId } = req.params
    
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    })
    
    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' })
    }
    
    const pinnedItems = Array.isArray(preferences.pinnedItems) 
      ? preferences.pinnedItems 
      : []
    
    const updatedPins = pinnedItems.filter(item => item.id !== pinId)
    
    const updated = await prisma.userPreferences.update({
      where: { userId },
      data: {
        pinnedItems: updatedPins
      }
    })
    
    res.json(updated)
    
  } catch (error) {
    console.error('Error removing pin:', error)
    res.status(500).json({ error: 'Failed to remove pin' })
  }
})

/**
 * PUT /api/user/preferences/reorder
 * Reorder pinned items
 */
router.put('/preferences/reorder', authGuard, async (req, res) => {
  try {
    const userId = req.user.id
    const { pinnedItems } = req.body
    
    if (!Array.isArray(pinnedItems)) {
      return res.status(400).json({ error: 'pinnedItems must be an array' })
    }
    
    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        pinnedItems
      },
      create: {
        userId,
        pinnedItems
      }
    })
    
    res.json(updated)
    
  } catch (error) {
    console.error('Error reordering pins:', error)
    res.status(500).json({ error: 'Failed to reorder pins' })
  }
})

module.exports = router
