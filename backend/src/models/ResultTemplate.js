import mongoose from 'mongoose';

const resultTemplateSchema = new mongoose.Schema({
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  name: { type: String, required: true }, // Template name
  standard: { type: String, required: true }, // For which standard
  template_type: { 
    type: String, 
    enum: ['whatsapp', 'poster', 'certificate'], 
    default: 'whatsapp' 
  },
  
  // Template Design Configuration
  design: {
    width: { type: Number, default: 800 }, // Image width in pixels
    height: { type: Number, default: 600 }, // Image height in pixels
    background: {
      type: { type: String, enum: ['color', 'image'], default: 'color' },
      color: { type: String, default: '#ffffff' },
      image_url: { type: String }, // Background image URL
    },
    logo: {
      enabled: { type: Boolean, default: true },
      url: { type: String },
      position: { x: Number, y: Number, width: Number, height: Number }
    },
    title: {
      text: { type: String, default: 'Result Card' },
      font: { type: String, default: 'Arial' },
      size: { type: Number, default: 24 },
      color: { type: String, default: '#000000' },
      position: { x: Number, y: Number }
    },
    student_photo: {
      enabled: { type: Boolean, default: true },
      position: { x: Number, y: Number, width: Number, height: Number },
      border: { type: String, default: '#000000' },
      border_width: { type: Number, default: 2 }
    },
    student_info: {
      name: {
        enabled: { type: Boolean, default: true },
        font: { type: String, default: 'Arial' },
        size: { type: Number, default: 18 },
        color: { type: String, default: '#000000' },
        position: { x: Number, y: Number }
      },
      roll_no: {
        enabled: { type: Boolean, default: true },
        font: { type: String, default: 'Arial' },
        size: { type: Number, default: 16 },
        color: { type: String, default: '#000000' },
        position: { x: Number, y: Number }
      },
      standard: {
        enabled: { type: Boolean, default: true },
        font: { type: String, default: 'Arial' },
        size: { type: Number, default: 16 },
        color: { type: String, default: '#000000' },
        position: { x: Number, y: Number }
      }
    },
    marks_table: {
      enabled: { type: Boolean, default: true },
      position: { x: Number, y: Number, width: Number, height: Number },
      header: {
        font: { type: String, default: 'Arial' },
        size: { type: Number, default: 14 },
        color: { type: String, default: '#000000' },
        background: { type: String, default: '#f0f0f0' }
      },
      data: {
        font: { type: String, default: 'Arial' },
        size: { type: Number, default: 12 },
        color: { type: String, default: '#000000' }
      }
    },
    total_marks: {
      enabled: { type: Boolean, default: true },
      font: { type: String, default: 'Arial' },
      size: { type: Number, default: 16 },
      color: { type: String, default: '#000000' },
      position: { x: Number, y: Number }
    },
    percentage: {
      enabled: { type: Boolean, default: true },
      font: { type: String, default: 'Arial' },
      size: { type: Number, default: 16 },
      color: { type: String, default: '#000000' },
      position: { x: Number, y: Number }
    },
    grade: {
      enabled: { type: Boolean, default: true },
      font: { type: String, default: 'Arial' },
      size: { type: Number, default: 18 },
      color: { type: String, default: '#000000' },
      position: { x: Number, y: Number }
    },
    date: {
      enabled: { type: Boolean, default: true },
      font: { type: String, default: 'Arial' },
      size: { type: Number, default: 12 },
      color: { type: String, default: '#666666' },
      position: { x: Number, y: Number }
    }
  },
  
  // Default subjects for this standard
  subjects: [{
    name: { type: String, required: true },
    max_marks: { type: Number, required: true },
    position: { type: Number } // Order in table
  }],
  
  // Grading system
  grading: {
    A: { min: Number, max: Number, grade: String },
    B: { min: Number, max: Number, grade: String },
    C: { min: Number, max: Number, grade: String },
    D: { min: Number, max: Number, grade: String },
    F: { min: Number, max: Number, grade: String }
  },
  
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  timestamps: true 
});

export default mongoose.model('ResultTemplate', resultTemplateSchema); 