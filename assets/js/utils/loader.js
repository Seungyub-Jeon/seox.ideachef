/**
 * 모듈 로더 유틸리티
 * 
 * 모듈을 필요에 따라 동적으로 로드하기 위한 유틸리티 함수를 제공합니다.
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
    
    // 모듈 로더 정의
    window.KoreanWebAnalyzer.utils.moduleLoader = {
        /**
         * 로드된 모듈 및 상태 추적
         */
        modules: {
            loaded: {},
            pending: {},
            failed: {}
        },
        
        /**
         * 모듈 URL 생성
         * @param {string} moduleName - 모듈 이름
         * @return {string} 모듈 URL
         */
        getModuleUrl: function(moduleName) {
            // 개발 환경 확인
            const isDev = window.location.hostname === 'localhost';
            
            // 기본 URL 설정
            const baseUrl = isDev ? 'http://localhost:3000' : 'https://your-domain.com';
            
            // 경로 확인
            let path = moduleName;
            if (!path.endsWith('.js')) {
                path = path + '.min.js';
            }
            
            // 캐시 무효화를 위한 버전 쿼리 파라미터 추가
            const version = window.KoreanWebAnalyzer.version || '0.1.0';
            return `${baseUrl}/assets/js/${path}?v=${version}.${Date.now()}`;
        },
        
        /**
         * 모듈 로드
         * @param {string|Array} moduleNames - 로드할 모듈 이름 또는 이름 배열
         * @param {Function} [callback] - 로드 완료 콜백
         * @return {Promise} 로드 완료 프로미스
         */
        loadModules: function(moduleNames, callback) {
            // 단일 모듈을 배열로 변환
            if (!Array.isArray(moduleNames)) {
                moduleNames = [moduleNames];
            }
            
            // 이미 로드된 모듈 필터링
            const toLoad = moduleNames.filter(name => !this.modules.loaded[name]);
            
            // 모든 모듈이 이미 로드된 경우
            if (toLoad.length === 0) {
                if (callback) {
                    callback(null, this.modules.loaded);
                }
                return Promise.resolve(this.modules.loaded);
            }
            
            logger.debug(`모듈 로드 시작: ${toLoad.join(', ')}`);
            
            // 모든 모듈 로드 프로미스 생성
            const loadPromises = toLoad.map(name => this.loadModule(name));
            
            // Promise.all로 모든 모듈 로드 대기
            return Promise.all(loadPromises)
                .then(results => {
                    logger.debug(`모듈 로드 완료: ${toLoad.join(', ')}`);
                    
                    if (callback) {
                        callback(null, this.modules.loaded);
                    }
                    
                    return this.modules.loaded;
                })
                .catch(err => {
                    logger.error(`모듈 로드 실패: ${err.message}`);
                    
                    if (callback) {
                        callback(err, this.modules.loaded);
                    }
                    
                    throw err;
                });
        },
        
        /**
         * 단일 모듈 로드
         * @param {string} moduleName - 로드할 모듈 이름
         * @return {Promise} 로드 완료 프로미스
         */
        loadModule: function(moduleName) {
            // 이미 로드된 모듈 확인
            if (this.modules.loaded[moduleName]) {
                return Promise.resolve(this.modules.loaded[moduleName]);
            }
            
            // 이미 로드 중인 모듈 확인
            if (this.modules.pending[moduleName]) {
                return this.modules.pending[moduleName];
            }
            
            // 로딩 프로미스 생성
            const loadPromise = new Promise((resolve, reject) => {
                logger.debug(`모듈 로드 중: ${moduleName}`);
                
                // 스크립트 요소 생성
                const script = document.createElement('script');
                script.src = this.getModuleUrl(moduleName);
                script.async = true;
                
                // 로드 성공 처리
                script.onload = () => {
                    logger.debug(`모듈 로드 성공: ${moduleName}`);
                    
                    // 로드된 모듈 참조 저장
                    this.modules.loaded[moduleName] = true;
                    delete this.modules.pending[moduleName];
                    
                    resolve(true);
                };
                
                // 오류 처리
                script.onerror = (err) => {
                    logger.error(`모듈 로드 실패: ${moduleName}`, err);
                    
                    this.modules.failed[moduleName] = err;
                    delete this.modules.pending[moduleName];
                    
                    reject(new Error(`모듈 로드 실패: ${moduleName}`));
                };
                
                // 스크립트 삽입
                document.head.appendChild(script);
            });
            
            // 대기 중인 모듈에 추가
            this.modules.pending[moduleName] = loadPromise;
            
            return loadPromise;
        },
        
        /**
         * 특정 기능이 필요할 때 모듈 로드
         * @param {string} featureName - 기능 이름
         * @param {Array} moduleNames - 로드할 모듈 이름 배열
         * @param {Function} callback - 로드 완료 후 실행할 콜백
         */
        loadOnDemand: function(featureName, moduleNames, callback) {
            logger.debug(`온디맨드 로드 요청: ${featureName}`);
            
            // 모듈 로드
            this.loadModules(moduleNames)
                .then(() => {
                    logger.debug(`${featureName} 기능 사용 가능`);
                    if (typeof callback === 'function') {
                        callback(null);
                    }
                })
                .catch(err => {
                    logger.error(`${featureName} 기능 로드 실패: ${err.message}`);
                    if (typeof callback === 'function') {
                        callback(err);
                    }
                });
        },
        
        /**
         * 모듈 사전 로드 (미리 로드하여 나중에 즉시 사용하기 위함)
         * @param {Array} moduleNames - 사전 로드할 모듈 이름 배열
         * @param {Object} [options] - 추가 옵션
         * @param {boolean} [options.priority=false] - 우선순위 기반 로드 여부
         * @param {Function} [options.progressCallback] - 진행 상황 콜백
         * @return {Promise} 로드 완료 프로미스
         */
        preloadModules: function(moduleNames, options = {}) {
            if (!Array.isArray(moduleNames) || moduleNames.length === 0) {
                return Promise.resolve([]);
            }
            
            const { priority = false, progressCallback } = options;
            logger.debug(`모듈 사전 로드 중: ${moduleNames.join(', ')}`);
            
            // 우선순위 기반 로드
            if (priority && window.KoreanWebAnalyzer.manifest) {
                const manifest = window.KoreanWebAnalyzer.manifest;
                const sortedModules = [...moduleNames].sort((a, b) => {
                    const priorityA = manifest[a] ? (manifest[a].priority || 999) : 999;
                    const priorityB = manifest[b] ? (manifest[b].priority || 999) : 999;
                    return priorityA - priorityB;
                });
                
                // 순차적으로 로드 (우선순위가 더 높은 모듈부터)
                let loadedCount = 0;
                const promiseChain = sortedModules.reduce((chain, moduleName, index) => {
                    return chain.then(results => {
                        return this.loadModule(moduleName).then(result => {
                            loadedCount++;
                            
                            // 진행 상황 콜백 호출
                            if (progressCallback) {
                                progressCallback(loadedCount, sortedModules.length, moduleName);
                            }
                            
                            return [...results, result];
                        });
                    });
                }, Promise.resolve([]));
                
                return promiseChain
                    .then(results => {
                        logger.debug('우선순위 기반 모듈 사전 로드 완료');
                        return results;
                    })
                    .catch(err => {
                        logger.warn('일부 우선순위 모듈 사전 로드 실패', err);
                        throw err;
                    });
            }
            
            // 일반 병렬 로드
            return this.loadModules(moduleNames)
                .then(results => {
                    logger.debug('모듈 사전 로드 완료');
                    if (progressCallback) {
                        progressCallback(moduleNames.length, moduleNames.length, 'complete');
                    }
                    return results;
                })
                .catch(err => {
                    logger.warn('일부 모듈 사전 로드 실패', err);
                    throw err;
                });
        },
        
        /**
         * 단계별 모듈 로드
         * 매니페스트의 단계 정보를 활용하여 효율적으로 모듈 로드
         * @param {Function} [callback] - 모든 필수 모듈 로드 후 콜백
         * @return {Promise} 필수 모듈 로드 완료 프로미스
         */
        loadStages: function(callback) {
            // 매니페스트 참조
            if (!window.KoreanWebAnalyzer.manifest) {
                logger.error('매니페스트가 존재하지 않습니다.');
                return Promise.reject(new Error('매니페스트가 존재하지 않습니다.'));
            }
            
            const manifest = window.KoreanWebAnalyzer.manifest;
            const stages = manifest.getLoadingStages();
            
            // 필수 모듈 로드
            return this.loadModules(stages.essential)
                .then(results => {
                    logger.info('필수 모듈 로드 완료');
                    
                    // 콜백 실행
                    if (callback) {
                        callback(null, results);
                    }
                    
                    // 첫 번째 우선순위 모듈 백그라운드 로드
                    if (stages.first.length > 0) {
                        this.preloadModules(stages.first, {
                            priority: true,
                            progressCallback: (loaded, total, current) => {
                                logger.debug(`1차 모듈 로드: ${loaded}/${total} (${current})`);
                            }
                        }).then(() => {
                            // 두 번째 우선순위 모듈 백그라운드 로드
                            if (stages.second.length > 0) {
                                this.preloadModules(stages.second, { priority: true });
                            }
                        });
                    }
                    
                    return results;
                })
                .catch(err => {
                    logger.error('필수 모듈 로드 실패', err);
                    
                    if (callback) {
                        callback(err);
                    }
                    
                    throw err;
                });
        }
    };
})();