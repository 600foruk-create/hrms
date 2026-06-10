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

// Ensure new productivity tables exist
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `practices` (`id` varchar(50) NOT NULL, `practice_name` varchar(150) NOT NULL, `practice_code` varchar(50) NOT NULL, PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `manager_practices` (`id` varchar(50) NOT NULL, `manager_id` varchar(50) NOT NULL, `practice_id` varchar(50) NOT NULL, PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_logs` (`id` varchar(50) NOT NULL, `employee_id` varchar(50) NOT NULL, `practice_id` varchar(50) NOT NULL, `log_date` date NOT NULL, `created_at` datetime NOT NULL, PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_tasks` (`id` varchar(50) NOT NULL, `log_id` varchar(50) NOT NULL, `task_type` varchar(100) NOT NULL, `total_count` int(11) NOT NULL DEFAULT '0', `time_minutes` int(11) NOT NULL DEFAULT '0', `extra_data` json DEFAULT NULL, `notes` text DEFAULT NULL, PRIMARY KEY (`id`))");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `practices` (`id` TEXT PRIMARY KEY, `practice_name` TEXT, `practice_code` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `manager_practices` (`id` TEXT PRIMARY KEY, `manager_id` TEXT, `practice_id` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_logs` (`id` TEXT PRIMARY KEY, `employee_id` TEXT, `practice_id` TEXT, `log_date` TEXT, `created_at` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_tasks` (`id` TEXT PRIMARY KEY, `log_id` TEXT, `task_type` TEXT, `total_count` INTEGER, `time_minutes` INTEGER, `extra_data` TEXT, `notes` TEXT)");
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
    "ADD COLUMN `displayId` varchar(50) DEFAULT NULL",
    "ADD COLUMN `fatherName` varchar(100) DEFAULT NULL",
    "ADD COLUMN `gender` varchar(20) DEFAULT NULL",
    "ADD COLUMN `dob` date DEFAULT NULL",
    "ADD COLUMN `cnic` varchar(50) DEFAULT NULL",
    "ADD COLUMN `maritalStatus` varchar(50) DEFAULT NULL",
    "ADD COLUMN `phone` varchar(50) DEFAULT NULL",
    "ADD COLUMN `emergencyContact` varchar(100) DEFAULT NULL",
    "ADD COLUMN `bankName` varchar(100) DEFAULT NULL",
    "ADD COLUMN `accountTitle` varchar(100) DEFAULT NULL",
    "ADD COLUMN `accountNumber` varchar(100) DEFAULT NULL",
    "ADD COLUMN `iban` varchar(100) DEFAULT NULL",
    "ADD COLUMN `branchCode` varchar(50) DEFAULT NULL",
    "ADD COLUMN `themeColor` varchar(50) DEFAULT NULL"
];

foreach ($new_columns as $col) {
    try {
        $pdo->exec("ALTER TABLE users $col");
    } catch (Exception $e) {
        // Column likely already exists
    }
}

