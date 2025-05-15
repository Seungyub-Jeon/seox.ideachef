/**
 * Core Web Vitals 특수 케이스 처리
 * 
 * 특수한 웹사이트 환경 및 시나리오에서 Core Web Vitals를 최적화하기 위한 유틸리티입니다.
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
    
    if (!window.KoreanWebAnalyzer.analyzer.webVitals) {
        window.KoreanWebAnalyzer.analyzer.webVitals = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 특수 케이스 처리 클래스
     */
    class SpecialCaseHandler {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         * @param {Object} options - 분석 옵션
         */
        constructor(document, options = {}) {
            this.doc = document;
            this.options = options;
            this.isBookmarkletMode = options.bookmarkletMode === true;
            this.isSPA = this._detectSPA();
            this.isAMP = this._detectAMP();
            this.isReactApp = this._detectReactApp();
            this.isMobileDevice = this._detectMobileDevice();

            logger.debug('특수 케이스 핸들러 초기화', {
                isBookmarkletMode: this.isBookmarkletMode,
                isSPA: this.isSPA,
                isAMP: this.isAMP,
                isReactApp: this.isReactApp,
                isMobileDevice: this.isMobileDevice
            });
        }
        
        /**
         * SPA(Single Page Application) 감지
         * @return {boolean} SPA 여부
         */
        _detectSPA() {
            // 일반적인 SPA 프레임워크 감지
            return !!(
                // React
                window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
                // Angular
                window.ng ||
                // Vue
                (window.__VUE__ || document.querySelector('[data-v-app]')) ||
                // 일반적인 SPA 특성 (pushState 처리자)
                window.onpopstate
            );
        }
        
        /**
         * AMP 페이지 감지
         * @return {boolean} AMP 페이지 여부
         */
        _detectAMP() {
            return !!(
                document.querySelector('html[amp]') ||
                document.querySelector('html[⚡]')
            );
        }
        
        /**
         * React 앱 감지
         * @return {boolean} React 앱 여부
         */
        _detectReactApp() {
            // React 감지를 위한 몇 가지 방법
            return !!(
                // React DevTools 훅
                window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
                // react- 접두사가 있는 속성 확인
                document.querySelector('[data-reactroot], [data-reactid]') ||
                // 일반적인 React 컴포넌트 형태 확인
                document.querySelectorAll('div[id^="root"], div[class^="App"]').length
            );
        }
        
        /**
         * 모바일 기기 감지
         * @return {boolean} 모바일 기기 여부
         */
        _detectMobileDevice() {
            return !!(
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                (window.innerWidth <= 800 && window.innerHeight <= 900)
            );
        }
        
        /**
         * LCP 메트릭에 대한 특수 케이스 처리
         * @param {Object} lcpData - LCP 측정 데이터
         * @return {Object} 처리된 LCP 데이터
         */
        handleLCPSpecialCases(lcpData) {
            if (!lcpData) return lcpData;
            
            let processedData = { ...lcpData };
            
            // AMP 페이지에 대한 처리
            if (this.isAMP) {
                // AMP는 이미 최적화되어 있으므로 LCP 점수 향상
                if (processedData.score === 'needs-improvement' && processedData.value < 3000) {
                    processedData.score = 'good';
                }
                
                // AMP 관련 추가 추천사항
                if (processedData.recommendations) {
                    processedData.recommendations.push({
                        title: 'AMP 페이지 최적화',
                        description: 'AMP 페이지에서는 이미지 최적화와 서버 측 렌더링이 중요합니다.',
                        priority: 'medium'
                    });
                }
            }
            
            // 모바일 기기에 대한 처리
            if (this.isMobileDevice) {
                // 모바일에서는 네트워크 상태를 고려
                if (navigator.connection && 
                    (navigator.connection.type === 'cellular' || 
                     navigator.connection.effectiveType === 'slow-2g' || 
                     navigator.connection.effectiveType === '2g')) {
                    
                    // 느린 네트워크에서는 LCP 임계값 조정
                    if (processedData.score === 'needs-improvement' && processedData.value < 3500) {
                        processedData.score = 'good';
                    }
                    
                    // 네트워크 관련 추가 추천사항
                    if (processedData.recommendations) {
                        processedData.recommendations.push({
                            title: '모바일 네트워크 대응',
                            description: '느린 모바일 네트워크에서도 빠른 LCP를 위해 이미지 프리로드와 사이즈 최적화를 강화하세요.',
                            priority: 'high'
                        });
                    }
                }
            }
            
            // SPA에 대한 처리
            if (this.isSPA) {
                // SPA 관련 추가 추천사항
                if (processedData.recommendations) {
                    processedData.recommendations.push({
                        title: 'SPA 라우팅 최적화',
                        description: '라우팅 변경 시에도 LCP를 측정하고 최적화하세요. 핵심 콘텐츠를 프리로드하고 서버 사이드 렌더링을 고려하세요.',
                        priority: 'medium'
                    });
                }
            }
            
            return processedData;
        }
        
        /**
         * FID 메트릭에 대한 특수 케이스 처리
         * @param {Object} fidData - FID 측정 데이터
         * @return {Object} 처리된 FID 데이터
         */
        handleFIDSpecialCases(fidData) {
            if (!fidData) return fidData;
            
            let processedData = { ...fidData };
            
            // 북마클릿 모드에서는 FID를 직접 측정하기 어려움
            if (this.isBookmarkletMode) {
                logger.debug('북마클릿 모드에서 FID 처리 조정');
                
                // 사용자 입력 이벤트 리스너 수 기준으로 추정
                const clickListeners = this._countEventListeners('click');
                const keyListeners = this._countEventListeners('keydown') + this._countEventListeners('keyup');
                const scrollListeners = this._countEventListeners('scroll');
                
                const totalListeners = clickListeners + keyListeners + scrollListeners;
                
                // 이벤트 리스너 수에 따른 FID 추정
                if (totalListeners > 20) {
                    // 많은 이벤트 핸들러는 FID 악화 가능성 높음
                    processedData.score = 'needs-improvement';
                    processedData.value = 120; // 추정값
                } else if (totalListeners > 50) {
                    processedData.score = 'poor';
                    processedData.value = 200; // 추정값
                }
            }
            
            // React 앱에 대한 처리
            if (this.isReactApp) {
                // React 관련 추가 추천사항
                if (processedData.recommendations) {
                    processedData.recommendations.push({
                        title: 'React 코드 분할',
                        description: 'React.lazy()와 Suspense를 사용하여 필요할 때만 컴포넌트를 로드하세요.',
                        code: `// 코드 분할 예시
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function MyComponent() {
  return (
    <React.Suspense fallback={<div>로딩 중...</div>}>
      <HeavyComponent />
    </React.Suspense>
  );
}`,
                        priority: 'high'
                    });
                }
            }
            
            // 모바일 기기에 대한 처리
            if (this.isMobileDevice) {
                // 모바일 장치에서는 터치 이벤트가 중요
                const touchListeners = this._countEventListeners('touchstart') + 
                                       this._countEventListeners('touchmove') + 
                                       this._countEventListeners('touchend');
                
                if (touchListeners > 10) {
                    // 터치 이벤트 핸들러가 많은 경우 추가 추천사항
                    if (processedData.recommendations) {
                        processedData.recommendations.push({
                            title: '터치 이벤트 최적화',
                            description: '터치 이벤트 핸들러에 passive: true 옵션을 사용하여 스크롤 성능을 향상시키세요.',
                            code: `element.addEventListener('touchstart', handler, { passive: true });`,
                            priority: 'high'
                        });
                    }
                }
            }
            
            return processedData;
        }
        
        /**
         * CLS 메트릭에 대한 특수 케이스 처리
         * @param {Object} clsData - CLS 측정 데이터
         * @return {Object} 처리된 CLS 데이터
         */
        handleCLSSpecialCases(clsData) {
            if (!clsData) return clsData;
            
            let processedData = { ...clsData };
            
            // 북마클릿 모드에서는 CLS 세션을 완전히 캡처하기 어려움
            if (this.isBookmarkletMode) {
                logger.debug('북마클릿 모드에서 CLS 처리 조정');
                
                // 레이아웃 이동 가능성이 높은 요소 탐지
                const unsizedImages = this._countUnsizedImages();
                const lazyLoadedContent = this._countLazyLoadedContent();
                const dynamicContent = this._countDynamicContent();
                
                // 문제 요소 수에 따른 CLS 추정
                const problemElements = unsizedImages + lazyLoadedContent + dynamicContent;
                
                if (problemElements > 0) {
                    const estimatedCLS = Math.min(0.15, 0.01 * problemElements);
                    
                    // 추정 CLS 값이 측정값보다 높으면 업데이트
                    if (estimatedCLS > processedData.value) {
                        processedData.value = estimatedCLS;
                        
                        // 점수 업데이트
                        if (estimatedCLS >= 0.1 && estimatedCLS < 0.25) {
                            processedData.score = 'needs-improvement';
                        } else if (estimatedCLS >= 0.25) {
                            processedData.score = 'poor';
                        }
                    }
                }
            }
            
            // SPA에 대한 처리
            if (this.isSPA) {
                // SPA에서는 라우팅 변경 시 CLS 발생 가능성 높음
                if (processedData.recommendations) {
                    processedData.recommendations.push({
                        title: 'SPA 라우팅 전환 시 CLS 최소화',
                        description: '페이지 전환 시 레이아웃 이동을 방지하기 위해 스켈레톤 UI 또는 고정 크기 컨테이너를 사용하세요.',
                        priority: 'high'
                    });
                }
            }
            
            // 모바일 기기에 대한 처리
            if (this.isMobileDevice) {
                // 모바일에서는 폰트 로딩과 관련된 CLS 문제 가능성 높음
                if (processedData.recommendations) {
                    const fontPreloadFound = !!document.querySelector('link[rel="preload"][as="font"]');
                    
                    if (!fontPreloadFound) {
                        processedData.recommendations.push({
                            title: '모바일 폰트 최적화',
                            description: '모바일에서는 웹 폰트 로딩으로 인한 레이아웃 이동이 더 중요합니다. 폰트를 프리로드하고 font-display: swap을 사용하세요.',
                            code: `<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

@font-face {
  font-family: 'MyFont';
  font-display: swap;
  src: url('font.woff2') format('woff2');
}`,
                            priority: 'high'
                        });
                    }
                }
            }
            
            return processedData;
        }
        
        /**
         * 특정 이벤트에 연결된 이벤트 리스너 수 추정
         * @param {string} eventType - 이벤트 유형
         * @return {number} 추정된 이벤트 리스너 수
         */
        _countEventListeners(eventType) {
            // 이벤트를 사용할 가능성이 높은 요소 선택
            const interactiveElements = this.doc.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            let count = 0;
            
            // 인라인 이벤트 핸들러 확인
            interactiveElements.forEach(el => {
                if (el.hasAttribute(`on${eventType}`)) {
                    count++;
                }
            });
            
            // 일반적인 이벤트 추가 패턴 추정
            const jsContent = Array.from(document.querySelectorAll('script:not([src])'))
                .map(script => script.textContent)
                .join(' ');
            
            // addEventListener, .on, bind 등 다양한 이벤트 연결 방식 확인
            const addEventListenerMatches = (jsContent.match(new RegExp(`addEventListener\\([\\s\\n]*['"]${eventType}['"]`, 'g')) || []).length;
            const onEventMatches = (jsContent.match(new RegExp(`\\.on${eventType}\\s*=`, 'g')) || []).length;
            const jqueryMatches = (jsContent.match(new RegExp(`\\.on\\([\\s\\n]*['"]${eventType}['"]`, 'g')) || []).length;
            
            count += addEventListenerMatches + onEventMatches + jqueryMatches;
            
            return count;
        }
        
        /**
         * 크기가 지정되지 않은 이미지 수 세기
         * @return {number} 크기 미지정 이미지 수
         */
        _countUnsizedImages() {
            const images = this.doc.querySelectorAll('img');
            let count = 0;
            
            images.forEach(img => {
                // 명시적 width/height 속성이 없는 이미지 확인
                if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
                    // style에 width/height가 설정되어 있는지 확인
                    const style = window.getComputedStyle(img);
                    if (style.width === 'auto' || style.height === 'auto') {
                        count++;
                    }
                }
            });
            
            return count;
        }
        
        /**
         * 지연 로드되는 콘텐츠 수 추정
         * @return {number} 지연 로드 콘텐츠 추정 수
         */
        _countLazyLoadedContent() {
            let count = 0;
            
            // 일반적인 지연 로딩 방식 확인
            const lazyImages = this.doc.querySelectorAll('img[loading="lazy"], iframe[loading="lazy"]');
            count += lazyImages.length;
            
            // 일반적인 지연 로딩 클래스 확인
            const lazyClasses = this.doc.querySelectorAll('.lazy, .lazyload, [data-src], [data-srcset]');
            count += lazyClasses.length;
            
            // 일반적인 광고 슬롯 확인
            const adSlots = this.doc.querySelectorAll('[id*="ad"], [class*="ad-"], [class*="banner"]');
            count += adSlots.length;
            
            return count;
        }
        
        /**
         * 동적으로 추가되는 콘텐츠 수 추정
         * @return {number} 동적 콘텐츠 추정 수
         */
        _countDynamicContent() {
            // SPA 프레임워크 관련 동적 콘텐츠 패턴 확인
            if (this.isSPA) {
                // React, Vue, Angular 등 SPA 프레임워크의 동적 엘리먼트 추정
                const dynamicRegions = this.doc.querySelectorAll(
                    '[id="root"], [id="app"], [data-reactroot], [ng-app], [data-v-app]'
                );
                
                let count = 0;
                
                // 동적 지역 내 하위 요소 추정
                dynamicRegions.forEach(region => {
                    // 중첩 깊이가 깊은 구조는 동적 업데이트 가능성 높음
                    const deepElements = region.querySelectorAll('div > div > div > div');
                    count += Math.min(20, deepElements.length); // 너무 많은 경우 최대 20개로 제한
                    
                    // 목록 요소는 동적 업데이트 가능성 높음
                    const listItems = region.querySelectorAll('ul > li, ol > li');
                    count += Math.min(10, listItems.length / 2); // 리스트 아이템의 절반 정도를 동적으로 추정
                });
                
                return count;
            }
            
            // 비-SPA 페이지에서는 일반적인 동적 콘텐츠 패턴 확인
            const dynamicContainers = this.doc.querySelectorAll(
                '.dynamic, .ajax, [data-dynamic], [id*="load"], [class*="widget"]'
            );
            
            return dynamicContainers.length;
        }
        
        /**
         * 전체 결과에 대한 특수 케이스 최종 처리
         * @param {Object} results - 분석 결과
         * @return {Object} 처리된 결과
         */
        finalizeResults(results) {
            if (!results) return results;
            
            // 복사본 생성
            const processedResults = JSON.parse(JSON.stringify(results));
            
            // 환경별 최적화 추천사항 추가
            if (processedResults.overall && processedResults.overall.recommendations) {
                
                // 특정 환경 탐지 플래그에 따른 추천사항 추가
                if (this.isSPA) {
                    processedResults.overall.recommendations.push({
                        title: 'SPA에 최적화된 Core Web Vitals 모니터링',
                        description: 'SPA에서는 라우팅 변경 및 동적 콘텐츠 로딩 시점에도 Core Web Vitals 메트릭을 측정해야 합니다.',
                        priority: 'high'
                    });
                }
                
                if (this.isMobileDevice) {
                    processedResults.overall.recommendations.push({
                        title: '모바일 우선 최적화',
                        description: '모바일 기기는 처리 능력과 네트워크 연결이 제한적이므로 더 강력한 최적화가 필요합니다. 특히 이미지 최적화와 자바스크립트 실행 시간을 최소화하세요.',
                        priority: 'high'
                    });
                }
                
                if (this.isBookmarkletMode) {
                    processedResults.overall.recommendations.push({
                        title: '정확한 측정을 위한 RUM 도구 도입',
                        description: '북마클릿 분석은 Core Web Vitals의 근사치만 제공합니다. 정확한 측정과 모니터링을 위해 실제 사용자 측정(RUM) 도구를 도입하세요.',
                        priority: 'medium'
                    });
                }
            }
            
            return processedResults;
        }
    }
    
    // SpecialCaseHandler 등록
    window.KoreanWebAnalyzer.analyzer.webVitals.specialCaseHandler = function(doc, options) {
        return new SpecialCaseHandler(doc, options);
    };
    
    logger.debug('Core Web Vitals 특수 케이스 처리 모듈 초기화 완료');
})();