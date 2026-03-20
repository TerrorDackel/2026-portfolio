<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

try {
  $user = requireAuthenticatedUser();

  sendJson(array(
    'name' => $user['name'],
    'company' => $user['company'],
    'role' => $user['role'],
  ));
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array(
    'error' => array(
      'error' => 'FATAL_ME',
      'message' => $e->getMessage(),
      'file' => $e->getFile(),
      'line' => $e->getLine(),
    ),
  ));
  exit;
}

