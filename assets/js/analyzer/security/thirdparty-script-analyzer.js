/**
 * 서드파티 스크립트 보안 분석 모듈
 * 외부 스크립트의 보안 위험을 분석하고 안전한 로딩 관행을 권장합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.security');

KoreanWebAnalyzer.analyzer.security.ThirdPartyScriptAnalyzer = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('ThirdPartyScriptAnalyzer');
    
    /**
     * 서드파티 스크립트 분석기 클래스
     */
    class ThirdPartyScriptAnalyzer {
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
                    totalScripts: 0,
                    externalScripts: 0,
                    secureScripts: 0,
                    unsecureScripts: 0,
                    integrityProtectedScripts: 0,
                    outdatedLibraries: 0,
                    knownVulnerableLibraries: 0,
                    externalScriptDomains: new Set(),
                    scriptTypes: {}
                }
            };
            
            // 알려진 취약한 라이브러리 버전
            // 실제 구현에서는 외부 취약점 데이터베이스와 통합하는 것이 좋습니다.
            this.knownVulnerableLibraries = [
                { name: 'jquery', version: '<3.5.0', reason: 'XSS 취약점' },
                { name: 'angular', version: '<1.8.0', reason: 'XSS 취약점' },
                { name: 'bootstrap', version: '<4.3.1', reason: 'XSS 취약점' },
                { name: 'react', version: '<16.3.0', reason: '메모리 누수' },
                { name: 'lodash', version: '<4.17.12', reason: 'Prototype 오염' },
                { name: 'moment', version: '<2.29.2', reason: 'ReDoS 취약점' }
            ];
            
            // 라이브러리 식별 패턴
            this.libraryPatterns = [
                { name: 'jquery', pattern: /jquery(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'angular', pattern: /angular(?:\.min)?\.js|angular(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'react', pattern: /react(?:-dom)?(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'bootstrap', pattern: /bootstrap(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'lodash', pattern: /lodash(?:\.min)?\.js|lodash(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'moment', pattern: /moment(?:\.min)?\.js|moment(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'vue', pattern: /vue(?:\.min)?\.js|vue(?:-([0-9.]+))?(?:\.min)?\.js/i },
                { name: 'axios', pattern: /axios(?:\.min)?\.js|axios(?:-([0-9.]+))?(?:\.min)?\.js/i }
            ];
            
            // 일반적인 광고 및 추적 도메인
            this.adAndTrackingDomains = [
                'googletagmanager.com',
                'googlesyndication.com',
                'doubleclick.net',
                'google-analytics.com',
                'facebook.net',
                'facebook.com/tr',
                'connect.facebook.net',
                'twitter.com/widgets.js',
                'platform.twitter.com',
                'ads.yahoo.com',
                'amazonaws.com',
                'cloudfront.net',
                'analytics.', 
                'tracker.',
                'track.',
                'metrics.',
                'stat.',
                'stats.',
                'pixel.',
                'beacon.',
                'counter.',
                'adservice.',
                'ads.',
                'ad.',
                'adsystem.',
                'collect.'
            ];
            
            // 일반적인 CDN 도메인
            this.commonCdnDomains = [
                'cdn.jsdelivr.net',
                'cdnjs.cloudflare.com',
                'code.jquery.com',
                'ajax.googleapis.com',
                'unpkg.com',
                'maxcdn.bootstrapcdn.com',
                'cdn.jsdelivr.net',
                'cdn.skypack.dev',
                'stackpath.bootstrapcdn.com'
            ];
        }
        
        /**
         * 서드파티 스크립트 분석 수행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('서드파티 스크립트 분석 시작');
            
            // 스크립트 요소 분석
            this.analyzeScriptElements();
            
            // 인라인 스크립트에서 동적 스크립트 로딩 분석
            this.analyzeDynamicScriptLoading();
            
            // 스크립트 로딩 보안 관행 분석
            this.analyzeScriptLoadingSecurity();
            
            // 클라이언트 측 분석 한계 메시지 추가
            this.addClientSideLimitationsMessage();
            
            // 권장 사항 생성
            this.generateRecommendations();
            
            // 최종 점수 계산
            this.calculateScore();
            
            logger.debug('서드파티 스크립트 분석 완료', { 
                score: this.results.score,
                externalScripts: this.results.stats.externalScripts,
                secureScripts: this.results.stats.secureScripts,
                domains: Array.from(this.results.stats.externalScriptDomains)
            });
            
            return this.results;
        }
        
        /**
         * 스크립트 요소 분석
         */
        analyzeScriptElements() {
            logger.debug('스크립트 요소 분석');
            
            const scripts = Array.from(this.doc.querySelectorAll('script[src]'));
            this.results.stats.totalScripts = scripts.length;
            
            scripts.forEach((script, index) => {
                const src = script.getAttribute('src');
                
                try {
                    // 외부 스크립트인지 확인
                    const scriptUrl = new URL(src, window.location.href);
                    const isExternal = scriptUrl.hostname !== window.location.hostname;
                    
                    if (isExternal) {
                        this.results.stats.externalScripts++;
                        this.results.stats.externalScriptDomains.add(scriptUrl.hostname);
                        
                        // 스크립트 타입 추적
                        this.trackScriptType(scriptUrl.hostname);
                        
                        // 보안 프로토콜 확인
                        const isSecure = scriptUrl.protocol === 'https:';
                        if (isSecure) {
                            this.results.stats.secureScripts++;
                        } else {
                            this.results.stats.unsecureScripts++;
                            
                            this.results.issues.push(this.analyzer.createIssue(
                                'insecure-script-protocol',
                                'critical',
                                '서드파티 스크립트가 안전하지 않은 프로토콜을 사용합니다.',
                                `스크립트 #${index + 1}(${src})이 HTTP를 통해 로드되고 있어 중간자 공격에 취약합니다.`,
                                script,
                                `모든 서드파티 스크립트는 HTTPS를 통해 로드해야 합니다. HTTP URL을 HTTPS로 변경하세요.`
                            ));
                        }
                        
                        // 무결성 검사 확인
                        const hasIntegrity = script.hasAttribute('integrity');
                        if (hasIntegrity) {
                            this.results.stats.integrityProtectedScripts++;
                        } else {
                            // 누락된 무결성 검사 - CDN의 경우 중요함
                            if (this.isCommonCdn(scriptUrl.hostname)) {
                                this.results.issues.push(this.analyzer.createIssue(
                                    'missing-subresource-integrity',
                                    'major',
                                    'CDN 스크립트에 무결성 검사가 없습니다.',
                                    `CDN에서 로드되는 스크립트 #${index + 1}(${src})에 무결성(integrity) 속성이 없어 스크립트 변조 위험이 있습니다.`,
                                    script,
                                    `CDN에서 로드되는 모든 스크립트에 integrity 및 crossorigin 속성을 추가하여 스크립트 변조를 방지하세요.`
                                ));
                            }
                        }
                        
                        // 알려진 취약한 라이브러리 확인
                        const vulnerabilityInfo = this.checkVulnerableLibrary(src);
                        if (vulnerabilityInfo) {
                            this.results.stats.knownVulnerableLibraries++;
                            
                            this.results.issues.push(this.analyzer.createIssue(
                                `vulnerable-library-${vulnerabilityInfo.name}`,
                                'critical',
                                `취약한 버전의 라이브러리가 발견되었습니다: ${vulnerabilityInfo.name} ${vulnerabilityInfo.detectedVersion}`,
                                `스크립트 #${index + 1}(${src})이 취약점이 있는 ${vulnerabilityInfo.name} 버전을 사용합니다. ${vulnerabilityInfo.reason}`,
                                script,
                                `${vulnerabilityInfo.name} 라이브러리를 ${vulnerabilityInfo.recommendation} 이상 버전으로 업데이트하세요.`
                            ));
                        }
                        
                        // crossorigin 속성 확인
                        const hasCrossOrigin = script.hasAttribute('crossorigin');
                        if (!hasCrossOrigin && hasIntegrity) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'missing-crossorigin',
                                'minor',
                                'integrity가 설정되었지만 crossorigin 속성이 없습니다.',
                                `스크립트 #${index + 1}(${src})에 integrity는 설정되었지만 crossorigin 속성이 없습니다.`,
                                script,
                                `무결성 검사를 사용할 때는 crossorigin="anonymous" 속성도 함께 설정해야 합니다.`
                            ));
                        }
                        
                        // 광고 및 추적 스크립트 확인
                        if (this.isAdOrTrackingDomain(scriptUrl.hostname)) {
                            this.results.issues.push(this.analyzer.createIssue(
                                'ad-tracking-script',
                                'info',
                                '광고 또는 추적 스크립트가 감지되었습니다.',
                                `스크립트 #${index + 1}(${src})이 광고 또는 사용자 추적 목적으로 사용되는 것으로 보입니다.`,
                                script,
                                `사용자 데이터 수집을 최소화하고, 사용자에게 추적 동의를 구하며, 개인정보 보호법을 준수하세요.`
                            ));
                        }
                    }
                } catch (error) {
                    // URL 파싱 오류
                    logger.error('스크립트 URL 파싱 오류:', error);
                }
            });
        }
        
        /**
         * 스크립트 타입 추적 (광고, CDN 등)
         * @param {string} hostname - 스크립트 호스트 이름
         */
        trackScriptType(hostname) {
            let type = 'other';
            
            if (this.isCommonCdn(hostname)) {
                type = 'cdn';
            } else if (this.isAdOrTrackingDomain(hostname)) {
                type = 'ad-tracking';
            } else if (hostname.includes('googleapis.com') || hostname.includes('gstatic.com')) {
                type = 'google-service';
            } else if (hostname.includes('facebook.') || hostname.includes('fb.')) {
                type = 'social-media';
            } else if (hostname.includes('maps.') || hostname.includes('geo.')) {
                type = 'map-service';
            } else if (hostname.includes('payment') || hostname.includes('checkout') || hostname.includes('pay.')) {
                type = 'payment-service';
            }
            
            // 통계 업데이트
            this.results.stats.scriptTypes[type] = (this.results.stats.scriptTypes[type] || 0) + 1;
        }
        
        /**
         * 알려진 취약한 라이브러리 확인
         * @param {string} src - 스크립트 소스 URL
         * @return {Object|null} 취약성 정보 또는 null
         */
        checkVulnerableLibrary(src) {
            for (const libraryPattern of this.libraryPatterns) {
                const match = src.match(libraryPattern.pattern);
                
                if (match) {
                    const libraryName = libraryPattern.name;
                    let version = match[1] || this.extractVersionFromUrl(src);
                    
                    if (!version) {
                        // 버전을 확인할 수 없는 경우 - 취약하다고 가정하지 않음
                        continue;
                    }
                    
                    // 취약한 버전인지 확인
                    for (const vulnLibrary of this.knownVulnerableLibraries) {
                        if (vulnLibrary.name === libraryName) {
                            const isVulnerable = this.isVersionVulnerable(version, vulnLibrary.version);
                            
                            if (isVulnerable) {
                                // 권장 버전 추출
                                const recommendedVersion = vulnLibrary.version.replace('<', '');
                                
                                return {
                                    name: libraryName,
                                    detectedVersion: version,
                                    recommendation: recommendedVersion,
                                    reason: vulnLibrary.reason
                                };
                            }
                        }
                    }
                }
            }
            
            return null;
        }
        
        /**
         * URL에서 버전 추출 시도
         * @param {string} url - 스크립트 URL
         * @return {string|null} 버전 문자열 또는 null
         */
        extractVersionFromUrl(url) {
            // 버전 패턴 (예: v1.2.3, 1.2.3, ver1.2.3 등)
            const versionPatterns = [
                /v(\d+\.\d+\.\d+)/i,
                /(\d+\.\d+\.\d+)/i,
                /ver(\d+\.\d+\.\d+)/i,
                /version(\d+\.\d+\.\d+)/i
            ];
            
            for (const pattern of versionPatterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        }
        
        /**
         * 버전이 취약한지 확인
         * @param {string} version - 확인할 버전
         * @param {string} vulnerableCriteria - 취약한 버전 기준
         * @return {boolean} 취약 여부
         */
        isVersionVulnerable(version, vulnerableCriteria) {
            // 단순화된 버전 비교 (실제 구현에서는 더 정교한 버전 비교 필요)
            if (vulnerableCriteria.startsWith('<')) {
                const minVersion = vulnerableCriteria.substring(1);
                return this.compareVersions(version, minVersion) < 0;
            } else if (vulnerableCriteria.startsWith('<=')) {
                const minVersion = vulnerableCriteria.substring(2);
                return this.compareVersions(version, minVersion) <= 0;
            } else if (vulnerableCriteria.startsWith('>')) {
                const maxVersion = vulnerableCriteria.substring(1);
                return this.compareVersions(version, maxVersion) > 0;
            } else if (vulnerableCriteria.startsWith('>=')) {
                const maxVersion = vulnerableCriteria.substring(2);
                return this.compareVersions(version, maxVersion) >= 0;
            } else {
                // 정확한 버전 매칭
                return version === vulnerableCriteria;
            }
        }
        
        /**
         * 버전 문자열 비교
         * @param {string} v1 - 첫 번째 버전
         * @param {string} v2 - 두 번째 버전
         * @return {number} -1(v1<v2), 0(v1=v2), 1(v1>v2)
         */
        compareVersions(v1, v2) {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            
            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                const part1 = i < parts1.length ? parts1[i] : 0;
                const part2 = i < parts2.length ? parts2[i] : 0;
                
                if (part1 < part2) return -1;
                if (part1 > part2) return 1;
            }
            
            return 0;
        }
        
        /**
         * 일반적인 CDN 도메인인지 확인
         * @param {string} hostname - 호스트 이름
         * @return {boolean} CDN 여부
         */
        isCommonCdn(hostname) {
            return this.commonCdnDomains.some(cdn => hostname.includes(cdn));
        }
        
        /**
         * 광고 또는 추적 도메인인지 확인
         * @param {string} hostname - 호스트 이름
         * @return {boolean} 광고/추적 여부
         */
        isAdOrTrackingDomain(hostname) {
            return this.adAndTrackingDomains.some(domain => hostname.includes(domain));
        }
        
        /**
         * 인라인 스크립트에서 동적 스크립트 로딩 분석
         */
        analyzeDynamicScriptLoading() {
            logger.debug('동적 스크립트 로딩 분석');
            
            const inlineScripts = Array.from(this.doc.querySelectorAll('script:not([src])'));
            
            inlineScripts.forEach((script, index) => {
                const scriptContent = script.textContent;
                
                // 동적 스크립트 생성 패턴 확인
                const dynamicScriptPatterns = [
                    /document\.createElement\(['"]script['"]\)/i,
                    /['"]script['"]\)\.src\s*=/i,
                    /\.appendChild\s*\(\s*script/i,
                    /document\.write\s*\(\s*['"]<script/i
                ];
                
                const hasDynamicScript = dynamicScriptPatterns.some(pattern => pattern.test(scriptContent));
                
                if (hasDynamicScript) {
                    // 동적으로 로드되는 스크립트에서 도메인 추출 시도
                    const domainPattern = /['"]https?:\/\/([^/'"\s]+)/gi;
                    let match;
                    const domains = new Set();
                    
                    while ((match = domainPattern.exec(scriptContent)) !== null) {
                        domains.add(match[1]);
                        this.results.stats.externalScriptDomains.add(match[1]);
                    }
                    
                    // 동적 스크립트 보안 검사
                    if (!this.hasSafetyCheck(scriptContent)) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'unsafe-dynamic-script-loading',
                            'major',
                            '안전하지 않은 동적 스크립트 로딩이 감지되었습니다.',
                            `인라인 스크립트 #${index + 1}이 동적으로 스크립트를 로드하지만 보안 검사가 없습니다.`,
                            script,
                            `동적으로 스크립트를 로드할 때는 무결성 검사 또는 도메인 유효성 검사를 구현하고, 가능한 경우 CSP를 사용하여 스크립트 소스를 제한하세요.`
                        ));
                    }
                    
                    // document.write 사용 확인
                    if (/document\.write\s*\(\s*['"]<script/i.test(scriptContent)) {
                        this.results.issues.push(this.analyzer.createIssue(
                            'document-write-script',
                            'major',
                            'document.write를 사용한 스크립트 삽입이 감지되었습니다.',
                            `인라인 스크립트 #${index + 1}이 document.write를 사용하여 스크립트를 삽입하고 있습니다. 이는 성능 문제와 보안 위험을 초래할 수 있습니다.`,
                            script,
                            `document.write 대신 안전한 DOM API(createElement, appendChild 등)를 사용하여 동적으로 스크립트를 로드하세요.`
                        ));
                    }
                }
            });
        }
        
        /**
         * 스크립트 내용에 보안 검사가 있는지 확인
         * @param {string} scriptContent - 스크립트 내용
         * @return {boolean} 보안 검사 존재 여부
         */
        hasSafetyCheck(scriptContent) {
            // 무결성 검사
            if (/integrity\s*=|\.integrity\s*=/.test(scriptContent)) {
                return true;
            }
            
            // 도메인 유효성 검사
            if (/indexOf\s*\(|\s==\s['"]|\.test\s*\(|allowedDomains|whitelist|allowed/.test(scriptContent)) {
                return true;
            }
            
            // try-catch 블록 (기본적인 에러 처리)
            if (/try\s*{[\s\S]*}\s*catch/.test(scriptContent)) {
                return true;
            }
            
            return false;
        }
        
        /**
         * 스크립트 로딩 보안 관행 분석
         */
        analyzeScriptLoadingSecurity() {
            logger.debug('스크립트 로딩 보안 관행 분석');
            
            // async/defer 속성 확인
            const externalScriptsWithoutAsyncDefer = Array.from(this.doc.querySelectorAll('script[src]'))
                .filter(script => {
                    const src = script.getAttribute('src');
                    try {
                        const url = new URL(src, window.location.href);
                        return url.hostname !== window.location.hostname && 
                               !script.hasAttribute('async') && 
                               !script.hasAttribute('defer');
                    } catch (e) {
                        return false;
                    }
                });
            
            if (externalScriptsWithoutAsyncDefer.length > 0) {
                this.results.issues.push(this.analyzer.createIssue(
                    'scripts-without-async-defer',
                    'minor',
                    'async 또는 defer 속성이 없는 외부 스크립트가 있습니다.',
                    `${externalScriptsWithoutAsyncDefer.length}개의 외부 스크립트가 async 또는 defer 속성 없이 로드되고 있어 페이지 렌더링을 차단할 수 있습니다.`,
                    externalScriptsWithoutAsyncDefer[0],
                    `불필요한 렌더링 차단을 방지하기 위해 외부 스크립트에 async 또는 defer 속성을 추가하세요.`
                ));
            }
            
            // 스크립트 권한 확인
            const scriptsWithPrivilegedTypes = Array.from(this.doc.querySelectorAll('script[src]'))
                .filter(script => {
                    const type = script.getAttribute('type');
                    return type === 'module' || type === 'importmap';
                });
            
            if (scriptsWithPrivilegedTypes.length > 0) {
                const scriptsWithoutIntegrity = scriptsWithPrivilegedTypes.filter(script => 
                    !script.hasAttribute('integrity')
                );
                
                if (scriptsWithoutIntegrity.length > 0) {
                    this.results.issues.push(this.analyzer.createIssue(
                        'privileged-script-without-integrity',
                        'major',
                        '특수 권한 스크립트에 무결성 검사가 없습니다.',
                        `${scriptsWithoutIntegrity.length}개의 module 또는 importmap 타입 스크립트가 무결성 검사 없이 로드되고 있습니다.`,
                        scriptsWithoutIntegrity[0],
                        `모듈 스크립트와 importmap에는 항상 integrity 속성을 추가하여 스크립트 변조를 방지하세요.`
                    ));
                }
            }
            
            // CSP 구현 확인
            const hasCspMeta = this.doc.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
            
            if (!hasCspMeta) {
                this.results.issues.push(this.analyzer.createIssue(
                    'missing-csp-for-scripts',
                    'major',
                    '서드파티 스크립트를 제한하는 CSP가 없습니다.',
                    `외부 스크립트가 ${this.results.stats.externalScripts}개 로드되고 있지만 이를 제한하는 콘텐츠 보안 정책(CSP)이 없습니다.`,
                    null,
                    `script-src 지시문이 포함된 CSP를 구현하여 허용된 스크립트 소스를 제한하세요.`
                ));
            }
        }
        
        /**
         * 클라이언트 측 분석 한계 메시지 추가
         */
        addClientSideLimitationsMessage() {
            this.results.issues.push(this.analyzer.createIssue(
                'third-party-script-scan-limitations',
                'info',
                '서드파티 스크립트 분석의 한계',
                '이 분석은 정적 스크립트 태그만 확인하며, 실행 시간에 동적으로 로드되는 스크립트는 모두 감지하지 못할 수 있습니다.',
                null,
                `완전한 보안 분석을 위해 네트워크 모니터링 도구를 사용하여 페이지가 로드하는 모든 스크립트를 감사하세요.`
            ));
        }
        
        /**
         * 권장 사항 생성
         */
        generateRecommendations() {
            logger.debug('서드파티 스크립트 보안 권장 사항 생성');
            
            const recommendations = [];
            
            // 스크립트 무결성 권장 사항
            if (this.results.stats.externalScripts > 0 && 
                this.results.stats.integrityProtectedScripts < this.results.stats.externalScripts) {
                recommendations.push({
                    title: '서브리소스 무결성(SRI) 구현',
                    description: '서드파티 스크립트 변조를 방지하기 위해 무결성 검사를 구현하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>무결성 해시 추가:</strong> 외부 스크립트에 integrity 및 crossorigin 속성 추가</p>
                                <pre>
                                &lt;script src="https://example.com/script.js"
                                        integrity="sha384-해시값"
                                        crossorigin="anonymous"&gt;&lt;/script&gt;
                                </pre>
                            </li>
                            <li>
                                <p><strong>해시 생성 방법:</strong></p>
                                <pre>
                                # openssl을 사용한 해시 생성
                                openssl dgst -sha384 -binary script.js | openssl base64 -A
                                
                                # 또는 온라인 도구 사용: https://www.srihash.org/
                                </pre>
                            </li>
                            <li>
                                <p><strong>CDN 스크립트 우선:</strong> 대부분의 공용 CDN은 무결성 해시를 제공합니다.</p>
                            </li>
                        </ul>
                    `,
                    priority: 'high'
                });
            }
            
            // CSP 구현 권장 사항
            recommendations.push({
                title: '서드파티 스크립트를 위한 CSP 구현',
                description: '콘텐츠 보안 정책을 사용하여 허용된 스크립트 소스만 로드되도록 제한하세요.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>스크립트 소스 제한:</strong> 신뢰할 수 있는 도메인만 허용</p>
                            <pre>
                            &lt;meta http-equiv="Content-Security-Policy" content="script-src 'self' ${Array.from(this.results.stats.externalScriptDomains).slice(0, 3).join(' ')} 'nonce-랜덤값'"&gt;
                            </pre>
                        </li>
                        <li>
                            <p><strong>CDN 도메인 명시:</strong> 와일드카드 대신 구체적인 CDN 도메인 지정</p>
                        </li>
                        <li>
                            <p><strong>strict-dynamic 고려:</strong> 고급 CSP 구현을 위해 strict-dynamic 사용</p>
                            <pre>
                            script-src 'nonce-랜덤값' 'strict-dynamic';
                            </pre>
                        </li>
                    </ul>
                `,
                priority: 'high'
            });
            
            // 취약한 라이브러리 업데이트 권장 사항
            if (this.results.stats.knownVulnerableLibraries > 0) {
                recommendations.push({
                    title: '취약한 라이브러리 업데이트',
                    description: '알려진 취약점이 있는 외부 라이브러리를 최신 보안 버전으로 업데이트하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>정기적인 업데이트:</strong> 라이브러리를 최신 보안 패치가 적용된 버전으로 유지</p>
                            </li>
                            <li>
                                <p><strong>취약점 모니터링:</strong> npm audit 또는 보안 스캐너를 사용하여 정기적으로 취약점 확인</p>
                            </li>
                            <li>
                                <p><strong>버전 고정:</strong> 라이브러리 버전을 명시적으로 지정하여 예기치 않은 변경 방지</p>
                            </li>
                        </ul>
                    `,
                    priority: 'critical'
                });
            }
            
            // 동적 스크립트 로딩 보안 권장 사항
            recommendations.push({
                title: '안전한 동적 스크립트 로딩',
                description: '런타임에 동적으로 스크립트를 로드할 때 보안 모범 사례를 따르세요.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>도메인 유효성 검사:</strong> 스크립트 URL이 허용된 도메인에서만 로드되도록 확인</p>
                            <pre>
                            function loadScript(url) {
                              // 허용된 도메인 목록
                              const allowedDomains = ['trusted-cdn.com', 'api.example.com'];
                              
                              try {
                                const scriptUrl = new URL(url);
                                if (!allowedDomains.includes(scriptUrl.hostname)) {
                                  console.error('신뢰할 수 없는 도메인:', scriptUrl.hostname);
                                  return false;
                                }
                                
                                const script = document.createElement('script');
                                script.src = url;
                                script.async = true;
                                script.crossOrigin = 'anonymous';
                                document.head.appendChild(script);
                                return true;
                              } catch (error) {
                                console.error('스크립트 로딩 오류:', error);
                                return false;
                              }
                            }
                            </pre>
                        </li>
                        <li>
                            <p><strong>document.write 사용 금지:</strong> 성능과 보안 문제로 document.write 지양</p>
                        </li>
                        <li>
                            <p><strong>에러 처리:</strong> 스크립트 로딩 실패 시 적절한 오류 처리 구현</p>
                        </li>
                    </ul>
                `,
                priority: 'high'
            });
            
            // 스크립트 권한 관리 권장 사항
            recommendations.push({
                title: '서드파티 스크립트 권한 관리',
                description: '서드파티 스크립트가 접근할 수 있는 권한을 제한하여 잠재적 위험을 최소화하세요.',
                implementation: `
                    <ul>
                        <li>
                            <p><strong>Feature-Policy/Permissions-Policy 사용:</strong> 스크립트의 기능 접근 제한</p>
                            <pre>
                            &lt;meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()"&gt;
                            </pre>
                        </li>
                        <li>
                            <p><strong>iframe으로 격리:</strong> 중요한 기능에 접근할 필요가 있는 서드파티 스크립트는 sandbox 속성을 가진 iframe에 격리</p>
                            <pre>
                            &lt;iframe src="third-party-widget.html" sandbox="allow-scripts" title="Third-party widget"&gt;&lt;/iframe&gt;
                            </pre>
                        </li>
                        <li>
                            <p><strong>필요한 최소 권한만 부여:</strong> 서드파티 서비스 통합 시 필요한 최소 권한만 허용</p>
                        </li>
                    </ul>
                `,
                priority: 'medium'
            });
            
            // 광고 및 추적 스크립트 관리 권장 사항
            if (this.results.stats.scriptTypes['ad-tracking'] > 0) {
                recommendations.push({
                    title: '광고 및 추적 스크립트 관리',
                    description: '광고 및 사용자 추적 스크립트가 사용자 개인정보를 보호하고 사이트 보안을 저해하지 않도록 관리하세요.',
                    implementation: `
                        <ul>
                            <li>
                                <p><strong>사용자 동의 구현:</strong> 쿠키 동의 배너 및 추적 옵트아웃 옵션 제공</p>
                            </li>
                            <li>
                                <p><strong>비필수 스크립트 지연 로딩:</strong> 핵심 기능이 아닌 스크립트는 페이지 로드 후 지연 로딩</p>
                            </li>
                            <li>
                                <p><strong>데이터 최소화:</strong> 서드파티와 공유하는 사용자 데이터 최소화</p>
                            </li>
                            <li>
                                <p><strong>제한된 도메인 쿠키:</strong> 서드파티 쿠키는 제한된 도메인과 경로만 접근하도록 설정</p>
                            </li>
                        </ul>
                    `,
                    priority: 'medium'
                });
            }
            
            this.results.recommendations = recommendations;
        }
        
        /**
         * 최종 점수 계산
         */
        calculateScore() {
            logger.debug('서드파티 스크립트 보안 점수 계산');
            
            // 기본 점수
            let score = 100;
            
            // 기본 감점 요소
            
            // 1. 안전하지 않은 프로토콜 (HTTP) 사용
            if (this.results.stats.unsecureScripts > 0) {
                score -= Math.min(40, this.results.stats.unsecureScripts * 10);
            }
            
            // 2. 무결성 검사 없는 CDN 스크립트
            if (this.results.stats.externalScripts > 0) {
                const cdnScriptsWithoutIntegrity = this.results.stats.externalScripts - this.results.stats.integrityProtectedScripts;
                
                if (cdnScriptsWithoutIntegrity > 0) {
                    score -= Math.min(30, cdnScriptsWithoutIntegrity * 5);
                }
            }
            
            // 3. 취약한 라이브러리 사용
            score -= Math.min(40, this.results.stats.knownVulnerableLibraries * 15);
            
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
         * 서드파티 스크립트 분석 수행
         * @param {Document} document - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(document) {
            const analyzer = new ThirdPartyScriptAnalyzer(document);
            return analyzer.analyze();
        }
    };
})();