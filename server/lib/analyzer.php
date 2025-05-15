<?php
// lib/analyzer.php

/**
 * 서버 측에서 URL에 대한 분석을 수행하는 함수
 * @param string $url 분석할 웹사이트 URL
 * @return array 분석 결과
 */
function performServerAnalysis($url) {
    // URL 유효성 검사
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return ['error' => 'Invalid URL format'];
    }
    
    // 초기 결과 구조
    $result = [
        'url' => $url,
        'timestamp' => date('Y-m-d H:i:s'),
        'server_analysis' => [
            'headers' => [],
            'seo' => [],
            'security' => [],
            'performance' => []
        ]
    ];
    
    // URL 가져오기 옵션
    $options = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: KoreanWebAnalyzer/1.0\r\n" .
                        "Accept: text/html,application/xhtml+xml\r\n",
            'timeout' => 15,
            'follow_location' => 1,
            'max_redirects' => 3
        ]
    ];
    
    $context = stream_context_create($options);
    
    try {
        // URL 내용 가져오기
        $html = @file_get_contents($url, false, $context);
        
        if ($html === false) {
            throw new Exception('Failed to fetch URL content');
        }
        
        // 응답 헤더 분석
        $responseHeaders = parseResponseHeaders($http_response_header);
        $result['server_analysis']['headers'] = $responseHeaders;
        
        // 보안 분석
        $result['server_analysis']['security'] = analyzeSecurityHeaders($responseHeaders);
        
        // HTML 분석
        $htmlAnalysis = analyzeHtml($html, $url);
        $result['server_analysis']['seo'] = $htmlAnalysis['seo'];
        $result['server_analysis']['performance']['resources'] = $htmlAnalysis['resources'];
        
        // 성능 점수 계산
        $result['server_analysis']['performance']['score'] = calculatePerformanceScore($htmlAnalysis['resources'], $responseHeaders);
        
        // SEO 점수 계산
        $result['server_analysis']['seo']['score'] = calculateSeoScore($htmlAnalysis['seo']);
        
        // 보안 점수 계산
        $result['server_analysis']['security']['score'] = calculateSecurityScore($result['server_analysis']['security']);
        
        // 전체 서버 분석 점수
        $result['server_analysis']['score'] = round(
            ($result['server_analysis']['security']['score'] +
            $result['server_analysis']['seo']['score'] +
            $result['server_analysis']['performance']['score']) / 3
        );
        
        return $result;
    } catch (Exception $e) {
        return [
            'error' => 'Analysis failed: ' . $e->getMessage()
        ];
    }
}

/**
 * 응답 헤더를 분석하는 함수
 * @param array $headers HTTP 응답 헤더
 * @return array 분석된 헤더
 */
function parseResponseHeaders($headers) {
    $parsedHeaders = [];
    
    // 첫 번째 줄은 HTTP 상태 라인
    if (isset($headers[0])) {
        $parsedHeaders['status'] = $headers[0];
        
        // HTTP 상태 코드 추출
        if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $headers[0], $matches)) {
            $parsedHeaders['status_code'] = intval($matches[1]);
        }
    }
    
    // 나머지 헤더 파싱
    foreach ($headers as $i => $header) {
        if ($i === 0) continue; // 첫 번째 줄은 이미 처리함
        
        if (strpos($header, ':') !== false) {
            list($key, $value) = explode(':', $header, 2);
            $key = strtolower(trim($key));
            $value = trim($value);
            
            // 중복 헤더 처리
            if (isset($parsedHeaders[$key])) {
                if (!is_array($parsedHeaders[$key])) {
                    $parsedHeaders[$key] = [$parsedHeaders[$key]];
                }
                $parsedHeaders[$key][] = $value;
            } else {
                $parsedHeaders[$key] = $value;
            }
        }
    }
    
    return $parsedHeaders;
}

/**
 * 보안 관련 헤더를 분석하는 함수
 * @param array $headers 분석된 응답 헤더
 * @return array 보안 분석 결과
 */
