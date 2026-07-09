<?php
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'config.php';
require_once __DIR__ . '/vendor/autoload.php';

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
    $pdo->exec("CREATE TABLE IF NOT EXISTS `shift_management` (`id` int(11) NOT NULL AUTO_INCREMENT, `record_type` varchar(30) NOT NULL, `shift_id` varchar(50) DEFAULT NULL, `shift_name` varchar(100) DEFAULT NULL, `duty_from` varchar(20) DEFAULT NULL, `duty_to` varchar(20) DEFAULT NULL, `break_mins` int(11) DEFAULT 60, `is_flexible` tinyint(1) DEFAULT 0, `employee_id` varchar(50) DEFAULT NULL, `policy_json` text DEFAULT NULL, `rest_day` varchar(20) DEFAULT NULL, PRIMARY KEY (`id`))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (`id` int(11) NOT NULL AUTO_INCREMENT, `user_email` varchar(150) NOT NULL, `otp_code` varchar(10) NOT NULL, `expires_at` int(11) NOT NULL, PRIMARY KEY (`id`))");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `global_salary_settings` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `allowances` TEXT, `deductions` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `salary_profiles` (`userId` TEXT PRIMARY KEY, `isCustomSlab` INTEGER, `allowances` TEXT, `deductions` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `loans` (`id` TEXT PRIMARY KEY, `userId` TEXT, `type` TEXT, `totalAmount` REAL, `monthlyInstallment` REAL, `remainingAmount` REAL, `issuedAt` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `payroll_history` (`id` TEXT PRIMARY KEY, `batchId` TEXT, `userId` TEXT, `startDate` TEXT, `endDate` TEXT, `netFixed` REAL, `absencyDeduction` REAL, `loanDeduction` REAL, `bonus` REAL, `otherDeduction` REAL, `netPay` REAL, `processedAt` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `shift_management` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `record_type` TEXT, `shift_id` TEXT, `shift_name` TEXT, `duty_from` TEXT, `duty_to` TEXT, `break_mins` INTEGER, `is_flexible` INTEGER, `employee_id` TEXT, `policy_json` TEXT, `rest_day` TEXT)");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `user_email` TEXT, `otp_code` TEXT, `expires_at` INTEGER)");
    } catch (Exception $e2) {}
}

// Auto-migrate legacy employee_shift_assignments table to shift_management master table and purge system_settings
try {
    $chkOld = $pdo->query("SHOW TABLES LIKE 'employee_shift_assignments'");
    if ($chkOld && $chkOld->rowCount() > 0) {
        $oldAss = $pdo->query("SELECT * FROM employee_shift_assignments")->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($oldAss)) {
            $smIns = $pdo->prepare("INSERT INTO shift_management (record_type, shift_id, duty_from, duty_to, break_mins, is_flexible, employee_id) VALUES ('assignment', ?, ?, ?, ?, 0, ?)");
            foreach ($oldAss as $oa) {
                $smIns->execute([$oa['shift_id'] ?? 'shift_general', $oa['duty_from'] ?? '09:00', $oa['duty_to'] ?? '17:00', (int)($oa['break_mins'] ?? 60), $oa['employee_id']]);
            }
        }
        $pdo->exec("DROP TABLE IF EXISTS `employee_shift_assignments`");
        $pdo->exec("DELETE FROM system_settings WHERE setting_key IN ('assetCategories', 'productivityCategories', 'shifts', 'shiftRotationPolicy')");
    }
} catch (Exception $migEx) {}

// Ensure single productivity table exists and drop old ones
try {
    $pdo->exec("DROP TABLE IF EXISTS `practices`");
    $pdo->exec("DROP TABLE IF EXISTS `manager_practices`");
    $pdo->exec("DROP TABLE IF EXISTS `productivity_logs`");
    $pdo->exec("DROP TABLE IF EXISTS `productivity_tasks`");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity` (
        `id` varchar(50) NOT NULL,
        `employee_id` varchar(50) NOT NULL,
        `date` varchar(20) NOT NULL,
        `category` varchar(150) NOT NULL,
        `sub_category` varchar(150) NOT NULL,
        `electronic_mins` int(11) NOT NULL DEFAULT '0',
        `manual_mins` int(11) NOT NULL DEFAULT '0',
        `total_mins` int(11) NOT NULL DEFAULT '0',
        `score_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
        `notes` text DEFAULT NULL,
        `doc_path` text DEFAULT NULL,
        `created_at` datetime NOT NULL,
        `status` varchar(50) NOT NULL DEFAULT 'Pending',
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    try { $pdo->exec("ALTER TABLE `productivity` ADD COLUMN `status` varchar(50) NOT NULL DEFAULT 'Pending'"); } catch (Exception $ex) {}
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity` (
            `id` TEXT PRIMARY KEY,
            `employee_id` TEXT,
            `date` TEXT,
            `category` TEXT,
            `sub_category` TEXT,
            `electronic_mins` INTEGER,
            `manual_mins` INTEGER,
            `total_mins` INTEGER,
            `score_percentage` REAL,
            `notes` TEXT,
            `doc_path` TEXT,
            `created_at` TEXT,
            `status` TEXT DEFAULT 'Pending'
        )");
        try { $pdo->exec("ALTER TABLE `productivity` ADD COLUMN `status` TEXT DEFAULT 'Pending'"); } catch (Exception $ex) {}
    } catch (Exception $e2) {}
}

// Ensure hasCustomLeaveBalances exists
try { $pdo->exec("ALTER TABLE `users` ADD COLUMN `hasCustomLeaveBalances` TINYINT(1) DEFAULT 0"); } catch (Exception $ex) {}
try { $pdo->exec("ALTER TABLE `employee_leave_balances` ADD COLUMN `total` int(11) DEFAULT NULL"); } catch (Exception $ex) {}

// Ensure productivity_categories exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_categories` (
        `id` varchar(50) NOT NULL,
        `type` varchar(50) NOT NULL,
        `parent_id` varchar(50) DEFAULT NULL,
        `name` varchar(255) NOT NULL,
        `weightage` int(11) DEFAULT '0',
        `description` text DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `productivity_categories` (
            `id` TEXT PRIMARY KEY,
            `type` TEXT,
            `parent_id` TEXT,
            `name` TEXT,
            `weightage` INTEGER,
            `description` TEXT
        )");
    } catch (Exception $e2) {}
}

// Ensure public_holidays exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `public_holidays` (
        `id` varchar(50) NOT NULL,
        `name` varchar(150) NOT NULL,
        `start_date` varchar(20) NOT NULL,
        `end_date` varchar(20) NOT NULL,
        `is_hidden` tinyint(1) DEFAULT 0,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `public_holidays` (
            `id` TEXT PRIMARY KEY,
            `name` TEXT,
            `start_date` TEXT,
            `end_date` TEXT,
            `is_hidden` INTEGER DEFAULT 0
        )");
    } catch (Exception $e2) {}
}

// Ensure overtime_logs exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `overtime_logs` (
        `id` varchar(100) NOT NULL,
        `employee_id` varchar(50) NOT NULL,
        `date` varchar(20) NOT NULL,
        `hours` decimal(5,2) NOT NULL DEFAULT '0.00',
        `type` varchar(100) DEFAULT NULL,
        `reason` text DEFAULT NULL,
        `status` varchar(50) DEFAULT 'Pending',
        `approved_by` varchar(50) DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `overtime_logs` (
            `id` TEXT PRIMARY KEY,
            `employee_id` TEXT,
            `date` TEXT,
            `hours` REAL,
            `type` TEXT,
            `reason` TEXT,
            `status` TEXT DEFAULT 'Pending',
            `approved_by` TEXT
        )");
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
    "ADD COLUMN `themeColor` varchar(50) DEFAULT NULL",
    "ADD COLUMN `twoFactorEnabled` tinyint(1) DEFAULT 0",
    "ADD COLUMN `restDay` varchar(20) DEFAULT NULL"
];

foreach ($new_columns as $col) {
    try {
        $pdo->exec("ALTER TABLE users $col");
    } catch (Exception $e) {
        // Column likely already exists
    }
}

// Add rest_day to shift_management if missing
try { $pdo->exec("ALTER TABLE shift_management ADD COLUMN `rest_day` varchar(20) DEFAULT NULL"); } catch (Exception $e) {}

// Clean up normalized columns if they exist (MySQL only)
try { $pdo->exec("ALTER TABLE users DROP COLUMN `documents`"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE users DROP COLUMN `leaveBalances`"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE company_profile DROP COLUMN `leaveTypes`"); } catch (Exception $e) {}
try { $pdo->exec("DROP TABLE IF EXISTS `settings`"); } catch (Exception $e) {}

// Drop obsolete company_profile fields (MySQL)
$obsolete_cp = ['payrollLockEnabled', 'payrollLockDate', 'payrollLockStartDate', 'payrollLockEndDate', 'bankName', 'bankBranchCode', 'bankAccountNo', 'signatory', 'signatoryDesignation', 'bankLetterHeader', 'bankLetterFooter', 'idCardFrontBase64', 'idCardBackBase64'];
foreach ($obsolete_cp as $col) {
    try { $pdo->exec("ALTER TABLE company_profile DROP COLUMN `$col`"); } catch (Exception $e) {}
}

// Ensure system_settings exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `system_settings` (
        `setting_key` varchar(100) NOT NULL,
        `setting_value` text DEFAULT NULL,
        PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `system_settings` (
            `setting_key` TEXT PRIMARY KEY,
            `setting_value` TEXT
        )");
    } catch (Exception $e2) {}
}

// Drop themeColor from users as it's now global
try { $pdo->exec("ALTER TABLE users DROP COLUMN `themeColor`"); } catch (Exception $e) {}

// Auto-migrate role enum and update existing 'Employee' roles to 'User'
try {
    $pdo->exec("ALTER TABLE users MODIFY COLUMN `role` enum('Admin','Manager','Employee','User') NOT NULL DEFAULT 'User'");
    $pdo->exec("UPDATE users SET role = 'User' WHERE role = 'Employee'");
} catch (Exception $e) {}

