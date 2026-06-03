<?php
$file = 'backend/api.php';
$content = file_get_contents($file);

// 1. Add CREATE TABLE statements
$createTables = <<<EOD
// Ensure payroll tables exist
try {
    \$pdo->exec("CREATE TABLE IF NOT EXISTS `global_salary_settings` (`id` int(11) NOT NULL AUTO_INCREMENT, `allowances` longtext, `deductions` longtext, PRIMARY KEY (`id`))");
    \$pdo->exec("CREATE TABLE IF NOT EXISTS `salary_profiles` (`userId` varchar(50) NOT NULL, `isCustomSlab` tinyint(1), `allowances` longtext, `deductions` longtext, PRIMARY KEY (`userId`))");
    \$pdo->exec("CREATE TABLE IF NOT EXISTS `loans` (`id` varchar(50) NOT NULL, `userId` varchar(50), `type` varchar(50), `totalAmount` decimal(10,2), `monthlyInstallment` decimal(10,2), `remainingAmount` decimal(10,2), `issuedAt` varchar(50), PRIMARY KEY (`id`))");
    \$pdo->exec("CREATE TABLE IF NOT EXISTS `payroll_history` (`id` varchar(50) NOT NULL, `batchId` varchar(50), `userId` varchar(50), `startDate` varchar(50), `endDate` varchar(50), `netFixed` decimal(10,2), `absencyDeduction` decimal(10,2), `loanDeduction` decimal(10,2), `bonus` decimal(10,2), `otherDeduction` decimal(10,2), `netPay` decimal(10,2), `processedAt` varchar(50), PRIMARY KEY (`id`))");
} catch (Exception \$e) {
    try {
        \$pdo->exec("CREATE TABLE IF NOT EXISTS `global_salary_settings` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `allowances` TEXT, `deductions` TEXT)");
        \$pdo->exec("CREATE TABLE IF NOT EXISTS `salary_profiles` (`userId` TEXT PRIMARY KEY, `isCustomSlab` INTEGER, `allowances` TEXT, `deductions` TEXT)");
        \$pdo->exec("CREATE TABLE IF NOT EXISTS `loans` (`id` TEXT PRIMARY KEY, `userId` TEXT, `type` TEXT, `totalAmount` REAL, `monthlyInstallment` REAL, `remainingAmount` REAL, `issuedAt` TEXT)");
        \$pdo->exec("CREATE TABLE IF NOT EXISTS `payroll_history` (`id` TEXT PRIMARY KEY, `batchId` TEXT, `userId` TEXT, `startDate` TEXT, `endDate` TEXT, `netFixed` REAL, `absencyDeduction` REAL, `loanDeduction` REAL, `bonus` REAL, `otherDeduction` REAL, `netPay` REAL, `processedAt` TEXT)");
    } catch (Exception \$e2) {}
}

