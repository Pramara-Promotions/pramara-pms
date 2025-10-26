// api/routes/notifications.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const notificationService = require('../lib/notificationService');

const router = express.Router();

// Get user's notifications with filtering
router.get('/notifications', authGuard, async (req, res) => {
  try {
    const { unreadOnly, priority, type, limit, offset } = req.query;
    
    const result = await notificationService.getUserNotifications({
      userId: req.auth.user.id,
      unreadOnly: unreadOnly === 'true',
      priority,
      type,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (process.env.NODE_ENV !== 'production') {
      // Be lenient in development to avoid blocking UI
      return res.json({ notifications: [], total: 0, unreadCount: 0, hasMore: false });
    }
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authGuard, async (req, res) => {
  try {
    const updated = await notificationService.markRead(
      req.params.id,
      req.auth.user.id
    );
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark notification as read (POST method for compatibility)
router.post('/notifications/:id/read', authGuard, async (req, res) => {
  try {
    const updated = await notificationService.markRead(
      req.params.id,
      req.auth.user.id
    );
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Dismiss notification
router.patch('/notifications/:id/dismiss', authGuard, async (req, res) => {
  try {
    const updated = await notificationService.dismiss(
      req.params.id,
      req.auth.user.id
    );
    res.json(updated);
  } catch (error) {
    console.error('Error dismissing notification:', error);
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

// Dismiss notification (POST method for compatibility)
router.post('/notifications/:id/dismiss', authGuard, async (req, res) => {
  try {
    const updated = await notificationService.dismiss(
      req.params.id,
      req.auth.user.id
    );
    res.json(updated);
  } catch (error) {
    console.error('Error dismissing notification:', error);
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', authGuard, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.auth.user.id,
        read: false,
        dismissed: false
      },
      data: { 
        read: true,
        readAt: new Date()
      }
    });
    
    res.json({ message: `Marked ${result.count} notifications as read` });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete notification (deprecated - use dismiss instead)
router.delete('/notifications/:id', authGuard, async (req, res) => {
  try {
    const dismissed = await notificationService.dismiss(
      req.params.id,
      req.auth.user.id
    );
    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = { 
  notificationsRouter: router
};
