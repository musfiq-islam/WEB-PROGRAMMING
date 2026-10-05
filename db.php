<?php
// includes/db.php — PDO/MySQL connection + tiny query helpers.
// Mirrors the shape of the original Python db.py so the API logic
// ported over one-to-one.

function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $config = require __DIR__ . '/../config.php';
        $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset={$config['db_charset']}";
        try {
            $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Could not connect to the database. Make sure MySQL is running in XAMPP '
                         . 'and that the "uiu_ride" database has been imported from database/schema.sql.',
            ]);
            exit;
        }
    }
    return $pdo;
}

function db_query(string $sql, array $params = []): array {
    $stmt = get_pdo()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function db_query_one(string $sql, array $params = []) {
    $rows = db_query($sql, $params);
    return $rows[0] ?? null;
}

/** Runs INSERT/UPDATE/DELETE. Returns the last insert id (0 if not an insert). */
function db_execute(string $sql, array $params = []): int {
    $stmt = get_pdo()->prepare($sql);
    $stmt->execute($params);
    return (int) get_pdo()->lastInsertId();
}
