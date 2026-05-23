<?php
// backend/config.php

$host = 'localhost';
$dbname = 'u245697138_hrms';
$username = 'u245697138_hrms';
$password = 'Hrmsdatabase@123';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Set PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode to associative array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(["status" => "error", "message" => "Database Connection Failed: " . $e->getMessage()]));
}
?>
