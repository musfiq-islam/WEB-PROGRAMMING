<?php
// includes/auth.php — PHP-native session authentication.
// Passwords use PHP's built-in password_hash()/password_verify()
// (bcrypt), which already salts automatically — no manual salt
// column needed. Login state lives in the standard PHP session,
// backed by a cookie the browser sends automatically.

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,       // session cookie, cleared when browser closes
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

const RIDER_ROLES = ['student', 'faculty'];

function current_user(): ?array {
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $user = db_query_one('SELECT * FROM users WHERE id = ?', [$_SESSION['user_id']]);
    return $user ?: null;
}

/** Call at the top of any endpoint that requires login. Exits with 401 if not logged in. */
function require_login(): array {
    $user = current_user();
    if (!$user) {
        api_error(401, 'Please log in to continue');
    }
    return $user;
}

/** Exits with 403 if $user's role is not in $roles. */
function require_role(array $user, array $roles): void {
    if (!in_array($user['role'], $roles, true)) {
        api_error(403, 'You do not have permission to do that');
    }
}

function driver_profile_for_user(int $userId): ?array {
    return db_query_one('SELECT * FROM drivers WHERE user_id = ?', [$userId]);
}

/** Strips the password hash before a user row goes back to the client. */
function public_user(?array $user): ?array {
    if (!$user) return null;
    unset($user['password_hash']);
    return $user;
}
