<?php
require 'config.php';
try {
    $obsolete_cp = ['leaveTypes', 'payrollLockEnabled', 'payrollLockDate', 'payrollLockStartDate', 'payrollLockEndDate', 'bankName', 'bankBranchCode', 'bankAccountNo', 'signatory', 'signatoryDesignation', 'bankLetterHeader', 'bankLetterFooter', 'idCardFrontBase64', 'idCardBackBase64'];
    foreach ($obsolete_cp as $col) {
        try {
            $pdo->exec("ALTER TABLE company_profile DROP COLUMN `$col`");
            echo "Dropped $col <br>";
        } catch (Exception $e) {
            echo "Failed to drop $col: " . $e->getMessage() . "<br>";
        }
    }
    echo "<h1>Cleanup Complete!</h1>";
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>
