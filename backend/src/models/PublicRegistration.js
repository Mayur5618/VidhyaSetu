import mongoose from 'mongoose';

const publicRegistrationSchema = new mongoose.Schema({
  // Tuition identification
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  tuition_custom_id: { type: String, required: true }, // For easy identification
  
  // Student personal info
  name: { type: String, required: true },
  photo_url: { type: String },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  
  // Academic info
  standard: { type: String, required: true },
  batch_name: { type: String, required: true },
  
  // Fee information
  total_fee: { type: Number, required: true },
  fees_paid: { type: Number, default: 0 },
  payment_mode: { type: String, enum: ['cash', 'online', 'pending'], default: 'pending' },
  payment_date: { type: Date },
  
  // Registration metadata
  registration_source: { type: String, default: 'public_form' },
  whatsapp_group: { type: String }, // Which WhatsApp group this came from
  submitted_at: { type: Date, default: Date.now },
  
  // Status
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  
  // Notes
  notes: { type: String },
  
  // Contact preferences
  parent_name: { type: String },
  parent_phone: { type: String },
  emergency_contact: { type: String }
}, { timestamps: true });

export default mongoose.model('PublicRegistration', publicRegistrationSchema);











