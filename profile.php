<?php
// api/profile.php — PATCH { name?, phone?, department?, vehicleModel?, vehiclePlate?, licenseNumber? }
require_once __DIR__ . '/../includes/auth.php';

require_method('PATCH');
$user = require_login();
$body = read_json_body();

if (array_key_exists('phone', $body) && !is_valid_phone(trim((string) $body['phone']))) {
    api_error(400, 'Phone number must be exactly 11 digits');
}

$updates = [];
$params = [];
foreach (['name' => 'name', 'phone' => 'phone', 'department' => 'department'] as $field => $column) {
    if (array_key_exists($field, $body)) {
        $updates[] = "$column = ?";
        $params[] = trim((string) $body[$field]);
    }
}
if ($updates) {
    $params[] = $user['id'];
    db_execute('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
}

if ($user['role'] === 'driver') {
    $driver = driver_profile_for_user($user['id']);
    $dUpdates = [];
    $dParams = [];
    foreach (['vehicleModel' => 'vehicle_model', 'vehiclePlate' => 'vehicle_plate', 'licenseNumber' => 'license_number'] as $field => $column) {
        if (array_key_exists($field, $body)) {
            $dUpdates[] = "$column = ?";
            $dParams[] = trim((string) $body[$field]);
        }
    }
    if (array_key_exists('licenseNumber', $body) && trim((string) $body['licenseNumber']) === '') {
        api_error(400, 'Driving license number is required for drivers');
    }
    if ($dUpdates && $driver) {
        $dParams[] = $driver['id'];
        db_execute('UPDATE drivers SET ' . implode(', ', $dUpdates) . ' WHERE id = ?', $dParams);
    }
}

$refreshed = db_query_one('SELECT * FROM users WHERE id = ?', [$user['id']]);
$result = public_user($refreshed);
if ($refreshed['role'] === 'driver') {
    $result['driverProfile'] = driver_profile_for_user($refreshed['id']);
}
json_response(200, $result);
