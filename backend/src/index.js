import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Parser as Json2csvParser } from 'json2csv';
import unzipper from 'unzipper';
import { parse as csvParse } from 'csv-parse/sync';
import Student from './models/Student.js';
import Batch from './models/Batch.js';
import FeePayment from './models/FeePayment.js';
import Tuition from './models/Tuition.js';
import Attendance from './models/Attendance.js';
import User from './models/User.js';
import Paper from './models/Paper.js';
import Counter from './models/Counter.js';
import archiver from 'archiver';
import path from 'path';

import typeDefs from './schemas/index.js';
import resolvers from './resolvers/index.js';
import { getUserFromToken } from './utils/auth.js';
import cloudinary from './utils/cloudinary.js';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Test forms page
app.get('/test', (req, res) => {
  res.sendFile('test-forms.html', { root: '.' });
});

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

app.post('/import/backup', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Extract ZIP from buffer
    const zip = await unzipper.Open.buffer(req.file.buffer);
    const results = {};
    for (const entry of zip.files) {
      if (entry.type === 'File' && entry.path.endsWith('.csv')) {
        const content = await entry.buffer();
        const csv = csvParse(content.toString(), { columns: true, skip_empty_lines: true });
        results[entry.path] = csv;
      }
    }
    // --- Restore Logic ---
    // 1. Tuition
    let tuitionId = null;
    let tuitionCustomId = null;
    let ownerUser = null;
    const tuitionRows = results['tuition.csv'] || [];
    if (tuitionRows.length) {
      const t = tuitionRows[0];
      // Extract owner phone from 'Owner' or 'Contact Info'
      let ownerPhone = '';
      if (t['Owner'] && t['Owner'].includes('(')) {
        ownerPhone = t['Owner'].split('(')[1].replace(')', '').trim();
      } else if (t['Contact Info']) {
        ownerPhone = t['Contact Info'].trim();
      }
      if (!ownerPhone) throw new Error('Owner phone not found in tuition.csv');
      ownerUser = await User.findOne({ phone: ownerPhone });
      if (!ownerUser) throw new Error('Owner user not found for phone: ' + ownerPhone);
      // Check if already exists
      let tuitionDoc = await Tuition.findOne({ custom_id: t['Tuition ID'] });
      if (!tuitionDoc) {
        tuitionDoc = await Tuition.create({
          custom_id: t['Tuition ID'],
          name: t['Name'],
          address: t['Address'],
          contact_info: t['Contact Info'],
          fees_structure: JSON.parse(t['Fees Structure']),
          owner_id: ownerUser._id
        });
      }
      tuitionId = tuitionDoc._id;
      tuitionCustomId = tuitionDoc.custom_id;
    }
    // 2. Batches
    const batchIdMap = {}; // custom_id -> _id
    const batchesRows = results['batches.csv'] || [];
    for (const b of batchesRows) {
      let batchDoc = await Batch.findOne({ custom_id: b['Batch ID'] });
      if (!batchDoc) {
        batchDoc = await Batch.create({
          custom_id: b['Batch ID'],
          name: b['Name'],
          standard: b['Standard'],
          tuition_id: tuitionId,
          teacher_ids: [] // Teachers restore can be improved later
        });
      }
      batchIdMap[b['Batch ID']] = batchDoc._id;
    }
    // 3. Students (all students/*/*.csv)
    const studentIdMap = {}; // custom_id -> _id
    for (const file in results) {
      if (file.startsWith('students/') && file.endsWith('.csv')) {
        const rows = results[file];
        for (const s of rows) {
          let studentDoc = await Student.findOne({ custom_id: s['Student ID'] });
          if (!studentDoc) {
            studentDoc = await Student.create({
              custom_id: s['Student ID'],
              name: s['Name'],
              contact_info: { phone: s['Phone'], address: s['Address'] },
              standard: file.split('/')[1],
              batch_id: batchIdMap[s['Batch ID']],
              tuition_id: tuitionId
            });
          }
          studentIdMap[s['Student ID']] = studentDoc._id;
        }
      }
    }
    // 4. FeePayments (fees/{std}/{batch}.csv)
    let feeCount = 0;
    for (const file in results) {
      if (file.startsWith('fees/') && file.endsWith('.csv')) {
        const rows = results[file];
        for (const f of rows) {
          const student_id = studentIdMap[f['Student ID']];
          if (!student_id) continue;
          // Find tuition_id from mapping
          let tuition_id = tuitionId;
          // Parse date
          let date = f['Last Payment Date'] && f['Last Payment Date'] !== 'N/A' ? new Date(f['Last Payment Date']) : new Date();
          // Insert FeePayment
          await FeePayment.create({
            student_id,
            tuition_id,
            amount: Number(f['Paid Fee']) || 0,
            mode: f['Last Payment Mode'] || 'cash',
            date,
            verified: true,
            note: f['Note'] === '' ? null : f['Note']
          });
          feeCount++;
        }
      }
    }
    // 5. Attendance (attendance/{std}/{batch}/{date}.csv)
    let attCount = 0;
    for (const file in results) {
      if (file.startsWith('attendance/') && file.endsWith('.csv')) {
        const rows = results[file];
        for (const a of rows) {
          const student_id = studentIdMap[a['Student ID']];
          const batch_id = batchIdMap[a['Batch ID']];
          if (!student_id || !batch_id) continue;
          // Parse date from file path or row
          let date = a['Date'] ? new Date(a['Date']) : new Date();
          // Find marked_by user (optional)
          let marked_by = null;
          if (a['Marked By'] && a['Marked By'].includes('(')) {
            const phone = a['Marked By'].split('(')[1].replace(')', '').trim();
            const user = await User.findOne({ phone });
            if (user) marked_by = user._id;
          }
          if (!marked_by) marked_by = ownerUser?._id; // Fallback to owner
          if (!marked_by) continue; // Still missing, skip
          await Attendance.create({
            date,
            batch_id,
            student_id,
            status: a['Status'],
            marked_by,
            note: a['Note'] === '' ? null : a['Note']
          });
          attCount++;
        }
      }
    }
    res.json({ message: 'Restore complete!', tuitionId, batchCount: Object.keys(batchIdMap).length, studentCount: Object.keys(studentIdMap).length, feeCount, attCount });
  } catch (err) {
    console.error(err);
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
    const userIdsInAttendance = attendance.map(a => a.marked_by).filter(Boolean);
    const userIdsInBatches = batches.flatMap(b => b.teacher_ids).filter(Boolean);
    const allUserIds = [...new Set([...userIdsInAttendance, ...userIdsInBatches, tuition.owner_id])];
    const users = await User.find({ _id: { $in: allUserIds } }).lean();
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const parser = (fields) => new Json2csvParser({ fields });

    // Tuition CSV (with owner phone and sub-teachers)
    const owner = userMap.get(tuition.owner_id.toString());
    const subTeachers = users.filter(u => u.role === 'sub_teacher');
    const tuitionData = [{
      'Tuition ID': tuition.custom_id,
      'Name': tuition.name,
      'Address': tuition.address,
      'Owner': owner ? `${owner.name} (${owner.phone})` : '',
      'Contact Info': owner ? owner.phone : '',
      'Sub-Teachers': subTeachers.map(t => `${t.name} (${t.phone})`).join('; '),
      'Fees Structure': JSON.stringify(tuition.fees_structure)
    }];
    const tuitionCsv = parser(Object.keys(tuitionData[0])).parse(tuitionData);

    // Batches CSV (user-friendly)
    const batchesData = batches.map(b => ({
      'Batch ID': b.custom_id,
      'Name': b.name,
      'Standard': b.standard,
      'Teachers': (b.teacher_ids || []).map(tid => userMap.get(tid.toString())?.name || '').join(', ')
    }));
    const batchesCsv = batches.length ? parser(Object.keys(batchesData[0])).parse(batchesData) : '';

    // Papers CSV (unchanged)
    const papersData = papers.map(p => ({
      'Title': p.title,
      'Standard': p.standard,
      'File URL': p.file_url,
      'Uploaded By': userMap.get(p.uploaded_by?.toString())?.name || ''
    }));
    const papersCsv = papers.length ? parser(Object.keys(papersData[0])).parse(papersData) : '';

    // Group by std and batch
    const stdBatchMap = {};
    batches.forEach(b => {
      if (!stdBatchMap[b.standard]) stdBatchMap[b.standard] = {};
      stdBatchMap[b.standard][b.custom_id] = b;
    });
    students.forEach(s => {
      const batch = batchMap.get(s.batch_id?.toString());
      if (!batch) return;
      if (!stdBatchMap[batch.standard][batch.custom_id].students) stdBatchMap[batch.standard][batch.custom_id].students = [];
      stdBatchMap[batch.standard][batch.custom_id].students.push(s);
    });
    // Attendance: std > batch > date
    attendance.forEach(a => {
      const student = studentMap.get(a.student_id.toString());
      const batch = batchMap.get(a.batch_id?.toString());
      if (!student || !batch) return;
      if (!stdBatchMap[batch.standard][batch.custom_id].attendance) stdBatchMap[batch.standard][batch.custom_id].attendance = {};
      const dateStr = a.date ? a.date.toISOString().slice(0, 10) : 'unknown';
      if (!stdBatchMap[batch.standard][batch.custom_id].attendance[dateStr]) stdBatchMap[batch.standard][batch.custom_id].attendance[dateStr] = [];
      stdBatchMap[batch.standard][batch.custom_id].attendance[dateStr].push({ ...a, student });
    });
    // Fees: std > batch
    feepayments.forEach(f => {
      const student = studentMap.get(f.student_id.toString());
      const batch = batchMap.get(student?.batch_id?.toString());
      if (!student || !batch) return;
      if (!stdBatchMap[batch.standard][batch.custom_id].fees) stdBatchMap[batch.standard][batch.custom_id].fees = [];
      stdBatchMap[batch.standard][batch.custom_id].fees.push({ ...f, student });
    });

    // Create ZIP
    res.header('Content-Type', 'application/zip');
    res.attachment(`backup_${tuition.custom_id}_${new Date().toISOString().slice(0, 10)}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    if (tuitionCsv) archive.append(tuitionCsv, { name: 'tuition.csv' });
    if (batchesCsv) archive.append(batchesCsv, { name: 'batches.csv' });
    if (papersCsv) archive.append(papersCsv, { name: 'papers.csv' });

    // Students, Fees, Attendance: std-wise > batch-wise > (date-wise for attendance)
    for (const std in stdBatchMap) {
      for (const batchId in stdBatchMap[std]) {
        const batch = stdBatchMap[std][batchId];
        // Students CSV
        if (batch.students && batch.students.length) {
          const studentsData = batch.students.map((s, i) => ({
            'Roll No': i + 1,
            'Student ID': s.custom_id,
            'Name': s.name,
            'Phone': s.contact_info?.phone || '',
            'Address': s.contact_info?.address || '',
            'Batch ID': batch.custom_id
          }));
          const studentsCsv = parser(Object.keys(studentsData[0])).parse(studentsData);
          archive.append(studentsCsv, { name: path.join('students', std, `${batch.name}.csv`) });
        }
        // Fees CSV
        if (batch.fees && batch.fees.length) {
          // For each student in this batch, calculate total, paid, remaining, last payment
          const studentFeeMap = {};
          batch.fees.forEach(f => {
            const sid = f.student.custom_id;
            if (!studentFeeMap[sid]) studentFeeMap[sid] = [];
            studentFeeMap[sid].push(f);
          });
          const feesData = Object.entries(studentFeeMap).map(([sid, payments], i) => {
            const s = payments[0].student;
            const totalFee = tuition.fees_structure.find(fee => fee.standard === std)?.total_fee || 0;
            const paidFee = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const remainingFee = totalFee - paidFee;
            const lastPayment = payments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            return {
              'Roll No': i + 1,
              'Student ID': s.custom_id,
              'Name': s.name,
              'Total Fee': totalFee,
              'Paid Fee': paidFee,
              'Remaining Fee': remainingFee,
              'Last Payment Date': lastPayment ? lastPayment.date?.toISOString().slice(0, 10) : 'N/A',
              'Last Payment Mode': lastPayment ? lastPayment.mode : 'N/A',
              'Note': lastPayment && lastPayment.note ? lastPayment.note : null
            };
          });
          const feesCsv = parser(Object.keys(feesData[0])).parse(feesData);
          archive.append(feesCsv, { name: path.join('fees', std, `${batch.name}.csv`) });
        }
        // Attendance CSVs (date-wise)
        if (batch.attendance) {
          for (const dateStr in batch.attendance) {
            const attData = batch.attendance[dateStr].map((a, i) => ({
              'Roll No': i + 1,
              'Student ID': a.student.custom_id,
              'Name': a.student.name,
              'Batch ID': batch.custom_id,
              'Date': dateStr,
              'Status': a.status,
              'Marked By': userMap.get(a.marked_by?.toString())?.name || '',
              'Note': a.note ? a.note : null
            }));
            const attCsv = parser(Object.keys(attData[0])).parse(attData);
            archive.append(attCsv, { name: path.join('attendance', std, batch.name, `${dateStr}.csv`) });
          }
        }
      }
    }
    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== STUDENT SELF-REGISTRATION SYSTEM =====
app.post('/register/student', async (req, res) => {
  try {
    const { 
      tuition_id, 
      name, 
      phone, 
      address, 
      standard, 
      batch_name,
      parent_name,
      parent_phone,
      registration_source = 'self_registration'
    } = req.body;

    if (!tuition_id || !name || !phone || !standard) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify tuition exists
    const tuition = await Tuition.findById(tuition_id);
    if (!tuition) {
      return res.status(404).json({ error: 'Tuition not found' });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ 
      tuition_id, 
      'contact_info.phone': phone 
    });
    if (existingStudent) {
      return res.status(400).json({ error: 'Student with this phone already exists' });
    }

    // Find or create batch
    let batch = null;
    if (batch_name) {
      batch = await Batch.findOne({ 
        tuition_id, 
        name: batch_name,
        standard 
      });
      if (!batch) {
        // Create new batch if doesn't exist
        const batchNumber = await Counter.getNextSequence('batch');
        batch = await Batch.create({
          custom_id: `BATCH-${batchNumber}`,
          name: batch_name,
          standard,
          tuition_id,
          schedule: [],
          teacher_ids: [tuition.owner_id],
          student_ids: []
        });
      }
    }

    // Create student
    const studentNumber = await Counter.getNextSequence('student');
    const student = await Student.create({
      custom_id: `STU-${studentNumber}`,
      name,
      contact_info: {
        phone,
        address: address || '',
        parent_name: parent_name || '',
        parent_phone: parent_phone || ''
      },
      standard,
      tuition_id,
      batch_id: batch?._id,
      registration_source,
      photo_url: null
    });

    // Add student to batch if batch exists
    if (batch) {
      batch.student_ids.push(student._id);
      await batch.save();
    }

    res.json({ 
      success: true, 
      message: 'Student registered successfully!',
      student: {
        id: student._id,
        custom_id: student.custom_id,
        name: student.name,
        batch: batch?.name || 'Not assigned'
      }
    });

  } catch (err) {
    console.error('Student registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== PAYMENT VERIFICATION SYSTEM =====
app.post('/payment/verify', async (req, res) => {
  try {
    const { 
      tuition_id, 
      student_id, 
      amount, 
      mode, 
      date, 
      note,
      payment_source = 'student_verification'
    } = req.body;

    if (!tuition_id || !student_id || !amount || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify tuition and student exist
    const tuition = await Tuition.findById(tuition_id);
    if (!tuition) {
      return res.status(404).json({ error: 'Tuition not found' });
    }

    const student = await Student.findById(student_id);
    if (!student || student.tuition_id.toString() !== tuition_id) {
      return res.status(404).json({ error: 'Student not found in this tuition' });
    }

    // Check if payment already exists for this date and amount
    const existingPayment = await FeePayment.findOne({
      student_id,
      amount: parseFloat(amount),
      date: new Date(date || new Date()),
      mode
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'Similar payment already exists' });
    }

    // Create pending payment (needs verification)
    const payment = await FeePayment.create({
      student_id,
      tuition_id,
      amount: parseFloat(amount),
      mode,
      date: new Date(date || new Date()),
      note: note || '',
      status: 'pending', // Will be verified by owner
      payment_source,
      verified_by: null,
      verified_at: null
    });

    res.json({ 
      success: true, 
      message: 'Payment submitted for verification!',
      payment: {
        id: payment._id,
        amount: payment.amount,
        mode: payment.mode,
        date: payment.date,
        status: payment.status
      }
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== GENERATE REGISTRATION LINK =====
app.post('/generate/registration-link', async (req, res) => {
  try {
    const { tuition_id, standard, batch_name, expires_in = 7 } = req.body; // expires_in days

    if (!tuition_id) {
      return res.status(400).json({ error: 'Tuition ID required' });
    }

    // Verify tuition exists
    const tuition = await Tuition.findById(tuition_id);
    if (!tuition) {
      return res.status(404).json({ error: 'Tuition not found' });
    }

    // Generate unique token
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in);

    // Store in database (we'll create a simple model for this)
    const registrationLink = {
      token,
      tuition_id,
      standard,
      batch_name,
      expires_at,
      created_at: new Date(),
      used_count: 0
    };

    // For now, store in memory (in production, use Redis or database)
    global.registrationLinks = global.registrationLinks || {};
    global.registrationLinks[token] = registrationLink;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const registrationUrl = `${baseUrl}/register?token=${token}`;

    res.json({
      success: true,
      registration_url: registrationUrl,
      expires_at: expires_at.toISOString(),
      instructions: `Share this link with ${standard || 'all'} students for registration`
    });

  } catch (err) {
    console.error('Link generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== GENERATE PAYMENT LINK =====
app.post('/generate/payment-link', async (req, res) => {
  try {
    const { tuition_id, student_id, amount, mode, expires_in = 1 } = req.body; // expires_in days

    if (!tuition_id || !student_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify tuition and student exist
    const tuition = await Tuition.findById(tuition_id);
    if (!tuition) {
      return res.status(404).json({ error: 'Tuition not found' });
    }

    const student = await Student.findById(student_id);
    if (!student || student.tuition_id.toString() !== tuition_id) {
      return res.status(404).json({ error: 'Student not found in this tuition' });
    }

    // Generate unique token
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in);

    // Store payment link data
    const paymentLink = {
      token,
      tuition_id,
      student_id,
      amount: parseFloat(amount),
      mode,
      expires_at,
      created_at: new Date(),
      used: false
    };

    // Store in memory (in production, use Redis or database)
    global.paymentLinks = global.paymentLinks || {};
    global.paymentLinks[token] = paymentLink;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment?token=${token}`;

    res.json({
      success: true,
      payment_url: paymentUrl,
      student_name: student.name,
      amount: amount,
      expires_at: expires_at.toISOString(),
      instructions: `Share this link with ${student.name} to verify payment`
    });

  } catch (err) {
    console.error('Payment link generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== VERIFY REGISTRATION TOKEN =====
app.get('/verify/registration-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const link = global.registrationLinks?.[token];
    if (!link) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    if (new Date() > link.expires_at) {
      return res.status(400).json({ error: 'Link has expired' });
    }

    // Get tuition details
    const tuition = await Tuition.findById(link.tuition_id);
    if (!tuition) {
      return res.status(404).json({ error: 'Tuition not found' });
    }

    res.json({
      valid: true,
      tuition: {
        name: tuition.name,
        address: tuition.address
      },
      standard: link.standard,
      batch_name: link.batch_name,
      expires_at: link.expires_at
    });

  } catch (err) {
    console.error('Token verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== VERIFY PAYMENT TOKEN =====
app.get('/verify/payment-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const link = global.paymentLinks?.[token];
    if (!link) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    if (new Date() > link.expires_at) {
      return res.status(400).json({ error: 'Link has expired' });
    }

    if (link.used) {
      return res.status(400).json({ error: 'Payment link already used' });
    }

    // Get student details
    const student = await Student.findById(link.student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      valid: true,
      student: {
        name: student.name,
        standard: student.standard
      },
      amount: link.amount,
      mode: link.mode,
      expires_at: link.expires_at
    });

  } catch (err) {
    console.error('Payment token verification error:', err);
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
