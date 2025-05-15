/**
 * DOM 변경 관찰 유틸리티
 * 
 * 동적 콘텐츠 변경을 감지하고 처리하기 위한 유틸리티 함수를 제공합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        console.error('KoreanWebAnalyzer 네임스페이스가 존재하지 않습니다.');
        return;
    }
    
    // utils 네임스페이스 확인
    if (!window.KoreanWebAnalyzer.utils) {
        window.KoreanWebAnalyzer.utils = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    // DOM 옵저버 정의
    window.KoreanWebAnalyzer.utils.observer = {
        observers: {},
        
        /**
         * DOM 변경 감시 시작
         * @param {string} name - 옵저버 이름 (고유 식별자)
         * @param {Function} callback - 변경 감지 시 호출될 콜백 함수
         * @param {Element} [target=document.body] - 관찰 대상 요소
         * @param {Object} [options] - MutationObserver 옵션
         * @return {MutationObserver} 생성된 옵저버
         */
        observe: function(name, callback, target, options) {
            // 로깅
            logger.debug(`DOM 옵저버(${name}) 시작`);
            
            // 기존 옵저버 정리
            this.disconnect(name);
            
            // 기본값 설정
            target = target || document.body;
            
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
            const observer = new MutationObserver(mutations => {
                try {
                    callback(mutations, observer);
                } catch (err) {
                    logger.error(`DOM 옵저버(${name}) 콜백 실행 중 오류 발생`, err);
                }
            });
            
            // 옵저버 저장
            this.observers[name] = observer;
            
            // 옵저버 시작
            observer.observe(target, observerOptions);
            
            logger.debug(`DOM 옵저버(${name}) 시작됨`, { 
                target: target.tagName || 'DOCUMENT',
                options: observerOptions
            });
            
            return observer;
        },
        
        /**
         * DOM 변경 감시 중단
         * @param {string} [name] - 중단할 옵저버 이름 (없으면 모든 옵저버 중단)
         */
        disconnect: function(name) {
            if (name) {
                // 특정 옵저버만 중단
                if (this.observers[name]) {
                    this.observers[name].disconnect();
                    delete this.observers[name];
                    logger.debug(`DOM 옵저버(${name}) 중단됨`);
                }
            } else {
                // 모든 옵저버 중단
                for (const observerName in this.observers) {
                    if (this.observers.hasOwnProperty(observerName)) {
                        this.observers[observerName].disconnect();
                        logger.debug(`DOM 옵저버(${observerName}) 중단됨`);
                    }
                }
                this.observers = {};
            }
        },
        
        /**
         * SPA 페이지 변경 감지 및 처리
         * @param {Function} callback - 페이지 변경 시 호출될 콜백 함수
         */
        watchPageChanges: function(callback) {
            let currentUrl = window.location.href;
            
            // URL 변경 확인
            const checkForUrlChanges = () => {
                if (currentUrl !== window.location.href) {
                    const oldUrl = currentUrl;
                    currentUrl = window.location.href;
                    
                    logger.debug('페이지 URL 변경 감지', {
                        from: oldUrl,
                        to: currentUrl
                    });
                    
                    // 콜백 호출
                    if (typeof callback === 'function') {
                        try {
                            callback({
                                oldUrl: oldUrl,
                                newUrl: currentUrl
                            });
                        } catch (err) {
                            logger.error('페이지 변경 콜백 실행 중 오류 발생', err);
                        }
                    }
                }
            };
            
            // 브라우저 히스토리 API 변경 감지
            const originalPushState = window.history.pushState;
            window.history.pushState = function() {
                originalPushState.apply(this, arguments);
                checkForUrlChanges();
            };
            
            const originalReplaceState = window.history.replaceState;
            window.history.replaceState = function() {
                originalReplaceState.apply(this, arguments);
                checkForUrlChanges();
            };
            
            // popstate 이벤트 감지 (뒤로/앞으로 버튼)
            window.addEventListener('popstate', checkForUrlChanges);
            
            // 해시 변경 감지
            window.addEventListener('hashchange', checkForUrlChanges);
            
            logger.debug('페이지 변경 감지 시작됨');
            
            // DOM 변경 감지 - React, Vue 등의 SPA 프레임워크 지원
            this.observe('page-change', mutations => {
                const significantChanges = mutations.some(mutation => {
                    // title 변경 감지
                    if (mutation.target.nodeName === 'TITLE') {
                        return true;
                    }
                    
                    // 주요 구조 변경 감지
                    if (mutation.type === 'childList' && 
                        (mutation.target.id === 'root' || 
                         mutation.target.id === 'app' ||
                         mutation.target === document.body)) {
                        return mutation.addedNodes.length > 0;
                    }
                    
                    return false;
                });
                
                if (significantChanges) {
                    logger.debug('주요 DOM 변경 감지 - 가능한 페이지 전환');
                    checkForUrlChanges();
                }
            }, document.documentElement, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
            
            // 초기 호출
            if (typeof callback === 'function') {
                try {
                    callback({
                        oldUrl: null,
                        newUrl: currentUrl,
                        isInitial: true
                    });
                } catch (err) {
                    logger.error('초기 페이지 콜백 실행 중 오류 발생', err);
                }
            }
        },
        
        /**
         * 특정 선택자의 요소가 DOM에 추가될 때까지 대기
         * @param {string} selector - CSS 선택자
         * @param {Object} [options] - 옵션
         * @param {number} [options.timeout=10000] - 제한 시간 (ms)
         * @param {Element} [options.root=document.body] - 검색 루트 요소
         * @return {Promise<Element>} 발견된 요소를 반환하는 프로미스
         */
        waitForElement: function(selector, options = {}) {
            // 기본 옵션
            const timeout = options.timeout || 10000;
            const root = options.root || document.body;
            
            // 바로 확인
            const element = root.querySelector(selector);
            if (element) {
                return Promise.resolve(element);
            }
            
            // 프로미스 반환
            return new Promise((resolve, reject) => {
                // 제한 시간 설정
                const timeoutId = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`요소를 찾을 수 없음: ${selector} (제한 시간 초과: ${timeout}ms)`));
                }, timeout);
                
                // 옵저버 생성
                const observer = new MutationObserver(mutations => {
                    // 현재 요소 찾기
                    const element = root.querySelector(selector);
                    if (element) {
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        resolve(element);
                    }
                });
                
                // 관찰 시작
                observer.observe(root, {
                    childList: true,
                    subtree: true
                });
            });
        }
    };
})();