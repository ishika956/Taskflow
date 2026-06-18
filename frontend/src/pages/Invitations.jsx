import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Invitations() {
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    api.get('/invitations/my')
      .then(res => setInvitations(res.data));
  }, []);

  const accept = async (token) => {
    await api.post(`/invitations/accept/${token}`);

    setInvitations(prev =>
      prev.filter(i => i.token !== token)
    );
  };

  const decline = async (token) => {
    await api.post(`/invitations/decline/${token}`);

    setInvitations(prev =>
      prev.filter(i => i.token !== token)
    );
  };

  return (
    <div>
      <h2>Pending Invitations</h2>

      {invitations.map(inv => (
        <div key={inv._id}>
          <h3>{inv.workspace.name}</h3>

          <p>
            Invited by {inv.invitedBy.name}
          </p>

          <p>
            Role: {inv.role}
          </p>

          <button
            onClick={() => accept(inv.token)}
          >
            Accept
          </button>

          <button
            onClick={() => decline(inv.token)}
          >
            Decline
          </button>
        </div>
      ))}
    </div>
  );
}