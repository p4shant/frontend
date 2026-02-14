import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import RegisterCustomer from './pages/RegisterCustomer';
import RegisterEmployee from './pages/RegisterEmployee';
import MarkAttendance from './pages/MarkAttendance';
import Profile from './pages/Profile';
import TrackApplication from './pages/TrackApplication';
import MonitorAttendance from './pages/MonitorAttendance';
import TrackPayment from './pages/TrackPayment';
import Login from './pages/Login';
import { ProtectedRoute } from './components/common/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/register-customer"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RegisterCustomer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mark-attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MarkAttendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/register-employee"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RegisterEmployee />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/track-application"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrackApplication />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitor-attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MonitorAttendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/track-payment"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrackPayment />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
