import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    api.get("/invitations/my")
      .then(res => setInvitations(res.data))
      .catch(console.error);
  }, []);
  return (
    <header className="h-14 bg-[#161e2d] border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Brand */}
      <Link to="/dashboard" className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#0073bb] rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">T</span>
        </div>
        <span className="text-white font-semibold text-base tracking-tight">TaskFlow</span>
      </Link>
      <Link
        to="/invitations"
        className="text-gray-300 hover:text-white text-sm relative"
      >
        🔔 Invitations

        {invitations.length > 0 && (
          <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {invitations.length}
          </span>
        )}
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#0073bb] flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-gray-300 text-sm">{user?.name}</span>
        </div>
        <div className="w-px h-4 bg-white/20"/>
        <button onClick={handleLogout}
          className="text-gray-400 hover:text-white text-sm transition">
          Sign out
        </button>
      </div>
    </header>
  );
}