function analyzeSecurityHeaders($headers) {
    $security = [
        'https' => [
            'enabled' => false,
            'description' => '웹사이트가 HTTPS를 사용하지 않습니다. 보안 연결을 구현하세요.',
            'severity' => 'high'
        ],
        'content_security_policy' => [
            'enabled' => false,
            'description' => 'Content-Security-Policy 헤더가 설정되지 않았습니다.',
            'severity' => 'medium'
        ],
        'x_content_type_options' => [
            'enabled' => false,
            'description' => 'X-Content-Type-Options 헤더가 설정되지 않았습니다.',
            'severity' => 'low'
        ],
        'x_frame_options' => [
            'enabled' => false,
            'description' => 'X-Frame-Options 헤더가 설정되지 않았습니다.',
            'severity' => 'medium'
        ],
        'strict_transport_security' => [
            'enabled' => false,
            'description' => 'Strict-Transport-Security 헤더가 설정되지 않았습니다.',
            'severity' => 'medium'
        ],
        'x_xss_protection' => [
            'enabled' => false,
            'description' => 'X-XSS-Protection 헤더가 설정되지 않았습니다.',
            'severity' => 'low'
        ]
    ];
    
    // HTTPS 확인
    if (strpos($headers['status'], 'HTTPS') !== false || isset($headers['status']) && strpos($headers['status'], 'HTTP/2') !== false) {
        $security['https']['enabled'] = true;
        $security['https']['description'] = '웹사이트가 HTTPS를 사용하고 있습니다.';
    }
    
    // 보안 헤더 확인
    $securityHeaders = [
        'content_security_policy' => 'content-security-policy',
        'x_content_type_options' => 'x-content-type-options',
        'x_frame_options' => 'x-frame-options',
        'strict_transport_security' => 'strict-transport-security',
        'x_xss_protection' => 'x-xss-protection'
    ];
    
    foreach ($securityHeaders as $key => $headerName) {
        if (isset($headers[$headerName])) {
            $security[$key]['enabled'] = true;
            $security[$key]['value'] = $headers[$headerName];
            $security[$key]['description'] = $headerName . ' 헤더가 설정되어 있습니다.';
        }
    }
    
    // 이슈 추출
    $issues = [];
    foreach ($security as $key => $check) {
        if (!$check['enabled']) {
            $issues[] = [
                'id' => 'security_' . $key,
                'description' => $check['description'],
                'severity' => $check['severity']
            ];
        }
    }
    
    return [
        'checks' => $security,
        'issues' => $issues
    ];
}

/**
 * HTML 내용을 분석하는 함수
 * @param string $html HTML 내용
 * @param string $url 웹사이트 URL
 * @return array HTML 분석 결과
 */
