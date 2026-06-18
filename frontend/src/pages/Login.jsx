import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
  const { login }      = useAuth();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken    = searchParams.get('invite');
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      if (inviteToken) {
        try { await api.post(`/invitations/accept/${inviteToken}`); } catch {}
        navigate(`/invite/accept?token=${inviteToken}`);
      } else { navigate('/dashboard'); }
    } catch (err) { setError(err.response?.data?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f1923] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#161e2d] p-12 border-r border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0073bb] rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-bold">T</span>
          </div>
          <span className="text-white text-xl font-semibold tracking-tight">TaskFlow</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Manage your team's work — all in one place.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Workspaces, Kanban boards, real-time collaboration, and role-based access control built for modern teams.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {['Kanban Boards','Real-time Updates','Role Management','File Attachments'].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#0073bb]/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#0073bb]"/>
                </div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-xs">© 2025 TaskFlow. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold mb-1">Sign in to TaskFlow</h1>
            <p className="text-gray-400 text-sm">
              {inviteToken ? 'Sign in to accept your workspace invitation.' : 'Welcome back. Enter your credentials to continue.'}
            </p>
          </div>

          {inviteToken && (
            <div className="bg-[#0073bb]/10 border border-[#0073bb]/30 rounded-lg p-3 mb-5 text-sm text-[#4db3ff]">
              📨 You have a pending workspace invitation.
            </div>
          )}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg p-3 mb-5 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <input type="email" required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0073bb] focus:border-transparent transition"
                placeholder="you@company.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input type="password" required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0073bb] focus:border-transparent transition"
                placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#0073bb] hover:bg-[#005f99] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            Don't have an account?{' '}
            <Link to={inviteToken ? `/register?invite=${inviteToken}` : '/register'}
              className="text-[#0073bb] hover:text-[#4db3ff] font-medium transition">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