if (\$action === 'get_all') {
EOD;

$content = str_replace("if (\$action === 'get_all') {", $createTables, $content);

// 2. Add Fetch block
$fetchBlock = <<<EOD
        // Fetch Payroll & Salary Data
        \$stmt = \$pdo->query("SELECT * FROM global_salary_settings LIMIT 1");
        \$gRow = \$stmt->fetch(PDO::FETCH_ASSOC);
        if (\$gRow) {
            \$dbState['globalSalarySettings'] = [
                'allowances' => json_decode(\$gRow['allowances'] ?: '[]', true),
                'deductions' => json_decode(\$gRow['deductions'] ?: '[]', true)
            ];
        } else {
            \$dbState['globalSalarySettings'] = ['allowances' => [], 'deductions' => []];
        }

        \$stmt = \$pdo->query("SELECT * FROM salary_profiles");
        \$profiles = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach (\$profiles as &\$prof) {
            \$prof['isCustomSlab'] = (bool)\$prof['isCustomSlab'];
            \$prof['allowances'] = json_decode(\$prof['allowances'] ?: '[]', true);
            \$prof['deductions'] = json_decode(\$prof['deductions'] ?: '[]', true);
        }
        \$dbState['salaryProfiles'] = \$profiles;

        \$stmt = \$pdo->query("SELECT * FROM loans");
        \$dbState['loans'] = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach (\$dbState['loans'] as &\$l) {
            \$l['totalAmount'] = (float)\$l['totalAmount'];
            \$l['monthlyInstallment'] = (float)\$l['monthlyInstallment'];
            \$l['remainingAmount'] = (float)\$l['remainingAmount'];
        }

        \$stmt = \$pdo->query("SELECT * FROM payroll_history");
        \$dbState['payrollHistory'] = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach (\$dbState['payrollHistory'] as &\$ph) {
            \$ph['netFixed'] = (float)\$ph['netFixed'];
            \$ph['absencyDeduction'] = (float)\$ph['absencyDeduction'];
            \$ph['loanDeduction'] = (float)\$ph['loanDeduction'];
            \$ph['bonus'] = (float)\$ph['bonus'];
            \$ph['otherDeduction'] = (float)\$ph['otherDeduction'];
            \$ph['netPay'] = (float)\$ph['netPay'];
        }

        echo json_encode(["status" => "success", "data" => \$dbState]);
EOD;
$content = str_replace('echo json_encode(["status" => "success", "data" => $dbState]);', $fetchBlock, $content);

// 3. Add Save block
$saveBlock = <<<EOD
        // 10. Sync Payroll & Salary Data
        \$pdo->exec("DELETE FROM global_salary_settings");
        if (isset(\$data['globalSalarySettings'])) {
            \$stmt = \$pdo->prepare("INSERT INTO global_salary_settings (allowances, deductions) VALUES (?, ?)");
            \$stmt->execute([
                json_encode(\$data['globalSalarySettings']['allowances'] ?? []),
                json_encode(\$data['globalSalarySettings']['deductions'] ?? [])
            ]);
        }

        \$pdo->exec("DELETE FROM salary_profiles");
        if (!empty(\$data['salaryProfiles'])) {
            \$stmt = \$pdo->prepare("INSERT INTO salary_profiles (userId, isCustomSlab, allowances, deductions) VALUES (?, ?, ?, ?)");
            foreach (\$data['salaryProfiles'] as \$sp) {
                \$stmt->execute([
                    \$sp['userId'], \$sp['isCustomSlab'] ? 1 : 0,
                    json_encode(\$sp['allowances'] ?? []), json_encode(\$sp['deductions'] ?? [])
                ]);
            }
        }

        \$pdo->exec("DELETE FROM loans");
        if (!empty(\$data['loans'])) {
            \$stmt = \$pdo->prepare("INSERT INTO loans (id, userId, type, totalAmount, monthlyInstallment, remainingAmount, issuedAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach (\$data['loans'] as \$l) {
                \$stmt->execute([\$l['id'], \$l['userId'], \$l['type'], \$l['totalAmount'], \$l['monthlyInstallment'], \$l['remainingAmount'], \$l['issuedAt']]);
            }
        }

        \$pdo->exec("DELETE FROM payroll_history");
        if (!empty(\$data['payrollHistory'])) {
            \$stmt = \$pdo->prepare("INSERT INTO payroll_history (id, batchId, userId, startDate, endDate, netFixed, absencyDeduction, loanDeduction, bonus, otherDeduction, netPay, processedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach (\$data['payrollHistory'] as \$ph) {
                \$stmt->execute([
                    \$ph['id'], \$ph['batchId'], \$ph['userId'], \$ph['startDate'], \$ph['endDate'], 
                    \$ph['netFixed'], \$ph['absencyDeduction'], \$ph['loanDeduction'], \$ph['bonus'], \$ph['otherDeduction'], \$ph['netPay'], \$ph['processedAt']
                ]);
            }
        }

        \$pdo->commit();
EOD;
$content = str_replace('$pdo->commit();', $saveBlock, $content);

file_put_contents($file, $content);
echo "Successfully patched api.php\n";
?>
