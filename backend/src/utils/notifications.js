import Notification from '../models/Notification.js';

// Create notification utility
export async function createNotification({
  tuition_id,
  user_id,
  title,
  message,
  type,
  related_id = null,
  related_type = null,
  priority = 'medium',
  action_url = null,
  expires_at = null,
  metadata = {}
}) {
  try {
    const notification = await Notification.create({
      tuition_id,
      user_id,
      title,
      message,
      type,
      related_id,
      related_type,
      priority,
      action_url,
      expires_at,
      metadata
    });
    
    console.log(`Notification created: ${type} for user ${user_id}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get unread notification count
export async function getUnreadCount(user_id, tuition_id = null) {
  try {
    const query = { user_id, is_read: false };
    if (tuition_id) {
      query.tuition_id = tuition_id;
    }
    
    const count = await Notification.countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Mark notification as read
export async function markAsRead(notification_id, user_id) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notification_id, user_id },
      { is_read: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllAsRead(user_id, tuition_id = null) {
  try {
    const query = { user_id, is_read: false };
    if (tuition_id) {
      query.tuition_id = tuition_id;
    }
    
    const result = await Notification.updateMany(query, { is_read: true });
    return result.modifiedCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Get notifications for user
export async function getUserNotifications(user_id, tuition_id = null, limit = 50, skip = 0) {
  try {
    const query = { user_id };
    if (tuition_id) {
      query.tuition_id = tuition_id;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('related_id', 'name custom_id');
      
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

// Delete old notifications (cleanup)
export async function cleanupOldNotifications(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      is_read: true
    });
    
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    throw error;
  }
} 