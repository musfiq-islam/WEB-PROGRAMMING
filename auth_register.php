<?php
// api/auth_register.php — POST { name, email, password, role, ... }
require_once __DIR__ . '/../includes/auth.php';

require_method('POST');
$body = read_json_body();
require_fields($body, ['name', 'email', 'password', 'role']);

$role = $body['role'];
if (!in_array($role, ['student', 'faculty', 'driver'], true)) {
    api_error(400, 'Role must be student, faculty, or driver');
}
if (!is_valid_email($body['email'])) {
    api_error(400, 'Please provide a valid email address');
}

$email = strtolower(trim($body['email']));
if (in_array($role, RIDER_ROLES, true) && substr($email, -strlen('@uiu.ac.bd')) !== '@uiu.ac.bd') {
    api_error(400, 'Students and faculty must register with a @uiu.ac.bd email address');
}
if (trim((string) ($body['phone'] ?? '')) === '' || !is_valid_phone(trim($body['phone']))) {
    api_error(400, 'Phone number must be exactly 11 digits');
}
if (strlen($body['password']) < 8) {
    api_error(400, 'Password must be at least 8 characters');
}

if (db_query_one('SELECT id FROM users WHERE email = ?', [$email])) {
    api_error(409, 'An account with this email already exists');
}

if (in_array($role, RIDER_ROLES, true) && trim((string) ($body['uiuId'] ?? '')) === '') {
    api_error(400, 'UIU student/faculty ID is required');
}

if ($role === 'driver') {
    require_fields($body, ['vehicleType', 'vehicleModel', 'vehiclePlate', 'licenseNumber', 'nidNumber']);
    if (!in_array($body['vehicleType'], ['Bike', 'Car', 'Other'], true)) {
        api_error(400, 'Vehicle type must be Bike, Car, or Other');
    }
    $nidNumber = preg_replace('/\s+/', '', (string) $body['nidNumber']);
    if (!is_valid_nid($nidNumber)) {
        api_error(400, 'NID number must be 10, 13 or 17 digits');
    }
}

$passwordHash = password_hash($body['password'], PASSWORD_DEFAULT);
$nameParts = preg_split('/\s+/', trim($body['name']));
$initials = strtoupper(substr($nameParts[0] ?? 'U', 0, 1) . substr($nameParts[1] ?? '', 0, 1));
$hasUiuDomain = substr($email, -strlen('@uiu.ac.bd')) === '@uiu.ac.bd';
$isVerified = (in_array($role, RIDER_ROLES, true) && $hasUiuDomain) ? 1 : 0;

$userId = db_execute(
    'INSERT INTO users (name, email, password_hash, role, phone, uiu_id, department, avatar_initials, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        trim($body['name']),
        $email,
        $passwordHash,
        $role,
        trim($body['phone']),
        $role === 'driver' ? null : (trim($body['uiuId'] ?? '') ?: null),
        $role === 'driver' ? null : (trim($body['department'] ?? '') ?: null),
        $initials,
        $isVerified,
    ]
);

if ($role === 'driver') {
    db_execute(
        'INSERT INTO drivers (user_id, vehicle_type, vehicle_model, vehicle_plate, license_number, nid_number)
         VALUES (?, ?, ?, ?, ?, ?)',
        [
            $userId,
            $body['vehicleType'],
            trim($body['vehicleModel']),
            trim($body['vehiclePlate']),
            trim($body['licenseNumber']),
            $nidNumber,
        ]
    );
}

$_SESSION['user_id'] = $userId;
$user = db_query_one('SELECT * FROM users WHERE id = ?', [$userId]);
json_response(201, ['user' => public_user($user)]);
