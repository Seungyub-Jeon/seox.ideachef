/**
 * 한국어 웹사이트 분석기 북마클릿 
 * 메인 스크립트 (미니파이 전 소스)
 * 
 * 이 파일은 로더 스크립트에 의해 동적으로 로드되며, 
 * 페이지 분석과 UI 오버레이 생성을 담당합니다.
 */

(function() {
    // 글로벌 네임스페이스 생성 (충돌 방지)
    if (window.KoreanWebAnalyzer) {
        console.warn('KoreanWebAnalyzer가 이미 로드되었습니다.');
        return;
    }
    
    // 기본 네임스페이스 생성
    window.KoreanWebAnalyzer = {
        version: '0.1.0',
        config: {
            debug: true,
            apiEndpoint: 'https://your-domain.com/api',
            autoInit: true
        }
    };
    
    /**
     * 스크립트 모듈 로드 함수
     * @param {string} moduleName - 모듈 이름
     * @param {Function} callback - 로드 완료 후 콜백 함수
     */
    function loadScript(moduleName, callback) {
        const script = document.createElement('script');
        
        // 개발 모드일 경우 로컬 서버 URL 사용
        const isDev = window.location.hostname === 'localhost';
        const baseURL = isDev ? 'http://localhost:3000' : 'https://your-domain.com';
        
        script.src = `${baseURL}/assets/js/${moduleName}.js?v=${new Date().getTime()}`;
        script.async = true;
        
        script.onload = function() {
            console.log(`[KoreanWebAnalyzer] ${moduleName} 모듈이 로드되었습니다.`);
            if (callback && typeof callback === 'function') {
                callback(null, moduleName);
            }
        };
        
        script.onerror = function() {
            console.error(`[KoreanWebAnalyzer] ${moduleName} 모듈 로드에 실패했습니다.`);
            if (callback && typeof callback === 'function') {
                callback(new Error(`${moduleName} 모듈 로드 실패`), moduleName);
            }
        };
        
        document.head.appendChild(script);
    }
    
    /**
     * 초기화 함수
     */
    function init() {
        console.log('[KoreanWebAnalyzer] 초기화 중...');
        
        // 필요한 스크립트 로드
        loadScript('core', function(err) {
            if (err) {
                console.error('[KoreanWebAnalyzer] 코어 모듈 로드 실패:', err);
                showError('코어 모듈을 로드할 수 없습니다.');
                return;
            }
            
            // UI 모듈 로드
            loadScript('ui/overlay', function(err) {
                if (err) {
                    console.warn('[KoreanWebAnalyzer] UI 모듈 로드 실패:', err);
                    // UI 모듈이 없어도 계속 진행
                }
                
                // Utils 모듈 로드
                loadScript('utils/parser', function(err) {
                    if (err) {
                        console.warn('[KoreanWebAnalyzer] 파서 모듈 로드 실패:', err);
                        // 파서 모듈이 없어도 계속 진행
                    }
                    
                    // 분석 모듈 로드
                    loadScript('analyzer/social/open-graph', function(err) {
                        if (err) {
                            console.warn('[KoreanWebAnalyzer] Open Graph 모듈 로드 실패:', err);
                            // 계속 진행
                        }
                        
                        loadScript('analyzer/social/twitter-cards', function(err) {
                            if (err) {
                                console.warn('[KoreanWebAnalyzer] Twitter Cards 모듈 로드 실패:', err);
                                // 계속 진행
                            }
                            
                            loadScript('analyzer/social/image-verification', function(err) {
                                if (err) {
                                    console.warn('[KoreanWebAnalyzer] 이미지 검증 모듈 로드 실패:', err);
                                    // 계속 진행
                                }
                                
                                loadScript('analyzer/social/sharing-functionality', function(err) {
                                    if (err) {
                                        console.warn('[KoreanWebAnalyzer] 공유 기능 모듈 로드 실패:', err);
                                        // 계속 진행
                                    }
                                    
                                    loadScript('analyzer/social/index', function(err) {
                                        if (err) {
                                            console.warn('[KoreanWebAnalyzer] 소셜 미디어 통합 모듈 로드 실패:', err);
                                            // 계속 진행
                                        }
                                        
                                        // 국제화/지역화 모듈 로드
                                        loadScript('analyzer/i18n/language-detection', function(err) {
                                            if (err) {
                                                console.warn('[KoreanWebAnalyzer] 언어 감지 모듈 로드 실패:', err);
                                                // 계속 진행
                                            }
                                            
                                            loadScript('analyzer/i18n/encoding-analyzer', function(err) {
                                                if (err) {
                                                    console.warn('[KoreanWebAnalyzer] 인코딩 분석 모듈 로드 실패:', err);
                                                    // 계속 진행
                                                }
                                                
                                                loadScript('analyzer/i18n/localization-detector', function(err) {
                                                    if (err) {
                                                        console.warn('[KoreanWebAnalyzer] 지역화 감지 모듈 로드 실패:', err);
                                                        // 계속 진행
                                                    }
                                                    
                                                    loadScript('analyzer/i18n/multilanguage-evaluator', function(err) {
                                                        if (err) {
                                                            console.warn('[KoreanWebAnalyzer] 다국어 지원 평가 모듈 로드 실패:', err);
                                                            // 계속 진행
                                                        }
                                                        
                                                        loadScript('analyzer/i18n/index', function(err) {
                                                            if (err) {
                                                                console.warn('[KoreanWebAnalyzer] 국제화/지역화 통합 모듈 로드 실패:', err);
                                                                // 계속 진행
                                                            }
                                                            
                                                            // 코어 초기화
                                                            if (window.KoreanWebAnalyzer.core && typeof window.KoreanWebAnalyzer.core.init === 'function') {
                                                                window.KoreanWebAnalyzer.core.init();
                                                                
                                                                // 북마클릿 모드 설정
                                                                window.KoreanWebAnalyzer.isBookmarklet = true;
                                                            } else {
                                                                console.error('[KoreanWebAnalyzer] 코어 모듈을 찾을 수 없습니다.');
                                                                showError('코어 모듈을 찾을 수 없습니다.');
                                                            }
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    
    /**
     * 오류 메시지 표시
     * @param {string} message - 표시할 오류 메시지
     */
    function showError(message) {
        const overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.top = '20px';
        overlayDiv.style.right = '20px';
        overlayDiv.style.padding = '15px';
        overlayDiv.style.backgroundColor = '#f8d7da';
        overlayDiv.style.color = '#721c24';
        overlayDiv.style.border = '1px solid #f5c6cb';
        overlayDiv.style.borderRadius = '5px';
        overlayDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        overlayDiv.style.zIndex = '9999999';
        overlayDiv.style.fontFamily = 'Arial, sans-serif';
        overlayDiv.style.fontSize = '14px';
        
        overlayDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>오류 발생!</strong>
                <button id="korean-web-analyzer-error-close" style="border: none; background: none; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
            <p>${message}</p>
        `;
        
        document.body.appendChild(overlayDiv);
        
        // 닫기 버튼 이벤트 처리
        document.getElementById('korean-web-analyzer-error-close').addEventListener('click', function() {
            overlayDiv.remove();
        });
        
        // 5초 후 자동으로 닫기
        setTimeout(() => {
            if (document.body.contains(overlayDiv)) {
                overlayDiv.remove();
            }
        }, 5000);
    }
    
    // DOM이 준비되었는지 확인 후 초기화
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        // DOM이 로드된 후 초기화
        document.addEventListener('DOMContentLoaded', init);
    }
})();