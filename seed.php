<?php
// database/seed.php — OPTIONAL, for local development only.
//
// Run it once from a terminal:
//   php database/seed.php
// or by visiting it in the browser after logging into XAMPP locally:
//   http://localhost/uiu-ride/database/seed.php
//
// It inserts a few clearly-labeled TEST-ONLY accounts so you have
// something to log in with immediately. Password for all of them:
// Passw0rd!
//
// Nothing in the application logic depends on these accounts —
// delete them any time from phpMyAdmin, or drop and re-import
// database/schema.sql for a completely clean slate.

require_once __DIR__ . '/../includes/db.php';

function make_user(string $name, string $email, string $role, array $extra = []): int {
    $existing = db_query_one('SELECT id FROM users WHERE email = ?', [$email]);
    if ($existing) {
        echo "  (skip) $email already exists\n";
        return (int) $existing['id'];
    }
    $hash = password_hash('Passw0rd!', PASSWORD_DEFAULT);
    $parts = preg_split('/\s+/', $name);
    $initials = strtoupper(substr($parts[0] ?? 'U', 0, 1) . substr($parts[1] ?? '', 0, 1));

    $id = db_execute(
        'INSERT INTO users (name, email, password_hash, role, phone, uiu_id, department, avatar_initials, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [
            $name, $email, $hash, $role,
            $extra['phone'] ?? '', $extra['uiu_id'] ?? null, $extra['department'] ?? null, $initials,
        ]
    );
    echo "  created $role: $email / Passw0rd!\n";
    return $id;
}

echo "Seeding TEST-ONLY development accounts...\n";

make_user('Test Student', 'test.student@uiu.ac.bd', 'student', [
    'phone' => '01700000001', 'uiu_id' => '0112420001', 'department' => 'CSE',
]);

make_user('Test Faculty', 'test.faculty@uiu.ac.bd', 'faculty', [
    'phone' => '01700000002', 'uiu_id' => 'FAC-2001', 'department' => 'CSE',
]);

$driverUserId = make_user('Test Driver', 'test.driver@example.com', 'driver', [
    'phone' => '01700000003',
]);

if (!db_query_one('SELECT id FROM drivers WHERE user_id = ?', [$driverUserId])) {
    db_execute(
        "INSERT INTO drivers (user_id, vehicle_type, vehicle_model, vehicle_plate, license_number)
         VALUES (?, 'Car', 'Toyota Premio', 'Dhaka Metro Ga-11-2233', 'DL-000111')",
        [$driverUserId]
    );
    echo "  attached vehicle profile to Test Driver\n";
}

echo "Done. These are development/test accounts only — never used by app logic.\n";
