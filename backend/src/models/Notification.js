import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Who should see this notification
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['payment_pending', 'student_registered', 'attendance_reminder', 'fee_due', 'payment_verified', 'general'],
    required: true 
  },
  related_id: { type: mongoose.Schema.Types.ObjectId }, // ID of related entity (student, payment, etc.)
  related_type: { type: String }, // 'student', 'payment', 'attendance', etc.
  is_read: { type: Boolean, default: false },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  action_url: { type: String }, // URL to navigate when clicked
  expires_at: { type: Date }, // Optional expiration
  metadata: { type: mongoose.Schema.Types.Mixed } // Additional data
}, { 
  timestamps: true 
});

// Index for efficient queries
notificationSchema.index({ tuition_id: 1, user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired notifications

export default mongoose.model('Notification', notificationSchema); 