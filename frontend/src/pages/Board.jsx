import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar      from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import api         from '../utils/api';

export default function Board() {
  const { projectId }  = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId    = searchParams.get('ws');
  const navigate       = useNavigate();

  const [project,  setProject]  = useState(null);
  const [socket,   setSocket]   = useState(null);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    fetchProject();
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    s.on('connect',    () => { setSocketId(s.id); window.__socketId = s.id; });
    s.on('disconnect', () => { setSocketId(null); window.__socketId = null; });
    setSocket(s);
    return () => { window.__socketId = null; s.disconnect(); };
  }, [projectId]);

  const fetchProject = async () => {
    try {
      if (!workspaceId) return;
      const { data } = await api.get(`/projects/${workspaceId}`);
      const proj = data.find(p => p._id === projectId);
      setProject(proj || null);
    } catch { navigate('/dashboard'); }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <Navbar />

      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 text-sm">
        <Link to="/dashboard" className="text-gray-400 hover:text-[#0073bb] transition">Dashboard</Link>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {project ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: project.color || '#0073bb' }}/>
            <span className="font-medium text-gray-800">{project.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Loading…</span>
        )}
      </div>

      {/* Board area */}
      <div className="flex-1 p-5 overflow-x-auto">
        {socket && socketId ? (
          <KanbanBoard
            projectId={projectId}
            workspaceId={workspaceId}
            socket={socket}
            socketId={socketId}
          />
        ) : (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <div className="animate-spin w-5 h-5 border-2 border-[#0073bb] border-t-transparent rounded-full"/>
            <span className="text-sm">Connecting…</span>
          </div>
        )}
      </div>
    </div>
  );
}
