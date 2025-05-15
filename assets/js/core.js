/**
 * 한국어 웹사이트 분석기 코어 모듈
 * 
 * 북마클릿의 핵심 기능을 제공하는 코어 모듈입니다.
 * 모듈 로딩, 분석 엔진 초기화, 이벤트 처리 등을 담당합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    // 버전 정보
    window.KoreanWebAnalyzer.version = '0.1.0';
    
    // 콘텍스트 객체 (분석 데이터 저장)
    window.KoreanWebAnalyzer.context = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        timestamp: new Date().toISOString()
    };
    
    // 설정
    window.KoreanWebAnalyzer.config = {
        debug: true,
        apiEndpoint: 'https://your-domain.com/api',
        autoInit: true,
        modules: {
            seo: true,
            standards: true,
            accessibility: true,
            performance: true,
            mobile: true,
            security: true,
            social: true,  // 소셜 미디어 최적화 모듈
            i18n: true,    // 국제화 및 지역화 모듈
            webVitals: true // Core Web Vitals 모듈
        }
    };
    
    // 모듈 레지스트리
    window.KoreanWebAnalyzer.modules = {};
    
    // 분석 결과
    window.KoreanWebAnalyzer.results = {};
    
    // 코어 객체
    window.KoreanWebAnalyzer.core = {
        /**
         * 초기화
         * @param {Object} [options] - 초기화 옵션
         */
        init: function(options) {
            // 로거 초기화
            if (!window.KoreanWebAnalyzer.logger) {
                this.initLogger();
            }
            
            const logger = window.KoreanWebAnalyzer.logger;
            logger.info('코어 모듈 초기화 중...');
            
            // 옵션 적용
            if (options) {
                this.applyOptions(options);
            }
            
            try {
                // 유틸리티 모듈 초기화
                this.initUtils();
                
                // 모듈 등록
                this.registerModules();
                
                // UI 초기화
                this.initUI();
                
                // 분석 실행
                if (window.KoreanWebAnalyzer.config.autoInit) {
                    this.startAnalysis();
                }
                
                logger.info('코어 모듈 초기화 완료');
            } catch (err) {
                logger.error('초기화 중 오류 발생', {
                    error: err.message,
                    stack: err.stack
                });
                
                // 오류 메시지 표시
                if (window.KoreanWebAnalyzer.ui && window.KoreanWebAnalyzer.ui.overlay) {
                    window.KoreanWebAnalyzer.ui.overlay.showError(
                        '초기화 중 오류가 발생했습니다: ' + err.message
                    );
                } else {
                    alert('한국어 웹사이트 분석기 초기화 중 오류가 발생했습니다: ' + err.message);
                }
            }
        },
        
        /**
         * 초기화 옵션 적용
         * @param {Object} options - 옵션 객체
         */
        applyOptions: function(options) {
            const config = window.KoreanWebAnalyzer.config;
            
            // 옵션을 설정에 병합
            for (const key in options) {
                if (options.hasOwnProperty(key)) {
                    if (typeof options[key] === 'object' && options[key] !== null && typeof config[key] === 'object') {
                        // 중첩 객체 병합
                        for (const subKey in options[key]) {
                            if (options[key].hasOwnProperty(subKey)) {
                                config[key][subKey] = options[key][subKey];
                            }
                        }
                    } else {
                        // 일반 값 할당
                        config[key] = options[key];
                    }
                }
            }
        },
        
        /**
         * 로거 초기화
         */
        initLogger: function() {
            window.KoreanWebAnalyzer.logger = {
                /**
                 * 로그 메시지 작성
                 * @param {string} level - 로그 레벨 (info, warn, error, debug)
                 * @param {string} message - 로그 메시지
                 * @param {Object} [data] - 추가 데이터 (옵션)
                 */
                log: function(level, message, data) {
                    const config = window.KoreanWebAnalyzer.config || {};
                    
                    // debug 모드가 아닐 때 debug 로그는 무시
                    if (level === 'debug' && !config.debug) {
                        return;
                    }
                    
                    // 로그 데이터 구성
                    const logData = {
                        timestamp: new Date().toISOString(),
                        level: level,
                        message: message,
                        data: data || {}
                    };
                    
                    // 콘솔 출력
                    if (level === 'error') {
                        console.error(`[KoreanWebAnalyzer] ${message}`, data || '');
                    } else if (level === 'warn') {
                        console.warn(`[KoreanWebAnalyzer] ${message}`, data || '');
                    } else if (level === 'info') {
                        console.info(`[KoreanWebAnalyzer] ${message}`, data || '');
                    } else {
                        console.debug(`[KoreanWebAnalyzer] ${message}`, data || '');
                    }
                    
                    // 로그 히스토리 저장 (최대 100개)
                    if (!this.history) this.history = [];
                    this.history.push(logData);
                    if (this.history.length > 100) this.history.shift();
                    
                    return logData;
                },
                
                /**
                 * 정보 로그
                 * @param {string} message - 로그 메시지
                 * @param {Object} [data] - 추가 데이터
                 */
                info: function(message, data) {
                    return this.log('info', message, data);
                },
                
                /**
                 * 경고 로그
                 * @param {string} message - 로그 메시지
                 * @param {Object} [data] - 추가 데이터
                 */
                warn: function(message, data) {
                    return this.log('warn', message, data);
                },
                
                /**
                 * 오류 로그
                 * @param {string} message - 로그 메시지
                 * @param {Object} [data] - 추가 데이터
                 */
                error: function(message, data) {
                    return this.log('error', message, data);
                },
                
                /**
                 * 디버그 로그
                 * @param {string} message - 로그 메시지
                 * @param {Object} [data] - 추가 데이터
                 */
                debug: function(message, data) {
                    return this.log('debug', message, data);
                }
            };
        },
        
        /**
         * 유틸리티 모듈 초기화
         */
        initUtils: function() {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.debug('유틸리티 모듈 초기화 중...');
            
            // 네임스페이스 확인
            if (!window.KoreanWebAnalyzer.utils) {
                window.KoreanWebAnalyzer.utils = {};
            }
            
            // 이벤트 유틸리티
            window.KoreanWebAnalyzer.utils.events = {
                listeners: {},
                
                /**
                 * 이벤트 리스너 등록
                 * @param {string} event - 이벤트 이름
                 * @param {Function} callback - 콜백 함수
                 */
                on: function(event, callback) {
                    if (!this.listeners[event]) {
                        this.listeners[event] = [];
                    }
                    this.listeners[event].push(callback);
                },
                
                /**
                 * 이벤트 리스너 제거
                 * @param {string} event - 이벤트 이름
                 * @param {Function} callback - 콜백 함수
                 */
                off: function(event, callback) {
                    if (!this.listeners[event]) return;
                    
                    const index = this.listeners[event].indexOf(callback);
                    if (index !== -1) {
                        this.listeners[event].splice(index, 1);
                    }
                },
                
                /**
                 * 이벤트 발생
                 * @param {string} event - 이벤트 이름
                 * @param {Object} [data] - 이벤트 데이터
                 */
                emit: function(event, data) {
                    if (!this.listeners[event]) return;
                    
                    this.listeners[event].forEach(callback => {
                        try {
                            callback(data);
                        } catch (err) {
                            console.error(`이벤트 핸들러 실행 중 오류 발생: ${err.message}`);
                        }
                    });
                }
            };
            
            // DOM 옵저버 유틸리티
            window.KoreanWebAnalyzer.utils.domObserver = {
                observer: null,
                
                /**
                 * DOM 변경 감시 시작
                 * @param {Function} callback - 변경 감지 시 호출될 콜백 함수
                 * @param {Object} [options] - MutationObserver 옵션
                 */
                observe: function(callback, options) {
                    // 기존 옵저버 정리
                    this.disconnect();
                    
                    // 기본 옵션
                    const defaultOptions = {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    };
                    
                    // 옵션 병합
                    const observerOptions = Object.assign({}, defaultOptions, options || {});
                    
                    // 옵저버 생성 및 시작
                    this.observer = new MutationObserver(mutations => {
                        callback(mutations);
                    });
                    
                    this.observer.observe(document.body, observerOptions);
                    
                    return this.observer;
                },
                
                /**
                 * DOM 변경 감시 중단
                 */
                disconnect: function() {
                    if (this.observer) {
                        this.observer.disconnect();
                        this.observer = null;
                    }
                }
            };
            
            // 네트워크 유틸리티
            window.KoreanWebAnalyzer.utils.network = {
                /**
                 * API 요청 전송
                 * @param {string} endpoint - 엔드포인트 경로
                 * @param {Object} [data] - 전송할 데이터
                 * @param {Object} [options] - 요청 옵션
                 * @return {Promise} 응답 프로미스
                 */
                request: function(endpoint, data, options) {
                    const config = window.KoreanWebAnalyzer.config;
                    const baseUrl = config.apiEndpoint || 'https://your-domain.com/api';
                    
                    // 기본 옵션
                    const defaultOptions = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: data ? JSON.stringify(data) : undefined
                    };
                    
                    // 옵션 병합
                    const requestOptions = Object.assign({}, defaultOptions, options || {});
                    
                    // URL 구성
                    const url = baseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
                    
                    // 요청 전송
                    return fetch(url, requestOptions)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                            }
                            return response.json();
                        });
                }
            };
            
            logger.debug('유틸리티 모듈 초기화 완료');
        },
        
        /**
         * 모듈 등록
         */
        registerModules: function() {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.debug('모듈 등록 중...');
            
            // 활성화된 모듈 로드
            const config = window.KoreanWebAnalyzer.config;
            const modules = window.KoreanWebAnalyzer.modules;
            
            // SEO 모듈
            if (config.modules.seo) {
                modules.seo = {
                    /**
                     * SEO 분석 수행
                     * @return {Promise} 분석 결과 프로미스
                     */
                    analyze: function() {
                        logger.debug('SEO 분석 중...');
                        
                        // 분석 영역 초기화
                        const results = {
                            score: 0,
                            metaTags: { score: 0, issues: [] },
                            heading: { score: 0, issues: [] },
                            content: { score: 0, issues: [] },
                            links: { score: 0, issues: [] },
                            images: { score: 0, issues: [] },
                            social: { score: 0, issues: [] },
                            structured: { score: 0, issues: [] }
                        };
                        
                        // 여기에 실제 SEO 분석 로직 구현
                        // 실제 구현에서는 분석 결과를 반환해야 함
                        
                        // 임시 데모 코드 (실제로는 HTML 파싱 및 분석)
                        setTimeout(() => {
                            // 메타 태그 분석
                            results.metaTags.score = 75;
                            
                            // 제목 길이 검사
                            const title = document.title;
                            if (title.length < 10 || title.length > 70) {
                                results.metaTags.issues.push({
                                    type: 'title-length',
                                    severity: 'warning',
                                    message: '제목 길이가 최적이 아닙니다.',
                                    details: `현재 제목 길이: ${title.length}자 (권장: 10-70자)`,
                                    element: document.querySelector('title')
                                });
                            }
                            
                            // 메타 설명 검사
                            const metaDescription = document.querySelector('meta[name="description"]');
                            if (!metaDescription) {
                                results.metaTags.issues.push({
                                    type: 'missing-description',
                                    severity: 'error',
                                    message: '메타 설명(meta description)이 없습니다.',
                                    details: '검색 엔진 최적화를 위해 메타 설명을 추가하세요.',
                                    element: document.head
                                });
                            }
                            
                            // 전체 점수 계산 (실제로는 더 복잡한 계산식 사용)
                            results.score = 75;
                            
                            // 이벤트 발생
                            window.KoreanWebAnalyzer.utils.events.emit('seo:analyzed', results);
                            
                            logger.debug('SEO 분석 완료', results);
                        }, 500);
                        
                        // 프로미스 반환
                        return new Promise((resolve) => {
                            setTimeout(() => resolve(results), 500);
                        });
                    }
                };
            }
            
            // 웹표준 모듈
            if (config.modules.standards) {
                modules.standards = {
                    /**
                     * 웹표준 분석 수행
                     * @return {Promise} 분석 결과 프로미스
                     */
                    analyze: function() {
                        logger.debug('웹표준 분석 중...');
                        
                        // 분석 영역 초기화
                        const results = {
                            score: 0,
                            htmlValidity: { score: 0, issues: [] },
                            semanticMarkup: { score: 0, issues: [] },
                            deprecated: { score: 0, issues: [] },
                            docStructure: { score: 0, issues: [] }
                        };
                        
                        // 예제 코드 (실제로는 웹표준 검사 서비스 연동 또는 로컬 검사)
                        setTimeout(() => {
                            // HTML 유효성 검사 예시
                            const html = document.documentElement.outerHTML;
                            
                            // 간단한 검사 (실제로는 W3C 유효성 검사 등 사용)
                            if (!document.doctype) {
                                results.htmlValidity.issues.push({
                                    type: 'missing-doctype',
                                    severity: 'error',
                                    message: 'DOCTYPE 선언이 없습니다.',
                                    details: 'HTML5 문서는 DOCTYPE 선언으로 시작해야 합니다.',
                                    element: document.documentElement
                                });
                            }
                            // 시맨틱 태그 사용 분석
                            function checkSemanticMarkup(doc, results) {
                                const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
                                let found = 0;
                                semanticTags.forEach(tag => {
                                    if (doc.querySelector(tag)) found++;
                                    else results.semanticMarkup.issues.push({
                                        type: 'missing-semantic',
                                        severity: 'warning',
                                        message: `<${tag}> 태그가 없습니다.`,
                                        details: `문서에 <${tag}> 시맨틱 태그가 존재하지 않습니다.`
                                    });
                                });
                                // 점수: 시맨틱 태그 5개 이상 있으면 만점, 없을수록 감점
                                results.semanticMarkup.score = Math.round((found / semanticTags.length) * 100);
                            }
                            // 폐기(deprecated) 요소/속성 탐지
                            function checkDeprecatedElements(doc, results) {
                                const deprecatedTags = ['font', 'center', 'marquee', 'bgsound', 'applet', 'basefont', 'big', 'blink', 'dir', 'frame', 'frameset', 'noframes', 'strike', 'tt'];
                                const deprecatedAttrs = ['align', 'bgcolor', 'border', 'color', 'height', 'hspace', 'vspace', 'width'];
                                let found = 0;
                                deprecatedTags.forEach(tag => {
                                    const els = doc.getElementsByTagName(tag);
                                    if (els.length > 0) {
                                        found += els.length;
                                        results.deprecated.issues.push({
                                            type: 'deprecated-tag',
                                            severity: 'error',
                                            message: `<${tag}> 태그는 더 이상 사용되지 않습니다.`,
                                            details: `${els.length}개 발견됨.`
                                        });
                                    }
                                });
                                deprecatedAttrs.forEach(attr => {
                                    const els = doc.querySelectorAll(`[${attr}]`);
                                    if (els.length > 0) {
                                        found += els.length;
                                        results.deprecated.issues.push({
                                            type: 'deprecated-attr',
                                            severity: 'warning',
                                            message: `${attr} 속성은 더 이상 사용되지 않습니다.`,
                                            details: `${els.length}개 발견됨.`
                                        });
                                    }
                                });
                                // 점수: deprecated 요소/속성 없으면 만점, 많을수록 감점
                                results.deprecated.score = Math.max(0, 100 - found * 10);
                            }
                            // 구조적 마크업/중첩 오류(간단)
                            function checkStructure(doc, results) {
                                // h1이 여러 개 있는지, main이 중첩되는지 등 간단 체크
                                const h1s = doc.querySelectorAll('h1');
                                if (h1s.length > 1) {
                                    results.docStructure.issues.push({
                                        type: 'multiple-h1',
                                        severity: 'warning',
                                        message: 'h1 태그가 여러 개 있습니다.',
                                        details: `${h1s.length}개 발견됨.`
                                    });
                                }
                                const mains = doc.querySelectorAll('main');
                                if (mains.length > 1) {
                                    results.docStructure.issues.push({
                                        type: 'multiple-main',
                                        severity: 'warning',
                                        message: 'main 태그가 여러 개 있습니다.',
                                        details: `${mains.length}개 발견됨.`
                                    });
                                }
                                // 점수: 이슈 없으면 만점, 있을수록 감점
                                const issueCount = results.docStructure.issues.length;
                                results.docStructure.score = Math.max(0, 100 - issueCount * 20);
                            }
                            // 실제 분석 함수 호출
                            checkSemanticMarkup(document, results);
                            checkDeprecatedElements(document, results);
                            checkStructure(document, results);
                            // 전체 점수 계산 (간단 평균)
                            const scores = [results.htmlValidity.score, results.semanticMarkup.score, results.deprecated.score, results.docStructure.score];
                            results.score = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
                            // 이벤트 발생
                            window.KoreanWebAnalyzer.utils.events.emit('standards:analyzed', results);
                            logger.debug('웹표준 분석 완료', results);
                        }, 500);
                        
                        // 프로미스 반환
                        return new Promise((resolve) => {
                            setTimeout(() => resolve(results), 500);
                        });
                    }
                };
            }
            
            // 웹접근성 모듈
            if (config.modules.accessibility) {
                modules.accessibility = {
                    /**
                     * 웹접근성 분석 수행
                     * @return {Promise} 분석 결과 프로미스
                     */
                    analyze: function() {
                        logger.debug('웹접근성 분석 중...');
                        
                        // 분석 영역 초기화
                        const results = {
                            score: 0,
                            altText: { score: 0, issues: [] },
                            keyboard: { score: 0, issues: [] },
                            contrast: { score: 0, issues: [] },
                            aria: { score: 0, issues: [] }
                        };
                        
                        // 예제 코드
                        setTimeout(() => {
                            // 대체 텍스트 검사
                            const images = document.querySelectorAll('img');
                            let imagesWithoutAlt = 0;
                            
                            images.forEach(img => {
                                if (!img.hasAttribute('alt')) {
                                    imagesWithoutAlt++;
                                    results.altText.issues.push({
                                        type: 'missing-alt',
                                        severity: 'error',
                                        message: '이미지에 대체 텍스트가 없습니다.',
                                        details: `이미지 URL: ${img.src}`,
                                        element: img
                                    });
                                }
                            });
                            
                            // 점수 계산
                            if (images.length > 0) {
                                results.altText.score = 100 - (imagesWithoutAlt / images.length * 100);
                            } else {
                                results.altText.score = 100;
                            }
                            
                            // 키보드 접근성 검사 추가
                            checkKeyboardAccessibility(document, results);
                            // ARIA 속성 검사 추가
                            checkAriaAttributes(document, results);
                            // 폼 접근성 검사 추가
                            checkFormAccessibility(document, results);
                            
                            // 전체 점수 (실제로는 더 복잡한 계산식)
                            results.score = 85;
                            
                            // 이벤트 발생
                            window.KoreanWebAnalyzer.utils.events.emit('accessibility:analyzed', results);
                            
                            logger.debug('웹접근성 분석 완료', results);
                        }, 500);
                        
                        // 프로미스 반환
                        return new Promise((resolve) => {
                            setTimeout(() => resolve(results), 500);
                        });
                    }
                };
            }
            
            // 성능 모듈 (기본 구현)
            if (config.modules.performance) {
                modules.performance = {
                    analyze: function() {
                        logger.debug('성능 분석 중...');
                        
                        // 기본 결과 객체
                        const results = {
                            score: 85,
                            loadTime: { score: 80, issues: [] },
                            resources: { score: 90, issues: [] }
                        };
                        
                        // 이벤트 발생
                        window.KoreanWebAnalyzer.utils.events.emit('performance:analyzed', results);
                        
                        // 프로미스 반환
                        return Promise.resolve(results);
                    }
                };
            }
            
            // 모바일 모듈 (기본 구현)
            if (config.modules.mobile) {
                modules.mobile = {
                    analyze: function() {
                        logger.debug('모바일 친화성 분석 중...');
                        
                        // 기본 결과 객체
                        const results = {
                            score: 70,
                            viewport: { score: 100, issues: [] },
                            touchTargets: { score: 60, issues: [] }
                        };
                        
                        // 이벤트 발생
                        window.KoreanWebAnalyzer.utils.events.emit('mobile:analyzed', results);
                        
                        // 프로미스 반환
                        return Promise.resolve(results);
                    }
                };
            }
            
            // 보안 모듈 (기본 구현)
            if (config.modules.security) {
                modules.security = {
                    analyze: function() {
                        logger.debug('보안 분석 중...');
                        
                        // 기본 결과 객체
                        const results = {
                            score: 75,
                            https: { score: 100, issues: [] },
                            contentSecurity: { score: 50, issues: [] }
                        };
                        
                        // 이벤트 발생
                        window.KoreanWebAnalyzer.utils.events.emit('security:analyzed', results);
                        
                        // 프로미스 반환
                        return Promise.resolve(results);
                    }
                };
            }
            
            // 소셜 미디어 모듈
            if (config.modules.social) {
                modules.social = {
                    analyze: function() {
                        logger.debug('소셜 미디어 분석 중...');
                        
                        // 분석 영역 초기화
                        const results = {
                            score: 0,
                            openGraph: { score: 0, issues: [] },
                            twitterCards: { score: 0, issues: [] },
                            imageVerification: { score: 0, issues: [] },
                            sharingFunctionality: { score: 0, issues: [] }
                        };
                        
                        // 실제 분석 로직 호출
                        if (window.KoreanWebAnalyzer.analyzer && 
                            window.KoreanWebAnalyzer.analyzer.social &&
                            typeof window.KoreanWebAnalyzer.analyzer.social.analyze === 'function') {
                            
                            return window.KoreanWebAnalyzer.analyzer.social.analyze()
                                .then(socialResults => {
                                    return socialResults;
                                });
                        }
                        
                        // 이벤트 발생
                        window.KoreanWebAnalyzer.utils.events.emit('social:analyzed', results);
                        
                        // 프로미스 반환
                        return Promise.resolve(results);
                    }
                };
            }
            
            // 국제화/지역화 모듈
            if (config.modules.i18n) {
                modules.i18n = {
                    analyze: function() {
                        logger.debug('국제화/지역화 분석 중...');
                        
                        // 분석 영역 초기화
                        const results = {
                            score: 0,
                            language: { score: 0, issues: [] },
                            encoding: { score: 0, issues: [] },
                            localization: { score: 0, issues: [] },
                            multilanguage: { score: 0, issues: [] },
                            issues: [],
                            recommendations: []
                        };
                        
                        // 실제 분석 로직 호출
                        if (window.KoreanWebAnalyzer.analyzer && 
                            window.KoreanWebAnalyzer.analyzer.i18n &&
                            typeof window.KoreanWebAnalyzer.analyzer.i18n.analyze === 'function') {
                            
                            return window.KoreanWebAnalyzer.analyzer.i18n.analyze(true) // bookmarklet 모드로 실행
                                .then(i18nResults => {
                                    return i18nResults;
                                });
                        }
                        
                        // 이벤트 발생
                        window.KoreanWebAnalyzer.utils.events.emit('i18n:analyzed', results);
                        
                        // 프로미스 반환
                        return Promise.resolve(results);
                    }
                };
            }
            
            logger.debug('모듈 등록 완료');
        },
        
        /**
         * UI 초기화
         */
        initUI: function() {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.debug('UI 초기화 중...');
            
            // UI 네임스페이스 확인
            if (!window.KoreanWebAnalyzer.ui) {
                window.KoreanWebAnalyzer.ui = {};
            }
            
            // 오버레이 UI 초기화
            if (window.KoreanWebAnalyzer.ui.overlay && typeof window.KoreanWebAnalyzer.ui.overlay.init === 'function') {
                window.KoreanWebAnalyzer.ui.overlay.init();
            } else {
                logger.warn('오버레이 UI 모듈이 로드되지 않았습니다.');
                
                // 간단한 오버레이 생성 (UI 모듈이 없을 경우)
                const overlay = document.createElement('div');
                overlay.id = 'korean-web-analyzer-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '20px';
                overlay.style.right = '20px';
                overlay.style.padding = '15px';
                overlay.style.backgroundColor = '#fff';
                overlay.style.border = '1px solid #ddd';
                overlay.style.borderRadius = '5px';
                overlay.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                overlay.style.zIndex = '9999999';
                overlay.style.maxWidth = '400px';
                
                overlay.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 16px;">한국어 웹사이트 분석기</h3>
                        <button id="korean-web-analyzer-close" style="border: none; background: none; cursor: pointer; font-size: 18px;">&times;</button>
                    </div>
                    <div id="korean-web-analyzer-content">
                        <p>페이지 분석 중...</p>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                
                // 닫기 버튼 이벤트
                document.getElementById('korean-web-analyzer-close').addEventListener('click', function() {
                    overlay.remove();
                });
                
                // 간단한 UI 인터페이스 제공
                window.KoreanWebAnalyzer.ui.overlay = {
                    showResults: function(results) {
                        const content = document.getElementById('korean-web-analyzer-content');
                        if (content) {
                            content.innerHTML = `
                                <p>분석 완료!</p>
                                <p>종합 점수: ${Math.round((
                                    results.seo.score + 
                                    results.standards.score + 
                                    results.accessibility.score +
                                    results.performance.score +
                                    results.mobile.score +
                                    results.security.score +
                                    (results.social ? results.social.score : 0) +
                                    (results.i18n ? results.i18n.score : 0)
                                ) / ((results.social ? 1 : 0) + (results.i18n ? 1 : 0) + 6))}/100</p>
                                <p>SEO: ${results.seo.score}/100</p>
                                <p>웹표준: ${results.standards.score}/100</p>
                                <p>웹접근성: ${results.accessibility.score}/100</p>
                                <p>성능: ${results.performance.score}/100</p>
                                <p>모바일: ${results.mobile.score}/100</p>
                                <p>보안: ${results.security.score}/100</p>
                                <p>소셜 미디어: ${results.social ? results.social.score : 0}/100</p>
                                <p>국제화/지역화: ${results.i18n ? results.i18n.score : 0}/100</p>
                            `;
                        }
                    },
                    
                    showError: function(message) {
                        const content = document.getElementById('korean-web-analyzer-content');
                        if (content) {
                            content.innerHTML = `
                                <div style="color: #721c24; background-color: #f8d7da; padding: 10px; border-radius: 4px;">
                                    <strong>오류 발생!</strong>
                                    <p>${message}</p>
                                </div>
                            `;
                        }
                    }
                };
            }
            
            logger.debug('UI 초기화 완료');
        },
        
        /**
         * 분석 시작
         */
        startAnalysis: function() {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.info('페이지 분석 시작');
            
            // UI 로딩 상태 표시
            if (window.KoreanWebAnalyzer.ui.overlay && window.KoreanWebAnalyzer.ui.overlay.showLoading) {
                window.KoreanWebAnalyzer.ui.overlay.showLoading();
            }
            
            // 모듈 목록
            const modules = window.KoreanWebAnalyzer.modules;
            const results = window.KoreanWebAnalyzer.results;
            
            // 모듈 로더 참조
            let moduleLoader = window.KoreanWebAnalyzer.utils.moduleLoader;
            
            // 기본 결과 객체 초기화
            const initResults = {
                seo: { score: 0, issues: [] },
                standards: { score: 0, issues: [] },
                accessibility: { score: 0, issues: [] },
                performance: { score: 0, issues: [] },
                mobile: { score: 0, issues: [] },
                security: { score: 0, issues: [] },
                social: { score: 0, issues: [] }
            };
            
            // 결과 객체에 기본값 적용
            Object.assign(results, initResults);
            
            // 필요한 모듈 확인
            const config = window.KoreanWebAnalyzer.config;
            const neededModules = [];
            
            // 활성화된 모듈 확인
            if (config.modules.seo) neededModules.push('analyzer/seo');
            if (config.modules.standards) neededModules.push('analyzer/standards');
            if (config.modules.accessibility) neededModules.push('analyzer/accessibility');
            if (config.modules.performance) neededModules.push('analyzer/performance');
            if (config.modules.mobile) neededModules.push('analyzer/mobile');
            if (config.modules.security) neededModules.push('analyzer/security');
            if (config.modules.social) neededModules.push('analyzer/social');
            if (config.modules.i18n) neededModules.push('analyzer/i18n');
            
            // Core Web Vitals 컴포넌트 로드
            if (config.modules.webVitals) {
                neededModules.push('analyzer/web-vitals/metrics-collector');
                neededModules.push('analyzer/web-vitals/element-analyzer');
                neededModules.push('analyzer/web-vitals/recommendation-engine');
                neededModules.push('analyzer/web-vitals/special-cases');
                neededModules.push('analyzer/web-vitals');
                neededModules.push('analyzer/performance/web-vitals-integration');
            }
            
            // 모듈 로더가 없는 경우, 기존 방식으로 분석
            if (!moduleLoader) {
                this.runAnalysisWithoutLoader();
                return;
            }
            
            // 필요한 모듈 로드 및 분석 실행
            logger.debug('분석을 위한 모듈 로드 중...');
            
            // 모듈 로더가 있는 경우, 필요한 모듈을 동적으로 로드하여 분석
            moduleLoader.loadModules(neededModules)
                .then(() => {
                    logger.debug('분석 모듈 로드 완료, 분석 시작');
                    
                    // 분석 작업 배열
                    const analysisTasks = [];
                    
                    // 각 모듈의 분석 함수 실행
                    
                    // SEO 분석
                    if (config.modules.seo && modules.seo && typeof modules.seo.analyze === 'function') {
                        analysisTasks.push(
                            modules.seo.analyze().then(moduleResults => {
                                results.seo = moduleResults;
                            })
                        );
                    }
                    
                    // 웹표준 분석
                    if (config.modules.standards && modules.standards && typeof modules.standards.analyze === 'function') {
                        analysisTasks.push(
                            modules.standards.analyze().then(moduleResults => {
                                results.standards = moduleResults;
                            })
                        );
                    }
                    
                    // 웹접근성 분석
                    if (config.modules.accessibility && modules.accessibility && typeof modules.accessibility.analyze === 'function') {
                        analysisTasks.push(
                            modules.accessibility.analyze().then(moduleResults => {
                                results.accessibility = moduleResults;
                            })
                        );
                    }
                    
                    // 성능 분석
                    if (config.modules.performance && modules.performance && typeof modules.performance.analyze === 'function') {
                        analysisTasks.push(
                            modules.performance.analyze().then(moduleResults => {
                                results.performance = moduleResults;
                            })
                        );
                    }
                    
                    // 모바일 분석
                    if (config.modules.mobile && modules.mobile && typeof modules.mobile.analyze === 'function') {
                        analysisTasks.push(
                            modules.mobile.analyze().then(moduleResults => {
                                results.mobile = moduleResults;
                            })
                        );
                    }
                    
                    // 보안 분석
                    if (config.modules.security && modules.security && typeof modules.security.analyze === 'function') {
                        analysisTasks.push(
                            modules.security.analyze().then(moduleResults => {
                                results.security = moduleResults;
                            })
                        );
                    }
                    
                    // 소셜 미디어 분석
                    if (config.modules.social && modules.social && typeof modules.social.analyze === 'function') {
                        analysisTasks.push(
                            modules.social.analyze().then(moduleResults => {
                                results.social = moduleResults;
                            })
                        );
                    }
                    
                    // 국제화/지역화 분석
                    if (config.modules.i18n && modules.i18n && typeof modules.i18n.analyze === 'function') {
                        analysisTasks.push(
                            modules.i18n.analyze().then(moduleResults => {
                                results.i18n = moduleResults;
                            })
                        );
                    }
                    
                    // 모든 분석 완료 후 결과 처리
                    this.finalizeAnalysis(analysisTasks);
                })
                .catch(err => {
                    logger.error('분석 모듈 로드 실패', err);
                    
                    // 기존 방식으로 분석 시도
                    this.runAnalysisWithoutLoader();
                });
        },
        
        /**
         * 모듈 로더 없이 분석 수행
         */
        runAnalysisWithoutLoader: function() {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.debug('기본 분석 방식으로 실행');
            
            // 모듈 목록
            const modules = window.KoreanWebAnalyzer.modules;
            const results = window.KoreanWebAnalyzer.results;
            
            // 분석 작업 배열
            const analysisTasks = [];
            
            // SEO 분석
            if (modules.seo && typeof modules.seo.analyze === 'function') {
                analysisTasks.push(
                    modules.seo.analyze().then(moduleResults => {
                        results.seo = moduleResults;
                    })
                );
            }
            
            // 웹표준 분석
            if (modules.standards && typeof modules.standards.analyze === 'function') {
                analysisTasks.push(
                    modules.standards.analyze().then(moduleResults => {
                        results.standards = moduleResults;
                    })
                );
            }
            
            // 웹접근성 분석
            if (modules.accessibility && typeof modules.accessibility.analyze === 'function') {
                analysisTasks.push(
                    modules.accessibility.analyze().then(moduleResults => {
                        results.accessibility = moduleResults;
                    })
                );
            }
            
            // 성능 분석
            if (modules.performance && typeof modules.performance.analyze === 'function') {
                analysisTasks.push(
                    modules.performance.analyze().then(moduleResults => {
                        results.performance = moduleResults;
                    })
                );
            }
            
            // 모바일 분석
            if (modules.mobile && typeof modules.mobile.analyze === 'function') {
                analysisTasks.push(
                    modules.mobile.analyze().then(moduleResults => {
                        results.mobile = moduleResults;
                    })
                );
            }
            
            // 보안 분석
            if (modules.security && typeof modules.security.analyze === 'function') {
                analysisTasks.push(
                    modules.security.analyze().then(moduleResults => {
                        results.security = moduleResults;
                    })
                );
            }
            
            // 소셜 미디어 분석
            if (modules.social && typeof modules.social.analyze === 'function') {
                analysisTasks.push(
                    modules.social.analyze().then(moduleResults => {
                        results.social = moduleResults;
                    })
                );
            }
            
            // 국제화/지역화 분석
            if (modules.i18n && typeof modules.i18n.analyze === 'function') {
                analysisTasks.push(
                    modules.i18n.analyze().then(moduleResults => {
                        results.i18n = moduleResults;
                    })
                );
            }
            
            // 모든 분석 완료 후 결과 처리
            this.finalizeAnalysis(analysisTasks);
        },
        
        /**
         * 분석 결과 마무리 및 표시
         * @param {Array} analysisTasks - 분석 작업 프로미스 배열
         */
        finalizeAnalysis: function(analysisTasks) {
            const logger = window.KoreanWebAnalyzer.logger;
            const results = window.KoreanWebAnalyzer.results;
            
            // 모든 분석이 완료되면 결과 표시
            Promise.all(analysisTasks)
                .then(() => {
                    // 타임스탬프 및 URL 추가
                    results.timestamp = new Date().toISOString();
                    results.url = window.location.href;
                    results.title = document.title;
                    
                    // 이벤트 발생
                    if (window.KoreanWebAnalyzer.utils.events) {
                        window.KoreanWebAnalyzer.utils.events.emit('analysis:complete', results);
                    }
                    
                    // UI에 결과 표시
                    if (window.KoreanWebAnalyzer.ui.overlay && window.KoreanWebAnalyzer.ui.overlay.showResults) {
                        window.KoreanWebAnalyzer.ui.overlay.showResults(results);
                    } else {
                        // 기본 결과 표시
                        this.showSimpleResults(results);
                    }
                    
                    logger.info('페이지 분석 완료', results);
                })
                .catch(err => {
                    logger.error('분석 중 오류가 발생했습니다', err);
                    
                    // UI에 오류 표시
                    if (window.KoreanWebAnalyzer.ui.overlay && window.KoreanWebAnalyzer.ui.overlay.showError) {
                        window.KoreanWebAnalyzer.ui.overlay.showError('분석 중 오류가 발생했습니다: ' + err.message);
                    } else {
                        // 기본 오류 표시
                        this.showSimpleError('분석 중 오류가 발생했습니다: ' + err.message);
                    }
                });
        },
        
        /**
         * 간단한 결과 표시 (UI 모듈이 없을 때)
         * @param {Object} results - 분석 결과
         */
        showSimpleResults: function(results) {
            // 기존 오버레이 제거
            const existingOverlay = document.getElementById('korean-web-analyzer-simple-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // 간단한 오버레이 생성
            const overlay = document.createElement('div');
            overlay.id = 'korean-web-analyzer-simple-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '20px';
            overlay.style.right = '20px';
            overlay.style.width = '300px';
            overlay.style.padding = '15px';
            overlay.style.backgroundColor = '#fff';
            overlay.style.border = '1px solid #ddd';
            overlay.style.borderRadius = '5px';
            overlay.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            overlay.style.zIndex = '9999999';
            overlay.style.fontFamily = 'Arial, sans-serif';
            overlay.style.fontSize = '14px';
            
            // 평균 점수 계산
            const scores = [];
            if (results.seo && typeof results.seo.score === 'number') scores.push(results.seo.score);
            if (results.standards && typeof results.standards.score === 'number') scores.push(results.standards.score);
            if (results.accessibility && typeof results.accessibility.score === 'number') scores.push(results.accessibility.score);
            if (results.performance && typeof results.performance.score === 'number') scores.push(results.performance.score);
            if (results.mobile && typeof results.mobile.score === 'number') scores.push(results.mobile.score);
            if (results.security && typeof results.security.score === 'number') scores.push(results.security.score);
            if (results.social && typeof results.social.score === 'number') scores.push(results.social.score);
            if (results.i18n && typeof results.i18n.score === 'number') scores.push(results.i18n.score);
            
            const avgScore = scores.length > 0 
                ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) 
                : 0;
            
            // 내용 설정
            overlay.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 16px;">한국어 웹사이트 분석기</h3>
                    <button id="korean-web-analyzer-close" style="border: none; background: none; cursor: pointer; font-size: 18px;">&times;</button>
                </div>
                <div>
                    <p>분석 완료!</p>
                    <p>종합 점수: <strong>${avgScore}</strong>/100</p>
                    <p>현재 페이지: ${results.title || document.title}</p>
                    <p>URL: ${results.url || window.location.href}</p>
                    
                    <div style="margin-top: 10px;">
                        <p>카테고리별 점수:</p>
                        <ul style="padding-left: 20px; margin-top: 5px;">
                            <li>SEO: ${results.seo.score || 0}/100</li>
                            <li>웹표준: ${results.standards.score || 0}/100</li>
                            <li>웹접근성: ${results.accessibility.score || 0}/100</li>
                            <li>성능: ${results.performance.score || 0}/100</li>
                            <li>모바일: ${results.mobile.score || 0}/100</li>
                            <li>보안: ${results.security.score || 0}/100</li>
                            <li>소셜 미디어: ${results.social ? results.social.score : 0}/100</li>
                            <li>국제화/지역화: ${results.i18n ? results.i18n.score : 0}/100</li>
                        </ul>
                    </div>
                    
                    <p style="margin-top: 15px; font-size: 12px; color: #666;">
                        버전: ${window.KoreanWebAnalyzer.version || '0.1.0'}
                    </p>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // 닫기 버튼 이벤트 처리
            document.getElementById('korean-web-analyzer-close').addEventListener('click', function() {
                overlay.remove();
            });
        },
        
        /**
         * 간단한 오류 표시 (UI 모듈이 없을 때)
         * @param {string} message - 오류 메시지
         */
        showSimpleError: function(message) {
            // 기존 오류 메시지 제거
            const existingError = document.getElementById('korean-web-analyzer-simple-error');
            if (existingError) {
                existingError.remove();
            }
            
            // 오류 메시지 요소 생성
            const errorDiv = document.createElement('div');
            errorDiv.id = 'korean-web-analyzer-simple-error';
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '20px';
            errorDiv.style.right = '20px';
            errorDiv.style.padding = '15px';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.color = '#721c24';
            errorDiv.style.border = '1px solid #f5c6cb';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            errorDiv.style.zIndex = '9999999';
            errorDiv.style.fontFamily = 'Arial, sans-serif';
            errorDiv.style.fontSize = '14px';
            
            // 내용 설정
            errorDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong>오류 발생!</strong>
                    <button id="korean-web-analyzer-error-close" style="border: none; background: none; cursor: pointer; font-size: 18px;">&times;</button>
                </div>
                <p style="margin: 5px 0;">${message}</p>
            `;
            
            document.body.appendChild(errorDiv);
            
            // 닫기 버튼 이벤트 처리
            document.getElementById('korean-web-analyzer-error-close').addEventListener('click', function() {
                errorDiv.remove();
            });
            
            // 5초 후 자동으로 닫기
            setTimeout(() => {
                if (document.body.contains(errorDiv)) {
                    errorDiv.remove();
                }
            }, 5000);
        },
        
        /**
         * 동적 모듈 로드
         * @param {string} moduleName - 모듈 이름 (파일명)
         * @param {Function} [callback] - 로드 완료 콜백
         */
        loadModule: function(moduleName, callback) {
            const logger = window.KoreanWebAnalyzer.logger;
            logger.debug(`모듈 로드 중: ${moduleName}`);
            
            // 스크립트 요소 생성
            const script = document.createElement('script');
            script.src = `https://your-domain.com/assets/js/${moduleName}.js?v=${new Date().getTime()}`;
            script.async = true;
            
            // 로드 이벤트
            script.onload = function() {
                logger.debug(`모듈 로드 완료: ${moduleName}`);
                if (callback && typeof callback === 'function') {
                    callback();
                }
            };
            
            // 오류 이벤트
            script.onerror = function() {
                logger.error(`모듈 로드 실패: ${moduleName}`);
                if (callback && typeof callback === 'function') {
                    callback(new Error(`모듈 로드 실패: ${moduleName}`));
                }
            };
            
            // 문서에 스크립트 추가
            document.head.appendChild(script);
        }
    };
})();

