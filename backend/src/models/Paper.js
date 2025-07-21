import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  standard: { type: String, required: true },
  title: { type: String, required: true },
  file_url: { type: String, required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  upload_date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Paper', paperSchema); 