import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  name: { type: String, required: true },
  standard: { type: String, required: true },
  teacher_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  student_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  schedule: {
    days: [{ type: String }],
    time: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('Batch', batchSchema); 