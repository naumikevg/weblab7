<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$method = $_SERVER['REQUEST_METHOD'];

$file_immediate = 'logs_immediate.json';
$file_batch = 'logs_batch.json';

if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        echo json_encode(['status' => 'error']);
        exit;
    }

    if (isset($data['type']) && $data['type'] === 'immediate') {
        $logEntry = [
            'id' => $data['id'],
            'event' => $data['message'],
            'client_time' => $data['time'], 
            'server_time' => microtime(true) * 1000, 
            'method' => 'immediate'
        ];
        
        $current = file_exists($file_immediate) ? json_decode(file_get_contents($file_immediate), true) : [];
        if (!is_array($current)) $current = [];
        $current[] = $logEntry;
        file_put_contents($file_immediate, json_encode($current));
        
        echo json_encode(['status' => 'saved']);
    } 
    
    elseif (isset($data['type']) && $data['type'] === 'batch') {
        $batchData = $data['payload'];
        $serverTimeReceived = microtime(true) * 1000;
        
        foreach ($batchData as &$item) {
            $item['server_save_time'] = $serverTimeReceived;
            $item['method'] = 'batch';
        }
        
        file_put_contents($file_batch, json_encode($batchData));
        echo json_encode(['status' => 'batch_saved']);
    }
    
    elseif (isset($data['type']) && $data['type'] === 'clear') {
        file_put_contents($file_immediate, '[]');
        file_put_contents($file_batch, '[]');
        echo json_encode(['status' => 'cleared']);
    }

} elseif ($method === 'GET') {
    $imm = file_exists($file_immediate) ? json_decode(file_get_contents($file_immediate), true) : [];
    $batch = file_exists($file_batch) ? json_decode(file_get_contents($file_batch), true) : [];
    
    echo json_encode(['immediate' => $imm, 'batch' => $batch]);
}
?>