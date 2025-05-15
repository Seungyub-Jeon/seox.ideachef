<?php
// lib/stats.php

/**
 * 통계 정보를 가져오는 함수
 * @param string $type 통계 타입 (general, daily, monthly)
 * @return array 통계 데이터
 */
function getStatistics($type = 'general') {
    $statsFile = __DIR__ . '/../data/stats/usage.json';
    
    if (!file_exists($statsFile)) {
        return [
            'error' => 'No statistics data available'
        ];
    }
    
    $stats = json_decode(file_get_contents($statsFile), true);
    
    switch ($type) {
        case 'general':
            return [
                'total' => $stats['total'] ?? [],
                'daily_average' => calculateDailyAverage($stats),
                'today' => $stats['daily'][date('Y-m-d')] ?? []
            ];
            
        case 'daily':
            // 최근 30일 데이터
            $dailyData = [];
            $daily = $stats['daily'] ?? [];
            
            // 최근 날짜순으로 정렬
            krsort($daily);
            
            // 최근 30일 데이터만 추출
            $count = 0;
            foreach ($daily as $date => $data) {
                $dailyData[$date] = $data;
                $count++;
                if ($count >= 30) break;
            }
            
            return [
                'daily' => $dailyData
            ];
            
        case 'monthly':
            // 월별 통계 계산
            $monthly = [];
            $daily = $stats['daily'] ?? [];
            
            foreach ($daily as $date => $data) {
                $month = substr($date, 0, 7); // YYYY-MM 형식
                
                if (!isset($monthly[$month])) {
                    $monthly[$month] = [
                        'report_saved' => 0,
                        'report_viewed' => 0,
                        'report_shared' => 0
                    ];
                }
                
                foreach ($data as $action => $count) {
                    $monthly[$month][$action] += $count;
                }
            }
            
            // 최근 월 순으로 정렬
            krsort($monthly);
            
            return [
                'monthly' => $monthly
            ];
            
        default:
            return [
                'error' => 'Unknown statistics type'
            ];
    }
}

/**
 * 일 평균 통계를 계산하는 함수
 * @param array $stats 전체 통계 데이터
 * @return array 일 평균 통계
 */
function calculateDailyAverage($stats) {
    $daily = $stats['daily'] ?? [];
    $totalDays = count($daily);
    
    if ($totalDays === 0) {
        return [
            'report_saved' => 0,
            'report_viewed' => 0,
            'report_shared' => 0
        ];
    }
    
    $totals = [
        'report_saved' => 0,
        'report_viewed' => 0,
        'report_shared' => 0
    ];
    
    foreach ($daily as $data) {
        foreach ($totals as $action => $count) {
            $totals[$action] += $data[$action] ?? 0;
        }
    }
    
    $averages = [];
    foreach ($totals as $action => $count) {
        $averages[$action] = round($count / $totalDays, 2);
    }
    
    return $averages;
}

/**
 * 최근 분석 데이터의 통계를 가져오는 함수
 * @param int $limit 가져올 데이터 수
 * @return array 분석 통계 데이터
 */
function getAnalyticsStatistics($limit = 100) {
    $reportsDir = __DIR__ . '/../data/reports/';
    $result = [
        'performance' => [
            'average' => 0,
            'distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0
            ]
        ],
        'mobile' => [
            'average' => 0,
            'distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0
            ]
        ],
        'security' => [
            'average' => 0,
            'distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0
            ]
        ],
        'overall' => [
            'average' => 0,
            'distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0
            ]
        ],
        'common_issues' => []
    ];
    
    if (!file_exists($reportsDir)) {
        return $result;
    }
    
    $files = glob($reportsDir . '*.json');
    
    // 최신 파일 순으로 정렬
    usort($files, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    // 제한된 수의 최신 파일만 가져옴
    $files = array_slice($files, 0, $limit);
    
    // 점수와 이슈 집계
    $totalReports = count($files);
    $scores = [
        'performance' => 0,
        'mobile' => 0,
        'security' => 0,
        'overall' => 0
    ];
    
    $allIssues = [];
    
    foreach ($files as $file) {
        $report = json_decode(file_get_contents($file), true);
        
        if (!$report) continue;
        
        // 점수 집계
        foreach (['performance', 'mobile', 'security'] as $category) {
            if (isset($report[$category]['score'])) {
                $score = $report[$category]['score'];
                $scores[$category] += $score;
                
                // 분포 업데이트
                $bracket = min(floor($score / 20), 4);
                $bracketKey = ($bracket * 20 + 1) . '-' . (($bracket + 1) * 20);
                if ($bracket === 0) $bracketKey = '0-20';
                
                $result[$category]['distribution'][$bracketKey]++;
                
                // 이슈 집계
                if (isset($report[$category]['issues'])) {
                    foreach ($report[$category]['issues'] as $issue) {
                        $issueId = $issue['id'] ?? md5($issue['description']);
                        
                        if (!isset($allIssues[$issueId])) {
                            $allIssues[$issueId] = [
                                'count' => 0,
                                'category' => $category,
                                'description' => $issue['description'],
                                'severity' => $issue['severity'] ?? 'medium'
                            ];
                        }
                        
                        $allIssues[$issueId]['count']++;
                    }
                }
            }
        }
        
        // 전체 점수 집계
        if (isset($report['overall_score'])) {
            $score = $report['overall_score'];
            $scores['overall'] += $score;
            
            // 분포 업데이트
            $bracket = min(floor($score / 20), 4);
            $bracketKey = ($bracket * 20 + 1) . '-' . (($bracket + 1) * 20);
            if ($bracket === 0) $bracketKey = '0-20';
            
            $result['overall']['distribution'][$bracketKey]++;
        }
    }
    
    // 평균 계산
    if ($totalReports > 0) {
        foreach ($scores as $category => $total) {
            $result[$category]['average'] = round($total / $totalReports, 2);
        }
    }
    
    // 가장 흔한 이슈 정렬
    uasort($allIssues, function($a, $b) {
        return $b['count'] - $a['count'];
    });
    
    // 상위 10개 이슈 추출
    $result['common_issues'] = array_slice(array_values($allIssues), 0, 10);
    
    return $result;
}
?>