/**
 * 인젝션 취약점 감지 모듈
 * XSS, SQL 인젝션, CSRF 취약점을 감지합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.security');

KoreanWebAnalyzer.analyzer.security.InjectionDetector = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('InjectionDetector');
    
    /**
     * 인젝션 감지기 클래스
     */
    class InjectionDetector {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.analyzer = KoreanWebAnalyzer.utils.analyzer;
            
            // 분석 결과 객체
            this.results = {
                score: 0,
                issues: [],
                recommendations: [],
                stats: {
                    xssVulnerabilities: 0,
                    csrfVulnerabilities: 0,
                    sqlInjectionVulnerabilities: 0,
                    unsafePatterns: 0,
                    riskyElements: {
                        innerHTML: 0,
                        documentWrite: 0,
                        evalLike: 0,
                        eventHandlers: 0,
                        unvalidatedUrls: 0
                    }
                }
            };
            
            // XSS 취약 함수 및 속성 패턴
            this.xssRiskyPatterns = [
                { pattern: /\.innerHTML\s*=/, type: 'innerHTML', severity: 'major' },
                { pattern: /\.outerHTML\s*=/, type: 'innerHTML', severity: 'major' },
                { pattern: /document\.write/i, type: 'documentWrite', severity: 'major' },
                { pattern: /eval\s*\(/, type: 'evalLike', severity: 'critical' },
                { pattern: /new\s+Function\s*\(/i, type: 'evalLike', severity: 'critical' },
                { pattern: /setTimeout\s*\(\s*['"]/, type: 'evalLike', severity: 'major' },
                { pattern: /setInterval\s*\(\s*['"]/, type: 'evalLike', severity: 'major' },
                { pattern: /location\s*=|location\.href\s*=|location\.replace/, type: 'unvalidatedUrls', severity: 'major' }
            ];
            
            // SQL 인젝션 위험 패턴
            this.sqlInjectionPatterns = [
                { pattern: /SQL|[Qq]uery|[Dd]atabase/, type: 'sqlReference', severity: 'info' },
                { pattern: /SELECT|INSERT|UPDATE|DELETE|UNION|JOIN|WHERE|FROM/i, type: 'sqlSyntax', severity: 'minor' },
                { pattern: /\+\s*['"]|['"].*?['"].*?\+/i, type: 'stringConcatenation', severity: 'major' }
            ];
            
            // XSS 취약 속성 (자동 실행되는 이벤트 핸들러)
            this.xssRiskyAttributes = [
                'onload', 'onerror', 'onunload', 'onbeforeunload', 'onblur', 'onchange',
                'onclick', 'ondblclick', 'onfocus', 'onkeydown', 'onkeypress', 'onkeyup',
                'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup',
                'onreset', 'onselect', 'onsubmit'
            ];
            
            // 민감한 입력 필드 (개인 정보, 인증 등)
            this.sensitiveInputTypes = ['password', 'email', 'tel', 'number', 'search'];
            this.sensitiveInputPatterns = [
                'password', 'user', 'username', 'login', 'email', 'account', 'acct',
                'ssn', 'social', 'card', 'credit', 'debit', 'cvv', 'pin', 'code',
                'secure', 'token', 'key', 'secret', 'session', 'auth', 'admin'
            ];
        }
        
        /**
         * 인젝션 취약점 분석 수행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('인젝션 취약점 분석 시작');
            
            // 각 취약점 유형 검사
            this.detectXssVulnerabilities();
            this.detectCsrfVulnerabilities();
            this.detectSqlInjectionVulnerabilities();
            
            // 클라이언트 측 분석 한계 메시지 추가
            this.addClientSideLimitationsMessage();
            
            // 권장 사항 생성
            this.generateRecommendations();
            
            // 최종 점수 계산
            this.calculateScore();
            
            logger.debug('인젝션 취약점 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * XSS 취약점 감지
         */
        detectXssVulnerabilities() {
            logger.debug('XSS 취약점 감지');
            
            let xssIssuesCount = 0;
            
            // 1. 스크립트 내 취약한 패턴 검사
            this.detectXssPatterns();
            
            // 2. DOM 기반 XSS 취약점 검사
            this.detectDomBasedXss();
            
            // 3. 출력 위치에서 이스케이프 처리 검사
            this.detectUnescapedOutput();
            
            // 4. URL 파라미터 반영 검사
            this.detectUrlParameterReflection();
            
            // 최종 XSS 취약점 수 업데이트
            this.results.stats.xssVulnerabilities = this.results.issues.filter(
                issue => issue.code && issue.code.includes('xss')
            ).length;
        }
        
        /**
         * 스크립트에서 XSS 취약 패턴 감지
         */
        detectXssPatterns() {
            // 모든 인라인 스크립트 가져오기
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 각 위험 패턴 검사
                this.xssRiskyPatterns.forEach(pattern => {
                    if (pattern.pattern.test(scriptContent)) {
                        this.results.stats.riskyElements[pattern.type]++;
                        this.results.stats.unsafePatterns++;
                        
                        // 코드 조각 추출 (패턴 주변 문맥)
                        const match = pattern.pattern.exec(scriptContent);
                        const startPos = Math.max(0, match.index - 40);
                        const endPos = Math.min(scriptContent.length, match.index + match[0].length + 40);
                        const snippet = scriptContent.substring(startPos, endPos);
                        
                        // 이슈 추가
                        this.results.issues.push(this.analyzer.createIssue(
                            `xss-risky-pattern-${pattern.type}`,
                            pattern.severity,
                            `스크립트에서 XSS에 취약한 패턴이 발견되었습니다: ${match[0]}`,
                            `스크립트 #${index + 1}에서 발견된 위험 패턴이 적절히 검증되지 않은 입력과 함께 사용되면 XSS 취약점이 될 수 있습니다.`,
                            script,
                            `동적 콘텐츠를 생성할 때는 항상 사용자 입력을 검증하고 적절히 이스케이프 처리하세요. 안전한 DOM API를 사용하고 innerHTML 대신 textContent를 사용하세요.`,
                            { codeSnippet: snippet }
                        ));
                    }
                });
            });
        }
        
        /**
         * DOM 기반 XSS 취약점 감지
         */
        detectDomBasedXss() {
            // 1. 이벤트 핸들러 속성 검사
            const elementsWithEventHandlers = this.findElementsWithEventHandlers();
            
            elementsWithEventHandlers.forEach(element => {
                this.results.stats.riskyElements.eventHandlers++;
                
                // 이벤트 핸들러 속성 이름과 값 추출
                const eventAttributes = this.xssRiskyAttributes.filter(
                    attr => element.hasAttribute(attr)
                );
                
                if (eventAttributes.length > 0) {
                    const attribute = eventAttributes[0];
                    const attrValue = element.getAttribute(attribute);
                    
                    // 위험한 패턴이 있는지 확인
                    const hasRiskyPattern = this.xssRiskyPatterns.some(
                        pattern => pattern.pattern.test(attrValue)
                    );
                    
                    if (hasRiskyPattern) {
                        this.results.stats.unsafePatterns++;
                        this.results.issues.push(this.analyzer.createIssue(
                            'xss-risky-event-handler',
                            'major',
                            `위험한 패턴이 포함된 이벤트 핸들러가 발견되었습니다: ${attribute}="${attrValue}"`,
                            `인라인 이벤트 핸들러에서 잠재적으로 위험한 함수를 사용하면 XSS 취약점이 발생할 수 있습니다.`,
                            element,
                            `인라인 이벤트 핸들러 대신 JavaScript에서 addEventListener를 사용하고, 사용자 입력을 처리할 때 적절한 검증 및 이스케이프 처리를 구현하세요.`
                        ));
                    }
                }
            });
            
            // 2. URL 프래그먼트/매개변수에 접근하는 코드 검사
            const inlineScripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            inlineScripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // URL 매개변수/프래그먼트 접근 패턴 확인
                const locationPatterns = [
                    { pattern: /location\.hash/i, type: 'hash' },
                    { pattern: /location\.search/i, type: 'search' },
                    { pattern: /location\.href/i, type: 'href' },
                    { pattern: /document\.URL/i, type: 'URL' },
                    { pattern: /document\.URLUnencoded/i, type: 'URLUnencoded' },
                    { pattern: /document\.referrer/i, type: 'referrer' },
                    { pattern: /window\.name/i, type: 'name' }
                ];
                
                locationPatterns.forEach(pattern => {
                    if (pattern.pattern.test(scriptContent)) {
                        this.results.stats.riskyElements.unvalidatedUrls++;
                        
                        // URL 매개변수와 위험 함수 모두 사용되는 경우 확인
                        const hasRiskyFunction = this.xssRiskyPatterns.some(
                            riskyPattern => riskyPattern.pattern.test(scriptContent)
                        );
                        
                        if (hasRiskyFunction) {
                            this.results.stats.unsafePatterns++;
                            this.results.issues.push(this.analyzer.createIssue(
                                'xss-dom-based',
                                'critical',
                                `DOM 기반 XSS 취약점 가능성이 발견되었습니다: location.${pattern.type}`,
                                `스크립트 #${index + 1}이 URL ${pattern.type}을(를) 위험한 함수와 함께 사용합니다.`,
                                script,
                                `URL 매개변수는 항상 악성 스크립트가 포함되어 있다고 가정하고, DOM에 삽입하기 전에 적절히 검증하고 이스케이프 처리해야 합니다.`
                            ));
                        }
                    }
                });
            });
        }
        
        /**
         * 이벤트 핸들러 속성이 있는 요소 찾기
         * @return {Array} 이벤트 핸들러 속성이 있는 요소 배열
         */
        findElementsWithEventHandlers() {
            // 모든 이벤트 핸들러 속성으로 선택자 생성
            const selector = this.xssRiskyAttributes.map(attr => `[${attr}]`).join(',');
            
            return Array.from(this.doc.querySelectorAll(selector));
        }
        
        /**
         * 이스케이프 처리되지 않은 출력 감지
         */
        detectUnescapedOutput() {
            // 클라이언트 측에서는 제한적으로만 확인 가능
            // 서버 측 템플릿 이스케이프 처리 확인 불가
            
            // 1. 동적 콘텐츠 생성 코드 확인
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 동적 HTML 생성 패턴
                if (/\.innerHTML\s*=|\.outerHTML\s*=|document\.write\(|\.insertAdjacentHTML\(/.test(scriptContent)) {
                    // 동적 HTML 생성과 외부 입력 소스 모두 사용된 경우
                    const hasExternalInput = /location\.|\$\(|document\.cookie|getElementById\(|querySelector\(|XMLHttpRequest|fetch\(/.test(scriptContent);
                    
                    if (hasExternalInput) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'xss-unescaped-output',
                            'major',
                            `잠재적으로 이스케이프 처리되지 않은 동적 HTML 생성이 발견되었습니다.`,
                            `스크립트 #${index + 1}이 외부 입력을 사용하여 동적 HTML을 생성하고 있습니다. 이스케이프 처리가 올바르게 수행되지 않으면 XSS 취약점이 될 수 있습니다.`,
                            script,
                            `HTML을 생성할 때는 항상 사용자 입력을 적절히 이스케이프 처리하세요. innerHTML 대신 textContent를 사용하고, 필요한 경우 DOMPurify와 같은 라이브러리를 사용하여 HTML을 살균하세요.`
                        ));
                    }
                }
            });
        }
        
        /**
         * URL 매개변수 반영 검사
         */
        detectUrlParameterReflection() {
            // 페이지 URL에서 매개변수 추출
            const url = new URL(window.location.href);
            const params = url.searchParams;
            
            if (params.size === 0) {
                return; // URL 매개변수 없음
            }
            
            // URL 매개변수 값 추출
            const paramValues = Array.from(params.values());
            
            // HTML에서 URL 매개변수 값이 반영된 곳 찾기
            const htmlContent = this.doc.documentElement.outerHTML;
            
            paramValues.forEach(value => {
                if (value.length > 3 && htmlContent.includes(value)) {
                    // 위험한 스크립트 패턴인 경우에만 보고
                    if (this.containsRiskyScriptPattern(value)) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'xss-reflected-parameter',
                            'critical',
                            `URL 매개변수가 페이지 콘텐츠에 반영된 것이 감지되었습니다.`,
                            `URL 매개변수 값 "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"이 페이지 HTML에 반영되었습니다. 이 값이 올바르게 이스케이프 처리되지 않으면 반사형 XSS 취약점이 될 수 있습니다.`,
                            null,
                            `URL 매개변수를 페이지에 삽입할 때는 항상 적절히 이스케이프 처리하세요. HTML 컨텍스트에 삽입할 때는 HTML 엔티티 인코딩을, JavaScript 컨텍스트에 삽입할 때는 JavaScript 이스케이프 처리를 수행해야 합니다.`
                        ));
                    }
                }
            });
        }
        
        /**
         * 값에 위험한 스크립트 패턴이 포함되어 있는지 확인
         * @param {string} value - 확인할 값
         * @return {boolean} 위험한 패턴 포함 여부
         */
        containsRiskyScriptPattern(value) {
            const riskyPatterns = [
                /<script/i, /<\/script/i, /javascript:/i, /on\w+\s*=/i, /&lt;script/i, 
                /alert\s*\(/i, /eval\s*\(/i, /document\./i, /window\./i
            ];
            
            return riskyPatterns.some(pattern => pattern.test(value));
        }
        
        /**
         * CSRF 취약점 감지
         */
        detectCsrfVulnerabilities() {
            logger.debug('CSRF 취약점 감지');
            
            // 폼 CSRF 보호 검사
            const forms = Array.from(this.doc.querySelectorAll('form'));
            let csrfVulnerableForms = 0;
            
            forms.forEach((form, index) => {
                const method = (form.getAttribute('method') || 'GET').toUpperCase();
                
                // GET 폼은 상태 변경이 없어야 하므로 CSRF 검사 생략
                if (method === 'GET') {
                    return;
                }
                
                // 상태를 변경할 수 있는 POST/PUT/DELETE 폼 검사
                const action = form.getAttribute('action') || '';
                const hasStateChangingInputs = this.hasStateChangingInputs(form);
                
                if (method !== 'GET' && hasStateChangingInputs) {
                    // CSRF 토큰 확인
                    const hasCsrfToken = this.hasCsrfToken(form);
                    
                    if (!hasCsrfToken) {
                        csrfVulnerableForms++;
                        this.results.issues.push(this.analyzer.createIssue(
                            'csrf-no-token',
                            'critical',
                            `CSRF 토큰이 없는 상태 변경 폼이 발견되었습니다.`,
                            `폼 #${index + 1}은(는) ${method} 메서드를 사용하여 상태를 변경할 수 있지만 CSRF 보호가 없습니다.`,
                            form,
                            `모든 상태 변경 폼에 CSRF 토큰을 추가하세요. 숨겨진 입력 필드에 서버에서 생성된 무작위 토큰을 포함시키고, 각 요청에서 이 토큰을 검증해야 합니다.`
                        ));
                    }
                }
            });
            
            // AJAX 요청 분석
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            let csrfVulnerableAjax = 0;
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // AJAX 요청 패턴 확인
                const ajaxPatterns = [
                    /XMLHttpRequest/i, 
                    /fetch\s*\(/i, 
                    /\$\.ajax/i, 
                    /\$\.post/i, 
                    /\$\.get/i,
                    /axios\./i
                ];
                
                const hasAjaxRequest = ajaxPatterns.some(pattern => pattern.test(scriptContent));
                
                if (hasAjaxRequest) {
                    // CSRF 헤더 또는 토큰 확인
                    const hasXsrfHeader = /X-CSRF|XSRF|csrf|xsrf|X-XSRF|_token/.test(scriptContent);
                    
                    if (!hasXsrfHeader) {
                        // POST, PUT, DELETE 요청 확인
                        const hasStateChangingMethod = /['"](POST|PUT|DELETE)['"]/i.test(scriptContent) || 
                                                       /method\s*:\s*['"]POST['"]|method\s*:\s*['"]PUT['"]|method\s*:\s*['"]DELETE['"]/i.test(scriptContent);
                        
                        if (hasStateChangingMethod) {
                            csrfVulnerableAjax++;
                            this.results.issues.push(this.analyzer.createIssue(
                                'csrf-no-ajax-protection',
                                'major',
                                `CSRF 보호가 없는 AJAX 상태 변경 요청이 발견되었습니다.`,
                                `스크립트 #${index + 1}에서 CSRF 토큰 또는 헤더 없이 상태를 변경하는 AJAX 요청이 발견되었습니다.`,
                                script,
                                `AJAX 요청에 CSRF 토큰을 포함하세요. X-CSRF-Token 헤더를 추가하거나 요청 본문에 _token 필드를 포함시키세요.`
                            ));
                        }
                    }
                }
            });
            
            // 결과 통계 업데이트
            this.results.stats.csrfVulnerabilities = csrfVulnerableForms + csrfVulnerableAjax;
        }
        
        /**
         * 폼에 상태 변경 입력이 있는지 확인
         * @param {Element} form - 확인할 폼 요소
         * @return {boolean} 상태 변경 입력 존재 여부
         */
        hasStateChangingInputs(form) {
            // 상태 변경 버튼 확인
            const buttons = form.querySelectorAll('button, input[type="submit"]');
            
            for (const button of buttons) {
                const buttonText = button.textContent || button.value || '';
                if (/submit|save|update|delete|change|modify|add|create|remove/i.test(buttonText)) {
                    return true;
                }
            }
            
            // hidden 필드 확인
            const hiddenFields = form.querySelectorAll('input[type="hidden"]');
            for (const field of hiddenFields) {
                const fieldName = field.getAttribute('name') || '';
                if (/id|action|method|update|delete|change|modify/i.test(fieldName)) {
                    return true;
                }
            }
            
            // 폼 액션 URL 확인
            const action = form.getAttribute('action') || '';
            if (/add|edit|update|delete|save|modify|create|change/i.test(action)) {
                return true;
            }
            
            return false;
        }
        
        /**
         * 폼에 CSRF 토큰이 있는지 확인
         * @param {Element} form - 확인할 폼 요소
         * @return {boolean} CSRF 토큰 존재 여부
         */
        hasCsrfToken(form) {
            // 1. 숨겨진 필드에서 CSRF 토큰 확인
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            
            for (const input of hiddenInputs) {
                const inputName = input.getAttribute('name') || '';
                if (/csrf|xsrf|_token|token/i.test(inputName)) {
                    return true;
                }
            }
            
            // 2. 폼 속성에서 확인
            const formData = form.getAttribute('data-csrf') || 
                           form.getAttribute('data-token') || 
                           form.getAttribute('data-xsrf');
            
            if (formData) {
                return true;
            }
            
            // 3. 확인할 수 없음 - 클라이언트 측 제한
            return false;
        }
        
        /**
         * SQL 인젝션 취약점 감지
         */
        detectSqlInjectionVulnerabilities() {
            logger.debug('SQL 인젝션 취약점 감지');
            
            // 클라이언트 측에서 완전한 SQL 인젝션 분석은 불가능
            // 여기서는 클라이언트 측 코드에서 잠재적인 SQL 인젝션 패턴만 확인
            
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            let sqlInjectionIssues = 0;
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 각 SQL 인젝션 패턴 확인
                this.sqlInjectionPatterns.forEach(pattern => {
                    if (pattern.pattern.test(scriptContent)) {
                        // 문자열 연결과 사용자 입력을 모두 사용하는 경우 특히 위험
                        const hasUserInput = /getElementById|querySelector|location|cookie|localStorage|value|innerHTML/.test(scriptContent);
                        
                        if (hasUserInput && pattern.type === 'stringConcatenation') {
                            sqlInjectionIssues++;
                            this.results.issues.push(this.analyzer.createIssue(
                                'sql-injection-risk',
                                pattern.severity,
                                `잠재적인 SQL 인젝션 취약점 패턴이 발견되었습니다.`,
                                `스크립트 #${index + 1}에서 SQL 쿼리 문자열을 사용자 입력과 연결하는 패턴이 발견되었습니다.`,
                                script,
                                `SQL 쿼리를 생성할 때는 항상 매개변수화된 쿼리(파라미터화된 쿼리)를 사용하세요. 문자열 연결을 통해 쿼리를 구성하지 마세요.`
                            ));
                        } else if (pattern.type === 'sqlSyntax') {
                            this.results.issues.push(this.analyzer.createIssue(
                                'sql-syntax-client-side',
                                'info',
                                `클라이언트 측 스크립트에서 SQL 구문이 발견되었습니다.`,
                                `스크립트 #${index + 1}에서 SQL 구문이 발견되었습니다. 클라이언트 측 코드에서 SQL을 사용하는 것은 일반적이지 않습니다.`,
                                script,
                                `가능한 SQL 관련 작업은 서버 측에서 수행하세요. 클라이언트 측 코드에서 SQL 사용을 최소화하고, 사용하는 경우 매개변수화된 쿼리를 사용하세요.`
                            ));
                        }
                    }
                });
            });
            
            // 폼 입력 필드 검사
            const forms = Array.from(this.doc.querySelectorAll('form'));
            
            forms.forEach((form, index) => {
                const inputs = form.querySelectorAll('input[type="text"], input[type="search"], textarea');
                
                for (const input of inputs) {
                    const placeholderOrName = (input.getAttribute('placeholder') || '') + (input.getAttribute('name') || '');
                    
                    // SQL 관련 필드 이름 확인
                    if (/sql|query|database|db/i.test(placeholderOrName)) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'sql-injection-form-input',
                            'minor',
                            `SQL 관련 입력 필드가 발견되었습니다.`,
                            `폼 #${index + 1}에 SQL 관련 입력 필드 "${input.getAttribute('name') || input.getAttribute('placeholder')}"가 있습니다. 이러한 입력이 적절히 검증되지 않으면 SQL 인젝션 취약점이 될 수 있습니다.`,
                            input,
                            `이 입력 필드에 대한 서버 측 유효성 검사를 구현하고, SQL 쿼리에 사용할 때 매개변수화된 쿼리를 사용하세요.`
                        ));
                    }
                }
            });
            
            // 결과 통계 업데이트
            this.results.stats.sqlInjectionVulnerabilities = sqlInjectionIssues;
        }
        
        /**
         * 클라이언트 측 분석 한계 메시지 추가
         */
        addClientSideLimitationsMessage() {
            this.results.issues.push(this.analyzer.createIssue(
                'client-side-limitations',
                'info',
                '클라이언트 측 인젝션 취약점 분석의 한계',
                '인젝션 취약점의 전체 분석은 서버 측 코드 검사가 필요합니다.',
                null,
                '완전한 보안 분석을 위해 서버 측 코드를 검토하고 SAST(정적 애플리케이션 보안 테스트) 도구를 사용하세요.'
            ));
        }
        
        /**
         * 권장 사항 생성
         */
        generateRecommendations() {
            logger.debug('인젝션 취약점 권장 사항 생성');
            
            const recommendations = [];
            
            // XSS 권장 사항
            if (this.results.stats.xssVulnerabilities > 0) {
                recommendations.push({
                    title: 'XSS 취약점 방지',
                    description: '교차 사이트 스크립팅(XSS) 취약점으로부터 웹사이트를 보호하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>출력 인코딩 구현:</strong> 컨텍스트에 맞는 이스케이프 처리 사용</p>
                                <ul>
                                    <li>HTML 컨텍스트: HTML 엔티티 인코딩</li>
                                    <li>JavaScript 컨텍스트: JavaScript 이스케이프 처리</li>
                                    <li>URL 컨텍스트: URL 인코딩</li>
                                </ul>
                            </li>
                            <li>
                                <p><strong>안전한 DOM API 사용:</strong> innerHTML 대신 textContent 또는 innerText 사용</p>
                            </li>
                            <li>
                                <p><strong>콘텐츠 보안 정책(CSP) 구현:</strong> 인라인 스크립트와 eval() 제한</p>
                            </li>
                            <li>
                                <p><strong>입력 검증:</strong> 모든 사용자 입력에 대한 화이트리스트 검증 구현</p>
                            </li>
                            <li>
                                <p><strong>HTML 살균:</strong> DOMPurify와 같은 라이브러리 사용</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // CSRF 권장 사항
            if (this.results.stats.csrfVulnerabilities > 0) {
                recommendations.push({
                    title: 'CSRF 보호 구현',
                    description: '교차 사이트 요청 위조(CSRF) 공격으로부터 웹사이트를 보호하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>CSRF 토큰 사용:</strong> 모든 상태 변경 폼에 고유한 토큰 추가</p>
                                <pre>&lt;input type="hidden" name="_csrf_token" value="[랜덤 토큰]"></pre>
                            </li>
                            <li>
                                <p><strong>Double Submit Cookie 패턴:</strong> 쿠키와 요청 본문에 동일한 토큰 포함</p>
                            </li>
                            <li>
                                <p><strong>SameSite 쿠키 속성:</strong> 인증 쿠키에 SameSite=Strict 또는 SameSite=Lax 설정</p>
                            </li>
                            <li>
                                <p><strong>AJAX 요청에 CSRF 헤더 추가:</strong></p>
                                <pre>
                                fetch('/api/data', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
                                  },
                                  body: JSON.stringify(data)
                                })
                                </pre>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // SQL 인젝션 권장 사항
            if (this.results.stats.sqlInjectionVulnerabilities > 0) {
                recommendations.push({
                    title: 'SQL 인젝션 방지',
                    description: 'SQL 인젝션 공격으로부터 데이터베이스를 보호하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>매개변수화된 쿼리 사용:</strong> 문자열 연결 대신 준비된 문장 사용</p>
                                <pre>
                                // 안전하지 않음:
                                query = "SELECT * FROM users WHERE username = '" + username + "'";
                                
                                // 안전함:
                                query = "SELECT * FROM users WHERE username = ?";
                                statement.execute(query, [username]);
                                </pre>
                            </li>
                            <li>
                                <p><strong>ORM 사용:</strong> 가능한 경우 안전한 ORM(Object-Relational Mapping) 프레임워크 사용</p>
                            </li>
                            <li>
                                <p><strong>입력 검증:</strong> 데이터베이스에 사용되는 모든 입력에 대한 화이트리스트 검증 구현</p>
                            </li>
                            <li>
                                <p><strong>최소 권한 원칙:</strong> 데이터베이스 사용자에게 필요한 최소 권한만 부여</p>
                            </li>
                            <li>
                                <p><strong>클라이언트 측 SQL 방지:</strong> SQL 관련 작업은 서버 측에서만 수행</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 일반적인 인젝션 방지 권장 사항
            recommendations.push({
                title: '입력 검증 및 출력 인코딩 모범 사례',
                description: '모든, 인젝션 공격을 방지하기 위한 일반적인 모범 사례입니다.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>화이트리스트 검증:</strong> 허용된 입력만 수락하고 나머지는 거부</p>
                        </li>
                        <li>
                            <p><strong>컨텍스트별 출력 인코딩:</strong> 데이터가 사용되는 컨텍스트에 맞는 인코딩 적용</p>
                        </li>
                        <li>
                            <p><strong>보안 라이브러리 사용:</strong> 검증된 보안 라이브러리를 사용하여 일반적인 취약점 방지</p>
                        </li>
                        <li>
                            <p><strong>보안 테스트:</strong> 정기적인 취약점 스캔 및 침투 테스트 수행</p>
                        </li>
                        <li>
                            <p><strong>보안 개발 교육:</strong> 개발자에게 안전한 코딩 관행 교육</p>
                        </li>
                    </ul>
                `,
                priority: 'medium'
            });
            
            this.results.recommendations = recommendations;
        }
        
        /**
         * 최종 점수 계산
         */
        calculateScore() {
            logger.debug('인젝션 취약점 점수 계산');
            
            // 기본 점수
            let score = 100;
            
            // XSS 취약점 감점
            const xssIssues = this.results.issues.filter(issue => issue.code && issue.code.includes('xss'));
            const criticalXssIssues = xssIssues.filter(issue => issue.severity === 'critical');
            const majorXssIssues = xssIssues.filter(issue => issue.severity === 'major');
            const minorXssIssues = xssIssues.filter(issue => issue.severity === 'minor');
            
            score -= criticalXssIssues.length * 15;
            score -= majorXssIssues.length * 10;
            score -= minorXssIssues.length * 5;
            
            // CSRF 취약점 감점
            const csrfIssues = this.results.issues.filter(issue => issue.code && issue.code.includes('csrf'));
            const criticalCsrfIssues = csrfIssues.filter(issue => issue.severity === 'critical');
            const majorCsrfIssues = csrfIssues.filter(issue => issue.severity === 'major');
            
            score -= criticalCsrfIssues.length * 15;
            score -= majorCsrfIssues.length * 10;
            
            // SQL 인젝션 취약점 감점
            const sqlInjectionIssues = this.results.issues.filter(issue => issue.code && issue.code.includes('sql-injection'));
            const majorSqlInjectionIssues = sqlInjectionIssues.filter(issue => issue.severity === 'major');
            const minorSqlInjectionIssues = sqlInjectionIssues.filter(issue => issue.severity === 'minor');
            
            score -= majorSqlInjectionIssues.length * 10;
            score -= minorSqlInjectionIssues.length * 5;
            
            // 클라이언트 측 분석 한계 보정
            score = Math.min(score, 90); // 클라이언트 측 분석만으로는 100점 불가능
            
            // 최종 점수 범위 제한
            this.results.score = Math.max(0, Math.min(100, Math.round(score)));
        }
    }
    
    return {
        /**
         * 인젝션 취약점 분석 수행
         * @param {Document} document - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(document) {
            const detector = new InjectionDetector(document);
            return detector.analyze();
        }
    };
})();