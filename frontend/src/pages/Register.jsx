import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
  const { register }   = useAuth();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken    = searchParams.get('invite');
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      if (inviteToken) {
        try { await api.post(`/invitations/accept/${inviteToken}`); } catch {}
        navigate(`/invite/accept?token=${inviteToken}`);
      } else { navigate('/dashboard'); }
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
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
            Set up your team workspace in minutes.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Create a workspace, invite your team, assign roles, and start shipping work — all from one professional dashboard.
          </p>
          <div className="mt-10 space-y-3">
            {[
              { step: '01', text: 'Create a workspace for your team' },
              { step: '02', text: 'Invite members with specific roles' },
              { step: '03', text: 'Manage projects with Kanban boards' },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#0073bb] w-6 shrink-0">{s.step}</span>
                <span className="text-gray-300 text-sm">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-xs">© 2025 TaskFlow. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold mb-1">Create your account</h1>
            <p className="text-gray-400 text-sm">
              {inviteToken ? 'Create an account to accept your invitation.' : 'Free to get started. No credit card required.'}
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
            {[
              { label: 'Full name', key: 'name', type: 'text', placeholder: 'Jane Doe', min: 2 },
              { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@company.com' },
              { label: 'Password', key: 'password', type: 'password', placeholder: 'At least 6 characters', min: 6 },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                <input type={f.type} required minLength={f.min}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0073bb] focus:border-transparent transition"
                  placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full bg-[#0073bb] hover:bg-[#005f99] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            Already have an account?{' '}
            <Link to={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
              className="text-[#0073bb] hover:text-[#4db3ff] font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
