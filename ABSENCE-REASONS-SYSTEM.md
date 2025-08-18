# Absence Reasons System - VidhyaSetu

## Overview
The Absence Reasons System allows teachers to generate WhatsApp links for students to submit absence reasons, and provides a way to track and manage these reasons during attendance marking.

## Features

### 1. Teacher Dashboard Integration
- New "Absence Reasons" section added to the main dashboard
- Orange-colored card with "Manage Absence Reasons" button
- Accessible via `/absence-reasons` route

### 2. Absence Reasons Management Page
- **Batch Selection**: Choose which batch to manage
- **Date Selection**: Pick the date for absence reasons
- **Student List**: View all students in the selected batch
- **Generate WhatsApp Links**: Create personalized WhatsApp messages for each student

### 3. Form Link Generation
- Generates one common form link similar to Public Student Registrations
- Link format: `http://localhost:4000/absence-reason/{tuition_custom_id}`
- Link can be shared in WhatsApp group - any student can use it
- Form includes roll number field for easy student identification

### 4. Public Absence Reason Form
- **Location**: `client/public/absence-reason-form.html`
- **Features**:
  - Student name, roll number, phone number, standard, batch selection
  - Date picker for absence date
  - Reason text area (required)
  - Additional notes (optional)
  - Bilingual labels (English/Hindi)
  - Form validation
  - Success confirmation modal
  - **Roll Number**: Unique identifier for easy student lookup during attendance

### 5. Attendance Integration
- **Exclamation Mark Icon**: Students with submitted absence reasons show an orange exclamation mark (!) instead of the red cancel mark
- **Click to View**: Clicking the exclamation mark shows a modal with:
  - Student name and roll number
  - Phone number, standard, and batch
  - Absence reason
  - Status (pending/approved/rejected)
  - Notes
- **Visual Indicators**:
  - Green checkmark: Present
  - Orange exclamation mark: Absent with reason submitted
  - Red cancel mark: Absent without reason
- **Student Lookup**: Uses roll number for easy identification during attendance marking

## Technical Implementation

### Backend Models
```javascript
// backend/src/models/AbsenceReason.js
const absenceReasonSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  tuition_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submitted_at: { type: Date, default: Date.now },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  notes: { type: String }
}, { timestamps: true });
```

### GraphQL Schema
```graphql
type AbsenceReason {
  id: ID!
  student_id: ID!
  tuition_id: ID!
  batch_id: ID!
  date: String!
  reason: String!
  status: String!
  submitted_at: String!
  approved_by: ID
  approved_at: String
  notes: String
  createdAt: String
  updatedAt: String
}

type Query {
  absenceReasons(tuition_id: ID, batch_id: ID, date: String, status: String): [AbsenceReason]
  absenceReason(id: ID!): AbsenceReason
}

type Mutation {
  submitAbsenceReason(student_id: ID!, tuition_id: ID!, batch_id: ID!, date: String!, reason: String!): AbsenceReason
  approveAbsenceReason(id: ID!, status: String!, notes: String): AbsenceReason
}
```

### API Endpoints
- `POST /submit-absence-reason` - Public endpoint for form submission
- GraphQL mutations for internal management

## Usage Workflow

### For Teachers:
1. **Navigate to Dashboard** → Click "Manage Absence Reasons"
2. **Select Batch & Date** → Choose which batch and date to manage
3. **Generate Common Link** → Click "Generate Common Link for WhatsApp Group"
4. **Share in Group** → Copy the WhatsApp link and share it in the group
5. **Review Submissions** → View submitted reasons and approve/reject them
6. **Mark Attendance** → Use the attendance page to see absence reasons

### For Students:
1. **See Group Message** → Teacher shares the common link in WhatsApp group
2. **Click Form Link** → Open the absence reason form from the message
3. **Fill Form** → Complete the form with their details and reason
4. **Submit** → Form is submitted and teacher is notified
5. **Wait for Approval** → Teacher reviews and approves/rejects the reason

## File Structure
```
├── backend/
│   ├── src/
│   │   ├── models/AbsenceReason.js          # Database model
│   │   ├── schemas/index.js                  # GraphQL schema updates
│   │   └── resolvers/index.js                # GraphQL resolvers
│   └── index.js                              # API endpoint
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx                 # Dashboard with new section
│   │   │   ├── AbsenceReasons.jsx            # Management page
│   │   │   └── Attendance.jsx                # Updated with absence reasons
│   │   └── App.js                            # New route added
│   └── public/
│       └── absence-reason-form.html          # Public form
└── ABSENCE-REASONS-SYSTEM.md                 # This documentation
```

## Configuration

### Environment Variables
No additional environment variables required.

### Dependencies
- All dependencies are already included in the existing project
- Uses existing authentication and authorization systems

## Security Features
- **Authentication Required**: All management functions require valid user authentication
- **Authorization**: Only teachers and tuition owners can approve/reject reasons
- **Input Validation**: Form validation on both frontend and backend
- **Data Sanitization**: Proper handling of user inputs

## Future Enhancements
1. **Email Notifications**: Send email confirmations to students
2. **SMS Integration**: Direct SMS notifications
3. **Bulk Operations**: Approve/reject multiple reasons at once
4. **Reason Templates**: Pre-defined common absence reasons
5. **Analytics**: Track absence patterns and reasons
6. **Mobile App**: Native mobile application for students

## Troubleshooting

### Common Issues:
1. **GraphQL Errors**: Check if the backend is running and accessible
2. **Form Submission Fails**: Verify the backend endpoint is working
3. **Attendance Icons Not Showing**: Ensure absence reasons are properly fetched
4. **WhatsApp Links Not Working**: Check phone number format and WhatsApp availability

### Debug Steps:
1. Check browser console for JavaScript errors
2. Verify backend server is running on port 4000
3. Check GraphQL queries in browser network tab
4. Validate form data before submission

## Support
For technical support or feature requests, please contact the development team or create an issue in the project repository.
