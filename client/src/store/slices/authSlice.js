import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user { 
                id 
                name 
                email 
                phone 
                role 
                tuition_id 
                tuition_custom_id
                hasExistingData 
              }
            }
          }`,
          variables: { email, password },
        }),
      });

      const data = await res.json();
      if (data.errors) {
        throw new Error(data.errors[0].message || 'Login failed');
      }

      // Save token and user data to localStorage
      localStorage.setItem('token', data.data.login.token);
      localStorage.setItem('user', JSON.stringify(data.data.login.user));

      return data.data.login;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Remove token and user data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        throw new Error('No authentication data found');
      }

      // Verify token with backend
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `query GetUser {
            me {
              id 
              name 
              email 
              phone 
              role 
              tuition_id 
              tuition_custom_id
              hasExistingData
            }
          }`
        }),
      });

      const data = await res.json();
      if (data.errors) {
        throw new Error(data.errors[0].message || 'Token verification failed');
      }

      return {
        token,
        user: data.data.me
      };
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  userRole: null,
  tuitionId: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUserRole: (state, action) => {
      state.userRole = action.payload;
    },
    updateUserProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    connectToTuition: (state, action) => {
      state.tuitionId = action.payload.tuitionId;
      state.userRole = action.payload.role;
      if (state.user) {
        state.user.tuition_id = action.payload.tuitionId;
        state.user.role = action.payload.role;
      }
    },
    disconnectFromTuition: (state) => {
      state.tuitionId = null;
      state.userRole = null;
      if (state.user) {
        state.user.tuition_id = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.userRole = action.payload.user.role;
        
        // Set tuitionId based on user role and tuition_id
        if (action.payload.user.tuition_id) {
          state.tuitionId = action.payload.user.tuition_id;
        } else if (action.payload.user.role === 'tuition_owner') {
          // For tuition_owner, we'll need to fetch their tuition_id from backend
          // For now, set a flag to indicate they're an owner
          state.tuitionId = 'owner';
        }
        
        // Store tuition_custom_id if available
        if (action.payload.user.tuition_custom_id) {
          state.user.tuition_custom_id = action.payload.user.tuition_custom_id;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.userRole = null;
        state.tuitionId = null;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.userRole = action.payload.user.role;
        state.tuitionId = action.payload.user.tuition_id;
        
        // Store tuition_custom_id if available
        if (action.payload.user.tuition_custom_id) {
          state.user.tuition_custom_id = action.payload.user.tuition_custom_id;
        }
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.userRole = null;
        state.tuitionId = null;
      });
  },
});

export const {
  clearError,
  setUserRole,
  updateUserProfile,
  connectToTuition,
  disconnectFromTuition
} = authSlice.actions;

export default authSlice.reducer; 