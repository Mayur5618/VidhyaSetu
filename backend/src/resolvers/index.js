import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import FeePayment from '../models/FeePayment.js';
import Paper from '../models/Paper.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

const resolvers = {
  Query: {
    users: async () => await User.find(),
    user: async (_, { id }) => await User.findById(id),
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await User.findById(user.userId);
    },
    tuitions: async () => await Tuition.find(),
    tuition: async (_, { id }) => await Tuition.findById(id),
    batches: async () => await Batch.find(),
    batch: async (_, { id }) => await Batch.findById(id),
    students: async () => await Student.find(),
    student: async (_, { id }) => await Student.findById(id),
    attendance: async (_, { batch_id, date }) => {
      const query = { batch_id };
      if (date) {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);
        query.date = { $gte: start, $lte: end };
      }
      return await Attendance.find(query);
    },
    feePayments: async (_, { student_id, tuition_id }) => {
      const query = {};
      if (student_id) query.student_id = student_id;
      if (tuition_id) query.tuition_id = tuition_id;
      return await FeePayment.find(query);
    },
    papers: async (_, { tuition_id, standard }) => {
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      if (standard) query.standard = standard;
      return await Paper.find(query);
    },
    notifications: async (_, { tuition_id, limit = 50, skip = 0 }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const query = { user_id: user.userId };
      if (tuition_id) query.tuition_id = tuition_id;
      return await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    },
    unreadNotificationCount: async (_, { tuition_id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const query = { user_id: user.userId, is_read: false };
      if (tuition_id) query.tuition_id = tuition_id;
      return await Notification.countDocuments(query);
    },
  },
  Student: {
    paid_fee: async (student) => {
      const payments = await FeePayment.find({ student_id: student.id, verified: true });
      return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    },
    remaining_fee: async (student) => {
      const tuition = await Tuition.findById(student.tuition_id);
      if (!tuition || !tuition.fees_structure) return null;
      const stdFee = tuition.fees_structure.find(f => f.standard === student.standard);
      if (!stdFee) return null;
      const total_fee = stdFee.total_fee;
      const payments = await FeePayment.find({ student_id: student.id, verified: true });
      const paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      return total_fee - paid;
    }
  },
  Mutation: {
    createUser: async (_, args) => {
      const hashedPassword = await bcrypt.hash(args.password, 10);
      const user = new User({ ...args, password: hashedPassword });
      return await user.save();
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user };
    },
    createTuition: async (_, args) => {
      const custom_id = `TUI-${await Counter.getNextSequence('tuition')}`;
      const tuition = new Tuition({ ...args, custom_id });
      return await tuition.save();
    },
    createBatch: async (_, args) => {
      const custom_id = `BATCH-${await Counter.getNextSequence('batch')}`;
      const batch = new Batch({ ...args, custom_id });
      return await batch.save();
    },
    createStudent: async (_, args) => {
      const custom_id = `STU-${await Counter.getNextSequence('student')}`;
      const student = new Student({ ...args, custom_id });
      await student.save();
      
      // Add student to the batch's student_ids array
      if (args.batch_id) {
        await Batch.findByIdAndUpdate(
          args.batch_id,
          { $push: { student_ids: student._id } }
        );
      }

      return student;
    },
    markAttendance: async (_, { date, batch_id, student_id, status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const attendance = new Attendance({
        date: new Date(date),
        batch_id,
        student_id,
        status,
        marked_by: user.userId
      });
      return await attendance.save();
    },
    addFeePayment: async (_, { student_id, tuition_id, amount, mode, date, note }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const payment = new FeePayment({
        student_id,
        tuition_id,
        amount,
        mode,
        date: new Date(date),
        note,
        status: 'verified', // Manual payments are auto-verified
        verified_by: user.userId,
        verified_at: new Date(),
        payment_source: 'manual'
      });
      return await payment.save();
    },
    verifyFeePayment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to verify payments');
      }
      const payment = await FeePayment.findById(id);
      if (!payment) throw new Error('Payment not found');
      payment.status = 'verified';
      payment.verified_by = user.userId;
      payment.verified_at = new Date();
      await payment.save();
      return payment;
    },
    rejectFeePayment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to reject payments');
      }
      const payment = await FeePayment.findById(id);
      if (!payment) throw new Error('Payment not found');
      payment.status = 'rejected';
      payment.verified_by = user.userId;
      payment.verified_at = new Date();
      await payment.save();
      return payment;
    },
    getPendingPayments: async (_, { tuition_id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to view pending payments');
      }
      return await FeePayment.find({ 
        tuition_id, 
        status: 'pending' 
      }).populate('student_id', 'name custom_id');
    },
    uploadPaper: async (_, { tuition_id, standard, title, file_url }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const paper = new Paper({
        tuition_id,
        standard,
        title,
        file_url,
        uploaded_by: user.userId
      });
      return await paper.save();
    },
    updateTuition: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Tuition.findByIdAndUpdate(id, data, { new: true });
    },
    deleteTuition: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Tuition.findByIdAndDelete(id);
    },
    updateBatch: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Batch.findByIdAndUpdate(id, data, { new: true });
    },
    deleteBatch: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Batch.findByIdAndDelete(id);
    },
    updateStudent: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Student.findByIdAndUpdate(id, data, { new: true });
    },
    deleteStudent: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Student.findByIdAndDelete(id);
    },
    updatePaper: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Paper.findByIdAndUpdate(id, data, { new: true });
    },
    deletePaper: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Paper.findByIdAndDelete(id);
    },
    updateFeePayment: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await FeePayment.findByIdAndUpdate(id, data, { new: true });
    },
    deleteFeePayment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await FeePayment.findByIdAndDelete(id);
    },
    updateAttendance: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Attendance.findByIdAndUpdate(id, data, { new: true });
    },
    deleteAttendance: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Attendance.findByIdAndDelete(id);
    },
    markNotificationAsRead: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const notification = await Notification.findOneAndUpdate(
        { _id: id, user_id: user.userId },
        { is_read: true },
        { new: true }
      );
      if (!notification) throw new Error('Notification not found');
      return notification;
    },
    markAllNotificationsAsRead: async (_, { tuition_id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const query = { user_id: user.userId, is_read: false };
      if (tuition_id) query.tuition_id = tuition_id;
      const result = await Notification.updateMany(query, { is_read: true });
      return result.modifiedCount;
    },
    deleteNotification: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const notification = await Notification.findOneAndDelete({ _id: id, user_id: user.userId });
      return !!notification;
    },
  },
};

export default resolvers; 