function analyzeHtml($html, $url) {
    // 간단한 HTML 파싱을 위한 DOMDocument 사용
    libxml_use_internal_errors(true); // HTML 파싱 오류 무시
    $dom = new DOMDocument();
    $dom->loadHTML($html);
    libxml_clear_errors();
    
    $xpath = new DOMXPath($dom);
    
    // SEO 분석
    $seo = [
        'title' => [
            'exists' => false,
            'content' => '',
            'length' => 0,
            'description' => '페이지에 제목이 없습니다.',
            'severity' => 'high'
        ],
        'meta_description' => [
            'exists' => false,
            'content' => '',
            'length' => 0,
            'description' => '페이지에 메타 설명이 없습니다.',
            'severity' => 'medium'
        ],
        'headings' => [
            'h1_count' => 0,
            'has_h1' => false,
            'description' => '페이지에 H1 제목 태그가 없습니다.',
            'severity' => 'medium'
        ],
        'images_without_alt' => [
            'count' => 0,
            'description' => '대체 텍스트가 없는 이미지가 있습니다.',
            'severity' => 'low'
        ],
        'links_without_text' => [
            'count' => 0,
            'description' => '텍스트가 없는 링크가 있습니다.',
            'severity' => 'low'
        ]
    ];
    
    // 제목 확인
    $title = $xpath->query('//title');
    if ($title->length > 0) {
        $titleText = trim($title->item(0)->textContent);
        $seo['title']['exists'] = true;
        $seo['title']['content'] = $titleText;
        $seo['title']['length'] = mb_strlen($titleText);
        $seo['title']['description'] = '페이지 제목이 있습니다.';
        
        if ($seo['title']['length'] < 10) {
            $seo['title']['description'] = '페이지 제목이 너무 짧습니다 (최소 10자 권장).';
            $seo['title']['severity'] = 'medium';
        } elseif ($seo['title']['length'] > 60) {
            $seo['title']['description'] = '페이지 제목이 너무 깁니다 (최대 60자 권장).';
            $seo['title']['severity'] = 'low';
        } else {
            $seo['title']['severity'] = 'none';
        }
    }
    
    // 메타 설명 확인
    $metaDescription = $xpath->query('//meta[@name="description"]');
    if ($metaDescription->length > 0) {
        $descContent = $metaDescription->item(0)->getAttribute('content');
        $seo['meta_description']['exists'] = true;
        $seo['meta_description']['content'] = $descContent;
        $seo['meta_description']['length'] = mb_strlen($descContent);
        $seo['meta_description']['description'] = '메타 설명이 있습니다.';
        
        if ($seo['meta_description']['length'] < 50) {
            $seo['meta_description']['description'] = '메타 설명이 너무 짧습니다 (최소 50자 권장).';
            $seo['meta_description']['severity'] = 'low';
        } elseif ($seo['meta_description']['length'] > 160) {
            $seo['meta_description']['description'] = '메타 설명이 너무 깁니다 (최대 160자 권장).';
            $seo['meta_description']['severity'] = 'low';
        } else {
            $seo['meta_description']['severity'] = 'none';
        }
    }
    
    // 제목 태그 확인
    $h1 = $xpath->query('//h1');
    $seo['headings']['h1_count'] = $h1->length;
    $seo['headings']['has_h1'] = $h1->length > 0;
    
    if ($seo['headings']['has_h1']) {
        $seo['headings']['description'] = 'H1 제목 태그가 있습니다.';
        $seo['headings']['severity'] = 'none';
        
        if ($seo['headings']['h1_count'] > 1) {
            $seo['headings']['description'] = 'H1 제목 태그가 여러 개 있습니다. 주요 제목은 하나만 사용하는 것이 좋습니다.';
            $seo['headings']['severity'] = 'low';
        }
    }
    
    // 대체 텍스트 없는 이미지 확인
    $imagesWithoutAlt = $xpath->query('//img[not(@alt) or @alt=""]');
    $seo['images_without_alt']['count'] = $imagesWithoutAlt->length;
    
    if ($seo['images_without_alt']['count'] === 0) {
        $seo['images_without_alt']['description'] = '모든 이미지에 대체 텍스트가 있습니다.';
        $seo['images_without_alt']['severity'] = 'none';
    }
    
    // 텍스트 없는 링크 확인
    $linksWithoutText = $xpath->query('//a[not(normalize-space(.))]');
    $seo['links_without_text']['count'] = $linksWithoutText->length;
    
    if ($seo['links_without_text']['count'] === 0) {
        $seo['links_without_text']['description'] = '모든 링크에 텍스트가 있습니다.';
        $seo['links_without_text']['severity'] = 'none';
    }
    
    // 리소스 분석
    $resources = [
        'scripts' => [
            'count' => 0,
            'external' => 0,
            'inline' => 0,
            'size' => 0
        ],
        'styles' => [
            'count' => 0,
            'external' => 0,
            'inline' => 0,
            'size' => 0
        ],
        'images' => [
            'count' => 0,
            'size' => 0
        ],
        'total_size' => 0
    ];
    
    // 스크립트 분석
    $scripts = $xpath->query('//script');
    $resources['scripts']['count'] = $scripts->length;
    
    foreach ($scripts as $script) {
        $src = $script->getAttribute('src');
        if ($src) {
            $resources['scripts']['external']++;
        } else {
            $resources['scripts']['inline']++;
            $resources['scripts']['size'] += mb_strlen($script->textContent);
        }
    }
    
    // 스타일 분석
    $styles = $xpath->query('//link[@rel="stylesheet"]');
    $resources['styles']['count'] = $styles->length;
    $resources['styles']['external'] = $styles->length;
    
    $inlineStyles = $xpath->query('//style');
    $resources['styles']['count'] += $inlineStyles->length;
    $resources['styles']['inline'] = $inlineStyles->length;
    
    foreach ($inlineStyles as $style) {
        $resources['styles']['size'] += mb_strlen($style->textContent);
    }
    
    // 이미지 분석
    $images = $xpath->query('//img');
    $resources['images']['count'] = $images->length;
    
    // 이슈 추출
    $seoIssues = [];
    foreach ($seo as $key => $check) {
        if (isset($check['severity']) && $check['severity'] !== 'none') {
            $seoIssues[] = [
                'id' => 'seo_' . $key,
                'description' => $check['description'],
                'severity' => $check['severity']
            ];
        }
    }
    
    return [
        'seo' => [
            'checks' => $seo,
            'issues' => $seoIssues
        ],
        'resources' => $resources
    ];
}

