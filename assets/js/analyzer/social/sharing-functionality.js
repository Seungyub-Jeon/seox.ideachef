/**
 * 공유 기능 분석 컴포넌트
 * 
 * 웹페이지의 소셜 미디어 공유 기능을 분석하고
 * URL 구조, 공유 버튼, 사용자 경험을 검증합니다.
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
    
    if (!window.KoreanWebAnalyzer.analyzer.social) {
        window.KoreanWebAnalyzer.analyzer.social = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 공유 기능 분석 클래스
     */
    class SharingFunctionalityAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                score: 0,
                url: {
                    valid: false,
                    issues: []
                },
                shareButtons: {
                    found: false,
                    count: 0,
                    platforms: [],
                    issues: []
                },
                issues: [],
                recommendations: []
            };
            
            // 검색할 공유 버튼 관련 키워드
            this.shareKeywords = [
                'share', 'sharing', 'social', 'facebook', 'twitter', 'linkedin', 'pinterest',
                'kakao', 'line', 'band', 'whatsapp', 'telegram', 'email',
                '공유', '트위터', '페이스북', '카카오', '라인', '밴드', '텔레그램', '이메일'
            ];
            
            // 검색할 공유 아이콘 클래스
            this.shareIconClasses = [
                'fa-share', 'fa-facebook', 'fa-twitter', 'fa-linkedin', 'fa-pinterest',
                'icon-share', 'icon-facebook', 'icon-twitter', 'icon-linkedin',
                'share-icon', 'social-icon'
            ];
            
            // 소셜 미디어 플랫폼 URL 패턴
            this.platformUrls = {
                facebook: /facebook\.com\/sharer/i,
                twitter: /twitter\.com\/intent\/tweet/i,
                linkedin: /linkedin\.com\/sharing/i,
                pinterest: /pinterest\.com\/pin\/create/i,
                kakao: /kakao\.com|kakao\.link/i,
                line: /line\.me/i,
                band: /band\.us/i,
                whatsapp: /whatsapp/i,
                telegram: /telegram/i,
                email: /mailto:/i
            };
        }
        
        /**
         * 공유 기능 분석 실행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('공유 기능 분석 시작');
            
            // URL 구조 분석
            this.analyzeUrl();
            
            // 공유 버튼 감지 및 분석
            this.detectShareButtons();
            
            // 공유 스크립트 감지
            this.detectSharingScripts();
            
            // 점수 계산
            this.calculateScore();
            
            // 권장사항 생성
            this.generateRecommendations();
            
            logger.debug('공유 기능 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * URL 구조 분석
         */
        analyzeUrl() {
            // 현재 URL 가져오기
            const currentUrl = this.doc.location.href;
            this.results.url.value = currentUrl;
            
            try {
                // URL 유효성 확인
                const urlObj = new URL(currentUrl);
                this.results.url.valid = true;
                
                // HTTPS 프로토콜 확인
                if (urlObj.protocol !== 'https:') {
                    this.results.url.issues.push('비보안 HTTP URL은 일부 소셜 미디어 플랫폼에서 공유가 제한될 수 있습니다.');
                    this.results.issues.push({
                        id: 'non_https_url',
                        type: 'url',
                        severity: 'major',
                        description: '웹페이지가 HTTPS를 사용하지 않습니다.',
                        solution: '소셜 미디어 공유를 위해 HTTPS로 전환하세요.'
                    });
                }
                
                // URL 길이 확인 (2000자 이상은 매우 긴 URL)
                if (currentUrl.length > 2000) {
                    this.results.url.issues.push('URL이 너무 깁니다 (2000자 초과). 일부 플랫폼에서 잘릴 수 있습니다.');
                    this.results.issues.push({
                        id: 'long_url',
                        type: 'url',
                        severity: 'minor',
                        description: 'URL이 매우 깁니다 (' + currentUrl.length + '자).',
                        solution: '소셜 미디어 공유를 위해 더 짧은 URL을 사용하세요.'
                    });
                }
                
                // 특수 문자 및 파라미터 확인
                if (urlObj.search.length > 100) {
                    this.results.url.issues.push('URL에 많은 쿼리 파라미터가 포함되어 있습니다. 일부 공유 시 문제가 될 수 있습니다.');
                    this.results.issues.push({
                        id: 'complex_url_parameters',
                        type: 'url',
                        severity: 'minor',
                        description: 'URL에 많은 쿼리 파라미터가 있습니다.',
                        solution: '공유용 URL을 단순화하거나 정식 URL(canonical URL)을 설정하세요.'
                    });
                }
                
                // 프래그먼트(#) 확인
                if (urlObj.hash && urlObj.hash.length > 20) {
                    this.results.url.issues.push('URL에 긴 해시 프래그먼트가 있습니다. 일부 플랫폼에서 문제가 될 수 있습니다.');
                    this.results.issues.push({
                        id: 'long_url_fragment',
                        type: 'url',
                        severity: 'info',
                        description: 'URL에 긴 해시 프래그먼트가 있습니다.',
                        solution: '가능한 경우 경로 기반 URL을 사용하세요.'
                    });
                }
                
                // 정식 URL(canonical) 확인
                const canonicalTag = this.doc.querySelector('link[rel="canonical"]');
                if (!canonicalTag) {
                    this.results.url.issues.push('정식 URL(canonical URL)이 설정되지 않았습니다.');
                    this.results.issues.push({
                        id: 'missing_canonical_url',
                        type: 'url',
                        severity: 'minor',
                        description: '정식 URL(canonical URL)이 설정되지 않았습니다.',
                        solution: '소셜 미디어 공유를 최적화하기 위해 canonical URL을 설정하세요.'
                    });
                } else {
                    const canonicalUrl = canonicalTag.getAttribute('href');
                    if (canonicalUrl !== currentUrl.split('#')[0] && 
                        canonicalUrl !== currentUrl.split('?')[0]) {
                        // 정보 제공용
                        this.results.url.canonicalUrl = canonicalUrl;
                    }
                }
            } catch (error) {
                this.results.url.valid = false;
                this.results.url.issues.push('유효하지 않은 URL 형식입니다.');
                this.results.issues.push({
                    id: 'invalid_url',
                    type: 'url',
                    severity: 'critical',
                    description: '유효하지 않은 URL 형식입니다.',
                    solution: '유효한 URL 형식을 사용하세요.'
                });
            }
        }
        
        /**
         * 공유 버튼 감지 및 분석
         */
        detectShareButtons() {
            // 공유 버튼 후보 찾기
            const shareButtonCandidates = this.findShareButtonCandidates();
            
            // 공유 버튼이 없는 경우
            if (shareButtonCandidates.length === 0) {
                this.results.shareButtons.found = false;
                this.results.issues.push({
                    id: 'no_share_buttons',
                    type: 'functionality',
                    severity: 'major',
                    description: '페이지에 소셜 미디어 공유 버튼이 없습니다.',
                    solution: '소셜 미디어 공유 버튼을 추가하여 콘텐츠 공유를 촉진하세요.'
                });
                return;
            }
            
            // 공유 버튼 데이터 저장
            this.results.shareButtons.found = true;
            this.results.shareButtons.count = shareButtonCandidates.length;
            
            // 공유 플랫폼 식별
            const platforms = this.identifyPlatforms(shareButtonCandidates);
            this.results.shareButtons.platforms = platforms;
            
            // 권장 최소 플랫폼 수
            const minRecommendedPlatforms = 3;
            
            if (platforms.length < minRecommendedPlatforms) {
                this.results.shareButtons.issues.push(`공유 버튼이 ${platforms.length}개만 있습니다. 최소 ${minRecommendedPlatforms}개가 권장됩니다.`);
                this.results.issues.push({
                    id: 'few_share_platforms',
                    type: 'functionality',
                    severity: 'minor',
                    description: `공유 버튼이 ${platforms.length}개만 있습니다.`,
                    solution: `최소 ${minRecommendedPlatforms}개의 주요 소셜 미디어 플랫폼에 대한 공유 버튼을 제공하세요.`
                });
            }
            
            // 모바일 메신저 지원 확인 (한국 시장에 중요)
            const hasKoreanPlatforms = platforms.some(p => ['kakao', 'line', 'band'].includes(p));
            if (!hasKoreanPlatforms) {
                this.results.shareButtons.issues.push('한국에서 많이 사용되는 메신저 공유 옵션(카카오톡, 라인, 밴드 등)이 없습니다.');
                this.results.issues.push({
                    id: 'no_korean_platforms',
                    type: 'functionality',
                    severity: 'minor',
                    description: '한국에서 많이 사용되는 메신저 공유 옵션이 없습니다.',
                    solution: '카카오톡, 라인, 밴드와 같은 한국 메신저 플랫폼에 대한 공유 옵션을 추가하세요.'
                });
            }
            
            // 접근성 확인
            this.checkShareButtonsAccessibility(shareButtonCandidates);
        }
        
        /**
         * 공유 버튼 후보 찾기
         * @return {Array} 공유 버튼 요소 배열
         */
        findShareButtonCandidates() {
            const candidates = [];
            
            // 1. 공유 관련 텍스트 또는 아이콘 클래스가 있는 버튼/링크 찾기
            const elements = this.doc.querySelectorAll('a, button, [role="button"]');
            
            elements.forEach(el => {
                const text = el.textContent.toLowerCase();
                const classes = el.className.toLowerCase();
                const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                const title = el.getAttribute('title')?.toLowerCase() || '';
                
                // 텍스트, 클래스, aria-label, title 확인
                const matchesKeyword = this.shareKeywords.some(keyword => 
                    text.includes(keyword.toLowerCase()) || 
                    ariaLabel.includes(keyword.toLowerCase()) || 
                    title.includes(keyword.toLowerCase())
                );
                
                const hasShareIconClass = this.shareIconClasses.some(className => 
                    classes.includes(className)
                );
                
                if (matchesKeyword || hasShareIconClass) {
                    candidates.push(el);
                }
            });
            
            // 2. 공유 URL을 가진 링크 찾기
            const links = this.doc.querySelectorAll('a[href]');
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                
                if (!href) return;
                
                // 소셜 미디어 공유 URL 패턴 확인
                const isSharingUrl = Object.values(this.platformUrls).some(pattern => 
                    pattern.test(href)
                );
                
                if (isSharingUrl && !candidates.includes(link)) {
                    candidates.push(link);
                }
            });
            
            // 3. 데이터 속성 확인 (AddToAny, ShareThis, AddThis 등)
            const dataShareElements = this.doc.querySelectorAll('[data-share], [data-type="share"], .addthis_button, .sharethis-button');
            
            dataShareElements.forEach(el => {
                if (!candidates.includes(el)) {
                    candidates.push(el);
                }
            });
            
            return candidates;
        }
        
        /**
         * 공유 플랫폼 식별
         * @param {Array} elements - 공유 버튼 요소 배열
         * @return {Array} 식별된 플랫폼 배열
         */
        identifyPlatforms(elements) {
            const platforms = new Set();
            
            elements.forEach(el => {
                const href = el.getAttribute('href') || '';
                const classes = el.className.toLowerCase();
                const text = el.textContent.toLowerCase();
                const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                const title = el.getAttribute('title')?.toLowerCase() || '';
                
                // href URL 기반 플랫폼 식별
                for (const [platform, pattern] of Object.entries(this.platformUrls)) {
                    if (pattern.test(href)) {
                        platforms.add(platform);
                        break;
                    }
                }
                
                // 클래스, 텍스트, aria-label, title 기반 플랫폼 식별
                const allText = text + ' ' + classes + ' ' + ariaLabel + ' ' + title;
                
                if (allText.includes('facebook') || allText.includes('페이스북')) platforms.add('facebook');
                if (allText.includes('twitter') || allText.includes('트위터')) platforms.add('twitter');
                if (allText.includes('linkedin') || allText.includes('링크드인')) platforms.add('linkedin');
                if (allText.includes('pinterest') || allText.includes('핀터레스트')) platforms.add('pinterest');
                if (allText.includes('kakao') || allText.includes('카카오')) platforms.add('kakao');
                if (allText.includes('line') || allText.includes('라인')) platforms.add('line');
                if (allText.includes('band') || allText.includes('밴드')) platforms.add('band');
                if (allText.includes('whatsapp') || allText.includes('왓츠앱')) platforms.add('whatsapp');
                if (allText.includes('telegram') || allText.includes('텔레그램')) platforms.add('telegram');
                if (allText.includes('email') || allText.includes('mail') || allText.includes('이메일')) platforms.add('email');
            });
            
            return Array.from(platforms);
        }
        
        /**
         * 공유 버튼 접근성 확인
         * @param {Array} elements - 공유 버튼 요소 배열
         */
        checkShareButtonsAccessibility(elements) {
            const accessibilityIssues = [];
            
            elements.forEach(el => {
                // aria-label 또는 title 확인
                const hasAriaLabel = el.hasAttribute('aria-label');
                const hasTitle = el.hasAttribute('title');
                const hasText = el.textContent.trim().length > 0;
                
                if (!hasAriaLabel && !hasTitle && !hasText) {
                    accessibilityIssues.push('일부 공유 버튼에 접근성 텍스트가 없습니다.');
                }
                
                // 충분한 클릭 영역 확인 (최소 44x44px)
                const rect = el.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                    accessibilityIssues.push('일부 공유 버튼의 크기가 모바일 기기에서 사용하기에 너무 작습니다.');
                }
            });
            
            // 중복 제거
            const uniqueIssues = [...new Set(accessibilityIssues)];
            
            // 접근성 이슈 추가
            if (uniqueIssues.length > 0) {
                this.results.shareButtons.issues.push(...uniqueIssues);
                
                this.results.issues.push({
                    id: 'share_buttons_accessibility',
                    type: 'accessibility',
                    severity: 'minor',
                    description: '공유 버튼에 접근성 문제가 있습니다.',
                    solution: '모든 공유 버튼에 적절한 aria-label, title 또는 텍스트를 추가하고, 모바일에서 쉽게 탭할 수 있도록 충분한 크기를 제공하세요.'
                });
            }
        }
        
        /**
         * 공유 스크립트 감지
         */
        detectSharingScripts() {
            // 주요 공유 스크립트 라이브러리 확인
            const scripts = this.doc.querySelectorAll('script[src]');
            const scriptSources = Array.from(scripts).map(script => script.getAttribute('src') || '');
            
            const sharingLibraries = {
                'AddThis': /addthis\.com/i,
                'ShareThis': /sharethis\.com/i,
                'AddToAny': /addtoany\.com/i,
                'Kakao SDK': /kakao\.com\/sdk/i,
                'Facebook SDK': /connect\.facebook\.net/i,
                'Twitter SDK': /platform\.twitter\.com/i
            };
            
            const detectedLibraries = [];
            
            for (const [name, pattern] of Object.entries(sharingLibraries)) {
                if (scriptSources.some(src => pattern.test(src))) {
                    detectedLibraries.push(name);
                }
            }
            
            this.results.detectedSharingLibraries = detectedLibraries;
            
            // 공유 버튼은 있지만 라이브러리가 없는 경우 (단순 링크만 있을 수 있음)
            if (this.results.shareButtons.found && detectedLibraries.length === 0 && 
                this.results.shareButtons.platforms.length > 2) {
                this.results.issues.push({
                    id: 'no_sharing_libraries',
                    type: 'functionality',
                    severity: 'info',
                    description: '공유 버튼이 있지만 소셜 공유 라이브러리가 감지되지 않았습니다.',
                    solution: 'AddThis, ShareThis, AddToAny와 같은 공유 라이브러리를 사용하면 더 풍부한 공유 경험을 제공할 수 있습니다.'
                });
            }
        }
        
        /**
         * 분석 점수 계산
         */
        calculateScore() {
            let score = 100; // 기본 점수
            
            // 이슈 심각도별 감점
            const penalties = {
                'critical': 30,
                'major': 15,
                'minor': 5,
                'info': 0
            };
            
            // 이슈에 따른 감점
            this.results.issues.forEach(issue => {
                score -= penalties[issue.severity] || 0;
            });
            
            // 공유 버튼 보너스
            if (this.results.shareButtons.found) {
                // 3개 이상의 플랫폼이 있는 경우 보너스
                if (this.results.shareButtons.platforms.length >= 3) {
                    score += 10;
                }
                
                // 5개 이상의 플랫폼이 있는 경우 추가 보너스
                if (this.results.shareButtons.platforms.length >= 5) {
                    score += 5;
                }
                
                // 한국 플랫폼이 포함된 경우 보너스
                const hasKoreanPlatforms = this.results.shareButtons.platforms.some(p => ['kakao', 'line', 'band'].includes(p));
                if (hasKoreanPlatforms) {
                    score += 5;
                }
            }
            
            // 점수 범위 조정
            this.results.score = Math.max(0, Math.min(100, score));
        }
        
        /**
         * 권장사항 생성
         */
        generateRecommendations() {
            // 이슈 기반 권장사항 생성
            this.results.issues.forEach(issue => {
                if (issue.solution) {
                    this.results.recommendations.push({
                        id: issue.id + '_recommendation',
                        priority: this.getSeverityPriority(issue.severity),
                        description: issue.solution
                    });
                }
            });
            
            // 일반적인 권장사항 추가
            if (!this.results.shareButtons.found) {
                this.results.recommendations.push({
                    id: 'add_share_buttons',
                    priority: 'high',
                    description: '페이지에 소셜 미디어 공유 버튼을 추가하세요. 특히 Facebook, Twitter, 카카오톡과 같은 플랫폼을 고려하세요.'
                });
            } else {
                // 한국 플랫폼 포함 여부 확인
                const hasKoreanPlatforms = this.results.shareButtons.platforms.some(p => ['kakao', 'line', 'band'].includes(p));
                if (!hasKoreanPlatforms) {
                    this.results.recommendations.push({
                        id: 'add_korean_platforms',
                        priority: 'medium',
                        description: '한국 사용자를 위해 카카오톡, 라인, 밴드와 같은 한국 메신저 플랫폼에 대한 공유 버튼을 추가하세요.'
                    });
                }
            }
        }
        
        /**
         * 심각도에 따른 우선순위 반환
         * @param {string} severity - 이슈 심각도
         * @return {string} 우선순위
         */
        getSeverityPriority(severity) {
            switch (severity) {
                case 'critical':
                    return 'high';
                case 'major':
                    return 'high';
                case 'minor':
                    return 'medium';
                case 'info':
                    return 'low';
                default:
                    return 'medium';
            }
        }
        
        /**
         * 모의 분석용 메서드 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock() {
            // 모의 분석 결과 생성
            return {
                score: 70,
                url: {
                    valid: true,
                    value: 'https://example.com/article/sample-page',
                    issues: []
                },
                shareButtons: {
                    found: true,
                    count: 3,
                    platforms: ['facebook', 'twitter', 'email'],
                    issues: [
                        '한국에서 많이 사용되는 메신저 공유 옵션(카카오톡, 라인, 밴드 등)이 없습니다.'
                    ]
                },
                detectedSharingLibraries: ['AddThis'],
                issues: [
                    {
                        id: 'no_korean_platforms',
                        type: 'functionality',
                        severity: 'minor',
                        description: '한국에서 많이 사용되는 메신저 공유 옵션이 없습니다.',
                        solution: '카카오톡, 라인, 밴드와 같은 한국 메신저 플랫폼에 대한 공유 옵션을 추가하세요.'
                    },
                    {
                        id: 'share_buttons_accessibility',
                        type: 'accessibility',
                        severity: 'minor',
                        description: '공유 버튼에 접근성 문제가 있습니다.',
                        solution: '모든 공유 버튼에 적절한 aria-label, title 또는 텍스트를 추가하고, 모바일에서 쉽게 탭할 수 있도록 충분한 크기를 제공하세요.'
                    }
                ],
                recommendations: [
                    {
                        id: 'no_korean_platforms_recommendation',
                        priority: 'medium',
                        description: '카카오톡, 라인, 밴드와 같은 한국 메신저 플랫폼에 대한 공유 옵션을 추가하세요.'
                    },
                    {
                        id: 'share_buttons_accessibility_recommendation',
                        priority: 'medium',
                        description: '모든 공유 버튼에 적절한 aria-label, title 또는 텍스트를 추가하고, 모바일에서 쉽게 탭할 수 있도록 충분한 크기를 제공하세요.'
                    },
                    {
                        id: 'add_korean_platforms',
                        priority: 'medium',
                        description: '한국 사용자를 위해 카카오톡, 라인, 밴드와 같은 한국 메신저 플랫폼에 대한 공유 버튼을 추가하세요.'
                    }
                ]
            };
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.social.sharingFunctionality = {
        /**
         * 공유 기능 분석 실행
         * @param {Document} [doc] - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new SharingFunctionalityAnalyzer(doc);
            return analyzer.analyze();
        },
        
        /**
         * 모의 분석 실행 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock: function() {
            const analyzer = new SharingFunctionalityAnalyzer(document);
            return analyzer.analyzeMock();
        }
    };
    
    logger.debug('공유 기능 분석 모듈 초기화 완료');
})();