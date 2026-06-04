<?php
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'config.php';

// Auto-initialize database if tables are missing
try {
    $pdo->query("SELECT 1 FROM users LIMIT 1");
} catch (PDOException $e) {
    $setupFile = __DIR__ . '/setup.sql';
    if (file_exists($setupFile)) {
        try {
            $sql = file_get_contents($setupFile);
            
            // Remove single line comments
            $sql = preg_replace('/--.*/', '', $sql);
            // Remove multi-line comments
            $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
            
            // Split by semicolon
            $queries = explode(';', $sql);
            
            foreach ($queries as $query) {
                $query = trim($query);
                if (!empty($query)) {
                    $pdo->exec($query);
                }
            }
        } catch (Exception $initEx) {
            error_log("Database initialization failed: " . $initEx->getMessage());
        }
    }
}

// Ensure payroll tables exist
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `global_salary_settings` (`id` int(11) NOT NULL AUTO_INCREMENT, `allowances` longtext, `deductions` longtext, PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `salary_profiles` (`userId` varchar(50) NOT NULL, `isCustomSlab` tinyint(1), `allowances` longtext, `deductions` longtext, PRIMARY KEY (`userId`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `loans` (`id` varchar(50) NOT NULL, `userId` varchar(50), `type` varchar(50), `totalAmount` decimal(10,2), `monthlyInstallment` decimal(10,2), `remainingAmount` decimal(10,2), `issuedAt` varchar(50), PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `payroll_history` (`id` varchar(50) NOT NULL, `batchId` varchar(50), `userId` varchar(50), `startDate` varchar(50), `endDate` varchar(50), `netFixed` decimal(10,2), `absencyDeduction` decimal(10,2), `loanDeduction` decimal(10,2), `bonus` decimal(10,2), `otherDeduction` decimal(10,2), `netPay` decimal(10,2), `processedAt` varchar(50), PRIMARY KEY (`id`))");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `global_salary_settings` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `allowances` TEXT, `deductions` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `salary_profiles` (`userId` TEXT PRIMARY KEY, `isCustomSlab` INTEGER, `allowances` TEXT, `deductions` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `loans` (`id` TEXT PRIMARY KEY, `userId` TEXT, `type` TEXT, `totalAmount` REAL, `monthlyInstallment` REAL, `remainingAmount` REAL, `issuedAt` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `payroll_history` (`id` TEXT PRIMARY KEY, `batchId` TEXT, `userId` TEXT, `startDate` TEXT, `endDate` TEXT, `netFixed` REAL, `absencyDeduction` REAL, `loanDeduction` REAL, `bonus` REAL, `otherDeduction` REAL, `netPay` REAL, `processedAt` TEXT)");
    } catch (Exception $e2) {}
}
// Auto-add new columns if they are missing
$new_columns = [
    "ADD COLUMN `bloodGroup` varchar(10) DEFAULT NULL",
    "ADD COLUMN `designation` varchar(100) DEFAULT NULL",
    "ADD COLUMN `salary` decimal(10,2) NOT NULL DEFAULT '0.00'",
    "ADD COLUMN `startDate` date DEFAULT NULL",
    "ADD COLUMN `endDate` date DEFAULT NULL",
    "ADD COLUMN `managerId` varchar(50) DEFAULT NULL",
    "ADD COLUMN `profilePic` longtext DEFAULT NULL",
    "ADD COLUMN `documents` longtext DEFAULT NULL",
    "ADD COLUMN `leaveBalances` longtext DEFAULT NULL"
];

foreach ($new_columns as $col) {
    try {
        $pdo->exec("ALTER TABLE users $col");
    } catch (Exception $e) {
        // Column likely already exists
    }
}

// Auto-migrate role enum and update existing 'Employee' roles to 'User'
try {
    $pdo->exec("ALTER TABLE users MODIFY COLUMN `role` enum('Admin','Manager','Employee','User') NOT NULL DEFAULT 'User'");
    $pdo->exec("UPDATE users SET role = 'User' WHERE role = 'Employee'");
} catch (Exception $e) {}

// Auto-upgrade attendance status column and add time columns
try {
    $pdo->exec("ALTER TABLE attendance MODIFY COLUMN `status` varchar(50) NOT NULL");
    $pdo->exec("ALTER TABLE attendance ADD COLUMN `timeIn` varchar(50) DEFAULT NULL");
    $pdo->exec("ALTER TABLE attendance ADD COLUMN `timeOut` varchar(50) DEFAULT NULL");
} catch (Exception $e) {}

// Ensure company_profile table exists (in case of an update)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `company_profile` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(150) DEFAULT NULL,
        `email` varchar(150) DEFAULT NULL,
        `phone` varchar(50) DEFAULT NULL,
        `website` varchar(150) DEFAULT NULL,
        `address` varchar(255) DEFAULT NULL,
        `reg` varchar(100) DEFAULT NULL,
        `slogan` varchar(255) DEFAULT NULL,
        `industry` varchar(100) DEFAULT NULL,
        `size` varchar(50) DEFAULT NULL,
        `type` varchar(50) DEFAULT NULL,
        `logoBase64` longtext DEFAULT NULL,
        `letterheadBase64` longtext DEFAULT NULL,
        `leaveTypes` longtext DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    $pdo->exec("ALTER TABLE company_profile ADD COLUMN `leaveTypes` longtext DEFAULT NULL");
    $pdo->exec("ALTER TABLE company_profile ADD COLUMN `letterheadBase64` longtext DEFAULT NULL");
} catch (Exception $e) {
    // Ignore if unsupported (e.g. SQLite doesn't support ENGINE=InnoDB)
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
            `leaveTypes` TEXT
        );");
        $pdo->exec("ALTER TABLE company_profile ADD COLUMN `leaveTypes` TEXT");
        $pdo->exec("ALTER TABLE company_profile ADD COLUMN `letterheadBase64` TEXT");
    } catch (Exception $e2) {
        error_log("Failed to create company_profile table: " . $e2->getMessage());
    }
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

