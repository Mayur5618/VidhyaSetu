import { gql } from 'apollo-server-express';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: String!
    tuition_id: ID
    tuition_custom_id: String
    hasExistingData: Boolean
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
    status: String
    approved_by: ID
    approved_at: String
    notes: String
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

  type AttendanceWithAbsenceReason {
    id: ID!
    date: String!
    batch_id: ID!
    student_id: ID!
    status: String!
    marked_by: ID!
    student: Student
    absenceReason: AbsenceReason
    createdAt: String
    updatedAt: String
  }

  type AbsenceReason {
  id: ID!
  student_name: String!
  roll_number: String!
  phone_number: String!
  standard: String!
  batch_name: String!
  tuition_id: ID!
  date: String!
  reason: String!
  submitted_at: String!
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

  type Notification {
    id: ID!
    tuition_id: ID!
    user_id: ID!
    title: String!
    message: String!
    type: String!
    related_id: ID
    related_type: String
    is_read: Boolean!
    priority: String!
    action_url: String
    expires_at: String
    metadata: String
    created_at: String!
    updated_at: String!
  }

  type ResultTemplate {
    id: ID!
    tuition_id: ID!
    name: String!
    standard: String!
    template_type: String!
    design: TemplateDesign!
    subjects: [Subject]!
    grading: GradingSystem!
    is_active: Boolean!
    created_by: ID!
    createdAt: String
    updatedAt: String
  }

  type TemplateDesign {
    width: Int!
    height: Int!
    background: BackgroundConfig!
    logo: LogoConfig!
    title: TextConfig!
    student_photo: PhotoConfig!
    student_info: StudentInfoConfig!
    marks_table: TableConfig!
    total_marks: TextConfig!
    percentage: TextConfig!
    grade: TextConfig!
    date: TextConfig!
  }

  type BackgroundConfig {
    type: String!
    color: String
    image_url: String
  }

  type LogoConfig {
    enabled: Boolean!
    url: String
    position: Position
  }

  type TextConfig {
    text: String
    font: String!
    size: Int!
    color: String!
    position: Position
    enabled: Boolean
  }

  type PhotoConfig {
    enabled: Boolean!
    position: Position!
    border: String!
    border_width: Int!
  }

  type StudentInfoConfig {
    name: TextConfig!
    roll_no: TextConfig!
    standard: TextConfig!
  }

  type TableConfig {
    enabled: Boolean!
    position: Position!
    header: TableStyle!
    data: TableStyle!
  }

  type TableStyle {
    font: String!
    size: Int!
    color: String!
    background: String
  }

  type Position {
    x: Int!
    y: Int!
    width: Int
    height: Int
  }

  type Subject {
    name: String!
    max_marks: Int!
    position: Int
  }

  type GradingSystem {
    A: GradeRange
    B: GradeRange
    C: GradeRange
    D: GradeRange
    F: GradeRange
  }

  type GradeRange {
    min: Int!
    max: Int!
    grade: String!
  }

  type Result {
    id: ID!
    tuition_id: ID!
    student_id: ID!
    template_id: ID!
    exam_name: String!
    exam_date: String!
    exam_type: String!
    subjects: [ResultSubject]!
    total_max_marks: Int!
    total_obtained_marks: Int!
    total_percentage: Int!
    overall_grade: String!
    student_photo_url: String
    result_card_url: String
    result_card_type: String!
    remarks: String
    position_in_class: Int
    total_students: Int
    status: String!
    generated_at: String!
    generated_by: ID!
    batch_id: ID
    standard: String!
    createdAt: String
    updatedAt: String
  }

  type PublicRegistration {
    id: ID!
    tuition_id: ID!
    tuition_custom_id: String!
    name: String!
    photo_url: String
    phone: String!
    email: String
    address: String!
    standard: String!
    batch_name: String!
    total_fee: Float!
    fees_paid: Float!
    payment_mode: String!
    payment_date: String
    registration_source: String!
    whatsapp_group: String
    submitted_at: String!
    status: String!
    approved_by: ID
    approved_at: String
    notes: String
    parent_name: String
    parent_phone: String
    emergency_contact: String
    createdAt: String
    updatedAt: String
  }

  type ResultSubject {
    name: String!
    max_marks: Int!
    obtained_marks: Int!
    percentage: Int!
    grade: String!
  }

  type Query {
    users: [User]
    user(id: ID!): User
    me: User
    tuitions: [Tuition]
    tuition(id: ID!): Tuition
    batches(tuition_id: ID, standard: String): [Batch]
    pendingAttendanceBatches(tuition_id: ID!, date: String): [Batch]
    batch(id: ID!): Batch
    students(tuition_id: ID, batch_id: ID): [Student]
    student(id: ID!): Student
    attendance(batch_id: ID!, date: String): [Attendance]
    getAttendanceWithAbsenceReasons(batch_id: ID!, date: String!): [AttendanceWithAbsenceReason]
    absenceReasons(tuition_id: ID, batch_id: ID, date: String): [AbsenceReason]
    absenceReason(id: ID!): AbsenceReason
    feePayments(student_id: ID, tuition_id: ID): [FeePayment]
    papers(tuition_id: ID, standard: String): [Paper]
    notifications(tuition_id: ID, limit: Int, skip: Int): [Notification]
    unreadNotificationCount(tuition_id: ID): Int
    resultTemplates(tuition_id: ID, standard: String): [ResultTemplate]
    resultTemplate(id: ID!): ResultTemplate
    results(tuition_id: ID, student_id: ID, exam_type: String): [Result]
    result(id: ID!): Result
    publicRegistrations(tuition_id: ID, status: String): [PublicRegistration]
    publicRegistration(id: ID!): PublicRegistration
  }

  type Mutation {
    createUser(name: String!, email: String!, phone: String!, password: String!, role: String!, tuition_id: ID): User
    login(email: String!, password: String!): LoginResponse
    createTuition(input: TuitionInput!): Tuition
    createBatch(tuition_id: ID!, name: String!, standard: String!, teacher_ids: [ID], student_ids: [ID], schedule: ScheduleInput): Batch
    createStudent(name: String!, photo_url: String, contact_info: ContactInfoInput, standard: String!, batch_id: ID, tuition_id: ID!, fees_paid: [PaymentInput], registration_source: String): Student
    markAttendance(date: String!, batch_id: ID!, student_id: ID!, status: String!): Attendance
    submitAbsenceReason(student_name: String!, roll_number: String!, phone_number: String!, standard: String!, batch_name: String!, tuition_id: ID!, date: String!, reason: String!): AbsenceReason
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
    markNotificationAsRead(id: ID!): Notification
    markAllNotificationsAsRead(tuition_id: ID): Int
    deleteNotification(id: ID!): Boolean
    createResultTemplate(tuition_id: ID!, name: String!, standard: String!, template_type: String!, design: TemplateDesignInput!, subjects: [SubjectInput]!, grading: GradingSystemInput!): ResultTemplate
    updateResultTemplate(id: ID!, data: ResultTemplateUpdateInput!): ResultTemplate
    deleteResultTemplate(id: ID!): ResultTemplate
    createResult(tuition_id: ID!, student_id: ID!, template_id: ID!, exam_name: String!, exam_date: String!, exam_type: String!, subjects: [ResultSubjectInput]!, student_photo_url: String, remarks: String): Result
    updateResult(id: ID!, data: ResultUpdateInput!): Result
    deleteResult(id: ID!): Result
    generateResultCard(result_id: ID!, format: String): String
    generateBatchResults(tuition_id: ID!, batch_id: ID!, template_id: ID!, exam_name: String!, exam_date: String!, exam_type: String!, results_data: [BatchResultInput]!): [Result]
    submitPublicRegistration(input: PublicRegistrationInput!): PublicRegistration
    approvePublicRegistration(id: ID!, status: String!, notes: String): PublicRegistration
    convertRegistrationToStudent(registration_id: ID!, batch_id: ID!): Student
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

  input TuitionInput {
    name: String!
    address: String!
    contact_info: String!
    standards: [String!]!
    fees_structure: [FeesStructureInput!]!
  }

  input FeesStructureInput {
    standard: String!
    amount: Float!
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

  input TemplateDesignInput {
    width: Int!
    height: Int!
    background: BackgroundConfigInput!
    logo: LogoConfigInput!
    title: TextConfigInput!
    student_photo: PhotoConfigInput!
    student_info: StudentInfoConfigInput!
    marks_table: TableConfigInput!
    total_marks: TextConfigInput!
    percentage: TextConfigInput!
    grade: TextConfigInput!
    date: TextConfigInput!
  }

  input BackgroundConfigInput {
    type: String!
    color: String
    image_url: String
  }

  input LogoConfigInput {
    enabled: Boolean!
    url: String
    position: PositionInput
  }

  input TextConfigInput {
    text: String
    font: String!
    size: Int!
    color: String!
    position: PositionInput
    enabled: Boolean
  }

  input PhotoConfigInput {
    enabled: Boolean!
    position: PositionInput!
    border: String!
    border_width: Int!
  }

  input StudentInfoConfigInput {
    name: TextConfigInput!
    roll_no: TextConfigInput!
    standard: TextConfigInput!
  }

  input TableConfigInput {
    enabled: Boolean!
    position: PositionInput!
    header: TableStyleInput!
    data: TableStyleInput!
  }

  input TableStyleInput {
    font: String!
    size: Int!
    color: String!
    background: String
  }

  input PositionInput {
    x: Int!
    y: Int!
    width: Int
    height: Int
  }

  input SubjectInput {
    name: String!
    max_marks: Int!
    position: Int
  }

  input GradingSystemInput {
    A: GradeRangeInput
    B: GradeRangeInput
    C: GradeRangeInput
    D: GradeRangeInput
    F: GradeRangeInput
  }

  input GradeRangeInput {
    min: Int!
    max: Int!
    grade: String!
  }

  input ResultSubjectInput {
    name: String!
    max_marks: Int!
    obtained_marks: Int!
  }

  input ResultTemplateUpdateInput {
    name: String
    standard: String
    template_type: String
    design: TemplateDesignInput
    subjects: [SubjectInput]
    grading: GradingSystemInput
    is_active: Boolean
  }

  input ResultUpdateInput {
    exam_name: String
    exam_date: String
    exam_type: String
    subjects: [ResultSubjectInput]
    student_photo_url: String
    remarks: String
    position_in_class: Int
    total_students: Int
    status: String
  }

  input BatchResultInput {
    student_id: ID!
    subjects: [ResultSubjectInput]!
    student_photo_url: String
    remarks: String
  }

  input PublicRegistrationInput {
    tuition_id: ID!
    tuition_custom_id: String!
    name: String!
    photo_url: String
    phone: String!
    email: String
    address: String!
    standard: String!
    batch_name: String!
    total_fee: Float!
    fees_paid: Float!
    payment_mode: String!
    payment_date: String
    whatsapp_group: String
    parent_name: String
    parent_phone: String
    emergency_contact: String
    notes: String
  }
`;

export default typeDefs; 