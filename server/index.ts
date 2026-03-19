import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env['PORT'] || 4000;

// In einer echten produktiven Umgebung würdest du das Secret
// aus einer sicheren Umgebung (ENV-Variable) laden.
const JWT_SECRET = process.env['CV_SECTION_JWT_SECRET'] || 'change_this_secret_in_env';
const JWT_EXPIRES_IN_SECONDS = 60 * 5; // 5 Minuten

// Logfile-Pfad
const LOG_FILE_PATH = path.join(__dirname, 'logs', 'cv-logins.log');
const LOG_RETENTION_DAYS = 30;

type ParsedLogEntry = {
  timestampIso: string;
  timestampMs: number;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
  name: string;
  company: string;
  rawLine: string;
};

/** Checks if a parsed role is part of the supported CV roles. */
const isParsedRole = (role: string): role is ParsedLogEntry['role'] => {
  return role === 'ROLE_ADMIN' || role === 'ROLE_CV_ACCESS';
};

/**
 * Extracts non-empty log lines from raw file content.
 */
const getRawLogLines = (content: string): string[] => {
  return String(content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
};

/**
 * Parses a single log line into a validated ParsedLogEntry.
 * Returns null if the line does not match the expected format.
 */
const parseSingleLogLine = (line: string): ParsedLogEntry | null => {
  const parts = line.split(' | ');
  const timestampIso = parts[0] ?? '';
  const role = parts[1] ?? '';
  const name = parts[2] ?? '';
  const company = parts[3] ?? '';
  const timestampMs = Date.parse(timestampIso);

  if (!timestampIso || !name || Number.isNaN(timestampMs) || !isParsedRole(role)) return null;
  return { timestampIso, timestampMs, role, name, company, rawLine: line };
};

/**
 * Parses all log lines and returns only valid entries.
 */
const parseLogLines = (content: string): ParsedLogEntry[] => {
  const lines = getRawLogLines(content);
  return lines.map(parseSingleLogLine).filter((e): e is ParsedLogEntry => Boolean(e));
};

const getRetentionCutoffMs = (): number => {
  return Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
};

const readLogFileContent = (): string | null => {
  if (!fs.existsSync(LOG_FILE_PATH)) return null;
  return fs.readFileSync(LOG_FILE_PATH, 'utf8');
};

const filterEntriesByRetention = (entries: ParsedLogEntry[], cutoffMs: number): ParsedLogEntry[] => {
  return entries.filter((e) => e.timestampMs >= cutoffMs);
};

const writeLogFileContentIfChanged = (original: string, entries: ParsedLogEntry[]): void => {
  const keptRawLines = entries.map((e) => e.rawLine);
  const newContent = keptRawLines.length ? `${keptRawLines.join('\n')}\n` : '';
  if (newContent === original) return;
  fs.writeFileSync(LOG_FILE_PATH, newContent, 'utf8');
};

/**
 * Removes login log entries older than the retention window.
 * Failures should not block the login flow.
 */
const cleanupOldLoginLogs = (): void => {
  try {
    const content = readLogFileContent();
    if (!content) return;

    const entries = parseLogLines(content);
    const cutoffMs = getRetentionCutoffMs();
    const keptEntries = filterEntriesByRetention(entries, cutoffMs);
    writeLogFileContentIfChanged(content, keptEntries);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to cleanup old login logs', err);
  }
};

type AdminStats = {
  lastAdminLogin: string | null;
  cvAccessUniqueUsersSinceLastAdmin: number;
};

/**
 * Filters admin log entries and sorts them newest-first.
 */
const getSortedAdminEntries = (entries: ParsedLogEntry[]): ParsedLogEntry[] => {
  return entries.filter((e) => e.role === 'ROLE_ADMIN').sort((a, b) => b.timestampMs - a.timestampMs);
};

/**
 * Extracts the last and previous admin login entries.
 */
const pickAdminBounds = (adminEntries: ParsedLogEntry[]) => {
  return { currentAdmin: adminEntries[0] ?? null, previousAdmin: adminEntries[1] ?? null };
};

/**
 * Filters CV-access logs to the window between previous and current admin logins.
 * If there is no previous admin, it includes all CV-access logs.
 */
const filterCvAccessForBounds = (
  entries: ParsedLogEntry[],
  bounds: { currentAdmin: ParsedLogEntry | null; previousAdmin: ParsedLogEntry | null }
): ParsedLogEntry[] => {
  const { currentAdmin, previousAdmin } = bounds;

  if (!previousAdmin) return entries.filter((e) => e.role === 'ROLE_CV_ACCESS');

  return entries.filter(
    (e) =>
      e.role === 'ROLE_CV_ACCESS' &&
      e.timestampMs > previousAdmin.timestampMs &&
      (!currentAdmin || e.timestampMs <= currentAdmin.timestampMs)
  );
};

/** Counts unique CV-access user names. */
const countUniqueCvAccessNames = (entries: ParsedLogEntry[]): number => {
  return new Set(entries.map((e) => e.name)).size;
};

/**
 * Computes the admin statistics from parsed log entries.
 * The unique CV-access user count is relative to previous admin login.
 */
const computeAdminStats = (entries: ParsedLogEntry[]): AdminStats => {
  const adminEntries = getSortedAdminEntries(entries);
  const bounds = pickAdminBounds(adminEntries);
  const relevantCvAccess = filterCvAccessForBounds(entries, bounds);

  return {
    lastAdminLogin: bounds.previousAdmin ? bounds.previousAdmin.timestampIso : null,
    cvAccessUniqueUsersSinceLastAdmin: countUniqueCvAccessNames(relevantCvAccess)
  };
};

// Feste Rollen
type CvSectionRole = 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';

interface JwtPayload {
  name: string;
  company: string;
  role: CvSectionRole;
}

// Vorbereitung: Passwörter als gehashte Werte hinterlegen.
// Die Klartext-Passwörter kennst nur du:
// - Admin: Admin JenniferThomas_Portfolio.2026.pw.adminbereich.25.12
// - CV-Zugang: FrontendDeveloper.JenniferThomas.2026
//
// Diese Hashes kannst du später bei Bedarf mit einem kleinen Script neu erzeugen.
// Die folgenden Werte sind mit bcrypt (cost 10) aus den obigen Klartext-Passwörtern erzeugt.
const ADMIN_PASSWORD_HASH =
  '$2b$10$3/yLV8J9HLm2sChtCs/UJ.TI63yFPTCn/jHBTUX7JsuX1gFFZCEYu';
const CV_ACCESS_PASSWORD_HASH =
  '$2b$10$vK6sPZiBN76H3Mppd8FqZuNf3DqlE3FTnSn/KUledHkYWVcx55oZO';

app.use(
  cors({
    origin: ['http://localhost:4200'],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// Hilfsfunktion für Logging
const appendLoginLog = (name: string, company: string, role: CvSectionRole): void => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${role} | ${name} | ${company}\n`;

  fs.appendFile(LOG_FILE_PATH, line, (err) => {
    if (err) {
      // Für diesen einfachen Use-Case loggen wir Fehler nur auf der Server-Konsole.
      // Die Anwendung bleibt trotzdem funktionsfähig.
      // eslint-disable-next-line no-console
      console.error('Failed to write login log entry', err);
    }
  });
};

// Namensvalidierung:
// - Für Admin: exakt "Admin"
// - Für alle anderen: mind. 2 Wörter, nur Buchstaben, jedes Wort mind. 3 Zeichen.
const isValidName = (name: string, role: CvSectionRole): boolean => {
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

// Firmenvalidierung: mind. 3 Buchstaben (Leerzeichen ok), keine Zahlen
const isValidCompany = (company: string): boolean => {
  const trimmed = String(company ?? '').trim();
  const cleanedLetters = trimmed.replace(/\s+/g, '');
  return /^[A-Za-zÄÖÜäöüß]+$/.test(cleanedLetters) && cleanedLetters.length >= 3;
};

// Middleware, um JWT aus HTTP-only Cookie zu lesen und zu prüfen
const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.['cv_section_token'];

  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & jwt.JwtPayload;
    (req as Request & { user?: JwtPayload }).user = {
      name: decoded.name,
      company: decoded.company,
      role: decoded.role
    };
    next();
  } catch {
    res.sendStatus(401);
  }
};

// Middleware, um Rolle zu prüfen
const authorizeRole = (role: CvSectionRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user || user.role !== role) {
      res.sendStatus(403);
      return;
    }
    next();
  };
};

type LoginBody = { password?: string; name?: string; company?: string };

type LoginSuccess = { name: string; company: string; role: CvSectionRole };

type LoginFailure = { statusCode: number; errorKey: string };

type LoginResult = { ok: true; data: LoginSuccess } | { ok: false; error: LoginFailure };

/**
 * Determines the user role from the provided password.
 * Returns null if the password does not match any role.
 */
const getRoleFromPassword = async (password: string): Promise<CvSectionRole | null> => {
  const isAdminPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (isAdminPassword) return 'ROLE_ADMIN';

  const isCvPassword = await bcrypt.compare(password, CV_ACCESS_PASSWORD_HASH);
  if (isCvPassword) return 'ROLE_CV_ACCESS';

  return null;
};

/**
 * Normalizes the company field depending on the role.
 * Admin users can skip it, so we store an empty string.
 */
const normalizeCompanyForRole = (role: CvSectionRole, company: unknown): string => {
  if (role === 'ROLE_ADMIN') return '';
  return String(company ?? '').trim();
};

/**
 * Validates the normalized company value for CV-access users.
 * Admin users are allowed to keep it empty.
 */
const validateCompanyForRole = (role: CvSectionRole, normalizedCompany: string): boolean => {
  if (role === 'ROLE_ADMIN') return true;
  return isValidCompany(normalizedCompany);
};

/**
 * Builds the JWT payload for the login endpoint.
 */
const buildJwtPayload = (data: LoginSuccess): JwtPayload => {
  return { name: data.name, role: data.role, company: data.company };
};

/**
 * Handles all validation logic for a login request.
 */
const validateLoginRequest = async (body: LoginBody): Promise<LoginResult> => {
  const password = body.password;
  const name = body.name;
  const company = body.company;

  if (!password || !name) return { ok: false, error: { statusCode: 400, errorKey: 'MISSING_CREDENTIALS' } };

  const role = await getRoleFromPassword(password);
  if (!role) return { ok: false, error: { statusCode: 401, errorKey: 'INVALID_PASSWORD' } };

  if (!isValidName(name, role)) return { ok: false, error: { statusCode: 400, errorKey: 'INVALID_NAME' } };

  const normalizedCompany = normalizeCompanyForRole(role, company);
  if (!validateCompanyForRole(role, normalizedCompany)) return { ok: false, error: { statusCode: 400, errorKey: 'INVALID_COMPANY' } };

  return { ok: true, data: { name, company: normalizedCompany, role } };
};

/**
 * Signs the JWT and sets it as a secure HTTP-only cookie.
 */
const issueJwtCookie = (res: Response, payload: JwtPayload): void => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
  res.cookie('cv_section_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: JWT_EXPIRES_IN_SECONDS * 1000
  });
};

/**
 * Sends a JSON error object in the format expected by the frontend.
 */
const sendLoginError = (res: Response, failure: LoginFailure): void => {
  res.status(failure.statusCode).json({ error: failure.errorKey });
};

// Login-Endpoint für cv-section
app.post('/api/cv-section/login', async (req: Request, res: Response): Promise<void> => {
  const result = await validateLoginRequest(req.body as LoginBody);
  if (!result.ok) return sendLoginError(res, result.error);

  const payload = buildJwtPayload(result.data);
  issueJwtCookie(res, payload);
  appendLoginLog(result.data.name, result.data.company, result.data.role);

  res.json({
    name: result.data.name,
    company: result.data.company,
    role: result.data.role,
    expiresInSeconds: JWT_EXPIRES_IN_SECONDS
  });
});

// Me-Endpoint, um Login-Status abzufragen
app.get('/api/cv-section/me', authenticateJwt, (req: Request, res: Response): void => {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    res.sendStatus(401);
    return;
  }

  res.json(user);
});

// Admin-Only: Rohlogs
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

// Admin-Only: Statistik
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
app.post('/api/cv-section/logout', (req: Request, res: Response): void => {
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