/**
 * 키보드 접근성 검사
 * - 포커스 가능한 요소, tabindex, 키보드 트랩, 조작 불가 요소 등 점검
 * @param {Document} doc
 * @param {Object} results
 */
function checkKeyboardAccessibility(doc, results) {
    const focusableSelectors = [
        'a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
    ];
    const focusable = Array.from(doc.querySelectorAll(focusableSelectors.join(',')));
    let unfocusable = 0;
    let tabindexIssues = 0;
    let keyboardTrap = false;
    // 포커스 가능한 요소 중 tabindex=-1이거나 disabled인 경우
    focusable.forEach(el => {
        const tabindex = el.getAttribute('tabindex');
        if (tabindex === '-1' || el.disabled) {
            unfocusable++;
            results.keyboard.issues.push({
                type: 'unfocusable-element',
                severity: 'warning',
                message: '키보드로 포커스할 수 없는 요소가 있습니다.',
                element: el
            });
        }
        // tabindex가 0 이상이지만 시각적 포커스 표시가 없는 경우(간단 체크)
        if ((tabindex === null || parseInt(tabindex) >= 0) && !hasVisibleFocusStyle(el)) {
            tabindexIssues++;
            results.keyboard.issues.push({
                type: 'no-visible-focus',
                severity: 'warning',
                message: '포커스 표시가 없는 요소가 있습니다.',
                element: el
            });
        }
    });
    // 키보드 트랩(포커스가 특정 영역에서 빠져나가지 못하는 경우) 간단 감지
    // (실제 환경에서는 이벤트 시뮬레이션 필요, 여기서는 포커스 가능한 요소가 1개뿐이면 트랩 가능성)
    if (focusable.length === 1) {
        keyboardTrap = true;
        results.keyboard.issues.push({
            type: 'keyboard-trap',
            severity: 'error',
            message: '키보드 트랩(포커스가 빠져나가지 못함) 가능성이 있습니다.',
            element: focusable[0]
        });
    }
    // 점수 산출 (이슈가 없으면 100, 있을수록 감점)
    const issueCount = results.keyboard.issues.length;
    results.keyboard.score = Math.max(0, 100 - issueCount * 20);
}

