import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching students
export const fetchStudents = createAsyncThunk(
  'students/fetchStudents',
  async (tuitionId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          query: `query GetStudents($tuitionId: ID!) {
            students(tuition_id: $tuitionId) {
              id
              name
              email
              phone
              parent_phone
              address
              batch_id
              batch {
                name
                subject
                timing
              }
              fee_status
              attendance_percentage
            }
          }`,
          variables: { tuitionId },
        }),
      });
      
      const data = await res.json();
      
      if (data.errors) {
        return rejectWithValue(data.errors[0].message);
      }
      
      return data.data.students;
    } catch (error) {
      return rejectWithValue('Failed to fetch students');
    }
  }
);

const initialState = {
  students: [],
  selectedStudent: null,
  isLoading: false,
  error: null,
  filters: {
    batch: 'all',
    feeStatus: 'all',
    search: '',
  },
};

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    clearStudentError: (state) => {
      state.error = null;
    },
    setSelectedStudent: (state, action) => {
      state.selectedStudent = action.payload;
    },
    addStudent: (state, action) => {
      state.students.push(action.payload);
    },
    updateStudent: (state, action) => {
      const index = state.students.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.students[index] = action.payload;
      }
    },
    removeStudent: (state, action) => {
      state.students = state.students.filter(s => s.id !== action.payload);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        batch: 'all',
        feeStatus: 'all',
        search: '',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.students = action.payload;
        state.error = null;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  clearStudentError, 
  setSelectedStudent, 
  addStudent, 
  updateStudent, 
  removeStudent,
  setFilters,
  clearFilters
} = studentSlice.actions;
export default studentSlice.reducer; 