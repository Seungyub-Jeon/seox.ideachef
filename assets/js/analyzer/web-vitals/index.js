/**
 * Core Web Vitals 분석 모듈
 * 
 * LCP, FID, CLS 메트릭을 측정하고 분석하여 웹 페이지의 사용자 경험을 개선하기 위한 권장사항을 제공합니다.
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
    
    // 컴포넌트 로드 확인
    const requiredComponents = [
        'metrics-collector',
        'element-analyzer',
        'recommendation-engine',
        'specialCaseHandler'
    ];
    
    for (const component of requiredComponents) {
        if (!window.KoreanWebAnalyzer.analyzer.webVitals?.[component]) {
            logger.error(`Core Web Vitals 컴포넌트가 로드되지 않았습니다: ${component}`);
        }
    }
    
    /**
     * Core Web Vitals 분석기 클래스
     */
    class CoreWebVitalsAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         * @param {Object} options - 분석 옵션
         */
        constructor(document, options = {}) {
            this.doc = document;
            this.options = options;
            this.results = {
                lcp: { score: 0, value: 0, displayValue: '0 ms', issues: [] },
                fid: { score: 0, value: 0, displayValue: '0 ms', issues: [] },
                cls: { score: 0, value: 0, displayValue: '0', issues: [] },
                overall: { score: 0, issues: [] }
            };
            
            // 컴포넌트 초기화
            this.metricsCollector = new window.KoreanWebAnalyzer.analyzer.webVitals.metricsCollector(this.doc, this.options);
            this.elementAnalyzer = new window.KoreanWebAnalyzer.analyzer.webVitals.elementAnalyzer(this.doc, this.options);
            this.recommendationEngine = new window.KoreanWebAnalyzer.analyzer.webVitals.recommendationEngine(this.doc, this.options);
            this.specialCaseHandler = window.KoreanWebAnalyzer.analyzer.webVitals.specialCaseHandler(this.doc, this.options);
        }
        
        /**
         * Core Web Vitals 분석 수행
         * @return {Object} 분석 결과
         */
        async analyze() {
            logger.debug('Core Web Vitals 분석 시작');
            
            try {
                // 메트릭 수집
                const metrics = await this.metricsCollector.collectMetrics();
                logger.debug('메트릭 수집 완료', metrics);
                
                // 각 메트릭 분석 및 점수 계산
                this.processLCP(metrics.lcp);
                this.processFID(metrics.fid);
                this.processCLS(metrics.cls);
                
                // 종합 점수 계산
                this.calculateOverallScore();
                
                logger.debug('Core Web Vitals 분석 완료', this.results);
                
                return {
                    score: this.results.overall.score,
                    details: this.results
                };
            } catch (error) {
                logger.error('Core Web Vitals 분석 중 오류 발생', error);
                return {
                    score: 0,
                    details: this.results,
                    error: error.message
                };
            }
        }
        
        /**
         * LCP 메트릭 처리
         * @param {Object} lcpData - LCP 측정 데이터
         */
        processLCP(lcpData) {
            if (!lcpData) return;
            
            // 기본 메트릭 정보 설정
            this.results.lcp.value = lcpData.value;
            this.results.lcp.displayValue = `${Math.round(lcpData.value)} ms`;
            this.results.lcp.score = this.mapScoreToPercentage(lcpData.score);
            
            // LCP 요소 분석
            const lcpElement = lcpData.element;
            if (lcpElement) {
                const elementAnalysis = this.elementAnalyzer.analyzeLCPElement(lcpElement);
                
                // 이슈 추가
                if (elementAnalysis.issues && elementAnalysis.issues.length > 0) {
                    this.results.lcp.issues = elementAnalysis.issues;
                }
                
                // 요소 정보 추가
                this.results.lcp.element = {
                    type: lcpElement.tagName,
                    id: lcpElement.id,
                    className: lcpElement.className,
                    src: lcpElement.src || lcpElement.currentSrc || null,
                    size: elementAnalysis.size || null
                };
                
                // 추천사항 생성
                const recommendations = this.recommendationEngine.getLCPRecommendations(elementAnalysis);
                if (recommendations && recommendations.length > 0) {
                    this.results.lcp.recommendations = recommendations;
                }
            }
            
            // 특수 케이스 처리
            const processedData = this.specialCaseHandler.handleLCPSpecialCases({
                value: this.results.lcp.value,
                score: this.scoreToString(this.results.lcp.score),
                element: lcpElement,
                recommendations: this.results.lcp.recommendations
            });
            
            // 처리된 데이터로 결과 업데이트
            if (processedData) {
                this.results.lcp.value = processedData.value;
                this.results.lcp.displayValue = `${Math.round(processedData.value)} ms`;
                this.results.lcp.score = this.mapScoreToPercentage(processedData.score);
                this.results.lcp.recommendations = processedData.recommendations;
            }
        }
        
        /**
         * 점수 문자열로 변환
         * @param {number} score - 0-100 사이의 점수
         * @return {string} 'good', 'needs-improvement', 'poor' 중 하나
         */
        scoreToString(score) {
            if (score >= 90) return 'good';
            if (score >= 50) return 'needs-improvement';
            return 'poor';
        }
        
        /**
         * FID 메트릭 처리
         * @param {Object} fidData - FID 측정 데이터
         */
        processFID(fidData) {
            if (!fidData) return;
            
            // 기본 메트릭 정보 설정
            this.results.fid.value = fidData.value;
            this.results.fid.displayValue = `${Math.round(fidData.value)} ms`;
            this.results.fid.score = this.mapScoreToPercentage(fidData.score);
            
            // 관련 요소 분석
            const elementAnalysis = this.elementAnalyzer.analyzeFIDElements();
            
            // 이슈 추가
            if (elementAnalysis.issues && elementAnalysis.issues.length > 0) {
                this.results.fid.issues = elementAnalysis.issues;
            }
            
            // 요소 정보 추가
            if (elementAnalysis.elements && elementAnalysis.elements.length > 0) {
                this.results.fid.elements = elementAnalysis.elements.map(elem => ({
                    type: elem.tagName,
                    id: elem.id,
                    className: elem.className,
                    eventType: elem.eventType || null,
                    listeners: elem.listeners || 0
                }));
            }
            
            // 추천사항 생성
            const recommendations = this.recommendationEngine.getFIDRecommendations(elementAnalysis);
            if (recommendations && recommendations.length > 0) {
                this.results.fid.recommendations = recommendations;
            }
            
            // 특수 케이스 처리
            const processedData = this.specialCaseHandler.handleFIDSpecialCases({
                value: this.results.fid.value,
                score: this.scoreToString(this.results.fid.score),
                recommendations: this.results.fid.recommendations
            });
            
            // 처리된 데이터로 결과 업데이트
            if (processedData) {
                this.results.fid.value = processedData.value;
                this.results.fid.displayValue = `${Math.round(processedData.value)} ms`;
                this.results.fid.score = this.mapScoreToPercentage(processedData.score);
                this.results.fid.recommendations = processedData.recommendations;
            }
        }
        
        /**
         * CLS 메트릭 처리
         * @param {Object} clsData - CLS 측정 데이터
         */
        processCLS(clsData) {
            if (!clsData) return;
            
            // 기본 메트릭 정보 설정
            this.results.cls.value = clsData.value;
            this.results.cls.displayValue = clsData.value.toFixed(3);
            this.results.cls.score = this.mapScoreToPercentage(clsData.score);
            
            // 관련 요소 분석
            const elementAnalysis = this.elementAnalyzer.analyzeCLSElements(clsData.elements || []);
            
            // 이슈 추가
            if (elementAnalysis.issues && elementAnalysis.issues.length > 0) {
                this.results.cls.issues = elementAnalysis.issues;
            }
            
            // 요소 정보 추가
            if (elementAnalysis.elements && elementAnalysis.elements.length > 0) {
                this.results.cls.elements = elementAnalysis.elements.map(elem => ({
                    type: elem.tagName,
                    id: elem.id,
                    className: elem.className,
                    shiftValue: elem.shiftValue || null
                }));
            }
            
            // 추천사항 생성
            const recommendations = this.recommendationEngine.getCLSRecommendations(elementAnalysis);
            if (recommendations && recommendations.length > 0) {
                this.results.cls.recommendations = recommendations;
            }
            
            // 특수 케이스 처리
            const processedData = this.specialCaseHandler.handleCLSSpecialCases({
                value: this.results.cls.value,
                score: this.scoreToString(this.results.cls.score),
                elements: clsData.elements || [],
                recommendations: this.results.cls.recommendations
            });
            
            // 처리된 데이터로 결과 업데이트
            if (processedData) {
                this.results.cls.value = processedData.value;
                this.results.cls.displayValue = processedData.value.toFixed(3);
                this.results.cls.score = this.mapScoreToPercentage(processedData.score);
                this.results.cls.recommendations = processedData.recommendations;
            }
        }
        
        /**
         * 종합 점수 계산
         */
        calculateOverallScore() {
            // 각 메트릭의 가중치 설정
            const weights = {
                lcp: 0.25,  // LCP: 25%
                fid: 0.3,   // FID: 30%
                cls: 0.45   // CLS: 45%
            };
            
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 가중치를 적용하여 점수 계산
            for (const [metric, weight] of Object.entries(weights)) {
                if (this.results[metric].score > 0) {
                    weightedScore += this.results[metric].score * weight;
                    totalWeight += weight;
                }
            }
            
            // 최종 점수 계산 (0-100 사이)
            this.results.overall.score = totalWeight > 0 
                ? Math.round(weightedScore / totalWeight) 
                : 0;
            
            // 전체 상태 평가
            let status = 'poor';
            if (this.results.overall.score >= 90) {
                status = 'good';
            } else if (this.results.overall.score >= 50) {
                status = 'needs-improvement';
            }
            
            this.results.overall.status = status;
            
            // 종합 개선 권장사항 추가
            this.results.overall.recommendations = 
                this.recommendationEngine.getTopRecommendations([
                    ...(this.results.lcp.recommendations || []),
                    ...(this.results.fid.recommendations || []),
                    ...(this.results.cls.recommendations || [])
                ]);
                
            // 특수 케이스 최종 처리
            const finalResults = this.specialCaseHandler.finalizeResults(this.results);
            if (finalResults) {
                this.results = finalResults;
            }
        }
        
        /**
         * 점수를 백분율로 변환
         * @param {string} score - 'good', 'needs-improvement', 'poor' 중 하나
         * @return {number} 0-100 사이의 점수
         */
        mapScoreToPercentage(score) {
            switch (score) {
                case 'good': return 100;
                case 'needs-improvement': return 50;
                case 'poor': return 0;
                default: return 0;
            }
        }
    }
    
    // 모듈 등록
    if (!window.KoreanWebAnalyzer.analyzer.webVitals) {
        window.KoreanWebAnalyzer.analyzer.webVitals = {};
    }
    
    window.KoreanWebAnalyzer.analyzer.webVitals.analyze = function(doc, options) {
        doc = doc || document;
        
        const analyzer = new CoreWebVitalsAnalyzer(doc, options);
        return analyzer.analyze();
    };
    
    // 퍼포먼스 모듈과 통합
    if (window.KoreanWebAnalyzer.analyzer.performance) {
        // 기존 PerformanceAnalyzer 클래스의 메서드 확장
        const originalAnalyze = window.KoreanWebAnalyzer.analyzer.performance.analyze;
        
        window.KoreanWebAnalyzer.analyzer.performance.analyze = async function(doc) {
            // 기존 성능 분석 수행
            const performanceResults = originalAnalyze(doc);
            
            try {
                // Core Web Vitals 분석 수행
                const webVitalsResults = await window.KoreanWebAnalyzer.analyzer.webVitals.analyze(doc);
                
                // 결과 통합
                performanceResults.details.webVitals = webVitalsResults.details;
                
                // 종합 점수 재계산 (성능 75%, Web Vitals 25%)
                performanceResults.score = Math.round(
                    (performanceResults.score * 0.75) + (webVitalsResults.score * 0.25)
                );
                
                logger.debug('성능 및 Core Web Vitals 분석 완료', performanceResults);
            } catch (error) {
                logger.error('Core Web Vitals 통합 중 오류 발생', error);
            }
            
            return performanceResults;
        };
    }
    
    logger.debug('Core Web Vitals 분석 모듈 초기화 완료');
})();