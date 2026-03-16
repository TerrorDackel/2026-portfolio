const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

const JWT_SECRET = process.env.CV_SECTION_JWT_SECRET || 'change_this_secret_in_env';
const JWT_EXPIRES_IN_SECONDS = 60 * 5; // 5 Minuten

const LOG_FILE_PATH = path.join(__dirname, 'logs', 'cv-logins.log');

/** @typedef {'ROLE_ADMIN' | 'ROLE_CV_ACCESS'} CvSectionRole */

/**
 * @param {string} name
 * @param {CvSectionRole} role
 */
const appendLoginLog = (name, role) => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${role} | ${name}\n`;

  fs.appendFile(LOG_FILE_PATH, line, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write login log entry', err);
    }
  });
};

/**
 * Namensvalidierung:
 * - Für Admin: exakt "Admin"
 * - Für alle anderen: mind. 2 Wörter, nur Buchstaben, jedes Wort mind. 3 Zeichen.
 *
 * @param {string} name
 * @param {CvSectionRole} role
 * @returns {boolean}
 */
const isValidName = (name, role) => {
  const trimmed = name.trim();

  if (role === 'ROLE_ADMIN') {
    return trimmed === 'Admin';
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return false;
  }

  return parts.every((part) => /^[A-Za-zÄÖÜäöüß]{3,}$/.test(part));
};

app.use(
  cors({
    origin: ['http://localhost:4200'],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

/**
 * Liest JWT aus dem HTTP-only Cookie und prüft es.
 */
const authenticateJwt = (req, res, next) => {
  const token = req.cookies?.cv_section_token;

  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      name: decoded.name,
      role: decoded.role
    };
    next();
  } catch (err) {
    res.sendStatus(401);
  }
};

/**
 * Erzeugt eine Middleware, die eine bestimmte Rolle verlangt.
 * @param {CvSectionRole} role
 */
const authorizeRole = (role) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== role) {
      res.sendStatus(403);
      return;
    }
    next();
  };
};

// Login-Endpoint für cv-section
app.post('/api/cv-section/login', async (req, res) => {
  const { password, name } = req.body || {};

  if (!password || !name) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS' });
    return;
  }

  /** @type {CvSectionRole | null} */
  let role = null;

  const ADMIN_PASSWORD_HASH =
    '$2b$10$Rcjeyk/EiyCC9iC7olc.U.iRGeexM8NCjWC31jETWk/vv/G5pVJlu';
  const CV_ACCESS_PASSWORD_HASH =
    '$2b$10$vK6sPZiBN76H3Mppd8FqZuNf3DqlE3FTnSn/KUledHkYWVcx55oZO';

  const normalizedPassword = String(password).trim();

  const isAdminPassword = await bcrypt.compare(normalizedPassword, ADMIN_PASSWORD_HASH);
  if (isAdminPassword) {
    role = 'ROLE_ADMIN';
  } else {
    const isCvPassword = await bcrypt.compare(normalizedPassword, CV_ACCESS_PASSWORD_HASH);
    if (isCvPassword) {
      role = 'ROLE_CV_ACCESS';
    }
  }

  if (!role) {
    res.status(401).json({ error: 'INVALID_PASSWORD' });
    return;
  }

  if (!isValidName(name, role)) {
    res.status(400).json({ error: 'INVALID_NAME' });
    return;
  }

  const payload = { name, role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });

  res.cookie('cv_section_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: JWT_EXPIRES_IN_SECONDS * 1000
  });

  appendLoginLog(name, role);

  res.json({
    name,
    role,
    expiresInSeconds: JWT_EXPIRES_IN_SECONDS
  });
});

// Me-Endpoint, um Login-Status abzufragen
app.get('/api/cv-section/me', authenticateJwt, (req, res) => {
  if (!req.user) {
    res.sendStatus(401);
    return;
  }

  res.json(req.user);
});

// Beispiel-Admin-Only-Endpoint (für spätere Logs)
app.get('/api/cv-section/admin/logs', authenticateJwt, authorizeRole('ROLE_ADMIN'), (req, res) => {
  fs.readFile(LOG_FILE_PATH, 'utf8', (err, content) => {
    if (err) {
      res.status(500).json({ error: 'LOG_READ_FAILED' });
      return;
    }

    res.type('text/plain').send(content);
  });
});

// Logout-Endpunkt
app.post('/api/cv-section/logout', (req, res) => {
  res.clearCookie('cv_section_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  res.sendStatus(204);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CV-Section backend listening on port ${PORT}`);
});

