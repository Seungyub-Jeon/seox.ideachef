/**
 * 종합 보고서 생성 모듈
 * 
 * 모든 분석 결과를 종합하여 전체 점수를 계산하고 우선순위가 지정된 개선 제안을 생성합니다.
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
     * 종합 보고서 생성기 클래스
     */
    class ReportGenerator {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                score: 0,
                categoryScores: {},
                summary: '',
                topIssues: [],
                recommendations: [],
                details: {}
            };
            this.analyzer = window.KoreanWebAnalyzer.utils.analyzer;
            
            // 분석 모듈 참조
            this.modules = {
                seo: window.KoreanWebAnalyzer.analyzer.seo,
                standards: window.KoreanWebAnalyzer.analyzer.standards,
                accessibility: window.KoreanWebAnalyzer.analyzer.accessibility,
                performance: window.KoreanWebAnalyzer.analyzer.performance,
                mobile: window.KoreanWebAnalyzer.analyzer.mobile,
                security: window.KoreanWebAnalyzer.analyzer.security
            };
            
            // 카테고리 가중치 (전체 점수 계산용)
            this.weights = {
                seo: 0.2,           // SEO 점수
                standards: 0.15,     // 웹표준 점수
                accessibility: 0.2,  // 웹접근성 점수
                performance: 0.15,   // 성능 점수
                mobile: 0.15,        // 모바일 친화성 점수
                security: 0.15       // 보안 점수
            };
            
            // 카테고리 표시 이름
            this.categoryNames = {
                seo: 'SEO',
                standards: '웹표준',
                accessibility: '웹접근성',
                performance: '성능',
                mobile: '모바일 친화성',
                security: '보안'
            };
        }
        
        /**
         * 모든 분석 모듈 실행 및 결과 종합
         * @return {Object} 종합 보고서
         */
        generateReport() {
            logger.debug('종합 보고서 생성 시작');
            
            // 각 분석 모듈 실행 및 결과 수집
            const moduleResults = this.runAnalysisModules();
            
            // 카테고리 별 점수 정리
            this.results.categoryScores = this.getCategoryScores(moduleResults);
            
            // 전체 점수 계산
            this.results.score = this.calculateOverallScore();
            
            // 요약 작성
            this.results.summary = this.generateSummary();
            
            // 주요 이슈 추출
            this.results.topIssues = this.extractTopIssues(moduleResults);
            
            // 권장사항 생성
            this.results.recommendations = this.generateRecommendations(moduleResults);
            
            // 상세 결과 저장
            this.results.details = moduleResults;
            
            logger.debug('종합 보고서 생성 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * 분석 모듈 실행
         * @return {Object} 모듈별 분석 결과
         */
        runAnalysisModules() {
            const moduleResults = {};
            
            // 각 분석 모듈 실행
            for (const [key, module] of Object.entries(this.modules)) {
                if (module && typeof module.analyze === 'function') {
                    try {
                        logger.debug(`${key} 분석 모듈 실행`);
                        moduleResults[key] = module.analyze(this.doc);
                        logger.debug(`${key} 분석 완료: ${moduleResults[key].score}/100`);
                    } catch (error) {
                        logger.error(`${key} 분석 중 오류 발생`, error);
                        moduleResults[key] = { score: 0, error: error.message };
                    }
                } else {
                    logger.warn(`${key} 분석 모듈을 찾을 수 없거나 analyze 메서드가 없습니다.`);
                }
            }
            
            return moduleResults;
        }
        
        /**
         * 카테고리별 점수 추출
         * @param {Object} moduleResults - 모듈별 분석 결과
         * @return {Object} 카테고리별 점수
         */
        getCategoryScores(moduleResults) {
            const categoryScores = {};
            
            for (const [key, result] of Object.entries(moduleResults)) {
                if (result && typeof result.score === 'number') {
                    categoryScores[key] = result.score;
                } else {
                    categoryScores[key] = 0;
                }
            }
            
            return categoryScores;
        }
        
        /**
         * 전체 점수 계산
         * @return {number} 종합 점수 (0-100)
         */
        calculateOverallScore() {
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 가중치 적용하여 점수 계산
            for (const [category, weight] of Object.entries(this.weights)) {
                if (typeof this.results.categoryScores[category] === 'number') {
                    weightedScore += this.results.categoryScores[category] * weight;
                    totalWeight += weight;
                }
            }
            
            // 총 가중치가 0이면 기본값 반환
            if (totalWeight === 0) {
                return 0;
            }
            
            // 가중치로 나누어 최종 점수 계산
            return Math.round(weightedScore / totalWeight);
        }
        
        /**
         * 요약 생성
         * @return {string} 분석 요약
         */
        generateSummary() {
            // 점수 기반 요약
            const score = this.results.score;
            
            let summary = '';
            
            if (score >= 90) {
                summary = '웹사이트가 매우 잘 최적화되어 있습니다. 몇 가지 미세한 개선만으로 완벽에 가까워질 수 있습니다.';
            } else if (score >= 75) {
                summary = '웹사이트가 대체로 잘 최적화되어 있으나, 개선할 여지가 있습니다.';
            } else if (score >= 50) {
                summary = '웹사이트에 중요한 개선이 필요한 영역이 있습니다. 권장사항을 검토하고 우선순위가 높은 이슈를 해결하세요.';
            } else {
                summary = '웹사이트에 심각한 개선이 필요합니다. 웹 표준, 접근성, 성능 등 여러 영역에서 최적화가 필요합니다.';
            }
            
            // 카테고리 강점 및 약점 분석
            const categoryScores = this.results.categoryScores;
            
            // 최고 및 최저 점수 카테고리 찾기
            let highestCategory = null;
            let lowestCategory = null;
            let highestScore = -1;
            let lowestScore = 101;
            
            for (const [category, score] of Object.entries(categoryScores)) {
                if (score > highestScore) {
                    highestScore = score;
                    highestCategory = category;
                }
                
                if (score < lowestScore) {
                    lowestScore = score;
                    lowestCategory = category;
                }
            }
            
            // 강점 및 약점 추가
            if (highestCategory && this.categoryNames[highestCategory]) {
                summary += ` 가장 잘 최적화된 영역은 ${this.categoryNames[highestCategory]}(${highestScore}/100)입니다.`;
            }
            
            if (lowestCategory && this.categoryNames[lowestCategory]) {
                summary += ` 가장 개선이 필요한 영역은 ${this.categoryNames[lowestCategory]}(${lowestScore}/100)입니다.`;
            }
            
            return summary;
        }
        
        /**
         * 주요 이슈 추출
         * @param {Object} moduleResults - 모듈별 분석 결과
         * @return {Array} 주요 이슈 목록
         */
        extractTopIssues(moduleResults) {
            const allIssues = [];
            
            // 모든 모듈의 이슈 수집
            for (const [category, result] of Object.entries(moduleResults)) {
                // 이슈 수집 방법은 모듈마다 다를 수 있음
                const issues = this.collectIssuesFromModule(category, result);
                
                // 카테고리 정보 추가
                issues.forEach(issue => {
                    issue.category = category;
                    issue.categoryName = this.categoryNames[category] || category;
                });
                
                allIssues.push(...issues);
            }
            
            // 심각도 및 카테고리 가중치에 따라 이슈 정렬
            const sortedIssues = this.sortIssuesByPriority(allIssues);
            
            // 상위 10개 이슈 반환
            return sortedIssues.slice(0, 10);
        }
        
        /**
         * 모듈별 이슈 수집
         * @param {string} category - 분석 카테고리
         * @param {Object} result - 분석 결과
         * @return {Array} 이슈 목록
         */
        collectIssuesFromModule(category, result) {
            const issues = [];
            
            if (!result) {
                return issues;
            }
            
            // 모듈에 직접 issues 배열이 있는 경우
            if (Array.isArray(result.issues)) {
                return result.issues;
            }
            
            // details 객체 내에 issues 배열이 있는 경우
            if (result.details) {
                for (const key in result.details) {
                    if (result.details[key] && Array.isArray(result.details[key].issues)) {
                        // 서브카테고리 정보 추가
                        result.details[key].issues.forEach(issue => {
                            issue.subCategory = key;
                        });
                        
                        issues.push(...result.details[key].issues);
                    }
                }
            }
            
            return issues;
        }
        
        /**
         * 이슈를 우선순위에 따라 정렬
         * @param {Array} issues - 이슈 목록
         * @return {Array} 정렬된 이슈 목록
         */
        sortIssuesByPriority(issues) {
            // 심각도 점수
            const severityScores = {
                'critical': 4,
                'major': 3,
                'minor': 2,
                'info': 1
            };
            
            // 카테고리 가중치 적용 및 정렬
            return issues.sort((a, b) => {
                // 심각도 비교 (높은 심각도 우선)
                const severityDiff = (severityScores[b.severity] || 0) - (severityScores[a.severity] || 0);
                if (severityDiff !== 0) {
                    return severityDiff;
                }
                
                // 카테고리 가중치 비교 (높은 가중치 우선)
                const weightA = this.weights[a.category] || 0;
                const weightB = this.weights[b.category] || 0;
                
                return weightB - weightA;
            });
        }
        
        /**
         * 권장사항 생성
         * @param {Object} moduleResults - 모듈별 분석 결과
         * @return {Array} 권장사항 목록
         */
        generateRecommendations(moduleResults) {
            // 주요 이슈에서 권장사항 추출
            return this.results.topIssues.map(issue => {
                return {
                    category: issue.category,
                    categoryName: issue.categoryName,
                    subCategory: issue.subCategory,
                    severity: issue.severity,
                    message: issue.message,
                    solution: issue.solution || '해당 문제에 대한 구체적인 해결 방법을 찾아보세요.',
                    priority: this.calculateRecommendationPriority(issue)
                };
            });
        }
        
        /**
         * 권장사항 우선순위 계산
         * @param {Object} issue - 이슈 객체
         * @return {number} 우선순위 점수 (높을수록 중요)
         */
        calculateRecommendationPriority(issue) {
            let priorityScore = 0;
            
            // 심각도에 따른 점수
            switch (issue.severity) {
                case 'critical':
                    priorityScore += 40;
                    break;
                case 'major':
                    priorityScore += 30;
                    break;
                case 'minor':
                    priorityScore += 20;
                    break;
                case 'info':
                    priorityScore += 10;
                    break;
                default:
                    priorityScore += 0;
            }
            
            // 카테고리 가중치 반영
            const categoryWeight = this.weights[issue.category] || 0;
            priorityScore += categoryWeight * 20;
            
            // 해당 카테고리의 점수가 낮을수록 더 중요
            const categoryScore = this.results.categoryScores[issue.category] || 0;
            priorityScore += Math.max(0, (100 - categoryScore) / 10);
            
            return Math.round(priorityScore);
        }
        
        /**
         * 카테고리 점수에 따른 등급 계산
         * @param {number} score - 점수
         * @return {string} 등급 (A, B, C, D, F)
         */
        getGradeFromScore(score) {
            if (score >= 90) return 'A';
            if (score >= 80) return 'B';
            if (score >= 70) return 'C';
            if (score >= 50) return 'D';
            return 'F';
        }
        
        /**
         * 등급별 텍스트 색상 반환
         * @param {string} grade - 등급
         * @return {string} 색상 코드
         */
        getColorFromGrade(grade) {
            switch (grade) {
                case 'A': return '#4CAF50'; // 초록
                case 'B': return '#8BC34A'; // 연한 초록
                case 'C': return '#FFC107'; // 노랑
                case 'D': return '#FF9800'; // 주황
                case 'F': return '#F44336'; // 빨강
                default: return '#9E9E9E'; // 회색
            }
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.report = {
        /**
         * 종합 보고서 생성
         * @param {Document} [doc] - 분석할 문서
         * @return {Object} 종합 보고서
         */
        generate: function(doc) {
            doc = doc || document;
            
            const generator = new ReportGenerator(doc);
            return generator.generateReport();
        },
        
        /**
         * 종합 보고서에서 주요 이슈만 추출
         * @param {Object} report - 종합 보고서
         * @param {number} [limit=10] - 최대 이슈 수
         * @return {Array} 주요 이슈 목록
         */
        getTopIssues: function(report, limit = 10) {
            if (!report || !Array.isArray(report.topIssues)) {
                return [];
            }
            
            return report.topIssues.slice(0, limit);
        },
        
        /**
         * 종합 보고서에서 권장사항만 추출
         * @param {Object} report - 종합 보고서
         * @param {number} [limit=10] - 최대 권장사항 수
         * @return {Array} 권장사항 목록
         */
        getRecommendations: function(report, limit = 10) {
            if (!report || !Array.isArray(report.recommendations)) {
                return [];
            }
            
            return report.recommendations.slice(0, limit);
        },
        
        /**
         * 우선순위별로 권장사항 분류
         * @param {Object} report - 종합 보고서
         * @return {Object} 우선순위별 권장사항
         */
        getPrioritizedRecommendations: function(report) {
            if (!report || !Array.isArray(report.recommendations)) {
                return { high: [], medium: [], low: [] };
            }
            
            const prioritized = {
                high: [],
                medium: [],
                low: []
            };
            
            report.recommendations.forEach(rec => {
                const priority = rec.priority || 0;
                
                if (priority >= 60) {
                    prioritized.high.push(rec);
                } else if (priority >= 30) {
                    prioritized.medium.push(rec);
                } else {
                    prioritized.low.push(rec);
                }
            });
            
            return prioritized;
        },
        
        /**
         * 보고서를 서버에 저장
         * @param {Object} report - 종합 보고서
         * @param {string} url - 분석된 URL
         * @return {Promise<Object>} 저장 결과
         */
        saveToServer: async function(report, url) {
            // ReportService 확인
            if (!window.ReportService) {
                console.error('ReportService가 로드되지 않았습니다.');
                return { success: false, error: 'ReportService 모듈을 찾을 수 없습니다.' };
            }
            
            // 서버 측 분석 요청
            const reportService = new window.ReportService();
            
            try {
                // 저장 데이터 준비
                const reportData = {
                    url: url,
                    timestamp: new Date().toISOString(),
                    overall_score: report.score,
                    performance: report.details.performance,
                    mobile: report.details.mobile,
                    security: report.details.security,
                    summary: report.summary,
                    prioritized_recommendations: this.getPrioritizedRecommendations(report)
                };
                
                // 서버 측 분석 요청 (옵션)
                try {
                    const serverAnalysis = await reportService.requestServerAnalysis(url);
                    if (!serverAnalysis.error) {
                        reportData.server_analysis = serverAnalysis.server_analysis;
                    }
                } catch (e) {
                    logger.warn('서버 측 분석에 실패했습니다.', e);
                }
                
                // 보고서 저장
                const result = await reportService.saveReport(reportData);
                
                if (result.success) {
                    logger.debug('보고서가 서버에 저장되었습니다. ID: ' + result.id);
                    return { success: true, id: result.id };
                } else {
                    throw new Error(result.error || '보고서 저장에 실패했습니다.');
                }
            } catch (error) {
                logger.error('보고서 저장 오류:', error);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * 저장된 보고서 불러오기
         * @param {string} id - 보고서 ID
         * @return {Promise<Object>} 보고서 데이터
         */
        loadFromServer: async function(id) {
            // ReportService 확인
            if (!window.ReportService) {
                console.error('ReportService가 로드되지 않았습니다.');
                return { error: 'ReportService 모듈을 찾을 수 없습니다.' };
            }
            
            const reportService = new window.ReportService();
            
            try {
                return await reportService.getReport(id);
            } catch (error) {
                logger.error('보고서 불러오기 오류:', error);
                return { error: error.message };
            }
        },
        
        /**
         * 보고서 공유하기
         * @param {string} reportId - 보고서 ID
         * @param {Object} [options] - 공유 옵션 (만료 시간 등)
         * @return {Promise<Object>} 공유 결과
         */
        shareReport: async function(reportId, options = {}) {
            // ReportService 확인
            if (!window.ReportService) {
                console.error('ReportService가 로드되지 않았습니다.');
                return { success: false, error: 'ReportService 모듈을 찾을 수 없습니다.' };
            }
            
            const reportService = new window.ReportService();
            
            try {
                const result = await reportService.shareReport(reportId, options);
                
                if (result.success) {
                    logger.debug('보고서가 공유되었습니다. 공유 URL: ' + result.url);
                }
                
                return result;
            } catch (error) {
                logger.error('보고서 공유 오류:', error);
                return { success: false, error: error.message };
            }
        }
    };
    
    logger.debug('종합 보고서 생성 모듈 초기화 완료');
})();