import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api    from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  Owner:   'bg-purple-100 text-purple-700 border border-purple-200',
  Admin:   'bg-red-100 text-red-700 border border-red-200',
  Manager: 'bg-amber-100 text-amber-700 border border-amber-200',
  Member:  'bg-slate-100 text-slate-600 border border-slate-200',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspaces,    setWorkspaces]    = useState([]);
  const [projects,      setProjects]      = useState({});
  const [invites,       setInvites]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeWs,      setActiveWs]      = useState(null);

  const [showWsModal,    setShowWsModal]    = useState(false);
  const [showProjModal,  setShowProjModal]  = useState(false);
  const [showInvite,     setShowInvite]     = useState(false);
  const [showInviteList, setShowInviteList] = useState(false);

  const [wsForm,     setWsForm]     = useState({ name: '', description: '' });
  const [projForm,   setProjForm]   = useState({ name: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Member' });
  const [error,      setError]      = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
      if (data.length > 0) { setActiveWs(data[0]._id); fetchProjects(data[0]._id); }
    } catch {} finally { setLoading(false); }
  };

  const fetchProjects = async (wsId) => {
    try {
      const { data } = await api.get(`/projects/${wsId}`);
      setProjects(prev => ({ ...prev, [wsId]: data }));
    } catch {}
  };

  const fetchInvites = async (wsId) => {
    try {
      const { data } = await api.get(`/invitations/workspace/${wsId}`);
      setInvites(data);
    } catch {}
  };

  const handleWsSelect = (wsId) => {
    setActiveWs(wsId);
    if (!projects[wsId]) fetchProjects(wsId);
  };

  const activeWorkspace = workspaces.find(w => w._id === activeWs);
  const activeProjects  = projects[activeWs] || [];

  const isOwner = activeWorkspace && (
    activeWorkspace.owner?._id === user?._id || activeWorkspace.owner === user?._id
  );
  const myMembership = activeWorkspace?.members?.find(
    m => m.user?._id === user?._id || m.user === user?._id
  );
  const myRole = isOwner ? 'Owner' : (myMembership?.role || 'Member');
  const canManageProjects = ['Owner', 'Admin', 'Manager'].includes(myRole);
  const canChangeRoles    = isOwner || myRole === 'Admin';

  const createWorkspace = async (e) => {
    e.preventDefault(); setError('');
    try {
      const { data } = await api.post('/workspaces', wsForm);
      setWorkspaces(prev => [data, ...prev]);
      setActiveWs(data._id);
      setProjects(prev => ({ ...prev, [data._id]: [] }));
      setShowWsModal(false); setWsForm({ name: '', description: '' });
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const createProject = async (e) => {
    e.preventDefault(); setError('');
    try {
      const { data } = await api.post('/projects', { ...projForm, workspace: activeWs });
      setProjects(prev => ({ ...prev, [activeWs]: [data, ...(prev[activeWs] || [])] }));
      setShowProjModal(false); setProjForm({ name: '', description: '' });
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const sendInvite = async (e) => {
    e.preventDefault(); setError(''); setInviteSent(false);
    try {
      await api.post('/invitations', { email: inviteForm.email, workspaceId: activeWs, role: inviteForm.role });
      setInviteSent(true); setInviteForm({ email: '', role: 'Member' });
      fetchInvites(activeWs);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const deleteWorkspace = async () => {
    if (!confirm(`Delete "${activeWorkspace?.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/workspaces/${activeWs}`);
      const remaining = workspaces.filter(w => w._id !== activeWs);
      setWorkspaces(remaining);
      const nextId = remaining[0]?._id || null;
      setActiveWs(nextId);
      if (nextId) fetchProjects(nextId);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const changeMemberRole = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/workspaces/${activeWs}/members/${userId}/role`, { role: newRole });
      setWorkspaces(prev => prev.map(w => w._id === activeWs ? data.workspace : w));
    } catch (err) { alert(err.response?.data?.message || 'Failed to change role'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-3 border-[#0073bb] border-t-transparent rounded-full"/>
        <p className="text-gray-500 text-sm">Loading workspace…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Dark Sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-60 bg-[#161e2d] flex flex-col shrink-0">
          {/* Sidebar header */}
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Workspaces</span>
              <button onClick={() => { setShowWsModal(true); setError(''); }}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-[#0073bb] text-gray-400 hover:text-white flex items-center justify-center text-sm transition">
                +
              </button>
            </div>
            {/* Workspace list */}
            <ul className="space-y-0.5">
              {workspaces.map(ws => (
                <li key={ws._id}>
                  <button onClick={() => handleWsSelect(ws._id)}
                    className={`sidebar-item w-full text-left ${activeWs === ws._id ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${activeWs === ws._id ? 'bg-[#0073bb] text-white' : 'bg-white/10 text-gray-400'}`}>
                        {ws.name[0].toUpperCase()}
                      </div>
                      <span className="truncate text-sm">{ws.name}</span>
                    </div>
                  </button>
                </li>
              ))}
              {workspaces.length === 0 && (
                <p className="text-xs text-gray-600 px-2 py-1">No workspaces yet</p>
              )}
            </ul>
          </div>

          {/* Sidebar footer */}
          <div className="mt-auto px-4 pb-5 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0073bb] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-gray-300 text-xs font-medium truncate">{user?.name}</p>
                <p className="text-gray-600 text-xs truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {activeWorkspace ? (
            <div className="p-6 max-w-6xl mx-auto">

              {/* Page header */}
              <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h1 className="text-xl font-bold text-gray-900">{activeWorkspace.name}</h1>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[myRole]}`}>
                      {myRole}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{activeWorkspace.description || 'No description'}</p>
                </div>

                {/* Actions — role-gated */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isOwner && (
                    <>
                      <button onClick={() => { setShowInvite(true); setError(''); setInviteSent(false); }}
                        className="btn-secondary flex items-center gap-1.5 text-xs">
                        <span>+ Invite</span>
                      </button>
                      <button onClick={() => { fetchInvites(activeWs); setShowInviteList(true); }}
                        className="btn-secondary text-xs">
                        Invitations
                      </button>
                    </>
                  )}
                  {canManageProjects && (
                    <button onClick={() => { setShowProjModal(true); setError(''); }}
                      className="btn-primary flex items-center gap-1.5 text-xs">
                      + New Project
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={deleteWorkspace} className="btn-danger text-xs">Delete</button>
                  )}
                </div>
              </div>

              {/* Member info banner for Members */}
              {myRole === 'Member' && (
                <div className="bg-[#0073bb]/5 border border-[#0073bb]/20 rounded-xl px-4 py-3 mb-5 text-sm text-[#0073bb] flex items-center gap-2">
                  <span className="shrink-0">ℹ️</span>
                  <span>As a <strong>Member</strong>, you can view projects and open boards. On the board you can request tasks and mark assigned tasks as done.</span>
                </div>
              )}

              {/* Two-column layout: Members table + Projects */}
              <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">

                {/* Members panel */}
                <div className="card overflow-hidden h-fit">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Members</h2>
                    <span className="text-xs text-gray-400">{1 + (activeWorkspace.members?.length || 0)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {/* Owner */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {activeWorkspace.owner?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activeWorkspace.owner?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{activeWorkspace.owner?.email}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">Owner</span>
                    </div>

                    {/* Members */}
                    {activeWorkspace.members?.map((m, i) => (
                      <div key={m.user?._id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-[#0073bb] text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {m.user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.user?.name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
                        </div>
                        {canChangeRoles ? (
                          <select value={m.role}
                            onChange={e => changeMemberRole(m.user?._id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#0073bb] shrink-0 cursor-pointer">
                            <option value="Member">Member</option>
                            <option value="Manager">Manager</option>
                            {isOwner && <option value="Admin">Admin</option>}
                          </select>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ROLE_BADGE[m.role]}`}>{m.role}</span>
                        )}
                      </div>
                    ))}
                    {(!activeWorkspace.members || activeWorkspace.members.length === 0) && (
                      <p className="text-xs text-gray-400 px-4 py-3">No members yet.</p>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                      Projects <span className="text-gray-400 font-normal ml-1">({activeProjects.length})</span>
                    </h2>
                  </div>

                  {activeProjects.length === 0 ? (
                    <div className="card flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <span className="text-2xl">📋</span>
                      </div>
                      <p className="text-gray-700 font-medium mb-1">No projects yet</p>
                      <p className="text-gray-400 text-sm">
                        {canManageProjects ? 'Create your first project to get started.' : 'Ask an Admin or Manager to create a project.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeProjects.map(proj => (
                        <button key={proj._id}
                          onClick={() => navigate(`/board/${proj._id}?ws=${activeWs}`)}
                          className="card p-5 text-left hover:border-[#0073bb]/40 hover:shadow-md transition-all duration-150 group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                 style={{ background: proj.color || '#0073bb' }}>
                              {proj.name[0].toUpperCase()}
                            </div>
                            <svg className="w-4 h-4 text-gray-300 group-hover:text-[#0073bb] transition mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-[#0073bb] transition">{proj.name}</h3>
                          <p className="text-xs text-gray-400 line-clamp-2">{proj.description || 'No description'}</p>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                            <span className="text-xs text-gray-400">Open board</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#0073bb]/10 flex items-center justify-center mb-4">
                <span className="text-3xl">🏢</span>
              </div>
              <h2 className="text-gray-800 font-semibold text-lg mb-2">No workspace selected</h2>
              <p className="text-gray-400 text-sm mb-5">Create a workspace to start managing your team's projects.</p>
              <button onClick={() => setShowWsModal(true)} className="btn-primary">
                Create Workspace
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {/* Create Workspace */}
      {showWsModal && (
        <Modal title="Create Workspace" onClose={() => setShowWsModal(false)}>
          <form onSubmit={createWorkspace} className="space-y-3">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="label">Workspace name</label>
              <input required placeholder="e.g. Acme Engineering" className="input"
                value={wsForm.name} onChange={e => setWsForm({ ...wsForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea placeholder="What is this workspace for?" className="input" rows={2}
                value={wsForm.description} onChange={e => setWsForm({ ...wsForm, description: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Create Workspace</button>
          </form>
        </Modal>
      )}

      {/* Create Project */}
      {showProjModal && (
        <Modal title="New Project" onClose={() => setShowProjModal(false)}>
          <form onSubmit={createProject} className="space-y-3">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="label">Project name</label>
              <input required placeholder="e.g. Website Redesign" className="input"
                value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea placeholder="What will this project deliver?" className="input" rows={2}
                value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Create Project</button>
          </form>
        </Modal>
      )}

      {/* Send Invite */}
      {showInvite && (
        <Modal title="Invite Member" onClose={() => { setShowInvite(false); setInviteSent(false); setError(''); }}>
          {inviteSent ? (
            <div className="text-center py-5">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📧</span>
              </div>
              <p className="font-semibold text-gray-900 mb-1">Invitation sent!</p>
              <p className="text-sm text-gray-500 mb-4">An email has been sent with Accept / Decline buttons. The user will be added once they accept.</p>
              <button onClick={() => { setInviteSent(false); setInviteForm({ email: '', role: 'Member' }); }}
                className="text-sm text-[#0073bb] hover:underline">Send another</button>
            </div>
          ) : (
            <form onSubmit={sendInvite} className="space-y-3">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                An invitation email will be sent. If the user doesn't have an account, they'll be prompted to register first.
              </p>
              <div>
                <label className="label">Email address</label>
                <input required type="email" placeholder="teammate@company.com" className="input"
                  value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                  <option value="Member">Member</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  {inviteForm.role === 'Admin'   && '🔴 Can manage projects & tasks. Cannot delete workspace.'}
                  {inviteForm.role === 'Manager' && '🟡 Can manage projects & tasks, approve requests.'}
                  {inviteForm.role === 'Member'  && '🟢 Can view board, request tasks, mark assigned tasks done.'}
                </p>
              </div>
              <button type="submit" className="btn-primary w-full">Send Invitation Email</button>
            </form>
          )}
        </Modal>
      )}

      {/* Invitation list */}
      {showInviteList && (
        <Modal title="Sent Invitations" onClose={() => setShowInviteList(false)}>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {invites.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No invitations sent yet</p>}
            {invites.map(inv => (
              <div key={inv._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                  <p className="text-xs text-gray-400">{inv.role} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  inv.status === 'Pending'  ? 'bg-yellow-100 text-yellow-700' :
                  inv.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                  inv.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-500'
                }`}>{inv.status}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-lg leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
