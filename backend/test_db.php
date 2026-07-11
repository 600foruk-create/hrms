<?php
require 'api.php';
try {
    $pdo->exec("INSERT INTO attendance (date, employeeId, employeeName, status) VALUES ('2026-07-11', 'U2', 'Test', 'Late')");
    echo "Insert Success\n";
} catch (Exception $e) {
    echo "Insert Error: " . $e->getMessage() . "\n";
}
?>
