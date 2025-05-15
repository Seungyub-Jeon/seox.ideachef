/**
 * 모듈 매니페스트
 * 
 * 사용 가능한 모듈, 의존성 및 크기 정보를 제공합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    /**
     * 모듈 매니페스트
     * - 각 모듈의 의존성과 우선순위 정보
     */
    window.KoreanWebAnalyzer.manifest = {
        /**
         * 코어 모듈 (필수)
         */
        core: {
            dependencies: [],
            priority: 0, // 최우선
            size: 12,    // KB 단위
        },
        
        /**
         * UI 모듈
         */
        'ui/overlay': {
            dependencies: ['core'],
            priority: 1,
            size: 14,
        },
        
        /**
         * 유틸리티 모듈
         */
        'utils/parser': {
            dependencies: ['core'],
            priority: 1,
            size: 3.3,
        },
        'utils/observer': {
            dependencies: ['core'],
            priority: 2,
            size: 2.5,
        },
        'utils/analyzer': {
            dependencies: ['core', 'utils/parser'],
            priority: 2,
            size: 10.8,
        },
        'utils/loader': {
            dependencies: ['core'],
            priority: 1,
            size: 4.2,
        },
        
        /**
         * 분석 모듈
         */
        'analyzer/seo': {
            dependencies: ['core', 'utils/analyzer', 'utils/parser'],
            priority: 3,
            size: 8.5,
            lazyLoad: true,
        },
        'analyzer/standards': {
            dependencies: ['core', 'utils/analyzer', 'utils/parser'],
            priority: 3, 
            size: 7.2,
            lazyLoad: true,
        },
        'analyzer/accessibility': {
            dependencies: ['core', 'utils/analyzer', 'utils/parser'],
            priority: 3,
            size: 9.1,
            lazyLoad: true,
        },
        'analyzer/performance': {
            dependencies: ['core', 'utils/analyzer', 'analyzer/web-vitals'],
            priority: 3,
            size: 7.2,
            lazyLoad: true,
        },
        'analyzer/security': {
            dependencies: ['core', 'utils/analyzer'],
            priority: 3,
            size: 5.8,
            lazyLoad: true,
        },
        'analyzer/mobile': {
            dependencies: ['core', 'utils/analyzer'],
            priority: 3,
            size: 6.2,
            lazyLoad: true,
        },
        'analyzer/web-vitals/metrics-collector': {
            dependencies: ['core', 'utils/analyzer'],
            priority: 3,
            size: 3.2,
            lazyLoad: true,
        },
        'analyzer/web-vitals/element-analyzer': {
            dependencies: ['core', 'utils/analyzer', 'analyzer/web-vitals/metrics-collector'],
            priority: 3,
            size: 3.5,
            lazyLoad: true,
        },
        'analyzer/web-vitals/recommendation-engine': {
            dependencies: ['core', 'utils/analyzer', 'analyzer/web-vitals/element-analyzer'],
            priority: 3,
            size: 4.1,
            lazyLoad: true,
        },
        'analyzer/web-vitals/special-cases': {
            dependencies: ['core', 'utils/analyzer'],
            priority: 3,
            size: 3.6,
            lazyLoad: true,
        },
        'analyzer/web-vitals': {
            dependencies: [
                'core', 
                'utils/analyzer', 
                'analyzer/web-vitals/metrics-collector', 
                'analyzer/web-vitals/element-analyzer', 
                'analyzer/web-vitals/recommendation-engine',
                'analyzer/web-vitals/special-cases'
            ],
            priority: 3,
            size: 2.8,
            lazyLoad: true,
        },
        
        /**
         * UI 구성 요소
         */
        'ui/charts': {
            dependencies: ['core', 'ui/overlay'],
            priority: 4,
            size: 7.5,
            lazyLoad: true,
        },
        'ui/tabs': {
            dependencies: ['core', 'ui/overlay'],
            priority: 2,
            size: 3.2,
        },
        'ui/details': {
            dependencies: ['core', 'ui/overlay'],
            priority: 4,
            size: 4.1,
            lazyLoad: true,
        },
        
        /**
         * 주어진 모듈의 의존성 트리 가져오기
         * @param {string} moduleName - 모듈 이름
         * @return {Array} 의존성 모듈 이름 배열 (로드 순서대로)
         */
        getDependencyTree: function(moduleName) {
            const result = [];
            const visited = {};
            
            // 모듈 확인
            if (!this[moduleName]) {
                console.error(`모듈 정보 없음: ${moduleName}`);
                return [moduleName];
            }
            
            // DFS로 의존성 트리 구성
            const visit = (name) => {
                if (visited[name]) {
                    return;
                }
                
                if (!this[name]) {
                    console.warn(`의존성 모듈 정보 없음: ${name}`);
                    return;
                }
                
                // 의존성 먼저 방문
                const deps = this[name].dependencies || [];
                deps.forEach(dep => visit(dep));
                
                // 방문 표시 및 결과 추가
                visited[name] = true;
                result.push(name);
            };
            
            // 의존성 트리 구성
            visit(moduleName);
            
            return result;
        },
        
        /**
         * 필수 모듈 목록 가져오기
         * @return {Array} 필수 모듈 이름 배열
         */
        getEssentialModules: function() {
            const essentials = [];
            
            // 모든 모듈 확인
            for (const name in this) {
                if (typeof this[name] === 'object' && !this[name].lazyLoad) {
                    essentials.push(name);
                }
            }
            
            return essentials;
        },
        
        /**
         * 지연 로드 모듈 목록 가져오기
         * @return {Array} 지연 로드 모듈 이름 배열
         */
        getLazyLoadModules: function() {
            const lazy = [];
            
            // 모든 모듈 확인
            for (const name in this) {
                if (typeof this[name] === 'object' && this[name].lazyLoad) {
                    lazy.push(name);
                }
            }
            
            return lazy;
        },
        
        /**
         * 모듈 크기 요약 가져오기
         * @return {Object} 모듈 크기 요약
         */
        getSizeSummary: function() {
            let totalSize = 0;
            let essentialSize = 0;
            let lazyLoadSize = 0;
            
            // 모든 모듈 확인
            for (const name in this) {
                if (typeof this[name] === 'object' && this[name].size) {
                    totalSize += this[name].size;
                    
                    if (this[name].lazyLoad) {
                        lazyLoadSize += this[name].size;
                    } else {
                        essentialSize += this[name].size;
                    }
                }
            }
            
            return {
                total: totalSize,
                essential: essentialSize,
                lazyLoad: lazyLoadSize
            };
        },
        
        /**
         * 최적의 로딩 차수 계산
         * 모듈을 의존성 및 우선순위에 따라 로딩 단계로 그룹화
         * @return {Object} 로딩 단계별 모듈 목록
         */
        getLoadingStages: function() {
            const stages = {
                essential: [], // 초기에 로드할 핵심 모듈
                first: [],     // 첫 번째 순위 지연 로딩
                second: [],    // 두 번째 순위 지연 로딩
                third: [],     // 세 번째 순위 지연 로딩
                last: []       // 마지막 순위 (불필요시 로드 안함)
            };
            
            // 모든 모듈 분류
            for (const name in this) {
                if (typeof this[name] === 'object') {
                    const module = this[name];
                    
                    // 필수 모듈
                    if (!module.lazyLoad) {
                        stages.essential.push(name);
                        continue;
                    }
                    
                    // 지연 로드 모듈을 우선순위별로 분류
                    if (module.priority <= 2) {
                        stages.first.push(name);
                    } else if (module.priority === 3) {
                        stages.second.push(name);
                    } else if (module.priority === 4) {
                        stages.third.push(name);
                    } else {
                        stages.last.push(name);
                    }
                }
            }
            
            return stages;
        },
        
        /**
         * URL 크기 계산
         * @param {Array} moduleNames - 모듈 이름 배열
         * @return {number} 모듈의 대략적인 URL 크기 (바이트 단위)
         */
        estimateUrlSize: function(moduleNames) {
            let totalSize = 0;
            
            // 기본 오버헤드 추가 (URL 인코딩, 스크립트 래퍼 등)
            totalSize += 150;
            
            // 모든 모듈 크기 합산
            for (const name of moduleNames) {
                if (this[name] && this[name].size) {
                    // KB를 바이트로 변환 및 압축률 가정 (80%)
                    totalSize += this[name].size * 1024 * 0.6;
                }
            }
            
            return Math.ceil(totalSize);
        }
    };
})();