/**
 * 보안 분석 모듈
 * 
 * 웹페이지의 보안 설정 및 취약점을 종합적으로 분석합니다.
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
     * 보안 분석기 클래스
     */
    class SecurityAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                https: { score: 0, issues: [] },
                contentSecurity: { score: 0, issues: [] },
                forms: { score: 0, issues: [] },
                externalLinks: { score: 0, issues: [] },
                // 새로 추가된 보안 분석 모듈
                csp: { score: 0, issues: [], recommendations: [] },
                injection: { score: 0, issues: [], recommendations: [] },
                authSession: { score: 0, issues: [], recommendations: [] },
                sensitiveData: { score: 0, issues: [], recommendations: [] },
                thirdpartyScripts: { score: 0, issues: [], recommendations: [] }
            };
            this.analyzer = window.KoreanWebAnalyzer.utils.analyzer;
        }
        
        /**
         * 보안 분석 수행
         * @return {Object} 보안 분석 결과
         */
        analyze() {
            logger.debug('보안 분석 시작');
            
            // 기본 보안 분석 수행
            this.checkHTTPS();
            this.checkContentSecurity();
            this.checkForms();
            this.checkExternalLinks();
            
            // 향상된 보안 분석 수행 (새로 구현된 모듈)
            this.analyzeCSP();
            this.detectInjectionVulnerabilities();
            this.validateAuthSessionSecurity();
            this.scanSensitiveData();
            this.analyzeThirdpartyScripts();
            
            // 최종 점수 계산
            const score = this.calculateScore();
            
            logger.debug('보안 분석 완료', { score });
            
            return {
                score: score,
                details: this.results
            };
        }
        
        /**
         * HTTPS 사용 여부 확인
         */
        checkHTTPS() {
            logger.debug('HTTPS 사용 여부 확인 중');
            
            let score = 100;
            
            // HTTPS 확인
            const isHTTPS = window.location.protocol === 'https:';
            
            if (!isHTTPS) {
                score = 0;
                this.results.https.issues.push(
                    this.analyzer.createIssue(
                        'not-using-https',
                        'critical',
                        'HTTPS가 사용되지 않고 있습니다.',
                        '안전한 데이터 전송을 위해 HTTPS 프로토콜을 사용해야 합니다.',
                        null,
                        'SSL/TLS 인증서를 설치하고 모든 HTTP 트래픽을 HTTPS로 리다이렉트하세요.'
                    )
                );
            }
            
            // HSTS 헤더 확인 (클라이언트 측에서 제한적으로만 확인 가능)
            if (isHTTPS) {
                // 참고: 클라이언트 측에서는 HSTS 헤더를 직접 확인할 수 없음
                // 이는 브라우저가 프론트엔드 JavaScript에 헤더 접근을 허용하지 않기 때문
                // 여기서는 HTTPS 사용 중일 때 HSTS에 대한 정보성 메시지만 제공
                
                this.results.https.issues.push(
                    this.analyzer.createIssue(
                        'hsts-check-limited',
                        'info',
                        'HSTS 헤더 확인이 제한됩니다.',
                        '클라이언트 측 JavaScript에서는 HSTS 헤더를 직접 확인할 수 없습니다.',
                        null,
                        '서버 측에서 Strict-Transport-Security 헤더가 설정되어 있는지 확인하세요.'
                    )
                );
            }
            
            // 혼합 콘텐츠(Mixed Content) 확인
            if (isHTTPS) {
                const hasMixedContent = this.checkMixedContent();
                
                if (hasMixedContent.found) {
                    score -= 40;
                    this.results.https.issues.push(
                        this.analyzer.createIssue(
                            'mixed-content',
                            'major',
                            '혼합 콘텐츠가 발견되었습니다.',
                            `HTTPS 페이지에서 HTTP 리소스 ${hasMixedContent.count}개가 로드되고 있습니다.`,
                            null,
                            '모든 리소스가 HTTPS를 통해 로드되도록 수정하세요. 특히 이미지, 스크립트, 스타일시트 등의 리소스 URL을 확인하세요.'
                        )
                    );
                }
            }
            
            // 결과 설정
            this.results.https.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.https.stats = {
                isHTTPS: isHTTPS,
                protocol: window.location.protocol,
                mixedContent: isHTTPS ? this.checkMixedContent() : { found: false, count: 0 }
            };
        }
        
        /**
         * 혼합 콘텐츠(Mixed Content) 확인
         * @return {Object} 혼합 콘텐츠 정보
         */
        checkMixedContent() {
            const result = { found: false, count: 0, urls: [] };
            
            // 이미지, 스크립트, 스타일시트, iframe의 HTTP URL 확인
            const images = Array.from(this.doc.querySelectorAll('img[src^="http:"]'));
            const scripts = Array.from(this.doc.querySelectorAll('script[src^="http:"]'));
            const stylesheets = Array.from(this.doc.querySelectorAll('link[rel="stylesheet"][href^="http:"]'));
            const iframes = Array.from(this.doc.querySelectorAll('iframe[src^="http:"]'));
            const media = Array.from(this.doc.querySelectorAll('video[src^="http:"], audio[src^="http:"]'));
            
            result.count = images.length + scripts.length + stylesheets.length + iframes.length + media.length;
            
            if (result.count > 0) {
                result.found = true;
                
                // 샘플 URL 수집 (최대 10개)
                const collectUrls = (elements, attrName) => {
                    return elements.slice(0, 10).map(el => el.getAttribute(attrName));
                };
                
                result.urls = [
                    ...collectUrls(images, 'src'),
                    ...collectUrls(scripts, 'src'),
                    ...collectUrls(stylesheets, 'href'),
                    ...collectUrls(iframes, 'src'),
                    ...collectUrls(media, 'src')
                ].slice(0, 10);
            }
            
            return result;
        }
        
        /**
         * Content Security Policy 확인
         */
        checkContentSecurity() {
            logger.debug('Content Security Policy 확인 중');
            
            let score = 70; // 기본 점수
            
            // CSP 헤더는 직접 확인할 수 없으므로, 메타 태그로 설정된 CSP만 확인
            const cspMetaTag = this.doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
            
            if (!cspMetaTag) {
                score -= 40;
                this.results.contentSecurity.issues.push(
                    this.analyzer.createIssue(
                        'no-csp',
                        'major',
                        'Content Security Policy가 설정되지 않았습니다.',
                        'CSP는 XSS 및 데이터 인젝션 공격을 방지하는 데 도움이 됩니다.',
                        null,
                        'HTTP 헤더 또는 메타 태그를 통해 Content-Security-Policy를 설정하세요.'
                    )
                );
            } else {
                const cspContent = cspMetaTag.getAttribute('content') || '';
                
                // CSP 내용 분석
                if (cspContent.includes("default-src 'none'") || cspContent.includes("default-src 'self'")) {
                    // 엄격한 CSP 정책 (좋음)
                    score += 20;
                }
                
                if (cspContent.includes("'unsafe-inline'") || cspContent.includes("'unsafe-eval'")) {
                    // 안전하지 않은 CSP 지시문 (나쁨)
                    score -= 30;
                    this.results.contentSecurity.issues.push(
                        this.analyzer.createIssue(
                            'unsafe-csp-directives',
                            'major',
                            'CSP에 안전하지 않은 지시문이 포함되어 있습니다.',
                            "CSP에 'unsafe-inline' 또는 'unsafe-eval' 지시문이 포함되어 있습니다.",
                            cspMetaTag,
                            "가능한 'unsafe-inline'과 'unsafe-eval' 지시문을 제거하고 nonce나 hash 기반 접근 방식을 사용하세요."
                        )
                    );
                }
                
                if (cspContent.includes('*')) {
                    // 와일드카드 도메인 (주의)
                    score -= 20;
                    this.results.contentSecurity.issues.push(
                        this.analyzer.createIssue(
                            'wildcard-csp',
                            'minor',
                            'CSP에 와일드카드 도메인이 포함되어 있습니다.',
                            "CSP 지시문에 '*' 와일드카드가 포함되어 있어 특정 리소스 유형에 대해 모든 도메인을 허용합니다.",
                            cspMetaTag,
                            "와일드카드 대신 필요한 특정 도메인만 명시적으로 허용하세요."
                        )
                    );
                }
            }
            
            // 인라인 스크립트 확인
            const inlineScripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            if (inlineScripts.length > 0) {
                score -= 20;
                this.results.contentSecurity.issues.push(
                    this.analyzer.createIssue(
                        'inline-scripts',
                        'major',
                        '인라인 스크립트가 사용되고 있습니다.',
                        `페이지에 ${inlineScripts.length}개의 인라인 스크립트가 있습니다.`,
                        null,
                        'XSS 취약점을 줄이기 위해 인라인 스크립트를 외부 파일로 이동하고 nonce 또는 hash 기반 CSP를 사용하세요.'
                    )
                );
            }
            
            // 인라인 이벤트 핸들러 확인
            const elementsWithInlineHandlers = Array.from(this.doc.querySelectorAll('[onclick], [onload], [onmouseover], [onmouseout], [onchange], [onsubmit]'));
            
            if (elementsWithInlineHandlers.length > 0) {
                score -= 20;
                this.results.contentSecurity.issues.push(
                    this.analyzer.createIssue(
                        'inline-event-handlers',
                        'major',
                        '인라인 이벤트 핸들러가 사용되고 있습니다.',
                        `페이지에 ${elementsWithInlineHandlers.length}개의 인라인 이벤트 핸들러가 있습니다.`,
                        null,
                        '인라인 이벤트 핸들러(onclick 등)를 제거하고 JavaScript로 addEventListener를 사용하세요.'
                    )
                );
            }
            
            // 결과 설정
            this.results.contentSecurity.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.contentSecurity.stats = {
                hasCSP: !!cspMetaTag,
                cspContent: cspMetaTag ? cspMetaTag.getAttribute('content') : null,
                inlineScriptsCount: inlineScripts.length,
                inlineHandlersCount: elementsWithInlineHandlers.length
            };
        }
        
        /**
         * 폼 보안 확인
         */
        checkForms() {
            logger.debug('폼 보안 확인 중');
            
            const forms = Array.from(this.doc.querySelectorAll('form'));
            
            // 폼이 없는 경우 100점 부여
            if (forms.length === 0) {
                this.results.forms.score = 100;
                return;
            }
            
            let score = 100;
            let insecureFormCount = 0;
            
            forms.forEach((form, index) => {
                const formIssues = [];
                
                // 1. GET 메서드로 민감한 데이터 전송 확인
                const method = (form.getAttribute('method') || 'GET').toUpperCase();
                const hasSensitiveFields = this.checkFormForSensitiveFields(form);
                
                if (method === 'GET' && hasSensitiveFields) {
                    formIssues.push(
                        this.analyzer.createIssue(
                            'sensitive-data-in-get',
                            'critical',
                            `폼 #${index + 1}이 GET 메서드로 민감한 정보를 전송합니다.`,
                            'GET 메서드는 폼 데이터를 URL에 노출시켜 민감한 정보가 유출될 수 있습니다.',
                            form,
                            'method="POST"를 사용하고 가능하면 HTTPS를 통해 전송하세요.'
                        )
                    );
                    insecureFormCount++;
                }
                
                // 2. 자동 완성 확인
                const hasPasswordField = form.querySelector('input[type="password"]') !== null;
                
                if (hasPasswordField) {
                    const autocomplete = form.getAttribute('autocomplete');
                    
                    // 비밀번호 필드가 있지만 autocomplete="off"가 없는 경우
                    if (autocomplete !== 'off') {
                        formIssues.push(
                            this.analyzer.createIssue(
                                'password-autocomplete',
                                'minor',
                                `폼 #${index + 1}에 비밀번호 자동완성이 비활성화되지 않았습니다.`,
                                '브라우저가 민감한 자격 증명을 저장할 수 있으므로 보안 위험이 될 수 있습니다.',
                                form,
                                'autocomplete="off" 속성을 폼이나 비밀번호 필드에 추가하세요.'
                            )
                        );
                        insecureFormCount++;
                    }
                }
                
                // 3. CSRF 보호 확인
                const hasCsrfToken = this.checkFormForCsrfToken(form);
                
                if (!hasCsrfToken && method === 'POST') {
                    formIssues.push(
                        this.analyzer.createIssue(
                            'missing-csrf-token',
                            'major',
                            `폼 #${index + 1}에 CSRF 토큰이 없습니다.`,
                            'POST 폼은 CSRF(Cross-Site Request Forgery) 공격을 방지하기 위해 토큰이 필요합니다.',
                            form,
                            '숨겨진 입력 필드로 CSRF 토큰을 포함하거나 Double Submit Cookie 패턴을 사용하세요.'
                        )
                    );
                    insecureFormCount++;
                }
                
                // 4. 보안 속성(novalidate) 확인
                if (form.hasAttribute('novalidate')) {
                    formIssues.push(
                        this.analyzer.createIssue(
                            'form-novalidate',
                            'minor',
                            `폼 #${index + 1}에 novalidate 속성이 있습니다.`,
                            'novalidate 속성은 브라우저의 기본 폼 유효성 검사를 비활성화합니다.',
                            form,
                            'novalidate 속성을 제거하고 브라우저의 기본 유효성 검사와 함께 JavaScript 유효성 검사를 구현하세요.'
                        )
                    );
                }
                
                // 이슈가 있는 경우 추가
                if (formIssues.length > 0) {
                    this.results.forms.issues.push(...formIssues);
                }
            });
            
            // 점수 계산
            if (insecureFormCount > 0) {
                // 문제가 있는 폼의 비율에 따라 점수 감소
                const ratio = insecureFormCount / forms.length;
                
                if (ratio > 0.7) score -= 70;
                else if (ratio > 0.5) score -= 50;
                else if (ratio > 0.3) score -= 30;
                else if (ratio > 0) score -= 20;
            }
            
            // 최종 한계 점수 설정
            this.results.forms.score = Math.max(0, Math.min(100, score));
            
            // 한계 정보 메시지
            this.results.forms.issues.push(
                this.analyzer.createIssue(
                    'form-security-limited',
                    'info',
                    '폼 보안 분석은 제한적입니다.',
                    '클라이언트 측에서는 서버측 유효성 검사, CSRF 보호, XSS 방어를 완전히 확인할 수 없습니다.',
                    null,
                    '서버 측 폼 처리 로직을 수동으로 검토하여 보안 유효성 검사와 CSRF 보호가 구현되어 있는지 확인하세요.'
                )
            );
            
            // 통계 정보 추가
            this.results.forms.stats = {
                formsCount: forms.length,
                insecureFormsCount: insecureFormCount,
                getMethodCount: forms.filter(form => (form.getAttribute('method') || 'GET').toUpperCase() === 'GET').length,
                postMethodCount: forms.filter(form => (form.getAttribute('method') || 'GET').toUpperCase() === 'POST').length,
                formsWithPasswordCount: forms.filter(form => form.querySelector('input[type="password"]') !== null).length,
                formsWithAutocompleteOffCount: forms.filter(form => form.getAttribute('autocomplete') === 'off').length
            };
        }
        
        /**
         * 폼에 민감한 필드가 있는지 확인
         * @param {Element} form - 폼 요소
         * @return {boolean} 민감한 필드 존재 여부
         */
        checkFormForSensitiveFields(form) {
            const sensitiveInputTypes = ['password', 'hidden'];
            const sensitiveFieldNames = [
                'password', 'pass', 'pwd', 'passwd', 
                'token', 'api', 'key', 'secret', 
                'credential', 'credit', 'card', 'cvv', 'ccv',
                'social', 'ssn', 'sin', 'tax', 'fiscal'
            ];
            
            // 민감한 input 타입 확인
            const hasSensitiveType = form.querySelector(sensitiveInputTypes.map(type => `input[type="${type}"]`).join(',')) !== null;
            
            // 민감한 필드명 확인
            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
            const hasSensitiveName = inputs.some(input => {
                const name = input.getAttribute('name') || '';
                const id = input.getAttribute('id') || '';
                return sensitiveFieldNames.some(sensitiveName => 
                    name.toLowerCase().includes(sensitiveName) || 
                    id.toLowerCase().includes(sensitiveName)
                );
            });
            
            return hasSensitiveType || hasSensitiveName;
        }
        
        /**
         * 폼에 CSRF 토큰이 있는지 확인 (휴리스틱 방법)
         * @param {Element} form - 폼 요소
         * @return {boolean} CSRF 토큰 존재 추정 여부
         */
        checkFormForCsrfToken(form) {
            // CSRF 토큰으로 추정되는 입력 필드 확인 (휴리스틱)
            const csrfPattern = /csrf|xsrf|token|_token|authenticity/i;
            
            // hidden 필드 확인
            const hiddenInputs = Array.from(form.querySelectorAll('input[type="hidden"]'));
            
            return hiddenInputs.some(input => {
                const name = input.getAttribute('name') || '';
                const id = input.getAttribute('id') || '';
                return csrfPattern.test(name) || csrfPattern.test(id);
            });
        }
        
        /**
         * 외부 링크 보안 확인
         */
        checkExternalLinks() {
            logger.debug('외부 링크 보안 확인 중');
            
            const links = Array.from(this.doc.querySelectorAll('a[href]'));
            const currentHostname = window.location.hostname;
            
            // 링크가 없는 경우 100점 부여
            if (links.length === 0) {
                this.results.externalLinks.score = 100;
                return;
            }
            
            let score = 100;
            const externalLinks = [];
            let unsafeExternalLinksCount = 0;
            
            // 외부 링크 수집 및 보안 확인
            links.forEach(link => {
                const href = link.getAttribute('href');
                
                // 새 창으로 열리는 링크만 확인 (보안 이슈가 관련된 것)
                if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                    return;
                }
                
                try {
                    // 절대 URL 구성
                    const url = new URL(href, window.location.href);
                    
                    // 같은 도메인인지 확인
                    if (url.hostname !== currentHostname) {
                        // 외부 링크에 대한 정보 저장
                        const linkInfo = {
                            element: link,
                            href: href,
                            hostname: url.hostname,
                            protocol: url.protocol,
                            hasNoopener: link.getAttribute('rel')?.includes('noopener'),
                            hasNoreferrer: link.getAttribute('rel')?.includes('noreferrer'),
                            target: link.getAttribute('target')
                        };
                        
                        externalLinks.push(linkInfo);
                        
                        // 새 창으로 열리는 링크에 noopener/noreferrer가 없는 경우
                        if (linkInfo.target === '_blank' && !(linkInfo.hasNoopener && linkInfo.hasNoreferrer)) {
                            unsafeExternalLinksCount++;
                            
                            this.results.externalLinks.issues.push(
                                this.analyzer.createIssue(
                                    'missing-noopener-noreferrer',
                                    'major',
                                    `외부 링크에 rel="noopener noreferrer" 속성이 없습니다.`,
                                    `새 창으로 열리는 링크: ${href}`,
                                    link,
                                    '새 창으로 열리는 모든 외부 링크에 rel="noopener noreferrer" 속성을 추가하여 tabnabbing 공격을 방지하세요.'
                                )
                            );
                        }
                        
                        // HTTP 링크 확인
                        if (linkInfo.protocol === 'http:') {
                            this.results.externalLinks.issues.push(
                                this.analyzer.createIssue(
                                    'http-external-link',
                                    'minor',
                                    `외부 링크가 안전하지 않은 HTTP 프로토콜을 사용합니다.`,
                                    `안전하지 않은 링크: ${href}`,
                                    link,
                                    '가능한 경우 모든 외부 링크를 HTTPS로 업데이트하세요.'
                                )
                            );
                        }
                    }
                } catch (e) {
                    // URL 파싱 오류 무시
                }
            });
            
            // 점수 계산
            if (externalLinks.length > 0) {
                const unsafeRatio = unsafeExternalLinksCount / externalLinks.length;
                
                if (unsafeRatio > 0.7) score -= 50;
                else if (unsafeRatio > 0.4) score -= 30;
                else if (unsafeRatio > 0.1) score -= 15;
            }
            
            // iframe 보안 확인
            const iframes = Array.from(this.doc.querySelectorAll('iframe'));
            let unsafeIframesCount = 0;
            
            iframes.forEach(iframe => {
                // sandbox 속성 확인
                if (!iframe.hasAttribute('sandbox')) {
                    unsafeIframesCount++;
                    
                    this.results.externalLinks.issues.push(
                        this.analyzer.createIssue(
                            'iframe-missing-sandbox',
                            'major',
                            'iframe에 sandbox 속성이 없습니다.',
                            'sandbox 속성이 없는 iframe은 보안 위험이 될 수 있습니다.',
                            iframe,
                            '필요한 기능만 허용하는 sandbox 속성을 iframe에 추가하세요.'
                        )
                    );
                }
                
                // HTTP iframe 확인
                const src = iframe.getAttribute('src');
                if (src && src.startsWith('http:')) {
                    this.results.externalLinks.issues.push(
                        this.analyzer.createIssue(
                            'http-iframe',
                            'major',
                            'iframe이 안전하지 않은 HTTP 프로토콜을 사용합니다.',
                            `안전하지 않은 iframe 소스: ${src}`,
                            iframe,
                            '모든 iframe 소스를 HTTPS로 업데이트하세요.'
                        )
                    );
                }
            });
            
            // iframe 점수 조정
            if (iframes.length > 0) {
                const unsafeIframeRatio = unsafeIframesCount / iframes.length;
                
                if (unsafeIframeRatio > 0.5) score -= 30;
                else if (unsafeIframeRatio > 0) score -= 15;
            }
            
            // 최종 점수 설정
            this.results.externalLinks.score = Math.max(0, Math.min(100, score));
            
            // 통계 정보 추가
            this.results.externalLinks.stats = {
                totalLinks: links.length,
                externalLinksCount: externalLinks.length,
                unsafeExternalLinksCount: unsafeExternalLinksCount,
                iframesCount: iframes.length,
                unsafeIframesCount: unsafeIframesCount
            };
        }
        
        /**
         * Content Security Policy 심층 분석
         * CSP-Analyzer 모듈을 사용하여 페이지의 CSP를 분석합니다.
         */
        analyzeCSP() {
            logger.debug('Content Security Policy 심층 분석 수행');
            
            try {
                if (window.KoreanWebAnalyzer.analyzer.security.CSPAnalyzer) {
                    const cspResults = window.KoreanWebAnalyzer.analyzer.security.CSPAnalyzer.analyze(this.doc);
                    this.results.csp = cspResults;
                }
            } catch (e) {
                logger.error('CSP 분석 중 오류 발생', e);
                this.results.csp = { 
                    score: 0, 
                    issues: [
                        this.analyzer.createIssue(
                            'csp-analyzer-error',
                            'info',
                            'CSP 분석기 오류',
                            'CSP 분석 모듈을 실행하는 중 오류가 발생했습니다.',
                            null,
                            'CSP 분석 모듈이 올바르게 로드되었는지 확인하세요.'
                        )
                    ],
                    recommendations: []
                };
            }
        }
        
        /**
         * 인젝션 취약점 감지
         * InjectionDetector 모듈을 사용하여 XSS, CSRF, SQL 인젝션 패턴을 감지합니다.
         */
        detectInjectionVulnerabilities() {
            logger.debug('인젝션 취약점 감지');
            
            try {
                if (window.KoreanWebAnalyzer.analyzer.security.InjectionDetector) {
                    const injectionResults = window.KoreanWebAnalyzer.analyzer.security.InjectionDetector.analyze(this.doc);
                    this.results.injection = injectionResults;
                }
            } catch (e) {
                logger.error('인젝션 취약점 감지 중 오류 발생', e);
                this.results.injection = { 
                    score: 0, 
                    issues: [
                        this.analyzer.createIssue(
                            'injection-detector-error',
                            'info',
                            '인젝션 분석기 오류',
                            '인젝션 취약점 분석 모듈을 실행하는 중 오류가 발생했습니다.',
                            null,
                            '인젝션 분석 모듈이 올바르게 로드되었는지 확인하세요.'
                        )
                    ],
                    recommendations: []
                };
            }
        }
        
        /**
         * 인증 및 세션 보안 검증
         * AuthSessionValidator 모듈을 사용하여 인증 및 세션 보안을 검증합니다.
         */
        validateAuthSessionSecurity() {
            logger.debug('인증 및 세션 보안 검증');
            
            try {
                if (window.KoreanWebAnalyzer.analyzer.security.AuthSessionValidator) {
                    const authResults = window.KoreanWebAnalyzer.analyzer.security.AuthSessionValidator.analyze(this.doc);
                    this.results.authSession = authResults;
                }
            } catch (e) {
                logger.error('인증 및 세션 보안 검증 중 오류 발생', e);
                this.results.authSession = { 
                    score: 0, 
                    issues: [
                        this.analyzer.createIssue(
                            'auth-validator-error',
                            'info',
                            '인증 및 세션 분석기 오류',
                            '인증 및 세션 보안 분석 모듈을 실행하는 중 오류가 발생했습니다.',
                            null,
                            '인증 및 세션 분석 모듈이 올바르게 로드되었는지 확인하세요.'
                        )
                    ],
                    recommendations: []
                };
            }
        }
        
        /**
         * 민감한 정보 스캔
         * SensitiveDataScanner 모듈을 사용하여 페이지의 민감한 정보를 스캔합니다.
         */
        scanSensitiveData() {
            logger.debug('민감한 정보 스캔');
            
            try {
                if (window.KoreanWebAnalyzer.analyzer.security.SensitiveDataScanner) {
                    const scanResults = window.KoreanWebAnalyzer.analyzer.security.SensitiveDataScanner.analyze(this.doc);
                    this.results.sensitiveData = scanResults;
                }
            } catch (e) {
                logger.error('민감한 정보 스캔 중 오류 발생', e);
                this.results.sensitiveData = { 
                    score: 0, 
                    issues: [
                        this.analyzer.createIssue(
                            'sensitive-scanner-error',
                            'info',
                            '민감한 정보 스캐너 오류',
                            '민감한 정보 스캔 모듈을 실행하는 중 오류가 발생했습니다.',
                            null,
                            '민감한 정보 스캔 모듈이 올바르게 로드되었는지 확인하세요.'
                        )
                    ],
                    recommendations: []
                };
            }
        }
        
        /**
         * 서드파티 스크립트 보안 분석
         * ThirdpartyScriptAnalyzer 모듈을 사용하여 서드파티 스크립트의 보안을 분석합니다.
         */
        analyzeThirdpartyScripts() {
            logger.debug('서드파티 스크립트 보안 분석');
            
            try {
                if (window.KoreanWebAnalyzer.analyzer.security.ThirdpartyScriptAnalyzer) {
                    const scriptResults = window.KoreanWebAnalyzer.analyzer.security.ThirdpartyScriptAnalyzer.analyze(this.doc);
                    this.results.thirdpartyScripts = scriptResults;
                }
            } catch (e) {
                logger.error('서드파티 스크립트 분석 중 오류 발생', e);
                this.results.thirdpartyScripts = { 
                    score: 0, 
                    issues: [
                        this.analyzer.createIssue(
                            'thirdparty-analyzer-error',
                            'info',
                            '서드파티 스크립트 분석기 오류',
                            '서드파티 스크립트 분석 모듈을 실행하는 중 오류가 발생했습니다.',
                            null,
                            '서드파티 스크립트 분석 모듈이 올바르게 로드되었는지 확인하세요.'
                        )
                    ],
                    recommendations: []
                };
            }
        }
        
        /**
         * 최종 점수 계산
         * @return {number} 0-100 사이의 종합 점수
         */
        calculateScore() {
            // 기본 보안 분석 가중치
            const baseWeights = {
                https: 0.15,
                contentSecurity: 0.10,
                forms: 0.10,
                externalLinks: 0.05
            };
            
            // 향상된 보안 분석 가중치
            const enhancedWeights = {
                csp: 0.15,
                injection: 0.15,
                authSession: 0.10,
                sensitiveData: 0.10,
                thirdpartyScripts: 0.10
            };
            
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 기본 가중치 적용하여 점수 계산
            for (const [key, weight] of Object.entries(baseWeights)) {
                if (typeof this.results[key].score === 'number') {
                    weightedScore += this.results[key].score * weight;
                    totalWeight += weight;
                }
            }
            
            // 향상된 가중치 적용하여 점수 계산
            for (const [key, weight] of Object.entries(enhancedWeights)) {
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
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.security = {
        /**
         * 보안 분석 수행
         * @param {Document} [doc] - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new SecurityAnalyzer(doc);
            return analyzer.analyze();
        }
    };
    
    logger.debug('보안 분석 모듈 초기화 완료');
})();