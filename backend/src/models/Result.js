import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ResultTemplate', required: true },
  
  // Exam details
  exam_name: { type: String, required: true }, // e.g., "Mid Term", "Final Exam"
  exam_date: { type: Date, required: true },
  exam_type: { type: String, enum: ['unit_test', 'mid_term', 'final_exam', 'mock_test'], default: 'final_exam' },
  
  // Student marks
  subjects: [{
    name: { type: String, required: true },
    max_marks: { type: Number, required: true },
    obtained_marks: { type: Number, required: true },
    percentage: { type: Number }, // Auto-calculated
    grade: { type: String } // Auto-calculated
  }],
  
  // Calculated totals
  total_max_marks: { type: Number, required: true },
  total_obtained_marks: { type: Number, required: true },
  total_percentage: { type: Number, required: true },
  overall_grade: { type: String, required: true },
  
  // Student photo for result card
  student_photo_url: { type: String },
  
  // Generated result card
  result_card_url: { type: String }, // Generated image/PDF URL
  result_card_type: { type: String, enum: ['image', 'pdf'], default: 'image' },
  
  // Additional info
  remarks: { type: String }, // Teacher remarks
  position_in_class: { type: Number }, // Class rank
  total_students: { type: Number }, // Total students in class
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  
  // Metadata
  generated_at: { type: Date, default: Date.now },
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // For batch processing
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  standard: { type: String, required: true }
}, { 
  timestamps: true 
});

// Pre-save middleware to calculate totals and grades
resultSchema.pre('save', function(next) {
  // Calculate subject percentages and grades
  this.subjects.forEach(subject => {
    subject.percentage = Math.round((subject.obtained_marks / subject.max_marks) * 100);
    
    // Simple grading logic (can be customized)
    if (subject.percentage >= 90) subject.grade = 'A+';
    else if (subject.percentage >= 80) subject.grade = 'A';
    else if (subject.percentage >= 70) subject.grade = 'B+';
    else if (subject.percentage >= 60) subject.grade = 'B';
    else if (subject.percentage >= 50) subject.grade = 'C';
    else if (subject.percentage >= 40) subject.grade = 'D';
    else subject.grade = 'F';
  });
  
  // Calculate totals
  this.total_max_marks = this.subjects.reduce((sum, subject) => sum + subject.max_marks, 0);
  this.total_obtained_marks = this.subjects.reduce((sum, subject) => sum + subject.obtained_marks, 0);
  this.total_percentage = Math.round((this.total_obtained_marks / this.total_max_marks) * 100);
  
  // Calculate overall grade
  if (this.total_percentage >= 90) this.overall_grade = 'A+';
  else if (this.total_percentage >= 80) this.overall_grade = 'A';
  else if (this.total_percentage >= 70) this.overall_grade = 'B+';
  else if (this.total_percentage >= 60) this.overall_grade = 'B';
  else if (this.total_percentage >= 50) this.overall_grade = 'C';
  else if (this.total_percentage >= 40) this.overall_grade = 'D';
  else this.overall_grade = 'F';
  
  next();
});

export default mongoose.model('Result', resultSchema); 