/**
 * 포커스 스타일이 시각적으로 표시되는지 간단히 확인
 * @param {Element} el
 * @returns {boolean}
 */
function hasVisibleFocusStyle(el) {
    // outline 또는 box-shadow가 있는지 체크 (간단 버전)
    const style = window.getComputedStyle(el);
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
}

/**
 * ARIA 속성 검사
 * - role/aria-* 속성 보유 요소의 필수 속성 누락, 중복/충돌, landmark 적합성, aria-live 등 점검
 * @param {Document} doc
 * @param {Object} results
 */
function checkAriaAttributes(doc, results) {
    const ariaElements = doc.querySelectorAll('[role], [aria-*]');
    let missingRequired = 0;
    let conflict = 0;
    let landmarkIssues = 0;
    ariaElements.forEach(el => {
        const role = el.getAttribute('role');
        // landmark role 적합성(예: main, navigation 등은 1개만 존재해야 함)
        if (role && ['main','navigation','banner','contentinfo','complementary','form','search'].includes(role)) {
            const sameRole = doc.querySelectorAll(`[role="${role}"]`).length;
            if (sameRole > 1) {
                landmarkIssues++;
                results.aria.issues.push({
                    type: 'landmark-duplicate',
                    severity: 'warning',
                    message: `landmark role "${role}"이 ${sameRole}개 존재합니다.`,
                    element: el
                });
            }
        }
        // 필수 aria-* 속성 누락 (예: role=tab이면 aria-selected 필요)
        if (role === 'tab' && !el.hasAttribute('aria-selected')) {
            missingRequired++;
            results.aria.issues.push({
                type: 'missing-aria-selected',
                severity: 'error',
                message: 'role="tab" 요소에 aria-selected 속성이 없습니다.',
                element: el
            });
        }
        // aria-* 속성 중복/충돌(예: aria-hidden과 aria-live 동시 사용 등)
        if (el.hasAttribute('aria-hidden') && el.hasAttribute('aria-live')) {
            conflict++;
            results.aria.issues.push({
                type: 'aria-conflict',
                severity: 'warning',
                message: 'aria-hidden과 aria-live를 동시에 사용하면 안 됩니다.',
                element: el
            });
        }
        // aria-live 속성 값 점검
        if (el.hasAttribute('aria-live')) {
            const val = el.getAttribute('aria-live');
            if (!['off','polite','assertive'].includes(val)) {
                results.aria.issues.push({
                    type: 'invalid-aria-live',
                    severity: 'warning',
                    message: `aria-live 속성 값이 올바르지 않습니다: ${val}`,
                    element: el
                });
            }
        }
    });
    // 점수 산출 (이슈가 없으면 100, 있을수록 감점)
    const issueCount = results.aria.issues.length;
    results.aria.score = Math.max(0, 100 - issueCount * 20);
}

