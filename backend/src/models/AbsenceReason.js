import mongoose from 'mongoose';

const absenceReasonSchema = new mongoose.Schema({
  student_name: { type: String, required: true },
  roll_number: { type: String, required: true },
  phone_number: { type: String, required: true },
  standard: { type: String, required: true },
  batch_name: { type: String, required: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  submitted_at: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('AbsenceReason', absenceReasonSchema);
