import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES   = ['Todo', 'In Progress', 'In Review', 'Done'];

const AVATAR_COLORS = [
  'bg-indigo-500','bg-purple-500','bg-pink-500',
  'bg-teal-500','bg-orange-500','bg-cyan-500',
];

export default function TaskModal({ task, workspaceId, onClose, onUpdated, onDeleted }) {
  const [form,       setForm]       = useState({
    ...task,
    assignees: (task.assignees || []).map(a => a._id || a),
  });
  const [comments,   setComments]   = useState([]);
  const [newComment, setNewComment] = useState('');
  const [members,    setMembers]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchComments(); fetchMembers(); }, [task._id]);

  const fetchComments = async () => {
    const { data } = await api.get(`/comments/${task._id}`);
    setComments(data);
  };

  const fetchMembers = async () => {
    const { data } = await api.get('/workspaces');
    const ws = data.find(w => w._id === workspaceId);
    if (ws) setMembers([{ user: ws.owner }, ...ws.members]);
  };

  // Toggle a member in/out of assignees array
  const toggleAssignee = (userId) => {
    setForm(prev => {
      const already = prev.assignees.includes(userId);
      return {
        ...prev,
        assignees: already
          ? prev.assignees.filter(id => id !== userId)
          : [...prev.assignees, userId],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/tasks/${task._id}`, form);
      onUpdated(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const deleteTask = async () => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${task._id}`);
    onDeleted(task._id);
    onClose();
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const { data } = await api.post('/comments', { task: task._id, content: newComment });
    setComments(prev => [...prev, data]);
    setNewComment('');
  };

  const deleteComment = async (id) => {
    await api.delete(`/comments/${id}`);
    setComments(prev => prev.filter(c => c._id !== id));
  };

  const uploadFiles = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    try {
      const { data } = await api.post(`/tasks/${task._id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, attachments: data }));
    } catch { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <input
              className="text-xl font-bold text-gray-900 border-none outline-none w-full"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex gap-2 ml-2 shrink-0">
              <button onClick={save} disabled={saving}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={deleteTask}
                className="text-sm border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                Delete
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Left: description, attachments, comments */}
            <div className="sm:col-span-2 space-y-4">
              <div>
                <label className="label">Description</label>
                <textarea rows={4} placeholder="Add a description…" className="input"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Attachments */}
              <div>
                <label className="label">Attachments</label>
                <div className="space-y-1 mb-2">
                  {form.attachments?.map((a, i) => (
                    <a key={i} href={`http://localhost:5000/uploads/${a.filename}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      📎 {a.originalName}
                    </a>
                  ))}
                </div>
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  className="text-sm border border-dashed border-gray-300 rounded-lg px-3 py-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full">
                  {uploading ? 'Uploading…' : '+ Upload files'}
                </button>
                <input ref={fileRef} type="file" multiple hidden onChange={uploadFiles} />
              </div>

              {/* Comments */}
              <div>
                <label className="label">Comments</label>
                <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c._id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                        {c.author?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-gray-700">{c.author?.name}</span>
                          <button onClick={() => deleteComment(c._id)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet</p>}
                </div>
                <form onSubmit={postComment} className="flex gap-2">
                  <input className="input flex-1" placeholder="Write a comment…"
                    value={newComment} onChange={e => setNewComment(e.target.value)} />
                  <button type="submit" className="btn-primary px-3">Post</button>
                </form>
              </div>
            </div>

            {/* Right: metadata */}
            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* ── Multi-select Assignees ─────────────────────────────── */}
              <div>
                <label className="label">Assignees ({form.assignees.length} selected)</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                  {members.length === 0 && (
                    <p className="text-xs text-gray-400 p-2">No members</p>
                  )}
                  {members.map((m, i) => {
                    const uid      = m.user?._id;
                    const selected = form.assignees.includes(uid);
                    return (
                      <button
                        key={uid} type="button"
                        onClick={() => toggleAssignee(uid)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition
                          ${selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
                          ${i !== 0 ? 'border-t border-gray-100' : ''}
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {m.user?.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="flex-1 truncate">{m.user?.name}</span>
                        {selected && <span className="text-blue-500 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {form.assignees.length > 0 && (
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, assignees: [] }))}
                    className="text-xs text-gray-400 hover:text-red-400 mt-1">
                    Clear all
                  </button>
                )}
              </div>

              <div>
                <label className="label">Deadline</label>
                <input type="date" className="input"
                  value={form.deadline ? form.deadline.split('T')[0] : ''}
                  onChange={e => setForm({ ...form, deadline: e.target.value || null })} />
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input className="input" placeholder="bug, frontend…"
                  value={form.tags?.join(', ') || ''}
                  onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
