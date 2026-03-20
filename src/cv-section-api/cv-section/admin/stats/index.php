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

  $entries = parseLogLines($content);
  $stats = computeAdminStats($entries);

  sendJson($stats);
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array(
    'error' => array(
      'error' => 'FATAL_ADMIN_STATS',
      'message' => $e->getMessage(),
      'file' => $e->getFile(),
      'line' => $e->getLine(),
    ),
  ));
  exit;
}

