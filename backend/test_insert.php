<?php
require_once 'config.php';

$payload = [
    'companyProfile' => [
        'bankName' => 'Test Bank',
        'bankAccountNo' => '123456789'
    ]
];

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `company_profile` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `name` TEXT,
            `email` TEXT,
            `phone` TEXT,
            `website` TEXT,
            `address` TEXT,
            `reg` TEXT,
            `slogan` TEXT,
            `industry` TEXT,
            `size` TEXT,
            `type` TEXT,
            `logoBase64` TEXT,
            `letterheadBase64` TEXT,
            `signatureBase64` TEXT,
            `leaveTypes` TEXT,
            `bankName` TEXT,
            `bankBranchCode` TEXT,
            `bankAccountNo` TEXT,
            `signatory` TEXT,
            `signatoryDesignation` TEXT,
            `bankLetterHeader` TEXT,
            `bankLetterFooter` TEXT,
            `payrollLockEnabled` INTEGER DEFAULT 0,
            `payrollLockDate` INTEGER DEFAULT 1,
            `payrollLockStartDate` TEXT,
            `payrollLockEndDate` TEXT
        )");
} catch (Exception $e) {}

try {
    $cp = $payload['companyProfile'];
    $stmt = $pdo->prepare("INSERT INTO company_profile (name, email, phone, website, address, reg, slogan, industry, size, type, logoBase64, letterheadBase64, signatureBase64, leaveTypes, bankName, bankBranchCode, bankAccountNo, signatory, signatoryDesignation, bankLetterHeader, bankLetterFooter, payrollLockEnabled, payrollLockDate, payrollLockStartDate, payrollLockEndDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $cp['name'] ?? '', $cp['email'] ?? '', $cp['phone'] ?? '', $cp['website'] ?? '',
        $cp['address'] ?? '', $cp['reg'] ?? '', $cp['slogan'] ?? '', $cp['industry'] ?? '',
        $cp['size'] ?? '', $cp['type'] ?? '', $cp['logoBase64'] ?? '', $cp['letterheadBase64'] ?? '',
        $cp['signatureBase64'] ?? '',
        !empty($cp['leaveTypes']) ? json_encode($cp['leaveTypes']) : null,
        $cp['bankName'] ?? '', $cp['bankBranchCode'] ?? '', $cp['bankAccountNo'] ?? '',
        $cp['signatory'] ?? '', $cp['signatoryDesignation'] ?? '',
        $cp['bankLetterHeader'] ?? '', $cp['bankLetterFooter'] ?? '',
        !empty($cp['payrollLockEnabled']) ? 1 : 0, 
        $cp['payrollLockDate'] ?? 1,
        $cp['payrollLockStartDate'] ?? '', 
        $cp['payrollLockEndDate'] ?? ''
    ]);
    echo "SUCCESS\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>
