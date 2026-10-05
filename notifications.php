<?php
// api/notifications.php
//   GET             — the rider's driver-offer notifications + unread count
//   GET ?count=1    — only the unread count (used by the menu badge)
//   POST { all: true } or { postId } — mark notifications as read
require_once __DIR__ . '/../includes/auth.php';

$user = require_login();

// Only offers that are still open are shown (cancelled/completed rides drop out).
const NOTIF_LIVE = "r.status IN ('scheduled','active')";

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $unread = (int) db_query_one(
        "SELECT COUNT(*) AS c FROM notifications n JOIN rides r ON r.id = n.ride_id
         WHERE n.user_id = ? AND n.is_read = 0 AND " . NOTIF_LIVE,
        [$user['id']]
    )['c'];
    if (!empty($_GET['count'])) {
        json_response(200, ['unread' => $unread]);
    }
    $items = db_query(
        "SELECT n.id, n.post_id, n.ride_id, n.is_read, n.created_at,
                r.pickup, r.destination, r.ride_date, r.ride_time, r.fare_per_person,
                r.available_seats, r.vehicle_type, r.vehicle_model,
                u.name AS driver_name,
                p.content AS post_content, p.pickup AS post_pickup, p.destination AS post_destination
         FROM notifications n
         JOIN rides r ON r.id = n.ride_id
         JOIN drivers d ON d.id = r.driver_id
         JOIN users u ON u.id = d.user_id
         JOIN community_posts p ON p.id = n.post_id
         WHERE n.user_id = ? AND " . NOTIF_LIVE . "
         ORDER BY n.created_at DESC",
        [$user['id']]
    );
    json_response(200, ['unread' => $unread, 'items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = read_json_body();
    if (!empty($body['postId'])) {
        db_execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND post_id = ?',
                   [$user['id'], (int) $body['postId']]);
    } else {
        db_execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [$user['id']]);
    }
    json_response(200, ['ok' => true]);
}

api_error(405, 'Method not allowed');
