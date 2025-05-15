/**
 * 민감한 정보 감지 스캐너 모듈
 * API 키, 토큰, 개인정보 등 민감한 정보가 노출되었는지 감지합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.security');

KoreanWebAnalyzer.analyzer.security.SensitiveDataScanner = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('SensitiveDataScanner');
    
    /**
     * 민감한 정보 스캐너 클래스
     */
    class SensitiveDataScanner {
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
                    scannedElements: 0,
                    detectedApiKeys: 0,
                    detectedTokens: 0,
                    detectedPersonalData: 0,
                    detectedCredentials: 0,
                    totalDetections: 0,
                    sourcesWithSensitiveData: {
                        html: 0,
                        scripts: 0,
                        localStorage: 0,
                        sessionStorage: 0,
                        inputs: 0
                    }
                }
            };
            
            // API 키 및 토큰 패턴
            this.apiKeyPatterns = [
                // API 키 일반 패턴
                { pattern: /api[._-]?key\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'apiKey', severity: 'critical' },
                { pattern: /api[._-]?secret\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'apiSecret', severity: 'critical' },
                { pattern: /access[._-]?token\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'accessToken', severity: 'critical' },
                { pattern: /app[._-]?(key|secret|token)\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'appKey', severity: 'critical' },
                
                // 특정 서비스 API 키 패턴
                { pattern: /google[._-]?api[._-]?key\s*[:=]\s*['"](AIza[\w\d-]{35})['"]/i, type: 'googleApiKey', severity: 'critical' },
                { pattern: /firebase[._-]?api[._-]?key\s*[:=]\s*['"](AIza[\w\d-]{35})['"]/i, type: 'firebaseApiKey', severity: 'critical' },
                { pattern: /aws[._-]?(access|secret)[._-]?key\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'awsKey', severity: 'critical' },
                { pattern: /sk_live_[0-9a-zA-Z]{24}/i, type: 'stripeKey', severity: 'critical' },
                { pattern: /facebook[._-]?app[._-]?(id|key|secret)\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'facebookKey', severity: 'critical' },
                
                // JWT 토큰 패턴
                { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/i, type: 'jwtToken', severity: 'critical' },
                
                // OAuth 토큰 패턴
                { pattern: /oauth[._-]?token\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'oauthToken', severity: 'critical' }
            ];
            
            // 개인 정보 패턴
            this.personalDataPatterns = [
                // 이메일 주소 패턴
                { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i, type: 'email', severity: 'major' },
                
                // 신용카드 번호 패턴 (기본적인 검증 - 실제 검증은 더 복잡할 수 있음)
                { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/i, type: 'creditCard', severity: 'critical' },
                
                // 미국 사회보장번호(SSN) 패턴
                { pattern: /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d))-(?!00)(\d{2})-(?!0000)(\d{4})\b/i, type: 'ssn', severity: 'critical' },
                
                // 한국 주민등록번호 패턴
                { pattern: /\d{6}[-]\d{7}/i, type: 'koreanId', severity: 'critical' },
                
                // 전화번호 패턴 (국제 형식)
                { pattern: /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/i, type: 'phoneNumber', severity: 'major' },
                
                // 한국 전화번호 패턴
                { pattern: /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/i, type: 'koreanPhone', severity: 'major' },
                
                // IP 주소 패턴
                { pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/i, type: 'ipAddress', severity: 'minor' }
            ];
            
            // 계정 정보 패턴
            this.credentialPatterns = [
                // 비밀번호 패턴
                { pattern: /password\s*[:=]\s*['"][\w\d!@#$%^&*()]{6,}['"]/i, type: 'password', severity: 'critical' },
                { pattern: /passwd\s*[:=]\s*['"][\w\d!@#$%^&*()]{6,}['"]/i, type: 'password', severity: 'critical' },
                { pattern: /pwd\s*[:=]\s*['"][\w\d!@#$%^&*()]{6,}['"]/i, type: 'password', severity: 'critical' },
                
                // 사용자명 패턴
                { pattern: /username\s*[:=]\s*['"][^'"]{3,}['"]/i, type: 'username', severity: 'major' },
                { pattern: /user[._-]?name\s*[:=]\s*['"][^'"]{3,}['"]/i, type: 'username', severity: 'major' },
                
                // 비밀번호 초기화 토큰 패턴
                { pattern: /reset[._-]?token\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'resetToken', severity: 'critical' },
                
                // 로그인 관련 정보
                { pattern: /login[._-]?token\s*[:=]\s*['"][\w\d]{16,}['"]/i, type: 'loginToken', severity: 'critical' }
            ];
            
            // 민감한 데이터 용도 키워드
            this.sensitiveKeywords = [
                'password', 'secret', 'token', 'key', 'api', 'auth', 'login', 'credential',
                'private', 'secure', 'security', 'confidential', 'sensitive'
            ];
        }
        
        /**
         * 민감한 정보 스캔 수행
         * @return {Object} 스캔 결과
         */
        analyze() {
            logger.debug('민감한 정보 스캔 시작');
            
            // 각 소스별 스캔
            this.scanHtmlContent();
            this.scanScriptContent();
            this.scanWebStorage();
            this.scanInputFields();
            
            // 클라이언트 측 분석 한계 메시지 추가
            this.addClientSideLimitationsMessage();
            
            // 권장 사항 생성
            this.generateRecommendations();
            
            // 최종 점수 계산
            this.calculateScore();
            
            // 민감한 정보 토탈 수 계산
            this.results.stats.totalDetections = 
                this.results.stats.detectedApiKeys + 
                this.results.stats.detectedTokens + 
                this.results.stats.detectedPersonalData +
                this.results.stats.detectedCredentials;
            
            logger.debug('민감한 정보 스캔 완료', { score: this.results.score, detections: this.results.stats.totalDetections });
            
            return this.results;
        }
        
        /**
         * HTML 콘텐츠에서 민감한 정보 스캔
         */
        scanHtmlContent() {
            logger.debug('HTML 콘텐츠 스캔');
            
            // HTML 콘텐츠 가져오기 (코멘트 포함)
            const htmlContent = this.doc.documentElement.outerHTML;
            
            // HTML 주석 찾기
            const commentRegex = /<!--([\s\S]*?)-->/g;
            let comment;
            let sensitiveDataFound = false;
            
            while ((comment = commentRegex.exec(htmlContent)) !== null) {
                const commentContent = comment[1];
                
                // 주석에서 민감한 정보 검사
                const apiKeyFound = this.scanContentForAPIKeys(commentContent, 'html-comment');
                const personalDataFound = this.scanContentForPersonalData(commentContent, 'html-comment');
                const credentialsFound = this.scanContentForCredentials(commentContent, 'html-comment');
                
                sensitiveDataFound = sensitiveDataFound || apiKeyFound || personalDataFound || credentialsFound;
            }
            
            // 민감한 데이터용 HTML 속성 검사
            const elements = this.doc.querySelectorAll('[data-*]');
            
            elements.forEach(element => {
                const attributes = element.attributes;
                
                for (let i = 0; i < attributes.length; i++) {
                    const attr = attributes[i];
                    
                    // 데이터 속성이고 민감한 키워드가 포함된 경우
                    if (attr.name.startsWith('data-') && 
                        this.sensitiveKeywords.some(keyword => attr.name.includes(keyword))) {
                        
                        const apiKeyFound = this.scanContentForAPIKeys(attr.value, 'html-attribute');
                        const personalDataFound = this.scanContentForPersonalData(attr.value, 'html-attribute');
                        const credentialsFound = this.scanContentForCredentials(attr.value, 'html-attribute');
                        
                        sensitiveDataFound = sensitiveDataFound || apiKeyFound || personalDataFound || credentialsFound;
                        
                        if (apiKeyFound || personalDataFound || credentialsFound) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'sensitive-data-in-attribute',
                                'major',
                                `민감한 정보가 HTML 속성에서 발견되었습니다.`,
                                `'${attr.name}' 속성에 민감한 정보가 포함되어 있습니다.`,
                                element,
                                `민감한 정보를 HTML 속성에 저장하지 마세요. 대신 서버 측에서 안전하게 처리하세요.`
                            ));
                        }
                    }
                }
            });
            
            if (sensitiveDataFound) {
                this.results.stats.sourcesWithSensitiveData.html++;
            }
        }
        
        /**
         * 스크립트 콘텐츠에서 민감한 정보 스캔
         */
        scanScriptContent() {
            logger.debug('스크립트 콘텐츠 스캔');
            
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            let sensitiveScriptsCount = 0;
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 스크립트에서 민감한 정보 검사
                const apiKeyFound = this.scanContentForAPIKeys(scriptContent, 'script', script, index);
                const personalDataFound = this.scanContentForPersonalData(scriptContent, 'script', script, index);
                const credentialsFound = this.scanContentForCredentials(scriptContent, 'script', script, index);
                
                if (apiKeyFound || personalDataFound || credentialsFound) {
                    sensitiveScriptsCount++;
                }
            });
            
            if (sensitiveScriptsCount > 0) {
                this.results.stats.sourcesWithSensitiveData.scripts = sensitiveScriptsCount;
            }
        }
        
        /**
         * 웹 스토리지(localStorage, sessionStorage)에서 민감한 정보 스캔
         */
        scanWebStorage() {
            logger.debug('웹 스토리지 스캔');
            
            try {
                // localStorage 스캔
                let sensitiveInLocalStorage = false;
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    
                    // 키에 민감한 키워드가 있는지 확인
                    const hasSensitiveKeyword = this.sensitiveKeywords.some(keyword => 
                        key.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    if (hasSensitiveKeyword) {
                        sensitiveInLocalStorage = true;
                        this.results.stats.detectedCredentials++;
                        
                        // 민감한 키가 발견된 경우
                        this.results.issues.push(this.analyzer.createIssue(
                            'sensitive-key-in-local-storage',
                            'major',
                            `민감한 정보가 localStorage 키에서 발견되었습니다.`,
                            `키 '${key}'가 민감한 정보를 저장하는 것으로 보입니다.`,
                            null,
                            `민감한 정보를 localStorage에 저장하지 마세요. 인증 토큰과 같은 민감한 데이터는 HttpOnly 쿠키에 저장하는 것이 좋습니다.`
                        ));
                    }
                    
                    // 값 검사
                    try {
                        const value = localStorage.getItem(key);
                        
                        const apiKeyFound = this.scanContentForAPIKeys(value, 'localStorage');
                        const personalDataFound = this.scanContentForPersonalData(value, 'localStorage');
                        const credentialsFound = this.scanContentForCredentials(value, 'localStorage');
                        
                        sensitiveInLocalStorage = sensitiveInLocalStorage || 
                                                apiKeyFound || 
                                                personalDataFound || 
                                                credentialsFound;
                    } catch (e) {
                        // 값 읽기 오류 무시
                    }
                }
                
                if (sensitiveInLocalStorage) {
                    this.results.stats.sourcesWithSensitiveData.localStorage++;
                }
                
                // sessionStorage 스캔
                let sensitiveInSessionStorage = false;
                
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    
                    // 키에 민감한 키워드가 있는지 확인
                    const hasSensitiveKeyword = this.sensitiveKeywords.some(keyword => 
                        key.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    if (hasSensitiveKeyword) {
                        sensitiveInSessionStorage = true;
                        this.results.stats.detectedCredentials++;
                        
                        // 민감한 키가 발견된 경우
                        this.results.issues.push(this.analyzer.createIssue(
                            'sensitive-key-in-session-storage',
                            'minor',
                            `민감한 정보가 sessionStorage 키에서 발견되었습니다.`,
                            `키 '${key}'가 민감한 정보를 저장하는 것으로 보입니다.`,
                            null,
                            `민감한 정보를 sessionStorage에 저장하지 마세요. sessionStorage는 탭이 닫힐 때만 삭제되며, XSS 공격에 취약합니다.`
                        ));
                    }
                    
                    // 값 검사
                    try {
                        const value = sessionStorage.getItem(key);
                        
                        const apiKeyFound = this.scanContentForAPIKeys(value, 'sessionStorage');
                        const personalDataFound = this.scanContentForPersonalData(value, 'sessionStorage');
                        const credentialsFound = this.scanContentForCredentials(value, 'sessionStorage');
                        
                        sensitiveInSessionStorage = sensitiveInSessionStorage || 
                                                  apiKeyFound || 
                                                  personalDataFound || 
                                                  credentialsFound;
                    } catch (e) {
                        // 값 읽기 오류 무시
                    }
                }
                
                if (sensitiveInSessionStorage) {
                    this.results.stats.sourcesWithSensitiveData.sessionStorage++;
                }
            } catch (e) {
                // 웹 스토리지 접근 오류 (예: 제한된 권한)
                logger.error('웹 스토리지 스캔 중 오류:', e);
            }
        }
        
        /**
         * 입력 필드에서 민감한 정보 스캔
         */
        scanInputFields() {
            logger.debug('입력 필드 스캔');
            
            const inputs = Array.from(this.doc.querySelectorAll('input, textarea'));
            let sensitiveInputsCount = 0;
            
            inputs.forEach(input => {
                const type = input.getAttribute('type');
                const name = input.getAttribute('name') || '';
                const id = input.getAttribute('id') || '';
                const placeholder = input.getAttribute('placeholder') || '';
                const value = input.value || '';
                const autocomplete = input.getAttribute('autocomplete') || '';
                
                // 민감한 입력 필드 확인
                if (
                    // 비밀번호 필드
                    type === 'password' || 
                    
                    // 민감한 이름 또는 ID
                    this.sensitiveKeywords.some(keyword => 
                        name.toLowerCase().includes(keyword.toLowerCase()) || 
                        id.toLowerCase().includes(keyword.toLowerCase())
                    ) ||
                    
                    // 민감한 자동완성 속성
                    ['cc-number', 'cc-csc', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 
                     'current-password', 'new-password'].includes(autocomplete)
                ) {
                    sensitiveInputsCount++;
                    
                    // 안전하지 않은 유형에 대한 이슈 추가
                    if (
                        // 비밀번호 필드 보안 검사
                        (type === 'password' && autocomplete !== 'new-password' && autocomplete !== 'off') || 
                        
                        // 신용카드 필드 보안 검사
                        (autocomplete.startsWith('cc-') && type !== 'password' && autocomplete !== 'off')
                    ) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'sensitive-input-autocomplete',
                            'major',
                            `민감한 입력 필드에 자동완성이 비활성화되지 않았습니다.`,
                            `입력 필드 '${name || id}'에 자동완성이 활성화되어 있어 민감한 정보가 브라우저에 저장될 수 있습니다.`,
                            input,
                            `민감한 정보를 다루는 입력 필드에 autocomplete="off" 또는 적절한 보안 값을 설정하세요.`
                        ));
                    }
                    
                    // 민감한 데이터가 미리 채워진 경우
                    if (value && type !== 'hidden') {
                        this.results.stats.detectedCredentials++;
                        
                        this.results.issues.push(this.analyzer.createIssue(
                            'sensitive-data-prefilled',
                            'critical',
                            `민감한 입력 필드에 값이 미리 채워져 있습니다.`,
                            `입력 필드 '${name || id}'에 민감한 정보가 미리 채워져 있습니다.`,
                            input,
                            `민감한 정보를 HTML에 직접 포함하지 마세요. 사용자가 직접 입력하도록 하거나 보안 메커니즘을 통해 전달하세요.`
                        ));
                    }
                }
                
                // 플레이스홀더 또는 값에서 민감한 정보 검사
                if (placeholder) {
                    const personalDataFound = this.scanContentForPersonalData(placeholder, 'input-placeholder', input);
                    if (personalDataFound) sensitiveInputsCount++;
                }
                
                // 비밀번호가 아닌 필드의 값만 검사
                if (value && type !== 'password') {
                    const apiKeyFound = this.scanContentForAPIKeys(value, 'input-value', input);
                    const personalDataFound = this.scanContentForPersonalData(value, 'input-value', input);
                    const credentialsFound = this.scanContentForCredentials(value, 'input-value', input);
                    
                    if (apiKeyFound || personalDataFound || credentialsFound) {
                        sensitiveInputsCount++;
                    }
                }
            });
            
            if (sensitiveInputsCount > 0) {
                this.results.stats.sourcesWithSensitiveData.inputs = sensitiveInputsCount;
            }
        }
        
        /**
         * API 키 및 토큰 스캔
         * @param {string} content - 스캔할 콘텐츠
         * @param {string} source - 콘텐츠 소스 (script, html, localStorage 등)
         * @param {Element} [element] - 관련 DOM 요소 (있는 경우)
         * @param {number} [index] - 요소 인덱스 (있는 경우)
         * @return {boolean} API 키 발견 여부
         */
        scanContentForAPIKeys(content, source, element, index) {
            if (!content) return false;
            
            let found = false;
            this.results.scannedElements++;
            
            this.apiKeyPatterns.forEach(pattern => {
                const matches = content.match(pattern.pattern);
                
                if (matches) {
                    found = true;
                    
                    // API 키 개수 추가
                    this.results.stats.detectedApiKeys += matches.length;
                    
                    // 이슈 추가
                    const sourceDesc = index !== undefined ? `${source} #${index + 1}` : source;
                    
                    this.results.issues.push(this.analyzer.createIssue(
                        `api-key-exposed-${pattern.type}`,
                        pattern.severity,
                        `API 키 또는 토큰이 노출되었습니다: ${pattern.type}`,
                        `${sourceDesc}에서 ${pattern.type} 유형의 API 키 또는 토큰이 발견되었습니다.`,
                        element,
                        `API 키 및 토큰을 클라이언트 측 코드에 포함하지 마세요. 서버 측에서 안전하게 관리하고 필요한 경우 제한된 권한의 임시 키만 클라이언트에 제공하세요.`
                    ));
                }
            });
            
            return found;
        }
        
        /**
         * 개인 정보 스캔
         * @param {string} content - 스캔할 콘텐츠
         * @param {string} source - 콘텐츠 소스 (script, html, localStorage 등)
         * @param {Element} [element] - 관련 DOM 요소 (있는 경우)
         * @param {number} [index] - 요소 인덱스 (있는 경우)
         * @return {boolean} 개인 정보 발견 여부
         */
        scanContentForPersonalData(content, source, element, index) {
            if (!content) return false;
            
            let found = false;
            
            this.personalDataPatterns.forEach(pattern => {
                const matches = content.match(pattern.pattern);
                
                if (matches) {
                    found = true;
                    
                    // 개인 정보 개수 추가
                    this.results.stats.detectedPersonalData += matches.length;
                    
                    // 이슈 추가
                    const sourceDesc = index !== undefined ? `${source} #${index + 1}` : source;
                    
                    this.results.issues.push(this.analyzer.createIssue(
                        `personal-data-exposed-${pattern.type}`,
                        pattern.severity,
                        `개인 정보가 노출되었습니다: ${pattern.type}`,
                        `${sourceDesc}에서 ${pattern.type} 유형의 개인 정보가 발견되었습니다.`,
                        element,
                        `개인 식별 정보를 클라이언트 측 코드에 포함하지 마세요. 필요한 경우 마스킹하거나 서버 측에서 안전하게 처리하세요.`
                    ));
                }
            });
            
            return found;
        }
        
        /**
         * 계정 정보 스캔
         * @param {string} content - 스캔할 콘텐츠
         * @param {string} source - 콘텐츠 소스 (script, html, localStorage 등)
         * @param {Element} [element] - 관련 DOM 요소 (있는 경우)
         * @param {number} [index] - 요소 인덱스 (있는 경우)
         * @return {boolean} 계정 정보 발견 여부
         */
        scanContentForCredentials(content, source, element, index) {
            if (!content) return false;
            
            let found = false;
            
            this.credentialPatterns.forEach(pattern => {
                const matches = content.match(pattern.pattern);
                
                if (matches) {
                    found = true;
                    
                    // 계정 정보 개수 추가
                    this.results.stats.detectedCredentials += matches.length;
                    
                    // 이슈 추가
                    const sourceDesc = index !== undefined ? `${source} #${index + 1}` : source;
                    
                    this.results.issues.push(this.analyzer.createIssue(
                        `credential-exposed-${pattern.type}`,
                        pattern.severity,
                        `계정 정보가 노출되었습니다: ${pattern.type}`,
                        `${sourceDesc}에서 ${pattern.type} 유형의 계정 정보가 발견되었습니다.`,
                        element,
                        `비밀번호, 사용자명 등의 계정 정보를 클라이언트 측 코드에 하드코딩하지 마세요. 특히 운영 환경 자격 증명은 절대 포함해서는 안 됩니다.`
                    ));
                }
            });
            
            return found;
        }
        
        /**
         * 클라이언트 측 분석 한계 메시지 추가
         */
        addClientSideLimitationsMessage() {
            this.results.issues.push(this.analyzer.createIssue(
                'sensitive-data-scan-limitations',
                'info',
                '클라이언트 측 민감한 정보 스캔의 한계',
                '이 스캔은 클라이언트 측 코드에서 접근 가능한 데이터만 검사합니다. 서버 측 코드나 암호화된 데이터는 검사하지 않습니다.',
                null,
                `완전한 보안 스캔을 위해 서버 측 코드와 구성 파일도 검토하고, 보안 통합 테스트를 수행하세요.`
            ));
        }
        
        /**
         * 권장 사항 생성
         */
        generateRecommendations() {
            logger.debug('민감한 정보 보안 권장 사항 생성');
            
            const recommendations = [];
            
            // API 키 및 토큰 보안 권장 사항
            if (this.results.stats.detectedApiKeys > 0) {
                recommendations.push({
                    title: 'API 키 및 토큰 보안',
                    description: 'API 키와 토큰을 안전하게 관리하고 노출을 방지하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>서버 측 프록시 사용:</strong> API 키를 클라이언트 측에 노출하지 않고 서버를 통해 API 요청을 프록시</p>
                                <pre>
                                // 클라이언트 코드: API 키 없음
                                fetch('/api/service-proxy')
                                  .then(response => response.json())
                                  .then(data => console.log(data));
                                
                                // 서버 코드: API 키 사용
                                app.get('/api/service-proxy', (req, res) => {
                                  const API_KEY = process.env.SERVICE_API_KEY; // 환경 변수에서 안전하게 로드
                                  // 외부 서비스에 요청하고 결과 반환
                                });
                                </pre>
                            </li>
                            <li>
                                <p><strong>제한된 범위의 키 사용:</strong> 가능한 경우 최소 권한 원칙 적용</p>
                            </li>
                            <li>
                                <p><strong>API 키 교체:</strong> 정기적으로 키 교체 및 유출 시 즉시 폐기</p>
                            </li>
                            <li>
                                <p><strong>환경 변수 사용:</strong> 하드코딩된 키 대신 환경 변수 또는 보안 자격 증명 관리 서비스 사용</p>
                            </li>
                        </ul>
                    `,
                    priority: 'critical'
                });
            }
            
            // 개인 정보 보안 권장 사항
            if (this.results.stats.detectedPersonalData > 0) {
                recommendations.push({
                    title: '개인 정보 보호',
                    description: '개인 식별 정보를 안전하게 처리하고 불필요한 노출을 방지하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>정보 최소화:</strong> 필요한 최소한의 개인 정보만 수집 및 처리</p>
                            </li>
                            <li>
                                <p><strong>데이터 마스킹:</strong> 민감한 정보 표시 시 부분 마스킹 적용</p>
                                <pre>
                                // 나쁜 예: 전체 정보 표시
                                userEmail.textContent = "example@domain.com";
                                
                                // 좋은 예: 마스킹 적용
                                function maskEmail(email) {
                                  const [username, domain] = email.split('@');
                                  return `${username.charAt(0)}${'*'.repeat(username.length - 1)}@${domain}`;
                                }
                                userEmail.textContent = maskEmail("example@domain.com"); // e*******@domain.com
                                </pre>
                            </li>
                            <li>
                                <p><strong>전송 시 암호화:</strong> 개인 정보는 항상 HTTPS를 통해 전송</p>
                            </li>
                            <li>
                                <p><strong>저장 시 암호화:</strong> 개인 정보는 암호화하여 저장</p>
                            </li>
                            <li>
                                <p><strong>접근 제한:</strong> 필요한 사용자만 개인 정보에 접근할 수 있도록 제한</p>
                            </li>
                        </ul>
                    `,
                    priority: 'critical'
                });
            }
            
            // 계정 정보 보안 권장 사항
            if (this.results.stats.detectedCredentials > 0) {
                recommendations.push({
                    title: '계정 정보 보안',
                    description: '비밀번호 및 계정 정보를 안전하게 관리하고 노출을 방지하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>자격 증명 하드코딩 금지:</strong> 코드에 비밀번호나 계정 정보 하드코딩 금지</p>
                            </li>
                            <li>
                                <p><strong>환경 변수 사용:</strong> 환경 변수나 보안 자격 증명 관리 서비스 사용</p>
                                <pre>
                                // 나쁜 예: 하드코딩
                                const DB_PASSWORD = "p@ssw0rd123";
                                
                                // 좋은 예: 환경 변수 사용
                                const DB_PASSWORD = process.env.DB_PASSWORD;
                                </pre>
                            </li>
                            <li>
                                <p><strong>안전한 저장:</strong> 비밀번호는 항상 솔트와 함께 강력한 알고리즘으로 해시하여 저장</p>
                            </li>
                            <li>
                                <p><strong>Test 계정 관리:</strong> 테스트 계정 자격 증명도 보호하고 정기적으로 변경</p>
                            </li>
                        </ul>
                    `,
                    priority: 'critical'
                });
            }
            
            // 클라이언트 측 저장소 보안 권장 사항
            if (this.results.stats.sourcesWithSensitiveData.localStorage > 0 || 
                this.results.stats.sourcesWithSensitiveData.sessionStorage > 0) {
                recommendations.push({
                    title: '클라이언트 측 저장소 보안',
                    description: '웹 스토리지와 쿠키를 안전하게.사용하여 민감한 정보 노출을 방지하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>민감한 데이터 제한:</strong> 클라이언트 측 저장소에 민감한 정보 저장 제한</p>
                            </li>
                            <li>
                                <p><strong>데이터 암호화:</strong> 클라이언트 측에 저장해야 하는 민감한 데이터는 암호화</p>
                                <pre>
                                // 데이터 암호화 예 (고급 암호화를 위해서는 Web Crypto API 사용 권장)
                                function encryptData(data, key) {
                                  // 간단한 예제 - 실제로는 Web Crypto API 사용 권장
                                  return btoa(JSON.stringify(data) + key);
                                }
                                
                                function decryptData(encryptedData, key) {
                                  // 간단한 예제 - 실제로는 Web Crypto API 사용 권장
                                  const decoded = atob(encryptedData);
                                  return JSON.parse(decoded.substring(0, decoded.length - key.length));
                                }
                                </pre>
                            </li>
                            <li>
                                <p><strong>만료 시간 설정:</strong> 저장된 데이터에 만료 시간 설정 및 자동 정리</p>
                            </li>
                            <li>
                                <p><strong>HttpOnly 쿠키 사용:</strong> 인증 토큰은 HttpOnly 쿠키에 저장</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 입력 필드 보안 권장 사항
            if (this.results.stats.sourcesWithSensitiveData.inputs > 0) {
                recommendations.push({
                    title: '민감한 정보 입력 필드 보안',
                    description: '비밀번호, 신용카드 등 민감한 정보를 처리하는 입력 필드를 안전하게 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>자동완성 비활성화:</strong> 민감한 입력 필드에 적절한 autocomplete 속성 사용</p>
                                <pre>&lt;input type="password" name="password" autocomplete="new-password"&gt;</pre>
                            </li>
                            <li>
                                <p><strong>마스킹 구현:</strong> 입력된 민감한 정보에 적절한 마스킹 적용</p>
                            </li>
                            <li>
                                <p><strong>클리핑보드 제한:</strong> 필요한 경우 민감한 필드의 복사/붙여넣기 제한</p>
                            </li>
                            <li>
                                <p><strong>HTTPS 사용:</strong> 민감한 정보 입력 페이지는 항상 HTTPS를 통해 제공</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 일반적인 민감한 정보 관리 권장 사항
            recommendations.push({
                title: '민감한 정보 관리 모범 사례',
                description: '모든 민감한 정보를 안전하게 처리하기 위한 일반적인 모범 사례입니다.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>정보 분류:</strong> 데이터의 민감도 수준에 따라 분류하고 적절한 보안 조치 적용</p>
                        </li>
                        <li>
                            <p><strong>데이터 최소화:</strong> 필요한 최소한의 정보만 수집 및 저장</p>
                        </li>
                        <li>
                            <p><strong>접근 제어:</strong> 최소 권한 원칙에 따라 민감한 정보에 대한 접근 제한</p>
                        </li>
                        <li>
                            <p><strong>보존 정책:</strong> 더 이상 필요하지 않은 민감한 정보는 안전하게 삭제</p>
                        </li>
                        <li>
                            <p><strong>보안 감사:</strong> 정기적인 보안 감사 수행 및 취약점 수정</p>
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
            logger.debug('민감한 정보 보안 점수 계산');
            
            // 기본 점수
            let score = 100;
            
            // 발견된 민감한 정보별 감점
            score -= Math.min(50, this.results.stats.detectedApiKeys * 10); // API 키 감점
            score -= Math.min(40, this.results.stats.detectedPersonalData * 8); // 개인 정보 감점
            score -= Math.min(50, this.results.stats.detectedCredentials * 10); // 계정 정보 감점
            
            // 소스별 추가 감점
            if (this.results.stats.sourcesWithSensitiveData.html > 0) {
                score -= 10; // HTML에 민감한 정보 존재시 추가 감점
            }
            
            if (this.results.stats.sourcesWithSensitiveData.localStorage > 0) {
                score -= 15; // localStorage에 민감한 정보 존재시 추가 감점
            }
            
            // 이슈별 감점
            const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical');
            const majorIssues = this.results.issues.filter(issue => issue.severity === 'major');
            const minorIssues = this.results.issues.filter(issue => issue.severity === 'minor');
            
            score -= Math.min(50, criticalIssues.length * 10);
            score -= Math.min(30, majorIssues.length * 5);
            score -= Math.min(10, minorIssues.length * 2);
            
            // 최종 점수 범위 제한
            this.results.score = Math.max(0, Math.min(100, Math.round(score)));
        }
    }
    
    return {
        /**
         * 민감한 정보 스캔 수행
         * @param {Document} document - 분석할 문서
         * @return {Object} 스캔 결과
         */
        analyze: function(document) {
            const scanner = new SensitiveDataScanner(document);
            return scanner.analyze();
        }
    };
})();