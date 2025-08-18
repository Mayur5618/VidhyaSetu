import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const tuitionId = auth.tuitionId;

      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          query: `query GetNotifications($tuitionId: ID!) {
            notifications(tuition_id: $tuitionId) {
              id
              title
              message
              is_read
              created_at
            }
          }`,
          variables: { tuitionId },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        return rejectWithValue(data.errors[0].message);
      }

      const notifications = data.data?.notifications ?? [];
      return notifications;
    } catch (error) {
      return rejectWithValue('Failed to fetch notifications');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markAsRead: (state, action) => {
      const id = action.payload;
      const notification = state.notifications.find((n) => n.id === id);
      if (notification) {
        notification.is_read = true;
      }
      state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.is_read).length;
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { markAsRead, addNotification, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;





