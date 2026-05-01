import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import Reports from './pages/Reports';
import Students from './pages/Students';
import Profile from './pages/Profile'; // ✅ added
import Landing from './pages/Landing'; // ✅ added

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ✅ Landing routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />

          <Route path="/login" element={<Login />} />

          {/* ✅ Changed "/" to "/dashboard" */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><MarkAttendance /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;