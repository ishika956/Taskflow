import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import Board        from './pages/Board';
import Settings     from './pages/Settings';
import InviteAccept from './pages/InviteAccept';
import Invitations from "./pages/Invitations";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"/>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        {/* Public invite pages — no auth needed to view, auth needed to accept */}
        <Route path="/invite/accept"   element={<InviteAccept />} />
        <Route path="/invite/decline"  element={<InviteAccept />} />
        <Route path="/dashboard"       element={<Private><Dashboard /></Private>} />
        <Route path="/board/:projectId" element={<Private><Board /></Private>} />
        <Route path="/settings"        element={<Private><Settings /></Private>} />
        <Route path="*"                element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/invitations"
          element={<Invitations />}
        />
      </Routes>
    </AuthProvider>
  );
}
