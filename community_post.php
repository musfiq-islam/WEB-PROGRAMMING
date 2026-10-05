<?php
// api/community_post.php?id=3 — GET a single post plus its comments
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/community_helpers.php';

require_method('GET');
$user = require_login();
$postId = (int) ($_GET['id'] ?? 0);
if (!$postId) {
    api_error(400, 'Missing post id');
}
$post = db_query_one('SELECT * FROM community_posts WHERE id = ?', [$postId]);
if (!$post) {
    api_error(404, 'Post not found');
}

$result = enrich_post($post, $user['id']);
$result['offers'] = post_offers($postId);
if ((int) $post['user_id'] === (int) $user['id']) {
    db_execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND post_id = ?', [$user['id'], $postId]);
}
$result['comments'] = db_query(
    'SELECT c.*, u.name AS author_name, u.avatar_initials
     FROM community_comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at',
    [$postId]
);
json_response(200, $result);
