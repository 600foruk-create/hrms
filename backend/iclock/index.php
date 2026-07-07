<?php
/**
 * ZKTeco ADMS (Iclock) Protocol Listener
 * This script handles HTTP requests from ZKTeco biometric machines via the Push/Cloud protocol.
 */

// Error reporting for debugging (log to file if needed)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set content type to plain text as required by ADMS
header('Content-Type: text/plain');

// Include existing database config and dependencies
require_once __DIR__ . '/../config.php';

// ADMS requests come in the form of /iclock/cdata or /iclock/getrequest
$requestUri = $_SERVER['REQUEST_URI'];
$path = $_GET['path'] ?? ''; // From .htaccess rewrite

$method = $_SERVER['REQUEST_METHOD'];
$sn = $_GET['SN'] ?? ''; // Serial Number of the machine

// Handle GET Requests (Initialization & Commands)
if ($method === 'GET') {
    if (strpos($requestUri, '/iclock/cdata') !== false) {
        // Initialization request from the machine
        // Format required by ZKTeco:
        echo "GET OPTION FROM: $sn\n";
        echo "Stamp=9999\n";
        echo "OpStamp=9999\n";
        echo "ErrorDelay=60\n";
        echo "Delay=10\n";
        echo "TransTimes=00:00;14:00\n";
        echo "TransInterval=1\n";
        echo "TransFlag=1111000000\n";
        echo "TimeZone=5\n"; // UTC+5
        echo "Realtime=1\n";
        echo "Encrypt=0\n";
        exit;
    } elseif (strpos($requestUri, '/iclock/getrequest') !== false) {
        // Request for commands (Add user, Reboot, etc.)
        // We just respond OK because we don't have pending commands for the machine
        echo "OK";
        exit;
    }
}

// Handle POST Requests (Data Uploads)
if ($method === 'POST') {
    if (strpos($requestUri, '/iclock/cdata') !== false) {
        $table = $_GET['table'] ?? '';
        
        // We only care about attendance logs (ATTLOG)
        if ($table === 'ATTLOG') {
            $cdata = file_get_contents('php://input');
            if (empty($cdata)) {
                echo "OK: 0";
                exit;
            }

            // Parse the raw text data (Tab separated values)
            // Example format: 15\t2023-10-25 09:15:00\t1\t1\t0\t0\t0
            $lines = explode("\n", trim($cdata));
            $attendanceCount = 0;

            // Fetch Employee Mapping once
            $stmt = $pdo->query("SELECT id, displayId, name FROM users");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $empMap = [];
            foreach ($employees as $emp) {
                $empMap[$emp['id']] = $emp;
                if (!empty($emp['displayId'])) {
                    $empMap[$emp['displayId']] = $emp;
                }
            }

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;

                $parts = explode("\t", $line);
                if (count($parts) >= 2) {
                    $userIdStr = trim($parts[0]);
                    $timestampStr = trim($parts[1]); // format: YYYY-MM-DD HH:MM:SS
                    
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
                            $pdo->prepare("UPDATE attendance SET " . implode(", ", $updates) . " WHERE id = ?")->execute($params);
                            $attendanceCount++;
                        }
                    } else {
                        $pdo->prepare("INSERT INTO attendance (employeeId, employeeName, date, timeIn, status, markedBy) VALUES (?, ?, ?, ?, ?, ?)")->execute([
                            $employeeId, $employeeName, $dateStr, $timeStr, 'Present', 'Biometric (ADMS)'
                        ]);
                        $attendanceCount++;
                    }
                }
            }
            // ZKTeco expects OK: followed by the number of records processed to confirm receipt
            echo "OK: $attendanceCount";
            exit;
        }
        
        // For any other table (OPERLOG, USER, etc.), just acknowledge receipt
        echo "OK: 0";
        exit;
    }
}

// Fallback response for unhandled requests
echo "OK";
exit;
