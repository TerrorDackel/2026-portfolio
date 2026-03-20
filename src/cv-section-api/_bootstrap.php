<?php
declare(strict_types=1);

/**
 * Shared helpers for all endpoints under /api/cv-section/.
 *
 * Compatibility goals:
 * - Old shared hosting PHP versions (no PHP 7.4+ features).
 * - Keep logic aligned with server/index.cjs.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

// Matches server/index.cjs bcrypt hashes.
const ADMIN_PASSWORD_HASH = '$2b$10$Rcjeyk/EiyCC9iC7olc.U.iRGeexM8NCjWC31jETWk/vv/G5pVJlu';
const CV_ACCESS_PASSWORD_HASH = '$2b$10$vK6sPZiBN76H3Mppd8FqZuNf3DqlE3FTnSn/KUledHkYWVcx55oZO';

// Matches this project's JWT fallback secret.
const JWT_SECRET = 'change_this_secret_in_env';

const JWT_EXPIRES_SECONDS = 60 * 5; // 5 minutes
const LOG_RETENTION_DAYS = 30;

const ROLE_ADMIN = 'ROLE_ADMIN';
const ROLE_CV_ACCESS = 'ROLE_CV_ACCESS';

function isSecureRequest(): bool
{
  if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') return true;
  if (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) return true;
  $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
  return is_string($proto) && strtolower($proto) === 'https';
}

/**
 * Resolve the absolute login log file path on shared hosting.
 */
function getLogFilePath(): string
{
  // /<domain>/api -> /<domain>
  $domainRoot = dirname(__DIR__);
  // /<ftp>/.../<domain> -> /<ftp>
  $ftpBase = dirname($domainRoot);

  $candidates = [
    $domainRoot . '/server/logs/cv-logins.log',
    $ftpBase . '/server/logs/cv-logins.log',
    $domainRoot . '/logs/cv-logins.log',
    $ftpBase . '/logs/cv-logins.log',
  ];

  foreach ($candidates as $path) {
    $dir = dirname($path);
    if (file_exists($path) || is_dir($dir)) {
      return $path;
    }
  }

  return $candidates[0];
}

/**
 * @return array<string, mixed>
 */
function readJsonBody(): array
{
  $raw = file_get_contents('php://input');
  if ($raw === false) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

/**
 * @param mixed $data
 */
function sendJson($data, int $status = 200): void
{
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function b64url_encode($data): string
{
  if ($data === null) $data = 'null';
  if ($data === false) $data = '';
  $asString = is_string($data) ? $data : (string)$data;
  return rtrim(strtr(base64_encode($asString), '+/', '-_'), '=');
}

function b64url_decode(string $data)
{
  $remainder = strlen($data) % 4;
  if ($remainder) $data .= str_repeat('=', 4 - $remainder);
  $decoded = base64_decode(strtr($data, '-_', '+/'));
  return $decoded === false ? null : $decoded;
}

/**
 * @param array<string, string> $payload
 */
function signJwt(array $payload): string
{
  $iat = time();
  $exp = $iat + JWT_EXPIRES_SECONDS;

  $header = array('alg' => 'HS256', 'typ' => 'JWT');
  $fullPayload = array(
    'name' => $payload['name'],
    'company' => $payload['company'],
    'role' => $payload['role'],
    'iat' => $iat,
    'exp' => $exp,
  );

  $segments = array(
    b64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES)),
    b64url_encode(json_encode($fullPayload, JSON_UNESCAPED_SLASHES)),
  );

  $signingInput = $segments[0] . '.' . $segments[1];
  $signature = hash_hmac('sha256', $signingInput, JWT_SECRET, true);

  return $signingInput . '.' . b64url_encode($signature);
}

/**
 * @return array<string, mixed>|null
 */
