import { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Mail } from "lucide-react";
import api from "../utils/api";

export default function Invitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/invitations/my")
      .then((res) => setInvitations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const accept = async (token) => {
    await api.post(`/invitations/accept/${token}`);

    setInvitations((prev) =>
      prev.filter((i) => i.token !== token)
    );
  };

  const decline = async (token) => {
    await api.post(`/invitations/decline/${token}`);

    setInvitations((prev) =>
      prev.filter((i) => i.token !== token)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-gray-400 text-lg">
          Loading invitations...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Workspace Invitations
        </h1>
        <p className="text-gray-400 mt-2">
          Accept or decline invitations to collaborate.
        </p>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-[#161e2d] border border-white/10 rounded-2xl p-10 text-center">
          <Mail className="mx-auto mb-4 text-gray-500" size={50} />
          <h2 className="text-xl font-semibold text-white">
            No Invitations
          </h2>
          <p className="text-gray-400 mt-2">
            You're all caught up 🎉
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {invitations.map((inv) => (
            <div
              key={inv._id}
              className="bg-[#161e2d] border border-white/10 rounded-2xl p-6 hover:border-[#0073bb] transition"
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {inv.workspace?.name}
                  </h2>

                  <div className="flex items-center gap-2 text-gray-400 mt-2">
                    <Users size={16} />
                    <span>{inv.role}</span>
                  </div>

                  <div className="text-sm text-gray-500 mt-2">
                    Invited on{" "}
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => accept(inv.token)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white font-medium transition"
                  >
                    <CheckCircle size={18} />
                    Accept
                  </button>

                  <button
                    onClick={() => decline(inv.token)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-medium transition"
                  >
                    <XCircle size={18} />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}