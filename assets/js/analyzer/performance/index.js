/**
 * 성능 분석 모듈
 * 
 * 웹페이지의 성능 지표를 분석하고 최적화 방안을 제시합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        console.error('KoreanWebAnalyzer 네임스페이스가 존재하지 않습니다.');
        return;
    }
    
    if (!window.KoreanWebAnalyzer.analyzer) {
        window.KoreanWebAnalyzer.analyzer = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 성능 분석기 클래스
     */
    class PerformanceAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                resourceSize: { score: 0, issues: [] },
                requests: { score: 0, issues: [] },
                loadTime: { score: 0, issues: [] },
                mediaOptimization: { score: 0, issues: [] },
                renderingPerformance: { score: 0, issues: [] },
                caching: { score: 0, issues: [] },
                cdnUsage: { score: 0, issues: [] }
            };
            this.perfData = window.performance || {};
            this.analyzer = window.KoreanWebAnalyzer.utils.analyzer;
        }
        
        /**
         * 성능 분석 수행
         * @return {Object} 성능 분석 결과
         */
        analyze() {
            logger.debug('성능 분석 시작');
            
            // 각 영역별 분석 수행
            this.analyzeResourceSize();
            this.analyzeRequests();
            this.analyzeLoadTime();
            this.analyzeMediaOptimization();
            this.analyzeRenderingPerformance();
            this.analyzeCaching();
            this.analyzeCdnUsage();
            
            // 최종 점수 계산
            const score = this.calculateScore();
            
            logger.debug('성능 분석 완료', { score });
            
            return {
                score: score,
                details: this.results
            };
        }
        
        /**
         * 리소스 크기 분석
         */
        analyzeResourceSize() {
            logger.debug('리소스 크기 분석 중');
            
            // Performance API 지원 여부 확인
            if (!this.perfData.getEntriesByType) {
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'api-not-supported',
                        'info',
                        'Performance API가 지원되지 않습니다.',
                        '브라우저가 Performance API를 지원하지 않아 정확한 리소스 크기를 분석할 수 없습니다.',
                        null,
                        '최신 브라우저를 사용하면 더 정확한 분석이 가능합니다.'
                    )
                );
                this.results.resourceSize.score = 50;
                return;
            }
            
            // 리소스 데이터 수집
            const resources = this.perfData.getEntriesByType('resource');
            
            // 리소스가 없는 경우
            if (!resources || resources.length === 0) {
                this.results.resourceSize.score = 100;
                return;
            }
            
            // 리소스 종류별 크기 계산
            const sizes = {
                total: 0,
                js: 0,
                css: 0,
                image: 0,
                font: 0,
                other: 0
            };
            
            const resourceCounts = {
                total: resources.length,
                js: 0,
                css: 0,
                image: 0,
                font: 0,
                other: 0
            };
            
            // 큰 파일 목록
            const largeFiles = [];
            
            // 각 리소스 분석
            resources.forEach(resource => {
                const size = resource.transferSize || resource.encodedBodySize || 0;
                const url = resource.name;
                let type = 'other';
                
                // 종류 판별
                if (url.match(/\.js(\?|$)/i)) {
                    type = 'js';
                } else if (url.match(/\.css(\?|$)/i)) {
                    type = 'css';
                } else if (url.match(/\.(jpe?g|png|gif|svg|webp)(\?|$)/i)) {
                    type = 'image';
                } else if (url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) {
                    type = 'font';
                }
                
                // 크기 누적
                sizes.total += size;
                sizes[type] += size;
                resourceCounts[type]++;
                
                // 큰 파일 체크 (100KB 이상)
                if (size > 100 * 1024) {
                    largeFiles.push({
                        url: url,
                        size: size,
                        type: type
                    });
                }
            });
            
            // 크기 기반 점수 계산 (기준: 총 크기 2MB 이하 양호)
            const totalSizeMB = sizes.total / (1024 * 1024);
            let score = 100;
            
            // 총 크기 기반 점수 조정
            if (totalSizeMB > 5) {
                score -= 50;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'total-size-critical',
                        'critical',
                        '페이지 리소스 크기가 너무 큽니다.',
                        `현재 총 크기: ${totalSizeMB.toFixed(2)}MB (권장: 2MB 이하)`,
                        null,
                        '이미지 최적화, JavaScript/CSS 축소, 중복 리소스 제거, 사용하지 않는 코드 제거 등을 통해 크기를 줄이세요.'
                    )
                );
            } else if (totalSizeMB > 2) {
                score -= 30;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'total-size-high',
                        'major',
                        '페이지 리소스 크기가 큽니다.',
                        `현재 총 크기: ${totalSizeMB.toFixed(2)}MB (권장: 2MB 이하)`,
                        null,
                        '이미지 최적화, JavaScript/CSS 축소, 불필요한 리소스 제거를 통해 크기를 줄이세요.'
                    )
                );
            }
            
            // 대형 파일 감점
            if (largeFiles.length > 5) {
                score -= 20;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'many-large-files',
                        'major',
                        '대용량 파일이 너무 많습니다.',
                        `100KB 이상 파일 수: ${largeFiles.length}개`,
                        null,
                        '큰 파일을 압축하거나 더 작은 단위로 분할하세요.'
                    )
                );
            } else if (largeFiles.length > 0) {
                score -= 10;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'large-files',
                        'minor',
                        '대용량 파일이 있습니다.',
                        `100KB 이상 파일 수: ${largeFiles.length}개`,
                        null,
                        '큰 파일을 압축하거나 더 작은 단위로 분할하세요.'
                    )
                );
            }
            
            // 자바스크립트 크기 분석
            const jsSizeMB = sizes.js / (1024 * 1024);
            if (jsSizeMB > 1) {
                score -= 20;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'js-size-high',
                        'major',
                        'JavaScript 파일 크기가 큽니다.',
                        `JavaScript 총 크기: ${jsSizeMB.toFixed(2)}MB (권장: 1MB 이하)`,
                        null,
                        'JavaScript를 최소화하고, 코드 분할, 트리 쉐이킹, 지연 로딩을 적용하세요.'
                    )
                );
            }
            
            // 이미지 크기 분석
            const imgSizeMB = sizes.image / (1024 * 1024);
            if (imgSizeMB > 1.5) {
                score -= 20;
                this.results.resourceSize.issues.push(
                    this.analyzer.createIssue(
                        'image-size-high',
                        'major',
                        '이미지 파일 크기가 큽니다.',
                        `이미지 총 크기: ${imgSizeMB.toFixed(2)}MB (권장: 1.5MB 이하)`,
                        null,
                        '이미지를 최적화하고, WebP 형식 사용, 적절한 크기로 리사이징, 지연 로딩을 적용하세요.'
                    )
                );
            }
            
            // 최종 점수 설정
            this.results.resourceSize.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.resourceSize.stats = {
                totalSize: sizes.total,
                jsSize: sizes.js,
                cssSize: sizes.css,
                imageSize: sizes.image,
                fontSize: sizes.font,
                otherSize: sizes.other,
                resourceCount: resourceCounts.total,
                jsCount: resourceCounts.js,
                cssCount: resourceCounts.css,
                imageCount: resourceCounts.image,
                fontCount: resourceCounts.font,
                otherCount: resourceCounts.other,
                largeFiles: largeFiles
            };
        }
        
        /**
         * 요청 수 분석
         */
        analyzeRequests() {
            logger.debug('요청 수 분석 중');
            
            // Performance API 지원 여부 확인
            if (!this.perfData.getEntriesByType) {
                this.results.requests.issues.push(
                    this.analyzer.createIssue(
                        'api-not-supported',
                        'info',
                        'Performance API가 지원되지 않습니다.',
                        '브라우저가 Performance API를 지원하지 않아 정확한 요청 수를 분석할 수 없습니다.',
                        null,
                        '최신 브라우저를 사용하면 더 정확한 분석이 가능합니다.'
                    )
                );
                this.results.requests.score = 50;
                return;
            }
            
            // 요청 데이터 수집
            const resources = this.perfData.getEntriesByType('resource');
            const navigationEntry = this.perfData.getEntriesByType('navigation')[0];
            
            // 총 요청 수 (navigation 요청 포함)
            const totalRequests = resources.length + (navigationEntry ? 1 : 0);
            
            // 요청 종류별 수 계산
            const requests = {
                total: totalRequests,
                js: 0,
                css: 0,
                image: 0,
                font: 0,
                other: 0
            };
            
            // 각 리소스의 요청 분석
            resources.forEach(resource => {
                const url = resource.name;
                let type = 'other';
                
                // 종류 판별
                if (url.match(/\.js(\?|$)/i)) {
                    type = 'js';
                } else if (url.match(/\.css(\?|$)/i)) {
                    type = 'css';
                } else if (url.match(/\.(jpe?g|png|gif|svg|webp)(\?|$)/i)) {
                    type = 'image';
                } else if (url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) {
                    type = 'font';
                }
                
                // 요청 수 누적
                requests[type]++;
            });
            
            // 요청 수 기반 점수 계산 (기준: 총 요청 수 50개 이하 양호)
            let score = 100;
            
            // 총 요청 수 기반 점수 조정
            if (totalRequests > 100) {
                score -= 50;
                this.results.requests.issues.push(
                    this.analyzer.createIssue(
                        'total-requests-critical',
                        'critical',
                        '페이지 요청 수가 너무 많습니다.',
                        `현재 총 요청 수: ${totalRequests}개 (권장: 50개 이하)`,
                        null,
                        '리소스 번들링, 스프라이트 이미지 사용, HTTP/2 활용, 불필요한 요청 제거 등을 통해 요청 수를 줄이세요.'
                    )
                );
            } else if (totalRequests > 50) {
                score -= 30;
                this.results.requests.issues.push(
                    this.analyzer.createIssue(
                        'total-requests-high',
                        'major',
                        '페이지 요청 수가 많습니다.',
                        `현재 총 요청 수: ${totalRequests}개 (권장: 50개 이하)`,
                        null,
                        '리소스 번들링, 스프라이트 이미지 사용, 요청 최적화를 통해 요청 수를 줄이세요.'
                    )
                );
            }
            
            // JavaScript 요청 수 분석
            if (requests.js > 15) {
                score -= 20;
                this.results.requests.issues.push(
                    this.analyzer.createIssue(
                        'js-requests-high',
                        'major',
                        'JavaScript 요청 수가 많습니다.',
                        `JavaScript 요청 수: ${requests.js}개 (권장: 15개 이하)`,
                        null,
                        'JavaScript 파일을 번들링하고, 불필요한 라이브러리를 제거하세요.'
                    )
                );
            }
            
            // 이미지 요청 수 분석
            if (requests.image > 20) {
                score -= 20;
                this.results.requests.issues.push(
                    this.analyzer.createIssue(
                        'image-requests-high',
                        'major',
                        '이미지 요청 수가 많습니다.',
                        `이미지 요청 수: ${requests.image}개 (권장: 20개 이하)`,
                        null,
                        'CSS 스프라이트, 데이터 URI, WebP 형식, 이미지 압축 등을 활용하세요.'
                    )
                );
            }
            
            // 최종 점수 설정
            this.results.requests.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.requests.stats = requests;
        }
        
        /**
         * 로딩 시간 분석
         */
        analyzeLoadTime() {
            logger.debug('로딩 시간 분석 중');
            
            // Performance API 및 Navigation Timing API 지원 여부 확인
            if (!this.perfData.getEntriesByType || !this.perfData.timing) {
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'api-not-supported',
                        'info',
                        'Performance API가 지원되지 않습니다.',
                        '브라우저가 필요한 Performance API를 지원하지 않아 정확한 로딩 시간을 분석할 수 없습니다.',
                        null,
                        '최신 브라우저를 사용하면 더 정확한 분석이 가능합니다.'
                    )
                );
                this.results.loadTime.score = 50;
                return;
            }
            
            // 네비게이션 타이밍 데이터 가져오기
            const navEntry = this.perfData.getEntriesByType('navigation')[0] || {};
            const timing = this.perfData.timing || {};
            
            // 주요 지표 계산
            const metrics = {
                // 총 페이지 로딩 시간 (navigationStart ~ loadEventEnd)
                totalLoadTime: (navEntry.loadEventEnd || timing.loadEventEnd - timing.navigationStart) || 0,
                
                // DOM 컨텐츠 로딩 시간 (navigationStart ~ domContentLoadedEventEnd)
                domContentLoadedTime: (navEntry.domContentLoadedEventEnd || timing.domContentLoadedEventEnd - timing.navigationStart) || 0,
                
                // TTFB (Time To First Byte)
                ttfb: (navEntry.responseStart || timing.responseStart - timing.navigationStart) || 0,
                
                // DNS 조회 시간
                dnsTime: (navEntry.domainLookupEnd - navEntry.domainLookupStart || timing.domainLookupEnd - timing.domainLookupStart) || 0,
                
                // TCP 연결 시간
                tcpTime: (navEntry.connectEnd - navEntry.connectStart || timing.connectEnd - timing.connectStart) || 0,
                
                // TLS 핸드셰이크 시간
                tlsTime: (navEntry.secureConnectionStart ? (navEntry.connectEnd - navEntry.secureConnectionStart || timing.connectEnd - timing.secureConnectionStart) : 0) || 0,
                
                // 요청-응답 시간
                requestResponseTime: (navEntry.responseEnd - navEntry.requestStart || timing.responseEnd - timing.requestStart) || 0,
                
                // 콘텐츠 다운로드 시간
                downloadTime: (navEntry.responseEnd - navEntry.responseStart || timing.responseEnd - timing.responseStart) || 0,
                
                // DOM 파싱 시간
                domParsingTime: (navEntry.domInteractive - navEntry.responseEnd || timing.domInteractive - timing.responseEnd) || 0,
                
                // 자원 로딩 시간
                resourceLoadTime: (navEntry.loadEventStart - navEntry.domContentLoadedEventEnd || timing.loadEventStart - timing.domContentLoadedEventEnd) || 0
            };
            
            // 점수 계산
            let score = 100;
            
            // 총 로딩 시간 분석 (3초 이하 권장)
            if (metrics.totalLoadTime > 5000) {
                score -= 50;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'total-load-time-critical',
                        'critical',
                        '페이지 로딩 시간이 너무 깁니다.',
                        `총 로딩 시간: ${(metrics.totalLoadTime / 1000).toFixed(2)}초 (권장: 3초 이하)`,
                        null,
                        '리소스 최적화, 캐싱 전략, CDN 사용, 서버 응답 시간 개선 등을 통해 로딩 시간을 단축하세요.'
                    )
                );
            } else if (metrics.totalLoadTime > 3000) {
                score -= 25;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'total-load-time-high',
                        'major',
                        '페이지 로딩 시간이 깁니다.',
                        `총 로딩 시간: ${(metrics.totalLoadTime / 1000).toFixed(2)}초 (권장: 3초 이하)`,
                        null,
                        '리소스 최적화, 지연 로딩, 적절한 캐싱 전략을 통해 로딩 시간을 개선하세요.'
                    )
                );
            }
            
            // TTFB (Time To First Byte) 분석 (600ms 이하 권장)
            if (metrics.ttfb > 1000) {
                score -= 25;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'ttfb-high',
                        'major',
                        'Time To First Byte(TTFB)가 깁니다.',
                        `TTFB: ${(metrics.ttfb).toFixed(0)}ms (권장: 600ms 이하)`,
                        null,
                        '서버 응답 시간 개선, CDN 사용, 서버 측 캐싱, 데이터베이스 최적화를 통해 TTFB를 단축하세요.'
                    )
                );
            } else if (metrics.ttfb > 600) {
                score -= 15;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'ttfb-moderate',
                        'minor',
                        'Time To First Byte(TTFB)가 다소 깁니다.',
                        `TTFB: ${(metrics.ttfb).toFixed(0)}ms (권장: 600ms 이하)`,
                        null,
                        '서버 응답 시간을 개선하고 CDN을 활용하세요.'
                    )
                );
            }
            
            // DOM 콘텐츠 로딩 시간 분석 (2초 이하 권장)
            if (metrics.domContentLoadedTime > 3000) {
                score -= 20;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'dom-load-time-high',
                        'major',
                        'DOM 콘텐츠 로딩 시간이 깁니다.',
                        `DOM 콘텐츠 로딩 시간: ${(metrics.domContentLoadedTime / 1000).toFixed(2)}초 (권장: 2초 이하)`,
                        null,
                        'JavaScript 최적화, 비동기 로딩, 렌더링 차단 리소스 최소화를 통해 DOM 로딩 시간을 단축하세요.'
                    )
                );
            }
            
            // 자원 로딩 시간 분석
            if (metrics.resourceLoadTime > 2000) {
                score -= 20;
                this.results.loadTime.issues.push(
                    this.analyzer.createIssue(
                        'resource-load-time-high',
                        'major',
                        '자원 로딩 시간이 깁니다.',
                        `자원 로딩 시간: ${(metrics.resourceLoadTime / 1000).toFixed(2)}초`,
                        null,
                        '중요하지 않은 리소스는 지연 로딩하고, 이미지 최적화, 리소스 캐싱을 통해 로딩 시간을 개선하세요.'
                    )
                );
            }
            
            // 최종 점수 설정
            this.results.loadTime.score = Math.max(0, Math.min(100, score));
            
            // 결과에 메트릭 추가
            this.results.loadTime.metrics = metrics;
        }
        
        /**
         * 미디어 최적화 분석
         */
        analyzeMediaOptimization() {
            logger.debug('미디어 최적화 분석 중');
            
            // 이미지 요소 수집
            const images = Array.from(this.doc.querySelectorAll('img'));
            
            // 비디오 요소 수집
            const videos = Array.from(this.doc.querySelectorAll('video'));
            
            // 초기 점수 설정
            let score = 100;
            let unoptimizedImages = 0;
            let largeImages = 0;
            let responsiveIssues = 0;
            let lazyLoadIssues = 0;
            
            // 이미지 분석
            if (images.length > 0) {
                images.forEach((img, index) => {
                    // 이미지 URL
                    const src = img.currentSrc || img.src;
                    if (!src) return;
                    
                    // 이미지 종류 확인
                    const imageFormat = this.getImageFormat(src);
                    
                    // 이미지가 최신 포맷(WebP, AVIF)을 사용하지 않는 경우
                    if (imageFormat && !['webp', 'avif'].includes(imageFormat)) {
                        unoptimizedImages++;
                        
                        // 샘플링: 첫 5개 이슈만 기록
                        if (unoptimizedImages <= 5) {
                            this.results.mediaOptimization.issues.push(
                                this.analyzer.createIssue(
                                    'unoptimized-image-format',
                                    'minor',
                                    '최신 이미지 포맷을 사용하지 않습니다.',
                                    `이미지 포맷: ${imageFormat.toUpperCase()} (권장: WebP, AVIF)`,
                                    img,
                                    'WebP 또는 AVIF 포맷을 사용하면 더 작은 파일 크기로 동일한 품질을 유지할 수 있습니다.'
                                )
                            );
                        }
                    }
                    
                    // 이미지 크기 및 브라우저에 표시되는 크기
                    const displayWidth = img.clientWidth;
                    const displayHeight = img.clientHeight;
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;
                    
                    // 이미지 크기가 표시 크기보다 2배 이상 큰 경우
                    if (naturalWidth > displayWidth * 2 && naturalHeight > displayHeight * 2) {
                        largeImages++;
                        
                        // 샘플링: 첫 5개 이슈만 기록
                        if (largeImages <= 5) {
                            this.results.mediaOptimization.issues.push(
                                this.analyzer.createIssue(
                                    'oversized-image',
                                    'major',
                                    '이미지 크기가 표시 크기보다 훨씬 큽니다.',
                                    `원본 크기: ${naturalWidth}x${naturalHeight}px, 표시 크기: ${displayWidth}x${displayHeight}px`,
                                    img,
                                    '이미지를 표시 크기에 맞게 리사이징하여 불필요한 데이터 전송을 줄이세요.'
                                )
                            );
                        }
                    }
                    
                    // 반응형 이미지 사용 확인 (srcset, sizes 속성)
                    if (!img.hasAttribute('srcset') && (displayWidth > 100 || displayHeight > 100)) {
                        responsiveIssues++;
                        
                        // 샘플링: 첫 5개 이슈만 기록
                        if (responsiveIssues <= 5) {
                            this.results.mediaOptimization.issues.push(
                                this.analyzer.createIssue(
                                    'no-responsive-image',
                                    'minor',
                                    '반응형 이미지를 사용하지 않습니다.',
                                    '큰 이미지에는 srcset 속성을 사용하여 다양한 화면 크기에 최적화된 이미지를 제공해야 합니다.',
                                    img,
                                    'srcset 및 sizes 속성을 사용하여 다양한 화면 크기에 최적화된 이미지를 제공하세요.'
                                )
                            );
                        }
                    }
                    
                    // 지연 로딩 사용 확인 (loading 속성)
                    // 뷰포트 밖에 있는 이미지만 체크 (대략적인 방법)
                    const rect = img.getBoundingClientRect();
                    const isOutOfViewport = (
                        rect.bottom < 0 ||
                        rect.top > window.innerHeight ||
                        rect.right < 0 ||
                        rect.left > window.innerWidth
                    );
                    
                    if (isOutOfViewport && !img.hasAttribute('loading')) {
                        lazyLoadIssues++;
                        
                        // 샘플링: 첫 5개 이슈만 기록
                        if (lazyLoadIssues <= 5) {
                            this.results.mediaOptimization.issues.push(
                                this.analyzer.createIssue(
                                    'no-lazy-loading',
                                    'minor',
                                    '이미지에 지연 로딩을 사용하지 않습니다.',
                                    '뷰포트 밖에 있는 이미지는 loading="lazy" 속성을 사용하여 초기 로딩 시간을 단축할 수 있습니다.',
                                    img,
                                    'loading="lazy" 속성을 추가하여 뷰포트 밖 이미지의 로딩을 지연시키세요.'
                                )
                            );
                        }
                    }
                });
                
                // 이미지 최적화 문제 비율에 따른 점수 조정
                if (images.length > 0) {
                    const unoptimizedRatio = unoptimizedImages / images.length;
                    const oversizedRatio = largeImages / images.length;
                    const nonResponsiveRatio = responsiveIssues / images.length;
                    const nonLazyRatio = lazyLoadIssues / images.length;
                    
                    if (unoptimizedRatio > 0.7) score -= 15;
                    else if (unoptimizedRatio > 0.4) score -= 10;
                    else if (unoptimizedRatio > 0.2) score -= 5;
                    
                    if (oversizedRatio > 0.5) score -= 25;
                    else if (oversizedRatio > 0.3) score -= 15;
                    else if (oversizedRatio > 0.1) score -= 10;
                    
                    if (nonResponsiveRatio > 0.7) score -= 15;
                    else if (nonResponsiveRatio > 0.4) score -= 10;
                    else if (nonResponsiveRatio > 0.2) score -= 5;
                    
                    if (nonLazyRatio > 0.7) score -= 15;
                    else if (nonLazyRatio > 0.4) score -= 10;
                    else if (nonLazyRatio > 0.2) score -= 5;
                }
                
                // 총 이미지 개수가 많은 경우 추가 메시지
                if (images.length > 20) {
                    this.results.mediaOptimization.issues.push(
                        this.analyzer.createIssue(
                            'too-many-images',
                            'info',
                            '이미지가 많습니다.',
                            `총 ${images.length}개의 이미지가 있습니다. 많은 이미지는 페이지 로딩 시간을 증가시킬 수 있습니다.`,
                            null,
                            '필요하지 않은 이미지를 제거하거나, CSS 효과로 대체하는 것을 고려하세요.'
                        )
                    );
                }
            }
            
            // 비디오 분석
            if (videos.length > 0) {
                let unoptimizedVideos = 0;
                let autoplayIssues = 0;
                
                videos.forEach(video => {
                    // 비디오 포맷 확인
                    const sources = Array.from(video.querySelectorAll('source'));
                    let hasModernFormat = false;
                    
                    sources.forEach(source => {
                        const type = source.getAttribute('type');
                        if (type && (type.includes('webm') || type.includes('mp4') || type.includes('h264'))) {
                            hasModernFormat = true;
                        }
                    });
                    
                    if (!hasModernFormat && sources.length > 0) {
                        unoptimizedVideos++;
                        this.results.mediaOptimization.issues.push(
                            this.analyzer.createIssue(
                                'unoptimized-video-format',
                                'minor',
                                '최적화되지 않은 비디오 포맷을 사용합니다.',
                                '최신 비디오 코덱(WebM, MP4/H.264)을 사용하면 파일 크기를 줄일 수 있습니다.',
                                video,
                                'WebM 또는 MP4/H.264 포맷의 비디오를 제공하세요.'
                            )
                        );
                    }
                    
                    // 자동 재생 확인 (모바일에서 문제될 수 있음)
                    if (video.hasAttribute('autoplay') && !video.hasAttribute('muted')) {
                        autoplayIssues++;
                        this.results.mediaOptimization.issues.push(
                            this.analyzer.createIssue(
                                'unmuted-autoplay',
                                'major',
                                '음소거되지 않은 자동 재생 비디오가 있습니다.',
                                '음소거되지 않은 자동 재생 비디오는 모바일 기기에서 재생되지 않을 수 있으며, 사용자 경험을 저해합니다.',
                                video,
                                '자동 재생 비디오에는 muted 속성을 추가하세요.'
                            )
                        );
                    }
                    
                    // preload 속성 확인
                    if (video.getAttribute('preload') === 'auto') {
                        this.results.mediaOptimization.issues.push(
                            this.analyzer.createIssue(
                                'video-preload-auto',
                                'minor',
                                '비디오에 preload="auto"가 설정되어 있습니다.',
                                'preload="auto"는 초기 페이지 로딩 시 불필요한 데이터를 다운로드할 수 있습니다.',
                                video,
                                'preload="metadata" 또는 preload="none"을 사용하여 필요할 때만 비디오를 로드하세요.'
                            )
                        );
                    }
                });
                
                // 비디오 최적화 문제에 따른 점수 조정
                if (unoptimizedVideos > 0) score -= 15;
                if (autoplayIssues > 0) score -= 20;
            }
            
            // 결과 설정
            this.results.mediaOptimization.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.mediaOptimization.stats = {
                imageCount: images.length,
                videoCount: videos.length,
                unoptimizedImages: unoptimizedImages,
                oversizedImages: largeImages,
                nonResponsiveImages: responsiveIssues,
                nonLazyLoadImages: lazyLoadIssues
            };
        }
        
        /**
         * 렌더링 성능 분석
         */
        analyzeRenderingPerformance() {
            logger.debug('렌더링 성능 분석 중');
            
            let score = 100;
            
            // DOM 크기 분석
            const domSize = this.doc.getElementsByTagName('*').length;
            let domSizeIssue = false;
            
            if (domSize > 2000) {
                score -= 30;
                domSizeIssue = true;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'dom-size-critical',
                        'critical',
                        'DOM 크기가 너무 큽니다.',
                        `DOM 요소 수: ${domSize}개 (권장: 1500개 이하)`,
                        null,
                        '불필요한 DOM 요소를 제거하고, 큰 목록은 가상화 기술을 사용하세요.'
                    )
                );
            } else if (domSize > 1500) {
                score -= 20;
                domSizeIssue = true;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'dom-size-high',
                        'major',
                        'DOM 크기가 큽니다.',
                        `DOM 요소 수: ${domSize}개 (권장: 1500개 이하)`,
                        null,
                        '불필요한 요소를 제거하고 DOM 구조를 최적화하세요.'
                    )
                );
            }
            
            // CSS 선택자 복잡성 분석 (기초적인 방법)
            const styleSheets = Array.from(this.doc.styleSheets);
            let complexSelectorCount = 0;
            
            try {
                styleSheets.forEach(sheet => {
                    try {
                        const rules = sheet.cssRules || sheet.rules;
                        
                        for (let i = 0; i < rules.length; i++) {
                            const rule = rules[i];
                            
                            if (rule.selectorText) {
                                // 복잡한 선택자 감지 (단순 휴리스틱)
                                const selectors = rule.selectorText.split(',');
                                
                                selectors.forEach(selector => {
                                    // 중첩 선택자 복잡성 체크
                                    const depth = selector.trim().split(' ').length;
                                    const hasUniversal = selector.includes('*');
                                    const hasMultipleClasses = (selector.match(/\./g) || []).length > 2;
                                    
                                    if (depth > 4 || hasUniversal || hasMultipleClasses) {
                                        complexSelectorCount++;
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        // CORS 오류 등 무시
                    }
                });
            } catch (e) {
                // 스타일시트 접근 오류 무시
            }
            
            if (complexSelectorCount > 50) {
                score -= 20;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'complex-selectors',
                        'major',
                        '복잡한 CSS 선택자가 너무 많습니다.',
                        `복잡한 선택자 수: 약 ${complexSelectorCount}개`,
                        null,
                        'CSS 선택자를 단순화하고, 과도한 중첩을 피하세요. 유니버설 선택자 (*) 사용을 최소화하세요.'
                    )
                );
            } else if (complexSelectorCount > 20) {
                score -= 10;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'complex-selectors-moderate',
                        'minor',
                        '복잡한 CSS 선택자가 많습니다.',
                        `복잡한 선택자 수: 약 ${complexSelectorCount}개`,
                        null,
                        'CSS 선택자를 단순화하고, 중첩된 선택자 사용을 줄이세요.'
                    )
                );
            }
            
            // 인라인 스타일 사용 체크
            const elementsWithInlineStyle = this.doc.querySelectorAll('[style]');
            
            if (elementsWithInlineStyle.length > 50) {
                score -= 15;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'inline-styles-high',
                        'major',
                        '인라인 스타일을 과도하게 사용합니다.',
                        `인라인 스타일 사용 요소 수: ${elementsWithInlineStyle.length}개`,
                        null,
                        '인라인 스타일 대신 CSS 클래스를 사용하세요. 인라인 스타일은 렌더링 성능을 저하시킬 수 있습니다.'
                    )
                );
            } else if (elementsWithInlineStyle.length > 20) {
                score -= 8;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'inline-styles-moderate',
                        'minor',
                        '인라인 스타일을 많이 사용합니다.',
                        `인라인 스타일 사용 요소 수: ${elementsWithInlineStyle.length}개`,
                        null,
                        '가능한 인라인 스타일 대신 CSS 클래스를 사용하세요.'
                    )
                );
            }
            
            // 애니메이션 성능 체크
            const animatedElements = this.findAnimatedElements();
            let nonGpuAcceleratedCount = 0;
            
            animatedElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const transform = style.transform || style.webkitTransform;
                const willChange = style.willChange;
                
                // GPU 가속을 받지 않는 애니메이션 감지
                if (
                    !transform.includes('matrix3d') &&
                    !transform.includes('translate3d') &&
                    !willChange.includes('transform') &&
                    !willChange.includes('opacity')
                ) {
                    nonGpuAcceleratedCount++;
                }
            });
            
            if (nonGpuAcceleratedCount > 5) {
                score -= 15;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'non-gpu-animations',
                        'major',
                        'GPU 가속을 사용하지 않는 애니메이션이 있습니다.',
                        `GPU 가속 없는 애니메이션 요소 수: 약 ${nonGpuAcceleratedCount}개`,
                        null,
                        'transform 대신 left/top을 애니메이션하는 경우 성능이 저하됩니다. transform: translate3d() 또는 will-change: transform을 사용하세요.'
                    )
                );
            }
            
            // 렌더링 차단 리소스 분석
            const renderBlockingResources = this.findRenderBlockingResources();
            
            if (renderBlockingResources.cssCount > 5) {
                score -= 15;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'render-blocking-css',
                        'major',
                        '렌더링 차단 CSS가 너무 많습니다.',
                        `렌더링 차단 CSS 파일 수: ${renderBlockingResources.cssCount}개`,
                        null,
                        '중요한 CSS는 인라인으로 포함하고, 나머지는 media 쿼리를 사용하거나 비동기적으로 로드하세요.'
                    )
                );
            }
            
            if (renderBlockingResources.jsCount > 3) {
                score -= 15;
                this.results.renderingPerformance.issues.push(
                    this.analyzer.createIssue(
                        'render-blocking-js',
                        'major',
                        '렌더링 차단 JavaScript가 너무 많습니다.',
                        `렌더링 차단 JavaScript 파일 수: ${renderBlockingResources.jsCount}개`,
                        null,
                        'JavaScript 파일에 async 또는 defer 속성을 사용하거나, 페이지 하단에 배치하세요.'
                    )
                );
            }
            
            // 결과 설정
            this.results.renderingPerformance.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.renderingPerformance.stats = {
                domSize: domSize,
                complexSelectors: complexSelectorCount,
                inlineStylesCount: elementsWithInlineStyle.length,
                animatedElements: animatedElements.length,
                nonGpuAcceleratedAnimations: nonGpuAcceleratedCount,
                renderBlockingCss: renderBlockingResources.cssCount,
                renderBlockingJs: renderBlockingResources.jsCount
            };
        }
        
        /**
         * 캐싱 분석
         */
        analyzeCaching() {
            logger.debug('캐싱 전략 분석 중');
            
            // Performance API 지원 여부 확인
            if (!this.perfData.getEntriesByType) {
                this.results.caching.issues.push(
                    this.analyzer.createIssue(
                        'api-not-supported',
                        'info',
                        'Performance API가 지원되지 않습니다.',
                        '브라우저가 Performance API를 지원하지 않아 정확한 캐싱 분석을 할 수 없습니다.',
                        null,
                        '최신 브라우저를 사용하면 더 정확한 분석이 가능합니다.'
                    )
                );
                this.results.caching.score = 50;
                return;
            }
            
            // 점수 초기화
            let score = 100;
            
            // 리소스 수집
            const resources = this.perfData.getEntriesByType('resource');
            
            // 리소스가 없는 경우
            if (!resources || resources.length === 0) {
                this.results.caching.score = 100;
                return;
            }
            
            // 캐싱 헤더를 분석할 수 없음 (CORS 제한)
            // 대신 일반적인 캐싱 권장사항 제공
            this.results.caching.issues.push(
                this.analyzer.createIssue(
                    'cache-analysis-limited',
                    'info',
                    '브라우저 제한으로 인해 상세 캐싱 분석을 할 수 없습니다.',
                    'CORS 정책으로 인해 HTTP 헤더를 검사할 수 없습니다.',
                    null,
                    '서버 측에서 Cache-Control, Expires, ETag 헤더를 적절히 설정하여 리소스 캐싱을 최적화하세요.'
                )
            );
            
            // 기본 캐싱 권장사항 제공
            this.results.caching.issues.push(
                this.analyzer.createIssue(
                    'caching-recommendation',
                    'info',
                    '리소스 캐싱 권장사항',
                    '적절한 캐싱 전략으로 반복 방문자의 페이지 로딩 시간을 크게 단축할 수 있습니다.',
                    null,
                    `- 정적 리소스(JS, CSS, 이미지)에는 장기 캐싱(Cache-Control: max-age=31536000) 설정
- 버전 관리된 URL 또는 지문 방식(URL에 해시 포함)을 사용하여 캐시 무효화
- HTML은 짧은 캐싱 또는 캐싱하지 않음(Cache-Control: no-cache 또는 max-age=0)
- ETag 또는 Last-Modified 헤더를 사용하여 조건부 요청 지원`
                )
            );
            
            // 서비스 워커 분석
            if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations()
                    .then(registrations => {
                        if (!registrations || registrations.length === 0) {
                            this.results.caching.issues.push(
                                this.analyzer.createIssue(
                                    'no-service-worker',
                                    'info',
                                    '서비스 워커가 등록되어 있지 않습니다.',
                                    '서비스 워커를 사용하면 오프라인 지원 및 더 빠른 반복 방문을 제공할 수 있습니다.',
                                    null,
                                    '서비스 워커를 구현하여 리소스 캐싱 및 오프라인 경험을 개선하세요.'
                                )
                            );
                        }
                    })
                    .catch(() => {
                        // 서비스 워커 접근 오류 무시
                    });
            }
            
            // 결과 설정
            this.results.caching.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.caching.stats = {
                totalResources: resources.length
            };
        }
        
        /**
         * CDN 사용 분석
         */
        analyzeCdnUsage() {
            logger.debug('CDN 사용 분석 중');
            
            // Performance API 지원 여부 확인
            if (!this.perfData.getEntriesByType) {
                this.results.cdnUsage.issues.push(
                    this.analyzer.createIssue(
                        'api-not-supported',
                        'info',
                        'Performance API가 지원되지 않습니다.',
                        '브라우저가 Performance API를 지원하지 않아 정확한 CDN 분석을 할 수 없습니다.',
                        null,
                        '최신 브라우저를 사용하면 더 정확한 분석이 가능합니다.'
                    )
                );
                this.results.cdnUsage.score = 50;
                return;
            }
            
            // 리소스 수집
            const resources = this.perfData.getEntriesByType('resource');
            
            // 리소스가 없는 경우
            if (!resources || resources.length === 0) {
                this.results.cdnUsage.score = 100;
                return;
            }
            
            // 점수 초기화
            let score = 100;
            
            // 자체 도메인과 CDN 도메인 식별
            const currentHostname = window.location.hostname;
            const resourcesByDomain = {};
            let totalSize = 0;
            let cdnSize = 0;
            
            // 알려진 CDN 도메인 목록
            const knownCdns = [
                'cdn.', '.cloudfront.net', '.akamai.', '.fastly.', '.cloudflare.',
                '.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', '.hwcdn.',
                'ajax.googleapis.com', 'fonts.googleapis.com', 'fonts.gstatic.com'
            ];
            
            // 리소스 도메인별 분류
            resources.forEach(resource => {
                try {
                    const url = new URL(resource.name);
                    const hostname = url.hostname;
                    const size = resource.transferSize || resource.encodedBodySize || 0;
                    
                    totalSize += size;
                    
                    // 도메인별 리소스 수집
                    if (!resourcesByDomain[hostname]) {
                        resourcesByDomain[hostname] = {
                            count: 0,
                            size: 0,
                            isCdn: false
                        };
                    }
                    
                    resourcesByDomain[hostname].count++;
                    resourcesByDomain[hostname].size += size;
                    
                    // CDN 도메인 감지
                    const isCdn = hostname !== currentHostname && knownCdns.some(cdn => hostname.includes(cdn));
                    resourcesByDomain[hostname].isCdn = isCdn;
                    
                    if (isCdn) {
                        cdnSize += size;
                    }
                } catch (e) {
                    // URL 파싱 오류 무시
                }
            });
            
            // CDN 사용 비율 계산
            const cdnUsageRatio = totalSize > 0 ? cdnSize / totalSize : 0;
            
            // CDN 사용 점수 계산
            if (cdnUsageRatio < 0.3) {
                score -= 30;
                this.results.cdnUsage.issues.push(
                    this.analyzer.createIssue(
                        'low-cdn-usage',
                        'major',
                        'CDN 사용률이 낮습니다.',
                        `CDN 리소스 비율: ${Math.round(cdnUsageRatio * 100)}% (권장: 70% 이상)`,
                        null,
                        '정적 콘텐츠(이미지, JavaScript, CSS, 폰트 등)에 CDN을 사용하면 로딩 시간을 단축할 수 있습니다.'
                    )
                );
            } else if (cdnUsageRatio < 0.7) {
                score -= 15;
                this.results.cdnUsage.issues.push(
                    this.analyzer.createIssue(
                        'moderate-cdn-usage',
                        'minor',
                        'CDN 사용률을 개선할 수 있습니다.',
                        `CDN 리소스 비율: ${Math.round(cdnUsageRatio * 100)}% (권장: 70% 이상)`,
                        null,
                        '더 많은 정적 콘텐츠를 CDN을 통해 제공하여 사용자 경험을 개선하세요.'
                    )
                );
            }
            
            // 리소스 종류별 CDN 사용 분석
            this.analyzeCdnByResourceType(resources, currentHostname, knownCdns, score);
            
            // 도메인 샤딩 감지 (HTTP/1.1에서 유용, HTTP/2에서는 불필요)
            const domainCount = Object.keys(resourcesByDomain).length;
            
            if (domainCount > 10) {
                // 과도한 도메인 감지 (HTTP/2에서는 문제될 수 있음)
                this.results.cdnUsage.issues.push(
                    this.analyzer.createIssue(
                        'excessive-domains',
                        'info',
                        '너무 많은 도메인을 사용합니다.',
                        `리소스가 ${domainCount}개의 다른 도메인에서 로드되고 있습니다.`,
                        null,
                        'HTTP/2를 사용하는 경우 도메인 샤딩(여러 도메인 사용)은 불필요하며 성능을 저하시킬 수 있습니다. 도메인 수를 줄이는 것이 좋습니다.'
                    )
                );
            }
            
            // 결과 설정
            this.results.cdnUsage.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.cdnUsage.stats = {
                totalSize: totalSize,
                cdnSize: cdnSize,
                cdnUsageRatio: cdnUsageRatio,
                domains: Object.keys(resourcesByDomain).length,
                resourcesByDomain: resourcesByDomain
            };
        }
        
        /**
         * 리소스 유형별 CDN 사용 분석
         * @param {Array} resources - 리소스 목록
         * @param {string} currentHostname - 현재 호스트명
         * @param {Array} knownCdns - 알려진 CDN 목록
         * @param {number} score - 현재 점수
         */
        analyzeCdnByResourceType(resources, currentHostname, knownCdns, score) {
            // 리소스 유형별 분류
            const resourceTypes = {
                images: { total: 0, cdn: 0, size: 0, cdnSize: 0 },
                js: { total: 0, cdn: 0, size: 0, cdnSize: 0 },
                css: { total: 0, cdn: 0, size: 0, cdnSize: 0 },
                fonts: { total: 0, cdn: 0, size: 0, cdnSize: 0 }
            };
            
            resources.forEach(resource => {
                try {
                    const url = new URL(resource.name);
                    const hostname = url.hostname;
                    const path = url.pathname;
                    const size = resource.transferSize || resource.encodedBodySize || 0;
                    const isCdn = hostname !== currentHostname && knownCdns.some(cdn => hostname.includes(cdn));
                    
                    let type = 'other';
                    
                    // 리소스 유형 결정
                    if (path.match(/\.(jpe?g|png|gif|svg|webp)(\?|$)/i)) {
                        type = 'images';
                    } else if (path.match(/\.js(\?|$)/i)) {
                        type = 'js';
                    } else if (path.match(/\.css(\?|$)/i)) {
                        type = 'css';
                    } else if (path.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) {
                        type = 'fonts';
                    }
                    
                    // 해당 유형이 있으면 통계 업데이트
                    if (resourceTypes[type]) {
                        resourceTypes[type].total++;
                        resourceTypes[type].size += size;
                        
                        if (isCdn) {
                            resourceTypes[type].cdn++;
                            resourceTypes[type].cdnSize += size;
                        }
                    }
                } catch (e) {
                    // URL 파싱 오류 무시
                }
            });
            
            // 이미지 CDN 사용 분석
            if (resourceTypes.images.total > 5) {
                const imagesCdnRatio = resourceTypes.images.cdnSize / resourceTypes.images.size;
                
                if (imagesCdnRatio < 0.5) {
                    this.results.cdnUsage.issues.push(
                        this.analyzer.createIssue(
                            'images-not-on-cdn',
                            'major',
                            '이미지가 CDN을 통해 제공되지 않습니다.',
                            `이미지 CDN 사용률: ${Math.round(imagesCdnRatio * 100)}% (권장: 80% 이상)`,
                            null,
                            '이미지를 CDN을 통해 제공하면 로딩 시간이 크게 단축될 수 있습니다.'
                        )
                    );
                }
            }
            
            // 자바스크립트 CDN 사용 분석
            if (resourceTypes.js.total > 3) {
                const jsCdnRatio = resourceTypes.js.cdnSize / resourceTypes.js.size;
                
                if (jsCdnRatio < 0.5) {
                    this.results.cdnUsage.issues.push(
                        this.analyzer.createIssue(
                            'js-not-on-cdn',
                            'minor',
                            'JavaScript 파일이 CDN을 통해 제공되지 않습니다.',
                            `JavaScript CDN 사용률: ${Math.round(jsCdnRatio * 100)}% (권장: 80% 이상)`,
                            null,
                            '특히 큰 JavaScript 라이브러리는 CDN을 통해 제공하면 로딩 시간을 단축할 수 있습니다.'
                        )
                    );
                }
            }
            
            // 폰트 CDN 사용 분석
            if (resourceTypes.fonts.total > 0) {
                const fontsCdnRatio = resourceTypes.fonts.cdnSize / resourceTypes.fonts.size;
                
                if (fontsCdnRatio < 0.5) {
                    this.results.cdnUsage.issues.push(
                        this.analyzer.createIssue(
                            'fonts-not-on-cdn',
                            'minor',
                            '웹 폰트가 CDN을 통해 제공되지 않습니다.',
                            `웹 폰트 CDN 사용률: ${Math.round(fontsCdnRatio * 100)}% (권장: 100%)`,
                            null,
                            '웹 폰트는 Google Fonts와 같은 CDN을 통해 제공하면 로딩 성능이 향상됩니다.'
                        )
                    );
                }
            }
        }
        
        /**
         * 최종 점수 계산
         * @return {number} 0-100 사이의 종합 점수
         */
        calculateScore() {
            const weights = {
                resourceSize: 0.2,
                requests: 0.15,
                loadTime: 0.25,
                mediaOptimization: 0.15,
                renderingPerformance: 0.15,
                caching: 0.05,
                cdnUsage: 0.05
            };
            
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 가중치 적용하여 점수 계산
            for (const [key, weight] of Object.entries(weights)) {
                if (typeof this.results[key].score === 'number') {
                    weightedScore += this.results[key].score * weight;
                    totalWeight += weight;
                }
            }
            
            // 총 가중치가 0이면 기본값 반환
            if (totalWeight === 0) {
                return 0;
            }
            
            // 가중치로 나누어 최종 점수 계산
            return Math.round(weightedScore / totalWeight);
        }
        
        /**
         * 이미지 포맷 확인
         * @param {string} url - 이미지 URL
         * @return {string|null} 이미지 포맷
         */
        getImageFormat(url) {
            const extension = url.split('.').pop().toLowerCase().split('?')[0];
            
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif'].includes(extension)) {
                return extension;
            }
            
            return null;
        }
        
        /**
         * 애니메이션 요소 찾기 (기본적인 방법)
         * @return {Array} 애니메이션되는 요소
         */
        findAnimatedElements() {
            const animatedElements = [];
            
            // CSS 애니메이션 요소
            const elementsWithAnimation = Array.from(this.doc.querySelectorAll('[class*="anim"], [class*="animate"], [class*="motion"]'));
            
            // 트랜지션 요소
            const elementsWithTransition = [];
            const allElements = Array.from(this.doc.querySelectorAll('*'));
            
            // 트랜지션 속성이 있는 요소 샘플링 (첫 300개만 확인)
            for (let i = 0; i < Math.min(allElements.length, 300); i++) {
                const style = window.getComputedStyle(allElements[i]);
                
                if (style.transition !== 'all 0s ease 0s' && style.transition !== 'none') {
                    elementsWithTransition.push(allElements[i]);
                }
            }
            
            // 결과 합치기
            return [...new Set([...elementsWithAnimation, ...elementsWithTransition])];
        }
        
        /**
         * 렌더링 차단 리소스 찾기
         * @return {Object} 렌더링 차단 리소스 통계
         */
        findRenderBlockingResources() {
            const result = {
                cssCount: 0,
                jsCount: 0
            };
            
            // 렌더링 차단 CSS (head에 있는 동기 스타일시트)
            const stylesheets = Array.from(this.doc.head.querySelectorAll('link[rel="stylesheet"]'));
            
            stylesheets.forEach(stylesheet => {
                // media 속성이 없거나 screen/all/빈 문자열인 경우 렌더링 차단
                const media = stylesheet.getAttribute('media');
                if (!media || media.includes('screen') || media.includes('all') || media === '') {
                    result.cssCount++;
                }
            });
            
            // 렌더링 차단 JavaScript (head에 있는 동기 스크립트)
            const scripts = Array.from(this.doc.head.querySelectorAll('script[src]'));
            
            scripts.forEach(script => {
                // async/defer 속성이 없는 경우 렌더링 차단
                if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
                    result.jsCount++;
                }
            });
            
            return result;
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.performance = {
        /**
         * 성능 분석 수행
         * @param {Document} [doc] - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new PerformanceAnalyzer(doc);
            return analyzer.analyze();
        }
    };
    
    logger.debug('성능 분석 모듈 초기화 완료');
})();