if ($action === 'load_all') {
    try {
        $dbState = [];

        // Auto-detect login background image with any extension
        $bgFiles = glob(__DIR__ . '/../assets/images/login/login_bg.*');
        $bgUrl = 'assets/images/login/login_bg.png';
        if (!empty($bgFiles)) {
            $bgUrl = 'assets/images/login/' . basename($bgFiles[0]);
        }
        $dbState['login_bg'] = $bgUrl;

        // Fetch Users
        $stmt = $pdo->query("SELECT * FROM users");
        $usersRecords = $stmt->fetchAll();
        foreach ($usersRecords as &$u) {
            if (!empty($u['documents'])) {
                $u['documents'] = json_decode($u['documents'], true) ?: [];
            } else {
                $u['documents'] = [];
            }
            if (!empty($u['leaveBalances'])) {
                $u['leaveBalances'] = json_decode($u['leaveBalances'], true) ?: [];
            } else {
                $u['leaveBalances'] = [];
            }
        }
        if (empty($usersRecords)) {
            // Re-inject default admin if table is empty to prevent lockout
            $pdo->exec("INSERT INTO users (id, email, password, name, role, status) VALUES ('U1', 'admin@company.com', 'admin123', 'admin', 'Admin', 'Active')");
            $stmt = $pdo->query("SELECT * FROM users");
            $usersRecords = $stmt->fetchAll();
            foreach ($usersRecords as &$u) { $u['documents'] = []; $u['leaveBalances'] = []; }
        }
        $dbState['users'] = $usersRecords;

        // Fetch Settings (Weights)
        $stmt = $pdo->query("SELECT * FROM settings");
        $settings = $stmt->fetchAll();
        $weights = [];
        foreach ($settings as $row) {
            $weights[$row['key_name']] = (float)$row['value_data'];
        }
        $dbState['weights'] = $weights;

        // Fetch Leaves
        $stmt = $pdo->query("SELECT * FROM leaves");
        $dbState['leaves'] = $stmt->fetchAll();

        // Fetch Productivity
        $stmt = $pdo->query("SELECT * FROM productivity");
        $prodRecords = $stmt->fetchAll();
        foreach ($prodRecords as &$p) {
            $p['tasks'] = json_decode($p['tasks'], true) ?: [];
            $p['subcategories'] = json_decode($p['subcategories'], true) ?: [];
            $p['counts'] = json_decode($p['counts'], true) ?: [];
            $p['score'] = (float)$p['score'];
        }
        $dbState['productivity'] = $prodRecords;

        // Fetch Attendance
        $stmt = $pdo->query("SELECT * FROM attendance");
        $dbState['attendance'] = $stmt->fetchAll();

        // Fetch Announcements
        $stmt = $pdo->query("SELECT * FROM announcements");
        $dbState['announcements'] = $stmt->fetchAll();

        // Fetch Audit Logs
        $stmt = $pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
        $dbState['auditLogs'] = $stmt->fetchAll();

        // Fetch Notifications
        $stmt = $pdo->query("SELECT * FROM notifications ORDER BY time DESC");
        $notifs = $stmt->fetchAll();
        foreach ($notifs as &$n) {
            $n['read'] = $n['read_status'] == 1 ? true : false;
            unset($n['read_status']);
        }
        $dbState['notifications'] = $notifs;

        // Fetch Company Profile
        $stmt = $pdo->query("SELECT * FROM company_profile LIMIT 1");
        $cpRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($cpRow) {
            if (!empty($cpRow['leaveTypes'])) {
                $cpRow['leaveTypes'] = json_decode($cpRow['leaveTypes'], true) ?: [];
            } else {
                $cpRow['leaveTypes'] = [];
            }
            $dbState['companyProfile'] = $cpRow;
        } else {
            $dbState['companyProfile'] = new stdClass();
            $dbState['companyProfile']->leaveTypes = [];
        }

        // Fetch Payroll & Salary Data
        $stmt = $pdo->query("SELECT * FROM global_salary_settings LIMIT 1");
        $gRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($gRow) {
            $dbState['globalSalarySettings'] = [
                'allowances' => json_decode($gRow['allowances'] ?: '[]', true),
                'deductions' => json_decode($gRow['deductions'] ?: '[]', true)
            ];
        } else {
            $dbState['globalSalarySettings'] = ['allowances' => [], 'deductions' => []];
        }

        $stmt = $pdo->query("SELECT * FROM salary_profiles");
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($profiles as &$prof) {
            $prof['isCustomSlab'] = (bool)$prof['isCustomSlab'];
            $prof['allowances'] = json_decode($prof['allowances'] ?: '[]', true);
            $prof['deductions'] = json_decode($prof['deductions'] ?: '[]', true);
        }
        $dbState['salaryProfiles'] = $profiles;

        $stmt = $pdo->query("SELECT * FROM loans");
        $dbState['loans'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($dbState['loans'] as &$l) {
            $l['totalAmount'] = (float)$l['totalAmount'];
            $l['monthlyInstallment'] = (float)$l['monthlyInstallment'];
            $l['remainingAmount'] = (float)$l['remainingAmount'];
        }

        $stmt = $pdo->query("SELECT * FROM payroll_history");
        $dbState['payrollHistory'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($dbState['payrollHistory'] as &$ph) {
            $ph['netFixed'] = (float)$ph['netFixed'];
            $ph['absencyDeduction'] = (float)$ph['absencyDeduction'];
            $ph['loanDeduction'] = (float)$ph['loanDeduction'];
            $ph['bonus'] = (float)$ph['bonus'];
            $ph['otherDeduction'] = (float)$ph['otherDeduction'];
            $ph['netPay'] = (float)$ph['netPay'];
        }

        echo json_encode(["status" => "success", "data" => $dbState]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} 
elseif ($action === 'save_all') {
    // We receive the entire JSON state and sync the SQL tables
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);

    if (!$data) {
        echo json_encode(["status" => "error", "message" => "Invalid JSON payload"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Sync Users
        $pdo->exec("DELETE FROM users");
        if (!empty($data['users'])) {
            $stmt = $pdo->prepare("INSERT INTO users (id, email, password, name, role, managerId, status, salary, startDate, endDate, profilePic, documents, bloodGroup, designation, leaveBalances) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['users'] as $u) {
                $stmt->execute([
                    $u['id'], $u['email'], $u['password'], $u['name'], $u['role'], 
                    $u['managerId'] ?? '', $u['status'], 
                    $u['salary'] === '' ? 0 : ($u['salary'] ?? 0), 
                    $u['startDate'] === '' ? null : ($u['startDate'] ?? null), 
                    $u['endDate'] === '' ? null : ($u['endDate'] ?? null),
                    $u['profilePic'] ?? null,
                    !empty($u['documents']) ? json_encode($u['documents']) : null,
                    $u['bloodGroup'] ?? null,
                    $u['designation'] ?? null,
                    !empty($u['leaveBalances']) ? json_encode($u['leaveBalances']) : null
                ]);
            }
        }

        // 2. Sync Weights
        $pdo->exec("DELETE FROM settings");
        if (!empty($data['weights'])) {
            $stmt = $pdo->prepare("INSERT INTO settings (key_name, value_data) VALUES (?, ?)");
            foreach ($data['weights'] as $k => $v) {
                $stmt->execute([$k, $v]);
            }
        }

        // 3. Sync Leaves
        $pdo->exec("DELETE FROM leaves");
        if (!empty($data['leaves'])) {
            $stmt = $pdo->prepare("INSERT INTO leaves (id, employeeId, employeeName, type, startDate, endDate, reason, status, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['leaves'] as $l) {
                $stmt->execute([$l['id'], $l['employeeId'], $l['employeeName'], $l['type'], $l['startDate'], $l['endDate'], $l['reason'], $l['status'], $l['comments'] ?? '']);
            }
        }

        // 4. Sync Productivity
        $pdo->exec("DELETE FROM productivity");
        if (!empty($data['productivity'])) {
            $stmt = $pdo->prepare("INSERT INTO productivity (id, employeeId, employeeName, date, tasks, subcategories, counts, notes, score, status, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['productivity'] as $p) {
                $stmt->execute([
                    $p['id'], $p['employeeId'], $p['employeeName'], $p['date'],
                    json_encode($p['tasks']), json_encode($p['subcategories']), json_encode($p['counts']),
                    $p['notes'], $p['score'], $p['status'], $p['comments'] ?? ''
                ]);
            }
        }

        // 5. Sync Attendance
        $pdo->exec("DELETE FROM attendance");
        if (!empty($data['attendance'])) {
            $stmt = $pdo->prepare("INSERT INTO attendance (date, employeeId, employeeName, status, markedBy, timeIn, timeOut) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['attendance'] as $a) {
                $stmt->execute([$a['date'], $a['employeeId'], $a['employeeName'], $a['status'], $a['markedBy'] ?? 'System', $a['timeIn'] ?? null, $a['timeOut'] ?? null]);
            }
        }

        // 6. Sync Announcements
        $pdo->exec("DELETE FROM announcements");
        if (!empty($data['announcements'])) {
            $stmt = $pdo->prepare("INSERT INTO announcements (id, title, content, target, date, author) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($data['announcements'] as $a) {
                $stmt->execute([$a['id'], $a['title'], $a['content'], $a['target'], $a['date'], $a['author']]);
            }
        }

        // 7. Sync Audit Logs
        $pdo->exec("DELETE FROM audit_logs");
        if (!empty($data['auditLogs'])) {
            $stmt = $pdo->prepare("INSERT INTO audit_logs (timestamp, userId, userName, details) VALUES (?, ?, ?, ?)");
            foreach ($data['auditLogs'] as $al) {
                $stmt->execute([$al['timestamp'], $al['userId'], $al['userName'], $al['details']]);
            }
        }

        // 8. Sync Notifications
        $pdo->exec("DELETE FROM notifications");
        if (!empty($data['notifications'])) {
            $stmt = $pdo->prepare("INSERT INTO notifications (id, userId, message, read_status, time) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['notifications'] as $n) {
                $readStatus = (!empty($n['read']) && $n['read']) ? 1 : 0;
                $stmt->execute([$n['id'], $n['userId'], $n['message'], $readStatus, $n['time']]);
            }
        }

        // 9. Sync Company Profile
        $pdo->exec("DELETE FROM company_profile");
        if (!empty($data['companyProfile'])) {
            $cp = $data['companyProfile'];
            $stmt = $pdo->prepare("INSERT INTO company_profile (name, email, phone, website, address, reg, slogan, industry, size, type, logoBase64, letterheadBase64, leaveTypes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $cp['name'] ?? '', $cp['email'] ?? '', $cp['phone'] ?? '', $cp['website'] ?? '',
                $cp['address'] ?? '', $cp['reg'] ?? '', $cp['slogan'] ?? '', $cp['industry'] ?? '',
                $cp['size'] ?? '', $cp['type'] ?? '', $cp['logoBase64'] ?? '', $cp['letterheadBase64'] ?? '',
                !empty($cp['leaveTypes']) ? json_encode($cp['leaveTypes']) : null
            ]);
        }

        // 10. Sync Payroll & Salary Data
        $pdo->exec("DELETE FROM global_salary_settings");
        if (isset($data['globalSalarySettings'])) {
            $stmt = $pdo->prepare("INSERT INTO global_salary_settings (allowances, deductions) VALUES (?, ?)");
            $stmt->execute([
                json_encode($data['globalSalarySettings']['allowances'] ?? []),
                json_encode($data['globalSalarySettings']['deductions'] ?? [])
            ]);
        }

        $pdo->exec("DELETE FROM salary_profiles");
        if (!empty($data['salaryProfiles'])) {
            $stmt = $pdo->prepare("INSERT INTO salary_profiles (userId, isCustomSlab, allowances, deductions) VALUES (?, ?, ?, ?)");
            foreach ($data['salaryProfiles'] as $sp) {
                $stmt->execute([
                    $sp['userId'], !empty($sp['isCustomSlab']) ? 1 : 0,
                    json_encode($sp['allowances'] ?? []), json_encode($sp['deductions'] ?? [])
                ]);
            }
        }

        $pdo->exec("DELETE FROM loans");
        if (!empty($data['loans'])) {
            $stmt = $pdo->prepare("INSERT INTO loans (id, userId, type, totalAmount, monthlyInstallment, remainingAmount, issuedAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['loans'] as $l) {
                $stmt->execute([$l['id'], $l['userId'], $l['type'], $l['totalAmount'], $l['monthlyInstallment'], $l['remainingAmount'], $l['issuedAt']]);
            }
        }

        $pdo->exec("DELETE FROM payroll_history");
        if (!empty($data['payrollHistory'])) {
            $stmt = $pdo->prepare("INSERT INTO payroll_history (id, batchId, userId, startDate, endDate, netFixed, absencyDeduction, loanDeduction, bonus, otherDeduction, netPay, processedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['payrollHistory'] as $ph) {
                $stmt->execute([
                    $ph['id'], $ph['batchId'], $ph['userId'], $ph['startDate'], $ph['endDate'], 
                    $ph['netFixed'], $ph['absencyDeduction'], $ph['loanDeduction'], $ph['bonus'], $ph['otherDeduction'], $ph['netPay'], $ph['processedAt']
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Transaction Failed: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action specified."]);
}
?>
