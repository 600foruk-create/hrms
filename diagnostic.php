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


try {
    $pdo->exec("DELETE FROM biometric_machines");
    $stmt = $pdo->prepare("INSERT INTO biometric_machines (id, name, ip, port, auto_sync, status) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute(['TEST_123', 'Test Device', '192.168.1.1', 4370, 1, 'Untested']);
    echo "\nINSERT SUCCESS!";
} catch (Exception $e) {
    echo "\nINSERT FAILED: " . $e->getMessage();
}
