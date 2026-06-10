<?php
require_once 'config.php';
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM company_profile");
    echo "COMPANY_PROFILE:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    
    $stmt = $pdo->query("SHOW COLUMNS FROM users");
    echo "USERS:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>