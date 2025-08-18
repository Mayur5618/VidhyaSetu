import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching tuition data
export const fetchTuitionData = createAsyncThunk(
  'tuition/fetchTuitionData',
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
          query: `query GetTuition($id: ID!) {
            tuition(id: $id) {
              id
              name
              address
              contact_info
              standards_offered
              fees_structure {
                standard
                total_fee
              }
              batches
              createdAt
              updatedAt
            }
          }`,
          variables: { id: tuitionId },
        }),
      });
      
      const data = await res.json();
      
      if (data.errors) {
        return rejectWithValue(data.errors[0].message);
      }
      
      return data.data.tuition;
    } catch (error) {
      return rejectWithValue('Failed to fetch tuition data');
    }
  }
);

// Fetch students for a tuition
export const fetchStudents = createAsyncThunk(
  'tuition/fetchStudents',
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
              standard
              batch_id
              paid_fee
              remaining_fee
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

// Fetch batches pending attendance for today
export const fetchPendingAttendanceBatches = createAsyncThunk(
  'tuition/fetchPendingAttendanceBatches',
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
          query: `query PendingBatches($tuitionId: ID!, $date: String) {
            pendingAttendanceBatches(tuition_id: $tuitionId, date: $date) {
              id
              name
              standard
            }
          }`,
          variables: { tuitionId, date: new Date().toISOString() },
        }),
      });
      const data = await res.json();
      if (data.errors) {
        return rejectWithValue(data.errors[0].message);
      }
      return data.data.pendingAttendanceBatches;
    } catch (error) {
      return rejectWithValue('Failed to fetch pending attendance batches');
    }
  }
);

const initialState = {
  tuitionData: null,
  students: [],
  subTeachers: [],
  pendingAttendanceBatches: [],
  isLoading: false,
  error: null,
};

const tuitionSlice = createSlice({
  name: 'tuition',
  initialState,
  reducers: {
    clearTuitionError: (state) => {
      state.error = null;
    },
    updateTuitionData: (state, action) => {
      state.tuitionData = { ...state.tuitionData, ...action.payload };
    },
    addSubTeacher: (state, action) => {
      state.subTeachers.push(action.payload);
    },
    removeSubTeacher: (state, action) => {
      state.subTeachers = state.subTeachers.filter(
        teacher => teacher.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTuitionData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTuitionData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tuitionData = action.payload;
        state.subTeachers = action.payload.subTeachers || [];
        state.error = null;
      })
      .addCase(fetchTuitionData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchStudents.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.students = action.payload || [];
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.students = [];
        state.error = action.payload;
      })
      .addCase(fetchPendingAttendanceBatches.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPendingAttendanceBatches.fulfilled, (state, action) => {
        state.pendingAttendanceBatches = action.payload || [];
      })
      .addCase(fetchPendingAttendanceBatches.rejected, (state, action) => {
        state.pendingAttendanceBatches = [];
        state.error = action.payload;
      });
  },
});

export const { 
  clearTuitionError, 
  updateTuitionData, 
  addSubTeacher, 
  removeSubTeacher 
} = tuitionSlice.actions;

// Async thunks are automatically exported when defined above

export default tuitionSlice.reducer; 