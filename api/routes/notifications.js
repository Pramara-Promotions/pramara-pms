// api/routes/notifications.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get user's notifications
router.get('/notifications', authGuard, async (req, res) => {
  try {
    const { unreadOnly, limit = 50, offset = 0 } = req.query;
    
    const where = { userId: req.auth.user.id };
    if (unreadOnly === 'true') {
      where.read = false;
    }
    
    const notifications = await prisma.notification.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' }
    });
    
    const unreadCount = await prisma.notification.count({
      where: { userId: req.auth.user.id, read: false }
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authGuard, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== req.auth.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', authGuard, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.auth.user.id,
        read: false
      },
      data: { read: true }
    });
    
    res.json({ message: `Marked ${result.count} notifications as read` });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete notification
router.delete('/notifications/:id', authGuard, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== req.auth.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.notification.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Helper function to create a notification (for internal use)
async function createNotification({ userId, type, title, message, link = null }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, message, link }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Helper function to notify multiple users
async function notifyUsers(userIds, { type, title, message, link = null }) {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      title,
      message,
      link
    }));
    
    return await prisma.notification.createMany({
      data: notifications
    });
  } catch (error) {
    console.error('Error notifying users:', error);
  }
}

module.exports = { 
  notificationsRouter: router,
  createNotification,
  notifyUsers
};

