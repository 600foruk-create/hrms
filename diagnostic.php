<?php
require 'backend/config.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT * FROM biometric_machines");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "status" => "success",
        "table_name" => "biometric_machines",
        "row_count" => count($data),
        "data" => $data
    ]);
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
