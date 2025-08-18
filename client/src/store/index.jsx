import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tuitionReducer from './slices/tuitionSlice';
import studentReducer from './slices/studentSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tuition: tuitionReducer,
    students: studentReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// For JavaScript, we'll use JSDoc comments instead of TypeScript types
/**
 * @typedef {import('@reduxjs/toolkit').RootState} RootState
 * @typedef {import('@reduxjs/toolkit').AppDispatch} AppDispatch
 */ 