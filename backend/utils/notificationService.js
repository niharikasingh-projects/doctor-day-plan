// Central patient/doctor notification service (email + SMS).
//
// Delivery strategy:
//   - Email: SMTP via Nodemailer when SMTP_HOST (+ SMTP_USER/SMTP_PASS) are set
//     in backend/.env. Works with Gmail app passwords, Mailtrap, SendGrid SMTP, etc.
//   - SMS: Twilio REST API when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
//     TWILIO_FROM_NUMBER are set in backend/.env.
//   - DEMO MODE (default): when those variables are absent (e.g. localhost
//     demos), nothing is sent over the wire. Instead the full message content is
//     logged to the server console and appended to backend/logs/notifications.log
//     so the demo can prove exactly what would have been delivered.
//
// Fallback recipients (local/demo only):
//   In non-production environments, notifications addressed to demo/test-style
//   recipients (e.g. *@doctordayplan.test) are redirected to
//   NOTIFICATION_FALLBACK_EMAIL / NOTIFICATION_FALLBACK_PHONE from backend/.env,
//   so you can watch real messages arrive at your own inbox/phone while using
//   the seeded test accounts. Set DEMO_REDIRECT_ALL_NOTIFICATIONS=true to
//   redirect every recipient. In production (NODE_ENV=production) this routing
//   is disabled and notifications always go to the actual recipients.
//
// Feature flag:
//   NOTIFICATIONS_ENABLED=false in backend/.env disables ALL notification
//   delivery (email, SMS, and demo-mode recording). Anything else (including
//   unset) means enabled.
//
// Every public function is fail-safe: notification errors are logged but NEVER
// break the underlying booking/cancellation flow.
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const notificationsEnabled = String(process.env.NOTIFICATIONS_ENABLED || 'true') !== 'false';

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'notifications.log');

const smtpConfigured = Boolean(process.env.SMTP_HOST);
const twilioConfigured = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
);

let transporter = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true', // true for port 465
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@doctordayplan.local';

// ---------------------------------------------------------------------------
// Fallback routing (local/demo only — disabled when NODE_ENV === 'production')
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const FALLBACK_EMAIL = process.env.NOTIFICATION_FALLBACK_EMAIL || '';
const FALLBACK_PHONE = process.env.NOTIFICATION_FALLBACK_PHONE || '';
const REDIRECT_ALL = String(process.env.DEMO_REDIRECT_ALL_NOTIFICATIONS) === 'true';

// Recipients that obviously belong to demo/test data (seeded accounts,
// mock patients, and *.test / *.example / *.localhost domains).
const isTestRecipient = (address) =>
  typeof address === 'string' && /@(doctordayplan\.test|.*\.(test|example|localhost))$/i.test(address.trim());

// Returns { email, phone } after applying fallback routing, plus per-channel
// redirect notes so the outbox records the original intended recipient.
// Phones carry no domain, so a phone is treated as a test recipient when the
// recipient's email is a test address (same account) or REDIRECT_ALL is on.
const resolveRecipients = ({ email, phone }) => {
  if (isProduction || (!FALLBACK_EMAIL && !FALLBACK_PHONE)) {
    return { email, phone, emailNote: undefined, phoneNote: undefined };
  }

  const accountIsTest = REDIRECT_ALL || isTestRecipient(email) || isTestRecipient(phone);
  const emailRedirected = Boolean(email && FALLBACK_EMAIL && accountIsTest);
  const phoneRedirected = Boolean(phone && FALLBACK_PHONE && accountIsTest);

  return {
    email: emailRedirected ? FALLBACK_EMAIL : email,
    phone: phoneRedirected ? FALLBACK_PHONE : phone,
    emailNote: emailRedirected ? `redirected from ${email}` : undefined,
    phoneNote: phoneRedirected ? `redirected from ${phone}` : undefined,
  };
};

