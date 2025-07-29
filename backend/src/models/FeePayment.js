import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['cash', 'online', 'upi', 'bank_transfer'], required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verified_at: { type: Date },
  note: { type: String },
  payment_source: { type: String, enum: ['manual', 'student_verification', 'link_verification'], default: 'manual' }
}, { timestamps: true });

export default mongoose.model('FeePayment', feePaymentSchema); 