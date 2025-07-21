import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Parser as Json2csvParser } from 'json2csv';
import Student from './models/Student.js';
import Batch from './models/Batch.js';
import FeePayment from './models/FeePayment.js';
import Tuition from './models/Tuition.js';
import Attendance from './models/Attendance.js';
import User from './models/User.js';
import Paper from './models/Paper.js';
import archiver from 'archiver';

import typeDefs from './schemas/index.js';
import resolvers from './resolvers/index.js';
import { getUserFromToken } from './utils/auth.js';
import cloudinary from './utils/cloudinary.js';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/students', async (req, res) => {
  try {
    const { standard, tuition_id } = req.query;
    if (!tuition_id) return res.status(400).json({ error: 'Missing tuition_id parameter' });
    const query = { tuition_id };
    if (standard) query.standard = standard;
    const students = await Student.find(query).lean();
    if (!students.length) return res.status(404).json({ error: 'No students found for this tuition' });

    // Fetch all batches for mapping
    const batchIds = students.map(s => s.batch_id).filter(Boolean);
    const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
    const batchMap = {};
    batches.forEach(b => {
      batchMap[b._id.toString()] = b;
    });

    // Prepare user-friendly data
    const data = students.map((s, i) => {
      const batch = s.batch_id ? batchMap[s.batch_id.toString()] : null;
      return {
        'Roll No': i + 1,
        'Name': s.name,
        'Standard': s.standard,
        'Phone': s.contact_info?.phone || '',
        'Address': s.contact_info?.address || '',
        'Batch Name': batch ? batch.name : '',
        'Batch Time': batch ? batch.schedule?.time : '',
        // System fields at the end
        'student_id': s._id,
        'batch_id': s.batch_id || '',
        'tuition_id': s.tuition_id || ''
      };
    });

    const fields = ['Roll No', 'Name', 'Standard', 'Phone', 'Address', 'Batch Name', 'Batch Time', 'student_id', 'batch_id', 'tuition_id'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`students_report_${tuition_id}${standard ? '_' + standard : ''}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/fees', async (req, res) => {
  try {
    const { standard, tuition_id } = req.query;
    if (!tuition_id) return res.status(400).json({ error: 'Missing tuition_id parameter' });
    const query = { tuition_id };
    if (standard) query.standard = standard;
    const students = await Student.find(query).lean();
    if (!students.length) return res.status(404).json({ error: 'No students found for this tuition' });

    // Fetch batches and tuitions for mapping
    const batchIds = students.map(s => s.batch_id).filter(Boolean);
    const tuitionIds = students.map(s => s.tuition_id).filter(Boolean);
    const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
    const tuitions = await Tuition.find({ _id: { $in: tuitionIds } }).lean();
    const batchMap = {};
    batches.forEach(b => { batchMap[b._id.toString()] = b; });
    const tuitionMap = {};
    tuitions.forEach(t => { tuitionMap[t._id.toString()] = t; });

    // Prepare user-friendly data
    const data = await Promise.all(students.map(async (s, i) => {
      const batch = s.batch_id ? batchMap[s.batch_id.toString()] : null;
      const tuition = s.tuition_id ? tuitionMap[s.tuition_id.toString()] : null;
      // Find total_fee for this student's standard
      let total_fee = '';
      if (tuition && tuition.fees_structure) {
        const stdFee = tuition.fees_structure.find(f => f.standard === s.standard);
        if (stdFee) total_fee = stdFee.total_fee;
      }
      // Find verified payments
      const payments = await FeePayment.find({ student_id: s._id, verified: true }).sort({ date: -1 });
      const paid_fee = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining_fee = total_fee ? (total_fee - paid_fee) : '';
      const last_payment = payments[0];
      return {
        'Roll No': i + 1,
        'Name': s.name,
        'Standard': s.standard,
        'Phone': s.contact_info?.phone || '',
        'Batch Name': batch ? batch.name : '',
        'Total Fee': total_fee,
        'Paid Fee': paid_fee,
        'Remaining Fee': remaining_fee,
        'Last Payment Date': last_payment ? last_payment.date?.toISOString().slice(0, 10) : 'N/A',
        'Last Payment Mode': last_payment ? last_payment.mode : 'N/A',
        // System fields at the end
        'student_id': s._id,
        'batch_id': s.batch_id || '',
        'tuition_id': s.tuition_id || ''
      };
    }));

    const fields = ['Roll No', 'Name', 'Standard', 'Phone', 'Batch Name', 'Total Fee', 'Paid Fee', 'Remaining Fee', 'Last Payment Date', 'Last Payment Mode', 'student_id', 'batch_id', 'tuition_id'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`fees_report_${tuition_id}${standard ? '_' + standard : ''}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/attendance', async (req, res) => {
  try {
    const { batch_id, standard, date, tuition_id } = req.query;
    if (!tuition_id) return res.status(400).json({ error: 'Missing tuition_id parameter' });
    // Find all students for this tuition
    const studentQuery = { tuition_id };
    if (standard) studentQuery.standard = standard;
    const students = await Student.find(studentQuery).lean();
    const studentIds = students.map(s => s._id.toString());
    // Find attendance for these students
    const attQuery = { student_id: { $in: studentIds } };
    if (batch_id) attQuery.batch_id = batch_id;
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      attQuery.date = { $gte: start, $lte: end };
    }
    const attendance = await Attendance.find(attQuery).lean();
    if (!attendance.length) return res.status(404).json({ error: 'No attendance found for this tuition' });
    const batchIds = students.map(s => s.batch_id).filter(Boolean);
    const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
    const userIds = attendance.map(a => a.marked_by).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    // Map for quick lookup
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });
    const batchMap = {};
    batches.forEach(b => { batchMap[b._id.toString()] = b; });
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });
    // Prepare user-friendly data
    const data = attendance.map((a, i) => {
      const s = a.student_id ? studentMap[a.student_id.toString()] : null;
      const batch = s && s.batch_id ? batchMap[s.batch_id.toString()] : null;
      const markedBy = a.marked_by ? userMap[a.marked_by?.toString()] : null;
      return {
        'Roll No': i + 1,
        'Name': s ? s.name : '',
        'Standard': s ? s.standard : '',
        'Phone': s && s.contact_info ? s.contact_info.phone : '',
        'Batch Name': batch ? batch.name : '',
        'Date': a.date ? new Date(a.date).toISOString().slice(0, 10) : '',
        'Status': a.status,
        'Marked By': markedBy ? markedBy.name : 'N/A',
        // System fields at the end
        'student_id': a.student_id || '',
        'batch_id': a.batch_id || '',
        'tuition_id': s ? s.tuition_id : ''
      };
    });
    const fields = ['Roll No', 'Name', 'Standard', 'Phone', 'Batch Name', 'Date', 'Status', 'Marked By', 'student_id', 'batch_id', 'tuition_id'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`attendance_report_${tuition_id}${batch_id ? '_' + batch_id : ''}${date ? '_' + date : ''}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/attendance-summary', async (req, res) => {
  try {
    const { tuition_id, month, batch_id } = req.query;
    if (!tuition_id || !month) return res.status(400).json({ error: 'Missing tuition_id or month parameter' });
    // Parse month (YYYY-MM)
    const [year, mon] = month.split('-');
    if (!year || !mon) return res.status(400).json({ error: 'Invalid month format, use YYYY-MM' });
    const start = new Date(`${year}-${mon}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    // Find students for this tuition (and batch if given)
    const studentQuery = { tuition_id };
    if (batch_id) studentQuery.batch_id = batch_id;
    const students = await Student.find(studentQuery).lean();
    if (!students.length) return res.status(404).json({ error: 'No students found for this tuition/batch' });
    // Find attendance for these students in this month
    const studentIds = students.map(s => s._id.toString());
    const attQuery = {
      student_id: { $in: studentIds },
      date: { $gte: start, $lt: end }
    };
    const attendance = await Attendance.find(attQuery).lean();
    // Map attendance by student
    const attMap = {};
    attendance.forEach(a => {
      const sid = a.student_id.toString();
      if (!attMap[sid]) attMap[sid] = [];
      attMap[sid].push(a);
    });
    // Fetch batches for mapping
    const batchIds = students.map(s => s.batch_id).filter(Boolean);
    const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
    const batchMap = {};
    batches.forEach(b => { batchMap[b._id.toString()] = b; });
    // Prepare summary data
    const data = students.map((s, i) => {
      const batch = s.batch_id ? batchMap[s.batch_id.toString()] : null;
      const attList = attMap[s._id.toString()] || [];
      const totalDays = attList.length;
      const present = attList.filter(a => a.status === 'present').length;
      const absent = attList.filter(a => a.status === 'absent').length;
      const leave = attList.filter(a => a.status === 'leave').length;
      const percent = totalDays > 0 ? ((present / totalDays) * 100).toFixed(2) : '0.00';
      return {
        'Roll No': i + 1,
        'Name': s.name,
        'Standard': s.standard,
        'Phone': s.contact_info?.phone || '',
        'Batch Name': batch ? batch.name : '',
        'Total Days': totalDays,
        'Present': present,
        'Absent': absent,
        'Leave': leave,
        'Attendance %': percent,
        // System fields at the end
        'student_id': s._id,
        'batch_id': s.batch_id || '',
        'tuition_id': s.tuition_id || ''
      };
    });
    const fields = ['Roll No', 'Name', 'Standard', 'Phone', 'Batch Name', 'Total Days', 'Present', 'Absent', 'Leave', 'Attendance %', 'student_id', 'batch_id', 'tuition_id'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`attendance_summary_${tuition_id}_${month}${batch_id ? '_' + batch_id : ''}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/defaulters', async (req, res) => {
  try {
    const { tuition_id, standard, student_id } = req.query;
    if (!tuition_id) return res.status(400).json({ error: 'Missing tuition_id parameter' });
    const query = { tuition_id };
    if (standard) query.standard = standard;
    if (student_id) query._id = student_id;
    const students = await Student.find(query).lean();
    if (!students.length) return res.status(404).json({ error: 'No students found for this tuition' });

    // Fetch batches and tuitions for mapping
    const batchIds = students.map(s => s.batch_id).filter(Boolean);
    const tuitionIds = students.map(s => s.tuition_id).filter(Boolean);
    const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
    const tuitions = await Tuition.find({ _id: { $in: tuitionIds } }).lean();
    const batchMap = {};
    batches.forEach(b => { batchMap[b._id.toString()] = b; });
    const tuitionMap = {};
    tuitions.forEach(t => { tuitionMap[t._id.toString()] = t; });

    // Prepare user-friendly data, only defaulters (remaining_fee > 0)
    const data = await Promise.all(students.map(async (s, i) => {
      const batch = s.batch_id ? batchMap[s.batch_id.toString()] : null;
      const tuition = s.tuition_id ? tuitionMap[s.tuition_id.toString()] : null;
      // Find total_fee for this student's standard
      let total_fee = '';
      if (tuition && tuition.fees_structure) {
        const stdFee = tuition.fees_structure.find(f => f.standard === s.standard);
        if (stdFee) total_fee = stdFee.total_fee;
      }
      // Find verified payments
      const payments = await FeePayment.find({ student_id: s._id, verified: true }).sort({ date: -1 });
      const paid_fee = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining_fee = total_fee ? (total_fee - paid_fee) : '';
      const last_payment = payments[0];
      return {
        'Roll No': i + 1,
        'Name': s.name,
        'Standard': s.standard,
        'Phone': s.contact_info?.phone || '',
        'Batch Name': batch ? batch.name : '',
        'Total Fee': total_fee,
        'Paid Fee': paid_fee,
        'Remaining Fee': remaining_fee,
        'Last Payment Date': last_payment ? last_payment.date?.toISOString().slice(0, 10) : 'N/A',
        'Last Payment Mode': last_payment ? last_payment.mode : 'N/A',
        // System fields at the end
        'student_id': s._id,
        'batch_id': s.batch_id || '',
        'tuition_id': s.tuition_id || ''
      };
    }));

    // Filter only defaulters (remaining_fee > 0)
    const defaulters = data.filter(d => Number(d['Remaining Fee']) > 0);
    if (!defaulters.length) return res.status(404).json({ error: 'No defaulters found for this tuition' });

    const fields = ['Roll No', 'Name', 'Standard', 'Phone', 'Batch Name', 'Total Fee', 'Paid Fee', 'Remaining Fee', 'Last Payment Date', 'Last Payment Mode', 'student_id', 'batch_id', 'tuition_id'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(defaulters);
    res.header('Content-Type', 'text/csv');
    res.attachment(`defaulters_report_${tuition_id}${standard ? '_' + standard : ''}${student_id ? '_' + student_id : ''}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/backup', async (req, res) => {
  try {
    const { tuition_id } = req.query;
    if (!tuition_id) return res.status(400).json({ error: 'Missing tuition_id parameter' });

    // Fetch all data for this tuition
    const tuition = await Tuition.findById(tuition_id).lean();
    if (!tuition) return res.status(404).json({ error: 'Tuition not found' });

    const batches = await Batch.find({ tuition_id }).lean();
    const students = await Student.find({ tuition_id }).lean();
    const studentIds = students.map(s => s._id);
    const batchIds = batches.map(b => b._id);

    const attendance = await Attendance.find({ student_id: { $in: studentIds } }).lean();
    const feepayments = await FeePayment.find({ student_id: { $in: studentIds } }).lean();
    const papers = await Paper.find({ tuition_id }).lean();
    
    // Fetch users for 'marked_by' and 'teacher_ids' names/custom_ids
    const userIdsInAttendance = attendance.map(a => a.marked_by).filter(Boolean);
    const userIdsInBatches = batches.flatMap(b => b.teacher_ids).filter(Boolean);
    const allUserIds = [...new Set([...userIdsInAttendance, ...userIdsInBatches, tuition.owner_id])];
    const users = await User.find({ _id: { $in: allUserIds } }).lean();

    // Create maps for easy lookup
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    
    // ----- CSV Generation -----
    const parser = (fields) => new Json2csvParser({ fields });

    // 1. Tuition CSV
    const tuitionData = [{
      'Tuition ID': tuition.custom_id,
      'Name': tuition.name,
      'Address': tuition.address,
      'Owner': userMap.get(tuition.owner_id.toString())?.name || '',
      'Contact Info': tuition.contact_info,
      'Fees Structure': JSON.stringify(tuition.fees_structure)
    }];
    const tuitionCsv = parser(Object.keys(tuitionData[0])).parse(tuitionData);
    
    // 2. Batches CSV
    const batchesData = batches.map(b => ({
      'Batch ID': b.custom_id,
      'Name': b.name,
      'Standard': b.standard,
      'Teachers': (b.teacher_ids || []).map(tid => userMap.get(tid.toString())?.name || '').join(', '),
      'Schedule': `${(b.schedule?.days || []).join(', ')} at ${b.schedule?.time || ''}`
    }));
    const batchesCsv = batches.length ? parser(Object.keys(batchesData[0])).parse(batchesData) : '';

    // 3. Papers CSV
    const papersData = papers.map(p => ({
        'Title': p.title,
        'Standard': p.standard,
        'File URL': p.file_url,
        'Uploaded By': userMap.get(p.uploaded_by?.toString())?.name || ''
    }));
    const papersCsv = papers.length ? parser(Object.keys(papersData[0])).parse(papersData) : '';

    // Group students, fees, attendance by standard
    const dataByStandard = {};
    students.forEach(s => {
        if (!dataByStandard[s.standard]) {
            dataByStandard[s.standard] = { students: [], fees: [], attendance: [] };
        }
        dataByStandard[s.standard].students.push(s);
    });
    
    feepayments.forEach(f => {
        const student = studentMap.get(f.student_id.toString());
        if (student && dataByStandard[student.standard]) {
            dataByStandard[student.standard].fees.push({ ...f, student });
        }
    });

    attendance.forEach(a => {
        const student = studentMap.get(a.student_id.toString());
        if (student && dataByStandard[student.standard]) {
            dataByStandard[student.standard].attendance.push({ ...a, student });
        }
    });

    // ----- Create ZIP -----
    res.header('Content-Type', 'application/zip');
    res.attachment(`backup_${tuition.custom_id}_${new Date().toISOString().slice(0, 10)}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Add main CSVs
    if (tuitionCsv) archive.append(tuitionCsv, { name: 'tuition.csv' });
    if (batchesCsv) archive.append(batchesCsv, { name: 'batches.csv' });
    if (papersCsv) archive.append(papersCsv, { name: 'papers.csv' });

    // Add standard-wise CSVs
    for (const standard in dataByStandard) {
        // Students CSV for standard
        const stdStudentsData = dataByStandard[standard].students.map((s, i) => ({
            'Roll No': i + 1,
            'Student ID': s.custom_id,
            'Name': s.name,
            'Phone': s.contact_info?.phone || '',
            'Address': s.contact_info?.address || '',
            'Batch ID': batchMap.get(s.batch_id?.toString())?.custom_id || ''
        }));
        if (stdStudentsData.length) {
            const stdStudentsCsv = parser(Object.keys(stdStudentsData[0])).parse(stdStudentsData);
            archive.append(stdStudentsCsv, { name: `students/${standard}.csv` });
        }
        
        // Fees CSV for standard
        const stdFeesData = dataByStandard[standard].fees.map((f, i) => ({
             'Student ID': f.student.custom_id,
             'Name': f.student.name,
             'Amount': f.amount,
             'Mode': f.mode,
             'Date': f.date?.toISOString().slice(0, 10),
             'Verified': f.verified,
             'Note': f.note || ''
        }));
         if (stdFeesData.length) {
            const stdFeesCsv = parser(Object.keys(stdFeesData[0])).parse(stdFeesData);
            archive.append(stdFeesCsv, { name: `fees/${standard}.csv` });
        }

        // Attendance CSV for standard
        const stdAttData = dataByStandard[standard].attendance.map((a, i) => ({
            'Student ID': a.student.custom_id,
            'Name': a.student.name,
            'Batch ID': batchMap.get(a.batch_id?.toString())?.custom_id || '',
            'Date': a.date?.toISOString().slice(0, 10),
            'Status': a.status,
            'Marked By': userMap.get(a.marked_by?.toString())?.name || ''
        }));
        if (stdAttData.length) {
            const stdAttCsv = parser(Object.keys(stdAttData[0])).parse(stdAttData);
            archive.append(stdAttCsv, { name: `attendance/${standard}.csv` });
        }
    }

    archive.finalize();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const startServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization || '';
      const user = getUserFromToken(token);
      return { req, user };
    }
  });
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vidhyasetu';

  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('MongoDB connected');
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
};

startServer();