/**
 * 폼 접근성 검사
 * - label 연결, fieldset/legend, aria-describedby, autocomplete, 오류 메시지, 키보드 제출 등 점검
 * @param {Document} doc
 * @param {Object} results
 */
function checkFormAccessibility(doc, results) {
    const forms = doc.querySelectorAll('form');
    let unlabeled = 0;
    let missingFieldset = 0;
    let missingAutocomplete = 0;
    let errorMsgIssues = 0;
    forms.forEach(form => {
        // label 연결되지 않은 input
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const id = input.getAttribute('id');
            const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
            if (!hasLabel) {
                unlabeled++;
                results.keyboard.issues.push({
                    type: 'unlabeled-input',
                    severity: 'error',
                    message: 'label이 연결되지 않은 입력 필드가 있습니다.',
                    element: input
                });
            }
            // autocomplete 속성 누락
            if (!input.hasAttribute('autocomplete')) {
                missingAutocomplete++;
                results.keyboard.issues.push({
                    type: 'missing-autocomplete',
                    severity: 'warning',
                    message: 'autocomplete 속성이 없는 입력 필드가 있습니다.',
                    element: input
                });
            }
        });
        // fieldset/legend 누락
        const fieldsets = form.querySelectorAll('fieldset');
        if (fieldsets.length === 0) {
            missingFieldset++;
            results.keyboard.issues.push({
                type: 'missing-fieldset',
                severity: 'warning',
                message: 'fieldset/legend가 없는 폼이 있습니다.',
                element: form
            });
        }
        // 오류 메시지 연결(aria-describedby 등)
        const errorMsgs = form.querySelectorAll('.error, [aria-describedby]');
        errorMsgs.forEach(msg => {
            if (!msg.hasAttribute('aria-describedby')) {
                errorMsgIssues++;
                results.keyboard.issues.push({
                    type: 'missing-aria-describedby',
                    severity: 'warning',
                    message: '오류 메시지에 aria-describedby가 연결되어 있지 않습니다.',
                    element: msg
                });
            }
        });
    });
    // 점수 산출 (이슈가 없으면 100, 있을수록 감점)
    const issueCount = results.keyboard.issues.filter(i=>['unlabeled-input','missing-fieldset','missing-autocomplete','missing-aria-describedby'].includes(i.type)).length;
    results.keyboard.score = Math.max(0, results.keyboard.score - issueCount * 10);
}