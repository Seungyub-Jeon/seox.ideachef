/**
 * Content Security Policy 분석 모듈
 * 웹페이지의 CSP 설정을 분석하고 개선 방안을 제시합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.security');

KoreanWebAnalyzer.analyzer.security.CSPAnalyzer = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('CSPAnalyzer');
    
    /**
     * CSP 분석기 클래스
     */
    class CSPAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.analyzer = KoreanWebAnalyzer.utils.analyzer;
            
            // CSP 정책 분석 결과
            this.results = {
                score: 0,
                csp: null,
                source: null,
                directives: {},
                issues: [],
                recommendations: [],
                stats: {
                    hasCSP: false,
                    directivesCount: 0,
                    securityLevel: 'none', // none, weak, moderate, strong
                    unsafeDirectives: 0
                }
            };
            
            // CSP 권장 지시문과 값
            this.recommendedDirectives = {
                'default-src': ["'self'"],
                'script-src': ["'self'"],
                'style-src': ["'self'"],
                'img-src': ["'self'"],
                'connect-src': ["'self'"],
                'font-src': ["'self'"],
                'object-src': ["'none'"],
                'media-src': ["'self'"],
                'frame-src': ["'self'"],
                'frame-ancestors': ["'self'"],
                'form-action': ["'self'"],
                'base-uri': ["'self'"],
                'upgrade-insecure-requests': [],
                'block-all-mixed-content': []
            };
            
            // 위험한 지시문 값
            this.unsafeDirectiveValues = [
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "'unsafe-hashes'", 
                "data:", 
                "blob:", 
                "*"
            ];
            
            // 우선 순위가 높은 지시문
            this.criticalDirectives = [
                'script-src',
                'default-src',
                'object-src',
                'frame-ancestors',
                'form-action',
                'base-uri'
            ];
        }
        
        /**
         * CSP 분석 수행
         * @return {Object} CSP 분석 결과
         */
        analyze() {
            logger.debug('CSP 분석 시작');
            
            // CSP 추출
            this.extractCSP();
            
            // CSP가 없는 경우
            if (!this.results.csp) {
                this.generateRecommendationsForMissingCSP();
                return this.results;
            }
            
            // CSP 파싱
            this.parseCSP();
            
            // CSP 분석
            this.analyzeDirectives();
            
            // 페이지 콘텐츠와 CSP 일관성 확인
            this.checkContentConsistency();
            
            // 권장사항 생성
            this.generateRecommendations();
            
            // 최종 점수 계산
            this.calculateScore();
            
            logger.debug('CSP 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * CSP 추출 (메타 태그 또는 캐시된 헤더)
         */
        extractCSP() {
            logger.debug('CSP 추출');
            
            // 1. 메타 태그에서 CSP 추출
            const cspMetaTag = this.doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
            
            if (cspMetaTag && cspMetaTag.getAttribute('content')) {
                this.results.csp = cspMetaTag.getAttribute('content');
                this.results.source = 'meta';
                this.results.stats.hasCSP = true;
                return;
            }
            
            // 2. CSP 시뮬레이션 (대체 방법, 헤더를 직접 확인할 수 없음)
            try {
                // 페이지 콘텐츠 분석을 통해 CSP 추론 (새 창, 인라인 스크립트 등)
                if (this.inferCSPFromPageContent()) {
                    this.results.source = 'inferred';
                    this.results.stats.hasCSP = true;
                    return;
                }
            } catch (e) {
                logger.error('CSP 추론 중 오류 발생', e);
            }
            
            // CSP를 찾을 수 없음
            this.results.csp = null;
            this.results.source = null;
            this.results.stats.hasCSP = false;
        }
        
        /**
         * 페이지 콘텐츠로부터 CSP 추론
         * @return {boolean} CSP 추론 성공 여부
         */
        inferCSPFromPageContent() {
            // 이 구현은 실제로 CSP를 추론하지는 않고 CSP가 없음을 표시합니다.
            // 클라이언트 측에서 헤더를 직접 확인할 수 없는 제한 때문입니다.
            return false;
        }
        
        /**
         * CSP 파싱
         */
        parseCSP() {
            if (!this.results.csp) return;
            
            logger.debug('CSP 파싱', { csp: this.results.csp });
            
            // CSP 지시문 분리
            const directives = {};
            const directiveParts = this.results.csp.split(';').map(part => part.trim()).filter(Boolean);
            
            directiveParts.forEach(part => {
                const tokens = part.split(/\s+/);
                const directiveName = tokens[0].toLowerCase();
                const directiveValues = tokens.slice(1);
                
                directives[directiveName] = directiveValues;
            });
            
            this.results.directives = directives;
            this.results.stats.directivesCount = Object.keys(directives).length;
        }
        
        /**
         * CSP 지시문 분석
         */
        analyzeDirectives() {
            if (!this.results.directives || Object.keys(this.results.directives).length === 0) return;
            
            logger.debug('CSP 지시문 분석');
            
            const issues = [];
            let unsafeDirectivesCount = 0;
            
            // 1. 주요 지시문 누락 확인
            this.checkMissingDirectives(issues);
            
            // 2. 안전하지 않은 지시문 값 확인
            this.checkUnsafeDirectiveValues(issues, unsafeDirectivesCount);
            
            // 3. 보안 레벨 평가
            this.evaluateSecurityLevel();
            
            this.results.issues = issues;
            this.results.stats.unsafeDirectives = unsafeDirectivesCount;
        }
        
        /**
         * 중요 지시문 누락 확인
         * @param {Array} issues - 이슈 목록
         */
        checkMissingDirectives(issues) {
            // 중요 지시문 누락 확인
            const directives = this.results.directives;
            
            // default-src 또는 script-src가 없는 경우
            if (!directives['default-src'] && !directives['script-src']) {
                issues.push(this.analyzer.createIssue(
                    'missing-script-src',
                    'critical',
                    'script-src 지시문이 없고 default-src도 설정되지 않았습니다.',
                    'script-src 지시문이 없으면 스크립트 실행 제한이 없어 XSS 공격에 취약합니다.',
                    null,
                    "script-src 지시문을 추가하고 'self'로 제한하거나 필요한 신뢰할 수 있는 도메인만 허용하세요."
                ));
            }
            
            // object-src가 없는 경우
            if (!directives['object-src'] && !directives['default-src']) {
                issues.push(this.analyzer.createIssue(
                    'missing-object-src',
                    'major',
                    'object-src 지시문이 없고 default-src도 설정되지 않았습니다.',
                    'object-src 지시문이 없으면 Flash 및 기타 플러그인 콘텐츠에 대한 제한이 없습니다.',
                    null,
                    "object-src 'none'을 추가하여 플러그인 기반 콘텐츠를 차단하는 것이 좋습니다."
                ));
            }
            
            // form-action이 없는 경우
            if (!directives['form-action'] && !directives['default-src']) {
                issues.push(this.analyzer.createIssue(
                    'missing-form-action',
                    'major',
                    'form-action 지시문이 없고 default-src도 설정되지 않았습니다.',
                    'form-action 지시문이 없으면 폼 제출 대상에 대한 제한이 없어 CSRF 공격에 취약할 수 있습니다.',
                    null,
                    "form-action 지시문을 추가하고 'self'로 제한하거나 필요한 도메인만 허용하세요."
                ));
            }
            
            // frame-ancestors가 없는 경우
            if (!directives['frame-ancestors']) {
                issues.push(this.analyzer.createIssue(
                    'missing-frame-ancestors',
                    'major',
                    'frame-ancestors 지시문이 없습니다.',
                    'frame-ancestors 지시문이 없으면 clickjacking 공격에 취약할 수 있습니다.',
                    null,
                    "frame-ancestors 'none' 또는 frame-ancestors 'self'를 추가하여 페이지가 iframe에 포함되는 것을 제한하세요."
                ));
            }
        }
        
        /**
         * 안전하지 않은 지시문 값 확인
         * @param {Array} issues - 이슈 목록
         * @param {number} unsafeDirectivesCount - 안전하지 않은 지시문 수
         */
        checkUnsafeDirectiveValues(issues, unsafeDirectivesCount) {
            const directives = this.results.directives;
            
            for (const [directive, values] of Object.entries(directives)) {
                let hasUnsafeValue = false;
                
                // 지시문에 안전하지 않은 값이 있는지 확인
                this.unsafeDirectiveValues.forEach(unsafeValue => {
                    if (values.includes(unsafeValue)) {
                        hasUnsafeValue = true;
                        
                        // 와일드카드(*) 확인
                        if (unsafeValue === '*') {
                            issues.push(this.analyzer.createIssue(
                                'wildcard-directive',
                                'major',
                                `${directive} 지시문에 와일드카드(*)가 사용되었습니다.`,
                                '와일드카드는 모든 소스를 허용하므로 CSP의 보안 이점을 크게 감소시킵니다.',
                                null,
                                `와일드카드 대신 필요한 특정 도메인만 명시적으로 허용하세요.`
                            ));
                        }
                        // unsafe-inline 확인
                        else if (unsafeValue === "'unsafe-inline'") {
                            issues.push(this.analyzer.createIssue(
                                'unsafe-inline',
                                'major',
                                `${directive} 지시문에 'unsafe-inline'이 사용되었습니다.`,
                                "'unsafe-inline'은 인라인 스크립트/스타일을 허용하여 XSS 방어를 우회할 수 있습니다.",
                                null,
                                `'unsafe-inline' 대신 nonce 또는 hash 기반 접근 방식을 사용하세요. 예: 'nonce-{랜덤값}' 또는 'sha256-{해시}'`
                            ));
                        }
                        // unsafe-eval 확인
                        else if (unsafeValue === "'unsafe-eval'") {
                            issues.push(this.analyzer.createIssue(
                                'unsafe-eval',
                                'major',
                                `${directive} 지시문에 'unsafe-eval'이 사용되었습니다.`,
                                "'unsafe-eval'은 eval() 및 유사한 함수를 허용하여 XSS 취약점 위험을 증가시킵니다.",
                                null,
                                `가능하면 'unsafe-eval'을 제거하고 eval() 사용을 피하도록 코드를 리팩토링하세요.`
                            ));
                        }
                        // data: URI 확인
                        else if (unsafeValue === "data:") {
                            const severity = directive === 'img-src' ? 'minor' : 'major';
                            issues.push(this.analyzer.createIssue(
                                'data-uri',
                                severity,
                                `${directive} 지시문에 data: URI가 허용되었습니다.`,
                                `data: URI는 일부 유형의 콘텐츠(특히 스크립트)에 대해 보안 위험을 초래할 수 있습니다.`,
                                null,
                                `가능하면 data: URI 대신 호스팅된 콘텐츠를 사용하세요. 이미지에 대해서는 특정 해시와 함께 사용을 고려하세요.`
                            ));
                        }
                    }
                });
                
                if (hasUnsafeValue) {
                    unsafeDirectivesCount++;
                }
                
                // report-uri 대신 report-to 권장
                if (directive === 'report-uri' && !directives['report-to']) {
                    issues.push(this.analyzer.createIssue(
                        'deprecated-report-uri',
                        'info',
                        'report-uri 지시문은 deprecated되었습니다.',
                        'report-uri는 향후 브라우저에서 지원이 중단될 수 있습니다.',
                        null,
                        'report-uri 대신 report-to 지시문을 사용하세요. 하위 호환성을 위해 두 지시문을 모두 포함할 수 있습니다.'
                    ));
                }
            }
        }
        
        /**
         * 보안 레벨 평가
         */
        evaluateSecurityLevel() {
            const directives = this.results.directives;
            let securityLevel = 'none';
            
            // 보안 레벨 결정 로직
            if (Object.keys(directives).length > 0) {
                securityLevel = 'weak';
                
                // 1. default-src 또는 모든 중요 -src 지시문 있음
                const hasDefaultSrc = !!directives['default-src'];
                const hasAllCriticalSrcDirectives = 
                    !!directives['script-src'] && 
                    !!directives['style-src'] && 
                    !!directives['object-src'];
                
                if (hasDefaultSrc || hasAllCriticalSrcDirectives) {
                    securityLevel = 'moderate';
                }
                
                // 2. 추가 보안 기능 확인
                const hasUpgradeInsecure = !!directives['upgrade-insecure-requests'];
                const hasStrictSrc = hasDefaultSrc && directives['default-src'].includes("'self'") && directives['default-src'].length === 1;
                const hasFrameAncestors = !!directives['frame-ancestors'];
                
                // 3. 안전하지 않은 지시문 없음 확인
                let hasUnsafeValues = false;
                for (const values of Object.values(directives)) {
                    if (this.unsafeDirectiveValues.some(unsafe => values.includes(unsafe))) {
                        hasUnsafeValues = true;
                        break;
                    }
                }
                
                // 강력한 CSP 정책 조건
                if (securityLevel === 'moderate' && 
                    hasFrameAncestors && 
                    (hasUpgradeInsecure || hasStrictSrc) && 
                    !hasUnsafeValues) {
                    securityLevel = 'strong';
                }
            }
            
            this.results.stats.securityLevel = securityLevel;
        }
        
        /**
         * 페이지 콘텐츠와 CSP 일관성 확인
         */
        checkContentConsistency() {
            const directives = this.results.directives;
            if (!directives || Object.keys(directives).length === 0) return;
            
            logger.debug('페이지 콘텐츠와 CSP 일관성 확인');
            
            const issues = this.results.issues;
            
            // 1. 인라인 스크립트 확인
            this.checkInlineScriptConsistency(issues);
            
            // 2. 인라인 스타일 확인
            this.checkInlineStyleConsistency(issues);
            
            // 3. 외부 리소스 확인
            this.checkExternalResourceConsistency(issues);
        }
        
        /**
         * 인라인 스크립트와 CSP 일관성 확인
         * @param {Array} issues - 이슈 목록
         */
        checkInlineScriptConsistency(issues) {
            const directives = this.results.directives;
            const inlineScripts = this.doc.querySelectorAll('script:not([src])');
            
            if (inlineScripts.length === 0) return;
            
            // script-src 또는 default-src에 unsafe-inline 없이 인라인 스크립트가 있는 경우
            const scriptSrc = directives['script-src'] || directives['default-src'] || [];
            const allowsUnsafeInline = scriptSrc.includes("'unsafe-inline'");
            const hasNonce = inlineScripts.length > 0 && 
                             Array.from(inlineScripts).every(script => script.hasAttribute('nonce'));
            const hasHash = false; // 해시 검증은 복잡하므로 여기서는 구현하지 않음
            
            if (inlineScripts.length > 0 && !allowsUnsafeInline && !hasNonce && !hasHash) {
                issues.push(this.analyzer.createIssue(
                    'csp-blocks-inline-scripts',
                    'major',
                    '페이지에 인라인 스크립트가 있지만 CSP에서 허용되지 않습니다.',
                    `${inlineScripts.length}개의 인라인 스크립트가 CSP에 의해 차단될 수 있습니다.`,
                    null,
                    `인라인 스크립트에 nonce 속성을 추가하고 CSP에 'nonce-{값}'을 포함하거나, 스크립트를 외부 파일로 이동하세요.`
                ));
            }
        }
        
        /**
         * 인라인 스타일과 CSP 일관성 확인
         * @param {Array} issues - 이슈 목록
         */
        checkInlineStyleConsistency(issues) {
            const directives = this.results.directives;
            const inlineStyles = this.doc.querySelectorAll('style:not([href])');
            const elementsWithStyleAttr = this.doc.querySelectorAll('[style]');
            
            if (inlineStyles.length === 0 && elementsWithStyleAttr.length === 0) return;
            
            // style-src 또는 default-src에 unsafe-inline 없이 인라인 스타일이 있는 경우
            const styleSrc = directives['style-src'] || directives['default-src'] || [];
            const allowsUnsafeInline = styleSrc.includes("'unsafe-inline'");
            const hasNonce = inlineStyles.length > 0 && 
                            Array.from(inlineStyles).every(style => style.hasAttribute('nonce'));
            
            if ((inlineStyles.length > 0 || elementsWithStyleAttr.length > 0) && 
                !allowsUnsafeInline && !hasNonce) {
                issues.push(this.analyzer.createIssue(
                    'csp-blocks-inline-styles',
                    'minor',
                    '페이지에 인라인 스타일이 있지만 CSP에서 허용되지 않습니다.',
                    `${inlineStyles.length}개의 <style> 태그와 ${elementsWithStyleAttr.length}개의 style 속성이 CSP에 의해 차단될 수 있습니다.`,
                    null,
                    `<style> 태그에 nonce 속성을 추가하고 CSP에 'nonce-{값}'을 포함하거나, 스타일을 외부 파일로 이동하세요.`
                ));
            }
        }
        
        /**
         * 외부 리소스와 CSP 일관성 확인
         * @param {Array} issues - 이슈 목록
         */
        checkExternalResourceConsistency(issues) {
            const directives = this.results.directives;
            
            // 1. 외부 스크립트 확인
            const externalScripts = Array.from(this.doc.querySelectorAll('script[src]'));
            this.checkExternalResources(externalScripts, 'script-src', 'src', 'script', issues);
            
            // 2. 외부 스타일시트 확인
            const externalStyles = Array.from(this.doc.querySelectorAll('link[rel="stylesheet"][href]'));
            this.checkExternalResources(externalStyles, 'style-src', 'href', 'stylesheet', issues);
            
            // 3. 이미지 확인
            const images = Array.from(this.doc.querySelectorAll('img[src]'));
            this.checkExternalResources(images, 'img-src', 'src', 'image', issues);
            
            // 4. 프레임 확인
            const frames = Array.from(this.doc.querySelectorAll('iframe[src]'));
            this.checkExternalResources(frames, 'frame-src', 'src', 'frame', issues);
        }
        
        /**
         * 외부 리소스와 CSP 지시문 일관성 확인
         * @param {Array} elements - 확인할 요소 배열
         * @param {string} directiveName - CSP 지시문 이름
         * @param {string} attributeName - URL 속성 이름
         * @param {string} resourceType - 리소스 유형
         * @param {Array} issues - 이슈 목록
         */
        checkExternalResources(elements, directiveName, attributeName, resourceType, issues) {
            if (elements.length === 0) return;
            
            const directives = this.results.directives;
            
            // 지시문 또는 대체 지시문 확인
            const directiveValues = directives[directiveName] || directives['default-src'] || [];
            
            // 모든 도메인 허용 확인
            const allowsAny = directiveValues.includes('*');
            
            // 허용된 도메인 추출
            const allowedDomains = directiveValues.filter(value => 
                !value.startsWith("'") && !value.includes(':') && value !== '*'
            );
            
            // 현재 도메인 허용 확인
            const allowsSelf = directiveValues.includes("'self'");
            const currentHostname = window.location.hostname;
            
            // 리소스 URL 확인
            const blockedResources = [];
            
            elements.forEach(element => {
                try {
                    const resourceUrl = element.getAttribute(attributeName);
                    if (!resourceUrl) return;
                    
                    // 절대 URL 구성
                    const url = new URL(resourceUrl, window.location.href);
                    const resourceHost = url.hostname;
                    
                    // 현재 도메인 허용 여부 확인
                    const isHostSelf = resourceHost === currentHostname;
                    
                    // 리소스가 허용되는지 확인
                    let isAllowed = allowsAny || 
                                 (isHostSelf && allowsSelf) ||
                                 allowedDomains.some(domain => resourceHost.endsWith(domain));
                    
                    // 특수 스킴 확인 (data:, blob: 등)
                    if (resourceUrl.startsWith('data:')) {
                        isAllowed = directiveValues.includes('data:');
                    } else if (resourceUrl.startsWith('blob:')) {
                        isAllowed = directiveValues.includes('blob:');
                    }
                    
                    if (!isAllowed) {
                        blockedResources.push({
                            element: element,
                            url: resourceUrl,
                            hostname: resourceHost
                        });
                    }
                } catch (e) {
                    // URL 파싱 오류 무시
                }
            });
            
            // 차단될 수 있는 리소스가 있는 경우 이슈 추가
            if (blockedResources.length > 0) {
                issues.push(this.analyzer.createIssue(
                    `csp-blocks-${resourceType}s`,
                    'major',
                    `${blockedResources.length}개의 ${resourceType}가 CSP에 의해 차단될 수 있습니다.`,
                    `CSP ${directiveName} 지시문이 다음 도메인을 허용하지 않습니다: ${blockedResources.map(r => r.hostname).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
                    null,
                    `CSP ${directiveName} 지시문에 필요한 도메인을 추가하거나 리소스 URL을 허용된 도메인으로 변경하세요.`
                ));
            }
        }
        
        /**
         * CSP가 없는 경우 권장 사항 생성
         */
        generateRecommendationsForMissingCSP() {
            logger.debug('CSP 누락에 대한 권장 사항 생성');
            
            // 점수 설정
            this.results.score = 0;
            
            // 이슈 추가
            this.results.issues.push(this.analyzer.createIssue(
                'no-csp',
                'critical',
                'Content Security Policy가 설정되지 않았습니다.',
                'CSP는 XSS 및 데이터 인젝션 공격을 방지하는 데 도움이 됩니다.',
                null,
                'HTTP 헤더 또는 메타 태그를 통해 Content-Security-Policy를 설정하세요.'
            ));
            
            // 기본 권장 CSP 생성
            let recommendedCSP = "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'self'; upgrade-insecure-requests;";
            
            // 외부 리소스가 사용되는 경우 도메인 추가
            recommendedCSP = this.enhanceRecommendedCSP(recommendedCSP);
            
            // 권장 사항 추가
            this.results.recommendations.push({
                title: 'CSP 추가',
                description: 'Content Security Policy를 설정하여 XSS 및 데이터 인젝션 공격으로부터 보호하세요.',
                implementation: `
                    <p>1. HTTP 헤더 방식 (권장)</p>
                    <pre>Content-Security-Policy: ${recommendedCSP}</pre>
                    
                    <p>2. HTML 메타 태그 방식</p>
                    <pre>&lt;meta http-equiv="Content-Security-Policy" content="${recommendedCSP}"&gt;</pre>
                `,
                priority: 'high'
            });
            
            this.results.recommendations.push({
                title: 'CSP 테스트',
                description: '먼저 Report-Only 모드로 CSP를 테스트하여 호환성 문제를 확인하세요.',
                implementation: `
                    <p>Content-Security-Policy-Report-Only 헤더를 사용하여 현재 웹 사이트에 영향을 주지 않고 CSP를 테스트할 수 있습니다.</p>
                    <pre>Content-Security-Policy-Report-Only: ${recommendedCSP} report-to /csp-report-endpoint;</pre>
                    
                    <p>이렇게 하면 CSP가 차단할 내용을 보고하지만 실제로 차단하지는 않습니다.</p>
                `,
                priority: 'high'
            });
        }
        
        /**
         * 페이지 콘텐츠를 기반으로 권장 CSP 향상
         * @param {string} baseCSP - 기본 CSP 문자열
         * @return {string} 향상된 CSP 문자열
         */
        enhanceRecommendedCSP(baseCSP) {
            let enhancedCSP = baseCSP;
            const domains = new Set();
            const currentHostname = window.location.hostname;
            
            // 외부 스크립트 도메인 확인
            Array.from(this.doc.querySelectorAll('script[src]')).forEach(script => {
                try {
                    const src = script.getAttribute('src');
                    if (!src) return;
                    
                    const url = new URL(src, window.location.href);
                    if (url.hostname !== currentHostname && !url.hostname.endsWith(currentHostname)) {
                        domains.add(url.hostname);
                    }
                } catch (e) {}
            });
            
            // 외부 스타일시트 도메인 확인
            Array.from(this.doc.querySelectorAll('link[rel="stylesheet"][href]')).forEach(link => {
                try {
                    const href = link.getAttribute('href');
                    if (!href) return;
                    
                    const url = new URL(href, window.location.href);
                    if (url.hostname !== currentHostname && !url.hostname.endsWith(currentHostname)) {
                        domains.add(url.hostname);
                    }
                } catch (e) {}
            });
            
            // 외부 이미지 도메인 확인
            Array.from(this.doc.querySelectorAll('img[src]')).forEach(img => {
                try {
                    const src = img.getAttribute('src');
                    if (!src || src.startsWith('data:')) return;
                    
                    const url = new URL(src, window.location.href);
                    if (url.hostname !== currentHostname && !url.hostname.endsWith(currentHostname)) {
                        domains.add(url.hostname);
                    }
                } catch (e) {}
            });
            
            // CDN 도메인 추가
            if (domains.size > 0) {
                const uniqueDomains = Array.from(domains);
                if (uniqueDomains.length <= 5) {
                    // 도메인이 적은 경우 모두 추가
                    const scriptSrcDomains = uniqueDomains.join(' ');
                    enhancedCSP = enhancedCSP.replace("script-src 'self'", `script-src 'self' ${scriptSrcDomains}`);
                    enhancedCSP = enhancedCSP.replace("default-src 'self'", `default-src 'self' ${scriptSrcDomains}`);
                } else {
                    // 도메인이 많은 경우 일부만 추가하고 경고
                    const topDomains = uniqueDomains.slice(0, 5).join(' ');
                    enhancedCSP = enhancedCSP.replace("script-src 'self'", `script-src 'self' ${topDomains}`);
                    enhancedCSP = enhancedCSP.replace("default-src 'self'", `default-src 'self' ${topDomains}`);
                }
            }
            
            return enhancedCSP;
        }
        
        /**
         * 권장 사항 생성
         */
        generateRecommendations() {
            if (!this.results.csp) return;
            
            logger.debug('CSP 권장 사항 생성');
            
            const recommendations = [];
            const directives = this.results.directives;
            
            // 1. 안전하지 않은 지시문 개선 권장
            if (this.results.stats.unsafeDirectives > 0) {
                let unsafeRecommendation = {
                    title: '안전하지 않은 CSP 지시문 개선',
                    description: '안전하지 않은 CSP 지시문을 제거하거나 대체하여 보안을 강화하세요.',
                    implementation: '<ul>',
                    priority: 'high'
                };
                
                // unsafe-inline 개선
                if (this.findDirectiveWithValue(directives, "'unsafe-inline'")) {
                    unsafeRecommendation.implementation += `
                        <li>
                            <p><strong>'unsafe-inline' 제거:</strong> nonce 기반 접근 방식으로 대체하세요.</p>
                            <pre>script-src 'self' 'nonce-{랜덤값}';</pre>
                            <p>각 인라인 스크립트/스타일에 해당 nonce를 추가하세요:</p>
                            <pre>&lt;script nonce="{랜덤값}"&gt;...&lt;/script&gt;</pre>
                        </li>
                    `;
                }
                
                // unsafe-eval 개선
                if (this.findDirectiveWithValue(directives, "'unsafe-eval'")) {
                    unsafeRecommendation.implementation += `
                        <li>
                            <p><strong>'unsafe-eval' 제거:</strong> eval() 및 유사한 함수를 사용하지 않도록 코드를 리팩토링하세요.</p>
                            <p>JSON 파싱이 필요한 경우 <code>JSON.parse()</code>를 사용하세요.</p>
                            <p>동적 코드가 필요한 경우 웹 워커나 별도의 스크립트 파일을 사용하는 것이 좋습니다.</p>
                        </li>
                    `;
                }
                
                // 와일드카드(*) 개선
                if (this.findDirectiveWithValue(directives, "*")) {
                    unsafeRecommendation.implementation += `
                        <li>
                            <p><strong>와일드카드(*) 대체:</strong> 필요한 특정 도메인만 명시적으로 지정하세요.</p>
                            <p>예: <code>script-src 'self' example.com cdn.example.com;</code> (모든 도메인 대신 필요한 도메인만 지정)</p>
                        </li>
                    `;
                }
                
                unsafeRecommendation.implementation += '</ul>';
                recommendations.push(unsafeRecommendation);
            }
            
            // 2. 누락된 중요 지시문 추가 권장
            let missingDirectivesCount = 0;
            let missingRecommendation = {
                title: '누락된 CSP 지시문 추가',
                description: '중요한 CSP 지시문을 추가하여 보안을 강화하세요.',
                implementation: '<ul>',
                priority: 'medium'
            };
            
            this.criticalDirectives.forEach(directive => {
                if (!directives[directive] && 
                    (directive !== 'default-src' || !this.hasAllSrcDirectives(directives))) {
                    missingDirectivesCount++;
                    
                    // 지시문별 권장 값
                    let recommendedValue = "'self'";
                    if (directive === 'object-src') recommendedValue = "'none'";
                    
                    missingRecommendation.implementation += `
                        <li>
                            <p><strong>${directive} 추가:</strong></p>
                            <pre>${directive} ${recommendedValue};</pre>
                        </li>
                    `;
                }
            });
            
            // 업그레이드 지시문 권장
            if (!directives['upgrade-insecure-requests'] && !directives['block-all-mixed-content']) {
                missingDirectivesCount++;
                missingRecommendation.implementation += `
                    <li>
                        <p><strong>upgrade-insecure-requests 추가:</strong> HTTP 리소스 자동 업그레이드</p>
                        <pre>upgrade-insecure-requests;</pre>
                    </li>
                `;
            }
            
            missingRecommendation.implementation += '</ul>';
            
            if (missingDirectivesCount > 0) {
                recommendations.push(missingRecommendation);
            }
            
            // 3. 모범 사례 권장
            const bestPracticesRecommendation = {
                title: 'CSP 모범 사례 적용',
                description: 'CSP 구현 모범 사례를 적용하여 보안과 유지보수성을 향상시키세요.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>위반 보고 설정:</strong> CSP 위반을 모니터링하는 보고 엔드포인트를 설정하세요.</p>
                            <pre>report-to /csp-report-endpoint;</pre>
                        </li>
                        <li>
                            <p><strong>Report-Only 모드로 테스트:</strong> 큰 변경 전에 CSP를 테스트하세요.</p>
                            <pre>Content-Security-Policy-Report-Only: [정책];</pre>
                        </li>
                        <li>
                            <p><strong>점진적 개선:</strong> 시간에 따라 정책을 강화하세요. 먼저 모니터링하고 위반 사항을 해결한 다음 강화하세요.</p>
                        </li>
                    </ul>
                `,
                priority: 'low'
            };
            
            recommendations.push(bestPracticesRecommendation);
            
            this.results.recommendations = recommendations;
        }
        
        /**
         * 주어진 값이 있는 지시문 찾기
         * @param {Object} directives - 지시문 객체
         * @param {string} value - 찾을 값
         * @return {boolean} 해당 값을 포함하는 지시문 존재 여부
         */
        findDirectiveWithValue(directives, value) {
            for (const values of Object.values(directives)) {
                if (values.includes(value)) {
                    return true;
                }
            }
            return false;
        }
        
        /**
         * 모든 중요 src 지시문 존재 여부 확인
         * @param {Object} directives - 지시문 객체
         * @return {boolean} 모든 중요 src 지시문 존재 여부
         */
        hasAllSrcDirectives(directives) {
            return directives['script-src'] && 
                   directives['style-src'] && 
                   directives['img-src'] && 
                   directives['connect-src'] && 
                   directives['frame-src'];
        }
        
        /**
         * 최종 점수 계산
         */
        calculateScore() {
            logger.debug('CSP 점수 계산');
            
            // 기본 점수 및 가중치 정의
            let score = 0;
            const weights = {
                'existence': 30, // CSP 존재 여부
                'directives': 20, // 중요 지시문 포함 여부
                'safety': 30, // 안전한 지시문 사용
                'consistency': 20  // 페이지 콘텐츠와 일관성
            };
            
            // 1. CSP 존재 여부
            if (this.results.csp) {
                score += weights.existence;
            }
            
            // 2. 중요 지시문 점수
            let directivesScore = 0;
            const directives = this.results.directives;
            
            // 중요 지시문 확인
            if (directives['default-src'] || directives['script-src']) {
                directivesScore += 5;
            }
            
            if (directives['object-src']) {
                directivesScore += 3;
            }
            
            if (directives['frame-ancestors']) {
                directivesScore += 3;
            }
            
            if (directives['form-action']) {
                directivesScore += 3;
            }
            
            if (directives['base-uri']) {
                directivesScore += 2;
            }
            
            if (directives['upgrade-insecure-requests'] || directives['block-all-mixed-content']) {
                directivesScore += 4;
            }
            
            // 정규화된 지시문 점수
            score += (directivesScore / 20) * weights.directives;
            
            // 3. 안전한 지시문 사용 점수
            let safetyScore = 30;
            
            // unsafe-inline이나 unsafe-eval이 있으면 감점
            if (this.findDirectiveWithValue(directives, "'unsafe-inline'")) {
                safetyScore -= 15;
            }
            
            if (this.findDirectiveWithValue(directives, "'unsafe-eval'")) {
                safetyScore -= 10;
            }
            
            // 와일드카드가 있으면 감점
            if (this.findDirectiveWithValue(directives, "*")) {
                safetyScore -= 5;
            }
            
            // 정규화된 안전성 점수
            score += (Math.max(0, safetyScore) / 30) * weights.safety;
            
            // 4. 페이지 일관성 점수 (문제가 없으면 만점)
            const consistencyIssues = this.results.issues.filter(issue => 
                issue.code && (
                    issue.code.startsWith('csp-blocks-') || 
                    issue.code === 'inline-scripts' || 
                    issue.code === 'inline-styles'
                )
            );
            
            let consistencyScore = 20;
            if (consistencyIssues.length > 0) {
                consistencyScore -= Math.min(20, consistencyIssues.length * 5);
            }
            
            // 정규화된 일관성 점수
            score += (Math.max(0, consistencyScore) / 20) * weights.consistency;
            
            // 결과 점수 설정 (0-100 범위)
            this.results.score = Math.max(0, Math.min(100, Math.round(score)));
        }
    }
    
    return {
        /**
         * CSP 분석 수행
         * @param {Document} document - 분석할 문서
         * @return {Object} CSP 분석 결과
         */
        analyze: function(document) {
            const analyzer = new CSPAnalyzer(document);
            return analyzer.analyze();
        }
    };
})();