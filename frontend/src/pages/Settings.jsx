import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api    from '../utils/api';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const workspaceId    = searchParams.get('ws');
  const [workspace, setWorkspace] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { if (workspaceId) fetchWorkspace(); }, [workspaceId]);

  const fetchWorkspace = async () => {
    const { data } = await api.get('/workspaces');
    const ws = data.find(w => w._id === workspaceId);
    setWorkspace(ws);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"/></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Workspace Settings</h1>
        {workspace ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-lg mb-4">{workspace.name}</h2>
            <h3 className="font-medium text-gray-700 mb-3">Members</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {workspace.owner?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{workspace.owner?.name}</p>
                  <p className="text-xs text-gray-500">{workspace.owner?.email}</p>
                </div>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Owner</span>
              </li>
              {workspace.members?.map(m => (
                <li key={m.user?._id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                    {m.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.user?.name}</p>
                    <p className="text-xs text-gray-500">{m.user?.email}</p>
                  </div>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-500">No workspace selected.</p>
        )}
      </div>
    </div>
  );
}
