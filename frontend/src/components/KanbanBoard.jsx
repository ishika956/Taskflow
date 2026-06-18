import { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard   from './TaskCard';
import TaskModal  from './TaskModal';
import api        from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLUMNS = ['Todo', 'In Progress', 'In Review', 'Done'];

// All columns same neutral style — accent only on the top indicator
const COL_ACCENT = {
  'Todo':        '#94a3b8',
  'In Progress': '#0073bb',
  'In Review':   '#f59e0b',
  'Done':        '#22c55e',
};

const STATUS_BADGE = {
  Pending:  'bg-amber-50 text-amber-600 border border-amber-200',
  Approved: 'bg-green-50 text-green-600 border border-green-200',
  Rejected: 'bg-red-50 text-red-600 border border-red-200',
};

function Column({ status, tasks, onCardClick, userRole, onComplete }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = COL_ACCENT[status];
  return (
    <div className={`flex flex-col rounded-xl bg-[#f0f2f5] border transition-all duration-150 min-h-[70vh] ${isOver ? 'border-[#0073bb]/40 ring-1 ring-[#0073bb]/20' : 'border-gray-200'}`}>
      {/* Column header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }}/>
            <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5 min-w-[24px] text-center">
            {tasks.length}
          </span>
        </div>
        {/* Accent line under header */}
        <div className="mt-3 h-0.5 rounded-full" style={{ background: accent, opacity: 0.4 }}/>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto">
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task._id} task={task}
              userRole={userRole}
              onClick={() => onCardClick(task)}
              onComplete={onComplete}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-xs text-gray-300">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ projectId, workspaceId, socket, socketId }) {
  const { user } = useAuth();
  const [tasks,        setTasks]        = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [userRole,     setUserRole]     = useState(null);
  const [activeTask,   setActiveTask]   = useState(null);
  const [modalTask,    setModalTask]    = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showRequest,  setShowRequest]  = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [createForm,   setCreateForm]   = useState({ title: '', priority: 'Medium', status: 'Todo', assignees: [] });
  const [requestForm,  setRequestForm]  = useState({ title: '', description: '', priority: 'Medium' });
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { fetchAll(); }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join-board', projectId);
    const onCreated = (t)   => setTasks(prev => prev.some(x => x._id === t._id) ? prev : [...prev, t]);
    const onUpdated = (t)   => setTasks(prev => prev.map(x => x._id === t._id ? t : x));
    const onMoved   = (t)   => setTasks(prev => prev.map(x => x._id === t._id ? t : x));
    const onDeleted = ({_id}) => setTasks(prev => prev.filter(x => x._id !== _id));
    const onReqNew  = (r)   => setRequests(prev => prev.some(x => x._id === r._id) ? prev : [r, ...prev]);
    const onReqUpd  = (r)   => setRequests(prev => prev.map(x => x._id === r._id ? r : x));
    socket.on('task:created', onCreated); socket.on('task:updated', onUpdated);
    socket.on('task:moved', onMoved);     socket.on('task:deleted', onDeleted);
    socket.on('request:created', onReqNew); socket.on('request:updated', onReqUpd);
    return () => {
      socket.emit('leave-board', projectId);
      ['task:created','task:updated','task:moved','task:deleted','request:created','request:updated'].forEach(e => socket.off(e));
    };
  }, [socket, projectId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tasksRes, wsRes, reqRes] = await Promise.all([
        api.get(`/tasks/${projectId}`),
        api.get('/workspaces'),
        api.get(`/task-requests/${projectId}?workspaceId=${workspaceId}`),
      ]);
      setTasks(tasksRes.data);
      setRequests(reqRes.data);
      const ws = wsRes.data.find(w => w._id === workspaceId);
      if (ws) {
        setMembers([{ user: ws.owner }, ...ws.members]);
        if (ws.owner?._id === user?._id || ws.owner === user?._id) setUserRole('Owner');
        else {
          const me = ws.members.find(m => m.user?._id === user?._id);
          setUserRole(me?.role || 'Member');
        }
      }
    } catch {}
    setLoading(false);
  };

  const isMember  = userRole === 'Member';
  const isManager = ['Owner', 'Admin', 'Manager'].includes(userRole);

  const handleDragStart = ({ active }) => setActiveTask(tasks.find(t => t._id === active.id));
  const handleDragEnd   = async ({ active, over }) => {
    setActiveTask(null);
    if (!over || isMember) return;
    const dragged   = tasks.find(t => t._id === active.id);
    const newStatus = COLUMNS.includes(over.id) ? over.id : tasks.find(t => t._id === over.id)?.status;
    if (!newStatus || dragged?.status === newStatus) return;
    setTasks(prev => prev.map(t => t._id === dragged._id ? { ...t, status: newStatus } : t));
    try { await api.patch(`/tasks/${dragged._id}/move`, { status: newStatus }); }
    catch { fetchAll(); }
  };

  const handleComplete = async (taskId) => {
    try {
      const { data } = await api.patch(`/tasks/${taskId}/complete`);
      setTasks(prev => prev.map(t => t._id === data._id ? data : t));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/tasks', { ...createForm, assignees: createForm.assignees || [], project: projectId, workspace: workspaceId });
      setTasks(prev => prev.some(t => t._id === data._id) ? prev : [...prev, data]);
      setShowCreate(false);
      setCreateForm({ title: '', priority: 'Medium', status: 'Todo', assignees: [] });
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/task-requests', { ...requestForm, project: projectId, workspace: workspaceId });
      setRequests(prev => prev.some(r => r._id === data._id) ? prev : [data, ...prev]);
      setShowRequest(false);
      setRequestForm({ title: '', description: '', priority: 'Medium' });
      alert('Request submitted! An Admin or Manager will review it.');
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const approveRequest = async (reqId) => {
    try {
      const { data } = await api.patch(`/task-requests/${reqId}/approve`);
      setRequests(prev => prev.map(r => r._id === reqId ? data.request : r));
      setTasks(prev => prev.some(t => t._id === data.task._id) ? prev : [...prev, data.task]);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const rejectRequest = async () => {
    try {
      const { data } = await api.patch(`/task-requests/${rejectModal}/reject`, { reason: rejectReason });
      setRequests(prev => prev.map(r => r._id === rejectModal ? data : r));
      setRejectModal(null); setRejectReason('');
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const tasksByColumn = (status) => {
    const seen = new Set();
    return tasks.filter(t => { if (t.status !== status || seen.has(t._id)) return false; seen.add(t._id); return true; });
  };

  const uniqueRequests = requests.filter((r, i, arr) => arr.findIndex(x => x._id === r._id) === i);
  const pendingCount   = uniqueRequests.filter(r => r.status === 'Pending').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-[#0073bb] border-t-transparent rounded-full"/>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Role badge */}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            userRole === 'Owner'   ? 'bg-purple-50 text-purple-700 border-purple-200' :
            userRole === 'Admin'   ? 'bg-red-50 text-red-700 border-red-200' :
            userRole === 'Manager' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                     'bg-slate-50 text-slate-600 border-slate-200'
          }`}>{userRole}</span>

          {/* Requests button */}
          <button onClick={() => setShowRequests(!showRequests)}
            className="relative inline-flex items-center gap-1.5 text-xs btn-secondary py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isManager ? 'Task Requests' : 'My Requests'}
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div>
          {isManager && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          )}
          {isMember && (
            <button onClick={() => setShowRequest(true)} className="btn-primary text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Request Task
            </button>
          )}
        </div>
      </div>

      {/* Member info banner */}
      {isMember && (
        <div className="bg-[#0073bb]/5 border border-[#0073bb]/20 rounded-xl px-4 py-2.5 mb-4 text-sm text-[#0073bb] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          As a <strong className="mx-1">Member</strong>, you can view the board and mark your assigned tasks as done. Use <strong className="mx-1">Request Task</strong> to ask for new work.
        </div>
      )}

      {/* Requests Panel */}
      {showRequests && (
        <div className="card mb-5 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {isManager ? `Task Requests (${pendingCount} pending)` : 'My Requests'}
            </h3>
            <button onClick={() => setShowRequests(false)}
              className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 text-sm transition">✕</button>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {uniqueRequests.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No requests yet</p>
            )}
            {uniqueRequests.map(req => (
              <div key={req._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm text-gray-900 truncate">{req.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  {isManager && <p className="text-xs text-gray-400">By: {req.requestedBy?.name}</p>}
                  {req.status === 'Rejected' && req.rejectReason && (
                    <p className="text-xs text-red-400 mt-0.5">Reason: {req.rejectReason}</p>
                  )}
                  {req.status === 'Approved' && (
                    <p className="text-xs text-green-500 mt-0.5">✓ Task created and assigned to you</p>
                  )}
                </div>
                {isManager && req.status === 'Pending' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveRequest(req._id)}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg transition">
                      Approve
                    </button>
                    <button onClick={() => { setRejectModal(req._id); setRejectReason(''); }}
                      className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board columns */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <Column key={col} status={col}
              tasks={tasksByColumn(col)}
              userRole={userRole}
              onCardClick={t => !isMember && setModalTask(t)}
              onComplete={handleComplete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} userRole={userRole} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* ── Create Task Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <BoardModal title="New Task" onClose={() => setShowCreate(false)}>
          <form onSubmit={createTask} className="space-y-3">
            <div>
              <label className="label">Title</label>
              <input required placeholder="Task title" className="input"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Column</label>
                <select className="input" value={createForm.status}
                  onChange={e => setCreateForm({ ...createForm, status: e.target.value })}>
                  {COLUMNS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={createForm.priority}
                  onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}>
                  {['Low','Medium','High','Urgent'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Assignees</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {members.map((m, i) => {
                  const uid = m.user?._id;
                  const sel = (createForm.assignees || []).includes(uid);
                  return (
                    <button key={uid} type="button"
                      onClick={() => setCreateForm(prev => ({
                        ...prev,
                        assignees: sel ? prev.assignees.filter(id => id !== uid) : [...(prev.assignees || []), uid]
                      }))}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${sel ? 'bg-[#0073bb]/5 text-[#0073bb]' : 'hover:bg-gray-50 text-gray-700'} ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className="w-6 h-6 rounded-full bg-[#0073bb] text-white text-xs flex items-center justify-center font-bold shrink-0">
                        {m.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 truncate text-sm">{m.user?.name}</span>
                      {sel && <span className="text-[#0073bb] text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input"
                value={createForm.deadline || ''}
                onChange={e => setCreateForm({ ...createForm, deadline: e.target.value || undefined })} />
            </div>
            <button type="submit" className="btn-primary w-full">Create Task</button>
          </form>
        </BoardModal>
      )}

      {/* ── Request Task Modal ─────────────────────────────────────────────── */}
      {showRequest && (
        <BoardModal title="Request a Task" onClose={() => setShowRequest(false)}>
          <p className="text-sm text-gray-500 mb-4">Describe what you'd like to work on. An Admin or Manager will review and assign it to you.</p>
          <form onSubmit={submitRequest} className="space-y-3">
            <div>
              <label className="label">What would you like to work on?</label>
              <input required placeholder="e.g. Fix login page bug" className="input"
                value={requestForm.title}
                onChange={e => setRequestForm({ ...requestForm, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Details (optional)</label>
              <textarea rows={3} placeholder="Describe in more detail…" className="input"
                value={requestForm.description}
                onChange={e => setRequestForm({ ...requestForm, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={requestForm.priority}
                onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}>
                {['Low','Medium','High','Urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">Submit Request</button>
          </form>
        </BoardModal>
      )}

      {/* ── Reject Reason Modal ────────────────────────────────────────────── */}
      {rejectModal && (
        <BoardModal title="Reject Request" onClose={() => setRejectModal(null)}>
          <div>
            <label className="label">Reason (optional)</label>
            <textarea rows={3} placeholder="Explain why this request is being rejected…"
              className="input mb-4" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={rejectRequest}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition">
                Confirm Reject
              </button>
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </BoardModal>
      )}

      {/* ── Task Detail Modal ─────────────────────────────────────────────── */}
      {modalTask && (
        <TaskModal
          task={modalTask} workspaceId={workspaceId}
          onClose={() => setModalTask(null)}
          onUpdated={updated => {
            setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
            setModalTask(updated);
          }}
          onDeleted={id => { setTasks(prev => prev.filter(t => t._id !== id)); setModalTask(null); }}
        />
      )}
    </div>
  );
}

function BoardModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
