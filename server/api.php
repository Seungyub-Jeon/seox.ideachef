<?php
// api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 요청 메서드 확인
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit(0);
}

// 요청 처리
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = isset($data['action']) ? $data['action'] : '';
    
    switch ($action) {
        case 'save_report':
            include_once 'lib/db.php';
            $result = saveReport($data['report']);
            echo json_encode(['success' => $result['success'], 'id' => $result['id']]);
            break;
            
        case 'analyze':
            include_once 'lib/analyzer.php';
            $result = performServerAnalysis($data['url']);
            echo json_encode($result);
            break;
            
        case 'share_report':
            include_once 'lib/sharing.php';
            $result = createShareableLink($data['id'], $data['options'] ?? []);
            echo json_encode($result);
            break;
            
        default:
            echo json_encode(['error' => 'Unknown action']);
            break;
    }
} else if ($method === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    switch ($action) {
        case 'get_report':
            include_once 'lib/db.php';
            $id = isset($_GET['id']) ? $_GET['id'] : '';
            $result = getReport($id);
            echo json_encode($result);
            break;
            
        case 'get_shared_report':
            include_once 'lib/sharing.php';
            $shareId = isset($_GET['share_id']) ? $_GET['share_id'] : '';
            $result = getSharedReport($shareId);
            echo json_encode($result);
            break;
            
        case 'get_stats':
            include_once 'lib/stats.php';
            $type = isset($_GET['type']) ? $_GET['type'] : 'general';
            $result = getStatistics($type);
            echo json_encode($result);
            break;
            
        default:
            echo json_encode(['error' => 'Unknown action']);
            break;
    }
}
?>