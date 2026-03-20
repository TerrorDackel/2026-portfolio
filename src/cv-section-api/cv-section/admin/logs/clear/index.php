<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../../_bootstrap.php';

try {
  requireRole(ROLE_ADMIN);

  $logPath = getLogFilePath();
  $dir = dirname($logPath);
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }

  @file_put_contents($logPath, '', LOCK_EX);

  http_response_code(204);
  exit;
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array(
    'error' => array(
      'error' => 'FATAL_CLEAR_LOGS',
      'message' => $e->getMessage(),
      'file' => $e->getFile(),
      'line' => $e->getLine(),
    ),
  ));
  exit;
}

