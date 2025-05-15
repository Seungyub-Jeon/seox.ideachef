<?php
// lib/sharing.php

/**
 * 보고서를 공유하기 위한 고유 링크를 생성하는 함수
 * @param string $reportId 보고서 ID
 * @param array $options 공유 옵션 (만료 시간, 접근 제한 등)
 * @return array 공유 결과
 */
function createShareableLink($reportId, $options = []) {
    include_once 'db.php';
    
    // 보고서 존재 확인
    $report = getReport($reportId);
    if (isset($report['error'])) {
        return $report;
    }
    
    // 공유 ID 생성
    $shareId = generateShareId();
    
    // 만료 설정
    $expiresAt = null;
    if (isset($options['expires_in'])) {
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . $options['expires_in'] . ' seconds'));
    }
    
    // 공유 정보 저장
    $shareInfo = [
        'id' => $shareId,
        'report_id' => $reportId,
        'created_at' => date('Y-m-d H:i:s'),
        'expires_at' => $expiresAt,
        'access_count' => 0,
        'options' => $options
    ];
    
    $sharesDir = __DIR__ . '/../data/shares/';
    
    // 디렉토리 확인 및 생성
    if (!file_exists($sharesDir)) {
        mkdir($sharesDir, 0755, true);
    }
    
    // 공유 정보 저장
    $success = file_put_contents(
        $sharesDir . $shareId . '.json',
        json_encode($shareInfo, JSON_PRETTY_PRINT)
    );
    
    if ($success !== false) {
        // 통계 업데이트
        updateStatistics('report_shared');
        
        return [
            'success' => true,
            'share_id' => $shareId,
            'url' => getShareUrl($shareId),
            'expires_at' => $expiresAt
        ];
    } else {
        return [
            'error' => 'Failed to create shareable link'
        ];
    }
}

/**
 * 공유된 보고서를 가져오는 함수
 * @param string $shareId 공유 ID
 * @return array 보고서 데이터 또는 오류 메시지
 */
function getSharedReport($shareId) {
    include_once 'db.php';
    
    if (!preg_match('/^[a-zA-Z0-9]{10}$/', $shareId)) {
        return ['error' => 'Invalid share ID format'];
    }
    
    $shareFile = __DIR__ . '/../data/shares/' . $shareId . '.json';
    
    if (!file_exists($shareFile)) {
        return ['error' => 'Shared report not found'];
    }
    
    $shareInfo = json_decode(file_get_contents($shareFile), true);
    
    // 만료 확인
    if (isset($shareInfo['expires_at']) && $shareInfo['expires_at'] !== null) {
        if (strtotime($shareInfo['expires_at']) < time()) {
            return ['error' => 'Shared report has expired'];
        }
    }
    
    // 접근 횟수 증가
    $shareInfo['access_count']++;
    file_put_contents($shareFile, json_encode($shareInfo, JSON_PRETTY_PRINT));
    
    // 보고서 가져오기
    $report = getReport($shareInfo['report_id']);
    
    // 공유 정보 추가
    if (!isset($report['error'])) {
        $report['share_info'] = [
            'id' => $shareInfo['id'],
            'created_at' => $shareInfo['created_at'],
            'expires_at' => $shareInfo['expires_at'],
            'access_count' => $shareInfo['access_count']
        ];
    }
    
    return $report;
}

/**
 * 공유 ID를 생성하는
 * @return string 10자리 영숫자 ID
 */
function generateShareId() {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $id = '';
    
    for ($i = 0; $i < 10; $i++) {
        $id .= $chars[rand(0, strlen($chars) - 1)];
    }
    
    // 이미 존재하는 ID인지 확인
    $shareFile = __DIR__ . '/../data/shares/' . $id . '.json';
    if (file_exists($shareFile)) {
        return generateShareId(); // 재귀호출로 새 ID 생성
    }
    
    return $id;
}

/**
 * 공유 URL을 생성하는 함수
 * @param string $shareId 공유 ID
 * @return string 공유 URL
 */
function getShareUrl($shareId) {
    // 스크립트가 실행되는 호스트 확인
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    
    return $protocol . '://' . $host . '/report-viewer.html?share=' . $shareId;
}

/**
 * PDF 보고서를 생성하는 함수
 * @param string $reportId 보고서 ID
 * @return array 생성 결과
 */
function generatePdfReport($reportId) {
    include_once 'db.php';
    
    // 보고서 존재 확인
    $report = getReport($reportId);
    if (isset($report['error'])) {
        return $report;
    }
    
    // PDF 생성에 필요한 라이브러리가 있어야 함 (예: FPDF, TCPDF, mPDF)
    // 여기서는 HTML 템플릿을 생성하는 예시 코드만 제공
    
    // HTML 템플릿 로드
    $templateFile = __DIR__ . '/../templates/pdf-report.php';
    if (!file_exists($templateFile)) {
        return ['error' => 'PDF template not found'];
    }
    
    // 출력 버퍼링 시작
    ob_start();
    
    // 보고서 데이터를 템플릿에 전달
    $data = $report;
    include $templateFile;
    
    // HTML 내용 가져오기
    $html = ob_get_clean();
    
    // PDF 파일 저장 경로
    $pdfDir = __DIR__ . '/../data/pdf/';
    if (!file_exists($pdfDir)) {
        mkdir($pdfDir, 0755, true);
    }
    
    $pdfFile = $pdfDir . $reportId . '.pdf';
    
    // 여기서 실제 PDF 생성 코드가 들어가야 함
    // 이 예제에서는 HTML만 저장
    $success = file_put_contents($pdfDir . $reportId . '.html', $html);
    
    if ($success !== false) {
        return [
            'success' => true,
            'message' => 'PDF report generated successfully',
            'html_path' => $pdfDir . $reportId . '.html'
            // 'pdf_path' => $pdfFile
        ];
    } else {
        return [
            'error' => 'Failed to generate PDF report'
        ];
    }
}
?>