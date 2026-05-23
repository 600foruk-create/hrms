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


// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

if ($action === 'load_all') {
    try {
        $dbState = [];

        // Fetch Users
        $stmt = $pdo->query("SELECT * FROM users");
        $dbState['users'] = $stmt->fetchAll();

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
            $stmt = $pdo->prepare("INSERT INTO users (id, email, password, name, role, managerId, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['users'] as $u) {
                $stmt->execute([$u['id'], $u['email'], $u['password'], $u['name'], $u['role'], $u['managerId'] ?? '', $u['status']]);
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
            // Re-insert without specific ID since it's auto_increment or just let ID be overridden if provided
            // Actually, frontend relies on date + employeeId
            $stmt = $pdo->prepare("INSERT INTO attendance (date, employeeId, employeeName, status, markedBy) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['attendance'] as $a) {
                $stmt->execute([$a['date'], $a['employeeId'], $a['employeeName'], $a['status'], $a['markedBy'] ?? 'System']);
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
