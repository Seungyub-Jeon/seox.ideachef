<?php
// lib/db.php

/**
 * 보고서를 저장하는 함수
 * @param array $report 저장할 보고서 데이터
 * @return array 저장 결과 및 보고서 ID
 */
function saveReport($report) {
    $id = uniqid();
    $filename = __DIR__ . '/../data/reports/' . $id . '.json';
    
    // 디렉토리 확인 및 생성
    if (!file_exists(__DIR__ . '/../data/reports/')) {
        mkdir(__DIR__ . '/../data/reports/', 0755, true);
    }
    
    // 보고서 메타데이터 추가
    $report['meta'] = [
        'id' => $id,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    // 보고서 저장
    $success = file_put_contents($filename, json_encode($report, JSON_PRETTY_PRINT));
    
    // 통계 업데이트
    if ($success !== false) {
        updateStatistics('report_saved');
    }
    
    return [
        'success' => $success !== false,
        'id' => $id
    ];
}

/**
 * ID로 보고서를 불러오는 함수
 * @param string $id 보고서 ID
 * @return array 보고서 데이터 또는 오류 메시지
 */
function getReport($id) {
    if (!preg_match('/^[a-f0-9]+$/', $id)) {
        return ['error' => 'Invalid report ID format'];
    }
    
    $filename = __DIR__ . '/../data/reports/' . $id . '.json';
    
    if (!file_exists($filename)) {
        return ['error' => 'Report not found'];
    }
    
    $report = json_decode(file_get_contents($filename), true);
    
    // 통계 업데이트
    updateStatistics('report_viewed');
    
    return $report;
}

/**
 * 보고서 목록을 가져오는 함수
 * @param int $limit 반환할 최대 보고서 수
 * @param int $offset 시작 위치
 * @return array 보고서 목록
 */
function getReportsList($limit = 10, $offset = 0) {
    $reportsDir = __DIR__ . '/../data/reports/';
    $reports = [];
    
    if (file_exists($reportsDir)) {
        $files = glob($reportsDir . '*.json');
        
        // 최신 파일 순으로 정렬
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        $files = array_slice($files, $offset, $limit);
        
        foreach ($files as $file) {
            $content = json_decode(file_get_contents($file), true);
            if ($content && isset($content['meta'])) {
                $reports[] = [
                    'id' => $content['meta']['id'],
                    'url' => $content['url'] ?? 'Unknown URL',
                    'created_at' => $content['meta']['created_at'],
                    'overall_score' => $content['overall_score'] ?? 0
                ];
            }
        }
    }
    
    return $reports;
}

/**
 * 보고서를 업데이트하는 함수
 * @param string $id 보고서 ID
 * @param array $newData 업데이트할 데이터
 * @return array 업데이트 결과
 */
function updateReport($id, $newData) {
    if (!preg_match('/^[a-f0-9]+$/', $id)) {
        return ['error' => 'Invalid report ID format'];
    }
    
    $filename = __DIR__ . '/../data/reports/' . $id . '.json';
    
    if (!file_exists($filename)) {
        return ['error' => 'Report not found'];
    }
    
    $report = json_decode(file_get_contents($filename), true);
    
    // 메타데이터 보존 및 업데이트
    $meta = $report['meta'] ?? ['id' => $id];
    $meta['updated_at'] = date('Y-m-d H:i:s');
    
    // 데이터 병합
    $updatedReport = array_merge($report, $newData);
    $updatedReport['meta'] = $meta;
    
    // 저장
    $success = file_put_contents($filename, json_encode($updatedReport, JSON_PRETTY_PRINT));
    
    return [
        'success' => $success !== false,
        'id' => $id
    ];
}

/**
 * 보고서를 삭제하는 함수
 * @param string $id 보고서 ID
 * @return array 삭제 결과
 */
function deleteReport($id) {
    if (!preg_match('/^[a-f0-9]+$/', $id)) {
        return ['error' => 'Invalid report ID format'];
    }
    
    $filename = __DIR__ . '/../data/reports/' . $id . '.json';
    
    if (!file_exists($filename)) {
        return ['error' => 'Report not found'];
    }
    
    $success = unlink($filename);
    
    return [
        'success' => $success
    ];
}

/**
 * 통계 정보를 업데이트하는 내부 함수
 * @param string $action 발생한 액션
 */
function updateStatistics($action) {
    $statsFile = __DIR__ . '/../data/stats/usage.json';
    $statsDir = __DIR__ . '/../data/stats/';
    
    // 디렉토리 확인 및 생성
    if (!file_exists($statsDir)) {
        mkdir($statsDir, 0755, true);
    }
    
    $stats = [];
    if (file_exists($statsFile)) {
        $stats = json_decode(file_get_contents($statsFile), true);
    }
    
    $today = date('Y-m-d');
    
    // 날짜별 통계
    if (!isset($stats['daily'][$today])) {
        $stats['daily'][$today] = [
            'report_saved' => 0,
            'report_viewed' => 0,
            'report_shared' => 0
        ];
    }
    
    // 전체 통계
    if (!isset($stats['total'])) {
        $stats['total'] = [
            'report_saved' => 0,
            'report_viewed' => 0,
            'report_shared' => 0
        ];
    }
    
    // 통계 증가
    if (isset($stats['daily'][$today][$action])) {
        $stats['daily'][$today][$action]++;
    }
    
    if (isset($stats['total'][$action])) {
        $stats['total'][$action]++;
    }
    
    // 통계 저장
    file_put_contents($statsFile, json_encode($stats, JSON_PRETTY_PRINT));
}
?>