<?php
// api/rides_mine.php — GET: rides offered by the logged-in driver
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rides_helpers.php';

require_method('GET');
$user = require_login();
if ($user['role'] !== 'driver') {
    api_error(403, 'Only drivers have offered rides');
}
$driver = driver_profile_for_user($user['id']);
$rides = db_query(
    'SELECT * FROM rides WHERE driver_id = ? ORDER BY ride_date DESC, ride_time DESC',
    [$driver['id']]
);
json_response(200, array_map('ride_with_driver', $rides));
