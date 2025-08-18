import { useDispatch, useSelector } from 'react-redux';
import { store } from './index.jsx';
import { fetchTuitionData, fetchStudents, fetchPendingAttendanceBatches } from './slices/tuitionSlice';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Custom hooks for specific slices
export const useAuth = () => {
  return useSelector((state) => state.auth);
};

export const useTuition = () => {
  const dispatch = useDispatch();
  const tuitionState = useSelector((state) => state.tuition);
  
  return {
    ...tuitionState,
    fetchTuitionData: (tuitionId) => dispatch(fetchTuitionData(tuitionId)),
    fetchStudents: (tuitionId) => dispatch(fetchStudents(tuitionId)),
    fetchPendingAttendanceBatches: (tuitionId) => dispatch(fetchPendingAttendanceBatches(tuitionId))
  };
};

export const useStudents = () => {
  return useSelector((state) => state.students);
};

export const useNotifications = () => {
  return useSelector((state) => state.notifications);
};

// Helper hooks for common operations
export const useIsAuthenticated = () => {
  return useSelector((state) => state.auth.isAuthenticated);
};

export const useUserRole = () => {
  return useSelector((state) => state.auth.userRole);
};

export const useTuitionId = () => {
  return useSelector((state) => state.auth.tuitionId);
};

export const useAuthToken = () => {
  return useSelector((state) => state.auth.token);
}; 