/**
 * 한국어 웹사이트 분석기
 * Core Web Vitals 요소 분석기
 * 
 * Core Web Vitals 메트릭에 영향을 미치는 요소를 식별하고
 * 문제점을 분석하는 모듈입니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer) {
        window.KoreanWebAnalyzer.analyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer.webVitals) {
        window.KoreanWebAnalyzer.analyzer.webVitals = {};
    }
    
    /**
     * Core Web Vitals 요소 분석기 클래스
     */
    class ElementAnalyzer {
        constructor(metricsCollector) {
            this.metricsCollector = metricsCollector;
            this.metrics = metricsCollector ? metricsCollector.metrics : null;
            this.elementProblems = {
                lcp: [],
                fid: [],
                cls: []
            };
            this.elementAttribution = new Map();
        }
        
        /**
         * 메트릭 설정
         * @param {Object} metrics - Core Web Vitals 메트릭 객체
         */
        setMetrics(metrics) {
            this.metrics = metrics;
        }
        
        /**
         * LCP 요소 분석
         * @return {Object} LCP 요소 분석 결과
         */
        analyzeLCPElement() {
            const results = {
                element: null,
                issues: [],
                recommendations: [],
                attribution: {}
            };
            
            if (!this.metrics || !this.metrics.lcp || !this.metrics.lcp.element) {
                return results;
            }
            
            const lcpElement = this.metrics.lcp.element;
            results.element = lcpElement;
            
            // LCP 요소 속성 수집
            const lcpData = this._getLCPElementData(lcpElement);
            results.attribution = lcpData;
            
            // 이미지 또는 비디오인 경우 최적화 확인
            if (lcpElement.tagName === 'IMG' || lcpElement.tagName === 'VIDEO') {
                this._analyzeMediaElement(lcpElement, results);
            } 
            // 텍스트 요소인 경우
            else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV', 'SPAN'].includes(lcpElement.tagName)) {
                this._analyzeTextElement(lcpElement, results);
            }
            
            // 웹폰트 분석
            this._analyzeFonts(lcpElement, results);
            
            // 상위 요소에서 지연 요인 확인
            this._analyzeAncestorBlocking(lcpElement, results);
            
            // 이슈를 elementProblems에 저장
            this.elementProblems.lcp = results.issues;
            
            return results;
        }
        
        /**
         * LCP 요소 데이터 수집
         * @param {Element} element - LCP 요소
         * @return {Object} LCP 요소 데이터
         */
        _getLCPElementData(element) {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            
            // 기본 속성
            const data = {
                tagName: element.tagName,
                id: element.id || null,
                classNames: element.className || null,
                size: {
                    width: rect.width,
                    height: rect.height,
                    area: rect.width * rect.height
                },
                position: {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    inViewport: this._isInViewport(element)
                },
                styles: {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    backgroundImage: styles.backgroundImage,
                    fontSize: styles.fontSize,
                    fontFamily: styles.fontFamily
                },
                lcpValue: this.metrics.lcp.value
            };
            
            // 이미지인 경우 추가 정보
            if (element.tagName === 'IMG') {
                data.image = {
                    src: element.src,
                    srcset: element.srcset || null,
                    sizes: element.sizes || null,
                    loading: element.loading || null,
                    decoding: element.decoding || null,
                    fetchPriority: element.fetchPriority || null,
                    naturalWidth: element.naturalWidth,
                    naturalHeight: element.naturalHeight,
                    aspectRatio: element.naturalHeight ? element.naturalWidth / element.naturalHeight : null
                };
                
                // 웹사이트 내부 이미지인지 확인
                data.image.isSameDomain = this._isSameDomain(element.src);
            }
            
            // 비디오인 경우 추가 정보
            if (element.tagName === 'VIDEO') {
                data.video = {
                    src: element.src,
                    poster: element.poster,
                    preload: element.preload,
                    autoplay: element.autoplay,
                    controls: element.hasAttribute('controls')
                };
                
                // 소스 요소 확인
                const sources = Array.from(element.querySelectorAll('source')).map(source => ({
                    src: source.src,
                    type: source.type
                }));
                
                if (sources.length > 0) {
                    data.video.sources = sources;
                }
            }
            
            return data;
        }
        
        /**
         * 요소가 뷰포트 내에 있는지 확인
         * @param {Element} element - 확인할 요소
         * @return {boolean} 뷰포트 내 여부
         */
        _isInViewport(element) {
            const rect = element.getBoundingClientRect();
            
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth
            );
        }
        
        /**
         * URL이 같은 도메인인지 확인
         * @param {string} url - 확인할 URL
         * @return {boolean} 같은 도메인 여부
         */
        _isSameDomain(url) {
            try {
                const urlObj = new URL(url, window.location.origin);
                return urlObj.hostname === window.location.hostname;
            } catch (e) {
                return false;
            }
        }
        
        /**
         * 미디어 요소(이미지/비디오) 분석
         * @param {Element} element - 분석할 요소
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeMediaElement(element, results) {
            const isImage = element.tagName === 'IMG';
            const isVideo = element.tagName === 'VIDEO';
            
            // 이미지 분석
            if (isImage) {
                const imgSrc = element.src;
                
                // 크기 지정 확인
                if (!element.hasAttribute('width') || !element.hasAttribute('height')) {
                    results.issues.push({
                        type: 'no-dimensions',
                        severity: 'high',
                        message: '이미지 요소에 width와 height 속성이 명시되어 있지 않습니다.',
                        impact: 'CLS 문제를 발생시키고 레이아웃 구성이 지연될 수 있습니다.'
                    });
                }
                
                // 큰 이미지 확인
                if (element.naturalWidth > 0 && element.width > 0) {
                    const oversize = element.naturalWidth / element.width;
                    
                    if (oversize > 2) {
                        results.issues.push({
                            type: 'oversized-image',
                            severity: 'medium',
                            message: '이미지가 표시 크기보다 훨씬 큽니다.',
                            impact: `원본 이미지(${element.naturalWidth}x${element.naturalHeight})가 표시 크기(${Math.round(element.width)}x${Math.round(element.height)})보다 ${oversize.toFixed(1)}배 큽니다.`
                        });
                    }
                }
                
                // 현대적 포맷 확인
                if (imgSrc.match(/\.(jpe?g|png|gif)$/i) && !imgSrc.match(/\.(webp|avif)$/i)) {
                    results.issues.push({
                        type: 'not-next-gen-format',
                        severity: 'medium',
                        message: '최신 이미지 포맷(WebP, AVIF)을 사용하지 않습니다.',
                        impact: '최신 이미지 포맷은 더 나은 압축률을 제공하여 로딩 시간을 단축합니다.'
                    });
                }
                
                // lazy loading 확인
                if (element.loading !== 'lazy' && this._isInViewport(element)) {
                    results.issues.push({
                        type: 'no-lazy-loading',
                        severity: 'low',
                        message: '뷰포트 바깥 이미지에 지연 로딩이 적용되지 않았습니다.',
                        impact: '뷰포트에 없는 이미지의 지연 로딩은 초기 로딩 시간을 개선할 수 있습니다.'
                    });
                }
                
                // 적절한 이미지 사이즈 세트 확인
                if (!element.srcset) {
                    results.issues.push({
                        type: 'no-srcset',
                        severity: 'medium',
                        message: '반응형 이미지를 위한 srcset 속성이 없습니다.',
                        impact: 'srcset을 사용하면 다양한 화면 크기에 최적화된 이미지를 제공할 수 있습니다.'
                    });
                }
                
                // 우선순위 힌트 확인
                if (!element.fetchPriority || element.fetchPriority !== 'high') {
                    results.issues.push({
                        type: 'low-priority',
                        severity: 'medium',
                        message: 'LCP 이미지에 높은 우선순위가 설정되지 않았습니다.',
                        impact: 'fetchpriority="high" 속성은 브라우저에게 이 이미지가 중요하다고 알려줍니다.'
                    });
                }
            }
            
            // 비디오 분석
            if (isVideo) {
                // 포스터 이미지 확인
                if (!element.poster) {
                    results.issues.push({
                        type: 'no-poster',
                        severity: 'medium',
                        message: '비디오 요소에 포스터 이미지가 없습니다.',
                        impact: '포스터 이미지는 비디오 로딩 중에 시각적 콘텐츠를 즉시 제공합니다.'
                    });
                }
                
                // 프리로드 확인
                if (!element.preload || element.preload === 'none') {
                    results.issues.push({
                        type: 'no-preload',
                        severity: 'medium',
                        message: '비디오 프리로드가 설정되지 않았습니다.',
                        impact: 'preload="metadata" 또는 preload="auto"를 사용하면 비디오 로딩을 최적화할 수 있습니다.'
                    });
                }
            }
        }
        
        /**
         * 텍스트 요소 분석
         * @param {Element} element - 분석할 요소
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeTextElement(element, results) {
            const styles = window.getComputedStyle(element);
            
            // 글꼴 관련 문제 확인
            if (styles.fontFamily) {
                const isWebFont = !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].some(
                    genericFont => styles.fontFamily.includes(genericFont)
                );
                
                if (isWebFont) {
                    // 웹폰트가 사용된 경우 추가 분석
                    // font-display 확인은 CSS 규칙을 통해서만 가능하므로 간접적 추론
                    const hasNoFontDisplay = !this._checkFontDisplay();
                    
                    if (hasNoFontDisplay) {
                        results.issues.push({
                            type: 'no-font-display',
                            severity: 'medium',
                            message: '웹폰트에 font-display 설정이 없을 수 있습니다.',
                            impact: 'font-display: swap 또는 font-display: optional을 사용하면 폰트 로딩 동안 텍스트가 표시됩니다.'
                        });
                    }
                }
            }
            
            // 텍스트 렌더링 지연 가능성 확인
            const isHidden = styles.visibility === 'hidden' || styles.display === 'none' || parseFloat(styles.opacity) === 0;
            const hasTransform = styles.transform !== 'none';
            const hasAnimation = styles.animation !== 'none';
            
            if (isHidden) {
                results.issues.push({
                    type: 'hidden-text',
                    severity: 'high',
                    message: '텍스트 요소가 초기에 숨겨져 있습니다.',
                    impact: '숨겨진 요소는 표시될 때까지 LCP가 지연될 수 있습니다.'
                });
            }
            
            if (hasTransform || hasAnimation) {
                results.issues.push({
                    type: 'animated-text',
                    severity: 'medium',
                    message: '텍스트 요소에 변형 또는 애니메이션이 적용되어 있습니다.',
                    impact: '애니메이션이나 변형은 렌더링 성능에 영향을 줄 수 있습니다.'
                });
            }
        }
        
        /**
         * 웹폰트 분석
         * @param {Element} element - 분석할 요소
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeFonts(element, results) {
            // 문서의 모든 스타일시트에서 @font-face 규칙 찾기
            const fontFaceRules = this._getFontFaceRules();
            
            if (fontFaceRules.length > 0) {
                // font-display 사용 여부 확인
                const rulesWithoutFontDisplay = fontFaceRules.filter(rule => {
                    return !rule.cssText.includes('font-display');
                });
                
                if (rulesWithoutFontDisplay.length > 0) {
                    results.issues.push({
                        type: 'missing-font-display',
                        severity: 'medium',
                        message: `${rulesWithoutFontDisplay.length}개의 @font-face 규칙에 font-display 속성이 없습니다.`,
                        impact: 'font-display 속성이 없으면 웹폰트 로딩 중 텍스트가 보이지 않을 수 있습니다.'
                    });
                }
                
                // 구글 폰트 사용 시 preconnect 확인
                const googleFonts = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'));
                const hasPreconnect = Array.from(document.querySelectorAll('link[rel="preconnect"][href*="fonts.gstatic.com"]')).length > 0;
                
                if (googleFonts.length > 0 && !hasPreconnect) {
                    results.issues.push({
                        type: 'missing-preconnect',
                        severity: 'medium',
                        message: '구글 폰트에 preconnect가 적용되지 않았습니다.',
                        impact: 'preconnect는 글꼴 파일 도메인에 대한 연결을 미리 설정하여 로딩 속도를 개선합니다.'
                    });
                }
            }
        }
        
        /**
         * 모든 @font-face 규칙 가져오기
         * @return {Array} @font-face 규칙 배열
         */
        _getFontFaceRules() {
            const fontFaceRules = [];
            
            try {
                // 문서의 모든 스타일시트 순회
                for (const stylesheet of document.styleSheets) {
                    try {
                        // 외부 스타일시트는 CORS 정책으로 접근이 제한될 수 있음
                        const rules = stylesheet.cssRules || stylesheet.rules;
                        
                        for (const rule of rules) {
                            if (rule.type === CSSRule.FONT_FACE_RULE) {
                                fontFaceRules.push(rule);
                            }
                        }
                    } catch (e) {
                        // CORS 오류는 무시
                        continue;
                    }
                }
            } catch (e) {
                console.warn('스타일시트 분석 중 오류 발생:', e);
            }
            
            return fontFaceRules;
        }
        
        /**
         * font-display 속성 사용 여부 확인
         * @return {boolean} font-display 속성 사용 여부
         */
        _checkFontDisplay() {
            const fontFaceRules = this._getFontFaceRules();
            
            return fontFaceRules.some(rule => rule.cssText.includes('font-display'));
        }
        
        /**
         * 상위 요소의 렌더링 차단 요소 분석
         * @param {Element} element - 분석할 요소
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeAncestorBlocking(element, results) {
            // 상위 요소 중 렌더링 차단 CSS 찾기
            let current = element.parentElement;
            while (current) {
                const styles = window.getComputedStyle(current);
                
                // 렌더링 차단 가능성이 있는 CSS 속성 확인
                if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) === 0) {
                    results.issues.push({
                        type: 'blocking-ancestor',
                        severity: 'high',
                        message: 'LCP 요소의 상위 요소가 렌더링을 차단할 수 있습니다.',
                        impact: '상위 요소의 display, visibility, opacity 속성이 콘텐츠 로딩을 지연시킬 수 있습니다.',
                        element: current
                    });
                    break;
                }
                
                current = current.parentElement;
            }
        }
        
        /**
         * FID 관련 요소 분석
         * @return {Object} FID 요소 분석 결과
         */
        analyzeFIDElements() {
            const results = {
                elements: [],
                issues: [],
                recommendations: [],
                scripts: []
            };
            
            // 스크립트 분석
            this._analyzeScripts(results);
            
            // 이벤트 리스너 분석
            this._analyzeEventListeners(results);
            
            // 스타일시트 분석
            this._analyzeStylesheets(results);
            
            // 이슈를 elementProblems에 저장
            this.elementProblems.fid = results.issues;
            
            return results;
        }
        
        /**
         * 스크립트 분석
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeScripts(results) {
            const scripts = document.querySelectorAll('script[src]');
            
            // 스크립트 정보 수집
            for (const script of scripts) {
                const scriptData = {
                    src: script.src,
                    async: script.async,
                    defer: script.defer,
                    inHead: script.parentElement === document.head,
                    size: 'unknown'
                };
                
                results.scripts.push(scriptData);
                
                // 비동기 로딩 확인
                if (!script.async && !script.defer && scriptData.inHead) {
                    results.issues.push({
                        type: 'blocking-script',
                        severity: 'high',
                        message: '헤드에 렌더링 차단 스크립트가 있습니다.',
                        impact: '동기식 스크립트는 HTML 파싱을 차단하여 FID를 악화시킬 수 있습니다.',
                        element: script,
                        details: scriptData
                    });
                }
            }
            
            // 인라인 스크립트 분석
            const inlineScripts = document.querySelectorAll('script:not([src])');
            
            for (const script of inlineScripts) {
                if (script.textContent.length > 1000) {
                    results.issues.push({
                        type: 'large-inline-script',
                        severity: 'medium',
                        message: '큰 인라인 스크립트가 있습니다.',
                        impact: '큰 인라인 스크립트는 파싱 및 실행 시간을 증가시켜 FID에 영향을 줄 수 있습니다.',
                        element: script
                    });
                }
            }
            
            // 서드파티 스크립트 식별
            const thirdPartyScripts = Array.from(scripts).filter(script => {
                try {
                    const scriptUrl = new URL(script.src);
                    return scriptUrl.hostname !== window.location.hostname;
                } catch (e) {
                    return false;
                }
            });
            
            if (thirdPartyScripts.length > 5) {
                results.issues.push({
                    type: 'many-third-party-scripts',
                    severity: 'medium',
                    message: `${thirdPartyScripts.length}개의 서드파티 스크립트가 로드됩니다.`,
                    impact: '다수의 서드파티 스크립트는 메인 스레드 경쟁을 증가시켜 FID에 영향을 줄 수 있습니다.',
                    elements: thirdPartyScripts
                });
            }
        }
        
        /**
         * 이벤트 리스너 분석
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeEventListeners(results) {
            // 주요 이벤트 유형
            const eventTypes = ['click', 'mousedown', 'touchstart', 'keydown', 'scroll', 'resize'];
            const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
            
            // DOM에서 인라인 이벤트 핸들러 식별
            let inlineHandlerCount = 0;
            
            for (const element of document.querySelectorAll('*')) {
                for (const event of eventTypes) {
                    const attr = `on${event}`;
                    if (element.hasAttribute(attr)) {
                        inlineHandlerCount++;
                        
                        if (inlineHandlerCount <= 5) { // 처음 5개만 이슈로 추가
                            results.issues.push({
                                type: 'inline-event-handler',
                                severity: 'medium',
                                message: `인라인 이벤트 핸들러 '${attr}'가 사용되었습니다.`,
                                impact: '인라인 이벤트 핸들러는 성능 최적화가 어려울 수 있습니다.',
                                element: element
                            });
                        }
                    }
                }
            }
            
            if (inlineHandlerCount > 5) {
                results.issues.push({
                    type: 'many-inline-handlers',
                    severity: 'medium',
                    message: `총 ${inlineHandlerCount}개의 인라인 이벤트 핸들러가 있습니다.`,
                    impact: '다수의 인라인 이벤트 핸들러는 성능에 영향을 줄 수 있습니다.'
                });
            }
            
            // 비동기 이벤트 리스너의 사용 여부 추정
            const usePassiveListeners = this._checkPassiveEventListeners();
            
            if (usePassiveListeners === false && interactiveElements.length > 10) {
                results.issues.push({
                    type: 'non-passive-listeners',
                    severity: 'medium',
                    message: '수동 이벤트 리스너가 사용되지 않을 수 있습니다.',
                    impact: '스크롤과 같은 이벤트에서 passive: true 옵션은 스크롤 성능을 개선합니다.'
                });
            }
        }
        
        /**
         * 수동 이벤트 리스너 지원 여부 확인
         * @return {boolean|null} 수동 이벤트 리스너 지원 여부
         */
        _checkPassiveEventListeners() {
            try {
                let supportsPassive = false;
                const opts = Object.defineProperty({}, 'passive', {
                    get: function() {
                        supportsPassive = true;
                        return true;
                    }
                });
                
                // 테스트 이벤트 리스너
                window.addEventListener('testPassive', null, opts);
                window.removeEventListener('testPassive', null, opts);
                
                return supportsPassive;
            } catch (e) {
                return null; // 확인할 수 없음
            }
        }
        
        /**
         * 스타일시트 분석
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeStylesheets(results) {
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
            
            // 렌더링 차단 스타일시트 확인
            for (const stylesheet of stylesheets) {
                if (!stylesheet.disabled && !stylesheet.hasAttribute('media') && 
                    !(stylesheet.media && stylesheet.media.includes('print'))) {
                    
                    // 프리로드 여부 확인
                    const href = stylesheet.href;
                    const isPreloaded = Array.from(document.querySelectorAll('link[rel="preload"][as="style"]'))
                        .some(link => link.href === href);
                    
                    if (!isPreloaded) {
                        results.issues.push({
                            type: 'render-blocking-stylesheet',
                            severity: 'medium',
                            message: '렌더링 차단 스타일시트가 있습니다.',
                            impact: '중요한 스타일시트는 preload 하거나 비동기적으로 로드할 수 있습니다.',
                            element: stylesheet
                        });
                    }
                }
            }
            
            // 너무 많은 CSS 규칙 확인
            let totalRules = 0;
            
            try {
                for (const sheet of document.styleSheets) {
                    try {
                        totalRules += sheet.cssRules.length;
                    } catch (e) {
                        // CORS 오류는 무시
                        continue;
                    }
                }
                
                if (totalRules > 4000) {
                    results.issues.push({
                        type: 'excessive-css-rules',
                        severity: 'medium',
                        message: `총 ${totalRules}개의 CSS 규칙이 있습니다.`,
                        impact: '과도한 CSS 규칙은 파싱 및 CSSOM 구성 시간을 증가시킵니다.'
                    });
                }
            } catch (e) {
                console.warn('CSS 규칙 분석 중 오류 발생:', e);
            }
        }
        
        /**
         * CLS 관련 요소 분석
         * @return {Object} CLS 요소 분석 결과
         */
        analyzeCLSElements() {
            const results = {
                elements: [],
                issues: [],
                recommendations: []
            };
            
            if (!this.metrics || !this.metrics.cls) {
                return results;
            }
            
            // CLS에 영향을 미치는 요소 확인
            if (this.metrics.cls.elements && this.metrics.cls.elements.length > 0) {
                results.elements = this.metrics.cls.elements.slice(0, 5); // 최대 5개
                
                // 각 요소 분석
                for (const element of results.elements) {
                    this._analyzeCLSElement(element, results);
                }
            } else {
                // 측정된 요소가 없는 경우 일반적인 CLS 원인 확인
                this._checkCommonCLSCauses(results);
            }
            
            // 이슈를 elementProblems에 저장
            this.elementProblems.cls = results.issues;
            
            return results;
        }
        
        /**
         * CLS 개별 요소 분석
         * @param {Element} element - 분석할 요소
         * @param {Object} results - 분석 결과 객체
         */
        _analyzeCLSElement(element, results) {
            if (!element) return;
            
            const tagName = element.tagName.toLowerCase();
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            
            // 이미지 요소 분석
            if (tagName === 'img') {
                if (!element.hasAttribute('width') || !element.hasAttribute('height')) {
                    results.issues.push({
                        type: 'no-dimensions',
                        severity: 'high',
                        message: '이미지 요소에 width와 height 속성이 명시되어 있지 않습니다.',
                        impact: '크기가 지정되지 않은 이미지는 로드 시 레이아웃 변화를 유발할 수 있습니다.',
                        element: element
                    });
                }
            }
            
            // 광고 또는 동적 콘텐츠 확인
            const isLikelyAd = element.id.includes('ad') || 
                              element.className.includes('ad') || 
                              element.id.includes('banner') || 
                              element.className.includes('banner');
            
            if (isLikelyAd) {
                results.issues.push({
                    type: 'ad-or-dynamic-content',
                    severity: 'high',
                    message: '광고 또는 동적 콘텐츠로 보이는 요소가 레이아웃 변화에 기여합니다.',
                    impact: '광고나 동적으로 삽입되는 콘텐츠는 로드 시 주변 요소를 밀어낼 수 있습니다.',
                    element: element
                });
            }
            
            // 폰트 관련 CLS 확인
            if (element.textContent && element.textContent.trim().length > 0) {
                if (!this._checkFontDisplay()) {
                    results.issues.push({
                        type: 'font-cls',
                        severity: 'medium',
                        message: '폰트 로딩이 레이아웃 변화에 기여할 수 있습니다.',
                        impact: 'font-display: swap을 사용하면 텍스트가 폰트 로딩 중에도 표시됩니다.',
                        element: element
                    });
                }
            }
            
            // 애니메이션 확인
            if (styles.animation !== 'none' || styles.transition !== 'none') {
                results.issues.push({
                    type: 'animation-cls',
                    severity: 'medium',
                    message: '애니메이션이 레이아웃 변화에 기여할 수 있습니다.',
                    impact: 'transform 애니메이션은 레이아웃 변화 없이 요소를 애니메이션할 수 있습니다.',
                    element: element
                });
            }
            
            // FOUC (Flash of Unstyled Content) 확인
            if (styles.visibility === 'visible' && styles.opacity === '1') {
                const parentStyle = element.parentElement ? window.getComputedStyle(element.parentElement) : null;
                
                if (parentStyle && (parentStyle.visibility !== 'visible' || parentStyle.opacity !== '1')) {
                    results.issues.push({
                        type: 'fouc',
                        severity: 'medium',
                        message: 'FOUC(Flash of Unstyled Content)가 발생할 수 있습니다.',
                        impact: '스타일이 적용되기 전에 콘텐츠가 표시되면 레이아웃 변화가 발생할 수 있습니다.',
                        element: element
                    });
                }
            }
        }
        
        /**
         * 일반적인 CLS 원인 확인
         * @param {Object} results - 분석 결과 객체
         */
        _checkCommonCLSCauses(results) {
            // 크기가 지정되지 않은 이미지 확인
            const imagesWithoutDimensions = Array.from(document.querySelectorAll('img')).filter(
                img => !img.hasAttribute('width') || !img.hasAttribute('height')
            );
            
            if (imagesWithoutDimensions.length > 0) {
                results.elements = [...results.elements, ...imagesWithoutDimensions.slice(0, 3)];
                
                results.issues.push({
                    type: 'images-without-dimensions',
                    severity: 'high',
                    message: `${imagesWithoutDimensions.length}개의 이미지에 크기가 지정되지 않았습니다.`,
                    impact: '크기가 지정되지 않은 이미지는 로드 시 레이아웃 변화를 유발할 수 있습니다.',
                    elements: imagesWithoutDimensions.slice(0, 3)
                });
            }
            
            // 폰트 관련 CLS 확인
            if (!this._checkFontDisplay()) {
                results.issues.push({
                    type: 'font-cls',
                    severity: 'medium',
                    message: '폰트 로딩이 레이아웃 변화에 기여할 수 있습니다.',
                    impact: 'font-display: swap을 사용하면 텍스트가 폰트 로딩 중에도 표시됩니다.'
                });
            }
            
            // 광고 또는 동적 콘텐츠 확인
            const adElements = document.querySelectorAll('[id*="ad"], [class*="ad"], [id*="banner"], [class*="banner"]');
            
            if (adElements.length > 0) {
                results.elements = [...results.elements, ...Array.from(adElements).slice(0, 3)];
                
                results.issues.push({
                    type: 'ads-or-dynamic-content',
                    severity: 'high',
                    message: `${adElements.length}개의 광고 또는 동적 콘텐츠 요소가 있습니다.`,
                    impact: '광고나 동적으로 삽입되는 콘텐츠는 로드 시 주변 요소를 밀어낼 수 있습니다.',
                    elements: Array.from(adElements).slice(0, 3)
                });
            }
            
            // 스크롤바 등장으로 인한 레이아웃 변화 확인
            if (document.documentElement.scrollHeight > window.innerHeight) {
                results.issues.push({
                    type: 'scrollbar-cls',
                    severity: 'low',
                    message: '스크롤바 등장이 레이아웃 변화를 유발할 수 있습니다.',
                    impact: 'scrollbar-gutter: stable을 사용하면 스크롤바로 인한 레이아웃 변화를 방지할 수 있습니다.'
                });
            }
        }
        
        /**
         * 모든 요소 분석 실행
         * @return {Object} 분석 결과
         */
        analyze() {
            // 메트릭이 설정되지 않은 경우
            if (!this.metrics) {
                return {
                    lcp: { issues: [], recommendations: [] },
                    fid: { issues: [], recommendations: [] },
                    cls: { issues: [], recommendations: [] },
                    elementProblems: this.elementProblems
                };
            }
            
            // 각 메트릭별 요소 분석
            const lcpAnalysis = this.analyzeLCPElement();
            const fidAnalysis = this.analyzeFIDElements();
            const clsAnalysis = this.analyzeCLSElements();
            
            return {
                lcp: lcpAnalysis,
                fid: fidAnalysis,
                cls: clsAnalysis,
                elementProblems: this.elementProblems
            };
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.webVitals.ElementAnalyzer = ElementAnalyzer;
})();