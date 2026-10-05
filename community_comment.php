<?php
// api/community_comment.php?id=3 — POST { content } — add a comment
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

$body = read_json_body();
require_fields($body, ['content']);

$commentId = db_execute(
    'INSERT INTO community_comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [$postId, $user['id'], trim($body['content'])]
);
$comment = db_query_one(
    'SELECT c.*, u.name AS author_name, u.avatar_initials
     FROM community_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?',
    [$commentId]
);
json_response(201, $comment);
