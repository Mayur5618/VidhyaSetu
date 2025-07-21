import mongoose from 'mongoose';

const feesStructureSchema = new mongoose.Schema({
  standard: { type: String, required: true },
  total_fee: { type: Number, required: true }
}, { _id: false });

const tuitionSchema = new mongoose.Schema({
  custom_id: { type: String, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contact_info: { type: String },
  standards_offered: [{ type: String }],
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  fees_structure: [feesStructureSchema]
}, { timestamps: true });

export default mongoose.model('Tuition', tuitionSchema); 