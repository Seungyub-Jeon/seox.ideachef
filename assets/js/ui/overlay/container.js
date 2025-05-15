/**
 * 한국어 웹사이트 분석기 오버레이 컨테이너 모듈
 * 
 * 오버레이 UI의 기본 컨테이너 구조를 생성하는 모듈입니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        console.error('KoreanWebAnalyzer 네임스페이스가 존재하지 않습니다.');
        return;
    }
    
    // UI 네임스페이스 확인
    if (!window.KoreanWebAnalyzer.ui) {
        window.KoreanWebAnalyzer.ui = {};
    }
    
    // Overlay 네임스페이스 확인
    if (!window.KoreanWebAnalyzer.ui.overlay) {
        window.KoreanWebAnalyzer.ui.overlay = {};
    }
    
    // 오버레이 컨테이너 모듈 정의
    window.KoreanWebAnalyzer.ui.overlay.container = {
        /**
         * 오버레이 컨테이너 생성
         * @param {Object} options - 컨테이너 생성 옵션
         * @returns {HTMLElement} 생성된 오버레이 컨테이너 요소
         */
        create: function(options) {
            options = options || {};
            
            // 기본 옵션 설정
            const defaultOptions = {
                id: 'korean-web-analyzer-overlay',
                className: 'kwa-overlay',
                position: 'top-right', // top-right, top-left, bottom-right, bottom-left, center
                width: '380px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                zIndex: 2147483647,
                showHeader: true,
                showTabs: true,
                showClose: true,
                title: '한국어 웹사이트 분석기',
                tabNames: ['요약', 'SEO', '웹표준', '웹접근성', '성능', '모바일', '보안'],
                defaultTab: '요약',
                animate: true
            };
            
            // 옵션 병합
            const mergedOptions = Object.assign({}, defaultOptions, options);
            
            // 컨테이너 생성
            const container = document.createElement('div');
            container.id = mergedOptions.id;
            container.className = mergedOptions.className;
            
            // 위치 설정
            this.setPosition(container, mergedOptions.position);
            
            // 헤더 추가 (옵션에 따라)
            if (mergedOptions.showHeader) {
                const header = this.createHeader({
                    showClose: mergedOptions.showClose,
                    title: mergedOptions.title
                });
                container.appendChild(header);
            }
            
            // 탭 추가 (옵션에 따라)
            if (mergedOptions.showTabs) {
                const tabs = this.createTabs({
                    tabNames: mergedOptions.tabNames,
                    defaultTab: mergedOptions.defaultTab
                });
                container.appendChild(tabs);
            }
            
            // 콘텐츠 영역 추가
            const content = this.createContent({
                tabNames: mergedOptions.tabNames,
                defaultTab: mergedOptions.defaultTab
            });
            container.appendChild(content);
            
            // 애니메이션 클래스 추가 (지연)
            if (mergedOptions.animate) {
                setTimeout(() => {
                    container.classList.add('visible');
                }, 10);
            }
            
            return container;
        },
        
        /**
         * 컨테이너 위치 설정
         * @param {HTMLElement} container - 오버레이 컨테이너 요소
         * @param {string} position - 위치 (top-right, top-left, bottom-right, bottom-left, center)
         */
        setPosition: function(container, position) {
            // 기본 스타일 설정
            container.style.position = 'fixed';
            container.style.zIndex = '2147483647';
            
            // 위치별 스타일 설정
            switch (position) {
                case 'top-right':
                    container.style.top = '20px';
                    container.style.right = '20px';
                    break;
                case 'top-left':
                    container.style.top = '20px';
                    container.style.left = '20px';
                    break;
                case 'bottom-right':
                    container.style.bottom = '20px';
                    container.style.right = '20px';
                    break;
                case 'bottom-left':
                    container.style.bottom = '20px';
                    container.style.left = '20px';
                    break;
                case 'center':
                    container.style.top = '50%';
                    container.style.left = '50%';
                    container.style.transform = 'translate(-50%, -50%)';
                    break;
                default:
                    container.style.top = '20px';
                    container.style.right = '20px';
            }
        },
        
        /**
         * 헤더 생성
         * @param {Object} options - 헤더 생성 옵션
         * @returns {HTMLElement} 생성된 헤더 요소
         */
        createHeader: function(options) {
            const header = document.createElement('div');
            header.className = 'kwa-header';
            
            // 제목 추가
            const title = document.createElement('h2');
            title.textContent = options.title || '한국어 웹사이트 분석기';
            header.appendChild(title);
            
            // 닫기 버튼 추가 (옵션에 따라)
            if (options.showClose) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'kwa-close-btn';
                closeBtn.innerHTML = '&times;';
                closeBtn.setAttribute('aria-label', '닫기');
                closeBtn.setAttribute('title', '닫기');
                
                // 닫기 버튼 이벤트 핸들러
                closeBtn.addEventListener('click', function() {
                    if (window.KoreanWebAnalyzer && window.KoreanWebAnalyzer.ui && window.KoreanWebAnalyzer.ui.overlay) {
                        window.KoreanWebAnalyzer.ui.overlay.hide();
                    }
                });
                
                header.appendChild(closeBtn);
            }
            
            return header;
        },
        
        /**
         * 탭 생성
         * @param {Object} options - 탭 생성 옵션
         * @returns {HTMLElement} 생성된 탭 요소
         */
        createTabs: function(options) {
            const tabContainer = document.createElement('div');
            tabContainer.className = 'kwa-tabs';
            
            const tabNames = options.tabNames || ['요약', 'SEO', '웹표준', '웹접근성', '성능', '모바일', '보안'];
            const defaultTab = options.defaultTab || '요약';
            
            // 각 탭 생성
            tabNames.forEach(tabName => {
                const tab = document.createElement('div');
                tab.className = 'kwa-tab';
                tab.dataset.tab = tabName.toLowerCase();
                tab.textContent = tabName;
                
                // 기본 탭 활성화
                if (tabName === defaultTab) {
                    tab.classList.add('active');
                }
                
                // 탭 클릭 이벤트 핸들러
                tab.addEventListener('click', function() {
                    if (window.KoreanWebAnalyzer && window.KoreanWebAnalyzer.ui && window.KoreanWebAnalyzer.ui.overlay) {
                        window.KoreanWebAnalyzer.ui.overlay.activateTab(tabName.toLowerCase());
                    }
                });
                
                tabContainer.appendChild(tab);
            });
            
            return tabContainer;
        },
        
        /**
         * 콘텐츠 영역 생성
         * @param {Object} options - 콘텐츠 생성 옵션
         * @returns {HTMLElement} 생성된 콘텐츠 요소
         */
        createContent: function(options) {
            const contentContainer = document.createElement('div');
            contentContainer.className = 'kwa-content';
            
            const tabNames = options.tabNames || ['요약', 'SEO', '웹표준', '웹접근성', '성능', '모바일', '보안'];
            const defaultTab = options.defaultTab || '요약';
            
            // 각 탭의 콘텐츠 영역 생성
            tabNames.forEach(tabName => {
                const tabContent = document.createElement('div');
                tabContent.className = 'kwa-tab-content';
                tabContent.id = 'kwa-tab-' + tabName.toLowerCase();
                
                // 기본 탭 콘텐츠 활성화
                if (tabName === defaultTab) {
                    tabContent.classList.add('active');
                }
                
                contentContainer.appendChild(tabContent);
            });
            
            return contentContainer;
        },
        
        /**
         * 로딩 컨텐츠 생성
         * @param {string} message - 표시할 메시지
         * @returns {HTMLElement} 생성된 로딩 요소
         */
        createLoadingContent: function(message) {
            message = message || '페이지 분석 중...';
            
            const loadingContainer = document.createElement('div');
            loadingContainer.className = 'kwa-loading';
            
            const spinner = document.createElement('div');
            spinner.className = 'kwa-spinner';
            loadingContainer.appendChild(spinner);
            
            const text = document.createElement('p');
            text.textContent = message;
            loadingContainer.appendChild(text);
            
            return loadingContainer;
        },
        
        /**
         * 오류 컨텐츠 생성
         * @param {string} message - 오류 메시지
         * @param {Error} [error] - 오류 객체 (선택 사항)
         * @returns {HTMLElement} 생성된 오류 요소
         */
        createErrorContent: function(message, error) {
            const errorContainer = document.createElement('div');
            errorContainer.className = 'kwa-error';
            
            const title = document.createElement('strong');
            title.textContent = '오류 발생!';
            errorContainer.appendChild(title);
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            errorContainer.appendChild(messageEl);
            
            if (error && error.message) {
                const details = document.createElement('p');
                details.innerHTML = `<small>${error.message}</small>`;
                errorContainer.appendChild(details);
            }
            
            return errorContainer;
        }
    };
})();