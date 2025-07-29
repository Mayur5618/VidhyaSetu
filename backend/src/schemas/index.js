import { gql } from 'apollo-server-express';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: String!
    tuition_id: ID
    createdAt: String
    updatedAt: String
  }

  type Tuition {
    id: ID!
    name: String!
    address: String!
    owner_id: ID!
    contact_info: String
    standards_offered: [String]
    batches: [ID]
    fees_structure: [FeesStructure]
    createdAt: String
    updatedAt: String
  }

  type Batch {
    id: ID!
    tuition_id: ID!
    name: String!
    standard: String!
    teacher_ids: [ID]
    student_ids: [ID]
    schedule: Schedule
    createdAt: String
    updatedAt: String
  }

  type Schedule {
    days: [String]
    time: String
  }

  type Payment {
    amount: Float
    mode: String
    date: String
    verified: Boolean
    verified_by: ID
    note: String
  }

  type ContactInfo {
    phone: String
    address: String
  }

  type Student {
    id: ID!
    name: String!
    photo_url: String
    contact_info: ContactInfo
    standard: String!
    batch_id: ID
    tuition_id: ID!
    fees_paid: [Payment]
    registration_source: String
    paid_fee: Float
    remaining_fee: Float
    createdAt: String
    updatedAt: String
  }

  type Attendance {
    id: ID!
    date: String!
    batch_id: ID!
    student_id: ID!
    status: String!
    marked_by: ID!
    createdAt: String
    updatedAt: String
  }

  type LoginResponse {
    token: String
    user: User
  }

  type FeePayment {
    id: ID!
    student_id: ID!
    tuition_id: ID!
    amount: Float!
    mode: String!
    date: String!
    verified: Boolean!
    verified_by: ID
    note: String
    createdAt: String
    updatedAt: String
  }

  type FeesStructure {
    standard: String!
    total_fee: Float!
  }

  type Paper {
    id: ID!
    tuition_id: ID!
    standard: String!
    title: String!
    file_url: String!
    uploaded_by: ID!
    upload_date: String
    createdAt: String
    updatedAt: String
  }

  type Query {
    users: [User]
    user(id: ID!): User
    me: User
    tuitions: [Tuition]
    tuition(id: ID!): Tuition
    batches: [Batch]
    batch(id: ID!): Batch
    students: [Student]
    student(id: ID!): Student
    attendance(batch_id: ID!, date: String): [Attendance]
    feePayments(student_id: ID, tuition_id: ID): [FeePayment]
    papers(tuition_id: ID, standard: String): [Paper]
  }

  type Mutation {
    createUser(name: String!, email: String!, phone: String!, password: String!, role: String!, tuition_id: ID): User
    login(email: String!, password: String!): LoginResponse
    createTuition(name: String!, address: String!, owner_id: ID!, contact_info: String, standards_offered: [String], fees_structure: [FeesStructureInput]): Tuition
    createBatch(tuition_id: ID!, name: String!, standard: String!, teacher_ids: [ID], student_ids: [ID], schedule: ScheduleInput): Batch
    createStudent(name: String!, photo_url: String, contact_info: ContactInfoInput, standard: String!, batch_id: ID, tuition_id: ID!, fees_paid: [PaymentInput], registration_source: String): Student
    markAttendance(date: String!, batch_id: ID!, student_id: ID!, status: String!): Attendance
    addFeePayment(student_id: ID!, tuition_id: ID!, amount: Float!, mode: String!, date: String!, note: String): FeePayment
    verifyFeePayment(id: ID!): FeePayment
    rejectFeePayment(id: ID!): FeePayment
    getPendingPayments(tuition_id: ID!): [FeePayment]
    uploadPaper(tuition_id: ID!, standard: String!, title: String!, file_url: String!): Paper
    updateTuition(id: ID!, data: TuitionUpdateInput!): Tuition
    deleteTuition(id: ID!): Tuition
    updateBatch(id: ID!, data: BatchUpdateInput!): Batch
    deleteBatch(id: ID!): Batch
    updateStudent(id: ID!, data: StudentUpdateInput!): Student
    deleteStudent(id: ID!): Student
    updatePaper(id: ID!, data: PaperUpdateInput!): Paper
    deletePaper(id: ID!): Paper
    updateFeePayment(id: ID!, data: FeePaymentUpdateInput!): FeePayment
    deleteFeePayment(id: ID!): FeePayment
    updateAttendance(id: ID!, data: AttendanceUpdateInput!): Attendance
    deleteAttendance(id: ID!): Attendance
  }

  input ScheduleInput {
    days: [String]
    time: String
  }

  input PaymentInput {
    amount: Float
    mode: String
    date: String
    verified: Boolean
    verified_by: ID
    note: String
  }

  input ContactInfoInput {
    phone: String
    address: String
  }

  input FeesStructureInput {
    standard: String!
    total_fee: Float!
  }

  input TuitionUpdateInput {
    name: String
    address: String
    contact_info: String
    standards_offered: [String]
    fees_structure: [FeesStructureInput]
  }
  input BatchUpdateInput {
    name: String
    standard: String
    teacher_ids: [ID]
    student_ids: [ID]
    schedule: ScheduleInput
  }
  input StudentUpdateInput {
    name: String
    photo_url: String
    contact_info: ContactInfoInput
    standard: String
    batch_id: ID
    tuition_id: ID
    registration_source: String
  }
  input PaperUpdateInput {
    standard: String
    title: String
    file_url: String
  }
  input FeePaymentUpdateInput {
    amount: Float
    mode: String
    date: String
    note: String
  }
  input AttendanceUpdateInput {
    date: String
    batch_id: ID
    student_id: ID
    status: String
  }
`;

export default typeDefs; 