// Records a demo-mode message: console + append-only outbox file.
const recordDemoMessage = (channel, to, subject, body, note) => {
  const entry = [
    '------------------------------------------------------------',
    `[${new Date().toISOString()}] DEMO ${channel.toUpperCase()}`,
    `To: ${to}`,
    note ? `(${note})` : null,
    subject ? `Subject: ${subject}` : null,
    body,
    '',
  ]
    .filter(Boolean)
    .join('\n');

  console.log(`\n📨 DEMO ${channel.toUpperCase()} (no provider configured — not actually sent)\n${entry}`);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${entry}\n`, 'utf8');
  } catch (writeError) {
    console.error('Notification outbox write failed:', writeError.message);
  }
};

const sendEmail = async ({ to, subject, text, note }) => {
  if (!to) return;
  try {
    if (!transporter) {
      recordDemoMessage('email', to, subject, text, note);
      return;
    }
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, text });
    console.log(`📧 Email sent to ${to}${note ? ` (${note})` : ''}: ${subject}`);
  } catch (error) {
    console.error(`Email delivery failed for ${to}:`, error.message);
  }
};

const sendSms = async ({ to, body, note }) => {
  if (!to) return;
  try {
    if (!twilioConfigured) {
      recordDemoMessage('sms', to, null, body, note);
      return;
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: process.env.TWILIO_FROM_NUMBER,
          Body: body,
        }),
      }
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Twilio responded ${response.status}: ${detail}`);
    }
    console.log(`📱 SMS sent to ${to}`);
  } catch (error) {
    console.error(`SMS delivery failed for ${to}:`, error.message);
  }
};

// Sends both channels for a recipient. Recipients without an email/phone simply
// skip that channel. Fallback routing (non-production only) redirects
// demo/test recipients to NOTIFICATION_FALLBACK_EMAIL / _PHONE.
const notify = async ({ email, phone, subject, text, sms }) => {
  if (!notificationsEnabled) {
    return;
  }
  const resolved = resolveRecipients({ email, phone });

  const tasks = [];
  if (resolved.email) tasks.push(sendEmail({ to: resolved.email, subject, text, note: resolved.emailNote }));
  if (resolved.phone)
    tasks.push(
      sendSms({ to: resolved.phone, body: sms || `${subject ? `${subject} — ` : ''}${text}`, note: resolved.phoneNote })
    );
  await Promise.all(tasks);
};

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

const describeAppointment = (appointment, { clinic, doctor }) => {
  const dateLabel = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const clinicName = clinic?.name || 'your clinic';
  const clinicAddress = clinic?.address ? ` (${clinic.address})` : '';
  const doctorName = doctor?.doctorProfile?.name ? `Dr. ${doctor.doctorProfile.name}` : 'your doctor';
  return { dateLabel, clinicName, clinicAddress, doctorName };
};

const notifyPatientBooked = async ({ patient, appointment, clinic, doctor }) => {
  const { dateLabel, clinicName, clinicAddress, doctorName } = describeAppointment(appointment, {
    clinic,
    doctor,
  });
  const patientName = patient?.patientProfile?.name || 'Patient';
  await notify({
    email: patient?.email,
    phone: patient?.phone,
    subject: 'Appointment booked — DoctorDayPlan',
    text:
      `Hi ${patientName},\n\n` +
      `Your appointment with ${doctorName} at ${clinicName}${clinicAddress} on ${dateLabel} at ${appointment.slotTime} ` +
      `has been booked and is awaiting the doctor's confirmation.\n\n` +
      `You will receive another update once it is confirmed.\n\n— DoctorDayPlan`,
    sms:
      `DoctorDayPlan: Appointment with ${doctorName} at ${clinicName} on ${dateLabel} ${appointment.slotTime} booked, ` +
      `pending confirmation.`,
  });
};

