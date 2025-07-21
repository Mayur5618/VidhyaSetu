import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'tuition_owner', 'sub_teacher'], required: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition' }
}, { timestamps: true });

export default mongoose.model('User', userSchema); 