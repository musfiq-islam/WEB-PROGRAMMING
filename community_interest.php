<?php
// api/community_interest.php?id=3 — POST: toggle "interested" for the current user
require_once __DIR__ . '/../includes/auth.php';

require_method('POST');
$user = require_login();
$postId = (int) ($_GET['id'] ?? 0);
if (!$postId) {
    api_error(400, 'Missing post id');
}
$post = db_query_one('SELECT * FROM community_posts WHERE id = ?', [$postId]);
if (!$post) {
    api_error(404, 'Post not found');
}

$existing = db_query_one(
    'SELECT id FROM community_interests WHERE post_id = ? AND user_id = ?',
    [$postId, $user['id']]
);
if ($existing) {
    db_execute('DELETE FROM community_interests WHERE id = ?', [$existing['id']]);
    $interested = false;
} else {
    db_execute('INSERT INTO community_interests (post_id, user_id) VALUES (?, ?)', [$postId, $user['id']]);
    $interested = true;
}
$count = (int) db_query_one('SELECT COUNT(*) AS c FROM community_interests WHERE post_id = ?', [$postId])['c'];

json_response(200, ['youAreInterested' => $interested, 'interestCount' => $count]);
