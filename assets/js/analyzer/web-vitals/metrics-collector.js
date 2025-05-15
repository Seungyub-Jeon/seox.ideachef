/**
 * 한국어 웹사이트 분석기
 * Core Web Vitals 메트릭 수집기
 * 
 * LCP(Largest Contentful Paint), FID(First Input Delay), CLS(Cumulative Layout Shift)
 * 메트릭을 수집하고 분석하는 모듈입니다.
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
     * Core Web Vitals 메트릭 수집기 클래스
     */
    class WebVitalsCollector {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.metrics = {
                lcp: null,
                fid: null,
                cls: null
            };
            this.observers = {};
            this.lcpCandidate = null;
            this.layoutShifts = [];
            this.interactionEvents = [];
            this.lcpFinalizeTimeout = null;
            this.isObserving = false;
            this.hasNavigationTiming = !!window.performance && !!window.performance.getEntriesByType;
            this.hasPerformanceObserver = !!window.PerformanceObserver;
        }
        
        /**
         * 메트릭 수집 시작
         * @return {Promise} 메트릭 수집 완료 프로미스
         */
        collectMetrics() {
            return new Promise((resolve) => {
                // 북마클릿 모드에서는 이미 로드된 페이지에 대한 추정치 제공
                if (this.isBookmarklet) {
                    this._estimateMetricsForBookmarklet().then(metrics => {
                        this.metrics = metrics;
                        resolve(this.metrics);
                    });
                    return;
                }
                
                // API 지원 확인
                if (!this.hasPerformanceObserver) {
                    console.warn('PerformanceObserver API를 지원하지 않는 브라우저입니다.');
                    this._estimateMetricsWithoutAPI().then(metrics => {
                        this.metrics = metrics;
                        resolve(this.metrics);
                    });
                    return;
                }
                
                // 관찰자 설정 및 메트릭 수집 시작
                this._setupObservers();
                this._collectUserInteractions();
                
                // 메트릭 완료 대기
                // LCP 계산은 보통 로드 후 수 초 내에 최종화됨
                this.lcpFinalizeTimeout = setTimeout(() => {
                    this._finalizeMeasurements();
                    this._disconnectObservers();
                    resolve(this.metrics);
                }, 5000);
            });
        }
        
        /**
         * 관찰자 설정
         */
        _setupObservers() {
            if (!this.hasPerformanceObserver) return;
            
            this.isObserving = true;
            
            // LCP 관찰자
            try {
                this.observers.lcp = new PerformanceObserver(entries => {
                    const lcpEntries = entries.getEntries();
                    if (lcpEntries.length > 0) {
                        // 가장 최근의 LCP 후보 기록
                        const latestEntry = lcpEntries[lcpEntries.length - 1];
                        this.lcpCandidate = {
                            value: latestEntry.startTime + latestEntry.duration,
                            element: latestEntry.element || null,
                            url: latestEntry.url || null,
                            size: latestEntry.size || 0,
                            entryType: latestEntry.entryType,
                            id: latestEntry.id || null
                        };
                    }
                });
                
                this.observers.lcp.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (e) {
                console.warn('LCP 관찰자 설정 중 오류 발생:', e);
            }
            
            // Layout Shift 관찰자
            try {
                this.observers.layoutShift = new PerformanceObserver(entries => {
                    for (const entry of entries.getEntries()) {
                        // 사용자 상호작용에 의한 레이아웃 변화는 제외
                        if (!entry.hadRecentInput) {
                            this.layoutShifts.push({
                                value: entry.value,
                                sources: entry.sources || [],
                                timestamp: entry.startTime,
                                elements: this._getElementsFromSources(entry.sources)
                            });
                        }
                    }
                });
                
                this.observers.layoutShift.observe({ type: 'layout-shift', buffered: true });
            } catch (e) {
                console.warn('Layout Shift 관찰자 설정 중 오류 발생:', e);
            }
            
            // 페이지 로드 정보
            try {
                this.observers.navigation = new PerformanceObserver(entries => {
                    const navigationEntry = entries.getEntries()[0];
                    if (navigationEntry) {
                        this.navigationTiming = navigationEntry;
                    }
                });
                
                this.observers.navigation.observe({ type: 'navigation', buffered: true });
            } catch (e) {
                console.warn('Navigation Timing 관찰자 설정 중 오류 발생:', e);
                // 대체 방법으로 getEntriesByType 사용
                if (this.hasNavigationTiming) {
                    const navEntries = window.performance.getEntriesByType('navigation');
                    if (navEntries.length > 0) {
                        this.navigationTiming = navEntries[0];
                    }
                }
            }
            
            // Resource Timing 관찰자 (이미지, 스크립트 등 리소스 로딩 시간)
            try {
                this.observers.resource = new PerformanceObserver(entries => {
                    this.resourceEntries = [...(this.resourceEntries || []), ...entries.getEntries()];
                });
                
                this.observers.resource.observe({ type: 'resource', buffered: true });
            } catch (e) {
                console.warn('Resource Timing 관찰자 설정 중 오류 발생:', e);
                // 대체 방법으로 getEntriesByType 사용
                if (this.hasNavigationTiming) {
                    this.resourceEntries = window.performance.getEntriesByType('resource');
                }
            }
        }
        
        /**
         * Layout Shift 소스에서 관련 요소 추출
         * @param {Array} sources - Layout Shift 소스 배열
         * @return {Array} 레이아웃 변화에 영향받은 요소 배열
         */
        _getElementsFromSources(sources) {
            if (!sources || !Array.isArray(sources)) return [];
            
            const elements = [];
            
            for (const source of sources) {
                if (source.node) {
                    elements.push(source.node);
                }
            }
            
            return elements;
        }
        
        /**
         * 사용자 상호작용 이벤트 수집 (FID 계산용)
         */
        _collectUserInteractions() {
            // FID 계산을 위한 첫 번째 상호작용 이벤트 리스너
            const eventTypes = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
            
            const captureTiming = (event) => {
                // 첫 번째 상호작용만 측정
                if (this.interactionEvents.length === 0) {
                    const now = performance.now();
                    // 이벤트 큐에 머무는 시간이 FID (첫 번째 입력 지연)
                    const delay = now - event.timeStamp;
                    
                    this.interactionEvents.push({
                        type: event.type,
                        timeStamp: event.timeStamp,
                        processingStart: now,
                        delay: delay,
                        target: event.target
                    });
                    
                    // 첫 상호작용을 얻었으면 리스너 제거
                    eventTypes.forEach(type => {
                        document.removeEventListener(type, captureTiming, { capture: true, passive: true });
                    });
                }
            };
            
            // 이벤트 리스너 등록
            eventTypes.forEach(type => {
                document.addEventListener(type, captureTiming, { capture: true, passive: true });
            });
        }
        
        /**
         * 관찰자 연결 해제
         */
        _disconnectObservers() {
            if (!this.isObserving) return;
            
            // 모든 관찰자 연결 해제
            Object.values(this.observers).forEach(observer => {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            });
            
            // 타임아웃 클리어
            if (this.lcpFinalizeTimeout) {
                clearTimeout(this.lcpFinalizeTimeout);
                this.lcpFinalizeTimeout = null;
            }
            
            this.isObserving = false;
        }
        
        /**
         * 측정 최종화
         */
        _finalizeMeasurements() {
            // LCP 계산
            if (this.lcpCandidate) {
                this.metrics.lcp = {
                    value: this.lcpCandidate.value,
                    element: this.lcpCandidate.element,
                    url: this.lcpCandidate.url,
                    size: this.lcpCandidate.size,
                    score: this._scoreLCP(this.lcpCandidate.value)
                };
            }
            
            // FID 계산
            if (this.interactionEvents.length > 0) {
                const firstInteraction = this.interactionEvents[0];
                this.metrics.fid = {
                    value: firstInteraction.delay,
                    processingTime: firstInteraction.processingStart - firstInteraction.timeStamp,
                    type: firstInteraction.type,
                    target: firstInteraction.target,
                    score: this._scoreFID(firstInteraction.delay)
                };
            }
            
            // CLS 계산
            let cumulativeLayoutShift = 0;
            let maxSessionGap = 1000; // 세션 간격 (1초)
            let maxSessionDuration = 5000; // 최대 세션 지속 시간 (5초)
            
            // 세션 기반 CLS 계산
            if (this.layoutShifts.length > 0) {
                // 타임스탬프 기준으로 정렬
                this.layoutShifts.sort((a, b) => a.timestamp - b.timestamp);
                
                // 세션별 CLS 계산
                let sessionWindows = [];
                let currentSession = [];
                let currentSessionShift = 0;
                
                for (let i = 0; i < this.layoutShifts.length; i++) {
                    const shift = this.layoutShifts[i];
                    
                    // 새 세션 시작
                    if (currentSession.length === 0) {
                        currentSession.push(shift);
                        currentSessionShift = shift.value;
                        continue;
                    }
                    
                    // 마지막 시프트로부터의 경과 시간
                    const lastShift = currentSession[currentSession.length - 1];
                    const elapsedTime = shift.timestamp - lastShift.timestamp;
                    
                    // 세션 시작으로부터의 총 시간
                    const sessionDuration = shift.timestamp - currentSession[0].timestamp;
                    
                    // 세션 지속 조건 확인
                    if (elapsedTime < maxSessionGap && sessionDuration < maxSessionDuration) {
                        currentSession.push(shift);
                        currentSessionShift += shift.value;
                    } else {
                        // 현재 세션 저장 후 새 세션 시작
                        sessionWindows.push({
                            shifts: currentSession,
                            value: currentSessionShift
                        });
                        
                        currentSession = [shift];
                        currentSessionShift = shift.value;
                    }
                }
                
                // 마지막 세션 추가
                if (currentSession.length > 0) {
                    sessionWindows.push({
                        shifts: currentSession,
                        value: currentSessionShift
                    });
                }
                
                // 최대 세션 값이 최종 CLS
                if (sessionWindows.length > 0) {
                    sessionWindows.sort((a, b) => b.value - a.value);
                    cumulativeLayoutShift = sessionWindows[0].value;
                    this.worstCLSSession = sessionWindows[0];
                }
                
                this.metrics.cls = {
                    value: cumulativeLayoutShift,
                    shifts: this.layoutShifts,
                    worstSession: this.worstCLSSession,
                    elements: this._getUniqueElements(this.layoutShifts),
                    score: this._scoreCLS(cumulativeLayoutShift)
                };
            }
        }
        
        /**
         * CLS에 영향을 준 고유 요소 목록 얻기
         * @param {Array} shifts - 레이아웃 시프트 배열
         * @return {Array} 고유 요소 배열
         */
        _getUniqueElements(shifts) {
            const elements = new Set();
            
            shifts.forEach(shift => {
                if (shift.elements && shift.elements.length) {
                    shift.elements.forEach(element => {
                        if (element) elements.add(element);
                    });
                }
            });
            
            return [...elements];
        }
        
        /**
         * API 없이 메트릭 추정
         * @return {Promise} 추정된 메트릭 프로미스
         */
        _estimateMetricsWithoutAPI() {
            return new Promise(resolve => {
                const metrics = {
                    lcp: null,
                    fid: null,
                    cls: null
                };
                
                // LCP 추정: 이미지나 텍스트 블록 중 가장 큰 것
                const estimateLCP = () => {
                    // 큰 텍스트 블록 및 이미지 요소 찾기
                    const elements = [
                        ...document.querySelectorAll('img'),
                        ...document.querySelectorAll('video'),
                        ...document.querySelectorAll('svg'),
                        ...document.querySelectorAll('h1, h2, h3, p, div')
                    ];
                    
                    let largestElement = null;
                    let largestSize = 0;
                    
                    elements.forEach(element => {
                        const rect = element.getBoundingClientRect();
                        const size = rect.width * rect.height;
                        
                        // 뷰포트 내에 있고 이전에 찾은 것보다 크면 업데이트
                        if (
                            size > largestSize &&
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth
                        ) {
                            largestSize = size;
                            largestElement = element;
                        }
                    });
                    
                    // 로드 시간 추정 (페이지 로드 시간 + 약간의 지연)
                    const loadTime = window.performance ? performance.now() : 2500;
                    
                    if (largestElement) {
                        metrics.lcp = {
                            value: loadTime,
                            element: largestElement,
                            size: largestSize,
                            score: this._scoreLCP(loadTime)
                        };
                    }
                };
                
                // FID는 직접 측정 없이 추정
                metrics.fid = {
                    value: 100, // 추정치 (ms)
                    score: this._scoreFID(100)
                };
                
                // CLS는 0으로 시작하고 레이아웃 변화 감지를 시도
                metrics.cls = {
                    value: 0.15, // 추정치
                    score: this._scoreCLS(0.15)
                };
                
                estimateLCP();
                
                resolve(metrics);
            });
        }
        
        /**
         * 북마클릿 모드에서 메트릭 추정
         * @return {Promise} 추정된 메트릭 프로미스
         */
        _estimateMetricsForBookmarklet() {
            return new Promise(resolve => {
                const metrics = {
                    lcp: null,
                    fid: null,
                    cls: null
                };
                
                // 리소스 타이밍 확인
                let resourceEntries = [];
                if (window.performance && window.performance.getEntriesByType) {
                    resourceEntries = window.performance.getEntriesByType('resource');
                }
                
                // LCP 추정: 큰 이미지 및 텍스트 요소 찾기
                const estimateLCP = () => {
                    const elements = [
                        ...document.querySelectorAll('img'),
                        ...document.querySelectorAll('video'),
                        ...document.querySelectorAll('svg'),
                        ...document.querySelectorAll('h1, h2, h3, p, div')
                    ];
                    
                    let largestElement = null;
                    let largestSize = 0;
                    
                    elements.forEach(element => {
                        const rect = element.getBoundingClientRect();
                        const size = rect.width * rect.height;
                        
                        // 뷰포트 내에 있고 사이즈가 최대인 요소 찾기
                        if (
                            size > largestSize &&
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth
                        ) {
                            largestSize = size;
                            largestElement = element;
                        }
                    });
                    
                    let lcpValue = 2500; // 기본값
                    
                    // 요소가 이미지인 경우 리소스 타이밍 확인
                    if (largestElement && largestElement.tagName === 'IMG' && largestElement.src) {
                        const imageUrl = largestElement.src;
                        const imageResource = resourceEntries.find(entry => entry.name === imageUrl);
                        
                        if (imageResource) {
                            lcpValue = imageResource.responseEnd;
                        }
                    }
                    
                    metrics.lcp = {
                        value: lcpValue,
                        element: largestElement,
                        size: largestSize,
                        score: this._scoreLCP(lcpValue)
                    };
                };
                
                // 페이지 복잡도 기반 FID 추정
                const estimateFID = () => {
                    const scriptCount = document.querySelectorAll('script').length;
                    const styles = document.querySelectorAll('style, link[rel="stylesheet"]').length;
                    const domComplexity = document.querySelectorAll('*').length;
                    
                    // 스크립트 및 스타일 수, DOM 복잡도에 따른 점수 계산
                    let fidEstimate = 30; // 기본값 (ms)
                    
                    if (scriptCount > 20) fidEstimate += 50;
                    else if (scriptCount > 10) fidEstimate += 20;
                    
                    if (styles > 15) fidEstimate += 30;
                    else if (styles > 5) fidEstimate += 10;
                    
                    if (domComplexity > 2000) fidEstimate += 50;
                    else if (domComplexity > 1000) fidEstimate += 20;
                    
                    metrics.fid = {
                        value: fidEstimate,
                        score: this._scoreFID(fidEstimate)
                    };
                };
                
                // 레이아웃 불안정성 징후 탐색
                const estimateCLS = () => {
                    let clsEstimate = 0.05; // 기본값
                    
                    // 일반적으로 CLS 문제를 일으키는 패턴 검사
                    const unsizedImages = Array.from(document.querySelectorAll('img')).filter(
                        img => !img.hasAttribute('width') || !img.hasAttribute('height')
                    ).length;
                    
                    const dynamicInserts = document.querySelectorAll(
                        '[id*="ad"], [id*="banner"], [class*="ad"], [class*="banner"]'
                    ).length;
                    
                    const lazyLoaded = document.querySelectorAll(
                        'img[loading="lazy"], iframe[loading="lazy"]'
                    ).length;
                    
                    if (unsizedImages > 5) clsEstimate += 0.1;
                    else if (unsizedImages > 0) clsEstimate += 0.05;
                    
                    if (dynamicInserts > 3) clsEstimate += 0.1;
                    else if (dynamicInserts > 0) clsEstimate += 0.05;
                    
                    if (lazyLoaded > 10) clsEstimate += 0.1;
                    else if (lazyLoaded > 5) clsEstimate += 0.05;
                    
                    // 요소 수집
                    const clsElements = [
                        ...Array.from(document.querySelectorAll('img:not([width]):not([height])')),
                        ...Array.from(document.querySelectorAll('[id*="ad"], [id*="banner"], [class*="ad"], [class*="banner"]'))
                    ];
                    
                    metrics.cls = {
                        value: clsEstimate,
                        elements: clsElements.slice(0, 5), // 최대 5개
                        score: this._scoreCLS(clsEstimate)
                    };
                };
                
                estimateLCP();
                estimateFID();
                estimateCLS();
                
                resolve(metrics);
            });
        }
        
        /**
         * LCP 점수 계산
         * @param {number} lcp - LCP 값 (ms)
         * @return {string} 점수 (good, needs-improvement, poor)
         */
        _scoreLCP(lcp) {
            if (lcp <= 2500) return 'good';
            if (lcp <= 4000) return 'needs-improvement';
            return 'poor';
        }
        
        /**
         * FID 점수 계산
         * @param {number} fid - FID 값 (ms)
         * @return {string} 점수 (good, needs-improvement, poor)
         */
        _scoreFID(fid) {
            if (fid <= 100) return 'good';
            if (fid <= 300) return 'needs-improvement';
            return 'poor';
        }
        
        /**
         * CLS 점수 계산
         * @param {number} cls - CLS 값
         * @return {string} 점수 (good, needs-improvement, poor)
         */
        _scoreCLS(cls) {
            if (cls <= 0.1) return 'good';
            if (cls <= 0.25) return 'needs-improvement';
            return 'poor';
        }
        
        /**
         * 숫자 점수로 변환 (점수 집계용)
         * @param {string} score - 점수 문자열 (good, needs-improvement, poor)
         * @return {number} 숫자 점수 (0-100)
         */
        getNumericScore(score) {
            switch (score) {
                case 'good': return 100;
                case 'needs-improvement': return 50;
                case 'poor': return 0;
                default: return 0;
            }
        }
        
        /**
         * 종합 점수 계산
         * @return {number} 종합 점수 (0-100)
         */
        calculateOverallScore() {
            const lcpScore = this.metrics.lcp ? this.getNumericScore(this.metrics.lcp.score) : 0;
            const fidScore = this.metrics.fid ? this.getNumericScore(this.metrics.fid.score) : 0;
            const clsScore = this.metrics.cls ? this.getNumericScore(this.metrics.cls.score) : 0;
            
            // 가중치 적용 (LCP와 CLS를 FID보다 중요하게 취급)
            const weights = { lcp: 0.4, fid: 0.2, cls: 0.4 };
            
            return (
                lcpScore * weights.lcp +
                fidScore * weights.fid +
                clsScore * weights.cls
            );
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.webVitals.MetricsCollector = WebVitalsCollector;
})();