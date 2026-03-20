<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../_bootstrap.php';

try {
  requireRole(ROLE_ADMIN);
  cleanupOldLoginLogs();

  $logPath = getLogFilePath();
  $content = '';
  if (file_exists($logPath)) {
    $maybe = file_get_contents($logPath);
    $content = $maybe === false ? '' : $maybe;
  }

  header('Content-Type: text/plain; charset=utf-8');
  echo $content;
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array(
    'error' => array(
      'error' => 'FATAL_ADMIN_LOGS',
      'message' => $e->getMessage(),
      'file' => $e->getFile(),
      'line' => $e->getLine(),
    ),
  ));
  exit;
}

