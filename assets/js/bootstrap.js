/**
 * 북마클릿 부트스트랩 스크립트
 * 
 * 이 스크립트는 최소화된 로더에서 호출되며,
 * 필요한 모듈들을 동적으로 로드하는 역할을 합니다.
 */

(function() {
    // 글로벌 네임스페이스 확장
    if (!window.KWA) {
        console.error('KWA 네임스페이스가 초기화되지 않았습니다.');
        return;
    }
    
    // 설정 확장
    window.KWA = Object.assign(window.KWA, {
        config: {
            debug: true,
            baseUrl: 'https://your-domain.com/assets/js',
            modules: {
                core: 'core.min.js',
                utils: {
                    parser: 'utils/parser.min.js',
                    observer: 'utils/observer.min.js',
                    analyzer: 'utils/analyzer.min.js'
                },
                ui: {
                    overlay: 'ui/overlay.min.js'
                }
            }
        },
        
        // 모듈 상태 추적
        moduleStatus: {},
        
        /**
         * 모듈 URL 생성
         * @param {string} moduleName - 모듈 경로 (예: 'core', 'utils/parser')
         * @return {string} 전체 URL
         */
        getModuleUrl: function(moduleName) {
            // 개발모드에서는 로컬 서버 URL 사용
            const isDev = window.location.hostname === 'localhost' && window.KWA.config.debug;
            const baseURL = isDev ? 'http://localhost:3000' : window.KWA.config.baseUrl;
            
            // 모듈 경로 구성
            let moduleFile = '';
            if (typeof moduleName === 'string') {
                if (moduleName === 'core') {
                    moduleFile = window.KWA.config.modules.core;
                } else if (moduleName.startsWith('utils/')) {
                    const utilName = moduleName.split('/')[1];
                    moduleFile = window.KWA.config.modules.utils[utilName];
                } else if (moduleName.startsWith('ui/')) {
                    const uiName = moduleName.split('/')[1];
                    moduleFile = window.KWA.config.modules.ui[uiName];
                }
            }
            
            if (!moduleFile) {
                console.error(`모듈 경로를 찾을 수 없습니다: ${moduleName}`);
                return null;
            }
            
            return `${baseURL}/${moduleFile}?v=${new Date().getTime()}`;
        },
        
        /**
         * 스크립트 동적 로드
         * @param {string} moduleName - 로드할 모듈 이름
         * @param {Function} callback - 로드 완료 후 콜백
         */
        loadModule: function(moduleName, callback) {
            // 이미 로드된 모듈인지 확인
            if (window.KWA.moduleStatus[moduleName] === 'loaded') {
                if (callback) callback(null, moduleName);
                return;
            }
            
            // 로드 중인 모듈인지 확인
            if (window.KWA.moduleStatus[moduleName] === 'loading') {
                console.warn(`모듈 ${moduleName}이(가) 이미 로드 중입니다.`);
                return;
            }
            
            // 모듈 URL 생성
            const moduleUrl = this.getModuleUrl(moduleName);
            if (!moduleUrl) {
                if (callback) callback(new Error(`모듈 ${moduleName} URL 생성 실패`), moduleName);
                return;
            }
            
            // 로딩 상태 업데이트
            window.KWA.moduleStatus[moduleName] = 'loading';
            
            // 스크립트 엘리먼트 생성
            const script = document.createElement('script');
            script.src = moduleUrl;
            script.async = true;
            
            // 로드 이벤트
            script.onload = function() {
                console.log(`[KWA] 모듈 로드 완료: ${moduleName}`);
                window.KWA.moduleStatus[moduleName] = 'loaded';
                if (callback) callback(null, moduleName);
            };
            
            // 오류 이벤트
            script.onerror = function() {
                console.error(`[KWA] 모듈 로드 실패: ${moduleName}`);
                window.KWA.moduleStatus[moduleName] = 'error';
                if (callback) callback(new Error(`모듈 ${moduleName} 로드 실패`), moduleName);
            };
            
            // DOM에 삽입
            document.head.appendChild(script);
        },
        
        /**
         * 여러 모듈 순차 로드
         * @param {Array} moduleNames - 로드할 모듈 이름 배열
         * @param {Function} callback - 모든 모듈 로드 완료 후 콜백
         */
        loadModules: function(moduleNames, callback) {
            if (!moduleNames || !moduleNames.length) {
                if (callback) callback(null, []);
                return;
            }
            
            let loaded = 0;
            const results = [];
            const errors = [];
            
            // 각 모듈 로드 완료 처리
            const handleModuleLoad = function(err, moduleName) {
                loaded++;
                
                if (err) {
                    errors.push({ module: moduleName, error: err });
                } else {
                    results.push(moduleName);
                }
                
                // 모든 모듈 로드 완료 확인
                if (loaded === moduleNames.length) {
                    if (callback) {
                        callback(errors.length ? errors : null, results);
                    }
                }
            };
            
            // 각 모듈 로드 시작
            moduleNames.forEach(function(moduleName) {
                window.KWA.loadModule(moduleName, handleModuleLoad);
            });
        },
        
        /**
         * 분석기 초기화
         */
        init: function() {
            console.log('[KWA] 부트스트랩 초기화 중...');
            
            // 필수 모듈 로드
            this.loadModules(['core', 'utils/parser'], function(err, results) {
                if (err) {
                    console.error('[KWA] 필수 모듈 로드 실패:', err);
                    window.KWA.showError('필수 모듈을 로드할 수 없습니다.');
                    return;
                }
                
                console.log('[KWA] 필수 모듈 로드 완료:', results);
                
                // 코어 초기화 실행
                if (window.KWA.core && typeof window.KWA.core.init === 'function') {
                    window.KWA.core.init();
                } else {
                    console.error('[KWA] 코어 모듈을 찾을 수 없습니다.');
                    window.KWA.showError('코어 모듈을 찾을 수 없습니다.');
                }
                
                // UI 모듈 로드 (필수 아님)
                window.KWA.loadModule('ui/overlay', function(err) {
                    if (err) {
                        console.warn('[KWA] UI 모듈 로드 실패:', err);
                    } else {
                        console.log('[KWA] UI 모듈 로드 완료');
                    }
                });
            });
        },
        
        /**
         * 오류 메시지 표시
         * @param {string} message - 오류 메시지
         */
        showError: function(message) {
            const errorDiv = document.createElement('div');
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
            
            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.style.float = 'right';
            closeButton.style.border = 'none';
            closeButton.style.background = 'none';
            closeButton.style.fontSize = '18px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.marginLeft = '10px';
            
            // 닫기 버튼 이벤트
            closeButton.addEventListener('click', function() {
                errorDiv.remove();
            });
            
            // 내용 구성
            const titleElement = document.createElement('strong');
            titleElement.textContent = '오류 발생!';
            
            const messageElement = document.createElement('p');
            messageElement.textContent = message;
            
            // 요소 추가
            errorDiv.appendChild(closeButton);
            errorDiv.appendChild(titleElement);
            errorDiv.appendChild(messageElement);
            
            // 화면에 표시
            document.body.appendChild(errorDiv);
            
            // 5초 후 자동 제거
            setTimeout(function() {
                if (document.body.contains(errorDiv)) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    });
    
    // 초기화 실행
    window.KWA.init();
})();