<?php
// api/community_posts.php
//   GET  — list all open posts (?proposals=1 → only ride proposals, for drivers)
//   POST { content, pickup?, destination?, date?, time? } — students/faculty only
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/community_helpers.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_GET['proposals'])) {
        // Ride proposals for the driver portal: open posts with a full route
        // whose date (if any) has not passed yet.
        $posts = db_query(
            "SELECT * FROM community_posts
             WHERE status = 'open' AND pickup IS NOT NULL AND destination IS NOT NULL
               AND (travel_date IS NULL OR travel_date >= CURDATE())
             ORDER BY created_at DESC"
        );
    } else {
        $posts = db_query("SELECT * FROM community_posts WHERE status = 'open' ORDER BY created_at DESC");
    }
    $posts = array_map(fn($p) => enrich_post($p, $user['id']), $posts);
    if ($user['role'] === 'driver') {
        // A proposal disappears from a driver's portal once they have offered a ride for it.
        $posts = array_values(array_filter($posts, fn($p) => !$p['youOffered']));
    }
    json_response(200, $posts);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!in_array($user['role'], RIDER_ROLES, true)) {
        api_error(403, 'Only students/faculty can create community posts');
    }
    $body = read_json_body();
    require_fields($body, ['content']);
    if (mb_strlen(trim($body['content'])) < 3) {
        api_error(400, 'Post content is too short');
    }
    $postId = db_execute(
        'INSERT INTO community_posts (user_id, content, pickup, destination, travel_date, travel_time)
         VALUES (?, ?, ?, ?, ?, ?)',
        [
            $user['id'], trim($body['content']),
            trim($body['pickup'] ?? '') ?: null,
            trim($body['destination'] ?? '') ?: null,
            trim($body['date'] ?? '') ?: null,
            trim($body['time'] ?? '') ?: null,
        ]
    );
    $post = db_query_one('SELECT * FROM community_posts WHERE id = ?', [$postId]);
    json_response(201, enrich_post($post, $user['id']));
}

api_error(405, 'Method not allowed');
