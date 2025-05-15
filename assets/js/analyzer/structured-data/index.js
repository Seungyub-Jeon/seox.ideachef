/**
 * 구조화 데이터 분석 모듈
 * 웹페이지의 구조화 데이터(JSON-LD, Microdata, RDFa)를 감지, 추출, 분석합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData');

KoreanWebAnalyzer.analyzer.structuredData.index = (function() {
    'use strict';
    
    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('StructuredData');
    
    // 필요한 컴포넌트 가져오기
    const Analyzer = KoreanWebAnalyzer.analyzer.structuredData.Analyzer;
    const ReportGenerator = KoreanWebAnalyzer.analyzer.structuredData.ReportGenerator;
    const StructuredDataCharts = KoreanWebAnalyzer.ui.charts.StructuredDataCharts;
    
    /**
     * 웹페이지의 구조화 데이터를 분석합니다.
     * @param {Document} document - 분석할 문서 객체
     * @returns {Object} 분석 결과
     */
    function analyze(document) {
        logger.debug('구조화 데이터 분석 시작');
        
        try {
            // 분석기 생성 및 분석 실행
            const analyzer = new Analyzer(document);
            const result = analyzer.analyze();
            
            logger.debug('구조화 데이터 분석 완료', { score: result.score });
            
            return result;
        } catch (error) {
            logger.error('구조화 데이터 분석 중 오류 발생', error);
            
            return {
                score: 0,
                details: {
                    error: error.message,
                    hasStructuredData: false
                }
            };
        }
    }
    
    /**
     * 분석 결과를 HTML 보고서로 생성합니다.
     * @param {Object} result - 구조화 데이터 분석 결과
     * @returns {HTMLElement} 생성된 보고서 HTML 요소
     */
    function generateReport(result) {
        logger.debug('구조화 데이터 보고서 생성');
        
        try {
            // 보고서 생성기 생성 및 보고서 생성
            const reportGenerator = new ReportGenerator();
            const reportElement = reportGenerator.generateReport(result);
            
            // 차트 추가
            const chartContainer = document.createElement('div');
            chartContainer.className = 'structured-data-charts-container';
            
            // 점수 차트 추가
            const scoreChart = StructuredDataCharts.createScoreChart(result.score);
            chartContainer.appendChild(scoreChart);
            
            // 형식 분포 차트 (존재하는 경우만)
            if (result.details.hasStructuredData && result.details.formats) {
                const formatChart = StructuredDataCharts.createFormatBarChart(result.details.formats);
                chartContainer.appendChild(formatChart);
            }
            
            // 스키마 타입 분포 차트 (존재하는 경우만)
            if (result.details.hasStructuredData && 
                result.details.schemaTypes && 
                Object.keys(result.details.schemaTypes).length > 0) {
                const schemaTypeChart = StructuredDataCharts.createSchemaTypesPieChart(result.details.schemaTypes);
                chartContainer.appendChild(schemaTypeChart);
            }
            
            // 유효성 검증 레이더 차트 (검증 결과가 있는 경우만)
            if (result.details.hasStructuredData && result.details.validation) {
                const validationChart = StructuredDataCharts.createValidationRadarChart(result.details.validation);
                chartContainer.appendChild(validationChart);
            }
            
            // 차트 컨테이너를 보고서 상단에 추가
            reportElement.insertBefore(chartContainer, reportElement.firstChild);
            
            logger.debug('구조화 데이터 보고서 생성 완료');
            
            return reportElement;
        } catch (error) {
            logger.error('구조화 데이터 보고서 생성 중 오류 발생', error);
            
            // 오류 보고서 생성
            const errorContainer = document.createElement('div');
            errorContainer.className = 'structured-data-report error';
            errorContainer.innerHTML = `
                <div class="section-header">
                    <h3>구조화 데이터 분석</h3>
                </div>
                <div class="section-content">
                    <p class="error-message">보고서 생성 중 오류가 발생했습니다: ${error.message}</p>
                </div>
            `;
            
            return errorContainer;
        }
    }
    
    /**
     * SEO 분석 모듈에 결과를 제공합니다.
     * @param {Document} document - 분석할 문서 객체
     * @returns {Object} SEO 분석을 위한 결과 객체
     */
    function provideSEOData(document) {
        logger.debug('SEO 분석을 위한 구조화 데이터 정보 제공');
        
        try {
            // 분석기 생성 및 분석 실행
            const analyzer = new Analyzer(document);
            const result = analyzer.analyze();
            
            // SEO 분석에 필요한 정보만 추출
            return {
                score: result.score,
                hasStructuredData: result.details.hasStructuredData,
                formatCount: result.details.formats ? 
                    Object.values(result.details.formats).filter(f => f.found).length : 0,
                itemCount: result.details.items ? result.details.items.length : 0,
                schemaTypeCount: result.details.schemaTypes ? 
                    Object.keys(result.details.schemaTypes).length : 0,
                schemaTypes: result.details.schemaTypes || {},
                errorCount: result.details.validation ? 
                    result.details.validation.errors.length : 0,
                warningCount: result.details.validation ? 
                    result.details.validation.warnings.length : 0,
                recommendations: result.details.recommendations || []
            };
        } catch (error) {
            logger.error('SEO 데이터 제공 중 오류 발생', error);
            
            return {
                score: 0,
                hasStructuredData: false,
                error: error.message
            };
        }
    }
    
    // 공개 API
    return {
        analyze: analyze,
        generateReport: generateReport,
        provideSEOData: provideSEOData
    };
})();