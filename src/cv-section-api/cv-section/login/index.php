<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

try {
  $body = readJsonBody();

  $name = trim((string)($body['name'] ?? ''));
  $company = (string)($body['company'] ?? '');
  $password = (string)($body['password'] ?? '');

  if ($name === '' || $password === '') {
    sendJson(array('error' => array('error' => 'MISSING_CREDENTIALS')), 400);
  }

  $role = getRoleFromPassword($password);
  if ($role === null) {
    sendJson(array('error' => array('error' => 'INVALID_PASSWORD')), 401);
  }

  if (!isValidName($name, $role)) {
    sendJson(array('error' => array('error' => 'INVALID_NAME')), 400);
  }

  if ($role !== ROLE_ADMIN) {
    if (!isValidCompany($company)) {
      sendJson(array('error' => array('error' => 'INVALID_COMPANY')), 400);
    }
  }

  $normalizedCompany = normalizeCompanyForRole($role, $company);

  $token = signJwt(array(
    'name' => $name,
    'company' => $normalizedCompany,
    'role' => $role,
  ));

  setAuthCookie($token);
  appendLoginLog($name, $normalizedCompany, $role);

  sendJson(array(
    'name' => $name,
    'company' => $normalizedCompany,
    'role' => $role,
  ));
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array(
    'error' => array(
      'error' => 'FATAL_LOGIN',
      'message' => $e->getMessage(),
      'file' => $e->getFile(),
      'line' => $e->getLine(),
    ),
  ));
  exit;
}

