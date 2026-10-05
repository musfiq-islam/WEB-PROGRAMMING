<?php
// api/auth_logout.php — POST {}
require_once __DIR__ . '/../includes/auth.php';

require_method('POST');
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

json_response(200, ['ok' => true]);
