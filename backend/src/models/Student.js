import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: Number,
  mode: String,
  date: Date,
  verified: Boolean,
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String
}, { _id: false });

const studentSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  name: { type: String, required: true },
  photo_url: { type: String },
  contact_info: {
    phone: { type: String },
    address: { type: String }
  },
  standard: { type: String, required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  fees_paid: [paymentSchema],
  registration_source: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('Student', studentSchema); 