// Clean up normalized columns if they exist (MySQL only)
try { $pdo->exec("ALTER TABLE users DROP COLUMN `documents`"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE users DROP COLUMN `leaveBalances`"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE company_profile DROP COLUMN `leaveTypes`"); } catch (Exception $e) {}
try { $pdo->exec("DROP TABLE IF EXISTS `settings`"); } catch (Exception $e) {}

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
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `leaveTypes` longtext DEFAULT NULL"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `letterheadBase64` longtext DEFAULT NULL"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `signatureBase64` longtext DEFAULT NULL"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `idCardFrontBase64` longtext DEFAULT NULL"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `idCardBackBase64` longtext DEFAULT NULL"); } catch (Exception $ex) {}
    
    // Ensure bank_profile table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `bank_profile` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `bankName` varchar(150) DEFAULT NULL,
        `bankBranchCode` varchar(50) DEFAULT NULL,
        `bankAccountNo` varchar(100) DEFAULT NULL,
        `signatory` varchar(150) DEFAULT NULL,
        `signatoryDesignation` varchar(150) DEFAULT NULL,
        `bankLetterHeader` longtext DEFAULT NULL,
        `bankLetterFooter` longtext DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    // Add Payroll columns to company_profile
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockEnabled` tinyint(1) DEFAULT 0"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockDate` int(11) DEFAULT 1"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockStartDate` varchar(50) DEFAULT NULL"); } catch (Exception $ex) {}
    try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockEndDate` varchar(50) DEFAULT NULL"); } catch (Exception $ex) {}
    
    // Phase 1: Database Normalization Tables
    $pdo->exec("CREATE TABLE IF NOT EXISTS `employee_documents` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `employee_id` varchar(100) NOT NULL,
        `doc_name` varchar(255) NOT NULL,
        `doc_url` longtext NOT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `employee_leave_balances` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `employee_id` varchar(100) NOT NULL,
        `leave_type` varchar(100) NOT NULL,
        `balance` int(11) NOT NULL DEFAULT 0,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `company_leave_types` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `type_id` varchar(100) NOT NULL,
        `name` varchar(150) NOT NULL,
        `allowance` int(11) NOT NULL DEFAULT 0,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
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
            `signatureBase64` TEXT,
            `leaveTypes` TEXT
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `bank_profile` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `bankName` TEXT,
            `bankBranchCode` TEXT,
            `bankAccountNo` TEXT,
            `signatory` TEXT,
            `signatoryDesignation` TEXT,
            `bankLetterHeader` TEXT,
            `bankLetterFooter` TEXT
        )");
        
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockEnabled` INTEGER DEFAULT 0"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockDate` INTEGER DEFAULT 1"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockStartDate` TEXT"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `payrollLockEndDate` TEXT"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `idCardFrontBase64` TEXT"); } catch (Exception $ex) {}
        try { $pdo->exec("ALTER TABLE company_profile ADD COLUMN `idCardBackBase64` TEXT"); } catch (Exception $ex) {}
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `employee_documents` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `employee_id` TEXT NOT NULL,
            `doc_name` TEXT NOT NULL,
            `doc_url` TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `employee_leave_balances` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `employee_id` TEXT NOT NULL,
            `leave_type` TEXT NOT NULL,
            `balance` INTEGER NOT NULL DEFAULT 0
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `company_leave_types` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `type_id` TEXT NOT NULL,
            `name` TEXT NOT NULL,
            `allowance` INTEGER NOT NULL DEFAULT 0
        )");
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
        
        // Fetch Normalized User Data
        $docStmt = $pdo->query("SELECT employee_id, doc_name as name, doc_url as url FROM employee_documents");
        $allDocs = $docStmt->fetchAll();
        
        $balStmt = $pdo->query("SELECT employee_id, leave_type as id, balance FROM employee_leave_balances");
        $allBals = $balStmt->fetchAll();

        foreach ($usersRecords as &$u) {
            $origDocs = $u['documents'] ?? '';
            $origBals = $u['leaveBalances'] ?? '';
            
            $u['documents'] = array_values(array_filter($allDocs, function($d) use ($u) { return $d['employee_id'] === $u['id']; }));
            if (empty($u['documents']) && !empty($origDocs)) {
                $u['documents'] = json_decode($origDocs, true) ?: [];
            }
            
            $u['leaveBalances'] = array_values(array_filter($allBals, function($b) use ($u) { return $b['employee_id'] === $u['id']; }));
            // Convert balance strings to integers
            foreach ($u['leaveBalances'] as &$lb) { $lb['balance'] = (int)$lb['balance']; }
            
            if (empty($u['leaveBalances']) && !empty($origBals)) {
                $u['leaveBalances'] = json_decode($origBals, true) ?: [];
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

        // Legacy Settings (Weights) removed
        $dbState['weights'] = [];

        // Fetch Leaves
        $stmt = $pdo->query("SELECT * FROM leaves");
        $dbState['leaves'] = $stmt->fetchAll();

        // Fetch Productivity Data (Safe queries to prevent login breaks if tables missing)
        try {
            $stmt = $pdo->query("SELECT * FROM practices");
            $dbState['practices'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { $dbState['practices'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM manager_practices");
            $dbState['manager_practices'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { $dbState['manager_practices'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM productivity_logs");
            $dbState['productivity_logs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { $dbState['productivity_logs'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM productivity_tasks");
            $prodTasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($prodTasks as &$pt) {
                $pt['extra_data'] = $pt['extra_data'] ? json_decode($pt['extra_data'], true) : [];
                $pt['total_count'] = (int)$pt['total_count'];
                $pt['time_minutes'] = (int)$pt['time_minutes'];
            }
            $dbState['productivity_tasks'] = $prodTasks;
        } catch (Exception $e) { $dbState['productivity_tasks'] = []; }

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
            $origLeaveTypes = $cpRow['leaveTypes'] ?? '';
            
            $cltStmt = $pdo->query("SELECT type_id as id, name, allowance FROM company_leave_types");
            $cpRow['leaveTypes'] = $cltStmt->fetchAll();
            foreach ($cpRow['leaveTypes'] as &$lt) { $lt['allowance'] = (int)$lt['allowance']; }
            
            if (empty($cpRow['leaveTypes']) && !empty($origLeaveTypes)) {
                $cpRow['leaveTypes'] = json_decode($origLeaveTypes, true) ?: [];
            }
            $dbState['companyProfile'] = $cpRow;
        } else {
            $dbState['companyProfile'] = new stdClass();
            $dbState['companyProfile']->leaveTypes = [];
        }

        // Fetch Bank Profile
        $stmt = $pdo->query("SELECT * FROM bank_profile LIMIT 1");
        $bpRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($bpRow) {
            $dbState['bankProfile'] = $bpRow;
        } else {
            $dbState['bankProfile'] = new stdClass();
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
        $pdo->exec("DELETE FROM employee_documents");
        $pdo->exec("DELETE FROM employee_leave_balances");

        if (!empty($data['users'])) {
            $stmt = $pdo->prepare("INSERT INTO users (id, displayId, email, password, name, role, managerId, status, salary, startDate, endDate, profilePic, bloodGroup, designation, fatherName, gender, dob, cnic, maritalStatus, phone, emergencyContact, bankName, accountTitle, accountNumber, iban, branchCode, themeColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $docStmt = $pdo->prepare("INSERT INTO employee_documents (employee_id, doc_name, doc_url) VALUES (?, ?, ?)");
            $balStmt = $pdo->prepare("INSERT INTO employee_leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?)");
            
            foreach ($data['users'] as $u) {
                $stmt->execute([
                    $u['id'], $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                    $u['managerId'] ?? null, $u['status'], $u['salary'], $u['startDate'], $u['endDate'], 
                    $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                    $u['fatherName'] ?? null, $u['gender'] ?? null, $u['dob'] === '' ? null : ($u['dob'] ?? null),
                    $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                    $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                    $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                    $u['themeColor'] ?? null
                ]);
                
                if (!empty($u['documents']) && is_array($u['documents'])) {
                    foreach ($u['documents'] as $doc) {
                        $docStmt->execute([$u['id'], $doc['name'] ?? '', $doc['url'] ?? '']);
                    }
                }
                
                if (!empty($u['leaveBalances']) && is_array($u['leaveBalances'])) {
                    foreach ($u['leaveBalances'] as $bal) {
                        $balStmt->execute([$u['id'], $bal['id'] ?? '', (int)($bal['balance'] ?? 0)]);
                    }
                }
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
        try { $pdo->exec("DELETE FROM practices"); } catch (Exception $e) {}
        if (!empty($data['practices'])) {
            $stmt = $pdo->prepare("INSERT INTO practices (id, practice_name, practice_code) VALUES (?, ?, ?)");
            foreach ($data['practices'] as $p) {
                $stmt->execute([$p['id'], $p['practice_name'], $p['practice_code']]);
            }
        }

        try { $pdo->exec("DELETE FROM manager_practices"); } catch (Exception $e) {}
        if (!empty($data['manager_practices'])) {
            $stmt = $pdo->prepare("INSERT INTO manager_practices (id, manager_id, practice_id) VALUES (?, ?, ?)");
            foreach ($data['manager_practices'] as $mp) {
                $stmt->execute([$mp['id'], $mp['manager_id'], $mp['practice_id']]);
            }
        }

        try { $pdo->exec("DELETE FROM productivity_logs"); } catch (Exception $e) {}
        if (!empty($data['productivity_logs'])) {
            $stmt = $pdo->prepare("INSERT INTO productivity_logs (id, employee_id, practice_id, log_date, created_at) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['productivity_logs'] as $pl) {
                $stmt->execute([$pl['id'], $pl['employee_id'], $pl['practice_id'], $pl['log_date'], $pl['created_at']]);
            }
        }

        try { $pdo->exec("DELETE FROM productivity_tasks"); } catch (Exception $e) {}
        if (!empty($data['productivity_tasks'])) {
            $stmt = $pdo->prepare("INSERT INTO productivity_tasks (id, log_id, task_type, total_count, time_minutes, extra_data, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['productivity_tasks'] as $pt) {
                $stmt->execute([$pt['id'], $pt['log_id'], $pt['task_type'], $pt['total_count'], $pt['time_minutes'], $pt['extra_data'] ? json_encode($pt['extra_data']) : null, $pt['notes']]);
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
        $pdo->exec("DELETE FROM company_leave_types");
        if (!empty($data['companyProfile'])) {
            $cp = $data['companyProfile'];
            $stmt = $pdo->prepare("INSERT INTO company_profile (name, email, phone, website, address, reg, slogan, industry, size, type, logoBase64, letterheadBase64, signatureBase64, idCardFrontBase64, idCardBackBase64, leaveTypes, payrollLockEnabled, payrollLockDate, payrollLockStartDate, payrollLockEndDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $cp['name'] ?? '', $cp['email'] ?? '', $cp['phone'] ?? '', $cp['website'] ?? '',
                $cp['address'] ?? '', $cp['reg'] ?? '', $cp['slogan'] ?? '', $cp['industry'] ?? '',
                $cp['size'] ?? '', $cp['type'] ?? '', $cp['logoBase64'] ?? '', $cp['letterheadBase64'] ?? '',
                $cp['signatureBase64'] ?? '',
                $cp['idCardFrontBase64'] ?? '', $cp['idCardBackBase64'] ?? '',
                !empty($cp['leaveTypes']) ? json_encode($cp['leaveTypes']) : null,
                !empty($cp['payrollLockEnabled']) ? 1 : 0, 
                $cp['payrollLockDate'] ?? 1,
                $cp['payrollLockStartDate'] ?? '', 
                $cp['payrollLockEndDate'] ?? ''
            ]);
            
            if (!empty($cp['leaveTypes']) && is_array($cp['leaveTypes'])) {
                $cltStmt = $pdo->prepare("INSERT INTO company_leave_types (type_id, name, allowance) VALUES (?, ?, ?)");
                foreach ($cp['leaveTypes'] as $lt) {
                    $cltStmt->execute([$lt['id'] ?? '', $lt['name'] ?? '', (int)($lt['allowance'] ?? 0)]);
                }
            }
        }
        
        // 9.5 Sync Bank Profile
        $pdo->exec("DELETE FROM bank_profile");
        if (!empty($data['bankProfile'])) {
            $bp = $data['bankProfile'];
            $stmt = $pdo->prepare("INSERT INTO bank_profile (bankName, bankBranchCode, bankAccountNo, signatory, signatoryDesignation, bankLetterHeader, bankLetterFooter) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $bp['bankName'] ?? '', $bp['bankBranchCode'] ?? '', $bp['bankAccountNo'] ?? '',
                $bp['signatory'] ?? '', $bp['signatoryDesignation'] ?? '',
                $bp['bankLetterHeader'] ?? '', $bp['bankLetterFooter'] ?? ''
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
} elseif ($action === 'save_user') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    if (!$data || !isset($data['user'])) {
        die(json_encode(["status" => "error", "message" => "Invalid JSON payload"]));
    }
    $u = $data['user'];
    try {
        $pdo->beginTransaction();
        
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$u['id']]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            $stmt = $pdo->prepare("UPDATE users SET displayId=?, email=?, password=?, name=?, role=?, managerId=?, status=?, salary=?, startDate=?, endDate=?, profilePic=?, bloodGroup=?, designation=?, fatherName=?, gender=?, dob=?, cnic=?, maritalStatus=?, phone=?, emergencyContact=?, bankName=?, accountTitle=?, accountNumber=?, iban=?, branchCode=?, themeColor=? WHERE id=?");
            $stmt->execute([
                $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                $u['managerId'] ?? null, $u['status'], $u['salary'], $u['startDate'], $u['endDate'], 
                $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                $u['fatherName'] ?? null, $u['gender'] ?? null, $u['dob'] === '' ? null : ($u['dob'] ?? null),
                $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                $u['themeColor'] ?? null, $u['id']
            ]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (id, displayId, email, password, name, role, managerId, status, salary, startDate, endDate, profilePic, bloodGroup, designation, fatherName, gender, dob, cnic, maritalStatus, phone, emergencyContact, bankName, accountTitle, accountNumber, iban, branchCode, themeColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $u['id'], $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                $u['managerId'] ?? null, $u['status'], $u['salary'], $u['startDate'], $u['endDate'], 
                $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                $u['fatherName'] ?? null, $u['gender'] ?? null, $u['dob'] === '' ? null : ($u['dob'] ?? null),
                $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                $u['themeColor'] ?? null
            ]);
        }
        
        $pdo->exec("DELETE FROM employee_documents WHERE employee_id = " . $pdo->quote($u['id']));
        $pdo->exec("DELETE FROM employee_leave_balances WHERE employee_id = " . $pdo->quote($u['id']));
        
        if (!empty($u['documents']) && is_array($u['documents'])) {
            $docStmt = $pdo->prepare("INSERT INTO employee_documents (employee_id, doc_name, doc_url) VALUES (?, ?, ?)");
            foreach ($u['documents'] as $doc) {
                $docStmt->execute([$u['id'], $doc['name'] ?? '', $doc['url'] ?? '']);
            }
        }
        
        if (!empty($u['leaveBalances']) && is_array($u['leaveBalances'])) {
            $balStmt = $pdo->prepare("INSERT INTO employee_leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?)");
            foreach ($u['leaveBalances'] as $bal) {
                $balStmt->execute([$u['id'], $bal['id'] ?? '', (int)($bal['balance'] ?? 0)]);
            }
        }
        
        $pdo->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Failed to save user: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action specified."]);
}
?>