function verifyJwt(string $jwt)
{
  $parts = explode('.', $jwt);
  if (count($parts) !== 3) return null;

  [$h, $p, $s] = $parts;

  $headerJson = b64url_decode($h);
  $payloadJson = b64url_decode($p);
  $signatureBin = b64url_decode($s);
  if ($headerJson === null || $payloadJson === null || $signatureBin === null) return null;

  $header = json_decode($headerJson, true);
  $payload = json_decode($payloadJson, true);
  if (!is_array($header) || !is_array($payload)) return null;
  if (($header['alg'] ?? '') !== 'HS256') return null;

  $signingInput = $h . '.' . $p;
  $expectedSignature = hash_hmac('sha256', $signingInput, JWT_SECRET, true);
  if (!hash_equals($expectedSignature, $signatureBin)) return null;

  $now = time();
  $exp = isset($payload['exp']) ? (int)$payload['exp'] : 0;
  if ($exp <= 0 || $now >= $exp) return null;

  return $payload;
}

function setAuthCookie(string $token): void
{
  $expires = time() + JWT_EXPIRES_SECONDS;
  setcookie('cv_section_token', $token, array(
    'expires' => $expires,
    'path' => '/',
    'secure' => isSecureRequest(),
    'httponly' => true,
    'samesite' => 'Strict',
  ));
}

function clearAuthCookie(): void
{
  setcookie('cv_section_token', '', array(
    'expires' => time() - 3600,
    'path' => '/',
    'secure' => isSecureRequest(),
    'httponly' => true,
    'samesite' => 'Strict',
  ));
}

/**
 * @return array{name: string, company: string, role: string}
 */
function requireAuthenticatedUser(): array
{
  $token = $_COOKIE['cv_section_token'] ?? null;
  if (!$token || !is_string($token)) {
    http_response_code(401);
    exit;
  }

  $payload = verifyJwt($token);
  if ($payload === null) {
    http_response_code(401);
    exit;
  }

  $name = (string)($payload['name'] ?? '');
  $company = (string)($payload['company'] ?? '');
  $role = (string)($payload['role'] ?? '');

  if ($name === '' || $role === '') {
    http_response_code(401);
    exit;
  }

  return array('name' => $name, 'company' => $company, 'role' => $role);
}

function requireRole(string $requiredRole): void
{
  $user = requireAuthenticatedUser();
  if (!hash_equals($requiredRole, $user['role'])) {
    http_response_code(403);
    exit;
  }
}

function getRoleFromPassword(string $password): ?string
{
  if (password_verify($password, ADMIN_PASSWORD_HASH)) return ROLE_ADMIN;
  if (password_verify($password, CV_ACCESS_PASSWORD_HASH)) return ROLE_CV_ACCESS;
  return null;
}

function isValidName(string $name, string $role): bool
{
  $trimmed = trim($name);

  // Admin: exact "Admin"
  if ($role === ROLE_ADMIN) return $trimmed === 'Admin';

  // CV access: >= 2 words, each word >=3 letters, letters + umlauts only
  $parts = preg_split('/\s+/', $trimmed);
  if (!is_array($parts) || count($parts) < 2) return false;

  foreach ($parts as $part) {
    $p = (string)$part;
    if (!preg_match('/^[A-Za-zÄÖÜäöüß]{3,}$/u', $p)) return false;
  }

  return true;
}

function isValidCompany(string $company): bool
{
  $trimmed = trim((string)$company);
  $cleanedLetters = preg_replace('/\s+/', '', $trimmed);
  if ($cleanedLetters === null) $cleanedLetters = $trimmed;

  // letters + umlauts only, min length >=3
  $patternOk = preg_match('/^[A-Za-zÄÖÜäöüß]+$/u', $cleanedLetters) === 1;
  return $patternOk && strlen($cleanedLetters) >= 3;
}

function normalizeCompanyForRole(string $role, $company): string
{
  if ($role === ROLE_ADMIN) return '';
  return trim((string)($company ?? ''));
}

/**
 * @return array<int, array{timestampIso: string, timestampMs: int, role: string, name: string, company: string, rawLine: string}>
 */
