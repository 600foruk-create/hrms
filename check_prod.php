<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'ping';
require 'backend/api.php';
try {
    $res = $pdo->query("SELECT * FROM productivity")->fetchAll(PDO::FETCH_ASSOC);
    print_r($res);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
