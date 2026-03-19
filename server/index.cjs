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
const LOG_RETENTION_DAYS = 30;

/**
 * Extracts non-empty log lines from raw file content.
 *
 * @param {string} content
 * @returns {string[]}
 */
const getRawLogLines = (content) => {
  return String(content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
};

/**
 * Parses a single log line into a validated entry.
 * Returns null when the line does not match the expected format.
 *
 * @param {string} line
 * @returns {{timestampIso: string, timestampMs: number, role: string, name: string, company: string, rawLine: string} | null}
 */
const parseSingleLogLine = (line) => {
  const parts = line.split(' | ');
  const timestampIso = parts[0] ?? '';
  const role = parts[1] ?? '';
  const name = parts[2] ?? '';
  const company = parts[3] ?? '';
  const timestampMs = Date.parse(timestampIso);

  if (!timestampIso || !role || !name || Number.isNaN(timestampMs)) return null;
  return { timestampIso, timestampMs, role, name, company, rawLine: line };
};

/**
 * Parses all valid log lines.
 *
 * @param {string} content
 * @returns {Array}
 */
const parseLogLines = (content) => {
  return getRawLogLines(content).map(parseSingleLogLine).filter((e) => Boolean(e));
};

const getRetentionCutoffMs = () => {
  return Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
};

const readLogFileContent = () => {
  if (!fs.existsSync(LOG_FILE_PATH)) return null;
  return fs.readFileSync(LOG_FILE_PATH, 'utf8');
};

const filterEntriesByRetention = (entries, cutoffMs) => {
  return entries.filter((e) => e.timestampMs >= cutoffMs);
};

const writeLogFileContentIfChanged = (original, entries) => {
  const keptRawLines = entries.map((e) => e.rawLine);
  const newContent = keptRawLines.length ? `${keptRawLines.join('\n')}\n` : '';
  if (newContent === original) return;
  fs.writeFileSync(LOG_FILE_PATH, newContent, 'utf8');
};

/**
 * Removes login log entries older than the retention window.
 * Failures do not block the login flow.
 */
const cleanupOldLoginLogs = () => {
  try {
    const content = readLogFileContent();
    if (!content) return;

    const entries = parseLogLines(content);
    const cutoffMs = getRetentionCutoffMs();
    const keptEntries = filterEntriesByRetention(entries, cutoffMs);
    writeLogFileContentIfChanged(content, keptEntries);
  } catch (err) {
    // Nicht hart fehlschlagen: Login-Funktion soll weiterhin funktionieren.
    // eslint-disable-next-line no-console
    console.error('Failed to cleanup old login logs', err);
  }
};

/**
 * Filters admin entries and sorts them newest-first.
 *
 * @param {Array<{ timestampMs: number, role: string }>} entries
 * @returns {Array}
 */
const getSortedAdminEntries = (entries) => {
  return entries.filter((e) => e.role === 'ROLE_ADMIN').sort((a, b) => b.timestampMs - a.timestampMs);
};

/**
 * Picks current and previous admin entries.
 *
 * @param {Array} adminEntries
 * @returns {{ currentAdmin: any | null, previousAdmin: any | null }}
 */
const pickAdminBounds = (adminEntries) => {
  return { currentAdmin: adminEntries[0] ?? null, previousAdmin: adminEntries[1] ?? null };
};

/**
 * Filters CV-access entries for the valid time window.
 *
 * @param {Array} entries
 * @param {{ currentAdmin: any | null, previousAdmin: any | null }} bounds
 * @returns {Array}
 */
const filterCvAccessForBounds = (entries, bounds) => {
  const { currentAdmin, previousAdmin } = bounds;
  if (!previousAdmin) return entries.filter((e) => e.role === 'ROLE_CV_ACCESS');

  return entries.filter(
    (e) =>
      e.role === 'ROLE_CV_ACCESS' &&
      e.timestampMs > previousAdmin.timestampMs &&
      (!currentAdmin || e.timestampMs <= currentAdmin.timestampMs)
  );
};

/**
 * Counts unique CV-access user names.
 *
 * @param {Array<{ name: string }>} entries
 * @returns {number}
 */
const countUniqueCvAccessNames = (entries) => {
  return new Set(entries.map((e) => e.name)).size;
};

/**
 * Computes admin statistics from parsed log entries.
 * The unique CV-access user count is relative to previous admin login.
 *
 * @param {Array<{ timestampMs: number, role: string, name: string, timestampIso: string }>} entries
 * @returns {{ lastAdminLogin: string | null, cvAccessUniqueUsersSinceLastAdmin: number }}
 */
const computeAdminStats = (entries) => {
  const adminEntries = getSortedAdminEntries(entries);
  const bounds = pickAdminBounds(adminEntries);
  const relevantCvAccess = filterCvAccessForBounds(entries, bounds);

  return {
    lastAdminLogin: bounds.previousAdmin ? bounds.previousAdmin.timestampIso : null,
    cvAccessUniqueUsersSinceLastAdmin: countUniqueCvAccessNames(relevantCvAccess)
  };
};

/** @typedef {'ROLE_ADMIN' | 'ROLE_CV_ACCESS'} CvSectionRole */

const ADMIN_PASSWORD_HASH =
  '$2b$10$Rcjeyk/EiyCC9iC7olc.U.iRGeexM8NCjWC31jETWk/vv/G5pVJlu';
const CV_ACCESS_PASSWORD_HASH =
  '$2b$10$vK6sPZiBN76H3Mppd8FqZuNf3DqlE3FTnSn/KUledHkYWVcx55oZO';

/**
 * @param {string} name
 * @param {CvSectionRole} role
 */
const appendLoginLog = (name, company, role) => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${role} | ${name} | ${company}\n`;

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

/**
 * Firmenvalidierung:
 * - mindestens 3 Buchstaben (Leerzeichen sind erlaubt)
 * - keine Zahlen
 * - nur Buchstaben (inkl. Umlaute) + Leerzeichen
 *
 * @param {string} company
 * @returns {boolean}
 */
const isValidCompany = (company) => {
  const trimmed = String(company ?? '').trim();
  const cleanedLetters = trimmed.replace(/\s+/g, '');
  return /^[A-Za-zÄÖÜäöüß]+$/.test(cleanedLetters) && cleanedLetters.length >= 3;
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
      company: decoded.company,
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

/**
 * Returns the role based on the provided password.
 *
 * @param {string} password
 * @returns {Promise<CvSectionRole | null>}
 */
const getRoleFromPassword = async (password) => {
  const normalizedPassword = String(password).trim();
  const isAdminPassword = await bcrypt.compare(normalizedPassword, ADMIN_PASSWORD_HASH);
  if (isAdminPassword) return 'ROLE_ADMIN';

  const isCvPassword = await bcrypt.compare(normalizedPassword, CV_ACCESS_PASSWORD_HASH);
  if (isCvPassword) return 'ROLE_CV_ACCESS';
  return null;
};

/**
 * Normalizes company by role. Admin can keep it empty.
 *
 * @param {CvSectionRole} role
 * @param {unknown} company
 * @returns {string}
 */
const normalizeCompanyForRole = (role, company) => {
  if (role === 'ROLE_ADMIN') return '';
  return String(company ?? '').trim();
};

/**
 * Validates company by role. Admin does not require a company.
 *
 * @param {CvSectionRole} role
 * @param {string} company
 * @returns {boolean}
 */
const validateCompanyForRole = (role, company) => {
  if (role === 'ROLE_ADMIN') return true;
  return isValidCompany(company);
};

/**
 * Sends an error response in the format expected by the frontend.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} errorKey
 */
const sendLoginError = (res, statusCode, errorKey) => {
  res.status(statusCode).json({ error: errorKey });
};

// Login-Endpoint für cv-section
app.post('/api/cv-section/login', async (req, res) => {
  const { password, name, company } = req.body || {};

  if (!password || !name) return sendLoginError(res, 400, 'MISSING_CREDENTIALS');

  const role = await getRoleFromPassword(password);
  if (!role) return sendLoginError(res, 401, 'INVALID_PASSWORD');
  if (!isValidName(name, role)) return sendLoginError(res, 400, 'INVALID_NAME');

  const normalizedCompany = normalizeCompanyForRole(role, company);
  if (!validateCompanyForRole(role, normalizedCompany)) {
    return sendLoginError(res, 400, 'INVALID_COMPANY');
  }

  const payload = { name, role, company: normalizedCompany };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });

  res.cookie('cv_section_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: JWT_EXPIRES_IN_SECONDS * 1000
  });

  appendLoginLog(name, normalizedCompany, role);

  res.json({
    name,
    company: normalizedCompany,
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
  cleanupOldLoginLogs();
  fs.readFile(LOG_FILE_PATH, 'utf8', (err, content) => {
    if (err) {
      res.status(500).json({ error: 'LOG_READ_FAILED' });
      return;
    }

    res.type('text/plain').send(content);
  });
});

// Admin-Only: Logs manuell löschen
app.post('/api/cv-section/admin/logs/clear', authenticateJwt, authorizeRole('ROLE_ADMIN'), (req, res) => {
  try {
    fs.writeFileSync(LOG_FILE_PATH, '');
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: 'LOG_CLEAR_FAILED' });
  }
});

app.get('/api/cv-section/admin/stats', authenticateJwt, authorizeRole('ROLE_ADMIN'), (req, res) => {
  cleanupOldLoginLogs();
  fs.readFile(LOG_FILE_PATH, 'utf8', (err, content) => {
    if (err) {
      res.status(500).json({ error: 'LOG_READ_FAILED' });
      return;
    }

    const entries = parseLogLines(content);
    res.json(computeAdminStats(entries));
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

