import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;

// In einer echten produktiven Umgebung würdest du das Secret
// aus einer sicheren Umgebung (ENV-Variable) laden.
const JWT_SECRET = process.env.CV_SECTION_JWT_SECRET || 'change_this_secret_in_env';
const JWT_EXPIRES_IN_SECONDS = 60 * 5; // 5 Minuten

// Logfile-Pfad
const LOG_FILE_PATH = path.join(__dirname, 'logs', 'cv-logins.log');

// Feste Rollen
type CvSectionRole = 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';

interface JwtPayload {
  name: string;
  role: CvSectionRole;
}

// Vorbereitung: Passwörter als gehashte Werte hinterlegen.
// Die Klartext-Passwörter kennst nur du:
// - Admin: Admin JenniferThomas_Portfolio.2026.pw.adminbereich.25.12
// - CV-Zugang: FrontendDeveloper.JenniferThomas.2026
//
// Diese Hashes kannst du später bei Bedarf mit einem kleinen Script neu erzeugen.
// Hier sind Beispiel-Hashes; ersetze sie bei Bedarf durch neu generierte.
const ADMIN_PASSWORD_HASH =
  '$2b$10$4zyJihVq9Xj0sS3q4nXwo.8OaH1vSOVdk1vYuvQbqkzTdlV/6uD8q'; // Platzhalter
const CV_ACCESS_PASSWORD_HASH =
  '$2b$10$E3kh1pZC5T4h1ixyBz4vYuEoW7X2lV6fHC5n3oSxqK5GQUn9I9pSa'; // Platzhalter

app.use(
  cors({
    origin: ['http://localhost:4200'],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// Hilfsfunktion für Logging
const appendLoginLog = (name: string, role: CvSectionRole): void => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${role} | ${name}\n`;

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

// Middleware, um JWT aus HTTP-only Cookie zu lesen und zu prüfen
const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.cv_section_token;

  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & jwt.JwtPayload;
    (req as Request & { user?: JwtPayload }).user = {
      name: decoded.name,
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
  const { password, name } = req.body as { password?: string; name?: string };

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

  const payload: JwtPayload = { name, role };
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
app.get('/api/cv-section/me', authenticateJwt, (req: Request, res: Response): void => {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user) {
    res.sendStatus(401);
    return;
  }

  res.json(user);
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

