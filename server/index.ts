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

const parseLogLines = (content: string): ParsedLogEntry[] => {
  const cutoffMs = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const lines = String(content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const parts = line.split(' | ');
      const timestampIso = parts[0] ?? '';
      const role = parts[1] ?? '';
      const name = parts[2] ?? '';
      const company = parts[3] ?? '';
      const timestampMs = Date.parse(timestampIso);
      if (!timestampIso || !role || !name || Number.isNaN(timestampMs)) return null;
      return { timestampIso, timestampMs, role, name, company, rawLine: line };
    })
    .filter(Boolean) as ParsedLogEntry[];
};

const cleanupOldLoginLogs = (): void => {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) return;

    const content = fs.readFileSync(LOG_FILE_PATH, 'utf8');
    const entries = parseLogLines(content);
    const cutoffMs = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const keptRawLines = entries.filter((e) => e.timestampMs >= cutoffMs).map((e) => e.rawLine);
    const newContent = keptRawLines.length ? `${keptRawLines.join('\n')}\n` : '';

    if (newContent !== content) {
      fs.writeFileSync(LOG_FILE_PATH, newContent, 'utf8');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to cleanup old login logs', err);
  }
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

// Login-Endpoint für cv-section
app.post('/api/cv-section/login', async (req: Request, res: Response): Promise<void> => {
  const { password, name, company } = req.body as { password?: string; name?: string; company?: string };

  if (!password || !name) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS' });
    return;
  }

  let role: CvSectionRole | null = null;

  const isAdminPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (isAdminPassword) {
    role = 'ROLE_ADMIN';
  } else {
    const isCvPassword = await bcrypt.compare(password, CV_ACCESS_PASSWORD_HASH);
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

  const normalizedCompany = role === 'ROLE_CV_ACCESS' ? String(company ?? '').trim() : '';
  if (role === 'ROLE_CV_ACCESS' && !isValidCompany(normalizedCompany)) {
    res.status(400).json({ error: 'INVALID_COMPANY' });
    return;
  }

  const payload: JwtPayload = { name, role, company: normalizedCompany };
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

    const adminEntries = entries
      .filter((e) => e.role === 'ROLE_ADMIN')
      .sort((a, b) => b.timestampMs - a.timestampMs);

    // Wichtig: Wenn die Admin-Statistik geladen wird, wurde der aktuelle Admin-Login
    // bereits als letzter Log-Eintrag geschrieben. Daher zählen wir CV-Logins erst
    // seit dem vorherigen Admin-Login (vor dem aktuellen).
    const currentAdmin = adminEntries[0] ?? null;
    const previousAdmin = adminEntries[1] ?? null;

    const cvAfterPreviousAdmin = previousAdmin
      ? entries.filter(
          (e) =>
            e.role === 'ROLE_CV_ACCESS' &&
            e.timestampMs > previousAdmin.timestampMs &&
            (!currentAdmin || e.timestampMs <= currentAdmin.timestampMs)
        )
      : entries.filter((e) => e.role === 'ROLE_CV_ACCESS');

    const uniqueNames = new Set(cvAfterPreviousAdmin.map((e) => e.name));

    res.json({
      lastAdminLogin: previousAdmin ? previousAdmin.timestampIso : null,
      cvAccessUniqueUsersSinceLastAdmin: uniqueNames.size
    });
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

