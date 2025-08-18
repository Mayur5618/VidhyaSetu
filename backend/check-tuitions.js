import mongoose from 'mongoose';
import Tuition from './src/models/Tuition.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/vidhyasetu', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkTuitions() {
  try {
    console.log('🔍 Checking tuition centers in database...');
    
    const tuitions = await Tuition.find({});
    
    if (tuitions.length === 0) {
      console.log('❌ No tuition centers found in database');
      return;
    }
    
    console.log(`📊 Found ${tuitions.length} tuition center(s):`);
    
    tuitions.forEach((tuition, index) => {
      console.log(`\n${index + 1}. Tuition Center:`);
      console.log(`   ID: ${tuition._id}`);
      console.log(`   Custom ID: ${tuition.custom_id}`);
      console.log(`   Name: ${tuition.name}`);
      console.log(`   Standards: ${tuition.standards_offered?.join(', ') || 'None'}`);
      console.log(`   Fees Structure:`, tuition.fees_structure);
    });
    
  } catch (error) {
    console.error('❌ Error checking tuitions:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the check
checkTuitions();

