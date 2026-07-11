<?php
require 'api.php';
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM attendance");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