function parseLogLines(string $content): array
{
  $lines = preg_split('/\R/', $content);
  if (!is_array($lines)) $lines = array();

  $entries = array();
  foreach ($lines as $line) {
    $line = trim((string)$line);
    if ($line === '') continue;

    $parts = explode(' | ', $line);
    $timestampIso = $parts[0] ?? '';
    $role = $parts[1] ?? '';
    $name = $parts[2] ?? '';
    $company = $parts[3] ?? '';

    if ($timestampIso === '' || $name === '' || $role === '') continue;
    if ($role !== ROLE_ADMIN && $role !== ROLE_CV_ACCESS) continue;

    $timestampMs = (int)round((strtotime($timestampIso) ?: 0) * 1000);
    if ($timestampMs <= 0) continue;

    $entries[] = array(
      'timestampIso' => $timestampIso,
      'timestampMs' => $timestampMs,
      'role' => $role,
      'name' => $name,
      'company' => $company,
      'rawLine' => $line,
    );
  }

  return $entries;
}

function getRetentionCutoffMs(): int
{
  return (int)(microtime(true) * 1000) - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function cleanupOldLoginLogs(): void
{
  $logPath = getLogFilePath();
  if (!file_exists($logPath)) return;

  $content = file_get_contents($logPath);
  if ($content === false) return;

  $entries = parseLogLines($content);
  $cutoffMs = getRetentionCutoffMs();

  $keptRawLines = array();
  foreach ($entries as $e) {
    if ((int)$e['timestampMs'] >= $cutoffMs) {
      $keptRawLines[] = $e['rawLine'];
    }
  }

  $newContent = count($keptRawLines) > 0 ? (implode("\n", $keptRawLines) . "\n") : '';
  if ($newContent === $content) return;

  $dir = dirname($logPath);
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }

  @file_put_contents($logPath, $newContent, LOCK_EX);
}

function appendLoginLog(string $name, string $company, string $role): void
{
  $micro = microtime(true);
  $ms = (int)floor(($micro - floor($micro)) * 1000);
  $seconds = (int)floor($micro);

  $timestamp = gmdate('Y-m-d\TH:i:s', $seconds) . '.' . str_pad((string)$ms, 3, '0', STR_PAD_LEFT) . 'Z';

  $line = $timestamp . ' | ' . $role . ' | ' . $name . ' | ' . $company . "\n";
  $logPath = getLogFilePath();

  $dir = dirname($logPath);
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }

  @file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX);
}

/**
 * @param array<int, array{timestampMs: int, timestampIso: string, role: string, name: string, company: string}> $entries
 * @return array{lastAdminLogin: string|null, cvAccessUniqueUsersSinceLastAdmin: int}
 */
function computeAdminStats(array $entries): array
{
  $adminEntries = array();
  $cvEntries = array();

  foreach ($entries as $e) {
    $r = (string)($e['role'] ?? '');
    if ($r === ROLE_ADMIN) $adminEntries[] = $e;
    if ($r === ROLE_CV_ACCESS) $cvEntries[] = $e;
  }

  usort($adminEntries, function ($a, $b): int {
    $aMs = (int)($a['timestampMs'] ?? 0);
    $bMs = (int)($b['timestampMs'] ?? 0);
    if ($aMs === $bMs) return 0;
    return ($bMs < $aMs) ? -1 : 1;
  });

  $currentAdmin = $adminEntries[0] ?? null;
  $previousAdmin = $adminEntries[1] ?? null;

  $relevantCvAccess = array();
  if ($previousAdmin === null) {
    $relevantCvAccess = $cvEntries;
  } else {
    $prevTs = (int)($previousAdmin['timestampMs'] ?? 0);
    $currTs = $currentAdmin !== null ? (int)($currentAdmin['timestampMs'] ?? 0) : null;

    foreach ($cvEntries as $e) {
      $ts = (int)($e['timestampMs'] ?? 0);
      if ($ts <= $prevTs) continue;
      if ($currTs !== null && $ts > $currTs) continue;
      $relevantCvAccess[] = $e;
    }
  }

  $uniqueNames = array();
  foreach ($relevantCvAccess as $e) {
    $n = (string)($e['name'] ?? '');
    if ($n !== '') $uniqueNames[$n] = true;
  }

  return array(
    'lastAdminLogin' => $previousAdmin ? (string)$previousAdmin['timestampIso'] : null,
    'cvAccessUniqueUsersSinceLastAdmin' => count($uniqueNames),
  );
}

