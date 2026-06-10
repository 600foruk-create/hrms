<?php
require_once 'config.php';

echo "<pre>";
echo "Starting Database Schema Upgrade...\n\n";

$queries = [
    "ALTER TABLE company_profile ADD COLUMN `bankName` varchar(150) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `bankBranchCode` varchar(50) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `bankAccountNo` varchar(100) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `signatory` varchar(150) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `signatoryDesignation` varchar(150) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `bankLetterHeader` longtext DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `bankLetterFooter` longtext DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `payrollLockEnabled` tinyint(1) DEFAULT 0",
    "ALTER TABLE company_profile ADD COLUMN `payrollLockDate` int(11) DEFAULT 1",
    "ALTER TABLE company_profile ADD COLUMN `payrollLockStartDate` varchar(50) DEFAULT NULL",
    "ALTER TABLE company_profile ADD COLUMN `payrollLockEndDate` varchar(50) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN `themeColor` varchar(50) DEFAULT NULL"
];

foreach ($queries as $q) {
    try {
        $pdo->exec($q);
        echo "SUCCESS: $q\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "ALREADY EXISTS: $q\n";
        } else {
            echo "ERROR: " . $e->getMessage() . " => $q\n";
        }
    }
}

echo "\nUpgrade Complete. Please check for any errors above.";
echo "</pre>";
?>
