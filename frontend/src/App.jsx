import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';

// PrivateRoute: checks auth and role
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Student */}
          <Route
            path="/student"
            element={
              <PrivateRoute allowedRoles={['STUDENT']}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Staff */}
          <Route
            path="/staff"
            element={
              <PrivateRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffDashboard />
              </PrivateRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          {/* Default: redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