/**
 * 성능 점수를 계산하는 함수
 * @param array $resources 리소스 분석 결과
 * @param array $headers 응답 헤더
 * @return int 성능 점수 (0-100)
 */
function calculatePerformanceScore($resources, $headers) {
    $score = 100;
    
    // 리소스 수에 따른 감점
    $resourcePenalty = 0;
    if ($resources['scripts']['count'] > 15) {
        $resourcePenalty += min(15, ($resources['scripts']['count'] - 15));
    }
    
    if ($resources['styles']['count'] > 10) {
        $resourcePenalty += min(10, ($resources['styles']['count'] - 10));
    }
    
    if ($resources['images']['count'] > 20) {
        $resourcePenalty += min(15, ($resources['images']['count'] - 20) / 2);
    }
    
    $score -= $resourcePenalty;
    
    // 캐시 관련 헤더 확인
    $cachingScore = 10;
    if (!isset($headers['cache-control']) && !isset($headers['expires'])) {
        $score -= $cachingScore;
    }
    
    // 컴프레션 확인
    $compressionScore = 15;
    if (!isset($headers['content-encoding']) || strpos($headers['content-encoding'], 'gzip') === false) {
        $score -= $compressionScore;
    }
    
    // HTML 사이즈 계산 (대략적인 방법)
    if (isset($headers['content-length'])) {
        $htmlSize = intval($headers['content-length']);
        if ($htmlSize > 100000) { // 100KB 초과
            $score -= min(20, ($htmlSize - 100000) / 10000);
        }
    }
    
    // 점수 범위 조정
    return max(0, min(100, round($score)));
}

/**
 * SEO 점수를 계산하는 함수
 * @param array $seo SEO 분석 결과
 * @return int SEO 점수 (0-100)
 */
function calculateSeoScore($seo) {
    $score = 100;
    
    // 이슈 심각도에 따른 감점
    foreach ($seo['issues'] as $issue) {
        switch ($issue['severity']) {
            case 'high':
                $score -= 20;
                break;
            case 'medium':
                $score -= 10;
                break;
            case 'low':
                $score -= 5;
                break;
        }
    }
    
    // 추가 검사
    if (!$seo['checks']['title']['exists']) {
        $score -= 20;
    } elseif ($seo['checks']['title']['length'] < 10 || $seo['checks']['title']['length'] > 60) {
        $score -= 10;
    }
    
    if (!$seo['checks']['meta_description']['exists']) {
        $score -= 15;
    } elseif ($seo['checks']['meta_description']['length'] < 50 || $seo['checks']['meta_description']['length'] > 160) {
        $score -= 8;
    }
    
    if (!$seo['checks']['headings']['has_h1']) {
        $score -= 15;
    } elseif ($seo['checks']['headings']['h1_count'] > 1) {
        $score -= 5;
    }
    
    // 점수 범위 조정
    return max(0, min(100, round($score)));
}

/**
 * 보안 점수를 계산하는 함수
 * @param array $security 보안 분석 결과
 * @return int 보안 점수 (0-100)
 */
function calculateSecurityScore($security) {
    $score = 100;
    
    // 이슈 심각도에 따른 감점
    foreach ($security['issues'] as $issue) {
        switch ($issue['severity']) {
            case 'high':
                $score -= 20;
                break;
            case 'medium':
                $score -= 10;
                break;
            case 'low':
                $score -= 5;
                break;
        }
    }
    
    // HTTPS 여부에 따른 조정
    if (!$security['checks']['https']['enabled']) {
        $score -= 30; // HTTPS는 매우 중요하므로 추가 감점
    }
    
    // 점수 범위 조정
    return max(0, min(100, round($score)));
}
?>