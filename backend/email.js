const { Resend } = require('resend');

console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "FOUND" : "MISSING"
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Task assigned email ────────────────────────────────────────────────────────
const sendTaskAssignedEmail = async ({
  toEmail,
  toName,
  taskTitle,
  projectName,
  assignedBy,
  deadline
}) => {
  try {
    console.log("=== TASK EMAIL CALLED ===");
    console.log("Recipient:", toEmail);

    const deadlineText = deadline
      ? `<p><strong>Deadline:</strong> ${new Date(deadline).toDateString()}</p>`
      : '';

    const result = await resend.emails.send({
      from: 'TaskFlow <onboarding@resend.dev>',
      to: toEmail,
      subject: `📋 You've been assigned: ${taskTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <div style="background:#0073bb;padding:20px">
            <h1 style="color:#fff;margin:0;font-size:22px">⚡ TaskFlow</h1>
          </div>
          <div style="padding:24px">
            <p>Hi <strong>${toName}</strong>,</p>
            <p><strong>${assignedBy}</strong> assigned you a new task:</p>

            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
              <h2 style="margin:0 0 8px;font-size:16px">${taskTitle}</h2>
              <p style="margin:0;color:#6b7280;font-size:13px">
                Project: ${projectName}
              </p>
              ${deadlineText}
            </div>

            <p style="color:#6b7280;font-size:13px">
              Log in to TaskFlow to view and update this task.
            </p>
          </div>
        </div>
      `
    });

    console.log("TASK EMAIL RESULT:", JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error("TASK EMAIL ERROR:", err);
    throw err;
  }
};

// ── Workspace invitation email ────────────────────────────────────────────────
const sendInvitationEmail = async ({
  toEmail,
  workspaceName,
  invitedByName,
  role,
  token
}) => {
  try {
    console.log("=== INVITATION EMAIL CALLED ===");
    console.log("Recipient:", toEmail);

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const acceptUrl = `${baseUrl}/invite/accept?token=${token}`;
    const declineUrl = `${baseUrl}/invite/decline?token=${token}`;

    const roleDescriptions = {
      Admin: 'manage projects, tasks, and invite members',
      Manager: 'manage projects and tasks, approve member requests',
      Member: 'view the board, request tasks, and mark tasks as done',
    };

    console.log("Calling Resend...");

    const result = await resend.emails.send({
      from: 'TaskFlow <onboarding@resend.dev>',
      to: toEmail,
      subject: `📨 You're invited to join "${workspaceName}" on TaskFlow`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <div style="background:#0073bb;padding:20px">
            <h1 style="color:#fff;margin:0;font-size:22px">⚡ TaskFlow</h1>
          </div>

          <div style="padding:28px">
            <h2 style="margin:0 0 8px;font-size:20px;color:#111827">
              You've been invited!
            </h2>

            <p style="color:#374151">
              <strong>${invitedByName}</strong> has invited you to join:
            </p>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
              <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1d4ed8">
                ${workspaceName}
              </p>

              <p style="margin:0;font-size:14px;color:#3b82f6">
                Role: <strong>${role}</strong>
              </p>

              <p style="margin:6px 0 0;font-size:12px;color:#6b7280">
                As a ${role} you can: ${roleDescriptions[role]}
              </p>
            </div>

            <div style="text-align:center;margin:24px 0">
              <a href="${acceptUrl}"
                style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;margin-right:12px">
                ✅ Accept
              </a>

              <a href="${declineUrl}"
                style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;border:1px solid #d1d5db">
                ❌ Decline
              </a>
            </div>

            <p style="color:#9ca3af;font-size:12px;text-align:center">
              Expires in <strong>7 days</strong>.<br>
              No account yet? You'll be prompted to register when you click Accept.
            </p>
          </div>
        </div>
      `
    });

    console.log(
      "INVITATION EMAIL RESULT:",
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (err) {
    console.error("INVITATION EMAIL ERROR:", err);
    throw err;
  }
};

module.exports = {
  sendTaskAssignedEmail,
  sendInvitationEmail
};