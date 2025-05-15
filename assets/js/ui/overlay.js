/**
 * 한국어 웹사이트 분석기 오버레이 UI 모듈
 * 
 * 분석 결과를 표시하는 오버레이 UI를 생성하고 관리합니다.
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
    
    // 오버레이 UI 정의
    window.KoreanWebAnalyzer.ui.overlay = {
        /**
         * 오버레이 UI 초기화
         * @param {Object} options - 초기화 옵션
         */
        init: function(options) {
            options = options || {};
            
            this.logger = window.KoreanWebAnalyzer.logger;
            this.logger.debug('오버레이 UI 초기화 중...');
            
            // 이미 존재하는 오버레이 제거
            this.remove();
            
            // 오버레이 컨테이너 생성
            this.createOverlay();
            
            // 탭 컨트롤러 초기화
            this.initTabs();
            
            // 이벤트 핸들러 등록
            this.bindEvents();
            
            // 로딩 상태 표시
            this.showLoading();
            
            this.logger.debug('오버레이 UI 초기화 완료');
            
            return this;
        },
        
        /**
         * 오버레이 DOM 요소 생성
         */
        createOverlay: function() {
            // 오버레이 컨테이너 모듈이 존재하는지 확인
            if (window.KoreanWebAnalyzer.ui.overlay.container) {
                // 컨테이너 모듈을 사용하여 오버레이 생성
                const options = {
                    id: 'korean-web-analyzer-overlay',
                    position: 'top-right',
                    title: '한국어 웹사이트 분석기',
                    tabNames: ['요약', 'SEO', '웹표준', '웹접근성', '성능', '모바일', '보안'],
                    defaultTab: '요약',
                    animate: true
                };
                
                const overlay = window.KoreanWebAnalyzer.ui.overlay.container.create(options);
                // 접근성: role, aria-modal, tabindex 추가
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('tabindex', '-1');
                // 탭 컨테이너 접근성
                const tabContainer = overlay.querySelector('.kwa-tabs');
                if (tabContainer) tabContainer.setAttribute('role', 'tablist');
                // 각 탭 및 패널 접근성
                const tabs = overlay.querySelectorAll('.kwa-tab');
                const tabContents = overlay.querySelectorAll('.kwa-tab-content');
                tabs.forEach((tab, i) => {
                    tab.setAttribute('role', 'tab');
                    tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
                    tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
                    tab.setAttribute('aria-controls', tabContents[i] ? tabContents[i].id : '');
                });
                tabContents.forEach((panel, i) => {
                    panel.setAttribute('role', 'tabpanel');
                    panel.setAttribute('aria-labelledby', tabs[i] ? tabs[i].id || '' : '');
                    panel.setAttribute('tabindex', '0');
                });
                document.body.appendChild(overlay);
                
                // 참조 저장
                this.overlayElement = overlay;
                
                // CSS 로드
                this.loadStyles();
            } else {
                // 기존 방식으로 오버레이 생성 (컨테이너 모듈이 없는 경우)
                const overlay = document.createElement('div');
                overlay.id = 'korean-web-analyzer-overlay';
                // 접근성: role, aria-modal, tabindex 추가
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('tabindex', '-1');
                // 탭 컨테이너 접근성
                const tabs = document.createElement('div');
                tabs.className = 'kwa-tabs';
                tabs.setAttribute('role', 'tablist');
                
                // 헤더 생성
                const header = document.createElement('div');
                header.className = 'kwa-overlay-header';
                
                const title = document.createElement('h2');
                title.className = 'kwa-overlay-title';
                title.textContent = '한국어 웹사이트 분석기';
                
                const closeButton = document.createElement('button');
                closeButton.className = 'kwa-overlay-close';
                closeButton.innerHTML = '&times;';
                closeButton.setAttribute('title', '닫기');
                
                header.appendChild(title);
                header.appendChild(closeButton);
                
                // 탭 생성
                const tabNames = ['요약', 'SEO', '웹표준', '웹접근성', '성능', '모바일', '보안'];
                
                tabNames.forEach((tabName, index) => {
                    const tab = document.createElement('div');
                    tab.className = 'kwa-tab' + (index === 0 ? ' active' : '');
                    tab.setAttribute('data-tab', tabName.toLowerCase());
                    tab.setAttribute('role', 'tab');
                    tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
                    tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
                    tab.setAttribute('aria-controls', 'kwa-tab-' + tabName.toLowerCase());
                    tab.textContent = tabName;
                    tabs.appendChild(tab);
                });
                
                // 콘텐츠 영역 생성
                const content = document.createElement('div');
                content.className = 'kwa-overlay-content';
                
                // 탭 콘텐츠 생성
                tabNames.forEach((tabName, index) => {
                    const tabContent = document.createElement('div');
                    tabContent.className = 'kwa-tab-content' + (index === 0 ? ' active' : '');
                    tabContent.id = 'kwa-tab-' + tabName.toLowerCase();
                    tabContent.setAttribute('role', 'tabpanel');
                    tabContent.setAttribute('aria-labelledby', '');
                    tabContent.setAttribute('tabindex', '0');
                    content.appendChild(tabContent);
                });
                
                // 오버레이에 요소 추가
                overlay.appendChild(header);
                overlay.appendChild(tabs);
                overlay.appendChild(content);
                
                // 문서에 오버레이 추가
                document.body.appendChild(overlay);
                
                // 참조 저장
                this.overlayElement = overlay;
                
                // CSS 로드
                this.loadStyles();
                
                // 애니메이션을 위한 지연 표시
                setTimeout(() => {
                    overlay.classList.add('visible');
                }, 50);
            }
        },
        
        /**
         * CSS 스타일 로드
         */
        loadStyles: function() {
            // 기존 스타일이 있는지 확인
            if (document.getElementById('kwa-styles')) {
                return;
            }
            
            // 인라인 스타일 추가
            const style = document.createElement('style');
            style.id = 'kwa-styles';
            style.textContent = `
                #korean-web-analyzer-overlay {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 2147483647;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    width: 380px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow: hidden;
                    font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Nanum Gothic', sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #333333;
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                
                #korean-web-analyzer-overlay.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .kwa-overlay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 15px;
                    background-color: #4285f4;
                    color: white;
                    border-radius: 8px 8px 0 0;
                }
                
                .kwa-overlay-title {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .kwa-overlay-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }
                
                .kwa-overlay-close:hover {
                    opacity: 1;
                }
                
                .kwa-tabs {
                    display: flex;
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                    overflow-x: auto;
                }
                
                .kwa-tab {
                    padding: 10px 15px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                
                .kwa-tab:hover {
                    background-color: rgba(66, 133, 244, 0.08);
                }
                
                .kwa-tab.active {
                    border-bottom-color: #4285f4;
                    font-weight: 600;
                    color: #4285f4;
                }
                
                .kwa-overlay-content {
                    overflow-y: auto;
                    max-height: calc(80vh - 100px);
                }
                
                .kwa-tab-content {
                    display: none;
                    padding: 15px;
                }
                
                .kwa-tab-content.active {
                    display: block;
                }
                
                .kwa-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                    text-align: center;
                }
                
                .kwa-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(66, 133, 244, 0.2);
                    border-top: 4px solid #4285f4;
                    border-radius: 50%;
                    animation: kwa-spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                
                @keyframes kwa-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* 반응형 조정 */
                @media (max-width: 480px) {
                    #korean-web-analyzer-overlay {
                        width: 95vw;
                        right: 10px;
                        top: 10px;
                    }
                }
            `;
            
            document.head.appendChild(style);
        },
        
        /**
         * 탭 인터페이스 초기화 (키보드 내비게이션 포함)
         */
        initTabs: function() {
            this.tabs = this.overlayElement.querySelectorAll('.kwa-tab');
            this.tabContents = this.overlayElement.querySelectorAll('.kwa-tab-content');
            // 각 탭에 고유 id 부여 및 aria-labelledby 연결
            this.tabs.forEach((tab, i) => {
                if (!tab.id) tab.id = 'kwa-tab-btn-' + i;
                if (this.tabContents[i]) this.tabContents[i].setAttribute('aria-labelledby', tab.id);
            });
        },
        
        /**
         * 이벤트 핸들러 등록 (탭 키보드 내비게이션 포함)
         */
        bindEvents: function() {
            const overlay = document.getElementById('korean-web-analyzer-overlay');
            if (!overlay) return;
            // ESC 키로 닫기
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hide();
                }
                // 탭/shift+탭 포커스 트랩
                if (e.key === 'Tab') {
                    const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
                // 탭 키보드 내비게이션 (좌/우/Home/End)
                if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
                    const tabs = Array.from(this.tabs);
                    const current = document.activeElement;
                    const idx = tabs.indexOf(current);
                    if (idx !== -1) {
                        let nextIdx = idx;
                        if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
                        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
                        if (e.key === 'Home') nextIdx = 0;
                        if (e.key === 'End') nextIdx = tabs.length - 1;
                        tabs[nextIdx].focus();
                        this.activateTab(tabs[nextIdx].getAttribute('data-tab'));
                        e.preventDefault();
                    }
                }
            });
            
            // 닫기 버튼
            const closeButton = this.overlayElement.querySelector('.kwa-overlay-close');
            closeButton.addEventListener('click', () => {
                this.remove();
            });
            
            // 탭 전환 (마우스 클릭)
            this.tabs.forEach(tab => {
                tab.addEventListener('click', event => {
                    const tabName = event.currentTarget.getAttribute('data-tab');
                    this.activateTab(tabName);
                    event.currentTarget.focus();
                });
            });
        },
        
        /**
         * 탭 활성화 (ARIA 및 포커스 상태 동기화)
         * @param {string} tabName - 활성화할 탭 이름
         */
        activateTab: function(tabName) {
            // 모든 탭 비활성화
            this.tabs.forEach(tab => {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
                tab.setAttribute('tabindex', '-1');
            });
            // 모든 탭 콘텐츠 숨김
            this.tabContents.forEach(content => {
                content.classList.remove('active');
            });
            // 선택한 탭 활성화
            const activeTab = this.overlayElement.querySelector(`.kwa-tab[data-tab="${tabName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
                activeTab.setAttribute('aria-selected', 'true');
                activeTab.setAttribute('tabindex', '0');
            }
            // 선택한 탭 콘텐츠 표시
            const activeContent = document.getElementById(`kwa-tab-${tabName}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        },
        
        /**
         * 로딩 상태 표시
         * @param {string} [message='페이지 분석 중...'] - 표시할 메시지
         */
        showLoading: function(message) {
            message = message || '페이지 분석 중...';
            
            const tabContents = this.overlayElement.querySelectorAll('.kwa-tab-content');
            
            tabContents.forEach(content => {
                content.innerHTML = `
                    <div class="kwa-loading">
                        <div class="kwa-spinner"></div>
                        <p>${message}</p>
                    </div>
                `;
            });
        },
        
        /**
         * 분석 결과 표시
         * @param {Object} results - 분석 결과 객체
         */
        showResults: function(results) {
            this.logger.debug('분석 결과 표시', results);
            
            // 각 탭의 결과 표시
            this.showSummary(results);
            this.showSeoResults(results.seo);
            this.showStandardsResults(results.standards);
            this.showAccessibilityResults(results.accessibility);
            this.showPerformanceResults(results.performance);
            this.showMobileResults(results.mobile);
            this.showSecurityResults(results.security);
        },
        
        /**
         * 요약 탭 표시
         * @param {Object} results - 전체 분석 결과
         */
        showSummary: function(results) {
            const summaryTab = document.getElementById('kwa-tab-요약');
            
            if (!summaryTab) {
                this.logger.error('요약 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 요약 탭 내용 생성
            // 실제 구현에서는 results 객체의 데이터를 사용
            summaryTab.innerHTML = `
                <div class="kwa-summary">
                    <div class="kwa-score-container">
                        <div class="kwa-score-card">
                            <div class="kwa-score-value">85</div>
                            <div class="kwa-score-label">종합 점수</div>
                        </div>
                        <div class="kwa-score-card">
                            <div class="kwa-score-value">92</div>
                            <div class="kwa-score-label">SEO</div>
                        </div>
                        <div class="kwa-score-card">
                            <div class="kwa-score-value">78</div>
                            <div class="kwa-score-label">웹표준</div>
                        </div>
                    </div>
                    
                    <h3>주요 개선 사항</h3>
                    <div class="kwa-issues-list">
                        <div class="kwa-issue-item kwa-issue-critical">
                            <div class="kwa-issue-header">
                                <h4 class="kwa-issue-title">이미지에 대체 텍스트가 없습니다.</h4>
                                <span class="kwa-issue-severity kwa-severity-critical">중요</span>
                            </div>
                            <div class="kwa-issue-description">
                                12개의 이미지가 alt 속성이 없거나 비어있습니다. 이는 접근성에 문제가 될 수 있습니다.
                            </div>
                            <div class="kwa-issue-solution">
                                <strong>해결 방법:</strong> 모든 이미지에 의미 있는 대체 텍스트를 추가하세요.
                            </div>
                        </div>
                        
                        <div class="kwa-issue-item kwa-issue-warning">
                            <div class="kwa-issue-header">
                                <h4 class="kwa-issue-title">메타 설명이 없습니다.</h4>
                                <span class="kwa-issue-severity kwa-severity-warning">경고</span>
                            </div>
                            <div class="kwa-issue-description">
                                페이지에 메타 설명(meta description)이 없습니다. 검색 엔진 최적화에 중요합니다.
                            </div>
                            <div class="kwa-issue-solution">
                                <strong>해결 방법:</strong> head 섹션에 메타 설명 태그를 추가하세요.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        /**
         * SEO 결과 탭 표시
         * @param {Object} results - SEO 분석 결과
         */
        showSeoResults: function(results) {
            const seoTab = document.getElementById('kwa-tab-seo');
            
            if (!seoTab) {
                this.logger.error('SEO 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 SEO 탭 내용 생성
            seoTab.innerHTML = `
                <h3>SEO 분석 결과</h3>
                <p>이 탭에는 실제 SEO 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 웹표준 결과 탭 표시
         * @param {Object} results - 웹표준 분석 결과
         */
        showStandardsResults: function(results) {
            const standardsTab = document.getElementById('kwa-tab-웹표준');
            
            if (!standardsTab) {
                this.logger.error('웹표준 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 웹표준 탭 내용 생성
            standardsTab.innerHTML = `
                <h3>웹표준 분석 결과</h3>
                <p>이 탭에는 실제 웹표준 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 웹접근성 결과 탭 표시
         * @param {Object} results - 웹접근성 분석 결과
         */
        showAccessibilityResults: function(results) {
            const accessibilityTab = document.getElementById('kwa-tab-웹접근성');
            
            if (!accessibilityTab) {
                this.logger.error('웹접근성 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 웹접근성 탭 내용 생성
            accessibilityTab.innerHTML = `
                <h3>웹접근성 분석 결과</h3>
                <p>이 탭에는 실제 웹접근성 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 성능 결과 탭 표시
         * @param {Object} results - 성능 분석 결과
         */
        showPerformanceResults: function(results) {
            const performanceTab = document.getElementById('kwa-tab-성능');
            
            if (!performanceTab) {
                this.logger.error('성능 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 성능 탭 내용 생성
            performanceTab.innerHTML = `
                <h3>성능 분석 결과</h3>
                <p>이 탭에는 실제 성능 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 모바일 결과 탭 표시
         * @param {Object} results - 모바일 분석 결과
         */
        showMobileResults: function(results) {
            const mobileTab = document.getElementById('kwa-tab-모바일');
            
            if (!mobileTab) {
                this.logger.error('모바일 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 모바일 탭 내용 생성
            mobileTab.innerHTML = `
                <h3>모바일 친화성 분석 결과</h3>
                <p>이 탭에는 실제 모바일 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 보안 결과 탭 표시
         * @param {Object} results - 보안 분석 결과
         */
        showSecurityResults: function(results) {
            const securityTab = document.getElementById('kwa-tab-보안');
            
            if (!securityTab) {
                this.logger.error('보안 탭을 찾을 수 없습니다.');
                return;
            }
            
            // 더미 데이터로 보안 탭 내용 생성
            securityTab.innerHTML = `
                <h3>보안 분석 결과</h3>
                <p>이 탭에는 실제 보안 분석 결과가 표시됩니다.</p>
                <p>현재는 개발 중인 버전입니다.</p>
            `;
        },
        
        /**
         * 오류 메시지 표시
         * @param {string} message - 오류 메시지
         * @param {Object} [error] - 오류 객체 (옵션)
         */
        showError: function(message, error) {
            this.logger.error(message, error);
            
            const tabContents = this.overlayElement.querySelectorAll('.kwa-tab-content');
            
            tabContents.forEach(content => {
                content.innerHTML = `
                    <div class="kwa-error">
                        <strong>오류 발생!</strong>
                        <p>${message}</p>
                        ${error ? `<p><small>${error.message}</small></p>` : ''}
                    </div>
                `;
            });
        },
        
        /**
         * 오버레이 제거
         */
        remove: function() {
            const existingOverlay = document.getElementById('korean-web-analyzer-overlay');
            
            if (existingOverlay) {
                existingOverlay.remove();
            }
        },
        
        /**
         * 오버레이 표시 (외부 API)
         */
        show: function(options) {
            // 오버레이가 이미 있으면 visible만 추가
            let overlay = document.getElementById('korean-web-analyzer-overlay');
            if (!overlay) {
                this.init(options);
                overlay = this.overlayElement;
            }
            overlay.classList.add('visible');
            overlay.setAttribute('tabindex', '-1');
            overlay.focus();
        },

        /**
         * 오버레이 숨김 (외부 API)
         */
        hide: function() {
            const overlay = document.getElementById('korean-web-analyzer-overlay');
            if (overlay) {
                overlay.classList.remove('visible');
                // 접근성: 포커스 해제
                overlay.blur();
            }
        },

        /**
         * 오버레이 표시/숨김 토글 (외부 API)
         */
        toggle: function(options) {
            const overlay = document.getElementById('korean-web-analyzer-overlay');
            if (!overlay || !overlay.classList.contains('visible')) {
                this.show(options);
            } else {
                this.hide();
            }
        }
    };
})();

/**
 * 점수 카드 컴포넌트 생성 함수
 * @param {number} score - 점수(0~100)
 * @param {string} category - 카테고리명
 * @returns {HTMLElement} .kwa-score-card DOM 요소
 */
function createScoreCard(score, category) {
    const scoreCard = document.createElement('div');
    scoreCard.className = 'kwa-score-card';

    // 점수 표시
    const scoreValue = document.createElement('div');
    scoreValue.className = 'kwa-score-value';
    scoreValue.textContent = score;
    scoreCard.appendChild(scoreValue);

    // 카테고리 레이블
    const categoryLabel = document.createElement('div');
    categoryLabel.className = 'kwa-score-label';
    categoryLabel.textContent = category;
    scoreCard.appendChild(categoryLabel);

    return scoreCard;
}

// 글로벌 네임스페이스에 노출
if (!window.KoreanWebAnalyzer.ui) window.KoreanWebAnalyzer.ui = {};
window.KoreanWebAnalyzer.ui.createScoreCard = createScoreCard;