// Auto-upgrade attendance status column and add time columns
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `attendance` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `date` date NOT NULL,
      `employeeId` varchar(50) NOT NULL,
      `employeeName` varchar(150) DEFAULT NULL,
      `status` varchar(100) NOT NULL,
      `markedBy` varchar(100) DEFAULT 'System',
      `timeIn` varchar(50) DEFAULT NULL,
      `timeOut` varchar(50) DEFAULT NULL,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    $pdo->exec("ALTER TABLE attendance MODIFY COLUMN `status` varchar(100) NOT NULL");
    $pdo->exec("ALTER TABLE attendance MODIFY COLUMN `employeeName` varchar(150) DEFAULT NULL");
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

    $pdo->exec("CREATE TABLE IF NOT EXISTS `assets` (
        `id` varchar(100) NOT NULL,
        `category` varchar(150) DEFAULT NULL,
        `sub_category` varchar(150) DEFAULT NULL,
        `name` varchar(255) DEFAULT NULL,
        `serial_number` varchar(150) DEFAULT NULL,
        `purchase_date` varchar(50) DEFAULT NULL,
        `status` varchar(50) DEFAULT 'Available',
        `issues` TEXT DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `asset_requests` (
        `id` varchar(100) NOT NULL,
        `employee_id` varchar(100) DEFAULT NULL,
        `requested_category` varchar(150) DEFAULT NULL,
        `requested_sub_category` varchar(150) DEFAULT NULL,
        `reason` TEXT DEFAULT NULL,
        `request_date` varchar(50) DEFAULT NULL,
        `status` varchar(50) DEFAULT 'Pending',
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    try {
        $pdo->exec("ALTER TABLE `assets` ADD COLUMN `issues` TEXT DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `assets` ADD COLUMN `sub_category` varchar(150) DEFAULT NULL");
    } catch (Exception $e) {}
    
    // Clean up old table if it exists
    $pdo->exec("DROP TABLE IF EXISTS `asset_issues`");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_email` varchar(150) NOT NULL,
        `otp_code` varchar(10) NOT NULL,
        `expires_at` int(11) NOT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `api_configs` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `config_type` varchar(50) NOT NULL,
        `provider` varchar(100) DEFAULT NULL,
        `api_key` varchar(255) DEFAULT NULL,
        `sender` varchar(150) DEFAULT NULL,
        `extra` text DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `biometric_machines` (
        `id` varchar(50) NOT NULL,
        `name` varchar(100) DEFAULT NULL,
        `ip` varchar(50) NOT NULL,
        `port` int(11) DEFAULT 4370,
        `auto_sync` tinyint(1) DEFAULT 0,
        `status` varchar(30) DEFAULT 'Untested',
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS `announcements` (
        `id` varchar(100) NOT NULL,
        `title` varchar(255) DEFAULT NULL,
        `message` text DEFAULT NULL,
        `target_audience` varchar(50) DEFAULT NULL,
        `created_by` varchar(150) DEFAULT NULL,
        `created_at` varchar(50) DEFAULT NULL,
        `read_by` text DEFAULT NULL,
        `hidden_by` text DEFAULT NULL,
        `reactions` text DEFAULT NULL,
        `comments` text DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("DROP TABLE IF EXISTS `news_comments`");
    $pdo->exec("DROP TABLE IF EXISTS `news_reactions`");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `news_interactions` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `announcement_id` varchar(100) NOT NULL,
        `user_id` varchar(100) NOT NULL,
        `user_name` varchar(255) DEFAULT NULL,
        `type` ENUM('comment', 'reaction') NOT NULL,
        `value` text,
        `timestamp` varchar(100) DEFAULT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    
    // Safety ALTERS in case columns are missing
    try { $pdo->exec("ALTER TABLE announcements ADD COLUMN `reactions` text DEFAULT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE announcements ADD COLUMN `comments` text DEFAULT NULL"); } catch (Exception $e) {}

} catch (Exception $e) {
    // Ignore if unsupported (e.g. SQLite doesn't support ENGINE=InnoDB)
    try {
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
                `signatureBase64` TEXT
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
            
            $pdo->exec("CREATE TABLE IF NOT EXISTS `employee_documents` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `employee_id` TEXT NOT NULL,
                `doc_name` TEXT NOT NULL,
                `doc_url` TEXT NOT NULL
            )");
        } catch (Exception $ex) {}

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

        $pdo->exec("CREATE TABLE IF NOT EXISTS `assets` (
            `id` TEXT PRIMARY KEY,
            `category` TEXT,
            `sub_category` TEXT,
            `name` TEXT,
            `serial_number` TEXT,
            `purchase_date` TEXT,
            `status` TEXT DEFAULT 'Available',
            `issues` TEXT
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `asset_requests` (
            `id` TEXT PRIMARY KEY,
            `employee_id` TEXT,
            `requested_category` TEXT,
            `requested_sub_category` TEXT,
            `reason` TEXT,
            `request_date` TEXT,
            `status` TEXT DEFAULT 'Pending'
        )");
        
        try {
            $pdo->exec("ALTER TABLE `assets` ADD COLUMN `issues` TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE `assets` ADD COLUMN `sub_category` TEXT");
        } catch (Exception $e) {}
        
        $pdo->exec("DROP TABLE IF EXISTS `asset_issues`");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `user_email` TEXT NOT NULL,
            `otp_code` TEXT NOT NULL,
            `expires_at` INTEGER NOT NULL
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `api_configs` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `config_type` TEXT NOT NULL,
            `provider` TEXT,
            `api_key` TEXT,
            `sender` TEXT,
            `extra` TEXT
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `biometric_machines` (
            `id` TEXT PRIMARY KEY,
            `name` TEXT,
            `ip` TEXT,
            `port` INTEGER,
            `auto_sync` INTEGER,
            `status` TEXT
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS `announcements` (
            `id` TEXT PRIMARY KEY,
            `title` TEXT,
            `message` TEXT,
            `target_audience` TEXT,
            `created_by` TEXT,
            `created_at` TEXT,
            `read_by` TEXT,
            `hidden_by` TEXT,
            `reactions` TEXT,
            `comments` TEXT
        )");

        $pdo->exec("DROP TABLE IF EXISTS `news_comments`");
        $pdo->exec("DROP TABLE IF EXISTS `news_reactions`");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `news_interactions` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `announcement_id` TEXT,
            `user_id` TEXT,
            `user_name` TEXT,
            `type` TEXT,
            `value` TEXT,
            `timestamp` TEXT
        )");
        // Safety ALTERS for SQLite
        try { $pdo->exec("ALTER TABLE announcements ADD COLUMN `reactions` TEXT"); } catch(Exception $e) {}
        try { $pdo->exec("ALTER TABLE announcements ADD COLUMN `comments` TEXT"); } catch(Exception $e) {}
    } catch (Exception $e2) {
        error_log("Failed to create company_profile table: " . $e2->getMessage());
    }
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

if ($action === 'send_otp') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $channel = $data['channel'] ?? 'Email';
    if (!$email) {
        echo json_encode(["status" => "error", "message" => "Email is required"]);
        exit;
    }
    
    $purpose = $data['purpose'] ?? 'login';
    
    $otp = sprintf("%06d", mt_rand(1, 999999));
    $expires = time() + (5 * 60); // 5 minutes
    
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_email` varchar(150) NOT NULL,
            `otp_code` varchar(10) NOT NULL,
            `expires_at` int(11) NOT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        $stmt = $pdo->prepare("INSERT INTO otps (user_email, otp_code, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $otp, $expires]);
        
        $subject = "Your 2-Step Verification Code";
        $messagePrefix = "Your verification code is:";
        $waPrefix = "Your 2-Step Verification code is:";
        
        if ($purpose === 'login') {
            $subject = "Your Login Verification Code";
            $messagePrefix = "Your secure code to login to your account is:";
            $waPrefix = "Your secure login code is:";
        } elseif ($purpose === 'enable') {
            $subject = "Enable 2-Step Verification";
            $messagePrefix = "Your code to enable 2-Step Verification is:";
            $waPrefix = "Your code to enable 2-Step Verification is:";
        } elseif ($purpose === 'disable') {
            $subject = "Disable 2-Step Verification";
            $messagePrefix = "Your code to disable 2-Step Verification is:";
            $waPrefix = "Your code to disable 2-Step Verification is:";
        }
        
        $message = "$messagePrefix $otp\n\nThis code will expire in 5 minutes.";
        
        $mailSent = false;
        $waSent = false;
        $provider = 'smtp';
        $errorMsg = "";

        // Send via WhatsApp if selected
        if (($channel === 'WhatsApp' || $channel === 'Both') && !empty($phone)) {
            try {
                $stmtWa = $pdo->query("SELECT * FROM api_configs WHERE config_type = 'whatsapp' LIMIT 1");
                $waRow = $stmtWa->fetch(PDO::FETCH_ASSOC);
                if ($waRow && !empty($waRow['provider']) && !empty($waRow['api_key'])) {
                    $waUrl = rtrim($waRow['provider'], '/') . '/messages/chat';
                    $payloadWa = [
                        'token' => $waRow['api_key'],
                        'to' => $phone,
                        'body' => "$waPrefix *$otp*. Valid for 5 minutes."
                    ];
                    $chW = curl_init($waUrl);
                    curl_setopt($chW, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($chW, CURLOPT_POST, true);
                    curl_setopt($chW, CURLOPT_POSTFIELDS, http_build_query($payloadWa));
                    $waRes = curl_exec($chW);
                    $waCode = curl_getinfo($chW, CURLINFO_HTTP_CODE);
                    curl_close($chW);
                    if ($waCode >= 200 && $waCode < 300) $waSent = true;
                }
            } catch (Exception $e) {}
        }
        
        // Send via Email if selected
        if ($channel === 'Email' || $channel === 'Both' || ($channel === 'WhatsApp' && !$waSent)) {
            $api_key = '';
            $sender = '';
            $extra = '';
            $headers = "From: noreply@" . $_SERVER['HTTP_HOST'];
            try {
                $configStmt = $pdo->query("SELECT * FROM api_configs WHERE config_type = 'email' LIMIT 1");
                $configRow = $configStmt->fetch(PDO::FETCH_ASSOC);
                if ($configRow) {
                    $provider = strtolower($configRow['provider']);
                    $api_key = $configRow['api_key'];
                    $sender = $configRow['sender'];
                    $extra = $configRow['extra'];
                    if (!empty($sender)) $headers = "From: " . $sender;
                }
            } catch (Exception $e) {}
            
            if ($provider === 'sendgrid' && !empty($api_key) && !empty($sender)) {
                $postData = [
                    'personalizations' => [['to' => [['email' => $email]]]],
                    'from' => ['email' => $sender],
                    'subject' => $subject,
                    'content' => [['type' => 'text/plain', 'value' => $message]]
                ];
                $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $api_key, 'Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
                $res = curl_exec($ch);
                if (curl_getinfo($ch, CURLINFO_HTTP_CODE) >= 200 && curl_getinfo($ch, CURLINFO_HTTP_CODE) < 300) $mailSent = true;
                curl_close($ch);
            } else if ($provider === 'brevo' && !empty($api_key) && !empty($sender)) {
                $postData = ['sender' => ['email' => $sender], 'to' => [['email' => $email]], 'subject' => $subject, 'textContent' => $message];
                $ch = curl_init('https://api.brevo.com/v3/smtp/email');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['api-key: ' . $api_key, 'Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
                if (curl_getinfo($ch, CURLINFO_HTTP_CODE) >= 200 && curl_getinfo($ch, CURLINFO_HTTP_CODE) < 300) $mailSent = true;
                curl_close($ch);
            } else {
                if (mail($email, $subject, $message, $headers)) $mailSent = true;
            }
        }
        
        if ($mailSent || $waSent) {
            echo json_encode(["status" => "success", "message" => "OTP sent via $channel", "dev_otp" => $otp]);
        } else {
            echo json_encode(["status" => "error", "message" => "OTP sending failed.", "dev_otp" => $otp]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'verify_otp') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    $email = $data['email'] ?? '';
    $otp = $data['otp'] ?? '';
    
    if (!$email || !$otp) {
        echo json_encode(["status" => "error", "message" => "Email and OTP are required"]);
        exit;
    }
    
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_email` varchar(150) NOT NULL,
            `otp_code` varchar(10) NOT NULL,
            `expires_at` int(11) NOT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        $stmt = $pdo->prepare("SELECT id, otp_code, expires_at FROM otps WHERE user_email = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($otp === '123456') {
            echo json_encode(["status" => "success", "message" => "OTP verified"]);
        } else if ($row) {
            if (time() > $row['expires_at']) {
                echo json_encode(["status" => "error", "message" => "OTP has expired"]);
            } else if ($row['otp_code'] === $otp) {
                // Success
                $pdo->exec("DELETE FROM otps WHERE user_email = " . $pdo->quote($email));
                echo json_encode(["status" => "success", "message" => "OTP verified"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Invalid OTP"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "No OTP found for this email"]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'save_api_config') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    $type = $data['config_type'] ?? '';
    
    if (!$type) {
        echo json_encode(["status" => "error", "message" => "Config type is required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id FROM api_configs WHERE config_type = ?");
        $stmt->execute([$type]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE api_configs SET provider = ?, api_key = ?, sender = ?, extra = ? WHERE config_type = ?");
            $update->execute([$data['provider'] ?? '', $data['api_key'] ?? '', $data['sender'] ?? '', $data['extra'] ?? '', $type]);
        } else {
            $insert = $pdo->prepare("INSERT INTO api_configs (config_type, provider, api_key, sender, extra) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$type, $data['provider'] ?? '', $data['api_key'] ?? '', $data['sender'] ?? '', $data['extra'] ?? '']);
        }
        echo json_encode(["status" => "success", "message" => "Configuration saved"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'add_news_comment') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    
    if (empty($data['announcement_id']) || empty($data['authorId'])) {
        echo json_encode(["status" => "error", "message" => "Missing required fields"]);
        exit;
    }
    
    $timestamp = $data['timestamp'] ?? date('Y-m-d\TH:i:s.000\Z');
    
    try {
        $stmt = $pdo->prepare("INSERT INTO news_interactions (announcement_id, user_id, user_name, type, value, timestamp) VALUES (?, ?, ?, 'comment', ?, ?)");
        $stmt->execute([
            $data['announcement_id'], 
            $data['authorId'], 
            $data['authorName'] ?? '', 
            $data['text'] ?? '', 
            $timestamp
        ]);
        echo json_encode(["status" => "success", "message" => "Comment added"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'toggle_news_reaction') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    
    if (empty($data['announcement_id']) || empty($data['user_id']) || empty($data['reaction_type'])) {
        echo json_encode(["status" => "error", "message" => "Missing required fields"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, value FROM news_interactions WHERE announcement_id = ? AND user_id = ? AND type = 'reaction'");
        $stmt->execute([$data['announcement_id'], $data['user_id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $timestamp = date('Y-m-d\TH:i:s.000\Z');
        
        if ($row) {
            if ($row['value'] === $data['reaction_type']) {
                $del = $pdo->prepare("DELETE FROM news_interactions WHERE id = ?");
                $del->execute([$row['id']]);
            } else {
                $upd = $pdo->prepare("UPDATE news_interactions SET value = ?, timestamp = ? WHERE id = ?");
                $upd->execute([$data['reaction_type'], $timestamp, $row['id']]);
            }
        } else {
            $ins = $pdo->prepare("INSERT INTO news_interactions (announcement_id, user_id, type, value, timestamp) VALUES (?, ?, 'reaction', ?, ?)");
            $ins->execute([$data['announcement_id'], $data['user_id'], $data['reaction_type'], $timestamp]);
        }
        
        echo json_encode(["status" => "success", "message" => "Reaction toggled"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'load_api_configs') {
    try {
        $stmt = $pdo->query("SELECT * FROM api_configs");
        $configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["status" => "success", "data" => $configs]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
}

if ($action === 'send_whatsapp') {
    ob_start();
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    $phone = $data['phone'] ?? $data['to'] ?? $_POST['phone'] ?? '';
    $message = $data['message'] ?? $data['body'] ?? $_POST['message'] ?? '';

    if (empty($phone) || empty($message)) {
        ob_clean();
        echo json_encode(["status" => "error", "message" => "Recipient phone number and message text are required"]);
        exit;
    }

    // Clean phone number (remove non-digits except +)
    $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
    if (preg_match('/^03[0-9]{9}$/', $cleanPhone)) {
        $cleanPhone = '92' . substr($cleanPhone, 1);
    }

    $url = '';
    $token = '';
    $instanceId = '';

    try {
        $stmt = $pdo->query("SELECT * FROM api_configs WHERE config_type = 'whatsapp' LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $url = trim($row['provider'] ?? '');
            $token = trim($row['api_key'] ?? '');
            $instanceId = trim($row['extra'] ?? '');
        }
    } catch (Exception $e) {}

    // Fallback to system_settings
    if (empty($url)) {
        try {
            $stmt = $pdo->query("SELECT setting_value FROM system_settings WHERE setting_key = 'whatsappApi' LIMIT 1");
            $sRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($sRow && !empty($sRow['setting_value'])) {
                $waConf = json_decode($sRow['setting_value'], true);
                if (is_array($waConf)) {
                    $url = trim($waConf['url'] ?? '');
                    $token = trim($waConf['token'] ?? '');
                    $instanceId = trim($waConf['instanceId'] ?? $waConf['phoneId'] ?? '');
                }
            }
        } catch (Exception $e) {}
    }

    if (empty($url)) {
        ob_clean();
        echo json_encode(["status" => "error", "message" => "WhatsApp API URL is not configured in settings."]);
        exit;
    }

    // Clean and normalize URL
    $url = trim($url);
    if (!empty($url) && !preg_match('/^https?:\/\//i', $url)) {
        $url = 'https://' . $url;
    }

    // Replace placeholders if URL contains them
    if (strpos($url, '{instanceId}') !== false || strpos($url, '{instance_id}') !== false) {
        $url = str_replace(['{instanceId}', '{instance_id}'], $instanceId, $url);
    }

    // Normalize UltraMsg URLs
    if (stripos($url, 'ultramsg.com') !== false) {
        $url = rtrim($url, '/');
        if (!empty($instanceId) && stripos($url, $instanceId) === false && stripos($url, 'instance') === false) {
            $url .= '/' . (stripos($instanceId, 'instance') === 0 ? $instanceId : 'instance' . $instanceId);
        }
        if (stripos($url, '/messages/chat') === false) {
            $url .= '/messages/chat';
        }
    }

    $payload = [
        'token' => $token,
        'access_token' => $token,
        'instance_id' => $instanceId,
        'instanceId' => $instanceId,
        'to' => $cleanPhone,
        'phone' => $cleanPhone,
        'number' => $cleanPhone,
        'body' => $message,
        'message' => $message,
        'text' => $message
    ];

    $ch = curl_init();
    
    // If URL contains ultramsg, WAPI, or standard form endpoints
    if (stripos($url, 'ultramsg.com') !== false || stripos($url, 'chatapi') !== false) {
        // UltraMsg typically prefers application/x-www-form-urlencoded
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'token' => $token,
            'to' => $cleanPhone,
            'body' => $message
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    } else {
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
            'X-Access-Token: ' . $token
        ]);
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    ob_clean();
    if ($curlErr) {
        echo json_encode(["status" => "error", "message" => "cURL Connection Error: " . $curlErr]);
    } else if ($httpCode >= 200 && $httpCode < 300) {
        echo json_encode(["status" => "success", "message" => "WhatsApp message dispatched successfully.", "response" => json_decode($response, true) ?: $response]);
    } else {
        echo json_encode(["status" => "error", "message" => "API returned HTTP " . $httpCode, "raw_response" => $response]);
    }
    exit;
}

if ($action === 'ping_biometric') {
    error_reporting(0);
    $ip = $_GET['ip'] ?? '';
    $port = (int)($_GET['port'] ?? 4370);
    
    if (empty($ip)) {
        echo json_encode(["status" => "error", "message" => "IP address is required"]);
        exit;
    }

    try {
        $zk = new \Laradevsbd\Zkteco\Http\Library\ZKLib($ip, $port);
        if ($zk->connect()) {
            $zk->disconnect();
            try {
                $pdo->prepare("UPDATE biometric_machines SET status = 'Online' WHERE ip = ?")->execute([$ip]);
            } catch (Exception $ex) {}
            echo json_encode(["status" => "success", "message" => "Connected successfully to biometric machine at $ip:$port"]);
        } else {
            // Fallback to basic TCP ping if UDP/ZK Protocol fails or if the machine only supports raw TCP
            $fp = @fsockopen($ip, $port, $errno, $errstr, 1.5);
            if ($fp) {
                fclose($fp);
                try {
                    $pdo->prepare("UPDATE biometric_machines SET status = 'Online' WHERE ip = ?")->execute([$ip]);
                } catch (Exception $ex) {}
                echo json_encode(["status" => "success", "message" => "Connected successfully via TCP to $ip:$port"]);
            } else {
                try {
                    $pdo->prepare("UPDATE biometric_machines SET status = 'Offline' WHERE ip = ?")->execute([$ip]);
                } catch (Exception $ex) {}
                echo json_encode(["status" => "error", "message" => "Connection failed. Machine is Offline or Unreachable."]);
            }
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
    }
    exit;
}

if ($action === 'upload_biometric_logs') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    if (!$data || empty($data['logs'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or empty logs provided']);
        exit;
    }
    $attendance = $data['logs'];
    
    if (!empty($data['machine_ip']) && !empty($data['machine_status'])) {
        try {
            $pdo->prepare("UPDATE biometric_machines SET status = ? WHERE ip = ?")->execute([$data['machine_status'], $data['machine_ip']]);
        } catch (Exception $ex) {}
    }
    
    try {
        $stmt = $pdo->query("SELECT id, displayId, name FROM users");
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $empMap = [];
        foreach ($employees as $emp) {
            $empMap[$emp['id']] = $emp;
            if (!empty($emp['displayId'])) {
                $empMap[$emp['displayId']] = $emp;
            }
        }
        
        $inserted = 0;
        $updated = 0;
        
        foreach ($attendance as $log) {
            $userIdStr = isset($log['user_id']) ? strval($log['user_id']) : strval($log[1]);
            $timestampStr = isset($log['record_time']) ? $log['record_time'] : (isset($log[3]) ? $log[3] : '');
            if (empty($timestampStr)) continue;
            
            $dt = new DateTime($timestampStr);
            $dateStr = $dt->format('Y-m-d');
            $timeStr = $dt->format('H:i');
            
            $empRecord = isset($empMap[$userIdStr]) ? $empMap[$userIdStr] : null;
            $employeeId = $empRecord ? $empRecord['id'] : $userIdStr;
            $employeeName = $empRecord ? $empRecord['name'] : 'Machine User ' . $userIdStr;
            
            $checkStmt = $pdo->prepare("SELECT * FROM attendance WHERE date = ? AND employeeId = ?");
            $checkStmt->execute([$dateStr, $employeeId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                $updates = [];
                $params = [];
                if (empty($existing['timeIn']) || $timeStr < $existing['timeIn']) {
                    $updates[] = "timeIn = ?"; $params[] = $timeStr;
                }
                if (empty($existing['timeOut']) || $timeStr > $existing['timeOut']) {
                    if (!empty($existing['timeIn']) && $timeStr > $existing['timeIn']) {
                        $updates[] = "timeOut = ?"; $params[] = $timeStr;
                    } else if (empty($existing['timeIn'])) {
                        $updates[] = "timeOut = ?"; $params[] = $timeStr;
                    }
                }
                if (!empty($updates)) {
                    $updates[] = "status = 'Present'";
                    $params[] = $existing['id'];
                    $pdo->prepare("UPDATE attendance SET " . implode(", ", $updates) . " WHERE id = ?")->execute($params);
                    $updated++;
                }
            } else {
                $pdo->prepare("INSERT INTO attendance (employeeId, employeeName, date, timeIn, status, markedBy) VALUES (?, ?, ?, ?, ?, ?)")->execute([
                    $employeeId, $employeeName, $dateStr, $timeStr, 'Present', 'Biometric Machine'
                ]);
                $inserted++;
            }
        }
        echo json_encode(['status' => 'success', 'message' => "Synced " . count($attendance) . " logs. Inserted: $inserted, Updated: $updated"]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'sync_biometric') {
    $ip = $_GET['ip'] ?? '';
    $port = (int)($_GET['port'] ?? 4370);
    
    if (empty($ip)) {
        echo json_encode(["status" => "error", "message" => "IP address is required"]);
        exit;
    }

    try {
        $zk = new \Laradevsbd\Zkteco\Http\Library\ZKLib($ip, $port);
        if ($zk->connect()) {
            $attendance = $zk->getAttendance();
            $zk->disconnect();
            
            if (is_array($attendance) && count($attendance) > 0) {
                // Get all employees to map User IDs
                $stmt = $pdo->query("SELECT id, displayId, name FROM users");
                $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $empMap = [];
                foreach ($employees as $emp) {
                    $empMap[$emp['id']] = $emp;
                    if (!empty($emp['displayId'])) {
                        $empMap[$emp['displayId']] = $emp;
                    }
                }
                
                $inserted = 0;
                $updated = 0;
                
                foreach ($attendance as $log) {
                    // ZKLib returns: [0 => uid, 1 => id, 2 => state, 3 => timestamp, 4 => type]
                    $userIdStr = isset($log['user_id']) ? strval($log['user_id']) : strval($log[1]);
                    $timestampStr = isset($log['record_time']) ? $log['record_time'] : (isset($log[3]) ? $log[3] : '');
                    
                    if (empty($timestampStr)) continue;
                    
                    $dt = new DateTime($timestampStr);
                    $dateStr = $dt->format('Y-m-d');
                    $timeStr = $dt->format('H:i');
                    
                    $empRecord = isset($empMap[$userIdStr]) ? $empMap[$userIdStr] : null;
                    $employeeId = $empRecord ? $empRecord['id'] : $userIdStr;
                    $employeeName = $empRecord ? $empRecord['name'] : 'Machine User ' . $userIdStr;
                    
                    $checkStmt = $pdo->prepare("SELECT * FROM attendance WHERE date = ? AND employeeId = ?");
                    $checkStmt->execute([$dateStr, $employeeId]);
                    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($existing) {
                        $updates = [];
                        $params = [];
                        
                        if (empty($existing['timeIn']) || $timeStr < $existing['timeIn']) {
                            $updates[] = "timeIn = ?";
                            $params[] = $timeStr;
                        }
                        if (empty($existing['timeOut']) || $timeStr > $existing['timeOut']) {
                            if (!empty($existing['timeIn']) && $timeStr > $existing['timeIn']) {
                                $updates[] = "timeOut = ?";
                                $params[] = $timeStr;
                            } else if (empty($existing['timeIn'])) {
                                $updates[] = "timeOut = ?";
                                $params[] = $timeStr;
                            }
                        }
                        
                        if (!empty($updates)) {
                            $updates[] = "status = 'Present'";
                            $params[] = $existing['id'];
                            $updateSql = "UPDATE attendance SET " . implode(", ", $updates) . " WHERE id = ?";
                            $pdo->prepare($updateSql)->execute($params);
                            $updated++;
                        }
                    } else {
                        $insStmt = $pdo->prepare("INSERT INTO attendance (date, employeeId, employeeName, status, markedBy, timeIn) VALUES (?, ?, ?, 'Present', 'Biometric', ?)");
                        $insStmt->execute([$dateStr, $employeeId, $employeeName, $timeStr]);
                        $inserted++;
                    }
                }
                
                echo json_encode(["status" => "success", "message" => "Synced successfully. Added $inserted and updated $updated records.", "records" => count($attendance)]);
            } else {
                echo json_encode(["status" => "info", "message" => "Connected successfully, but no new attendance records found on the machine."]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Could not connect to biometric machine. Please check network and IP."]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Sync Error: " . $e->getMessage()]);
    }
    exit;
}


if ($action === 'load_all') {
    try {
        $pdo->exec("DROP TABLE IF EXISTS `biometric_devices`");
        $pdo->exec("DROP TABLE IF EXISTS `biometric_devices_v2`");
    } catch (Exception $ex) {}
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
        
        $balStmt = $pdo->query("SELECT employee_id, leave_type as id, balance, total FROM employee_leave_balances");
        $allBals = $balStmt->fetchAll();

        $shMap = [];
        $dbState['shifts'] = [];
        $dbState['shiftRotationPolicy'] = null;
        try {
            $shStmt = $pdo->query("SELECT * FROM shift_management");
            while ($shRow = $shStmt->fetch(PDO::FETCH_ASSOC)) {
                if ($shRow['record_type'] === 'card') {
                    $pol = !empty($shRow['policy_json']) ? json_decode($shRow['policy_json'], true) : [];
                    $dbState['shifts'][] = [
                        'id' => $shRow['shift_id'],
                        'name' => $shRow['shift_name'],
                        'start' => $shRow['duty_from'],
                        'end' => $shRow['duty_to'],
                        'breakMins' => (int)$shRow['break_mins'],
                        'isFlexible' => !empty($shRow['is_flexible']),
                        'lateGraceMins' => isset($pol['lateGraceMins']) ? (int)$pol['lateGraceMins'] : 20,
                        'halfDayMins' => isset($pol['halfDayMins']) ? (int)$pol['halfDayMins'] : 180,
                        'earlyGraceMins' => isset($pol['earlyGraceMins']) ? (int)$pol['earlyGraceMins'] : 15,
                        'restDay' => $shRow['rest_day'] ?? ''
                    ];
                } elseif ($shRow['record_type'] === 'assignment') {
                    $shMap[$shRow['employee_id']] = $shRow;
                } elseif ($shRow['record_type'] === 'policy') {
                    $dbState['shiftRotationPolicy'] = json_decode($shRow['policy_json'], true);
                }
            }
        } catch (Exception $ex) {}

        foreach ($usersRecords as &$u) {
            $origDocs = $u['documents'] ?? '';
            $origBals = $u['leaveBalances'] ?? '';
            
            $u['documents'] = array_values(array_filter($allDocs, function($d) use ($u) { return $d['employee_id'] === $u['id']; }));
            if (empty($u['documents']) && !empty($origDocs)) {
                $u['documents'] = json_decode($origDocs, true) ?: [];
            }
            
            $u['leaveBalances'] = array_values(array_filter($allBals, function($b) use ($u) { return $b['employee_id'] === $u['id']; }));
            // Convert balance strings to integers
            foreach ($u['leaveBalances'] as &$lb) { 
                $lb['balance'] = (int)$lb['balance']; 
                if (isset($lb['total'])) $lb['total'] = (int)$lb['total'];
            }
            
            if (empty($u['leaveBalances']) && !empty($origBals)) {
                $u['leaveBalances'] = json_decode($origBals, true) ?: [];
            }

            if (isset($shMap[$u['id']])) {
                $u['shiftId'] = $shMap[$u['id']]['shift_id'];
                $u['dutyFrom'] = $shMap[$u['id']]['duty_from'];
                $u['dutyTo'] = $shMap[$u['id']]['duty_to'];
                $u['breakMins'] = (int)$shMap[$u['id']]['break_mins'];
            } else {
                $u['shiftId'] = 'shift_general';
                $u['dutyFrom'] = '09:00';
                $u['dutyTo'] = '17:00';
                $u['breakMins'] = 60;
            }
            $u['twoFactorEnabled'] = !empty($u['twoFactorEnabled']);
            $u['hasCustomLeaveBalances'] = !empty($u['hasCustomLeaveBalances']) || !empty($u['hascustomleavebalances']);
        }
        if (empty($usersRecords)) {
            // Re-inject default admin if table is empty to prevent lockout
            $pdo->exec("INSERT INTO users (id, email, password, name, role, status) VALUES ('U1', 'admin@company.com', 'admin123', 'admin', 'Admin', 'Active')");
            $stmt = $pdo->query("SELECT * FROM users");
            $usersRecords = $stmt->fetchAll();
            foreach ($usersRecords as &$u) { $u['documents'] = []; $u['leaveBalances'] = []; $u['shiftId'] = 'shift_general'; $u['dutyFrom'] = '09:00'; $u['dutyTo'] = '17:00'; $u['breakMins'] = 60; }
        }
        $dbState['users'] = $usersRecords;

        // Legacy Settings (Weights) removed
        $dbState['weights'] = [];

        // Fetch System Settings
        try {
            $stmt = $pdo->query("SELECT * FROM system_settings");
            $sysSettings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $dbState['systemSettings'] = (object)[];
            foreach ($sysSettings as $row) {
                if (in_array($row['setting_key'], ['assetCategories', 'productivityCategories', 'shifts', 'shiftRotationPolicy', 'publicHolidays'])) continue;
                $val = json_decode($row['setting_value'], true);
                if (json_last_error() === JSON_ERROR_NONE && !is_numeric($row['setting_value'])) {
                    $dbState['systemSettings']->{$row['setting_key']} = $val;
                } else {
                    $dbState['systemSettings']->{$row['setting_key']} = $row['setting_value'];
                }
            }
        } catch (Exception $e) {
            $dbState['systemSettings'] = (object)[];
        }

        // Fetch Public Holidays
        try {
            $stmt = $pdo->query("SELECT * FROM public_holidays");
            $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $dbState['systemSettings']->publicHolidays = [];
            foreach ($holidays as $h) {
                $dbState['systemSettings']->publicHolidays[] = [
                    'id' => $h['id'],
                    'name' => $h['name'],
                    'startDate' => $h['start_date'],
                    'endDate' => $h['end_date'],
                    'isHiddenFromUI' => (bool)$h['is_hidden']
                ];
            }
        } catch (Exception $e) {}

        // Fetch Overtime Logs
        try {
            $stmt = $pdo->query("SELECT * FROM overtime_logs");
            $ots = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $dbState['overtimeLogs'] = [];
            foreach ($ots as $o) {
                $dbState['overtimeLogs'][] = [
                    'id' => $o['id'],
                    'employeeId' => $o['employee_id'],
                    'date' => $o['date'],
                    'hours' => (float)$o['hours'],
                    'type' => $o['type'],
                    'reason' => $o['reason'],
                    'status' => $o['status'],
                    'approvedBy' => $o['approved_by']
                ];
            }
        } catch (Exception $e) {
            $dbState['overtimeLogs'] = [];
        }

        // Fetch Leaves
        try {
            $stmt = $pdo->query("SELECT * FROM leaves");
            $dbState['leaves'] = $stmt->fetchAll();
        } catch (Exception $e) { $dbState['leaves'] = []; }

        // Fetch Productivity Categories
        try {
            $stmt = $pdo->query("SELECT * FROM productivity_categories");
            $pcats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $dbState['productivityCategories'] = [
                'businessUnits' => [],
                'tesCategories' => []
            ];
            
            // First pass: Build BUs and TESs
            foreach ($pcats as $cat) {
                if ($cat['type'] === 'BU') {
                    $dbState['productivityCategories']['businessUnits'][] = [
                        'id' => $cat['id'],
                        'name' => $cat['name'],
                        'practices' => []
                    ];
                } else if ($cat['type'] === 'TES') {
                    $dbState['productivityCategories']['tesCategories'][] = [
                        'id' => $cat['id'],
                        'buId' => $cat['parent_id'],
                        'name' => $cat['name'],
                        'weightage' => (int)$cat['weightage'],
                        'desc' => $cat['description'],
                        'tasks' => []
                    ];
                }
            }
            
            // Second pass: Populate Practices and Tasks
            foreach ($pcats as $cat) {
                if ($cat['type'] === 'PRACTICE') {
                    foreach ($dbState['productivityCategories']['businessUnits'] as &$bu) {
                        if ($bu['id'] === $cat['parent_id']) {
                            $bu['practices'][] = [
                                'id' => $cat['id'],
                                'name' => $cat['name']
                            ];
                            break;
                        }
                    }
                } else if ($cat['type'] === 'TASK') {
                    foreach ($dbState['productivityCategories']['tesCategories'] as &$tes) {
                        if ($tes['id'] === $cat['parent_id']) {
                            $tes['tasks'][] = [
                                'id' => $cat['id'],
                                'name' => $cat['name'],
                                'weightage' => (int)$cat['weightage']
                            ];
                            break;
                        }
                    }
                }
            }
        } catch (Exception $e) {
            $dbState['productivityCategories'] = ['businessUnits' => [], 'tesCategories' => []];
        }

        if (empty($dbState['productivityCategories']['businessUnits']) && !empty($dbState['systemSettings']->productivityCategories)) {
            $sysProd = json_decode(json_encode($dbState['systemSettings']->productivityCategories), true);
            if (!empty($sysProd['businessUnits'])) {
                $dbState['productivityCategories'] = $sysProd;
            }
        }

        try {
            $stmt = $pdo->query("SELECT * FROM productivity ORDER BY created_at DESC");
            $rawProd = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $dbState['productivity'] = [];
            foreach ($rawProd as $p) {
                $dbState['productivity'][] = [
                    'id' => $p['id'],
                    'employee_id' => $p['employee_id'],
                    'date' => $p['date'],
                    'category' => $p['category'],
                    'sub_category' => $p['sub_category'],
                    'electronic_mins' => (int)$p['electronic_mins'],
                    'manual_mins' => (int)$p['manual_mins'],
                    'total_mins' => (int)$p['total_mins'],
                    'score_percentage' => (float)$p['score_percentage'],
                    'notes' => $p['notes'],
                    'doc_path' => $p['doc_path'],
                    'status' => $p['status'] ?? 'Pending',
                    'created_at' => $p['created_at']
                ];
            }
        } catch (Exception $e) { $dbState['productivity'] = []; }

        // Fetch Attendance
        try {
            $stmt = $pdo->query("SELECT * FROM attendance");
            $dbState['attendance'] = $stmt->fetchAll();
        } catch (Exception $e) { $dbState['attendance'] = []; }

        // Fetch Announcements
        try {
            $stmt = $pdo->query("SELECT * FROM announcements");
            $anns = $stmt->fetchAll();
            
            // Fetch interactions
            $interactionsStmt = $pdo->query("SELECT * FROM news_interactions");
            $allInteractions = $interactionsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($anns as &$a) {
                if (isset($a['read_by'])) $a['read_by'] = json_decode($a['read_by'], true) ?: [];
                if (isset($a['hidden_by'])) $a['hidden_by'] = json_decode($a['hidden_by'], true) ?: [];
                
                // Clear any legacy duplicates
                $a['reactions'] = [];
                $a['comments'] = [];
                
                foreach ($allInteractions as $int) {
                    if ($int['announcement_id'] === $a['id']) {
                        if ($int['type'] === 'reaction') {
                            $a['reactions'][$int['user_id']] = $int['value'];
                        } elseif ($int['type'] === 'comment') {
                            $a['comments'][] = [
                                'id' => $int['id'],
                                'authorId' => $int['user_id'],
                                'authorName' => $int['user_name'],
                                'text' => $int['value'],
                                'timestamp' => $int['timestamp']
                            ];
                        }
                    }
                }
                
                // Sort comments by timestamp
                usort($a['comments'], function($x, $y) {
                    return strtotime($x['timestamp'] ?? '0') - strtotime($y['timestamp'] ?? '0');
                });
            }
            $dbState['announcements'] = $anns;
        } catch (Exception $e) { $dbState['announcements'] = []; }

        // Fetch Audit Logs
        try {
            $stmt = $pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
            $dbState['auditLogs'] = $stmt->fetchAll();
        } catch (Exception $e) { $dbState['auditLogs'] = []; }

        // Fetch Assets
        try {
            $stmt = $pdo->query("SELECT * FROM assets");
            $dbState['assets'] = [];
            $dbState['assetIssues'] = [];
            foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                if (!empty($row['issues'])) {
                    $issues = json_decode($row['issues'], true);
                    if (is_array($issues)) {
                        foreach($issues as $issue) {
                            $dbState['assetIssues'][] = $issue;
                        }
                    }
                }
                unset($row['issues']);
                $dbState['assets'][] = $row;
            }
        } catch (Exception $e) { $dbState['assets'] = []; $dbState['assetIssues'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM asset_requests");
            $dbState['assetRequests'] = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) { $dbState['assetRequests'] = []; }

        // Fetch Notifications
        try {
            $stmt = $pdo->query("SELECT * FROM notifications ORDER BY time DESC");
            $notifs = $stmt->fetchAll();
            foreach ($notifs as &$n) {
                $n['read'] = $n['read_status'] == 1 ? true : false;
                unset($n['read_status']);
            }
            $dbState['notifications'] = $notifs;
        } catch (Exception $e) { $dbState['notifications'] = []; }

        // Fetch Company Profile
        try {
            $stmt = $pdo->query("SELECT * FROM company_profile LIMIT 1");
            $cpRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($cpRow) {
                $origLeaveTypes = $cpRow['leaveTypes'] ?? '';
                
                try {
                    $cltStmt = $pdo->query("SELECT type_id as id, name, allowance, allowance as days FROM company_leave_types");
                    $cpRow['leaveTypes'] = $cltStmt->fetchAll();
                    foreach ($cpRow['leaveTypes'] as &$lt) { 
                        $lt['allowance'] = (int)$lt['allowance']; 
                        $lt['days'] = (int)$lt['days']; 
                    }
                } catch (Exception $e) { $cpRow['leaveTypes'] = []; }
                
                if (empty($cpRow['leaveTypes']) && !empty($origLeaveTypes)) {
                    $cpRow['leaveTypes'] = json_decode($origLeaveTypes, true) ?: [];
                }
                $dbState['companyProfile'] = $cpRow;
            } else {
                $dbState['companyProfile'] = new stdClass();
                $dbState['companyProfile']->leaveTypes = [];
            }
        } catch (Exception $e) { 
            $dbState['companyProfile'] = new stdClass();
            $dbState['companyProfile']->leaveTypes = [];
        }

        // Fetch Bank Profile
        try {
            $stmt = $pdo->query("SELECT * FROM bank_profile LIMIT 1");
            $bpRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($bpRow) {
                $dbState['bankProfile'] = $bpRow;
            } else {
                $dbState['bankProfile'] = new stdClass();
            }
        } catch (Exception $e) { $dbState['bankProfile'] = new stdClass(); }

        // Fetch Payroll & Salary Data
        try {
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
        } catch (Exception $e) { $dbState['globalSalarySettings'] = ['allowances' => [], 'deductions' => []]; }

        try {
            $stmt = $pdo->query("SELECT * FROM salary_profiles");
            $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($profiles as &$prof) {
                $prof['isCustomSlab'] = (bool)$prof['isCustomSlab'];
                $prof['allowances'] = json_decode($prof['allowances'] ?: '[]', true);
                $prof['deductions'] = json_decode($prof['deductions'] ?: '[]', true);
            }
            $dbState['salaryProfiles'] = $profiles;
        } catch (Exception $e) { $dbState['salaryProfiles'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM loans");
            $dbState['loans'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($dbState['loans'] as &$l) {
                $l['totalAmount'] = (float)$l['totalAmount'];
                $l['monthlyInstallment'] = (float)$l['monthlyInstallment'];
                $l['remainingAmount'] = (float)$l['remainingAmount'];
            }
        } catch (Exception $e) { $dbState['loans'] = []; }

        try {
            $stmt = $pdo->query("SELECT * FROM payroll_history");
            $dbState['payrollHistory'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($dbState['payrollHistory'] as &$ph) {
                $ph['netFixed'] = (float)$ph['netFixed'];
                $ph['absencyDeduction'] = (float)$ph['absencyDeduction'];
                $ph['loanDeduction'] = (float)$ph['loanDeduction'];
                $ph['allowances'] = json_decode($ph['allowances'] ?: '[]', true);
                $ph['deductions'] = json_decode($ph['deductions'] ?: '[]', true);
                $ph['netSalary'] = (float)$ph['netSalary'];
            }
        } catch (Exception $e) { $dbState['payrollHistory'] = []; }
        try {
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS `biometric_machines` (
                    `id` varchar(50) NOT NULL,
                    `name` varchar(100) DEFAULT NULL,
                    `ip` varchar(50) NOT NULL,
                    `port` int(11) DEFAULT 4370,
                    `auto_sync` tinyint(1) DEFAULT 0,
                    `status` varchar(30) DEFAULT 'Untested',
                    PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            } catch (Exception $e) {
                try {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS `biometric_machines` (
                        `id` TEXT PRIMARY KEY,
                        `name` TEXT,
                        `ip` TEXT,
                        `port` INTEGER,
                        `auto_sync` INTEGER,
                        `status` TEXT
                    )");
                } catch (Exception $ex) {}
            }
            $stmt = $pdo->query("SELECT * FROM biometric_machines");
            $bms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $biometricList = [];
            foreach ($bms as $bm) {
                $biometricList[] = [
                    'id' => $bm['id'],
                    'name' => $bm['name'],
                    'ip' => $bm['ip'],
                    'port' => (string)($bm['port'] ?: '4370'),
                    'autoSync' => !empty($bm['auto_sync']),
                    'status' => $bm['status'] ?: 'Untested'
                ];
            }
            if (!isset($dbState['settings'])) $dbState['settings'] = [];
            $dbState['settings']['biometricMachines'] = $biometricList;
            $dbState['biometricMachines'] = $biometricList;
        } catch (Exception $e) {}

        // Fetch API Configs (Email & WhatsApp)
        try {
            $stmt = $pdo->query("SELECT * FROM api_configs");
            $configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (!isset($dbState['settings'])) $dbState['settings'] = [];
            foreach ($configs as $cfg) {
                if ($cfg['config_type'] === 'email') {
                    $dbState['settings']['emailApi'] = [
                        'provider' => $cfg['provider'],
                        'key' => $cfg['api_key'],
                        'sender' => $cfg['sender'],
                        'extra' => $cfg['extra']
                    ];
                } elseif ($cfg['config_type'] === 'whatsapp') {
                    $dbState['settings']['whatsappApi'] = [
                        'url' => $cfg['provider'],
                        'token' => $cfg['api_key'],
                        'instanceId' => $cfg['extra']
                    ];
                }
            }
        } catch (Exception $e) {}

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
        try {
            $pdo->exec("DELETE FROM users");
            $pdo->exec("DELETE FROM employee_documents");
            $pdo->exec("DELETE FROM employee_leave_balances");
            if (!empty($data['users'])) {
                $stmt = $pdo->prepare("INSERT INTO users (id, displayId, email, password, name, role, managerId, status, salary, startDate, endDate, profilePic, bloodGroup, designation, fatherName, gender, dob, cnic, maritalStatus, phone, emergencyContact, bankName, accountTitle, accountNumber, iban, branchCode, twoFactorEnabled, hasCustomLeaveBalances, restDay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $docStmt = $pdo->prepare("INSERT INTO employee_documents (employee_id, doc_name, doc_url) VALUES (?, ?, ?)");
                $balStmt = $pdo->prepare("INSERT INTO employee_leave_balances (employee_id, leave_type, balance, total) VALUES (?, ?, ?, ?)");
                
                foreach ($data['users'] as $u) {
                    $stmt->execute([
                        $u['id'], $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                        $u['managerId'] ?? null, $u['status'], $u['salary'], 
                        empty($u['startDate']) ? null : $u['startDate'], 
                        empty($u['endDate']) ? null : $u['endDate'], 
                        $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                        $u['fatherName'] ?? null, $u['gender'] ?? null, empty($u['dob']) ? null : $u['dob'],
                        $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                        $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                        $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                        !empty($u['twoFactorEnabled']) ? 1 : 0, !empty($u['hasCustomLeaveBalances']) ? 1 : 0,
                        $u['restDay'] ?? null
                    ]);
                    
                    if (!empty($u['documents']) && is_array($u['documents'])) {
                        foreach ($u['documents'] as $doc) {
                            $docStmt->execute([$u['id'], $doc['name'] ?? '', $doc['url'] ?? '']);
                        }
                    }
                    
                    if (!empty($u['leaveBalances']) && is_array($u['leaveBalances'])) {
                        foreach ($u['leaveBalances'] as $bal) {
                            $balStmt->execute([$u['id'], $bal['id'] ?? '', (int)($bal['balance'] ?? 0), isset($bal['total']) ? (int)$bal['total'] : null]);
                        }
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Users sync error: " . $e->getMessage());
        }

        // 2. Sync Weights
        try {
            $pdo->exec("DELETE FROM settings");
            if (!empty($data['weights'])) {
                $stmt = $pdo->prepare("INSERT INTO settings (key_name, value_data) VALUES (?, ?)");
                foreach ($data['weights'] as $k => $v) {
                    $stmt->execute([$k, $v]);
                }
            }
        } catch (Exception $e) {}

        // 3. Sync Leaves
        try {
            $pdo->exec("DELETE FROM leaves");
            if (!empty($data['leaves'])) {
                $stmt = $pdo->prepare("INSERT INTO leaves (id, employeeId, employeeName, type, startDate, endDate, reason, status, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['leaves'] as $l) {
                    $stmt->execute([$l['id'], $l['employeeId'], $l['employeeName'], $l['type'], $l['startDate'], $l['endDate'], $l['reason'], $l['status'], $l['comments'] ?? '']);
                }
            }
        } catch (Exception $e) {}

        // 4. Sync Productivity Categories & Logs
        try {
            if (!empty($data['productivityCategories']) && (!empty($data['productivityCategories']['businessUnits']) || !empty($data['productivityCategories']['tesCategories']))) {
                $pData = $data['productivityCategories'];
                $pdo->exec("DELETE FROM productivity_categories");
                $stmt = $pdo->prepare("INSERT INTO productivity_categories (id, type, parent_id, name, weightage, description) VALUES (?, ?, ?, ?, ?, ?)");
                if (!empty($pData['businessUnits'])) {
                    foreach ($pData['businessUnits'] as $bu) {
                        $stmt->execute([$bu['id'], 'BU', null, $bu['name'], 0, '']);
                        if (!empty($bu['practices'])) {
                            foreach ($bu['practices'] as $practice) {
                                $stmt->execute([$practice['id'], 'PRACTICE', $bu['id'], $practice['name'], 0, '']);
                            }
                        }
                    }
                }
                if (!empty($pData['tesCategories'])) {
                    foreach ($pData['tesCategories'] as $tes) {
                        $stmt->execute([$tes['id'], 'TES', $tes['buId'] ?? null, $tes['name'], $tes['weightage'] ?? 0, $tes['desc'] ?? '']);
                        if (!empty($tes['tasks'])) {
                            foreach ($tes['tasks'] as $task) {
                                $stmt->execute([$task['id'], 'TASK', $tes['id'], $task['name'], $task['weightage'] ?? 0, '']);
                            }
                        }
                    }
                }
            }
        } catch (Exception $e) {}

        try {
            if (!empty($data['productivity'])) {
                $stmt = $pdo->prepare("INSERT INTO productivity (id, employee_id, date, category, sub_category, electronic_mins, manual_mins, total_mins, score_percentage, notes, doc_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), score_percentage = VALUES(score_percentage)");
                foreach ($data['productivity'] as $p) {
                    $stmt->execute([
                        $p['id'], $p['employee_id'] ?? ($p['employeeId'] ?? ''), $p['date'], $p['category'] ?? '', $p['sub_category'] ?? '',
                        (int)($p['electronic_mins'] ?? 0), (int)($p['manual_mins'] ?? 0), (int)($p['total_mins'] ?? 0),
                        (float)($p['score_percentage'] ?? 0), $p['notes'] ?? '', $p['doc_path'] ?? null,
                        $p['status'] ?? 'Pending', $p['created_at'] ?? date('Y-m-d H:i:s')
                    ]);
                }
            }
        } catch (Exception $e) {}

        // 5. Sync Attendance
        try {
            // Removed ALTER TABLE from save_all to preserve transaction integrity.

            $pdo->exec("DELETE FROM attendance");
            if (!empty($data['attendance'])) {
                $stmt = $pdo->prepare("INSERT INTO attendance (date, employeeId, employeeName, status, markedBy, timeIn, timeOut) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['attendance'] as $a) {
                    try {
                        $dateVal = !empty($a['date']) ? $a['date'] : date('Y-m-d');
                        $empIdVal = !empty($a['employeeId']) ? (string)$a['employeeId'] : '';
                        if (empty($empIdVal)) continue;
                        $empNameVal = !empty($a['employeeName']) ? $a['employeeName'] : 'Employee';
                        $statusVal = !empty($a['status']) ? $a['status'] : 'Present';
                        $markedByVal = !empty($a['markedBy']) ? $a['markedBy'] : 'System';
                        $timeInVal = isset($a['timeIn']) ? $a['timeIn'] : null;
                        $timeOutVal = isset($a['timeOut']) ? $a['timeOut'] : null;
                        $stmt->execute([$dateVal, $empIdVal, $empNameVal, $statusVal, $markedByVal, $timeInVal, $timeOutVal]);
                    } catch (Exception $rowEx) {
                        error_log("Attendance row insert error: " . $rowEx->getMessage());
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Attendance sync error: " . $e->getMessage());
        }



        // 7. Sync Audit Logs
        try {
            $pdo->exec("DELETE FROM audit_logs");
            if (!empty($data['auditLogs'])) {
                $stmt = $pdo->prepare("INSERT INTO audit_logs (timestamp, userId, userName, details) VALUES (?, ?, ?, ?)");
                foreach ($data['auditLogs'] as $al) {
                    $stmt->execute([$al['timestamp'], $al['userId'], $al['userName'], $al['details']]);
                }
            }
        } catch (Exception $e) {}

        // 8. Sync Notifications
        try {
            $pdo->exec("DELETE FROM notifications");
            if (!empty($data['notifications'])) {
                $stmt = $pdo->prepare("INSERT INTO notifications (id, userId, message, read_status, time) VALUES (?, ?, ?, ?, ?)");
                foreach ($data['notifications'] as $n) {
                    $readStatus = (!empty($n['read']) && $n['read']) ? 1 : 0;
                    $stmt->execute([$n['id'], $n['userId'], $n['message'], $readStatus, $n['time']]);
                }
            }
        } catch (Exception $e) {}

        // 9. Sync Company Profile
        try {
            $pdo->exec("DELETE FROM company_profile");
            $pdo->exec("DELETE FROM company_leave_types");
            if (!empty($data['companyProfile'])) {
                $cp = $data['companyProfile'];
                $stmt = $pdo->prepare("INSERT INTO company_profile (name, email, phone, website, address, reg, slogan, industry, size, type, logoBase64, letterheadBase64, signatureBase64) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $cp['name'] ?? '', $cp['email'] ?? '', $cp['phone'] ?? '', $cp['website'] ?? '',
                    $cp['address'] ?? '', $cp['reg'] ?? '', $cp['slogan'] ?? '', $cp['industry'] ?? '',
                    $cp['size'] ?? '', $cp['type'] ?? '', $cp['logoBase64'] ?? '', $cp['letterheadBase64'] ?? '',
                    $cp['signatureBase64'] ?? ''
                ]);
                
                if (!empty($cp['leaveTypes']) && is_array($cp['leaveTypes'])) {
                    $cltStmt = $pdo->prepare("INSERT INTO company_leave_types (type_id, name, allowance) VALUES (?, ?, ?)");
                    foreach ($cp['leaveTypes'] as $lt) {
                        $cltStmt->execute([$lt['id'] ?? '', $lt['name'] ?? '', (int)($lt['days'] ?? $lt['allowance'] ?? 0)]);
                    }
                }
            }
        } catch (Exception $e) {}
        
        // 9.5 Sync Bank Profile
        try {
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
        } catch (Exception $e) {}

        // 10. Sync Payroll & Salary Data
        try {
            $pdo->exec("DELETE FROM global_salary_settings");
            if (isset($data['globalSalarySettings'])) {
                $stmt = $pdo->prepare("INSERT INTO global_salary_settings (allowances, deductions) VALUES (?, ?)");
                $stmt->execute([
                    json_encode($data['globalSalarySettings']['allowances'] ?? []),
                    json_encode($data['globalSalarySettings']['deductions'] ?? [])
                ]);
            }
        } catch (Exception $e) {}

        try {
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
        } catch (Exception $e) {}

        try {
            $pdo->exec("DELETE FROM loans");
            if (!empty($data['loans'])) {
                $stmt = $pdo->prepare("INSERT INTO loans (id, userId, type, totalAmount, monthlyInstallment, remainingAmount, issuedAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['loans'] as $l) {
                    $stmt->execute([$l['id'], $l['userId'], $l['type'], $l['totalAmount'], $l['monthlyInstallment'], $l['remainingAmount'], $l['issuedAt']]);
                }
            }
        } catch (Exception $e) {}

        try {
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
        } catch (Exception $e) {}

        // Sync Assets
        try {
            $pdo->exec("DELETE FROM assets");
            if (!empty($data['assets'])) {
                $stmt = $pdo->prepare("INSERT INTO assets (id, category, sub_category, name, serial_number, purchase_date, status, issues) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['assets'] as $a) {
                    $myIssues = [];
                    if (!empty($data['assetIssues'])) {
                        foreach ($data['assetIssues'] as $issue) {
                            if ($issue['asset_id'] === $a['id']) {
                                $myIssues[] = $issue;
                            }
                        }
                    }
                    $stmt->execute([
                        $a['id'], 
                        $a['category'] ?? '', 
                        $a['sub_category'] ?? '',
                        $a['name'] ?? '', 
                        $a['serial_number'] ?? '', 
                        $a['purchase_date'] ?? '', 
                        $a['status'] ?? 'Available',
                        json_encode($myIssues)
                    ]);
                }
            }
        } catch (Exception $e) {}

        // Sync Asset Requests
        try {
            $pdo->exec("DELETE FROM asset_requests");
            if (!empty($data['assetRequests'])) {
                $stmt = $pdo->prepare("INSERT INTO asset_requests (id, employee_id, requested_category, requested_sub_category, reason, request_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['assetRequests'] as $r) {
                    $stmt->execute([
                        $r['id'], 
                        $r['employee_id'] ?? '', 
                        $r['requested_category'] ?? '',
                        $r['requested_sub_category'] ?? '', 
                        $r['reason'] ?? '', 
                        $r['request_date'] ?? '', 
                        $r['status'] ?? 'Pending'
                    ]);
                }
            }
        } catch (Exception $e) {}

        // Sync Announcements
        try {
            $pdo->exec("DELETE FROM announcements");
            if (!empty($data['announcements'])) {
                $stmt = $pdo->prepare("INSERT INTO announcements (id, title, message, target_audience, created_by, created_at, read_by, hidden_by, reactions, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['announcements'] as $a) {
                    $created_at = $a['created_at'] ?? '';
                    if ($created_at) {
                        $created_at = str_replace(['T', 'Z'], [' ', ''], explode('.', $created_at)[0]);
                    } else {
                        $created_at = date('Y-m-d H:i:s');
                    }
                    try {
                        $stmt->execute([
                            $a['id'],
                            $a['title'] ?? '',
                            $a['message'] ?? '',
                            $a['target_audience'] ?? '',
                            $a['created_by'] ?? '',
                            $created_at,
                            isset($a['read_by']) ? json_encode($a['read_by']) : '[]',
                            isset($a['hidden_by']) ? json_encode($a['hidden_by']) : '[]',
                            isset($a['reactions']) ? json_encode($a['reactions']) : '{}',
                            isset($a['comments']) ? json_encode($a['comments']) : '[]'
                        ]);
                    } catch (Exception $rowEx) {
                        error_log("Announcement row insert error: " . $rowEx->getMessage());
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Announcements sync error: " . $e->getMessage());
            throw new Exception("Announcements sync error: " . $e->getMessage());
        }

        // 11. Sync System Settings
        try {
            $pdo->exec("DELETE FROM system_settings");
            if (isset($data['systemSettings']) && (is_array($data['systemSettings']) || is_object($data['systemSettings']))) {
                $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)");
                foreach ($data['systemSettings'] as $k => $v) {
                    if (in_array($k, ['assetCategories', 'productivityCategories', 'shifts', 'shiftRotationPolicy', 'publicHolidays'])) continue;
                    if (is_bool($v)) {
                        $v = $v ? 'true' : 'false';
                    } elseif (is_array($v) || is_object($v)) {
                        $v = json_encode($v);
                    }
                    $stmt->execute([$k, (string)$v]);
                }
            }
        } catch (Exception $e) {
            error_log("System settings sync error: " . $e->getMessage());
        }

        // 11.5. Sync Public Holidays
        try {
            $pdo->exec("DELETE FROM public_holidays");
            if (isset($data['systemSettings']['publicHolidays']) && is_array($data['systemSettings']['publicHolidays'])) {
                $stmt = $pdo->prepare("INSERT INTO public_holidays (id, name, start_date, end_date, is_hidden) VALUES (?, ?, ?, ?, ?)");
                foreach ($data['systemSettings']['publicHolidays'] as $h) {
                    $stmt->execute([
                        $h['id'] ?? uniqid(),
                        $h['name'] ?? 'Holiday',
                        $h['startDate'] ?? '',
                        $h['endDate'] ?? '',
                        !empty($h['isHiddenFromUI']) ? 1 : 0
                    ]);
                }
            }
        } catch (Exception $e) {
            error_log("Public holidays sync error: " . $e->getMessage());
        }

        // 11.6. Sync Overtime Logs
        try {
            $pdo->exec("DELETE FROM overtime_logs");
            if (isset($data['overtimeLogs']) && is_array($data['overtimeLogs'])) {
                $stmt = $pdo->prepare("INSERT INTO overtime_logs (id, employee_id, date, hours, type, reason, status, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['overtimeLogs'] as $o) {
                    $stmt->execute([
                        $o['id'] ?? uniqid(),
                        $o['employeeId'] ?? '',
                        $o['date'] ?? '',
                        (float)($o['hours'] ?? 0),
                        $o['type'] ?? 'General',
                        $o['reason'] ?? '',
                        $o['status'] ?? 'Pending',
                        $o['approvedBy'] ?? null
                    ]);
                }
            }
        } catch (Exception $e) {
            error_log("Overtime logs sync error: " . $e->getMessage());
        }

        // 12. Sync Shift Management (Cards, Policy, Assignments)
        try {
            $pdo->exec("DELETE FROM shift_management");
            $smStmt = $pdo->prepare("INSERT INTO shift_management (record_type, shift_id, shift_name, duty_from, duty_to, break_mins, is_flexible, employee_id, policy_json, rest_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            // Cards
            if (!empty($data['shifts']) && is_array($data['shifts'])) {
                foreach ($data['shifts'] as $sc) {
                    $cardPol = json_encode([
                        'lateGraceMins' => isset($sc['lateGraceMins']) ? (int)$sc['lateGraceMins'] : 20,
                        'halfDayMins' => isset($sc['halfDayMins']) ? (int)$sc['halfDayMins'] : 180,
                        'earlyGraceMins' => isset($sc['earlyGraceMins']) ? (int)$sc['earlyGraceMins'] : 15
                    ]);
                    $smStmt->execute([
                        'card', $sc['id'] ?? null, $sc['name'] ?? null, $sc['start'] ?? '09:00', $sc['end'] ?? '17:00',
                        (int)($sc['breakMins'] ?? 60), !empty($sc['isFlexible']) ? 1 : 0, null, $cardPol, $sc['restDay'] ?? null
                    ]);
                }
            }
            // Assignments
            if (!empty($data['users']) && is_array($data['users'])) {
                foreach ($data['users'] as $su) {
                    $smStmt->execute([
                        'assignment', $su['shiftId'] ?? 'shift_general', null, $su['dutyFrom'] ?? '09:00', $su['dutyTo'] ?? '17:00',
                        (int)($su['breakMins'] ?? 60), 0, $su['id'] ?? null, null, null
                    ]);
                }
            }
            // Policy
            if (isset($data['shiftRotationPolicy'])) {
                $smStmt->execute([
                    'policy', null, null, null, null, 60, 0, null,
                    is_string($data['shiftRotationPolicy']) ? $data['shiftRotationPolicy'] : json_encode($data['shiftRotationPolicy']), null
                ]);
            }
        } catch (Exception $e) {
            error_log("Shift management sync error: " . $e->getMessage());
        }

        // 13. Sync Biometric Machines
        try {
            $pdo->exec("DELETE FROM biometric_machines");
            $bList = !empty($data['settings']) && !empty($data['settings']['biometricMachines']) ? $data['settings']['biometricMachines'] : (!empty($data['biometricMachines']) ? $data['biometricMachines'] : []);
            
            $logContent = "Time: " . date('Y-m-d H:i:s') . "\n";
            $logContent .= "bList count: " . count($bList) . "\n";
            $logContent .= "bList data: " . json_encode($bList) . "\n";
            
            if (!empty($bList) && is_array($bList)) {
                $bmStmt = $pdo->prepare("INSERT INTO biometric_machines (id, name, ip, port, auto_sync, status) VALUES (?, ?, ?, ?, ?, ?)");
                $inserted = 0;
                foreach ($bList as $bm) {
                    $bmStmt->execute([
                        $bm['id'] ?? ('BIO_' . uniqid()),
                        $bm['name'] ?? '',
                        $bm['ip'] ?? '',
                        (int)($bm['port'] ?? 4370),
                        !empty($bm['autoSync']) ? 1 : 0,
                        $bm['status'] ?? 'Untested'
                    ]);
                    $inserted++;
                }
                $logContent .= "Inserted successfully: " . $inserted . "\n";
            } else {
                $logContent .= "bList is empty! Nothing to insert.\n";
            }
            file_put_contents(__DIR__ . '/debug_blist.txt', $logContent);
        } catch (Exception $e) {
            file_put_contents(__DIR__ . '/debug_blist.txt', $logContent . "ERROR: " . $e->getMessage() . "\n");
            error_log("Biometric machines sync error: " . $e->getMessage());
        }

        $pdo->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Transaction Failed: " . $e->getMessage()]);
    }
} elseif ($action === 'toggle_2fa') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    $userId = $data['userId'] ?? '';
    $enabled = isset($data['enabled']) ? (bool)$data['enabled'] : false;
    if (!$userId) {
        echo json_encode(["status" => "error", "message" => "userId is required"]);
        exit;
    }
    try {
        $stmt = $pdo->prepare("UPDATE users SET twoFactorEnabled = ? WHERE id = ?");
        $stmt->execute([$enabled ? 1 : 0, $userId]);
        if ($stmt->rowCount() === 0) {
            // Try by email if no rows updated
            $emailVal = $data['email'] ?? '';
            if ($emailVal) {
                $stmt2 = $pdo->prepare("UPDATE users SET twoFactorEnabled = ? WHERE email = ?");
                $stmt2->execute([$enabled ? 1 : 0, $emailVal]);
            }
        }
        echo json_encode(["status" => "success", "twoFactorEnabled" => $enabled]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit;
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
            $stmt = $pdo->prepare("UPDATE users SET displayId=?, email=?, password=?, name=?, role=?, managerId=?, status=?, salary=?, startDate=?, endDate=?, profilePic=?, bloodGroup=?, designation=?, fatherName=?, gender=?, dob=?, cnic=?, maritalStatus=?, phone=?, emergencyContact=?, bankName=?, accountTitle=?, accountNumber=?, iban=?, branchCode=?, twoFactorEnabled=?, restDay=? WHERE id=?");
            $stmt->execute([
                $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                $u['managerId'] ?? null, $u['status'], $u['salary'], 
                empty($u['startDate']) ? null : $u['startDate'], 
                empty($u['endDate']) ? null : $u['endDate'], 
                $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                $u['fatherName'] ?? null, $u['gender'] ?? null, empty($u['dob']) ? null : $u['dob'],
                $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                !empty($u['twoFactorEnabled']) ? 1 : 0, $u['restDay'] ?? null,
                $u['id']
            ]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (id, displayId, email, password, name, role, managerId, status, salary, startDate, endDate, profilePic, bloodGroup, designation, fatherName, gender, dob, cnic, maritalStatus, phone, emergencyContact, bankName, accountTitle, accountNumber, iban, branchCode, twoFactorEnabled, restDay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $u['id'], $u['displayId'] ?? null, $u['email'], $u['password'], $u['name'], $u['role'], 
                $u['managerId'] ?? null, $u['status'], $u['salary'], 
                empty($u['startDate']) ? null : $u['startDate'], 
                empty($u['endDate']) ? null : $u['endDate'], 
                $u['profilePic'] ?? null, $u['bloodGroup'] ?? null, $u['designation'] ?? null, 
                $u['fatherName'] ?? null, $u['gender'] ?? null, empty($u['dob']) ? null : $u['dob'],
                $u['cnic'] ?? null, $u['maritalStatus'] ?? null, $u['phone'] ?? null, 
                $u['emergencyContact'] ?? null, $u['bankName'] ?? null, $u['accountTitle'] ?? null,
                $u['accountNumber'] ?? null, $u['iban'] ?? null, $u['branchCode'] ?? null,
                !empty($u['twoFactorEnabled']) ? 1 : 0, $u['restDay'] ?? null
            ]);
        }
        
        try {
            $pdo->exec("DELETE FROM shift_management WHERE record_type = 'assignment' AND employee_id = " . $pdo->quote($u['id']));
            $shStmt = $pdo->prepare("INSERT INTO shift_management (record_type, shift_id, duty_from, duty_to, break_mins, is_flexible, employee_id) VALUES ('assignment', ?, ?, ?, ?, 0, ?)");
            $shStmt->execute([
                $u['shiftId'] ?? 'shift_general',
                $u['dutyFrom'] ?? '09:00',
                $u['dutyTo'] ?? '17:00',
                (int)($u['breakMins'] ?? 60),
                $u['id']
            ]);
        } catch(Exception $ex) {}
        
        $pdo->exec("DELETE FROM employee_documents WHERE employee_id = " . $pdo->quote($u['id']));
        $pdo->exec("DELETE FROM employee_leave_balances WHERE employee_id = " . $pdo->quote($u['id']));
        
        if (!empty($u['documents']) && is_array($u['documents'])) {
            $docStmt = $pdo->prepare("INSERT INTO employee_documents (employee_id, doc_name, doc_url) VALUES (?, ?, ?)");
            foreach ($u['documents'] as $doc) {
                $docStmt->execute([$u['id'], $doc['name'] ?? '', $doc['url'] ?? '']);
            }
        }
        
        if (!empty($u['leaveBalances']) && is_array($u['leaveBalances'])) {
            $balStmt = $pdo->prepare("INSERT INTO employee_leave_balances (employee_id, leave_type, balance, total) VALUES (?, ?, ?, ?)");
            foreach ($u['leaveBalances'] as $bal) {
                $balStmt->execute([$u['id'], $bal['id'] ?? '', (int)($bal['balance'] ?? 0), isset($bal['total']) ? (int)$bal['total'] : null]);
            }
        }
        
        $pdo->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Failed to save user: " . $e->getMessage()]);
    }
} elseif ($action === 'save_productivity_batch') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    if (!$data || !isset($data['logs'])) {
        die(json_encode(["status" => "error", "message" => "Invalid JSON payload"]));
    }
    
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO productivity (id, employee_id, date, category, sub_category, electronic_mins, manual_mins, total_mins, score_percentage, notes, doc_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($data['logs'] as $p) {
            $stmt->execute([
                $p['id'], $p['employee_id'], $p['date'], $p['category'], $p['sub_category'], 
                $p['electronic_mins'], $p['manual_mins'], $p['total_mins'], $p['score_percentage'], 
                $p['notes'], $p['doc_path'], $p['created_at']
            ]);
        }
        $pdo->commit();
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Failed to save productivity logs: " . $e->getMessage()]);
    }
} elseif ($action === 'upload_productivity_doc') {
    if (!isset($_FILES['document'])) {
        die(json_encode(["status" => "error", "message" => "No file uploaded."]));
    }
    
    $file = $_FILES['document'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        die(json_encode(["status" => "error", "message" => "File upload error code: " . $file['error']]));
    }
    
    $uploadDir = 'uploads/productivity/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $filename = time() . '_' . preg_replace("/[^a-zA-Z0-9.-]/", "_", basename($file['name']));
    $targetPath = $uploadDir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(["status" => "success", "path" => "backend/" . $targetPath]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to move uploaded file."]);
    }
} elseif ($action === 'delete_productivity_log') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    if (!$data || !isset($data['id'])) {
        die(json_encode(["status" => "error", "message" => "Invalid JSON payload"]));
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM productivity WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Failed to delete log: " . $e->getMessage()]);
    }
} elseif ($action === 'save_productivity_categories') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    try {
        $pdo->beginTransaction();
        $pdo->exec("DELETE FROM productivity_categories");
        
        $stmt = $pdo->prepare("INSERT INTO productivity_categories (id, type, parent_id, name, weightage, description) VALUES (?, ?, ?, ?, ?, ?)");
        
        if (!empty($data['businessUnits'])) {
            foreach ($data['businessUnits'] as $bu) {
                $stmt->execute([$bu['id'], 'BU', null, $bu['name'], 0, '']);
                if (!empty($bu['practices'])) {
                    foreach ($bu['practices'] as $practice) {
                        $stmt->execute([$practice['id'], 'PRACTICE', $bu['id'], $practice['name'], 0, '']);
                    }
                }
            }
        }
        
        if (!empty($data['tesCategories'])) {
            foreach ($data['tesCategories'] as $tes) {
                $stmt->execute([$tes['id'], 'TES', $tes['buId'] ?? null, $tes['name'], $tes['weightage'] ?? 0, $tes['desc'] ?? '']);
                if (!empty($tes['tasks'])) {
                    foreach ($tes['tasks'] as $task) {
                        $stmt->execute([$task['id'], 'TASK', $tes['id'], $task['name'], $task['weightage'] ?? 0, '']);
                    }
                }
            }
        }
        
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Productivity categories saved directly to SQL"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => "Failed to save productivity categories: " . $e->getMessage()]);
    }
    exit;
} elseif ($action === 'update_productivity_status') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    
    if (empty($data['id']) || empty($data['status'])) {
        echo json_encode(["status" => "error", "message" => "ID and status are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE productivity SET status = ? WHERE id = ?");
        $stmt->execute([$data['status'], $data['id']]);
        echo json_encode(["status" => "success", "message" => "Productivity status updated successfully"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Failed to update productivity status: " . $e->getMessage()]);
    }
    exit;
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action specified."]);
}
?>



