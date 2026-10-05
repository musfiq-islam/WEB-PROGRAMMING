<?php
// includes/response.php — JSON in, JSON out, plus small validation helpers.

function json_response(int $status, $data): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function api_error(int $status, string $message): void {
    json_response($status, ['error' => $message]);
}

/** Reads and JSON-decodes the raw request body (used for POST/PATCH). */
function read_json_body(): array {
    // multipart/form-data (used when a file is uploaded) arrives in $_POST.
    if (!empty($_POST)) {
        return $_POST;
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        api_error(400, 'Request body must be valid JSON');
    }
    return is_array($data) ? $data : [];
}

function require_fields(array $body, array $fields): void {
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($body[$f]) || trim((string) $body[$f]) === '') {
            $missing[] = $f;
        }
    }
    if ($missing) {
        api_error(400, 'Missing required field(s): ' . implode(', ', $missing));
    }
}

function is_valid_email(string $email): bool {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function is_valid_date(string $value): bool {
    return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
}

function is_valid_time(string $value): bool {
    return (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value);
}

function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        api_error(405, "This endpoint only accepts $method requests");
    }
}

/** Bangladeshi mobile numbers in this app are exactly 11 digits (e.g. 01712345678). */
function is_valid_phone(string $phone): bool {
    return (bool) preg_match('/^\d{11}$/', $phone);
}

/** Bangladesh NID numbers are 10, 13 or 17 digits. */
function is_valid_nid(string $nid): bool {
    return (bool) preg_match('/^(\d{10}|\d{13}|\d{17})$/', $nid);
}
