import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import RegisterCustomer from './pages/RegisterCustomer';
import RegisterEmployee from './pages/RegisterEmployee';
import MarkAttendance from './pages/MarkAttendance';
import MarkTeamAttendance from './pages/MarkTeamAttendance';
import Profile from './pages/Profile';
import TrackApplication from './pages/TrackApplication';
import MonitorAttendance from './pages/MonitorAttendance';
import AdminStats from './pages/AdminStats';
import TaskApproval from './pages/TaskApproval';
import CreateTask from './pages/CreateTask';
import Login from './pages/Login';
import StockDashboard from './pages/StockDashboard';
import StockInward from './pages/StockInward';
import StockOutward from './pages/StockOutward';
import StockHistory from './pages/StockHistory';
import StockCorrection from './pages/StockCorrection';
import QATravelPunch from './pages/QATravelPunch';
import TravelAllowanceReview from './pages/TravelAllowanceReview';
import AdminMarkAttendance from './pages/AdminMarkAttendance';
import PaymentCollection from './pages/PaymentCollection';
import PaymentApproval from './pages/PaymentApproval';
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
        path="/mark-team-attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MarkTeamAttendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-mark-attendance"
        element={
          <ProtectedRoute requiredRoles={['Admin Assistant', 'Master Admin']}>
            <AppLayout>
              <AdminMarkAttendance />
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
        path="/admin-stats"
        element={
          <ProtectedRoute requiredRoles={['Master Admin']}>
            <AppLayout>
              <AdminStats />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/task-approval"
        element={
          <ProtectedRoute requiredRoles={['Master Admin']}>
            <AppLayout>
              <TaskApproval />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-task"
        element={
          <ProtectedRoute requiredRoles={['Master Admin']}>
            <AppLayout>
              <CreateTask />
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

      {/* Stock Management routes */}
      <Route
        path="/stock-dashboard"
        element={
          <ProtectedRoute requiredRoles={['Stock Controller', 'Inventory Operator', 'Master Admin', 'Accountant']} allowWithStockAccess>
            <AppLayout>
              <StockDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-inward"
        element={
          <ProtectedRoute requiredRoles={['Stock Controller', 'Inventory Operator', 'Master Admin', 'Accountant']} allowWithStockAccess>
            <AppLayout>
              <StockInward />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-outward"
        element={
          <ProtectedRoute requiredRoles={['Stock Controller', 'Inventory Operator', 'Master Admin', 'Accountant']} allowWithStockAccess>
            <AppLayout>
              <StockOutward />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-history"
        element={
          <ProtectedRoute requiredRoles={['Stock Controller', 'Inventory Operator', 'Master Admin', 'Accountant']} allowWithStockAccess>
            <AppLayout>
              <StockHistory />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-correction"
        element={
          <ProtectedRoute requiredRoles={['Master Admin']}>
            <AppLayout>
              <StockCorrection />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Payment Collection & Approval routes */}
      <Route
        path="/payment-collection"
        element={
          <ProtectedRoute requiredRoles={['Help Desk']}>
            <AppLayout>
              <PaymentCollection />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-approval"
        element={
          <ProtectedRoute requiredRoles={['Master Admin', 'Admin Assistant']}>
            <AppLayout>
              <PaymentApproval />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* QA Travel routes */}
      <Route
        path="/qa-travel-punch"
        element={
          <ProtectedRoute requiredRoles={['QA Tester']}>
            <AppLayout>
              <QATravelPunch />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/travel-allowance"
        element={
          <ProtectedRoute requiredRoles={['Master Admin', 'SFDC Admin', 'Help Desk']}>
            <AppLayout>
              <TravelAllowanceReview />
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
