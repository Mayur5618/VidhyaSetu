import mongoose from 'mongoose';
import Counter from './src/models/Counter.js';
import Student from './src/models/Student.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/vidhyasetu', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixCustomIds() {
  try {
    console.log('🔍 Finding students with null custom_id...');
    
    // Find all students with null or missing custom_id
    const studentsWithNullId = await Student.find({
      $or: [
        { custom_id: null },
        { custom_id: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${studentsWithNullId.length} students with null custom_id`);
    
    if (studentsWithNullId.length === 0) {
      console.log('✅ No students need fixing!');
      return;
    }
    
    // Fix each student
    for (const student of studentsWithNullId) {
      const nextSeq = await Counter.getNextSequence('student');
      const custom_id = `STU-${nextSeq}`;
      
      student.custom_id = custom_id;
      await student.save();
      
      console.log(`✅ Fixed student ${student.name} with custom_id: ${custom_id}`);
    }
    
    console.log('🎉 All students have been fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing custom_ids:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixCustomIds();

