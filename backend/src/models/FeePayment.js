import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['cash', 'online'], required: true },
  date: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String }
}, { timestamps: true });

export default mongoose.model('FeePayment', feePaymentSchema); 