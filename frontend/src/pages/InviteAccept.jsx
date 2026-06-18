import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLE_DESC = {
  Admin:   'Manage projects, tasks, and invite members',
  Manager: 'Manage projects and tasks, approve member requests',
  Member:  'View board, request tasks, mark assigned tasks as done',
};

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const token          = searchParams.get('token');

  const [invite,   setInvite]   = useState(null);  // invite details
  const [status,   setStatus]   = useState('loading'); // loading|ready|accepted|declined|error
  const [message,  setMessage]  = useState('');

  // Verify token on mount
  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No invitation token found.'); return; }
    api.get(`/invitations/verify/${token}`)
      .then(({ data }) => { setInvite(data); setStatus('ready'); })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired invitation.');
      });
  }, [token]);

  const handleAccept = async () => {
    // If not logged in, redirect to login/register with token preserved
    if (!user) {
      // Store token in sessionStorage so register/login can pick it up
      sessionStorage.setItem('pendingInviteToken', token);
      // If user already has an account, go to login; else register
      navigate(invite.userExists ? `/login?invite=${token}` : `/register?invite=${token}`);
      return;
    }

    // Wrong account logged in
    if (user.email !== invite.email) {
      setStatus('error');
      setMessage(`This invitation was sent to ${invite.email}. You're logged in as ${user.email}. Please log out and log in with the correct account.`);
      return;
    }

    try {
      const { data } = await api.post(`/invitations/accept/${token}`);
      setStatus('accepted');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Failed to accept invitation.');
    }
  };

  const handleDecline = async () => {
    try {
      await api.post(`/invitations/decline/${token}`);
      setStatus('declined');
      setMessage('You have declined the invitation.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Failed to decline.');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"/>
        <p className="text-gray-500">Verifying your invitation…</p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link to="/dashboard" className="btn-primary px-6 py-2 inline-block">Go to Dashboard</Link>
      </div>
    </div>
  );

  // ── Accepted ───────────────────────────────────────────────────────────────
  if (status === 'accepted') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You're in!</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link to="/dashboard" className="btn-primary px-6 py-2 inline-block">Go to Dashboard</Link>
      </div>
    </div>
  );

  // ── Declined ───────────────────────────────────────────────────────────────
  if (status === 'declined') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Declined</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">Back to home</Link>
      </div>
    </div>
  );

  // ── Ready — show invite details ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📨</div>
          <h1 className="text-2xl font-bold text-blue-600">⚡ TaskFlow</h1>
          <p className="text-gray-500 text-sm mt-1">You've been invited!</p>
        </div>

        {/* Invite card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <p className="text-sm text-gray-600 mb-1">
            <strong>{invite.invitedBy}</strong> invited you to join:
          </p>
          <h2 className="text-xl font-bold text-gray-900">{invite.workspace?.name}</h2>
          {invite.workspace?.description && (
            <p className="text-sm text-gray-500 mt-1">{invite.workspace.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              invite.role === 'Admin'   ? 'bg-red-100 text-red-700' :
              invite.role === 'Manager' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-green-100 text-green-700'
            }`}>
              {invite.role}
            </span>
            <span className="text-xs text-gray-500">{ROLE_DESC[invite.role]}</span>
          </div>
        </div>

        {/* Account status notice */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
            {invite.userExists
              ? '🔐 You need to log in to accept this invitation.'
              : '👤 You don\'t have a TaskFlow account yet. You\'ll be prompted to create one.'}
          </div>
        )}

        {/* Wrong account warning */}
        {user && user.email !== invite.email && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">
            ⚠️ You're logged in as <strong>{user.email}</strong> but this invite was sent to <strong>{invite.email}</strong>. Please log out and use the correct account.
          </div>
        )}

        {/* Expiry */}
        <p className="text-xs text-gray-400 text-center mb-5">
          Expires: {new Date(invite.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
          >
            ✅ Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            ❌ Decline
          </button>
        </div>
      </div>
    </div>
  );
}
