/**
 * 성능 및 모바일 친화성 통합 분석 모듈
 * 
 * 웹페이지의 성능 지표와 모바일 친화성을 통합해서 분석합니다.
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
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 성능 및 모바일 통합 분석기 클래스
     */
    class PerformanceMobileAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            
            // 분석기 인스턴스 생성
            this.performanceAnalyzer = null;
            this.mobileAnalyzer = null;
            
            // 결과 초기화
            this.results = {
                score: 0,
                performance: {},
                mobile: {}
            };
        }
        
        /**
         * 분석 수행
         * @return {Object} 통합 분석 결과
         */
        analyze() {
            logger.debug('성능 및 모바일 친화성 통합 분석 시작');
            
            // 성능 분석 수행
            this.analyzePerformance();
            
            // 모바일 친화성 분석 수행
            this.analyzeMobile();
            
            // 통합 점수 계산
            this.results.score = this.calculateCombinedScore();
            
            logger.debug('성능 및 모바일 친화성 통합 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * 성능 분석 수행
         */
        analyzePerformance() {
            // 성능 분석기 참조 확인
            if (!window.KoreanWebAnalyzer.analyzer.performance) {
                logger.error('성능 분석 모듈이 로드되지 않았습니다.');
                this.results.performance = {
                    score: 0,
                    error: '성능 분석 모듈이 로드되지 않았습니다.'
                };
                return;
            }
            
            try {
                // 성능 분석 수행
                const performanceResult = window.KoreanWebAnalyzer.analyzer.performance.analyze(this.doc);
                this.results.performance = performanceResult;
                
                logger.debug('성능 분석 완료', { score: performanceResult.score });
            } catch (error) {
                logger.error('성능 분석 중 오류 발생', error);
                this.results.performance = {
                    score: 0,
                    error: '성능 분석 중 오류가 발생했습니다: ' + error.message
                };
            }
        }
        
        /**
         * 모바일 친화성 분석 수행
         */
        analyzeMobile() {
            // 모바일 분석기 참조 확인
            if (!window.KoreanWebAnalyzer.analyzer.mobile) {
                logger.error('모바일 분석 모듈이 로드되지 않았습니다.');
                this.results.mobile = {
                    score: 0,
                    error: '모바일 분석 모듈이 로드되지 않았습니다.'
                };
                return;
            }
            
            try {
                // 모바일 친화성 분석 수행
                const mobileResult = window.KoreanWebAnalyzer.analyzer.mobile.analyze(this.doc);
                this.results.mobile = mobileResult;
                
                logger.debug('모바일 친화성 분석 완료', { score: mobileResult.score });
            } catch (error) {
                logger.error('모바일 친화성 분석 중 오류 발생', error);
                this.results.mobile = {
                    score: 0,
                    error: '모바일 친화성 분석 중 오류가 발생했습니다: ' + error.message
                };
            }
        }
        
        /**
         * 통합 점수 계산
         * @return {number} 통합 점수
         */
        calculateCombinedScore() {
            // 성능 및 모바일 점수 가져오기
            const performanceScore = this.results.performance.score || 0;
            const mobileScore = this.results.mobile.score || 0;
            
            // 가중치 적용 (성능 60%, 모바일 40%)
            const weightedScore = (performanceScore * 0.6) + (mobileScore * 0.4);
            
            return Math.round(weightedScore);
        }
        
        /**
         * 주요 이슈 추출
         * @param {number} limit - 최대 이슈 수
         * @return {Array} 주요 이슈 목록
         */
        getTopIssues(limit = 5) {
            const issues = [];
            
            // 성능 이슈 수집
            if (this.results.performance.details) {
                for (const category in this.results.performance.details) {
                    if (this.results.performance.details[category].issues) {
                        issues.push(...this.results.performance.details[category].issues.map(issue => ({
                            ...issue,
                            category: 'performance-' + category
                        })));
                    }
                }
            }
            
            // 모바일 이슈 수집
            if (this.results.mobile.details) {
                for (const category in this.results.mobile.details) {
                    if (this.results.mobile.details[category].issues) {
                        issues.push(...this.results.mobile.details[category].issues.map(issue => ({
                            ...issue,
                            category: 'mobile-' + category
                        })));
                    }
                }
            }
            
            // 심각도 기준으로 이슈 정렬
            const sortedIssues = issues.sort((a, b) => {
                const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            });
            
            // 상위 이슈 반환
            return sortedIssues.slice(0, limit);
        }
        
        /**
         * 요약 보고서 생성
         * @return {Object} 요약 보고서
         */
        generateSummaryReport() {
            // 전체 점수 및 카테고리별 점수
            const summary = {
                overallScore: this.results.score,
                performanceScore: this.results.performance.score || 0,
                mobileScore: this.results.mobile.score || 0,
                topIssues: this.getTopIssues(5),
                performanceBreakdown: {},
                mobileBreakdown: {}
            };
            
            // 성능 세부 점수
            if (this.results.performance.details) {
                for (const category in this.results.performance.details) {
                    summary.performanceBreakdown[category] = this.results.performance.details[category].score || 0;
                }
            }
            
            // 모바일 세부 점수
            if (this.results.mobile.details) {
                for (const category in this.results.mobile.details) {
                    summary.mobileBreakdown[category] = this.results.mobile.details[category].score || 0;
                }
            }
            
            return summary;
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.performanceMobile = {
        /**
         * 성능 및 모바일 친화성 통합 분석 수행
         * @param {Document} [doc] - 분석할 문서
         * @return {Object} 통합 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new PerformanceMobileAnalyzer(doc);
            return analyzer.analyze();
        },
        
        /**
         * 결과에서 주요 이슈 추출
         * @param {Object} results - 분석 결과
         * @param {number} [limit=5] - 최대 이슈 수
         * @return {Array} 주요 이슈 목록
         */
        getTopIssues: function(results, limit = 5) {
            const analyzer = new PerformanceMobileAnalyzer(document);
            analyzer.results = results;
            return analyzer.getTopIssues(limit);
        },
        
        /**
         * 결과에서 요약 보고서 생성
         * @param {Object} results - 분석 결과
         * @return {Object} 요약 보고서
         */
        generateSummaryReport: function(results) {
            const analyzer = new PerformanceMobileAnalyzer(document);
            analyzer.results = results;
            return analyzer.generateSummaryReport();
        }
    };
    
    logger.debug('성능 및 모바일 친화성 통합 분석 모듈 초기화 완료');
})();