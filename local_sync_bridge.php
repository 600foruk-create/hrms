<?php
/**
 * LOCAL BIOMETRIC BRIDGE SCRIPT
 * Run this script on your local computer (e.g. via XAMPP) to sync your local ZKTeco machine to Hostinger.
 * 
 * 1. Change LIVE_DOMAIN to your actual Hostinger domain
 * 2. Change MACHINE_IP to your biometric machine's IP (e.g. 192.168.1.201)
 * 3. Run this file in your browser: http://localhost/HRMS/hrms/local_sync_bridge.php
 */

define('LIVE_DOMAIN', 'https://azure-quetzal-636989.hostingersite.com/'); // IMPORTANT: Change this to your live website URL
define('MACHINE_IP', '192.168.1.201');           // Your biometric machine's local IP
define('MACHINE_PORT', 4370);                    // Default ZKTeco port

// We use the existing SDK from your HRMS folder
require __DIR__ . '/backend/vendor/autoload.php';
use Mithun\PhpZkteco\Libs\ZKTeco;

header('Content-Type: text/plain');
echo "Starting local sync bridge (TCP Mode)...\n";
echo "Connecting to machine " . MACHINE_IP . ":" . MACHINE_PORT . "...\n";

$zk = new ZKTeco(MACHINE_IP, MACHINE_PORT, false, 25, 0, 'tcp');
if (!$zk->connect()) {
    echo "ERROR: Could not connect to local machine via TCP!\n";
    exit;
}

echo "Connected successfully! Fetching attendance logs...\n";
$attendance = $zk->getAttendances();
$zk->disconnect();

if (empty($attendance)) {
    echo "No attendance logs found on the machine.\n";
    exit;
}

echo "Fetched " . count($attendance) . " logs. Sending to Hostinger...\n";

$payload = json_encode([
    'logs' => $attendance,
    'machine_ip' => MACHINE_IP,
    'machine_status' => 'Online'
]);

$ch = curl_init(rtrim(LIVE_DOMAIN, '/') . '/HRMS/hrms/backend/api.php?action=upload_biometric_logs');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Ignore SSL errors for testing

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "ERROR uploading to Hostinger: $error\n";
    exit;
}

echo "Hostinger API Response (HTTP $httpCode):\n";
echo $response . "\n";
echo "\nSync Complete!\n";
