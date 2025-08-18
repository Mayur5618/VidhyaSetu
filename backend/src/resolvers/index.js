import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import AbsenceReason from '../models/AbsenceReason.js';
import FeePayment from '../models/FeePayment.js';
import Paper from '../models/Paper.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import ResultTemplate from '../models/ResultTemplate.js';
import Result from '../models/Result.js';
import PublicRegistration from '../models/PublicRegistration.js';
import { generateResultCard, generatePDFResultCard } from '../utils/resultGenerator.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

const resolvers = {
  Query: {
    users: async () => await User.find(),
    user: async (_, { id }) => await User.findById(id),
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await User.findById(user.userId);
      if (!dbUser) throw new Error('User not found');

      // Attach computed tuition_id like login does
      let tuition_id = null;
      let tuition_custom_id = null;
      if (dbUser.role === 'tuition_owner') {
        const tuition = await Tuition.findOne({ owner_id: dbUser._id });
        if (tuition) {
          tuition_id = tuition._id.toString();
          tuition_custom_id = tuition.custom_id;
        }
      } else if (dbUser.role === 'sub_teacher') {
        tuition_id = dbUser.tuition_id;
        // For sub_teacher, also get tuition custom_id
        if (dbUser.tuition_id) {
          const tuition = await Tuition.findById(dbUser.tuition_id);
          if (tuition) {
            tuition_custom_id = tuition.custom_id;
          }
        }
      }

      return {
        ...dbUser.toObject(),
        tuition_id,
        tuition_custom_id,
      };
    },
    tuitions: async () => await Tuition.find(),
    tuition: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Tuition.findById(id);
    },
    batches: async (_, { tuition_id, standard }) => {
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      if (standard) query.standard = standard;
      return await Batch.find(query).sort({ standard: 1, name: 1 });
    },
    pendingAttendanceBatches: async (_, { tuition_id, date }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0,0,0,0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);

      // Get all batches for the tuition
      const batches = await Batch.find({ tuition_id });
      if (!batches.length) return [];

      // Find attendance entries for these batches on the target date
      const batchIds = batches.map(b => b._id);
      const todays = await Attendance.find({
        batch_id: { $in: batchIds },
        date: { $gte: targetDate, $lt: nextDay }
      }).distinct('batch_id');

      // Return batches where attendance not marked today
      const pending = batches.filter(b => !todays.find(id => id.toString() === b._id.toString()));
      // Sort by standard/name for stable order
      return pending.sort((a, b) => (a.standard || '').localeCompare(b.standard || ''));
    },
    batch: async (_, { id }) => await Batch.findById(id),
    students: async (_, { tuition_id, batch_id }) => {
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      if (batch_id) query.batch_id = batch_id;
      return await Student.find(query);
    },
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
    getAttendanceWithAbsenceReasons: async (_, { batch_id, date }) => {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      
      // Get attendance records for the batch and date
      const attendanceRecords = await Attendance.find({
        batch_id,
        date: { $gte: start, $lte: end }
      });
      
      // Get absence reasons for the same batch and date
      const batch = await Batch.findById(batch_id);
      if (!batch) return [];
      
      const absenceReasons = await AbsenceReason.find({
        batch_name: batch.name,
        date: { $gte: start, $lte: end }
      });
      
      // Create a map of roll_number to absence reason for quick lookup
      const absenceReasonMap = {};
      absenceReasons.forEach(reason => {
        absenceReasonMap[reason.roll_number] = reason;
      });
      
      // Combine attendance with absence reasons and student info
      const result = await Promise.all(attendanceRecords.map(async (attendance) => {
        const student = await Student.findById(attendance.student_id);
        if (!student) return null;
        
        // Find absence reason by matching student's roll number (assuming roll number is index + 1)
        const studentsInBatch = await Student.find({ batch_id });
        const studentIndex = studentsInBatch.findIndex(s => s._id.toString() === student._id.toString());
        const rollNumber = (studentIndex + 1).toString();
        const absenceReason = absenceReasonMap[rollNumber];
        
        return {
          ...attendance.toObject(),
          student,
          absenceReason
        };
      }));
      
      return result.filter(item => item !== null);
    },
            absenceReasons: async (_, { tuition_id, batch_id, date }) => {
          const query = {};
          if (tuition_id) query.tuition_id = tuition_id;
          if (batch_id) {
            // Find batch by ID to get batch name, then query absence reasons by batch_name
            const batch = await Batch.findById(batch_id);
            if (batch) {
              // Use case-insensitive regex to match batch names
              query.batch_name = { $regex: new RegExp(`^${batch.name}$`, 'i') };
            }
          }
          if (date) {
            const start = new Date(date);
            start.setHours(0,0,0,0);
            const end = new Date(date);
            end.setHours(23,59,59,999);
            query.date = { $gte: start, $lte: end };
          }
          
          return await AbsenceReason.find(query);
        },
        absenceReason: async (_, { id }) => await AbsenceReason.findById(id),
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
    resultTemplates: async (_, { tuition_id, standard }) => {
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      if (standard) query.standard = standard;
      return await ResultTemplate.find(query);
    },
    resultTemplate: async (_, { id }) => await ResultTemplate.findById(id),
    results: async (_, { tuition_id, student_id, exam_type }) => {
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      if (student_id) query.student_id = student_id;
      if (exam_type) query.exam_type = exam_type;
      return await Result.find(query);
    },
    result: async (_, { id }) => await Result.findById(id),
    publicRegistrations: async (_, { tuition_id, status }) => {
      // Backward-compat: read from students instead of separate collection
      const query = {};
      if (tuition_id) query.tuition_id = tuition_id;
      const students = await Student.find(query).populate('batch_id').sort({ createdAt: -1 });
      
      // Map to PublicRegistration-like objects with proper data
      const registrations = await Promise.all(students.map(async (s) => {
        // Get batch name
        let batch_name = '';
        if (s.batch_id) {
          batch_name = s.batch_id.name || '';
        }
        
        // Get total fee from tuition
        let total_fee = 0;
        try {
          const tuition = await Tuition.findById(s.tuition_id);
          if (tuition && tuition.fees_structure) {
            const feeStructure = tuition.fees_structure;
            if (Array.isArray(feeStructure)) {
              const stdFee = feeStructure.find(f => f.standard === s.standard);
              if (stdFee) total_fee = stdFee.total_fee;
            } else if (typeof feeStructure === 'object') {
              total_fee = feeStructure[s.standard] || 0;
            }
          }
        } catch (error) {
          console.error('Error getting fee structure:', error);
        }
        
        // Get fees paid from FeePayment collection
        let fees_paid = 0;
        try {
          const payments = await FeePayment.find({ 
            student_id: s._id, 
            status: { $in: ['verified', 'pending'] }
          });
          fees_paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        } catch (error) {
          console.error('Error getting fee payments:', error);
        }
        
        return {
          id: s._id.toString(),
          tuition_id: s.tuition_id?.toString(),
          tuition_custom_id: '',
          name: s.name,
          photo_url: s.photo_url,
          phone: s.contact_info?.phone || '',
          email: '',
          address: s.contact_info?.address || '',
          standard: s.standard,
          batch_name: batch_name,
          total_fee: total_fee,
          fees_paid: fees_paid,
          payment_mode: fees_paid > 0 ? 'cash' : 'pending',
          payment_date: null,
          registration_source: s.registration_source || 'public_form',
          whatsapp_group: '',
          submitted_at: s.createdAt?.toISOString?.() || new Date().toISOString(),
          status: s.status || (s.registration_source === 'public_form' ? 'pending' : 'approved'),
          approved_by: null,
          approved_at: null,
          notes: '',
          parent_name: '',
          parent_phone: '',
          emergency_contact: '',
          createdAt: s.createdAt?.toISOString?.() || new Date().toISOString(),
          updatedAt: s.updatedAt?.toISOString?.() || new Date().toISOString(),
        };
      }));
      
      return registrations;
    },
    publicRegistration: async (_, { id }) => {
      const s = await Student.findById(id).populate('batch_id');
      if (!s) return null;
      
      // Get batch name
      let batch_name = '';
      if (s.batch_id) {
        batch_name = s.batch_id.name || '';
      }
      
      // Get total fee from tuition
      let total_fee = 0;
      try {
        const tuition = await Tuition.findById(s.tuition_id);
        if (tuition && tuition.fees_structure) {
          const feeStructure = tuition.fees_structure;
          if (Array.isArray(feeStructure)) {
            const stdFee = feeStructure.find(f => f.standard === s.standard);
            if (stdFee) total_fee = stdFee.total_fee;
          } else if (typeof feeStructure === 'object') {
            total_fee = feeStructure[s.standard] || 0;
          }
        }
      } catch (error) {
        console.error('Error getting fee structure:', error);
      }
      
      // Get fees paid from FeePayment collection
      let fees_paid = 0;
      try {
        const payments = await FeePayment.find({ 
          student_id: s._id, 
          status: { $in: ['verified', 'pending'] }
        });
        fees_paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      } catch (error) {
        console.error('Error getting fee payments:', error);
        }
      
      return {
        id: s._id.toString(),
        tuition_id: s.tuition_id?.toString(),
        tuition_custom_id: '',
        name: s.name,
        photo_url: s.photo_url,
        phone: s.contact_info?.phone || '',
        email: '',
        address: s.contact_info?.address || '',
        standard: s.standard,
        batch_name: batch_name,
        total_fee: total_fee,
        fees_paid: fees_paid,
        payment_mode: fees_paid > 0 ? 'cash' : 'pending',
        payment_date: null,
        registration_source: s.registration_source || 'public_form',
        whatsapp_group: '',
        submitted_at: s.createdAt?.toISOString?.() || new Date().toISOString(),
        status: s.status || (s.registration_source === 'public_form' ? 'pending' : 'approved'),
        approved_by: null,
        approved_at: null,
        notes: '',
        parent_name: '',
        parent_phone: '',
        emergency_contact: '',
        createdAt: s.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: s.updatedAt?.toISOString?.() || new Date().toISOString(),
      };
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
  User: {
    id: (user) => user._id.toString(),
    hasExistingData: async (user) => {
      // Check if user has any existing data
      const hasTuition = await Tuition.findOne({ owner_id: user._id });
      const hasStudents = await Student.findOne({ tuition_id: user._id });
      const hasBatches = await Batch.findOne({ tuition_id: user._id });
      const hasAttendance = await Attendance.findOne({ 
        $or: [
          { marked_by: user._id },
          { batch_id: { $in: await Batch.find({ tuition_id: user._id }).distinct('_id') } }
        ]
      });
      const hasFeePayments = await FeePayment.findOne({ tuition_id: user._id });
      const hasPapers = await Paper.findOne({ tuition_id: user._id });
      const hasResults = await Result.findOne({ tuition_id: user._id });
      
      return !!(hasTuition || hasStudents || hasBatches || hasAttendance || hasFeePayments || hasPapers || hasResults);
    }
  },
  Mutation: {
    createUser: async (_, args) => {
      const hashedPassword = await bcrypt.hash(args.password, 10);
      const user = new User({ ...args, password: hashedPassword });
      return await user.save();
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({
        $or: [
          { email },
          { phone: email }
        ]
      });
      if (!user) {
        throw new Error('User not found');
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }
      
      // Check if user is connected to any tuition
      let tuition_id = null;
      if (user.role === 'tuition_owner') {
        // Find tuition where this user is the owner
        const tuition = await Tuition.findOne({ owner_id: user._id });
        if (tuition) {
          tuition_id = tuition._id.toString();
        }
      } else if (user.role === 'sub_teacher') {
        // For sub_teacher, check if they have tuition_id field
        tuition_id = user.tuition_id;
      }
      
      // Create user object with tuition_id
      const userWithTuition = {
        ...user.toObject(),
        tuition_id: tuition_id
      };
      
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user: userWithTuition };
    },
    createTuition: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // Reserve a unique sequence for this tuition to avoid duplicate key errors
      const nextSeq = await Counter.getNextSequence('tuition');
      const custom_id = `TUI-${nextSeq}`;
      // Map amount -> total_fee for mongoose
      const fees_structure = input.fees_structure.map(fee => ({
        standard: fee.standard,
        total_fee: fee.amount
      }));
      // Ensure uniqueness by retrying once on duplicate key (edge case if parallel creations occurred)
      let tuition;
      try {
        tuition = new Tuition({
        name: input.name,
        address: input.address,
        contact_info: input.contact_info,
        standards_offered: input.standards, // map to model field
        fees_structure,
        owner_id: user.userId,
        custom_id
        });
        return await tuition.save();
      } catch (err) {
        if (err && err.code === 11000) {
          const retrySeq = await Counter.getNextSequence('tuition');
          tuition.custom_id = `TUI-${retrySeq}`;
          return await tuition.save();
        }
        throw err;
      }
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
      const target = new Date(date);
      // Compute start/end of day to treat one record per day
      const startOfDay = new Date(target);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(target);
      endOfDay.setHours(23, 59, 59, 999);

      // Try to find existing attendance for student in this batch on the given day
      const existing = await Attendance.findOne({
        batch_id,
        student_id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existing) {
        existing.status = status;
        existing.marked_by = user.userId;
        await existing.save();
        return existing;
      }

      const attendance = new Attendance({
        date: target,
        batch_id,
        student_id,
        status,
        marked_by: user.userId,
      });
      return await attendance.save();
    },
    submitAbsenceReason: async (_, { student_name, roll_number, phone_number, standard, batch_name, tuition_id, date, reason }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Validate that the tuition exists
      const tuition = await Tuition.findById(tuition_id);
      if (!tuition) throw new Error('Tuition not found');
      
      // Check if absence reason already submitted for this roll number on this date
      const existing = await AbsenceReason.findOne({
        roll_number,
        tuition_id,
        date: { 
          $gte: new Date(date).setHours(0,0,0,0), 
          $lt: new Date(date).setHours(23,59,59,999) 
        }
      });
      
      if (existing) {
        throw new Error('Absence reason already submitted for this roll number on this date');
      }
      
      const absenceReason = new AbsenceReason({
        student_name,
        roll_number,
        phone_number,
        standard,
        batch_name,
        tuition_id,
        date: new Date(date),
        reason
      });
      
      return await absenceReason.save();
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
    createResultTemplate: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to create result templates');
      }
      const template = new ResultTemplate({
        ...args,
        created_by: user.userId
      });
      return await template.save();
    },
    updateResultTemplate: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to update result templates');
      }
      return await ResultTemplate.findByIdAndUpdate(id, data, { new: true });
    },
    deleteResultTemplate: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to delete result templates');
      }
      return await ResultTemplate.findByIdAndDelete(id);
    },
    createResult: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to create results');
      }
      const result = new Result({
        ...args,
        generated_by: user.userId
      });
      return await result.save();
    },
    updateResult: async (_, { id, data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to update results');
      }
      return await Result.findByIdAndUpdate(id, data, { new: true });
    },
    deleteResult: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to delete results');
      }
      return await Result.findByIdAndDelete(id);
    },
    generateResultCard: async (_, { result_id, format = 'image' }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const result = await Result.findById(result_id).populate('student_id template_id');
      if (!result) throw new Error('Result not found');
      
      try {
        let cardUrl;
        if (format === 'pdf') {
          cardUrl = await generatePDFResultCard(result.template_id, result, result.student_id);
        } else {
          cardUrl = await generateResultCard(result.template_id, result, result.student_id);
        }
        
        // Update result with generated card URL
        result.result_card_url = cardUrl;
        result.result_card_type = format;
        await result.save();
        
        return cardUrl;
      } catch (error) {
        console.error('Error generating result card:', error);
        throw new Error('Failed to generate result card');
      }
    },
    generateBatchResults: async (_, { tuition_id, batch_id, template_id, exam_name, exam_date, exam_type, results_data }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to generate batch results');
      }
      
      const results = [];
      for (const data of results_data) {
        const result = new Result({
          tuition_id,
          student_id: data.student_id,
          template_id,
          exam_name,
          exam_date,
          exam_type,
          subjects: data.subjects,
          student_photo_url: data.student_photo_url,
          remarks: data.remarks,
          generated_by: user.userId
        });
        results.push(await result.save());
      }
      return results;
    },
    submitPublicRegistration: async (_, { input }) => {
      // Public endpoint: directly create a Student entry instead of a separate collection
      const { tuition_id, standard, batch_name, name, phone, email, address, fees_paid, payment_mode, payment_date } = input;

      // Ensure a batch exists for the provided standard + name
      let batch = await Batch.findOne({ tuition_id, standard, name: batch_name });
      if (!batch) {
        const custom_id = `BATCH-${await Counter.getNextSequence('batch')}`;
        batch = await new Batch({ tuition_id, standard, name: batch_name, custom_id }).save();
      }

      // Create student document in students collection
      const custom_id = `STU-${await Counter.getNextSequence('student')}`;
      const student = new Student({
        custom_id,
        name,
        photo_url: input.photo_url,
        contact_info: { phone, address },
        standard,
        batch_id: batch._id,
        tuition_id,
        registration_source: 'public_form',
        status: 'pending'
      });
      const savedStudent = await student.save();

      // If fees were paid, record a payment
      if (fees_paid && fees_paid > 0 && payment_mode && payment_mode !== 'pending') {
        const payment = new FeePayment({
          student_id: savedStudent._id,
          tuition_id,
          amount: fees_paid,
          mode: payment_mode,
          date: payment_date ? new Date(payment_date) : new Date(),
          status: 'pending',
          payment_source: 'student_verification'
        });
        await payment.save();
      }

      // Return a PublicRegistration-shaped object minimally for the mutation response
      return {
        id: savedStudent._id.toString(),
        tuition_id: tuition_id.toString(),
        tuition_custom_id: input.tuition_custom_id,
        name: savedStudent.name,
        photo_url: savedStudent.photo_url,
        phone,
        email,
        address,
        standard,
        batch_name,
        total_fee: input.total_fee || 0,
        fees_paid: fees_paid || 0,
        payment_mode: payment_mode || 'pending',
        payment_date: payment_date || null,
        registration_source: 'public_form',
        whatsapp_group: input.whatsapp_group,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        approved_by: null,
        approved_at: null,
        notes: input.notes,
        parent_name: input.parent_name,
        parent_phone: input.parent_phone,
        emergency_contact: input.emergency_contact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    approvePublicRegistration: async (_, { id, status, notes }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to approve registrations');
      }
      
      // Now working with students collection instead of PublicRegistration
      const student = await Student.findById(id);
      if (!student) throw new Error('Registration not found');
      
      // Update the student's status in the database
      student.status = status;
      student.notes = notes;
      if (status === 'approved') {
        student.approved_by = user.userId;
        student.approved_at = new Date();
      }
      
      await student.save();
      
      // Return the updated student data in PublicRegistration format
      return {
        id: student._id.toString(),
        tuition_id: student.tuition_id?.toString(),
        tuition_custom_id: '',
        name: student.name,
        photo_url: student.photo_url,
        phone: student.contact_info?.phone || '',
        email: '',
        address: student.contact_info?.address || '',
        standard: student.standard,
        batch_name: '',
        total_fee: 0,
        fees_paid: 0,
        payment_mode: 'pending',
        payment_date: null,
        registration_source: student.registration_source || 'public_form',
        whatsapp_group: '',
        submitted_at: student.createdAt?.toISOString?.() || new Date().toISOString(),
        status: student.status,
        approved_by: student.approved_by?.toString(),
        approved_at: student.approved_at?.toISOString(),
        notes: student.notes,
        parent_name: '',
        parent_phone: '',
        emergency_contact: '',
        createdAt: student.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: student.updatedAt?.toISOString(),
      };
    },
    convertRegistrationToStudent: async (_, { registration_id, batch_id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!(user.role === 'tuition_owner' || user.role === 'admin')) {
        throw new Error('Not authorized to convert registrations');
      }
      
      // Since we're already working with students collection, this mutation is now redundant
      // The student already exists, we just need to update their batch_id if needed
      const student = await Student.findById(registration_id);
      if (!student) throw new Error('Student not found');
      
      // Update batch_id if provided
      if (batch_id && student.batch_id?.toString() !== batch_id) {
        student.batch_id = batch_id;
        await student.save();
      }
      
      return student;
    },
  },
};

export default resolvers; 