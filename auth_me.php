<?php
// api/auth_me.php — GET current logged-in user (+ driver profile if applicable)
require_once __DIR__ . '/../includes/auth.php';

require_method('GET');
$user = require_login();
$result = public_user($user);
if ($user['role'] === 'driver') {
    $result['driverProfile'] = driver_profile_for_user($user['id']);
}
json_response(200, $result);
