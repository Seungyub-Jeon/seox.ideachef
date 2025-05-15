/**
 * 인증 및 세션 보안 검증 모듈
 * 쿠키 속성, 세션 관리 방식, 인증 메커니즘의 보안을 분석합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.security');

KoreanWebAnalyzer.analyzer.security.AuthSessionValidator = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('AuthSessionValidator');
    
    /**
     * 인증 및 세션 보안 검증기 클래스
     */
    class AuthSessionValidator {
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
                    cookiesAnalyzed: 0,
                    secureCookies: 0,
                    insecureCookies: 0,
                    authFormsAnalyzed: 0,
                    secureAuthForms: 0,
                    insecureAuthForms: 0,
                    hasPasswordField: false,
                    hasRememberMe: false,
                    hasLogout: false,
                    hasSessionManagement: false
                }
            };
            
            // 인증 관련 키워드
            this.authKeywords = [
                'login', 'signin', 'sign-in', 'auth', 'authenticate', 'session',
                'logout', 'signout', 'sign-out', 'password', 'credentials', 'register',
                'signup', 'sign-up', 'account'
            ];
            
            // 세션 관련 키워드
            this.sessionKeywords = [
                'session', 'token', 'jwt', 'auth', 'key', 'timeout', 'expire',
                'cookie', 'localstorage', 'sessionstorage', 'remember'
            ];
            
            // 세션 관리 함수 패턴
            this.sessionManagementPatterns = [
                /sessionStorage\./i,
                /localStorage\./i,
                /document\.cookie/i,
                /\.cookie/i,
                /session/i,
                /token/i,
                /login/i,
                /logout/i,
                /auth/i
            ];
        }
        
        /**
         * 인증 및 세션 보안 분석 수행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('인증 및 세션 보안 분석 시작');
            
            // 쿠키 분석
            this.analyzeCookies();
            
            // 인증 폼 분석
            this.analyzeAuthForms();
            
            // 세션 관리 분석
            this.analyzeSessionManagement();
            
            // 비밀번호 필드 보안 분석
            this.analyzePasswordSecurity();
            
            // 클라이언트 측 분석 한계 메시지 추가
            this.addClientSideLimitationsMessage();
            
            // 권장 사항 생성
            this.generateRecommendations();
            
            // 최종 점수 계산
            this.calculateScore();
            
            logger.debug('인증 및 세션 보안 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * 쿠키 보안 분석
         */
        analyzeCookies() {
            logger.debug('쿠키 보안 분석');
            
            // 클라이언트 측에서 쿠키 속성을 완전히 분석하기는 어려움
            // document.cookie로는 HttpOnly 쿠키를 볼 수 없음
            
            // 1. 스크립트에서 쿠키 조작 패턴 확인
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            let cookieScripts = [];
            let secureCookieCount = 0;
            let insecureCookieCount = 0;
            
            scripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 쿠키 설정 패턴 확인
                if (/document\.cookie\s*=|\.cookie\s*=/.test(scriptContent)) {
                    cookieScripts.push({ script, index, content: scriptContent });
                    
                    // 쿠키 속성 확인
                    const hasSecure = /secure/i.test(scriptContent);
                    const hasSameSite = /samesite\s*=\s*(strict|lax)/i.test(scriptContent);
                    const hasHttpOnly = /httponly/i.test(scriptContent);
                    
                    if (hasSecure && hasSameSite) {
                        secureCookieCount++;
                    } else {
                        insecureCookieCount++;
                        
                        // 속성 누락 이슈 추가
                        if (!hasSecure) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'cookie-missing-secure',
                                'major',
                                '쿠키에 Secure 플래그가 없습니다.',
                                `스크립트 #${index + 1}에서 설정한 쿠키에 Secure 플래그가 누락되었습니다. 이로 인해 쿠키가 HTTP를 통해 전송될 수 있습니다.`,
                                script,
                                `쿠키를 설정할 때 Secure 플래그를 추가하세요: document.cookie = "name=value; Path=/; Secure";`
                            ));
                        }
                        
                        if (!hasSameSite) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'cookie-missing-samesite',
                                'major',
                                '쿠키에 SameSite 속성이 없습니다.',
                                `스크립트 #${index + 1}에서 설정한 쿠키에 SameSite 속성이 없습니다. 이로 인해 CSRF 공격에 취약할 수 있습니다.`,
                                script,
                                `쿠키를 설정할 때 SameSite=Strict 또는 SameSite=Lax 속성을 추가하세요: document.cookie = "name=value; Path=/; Secure; SameSite=Lax";`
                            ));
                        }
                        
                        // HttpOnly는 JavaScript에서 설정할 수 없으므로 권장 사항만 추가
                        this.results.issues.push(this.analyzer.createIssue(
                            'cookie-client-httponly',
                            'info',
                            'HttpOnly 플래그는 클라이언트 측에서 설정할 수 없습니다.',
                            `클라이언트 측 JavaScript에서는 HttpOnly 플래그를 설정할 수 없습니다. 이 설정은 서버 측에서만 가능합니다.`,
                            script,
                            `인증 및 세션 쿠키에 대해 서버 측에서 HttpOnly 플래그를 설정하세요.`
                        ));
                    }
                }
            });
            
            // 2. 세션 스토리지/로컬 스토리지 보안 확인
            const hasStorageUsage = scripts.some(script => 
                /localStorage|sessionStorage/.test(script.textContent)
            );
            
            if (hasStorageUsage) {
                this.results.issues.push(this.analyzer.createIssue(
                    'storage-for-sensitive-data',
                    'minor',
                    '웹 스토리지가 민감한 데이터에 사용될 수 있습니다.',
                    `localStorage 또는 sessionStorage 사용이 감지되었습니다. 이것들은 암호화되지 않고 HttpOnly 속성을 지원하지 않으므로 민감한 데이터에 사용해서는 안 됩니다.`,
                    null,
                    `인증 토큰, 개인 정보 또는 기타 민감한 데이터에는 웹 스토리지 대신 HttpOnly 및 Secure 플래그가 있는 쿠키를 사용하세요.`
                ));
            }
            
            // 결과 통계 업데이트
            this.results.stats.cookiesAnalyzed = cookieScripts.length;
            this.results.stats.secureCookies = secureCookieCount;
            this.results.stats.insecureCookies = insecureCookieCount;
        }
        
        /**
         * 인증 폼 보안 분석
         */
        analyzeAuthForms() {
            logger.debug('인증 폼 보안 분석');
            
            // 인증 관련 폼 찾기
            const forms = Array.from(this.doc.querySelectorAll('form'));
            const authForms = this.findAuthForms(forms);
            
            if (authForms.length === 0) {
                return; // 인증 폼 없음
            }
            
            let secureAuthForms = 0;
            let insecureAuthForms = 0;
            
            authForms.forEach((form, index) => {
                const hasPasswordField = form.querySelector('input[type="password"]') !== null;
                if (hasPasswordField) {
                    this.results.stats.hasPasswordField = true;
                }
                
                // 1. HTTPS 사용 확인
                const action = form.getAttribute('action') || '';
                const formUrl = action ? new URL(action, window.location.href) : new URL(window.location.href);
                const isSecureUrl = formUrl.protocol === 'https:';
                
                if (!isSecureUrl && hasPasswordField) {
                    insecureAuthForms++;
                    this.results.issues.push(this.analyzer.createIssue(
                        'auth-form-not-https',
                        'critical',
                        '인증 폼이 HTTPS를 사용하지 않습니다.',
                        `인증 폼 #${index + 1}이 안전하지 않은 HTTP 연결을 통해 자격 증명을 전송할 수 있습니다.`,
                        form,
                        `인증 폼의 action 속성을 HTTPS URL로 변경하고, 전체 웹사이트를 HTTPS로 제공하세요.`
                    ));
                } else if (isSecureUrl) {
                    secureAuthForms++;
                }
                
                // 2. 자동 완성 설정 확인
                const autocomplete = form.getAttribute('autocomplete');
                const passwordField = form.querySelector('input[type="password"]');
                
                if (passwordField && autocomplete !== 'off' && !passwordField.hasAttribute('autocomplete')) {
                    this.results.issues.push(this.analyzer.createIssue(
                        'auth-form-autocomplete',
                        'minor',
                        '비밀번호 필드에 자동 완성이 비활성화되지 않았습니다.',
                        `인증 폼 #${index + 1}의 비밀번호 필드가 브라우저에 저장될 수 있습니다.`,
                        passwordField,
                        `비밀번호 필드에 autocomplete="new-password" 또는 autocomplete="off" 속성을 추가하세요.`
                    ));
                }
                
                // 3. "Remember me" 기능 확인
                const hasRememberMe = this.hasRememberMeFeature(form);
                if (hasRememberMe) {
                    this.results.stats.hasRememberMe = true;
                    
                    // "Remember me" 기능에 대한 보안 검사
                    this.results.issues.push(this.analyzer.createIssue(
                        'auth-remember-me',
                        'info',
                        '"Remember me" 기능이 감지되었습니다.',
                        `인증 폼 #${index + 1}에 "Remember me" 기능이 있습니다. 이 기능은 안전하게 구현해야 합니다.`,
                        form,
                        `"Remember me" 토큰은 랜덤하고 고유해야 하며, 클라이언트 측 조작으로부터 보호되어야 합니다. 서버 측에서 토큰 만료, 유효성 검사 및 안전한 저장을 구현하세요.`
                    ));
                }
            });
            
            // 결과 통계 업데이트
            this.results.stats.authFormsAnalyzed = authForms.length;
            this.results.stats.secureAuthForms = secureAuthForms;
            this.results.stats.insecureAuthForms = insecureAuthForms;
        }
        
        /**
         * 인증 관련 폼 찾기
         * @param {Array} forms - 폼 요소 배열
         * @return {Array} 인증 관련 폼 배열
         */
        findAuthForms(forms) {
            return forms.filter(form => {
                // 폼 속성 확인
                const action = (form.getAttribute('action') || '').toLowerCase();
                const id = (form.getAttribute('id') || '').toLowerCase();
                const className = (form.getAttribute('class') || '').toLowerCase();
                const name = (form.getAttribute('name') || '').toLowerCase();
                
                // 비밀번호 필드 확인
                const hasPasswordField = form.querySelector('input[type="password"]') !== null;
                
                // 로그인 버튼 확인
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                const submitText = submitButton ? (submitButton.textContent || submitButton.value || '').toLowerCase() : '';
                
                // 인증 관련 속성 확인
                const isAuthRelated = 
                    hasPasswordField || 
                    this.authKeywords.some(keyword => 
                        action.includes(keyword) || 
                        id.includes(keyword) || 
                        className.includes(keyword) || 
                        name.includes(keyword) || 
                        submitText.includes(keyword)
                    );
                
                return isAuthRelated;
            });
        }
        
        /**
         * "Remember me" 기능 여부 확인
         * @param {Element} form - 폼 요소
         * @return {boolean} "Remember me" 기능 존재 여부
         */
        hasRememberMeFeature(form) {
            // 체크박스 또는 "Remember me" 레이블 확인
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            
            for (const checkbox of checkboxes) {
                const id = checkbox.getAttribute('id') || '';
                const name = checkbox.getAttribute('name') || '';
                const value = checkbox.getAttribute('value') || '';
                
                // 체크박스 속성 확인
                if (/remember|keep|stay|logged|signin/i.test(id) || 
                    /remember|keep|stay|logged|signin/i.test(name) || 
                    /remember|keep|stay|logged|signin/i.test(value)) {
                    return true;
                }
                
                // 연결된 레이블 확인
                if (id) {
                    const label = this.doc.querySelector(`label[for="${id}"]`);
                    if (label && /remember|keep|stay|logged|기억|로그인/i.test(label.textContent)) {
                        return true;
                    }
                }
                
                // 부모 레이블 확인
                const parentLabel = checkbox.closest('label');
                if (parentLabel && /remember|keep|stay|logged|기억|로그인/i.test(parentLabel.textContent)) {
                    return true;
                }
            }
            
            return false;
        }
        
        /**
         * 세션 관리 보안 분석
         */
        analyzeSessionManagement() {
            logger.debug('세션 관리 보안 분석');
            
            // 1. 로그아웃 기능 확인
            this.checkLogoutFunctionality();
            
            // 2. 세션 타임아웃 확인
            this.checkSessionTimeout();
            
            // 3. 세션 스토리지 사용 확인
            this.checkSessionStorage();
        }
        
        /**
         * 로그아웃 기능 확인
         */
        checkLogoutFunctionality() {
            // 로그아웃 링크 확인
            const logoutLinks = Array.from(this.doc.querySelectorAll('a')).filter(link => {
                const href = link.getAttribute('href') || '';
                const text = link.textContent.toLowerCase();
                return /logout|signout|sign-out|로그아웃/i.test(href) || /logout|sign out|로그아웃/i.test(text);
            });
            
            // 로그아웃 버튼 확인
            const logoutButtons = Array.from(this.doc.querySelectorAll('button')).filter(button => {
                const text = button.textContent.toLowerCase();
                return /logout|sign out|로그아웃/i.test(text);
            });
            
            if (logoutLinks.length > 0 || logoutButtons.length > 0) {
                this.results.stats.hasLogout = true;
            } else {
                // 스크립트에서 로그아웃 함수 확인
                const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
                const hasLogoutFunction = scripts.some(script => 
                    /function\s+logout|logout\s*=|\.logout|signOut|logOut/i.test(script.textContent)
                );
                
                if (hasLogoutFunction) {
                    this.results.stats.hasLogout = true;
                } else {
                    // 로그아웃 기능이 없는 경우 (인증 폼이 있는 경우에만 이슈 추가)
                    if (this.results.stats.authFormsAnalyzed > 0) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'missing-logout',
                            'major',
                            '로그아웃 기능이 감지되지 않았습니다.',
                            '인증 시스템이 있지만 명시적인 로그아웃 기능이 없습니다. 사용자가 세션을 종료할 수 없으면 보안 위험이 발생할 수 있습니다.',
                            null,
                            `로그아웃 기능을 구현하고, 로그아웃 시 서버 측 세션을 무효화하고 클라이언트 측 토큰/쿠키를 제거하세요.`
                        ));
                    }
                }
            }
        }
        
        /**
         * 세션 타임아웃 확인
         */
        checkSessionTimeout() {
            // 스크립트에서 세션 만료/타임아웃 관련 코드 확인
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            const hasSessionTimeout = scripts.some(script => {
                const content = script.textContent;
                return /session.*?timeout|session.*?expire|idle.*?timeout|inactivity/i.test(content);
            });
            
            if (hasSessionTimeout) {
                this.results.stats.hasSessionManagement = true;
            } else if (this.results.stats.authFormsAnalyzed > 0) {
                // 세션 타임아웃이 감지되지 않은 경우 (인증 폼이 있는 경우에만 이슈 추가)
                this.results.issues.push(this.analyzer.createIssue(
                    'missing-session-timeout',
                    'minor',
                    '세션 타임아웃 기능이 감지되지 않았습니다.',
                    '세션 타임아웃이 구현되지 않으면 비활성 세션이 계속 유효하게 유지되어 보안 위험이 발생할 수 있습니다.',
                    null,
                    `세션 타임아웃을 구현하여 일정 시간 동안 비활성 상태인 세션을 자동으로 종료하세요. 또한 사용자에게 타임아웃 전에 알림을 제공하는 것이 좋습니다.`
                ));
            }
        }
        
        /**
         * 세션 스토리지 사용 확인
         */
        checkSessionStorage() {
            // 스크립트에서 세션 관리 코드 확인
            const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            let sessionManagementScripts = [];
            
            scripts.forEach((script, index) => {
                const content = script.textContent;
                
                // 세션 관리 패턴 확인
                const hasSessionManagement = this.sessionManagementPatterns.some(pattern => 
                    pattern.test(content)
                );
                
                if (hasSessionManagement) {
                    sessionManagementScripts.push({ script, index });
                    this.results.stats.hasSessionManagement = true;
                    
                    // 세션 데이터 저장 위치 확인
                    if (/localStorage\./i.test(content) && 
                        /token|auth|user|login|session|jwt/i.test(content)) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'sensitive-data-in-local-storage',
                            'major',
                            '민감한 세션 데이터가 localStorage에 저장될 수 있습니다.',
                            `스크립트 #${index + 1}에서 localStorage에 인증 관련 데이터를 저장하는 코드가 발견되었습니다. localStorage는 XSS 공격에 취약합니다.`,
                            script,
                            `민감한 인증 데이터는 localStorage 대신 HttpOnly 쿠키에 저장하세요. 또는 암호화된 형태로만 localStorage에 저장하고 제한된 수명을 가지도록 구현하세요.`
                        ));
                    }
                    
                    // JWT 토큰 확인
                    if (/jwt|token|bearer/i.test(content)) {
                        // 토큰 검증 코드가 있는지 확인
                        const hasTokenValidation = /verify|validate|check|expire|decode/i.test(content);
                        
                        if (!hasTokenValidation) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'jwt-without-validation',
                                'minor',
                                'JWT/토큰 검증 없이 사용되는 것으로 보입니다.',
                                `스크립트 #${index + 1}에서 토큰 유효성 검사 없이 JWT 또는 인증 토큰을 사용하는 것으로 보입니다.`,
                                script,
                                `모든 JWT 또는 인증 토큰을 사용하기 전에 서명, 만료 상태 및 권한을 검증하세요. 오래된 토큰을 자동으로 새로 고칠 때는 주의가 필요합니다.`
                            ));
                        }
                    }
                }
            });
        }
        
        /**
         * 비밀번호 필드 보안 분석
         */
        analyzePasswordSecurity() {
            logger.debug('비밀번호 필드 보안 분석');
            
            // 비밀번호 필드 찾기
            const passwordFields = Array.from(this.doc.querySelectorAll('input[type="password"]'));
            
            if (passwordFields.length === 0) {
                return; // 비밀번호 필드 없음
            }
            
            // 비밀번호 강도 검사 여부 확인
            const forms = Array.from(this.doc.querySelectorAll('form'));
            const passwordForms = forms.filter(form => form.querySelector('input[type="password"]'));
            
            passwordForms.forEach((form, index) => {
                // 강도 미터 또는 관련 요소 확인
                const hasStrengthMeter = form.querySelector('meter, progress, .strength, .password-strength');
                const strengthElements = Array.from(form.querySelectorAll('*')).filter(el => 
                    /strength|secure|weak|strong|level/i.test(el.id) || 
                    /strength|secure|weak|strong|level/i.test(el.className)
                );
                
                const passwordField = form.querySelector('input[type="password"]');
                
                // 비밀번호 유효성 검사 스크립트 확인
                const scripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
                const passwordValidationScripts = scripts.filter(script => {
                    const content = script.textContent;
                    return /password.*?validation|validate.*?password|password.*?strength|check.*?password/i.test(content);
                });
                
                if (!hasStrengthMeter && 
                    strengthElements.length === 0 && 
                    passwordValidationScripts.length === 0) {
                    this.results.issues.push(this.analyzer.createIssue(
                        'no-password-strength',
                        'minor',
                        '비밀번호 강도 점검이 감지되지 않았습니다.',
                        `폼 #${index + 1}에 비밀번호 필드가 있지만 비밀번호 강도 검사가 구현되어 있지 않습니다.`,
                        passwordField,
                        `사용자 비밀번호 선택을 안내하기 위해 비밀번호 강도 미터와 복잡성 요구 사항(길이, 특수 문자, 대소문자, 숫자 등)을 구현하세요.`
                    ));
                }
                
                // 확인 비밀번호 필드 확인
                const passwordFields = form.querySelectorAll('input[type="password"]');
                
                if (passwordFields.length === 1 && 
                    form.getAttribute('id')?.includes('register') || 
                    form.getAttribute('action')?.includes('register') ||
                    form.querySelector('button')?.textContent.includes('Register')) {
                    this.results.issues.push(this.analyzer.createIssue(
                        'no-password-confirmation',
                        'minor',
                        '비밀번호 확인 필드가 없습니다.',
                        `등록 폼 #${index + 1}에 비밀번호 확인 필드가 없습니다.`,
                        passwordField,
                        `사용자 입력 실수를 방지하기 위해 등록 및 비밀번호 변경 폼에 비밀번호 확인 필드를 추가하세요.`
                    ));
                }
            });
        }
        
        /**
         * 클라이언트 측 분석 한계 메시지 추가
         */
        addClientSideLimitationsMessage() {
            this.results.issues.push(this.analyzer.createIssue(
                'auth-client-side-limitations',
                'info',
                '클라이언트 측 인증 및 세션 보안 분석의 한계',
                '인증 및 세션 보안의 많은 측면은 서버 측 구현에 의존하며 클라이언트 측 분석만으로는 완전히 평가할 수 없습니다.',
                null,
                `완전한 보안 분석을 위해 서버 측 코드를 검토하고 세션 관리, 비밀번호 해싱, 인증 흐름 및 계정 복구 메커니즘의 보안을 확인하세요.`
            ));
        }
        
        /**
         * 권장 사항 생성
         */
        generateRecommendations() {
            logger.debug('인증 및 세션 보안 권장 사항 생성');
            
            const recommendations = [];
            
            // 쿠키 보안 권장 사항
            if (this.results.stats.insecureCookies > 0 || this.results.stats.cookiesAnalyzed > 0) {
                recommendations.push({
                    title: '안전한 쿠키 구성',
                    description: '인증 및 세션 쿠키에 적절한 보안 속성을 설정하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>HttpOnly 플래그:</strong> JavaScript에서 쿠키에 접근할 수 없게 하여 XSS 공격으로부터 보호</p>
                                <pre>
                                // 서버 측 코드(예: Express.js)
                                res.cookie('sessionId', 'value', {
                                  httpOnly: true,
                                  secure: true,
                                  sameSite: 'strict'
                                });
                                </pre>
                            </li>
                            <li>
                                <p><strong>Secure 플래그:</strong> HTTPS를 통해서만 쿠키 전송</p>
                                <pre>
                                // 클라이언트 측 JavaScript
                                document.cookie = "name=value; Path=/; Secure; SameSite=Strict";
                                </pre>
                            </li>
                            <li>
                                <p><strong>SameSite 속성:</strong> CSRF 공격 방지를 위해 SameSite=Strict 또는 SameSite=Lax 설정</p>
                            </li>
                            <li>
                                <p><strong>만료 시간 설정:</strong> 쿠키에 적절한 만료 시간 설정</p>
                                <pre>
                                // 클라이언트 측 JavaScript - 1시간 만료
                                const expiryDate = new Date();
                                expiryDate.setTime(expiryDate.getTime() + (60 * 60 * 1000));
                                document.cookie = "name=value; Path=/; Secure; SameSite=Strict; expires=" + expiryDate.toUTCString();
                                </pre>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 인증 폼 보안 권장 사항
            if (this.results.stats.authFormsAnalyzed > 0) {
                recommendations.push({
                    title: '안전한 인증 폼 구현',
                    description: '인증 폼과 자격 증명 처리에 대한 보안 모범 사례를 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>HTTPS 사용:</strong> 모든 인증 페이지와 폼은 HTTPS를 통해서만 접근 가능하도록 설정</p>
                            </li>
                            <li>
                                <p><strong>CSRF 보호:</strong> 인증 폼에 CSRF 토큰 포함</p>
                                <pre>
                                &lt;input type="hidden" name="_csrf_token" value="[랜덤 토큰]">
                                </pre>
                            </li>
                            <li>
                                <p><strong>자동 완성 제어:</strong> 비밀번호 필드에 적절한 autocomplete 속성 설정</p>
                                <pre>
                                &lt;input type="password" name="password" autocomplete="new-password">
                                </pre>
                            </li>
                            <li>
                                <p><strong>비밀번호 강도 검사:</strong> 클라이언트 및 서버 측 비밀번호 복잡성 검증 구현</p>
                            </li>
                            <li>
                                <p><strong>로그인 속도 제한:</strong> 무차별 대입 공격 방지를 위한 속도 제한 구현</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 세션 관리 권장 사항
            if (this.results.stats.hasSessionManagement || this.results.stats.authFormsAnalyzed > 0) {
                recommendations.push({
                    title: '안전한 세션 관리 구현',
                    description: '세션 생성, 검증, 종료에 대한 보안 모범 사례를 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>세션 ID 생성:</strong> 암호학적으로 안전한 난수 발생기 사용</p>
                            </li>
                            <li>
                                <p><strong>세션 타임아웃:</strong> 활성 및 절대 타임아웃 구현</p>
                                <pre>
                                // 예: JavaScript 비활성 타임아웃
                                let idleTime = 0;
                                const idleInterval = setInterval(timerIncrement, 60000); // 1분마다
                                
                                function timerIncrement() {
                                  idleTime++;
                                  if (idleTime > 30) { // 30분 후
                                    // 세션 만료 및 로그아웃
                                    window.location.href = '/logout';
                                  }
                                }
                                
                                // 사용자 활동 시 타이머 재설정
                                document.addEventListener('mousemove', resetTimer);
                                document.addEventListener('keypress', resetTimer);
                                
                                function resetTimer() {
                                  idleTime = 0;
                                }
                                </pre>
                            </li>
                            <li>
                                <p><strong>안전한 로그아웃:</strong> 서버 측 세션 무효화 및 클라이언트 측 데이터 정리</p>
                                <pre>
                                function logout() {
                                  // 서버에 로그아웃 요청
                                  fetch('/api/logout', {
                                    method: 'POST',
                                    credentials: 'same-origin'
                                  }).then(() => {
                                    // 클라이언트 측 저장소 정리
                                    localStorage.removeItem('user');
                                    sessionStorage.clear();
                                    // 홈 페이지로 리디렉션
                                    window.location.href = '/';
                                  });
                                }
                                </pre>
                            </li>
                            <li>
                                <p><strong>세션 고정 공격 방지:</strong> 인증 후 세션 ID 재생성</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // "Remember me" 기능 권장 사항
            if (this.results.stats.hasRememberMe) {
                recommendations.push({
                    title: '안전한 "Remember me" 기능 구현',
                    description: '영구 로그인 기능을 안전하게 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>시리즈 토큰 사용:</strong> "Remember me" 토큰과 시리즈 식별자를 조합하여 토큰 도용 감지</p>
                            </li>
                            <li>
                                <p><strong>토큰 저장:</strong> 토큰 해시만 서버에 저장하고 평문 토큰은 저장하지 않음</p>
                            </li>
                            <li>
                                <p><strong>유효 기간 제한:</strong> "Remember me" 토큰에 최대 30일 정도의 만료 시간 설정</p>
                            </li>
                            <li>
                                <p><strong>보안 기능 제한:</strong> "Remember me" 세션에서는 비밀번호 변경, 개인 정보 수정 등 민감한 작업 제한</p>
                            </li>
                            <li>
                                <p><strong>토큰 교체:</strong> 로그인마다 "Remember me" 토큰 교체</p>
                            </li>
                        </ul>
                    `,
                    priority: 'medium'
                });
            }
            
            // 비밀번호 관리 권장 사항
            if (this.results.stats.hasPasswordField) {
                recommendations.push({
                    title: '안전한 비밀번호 관리',
                    description: '비밀번호 저장, 검증, 복구에 대한 보안 모범 사례를 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>안전한 해싱:</strong> 비밀번호에 bcrypt, Argon2, PBKDF2와 같은 강력한 해싱 알고리즘 사용</p>
                            </li>
                            <li>
                                <p><strong>비밀번호 정책:</strong> 최소 길이, 복잡성, 일반적인 비밀번호 금지 등의 정책 구현</p>
                                <pre>
                                // 예: JavaScript 비밀번호 검증
                                function validatePassword(password) {
                                  // 최소 8자, 최대 64자
                                  if (password.length < 8 || password.length > 64) return false;
                                  
                                  // 대문자, 소문자, 숫자, 특수 문자 포함
                                  const hasUppercase = /[A-Z]/.test(password);
                                  const hasLowercase = /[a-z]/.test(password);
                                  const hasNumbers = /[0-9]/.test(password);
                                  const hasSpecialChars = /[^A-Za-z0-9]/.test(password);
                                  
                                  return hasUppercase && hasLowercase && hasNumbers && hasSpecialChars;
                                }
                                </pre>
                            </li>
                            <li>
                                <p><strong>안전한 비밀번호 복구:</strong> 임시 토큰 기반 비밀번호 재설정 구현</p>
                            </li>
                            <li>
                                <p><strong>다중 인증:</strong> 가능한 경우 2FA/MFA 구현</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // 클라이언트 측 저장소 사용 권장 사항
            recommendations.push({
                title: '안전한 클라이언트 측 저장소 사용',
                description: '웹 스토리지와 쿠키를 안전하게 사용하여 민감한 데이터를 보호하세요.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>민감한 데이터 저장 위치:</strong> 인증 토큰과 민감한 데이터는 HttpOnly 쿠키에 저장</p>
                        </li>
                        <li>
                            <p><strong>웹 스토리지 사용:</strong> localStorage/sessionStorage는 민감하지 않은 데이터만 저장</p>
                        </li>
                        <li>
                            <p><strong>데이터 암호화:</strong> 클라이언트 측에 민감한 데이터를 저장해야 하는 경우 암호화 사용</p>
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
            logger.debug('인증 및 세션 보안 점수 계산');
            
            // 기본 점수
            let score = 100;
            
            // 인증 폼 보안 점수
            if (this.results.stats.authFormsAnalyzed > 0) {
                const secureRatio = this.results.stats.secureAuthForms / this.results.stats.authFormsAnalyzed;
                
                if (secureRatio < 1) {
                    score -= 30 * (1 - secureRatio);
                }
            }
            
            // 쿠키 보안 점수
            if (this.results.stats.cookiesAnalyzed > 0) {
                const secureRatio = this.results.stats.secureCookies / this.results.stats.cookiesAnalyzed;
                
                if (secureRatio < 1) {
                    score -= 20 * (1 - secureRatio);
                }
            }
            
            // 로그아웃 기능 점수
            if (this.results.stats.authFormsAnalyzed > 0 && !this.results.stats.hasLogout) {
                score -= 15;
            }
            
            // 세션 관리 점수
            if (this.results.stats.authFormsAnalyzed > 0 && !this.results.stats.hasSessionManagement) {
                score -= 10;
            }
            
            // 이슈별 감점
            const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical');
            const majorIssues = this.results.issues.filter(issue => issue.severity === 'major');
            const minorIssues = this.results.issues.filter(issue => issue.severity === 'minor');
            
            score -= criticalIssues.length * 15;
            score -= majorIssues.length * 10;
            score -= minorIssues.length * 5;
            
            // 클라이언트 측 분석 한계 보정
            score = Math.min(score, 90); // 클라이언트 측 분석만으로는 100점 불가능
            
            // 최종 점수 범위 제한
            this.results.score = Math.max(0, Math.min(100, Math.round(score)));
        }
    }
    
    return {
        /**
         * 인증 및 세션 보안 분석 수행
         * @param {Document} document - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(document) {
            const validator = new AuthSessionValidator(document);
            return validator.analyze();
        }
    };
})();