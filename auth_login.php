<?php
// api/auth_login.php — POST { email, password }
require_once __DIR__ . '/../includes/auth.php';

require_method('POST');
$body = read_json_body();
require_fields($body, ['email', 'password']);

$email = strtolower(trim($body['email']));
$user = db_query_one('SELECT * FROM users WHERE email = ?', [$email]);

if (!$user || !password_verify($body['password'], $user['password_hash'])) {
    api_error(401, 'Invalid email or password');
}
if ($user['status'] !== 'active') {
    api_error(403, 'This account has been suspended');
}

// Prevent session fixation: issue a fresh session id on login.
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];

json_response(200, ['user' => public_user($user)]);