const notifyPatientStatusChanged = async ({ patient, appointment, clinic, doctor, status, reason }) => {
  const { dateLabel, clinicName, clinicAddress, doctorName } = describeAppointment(appointment, {
    clinic,
    doctor,
  });
  const patientName = patient?.patientProfile?.name || 'Patient';

  const statusText = {
    confirmed: `has been CONFIRMED`,
    rejected: `was declined by the clinic`,
    cancelled: `has been CANCELLED`,
  }[status] || `changed status to ${status}`;

  const reasonLine = reason ? `\nReason: ${reason}` : '';
  const guidance =
    status === 'confirmed'
      ? '\nPlease check in from your DoctorDayPlan dashboard when you arrive.'
      : '\nYou can book another slot anytime from your DoctorDayPlan dashboard.';

  await notify({
    email: patient?.email,
    phone: patient?.phone,
    subject: `Appointment ${status} — DoctorDayPlan`,
    text:
      `Hi ${patientName},\n\n` +
      `Your appointment with ${doctorName} at ${clinicName}${clinicAddress} on ${dateLabel} at ${appointment.slotTime} ` +
      `${statusText}.${reasonLine}${guidance}\n\n— DoctorDayPlan`,
    sms: `DoctorDayPlan: Appointment ${status} — ${doctorName}, ${clinicName}, ${dateLabel} ${appointment.slotTime}.${reason ? ` Reason: ${reason}` : ''}`,
  });
};

const notifyDoctorPatientCancelled = async ({ doctor, appointment, clinic, patient, reason }) => {
  const { dateLabel, clinicName } = describeAppointment(appointment, { clinic, doctor });
  const patientName = patient?.patientProfile?.name || patient?.email || 'A patient';
  const doctorName = doctor?.doctorProfile?.name ? `Dr. ${doctor.doctorProfile.name}` : 'Doctor';
  await notify({
    email: doctor?.email,
    phone: doctor?.phone,
    subject: 'Patient cancelled an appointment — DoctorDayPlan',
    text:
      `Hi ${doctorName},\n\n` +
      `${patientName} cancelled their appointment at ${clinicName} on ${dateLabel} at ${appointment.slotTime}.\n` +
      (reason ? `Reason: ${reason}\n` : '') +
      `The slot is now free for other patients.\n\n— DoctorDayPlan`,
    sms: `DoctorDayPlan: ${patientName} cancelled ${dateLabel} ${appointment.slotTime} at ${clinicName}.${reason ? ` Reason: ${reason}` : ''}`,
  });
};

// SOS: notify every patient with an active appointment today.
const notifyPatientsEmergency = async ({ patients, reason }) => {
  const jobs = patients.map((patient) =>
    notify({
      email: patient?.email,
      phone: patient?.phone,
      subject: 'Urgent: your appointment today is cancelled — DoctorDayPlan',
      text:
        `Hi ${patient?.patientProfile?.name || 'Patient'},\n\n` +
        `We are sorry — your doctor is unavailable today and your appointment has been cancelled.\n\n` +
        `Message from the clinic: ${reason}\n\n` +
        `Please book a new slot from your DoctorDayPlan dashboard.\n\n— DoctorDayPlan`,
      sms: `DoctorDayPlan URGENT: Your appointment today is cancelled (doctor unavailable). ${reason}. Please rebook in the app.`,
    })
  );
  await Promise.all(jobs);
};

// Password-reset codes are emailed, never SMSed. Non-production forces delivery
// to NOTIFICATION_FALLBACK_EMAIL (set FALLBACK_EMAIL unconditionally) so the
// code never lands at a seeded test mailbox; production always uses the real
// account email.
const sendPasswordResetCode = async ({ email, token, expiresInMinutes }) => {
  if (!notificationsEnabled) {
    return;
  }
  const targetEmail = isProduction ? email : FALLBACK_EMAIL || email;
  await sendEmail({
    to: targetEmail,
    subject: 'Your password reset code — DoctorDayPlan',
    text:
      `Hi,\n\n` +
      `A password reset was requested for the DoctorDayPlan account ${email}.\n\n` +
      `Your reset code (valid for ${expiresInMinutes} minutes):\n\n${token}\n\n` +
      `If you did not request this, you can ignore this email — your password will not change.\n\n— DoctorDayPlan`,
    note: targetEmail !== email ? `redirected from ${email}` : undefined,
  });
};

module.exports = {
  notify,
  notifyPatientBooked,
  notifyPatientStatusChanged,
  notifyDoctorPatientCancelled,
  notifyPatientsEmergency,
  sendPasswordResetCode,
  notificationsEnabled,
};
