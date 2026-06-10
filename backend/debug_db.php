<?php
require_once 'config.php';
try {
    $stmt = $pdo->query("SELECT * FROM company_profile LIMIT 1");
    $cpRow = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "company_profile data:\n";
    print_r($cpRow);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
