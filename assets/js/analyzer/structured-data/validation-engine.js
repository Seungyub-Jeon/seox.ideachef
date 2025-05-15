/**
 * 구조화 데이터 검증 엔진
 * 
 * 추출된 구조화 데이터를 검증하고 상세 분석 보고서를 생성합니다.
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
    
    if (!window.KoreanWebAnalyzer.analyzer.structuredData) {
        window.KoreanWebAnalyzer.analyzer.structuredData = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 검증 엔진 클래스
     */
    class ValidationEngine {
        /**
         * 생성자
         * @param {Object} options - 검증 옵션
         */
        constructor(options = {}) {
            this.options = options;
            this.validator = window.KoreanWebAnalyzer.analyzer.structuredData.schemaValidator(options);
            
            // 검증 통계 초기화
            this.stats = {
                totalItems: 0,
                validItems: 0,
                totalErrors: 0,
                totalWarnings: 0,
                formatStats: {
                    'json-ld': { items: 0, errors: 0, warnings: 0 },
                    'microdata': { items: 0, errors: 0, warnings: 0 },
                    'rdfa': { items: 0, errors: 0, warnings: 0 }
                },
                typeStats: {} // 타입별 통계
            };
            
            // 검증 결과 초기화
            this.results = {
                valid: false,
                score: 0,
                validationResults: [],
                stats: this.stats,
                summary: {
                    errors: [],
                    warnings: [],
                    suggestions: []
                }
            };
        }
        
        /**
         * 구조화 데이터 항목 배열 검증
         * @param {Array} items - 구조화 데이터 항목 배열
         * @return {Object} 검증 결과
         */
        validateItems(items) {
            if (!items || !Array.isArray(items)) {
                this.results.summary.errors.push({
                    message: '검증할 구조화 데이터가 없습니다.',
                    code: 'no-structured-data'
                });
                return this.results;
            }
            
            // 통계 초기화
            this.stats.totalItems = items.length;
            
            // 각 항목 검증
            items.forEach((item, index) => {
                // 파싱 오류가 있는 항목은 무시
                if (item._error) {
                    this.stats.totalErrors++;
                    
                    const format = item._format || 'unknown';
                    if (this.stats.formatStats[format]) {
                        this.stats.formatStats[format].items++;
                        this.stats.formatStats[format].errors++;
                    }
                    
                    this.results.validationResults.push({
                        index,
                        format,
                        valid: false,
                        error: item._message,
                        item: item._raw || item
                    });
                    
                    return;
                }
                
                // 형식 추적
                const format = item._format || 'unknown';
                if (this.stats.formatStats[format]) {
                    this.stats.formatStats[format].items++;
                }
                
                // 타입 추적
                const types = this._getItemTypes(item);
                types.forEach(type => {
                    if (!this.stats.typeStats[type]) {
                        this.stats.typeStats[type] = { items: 0, errors: 0, warnings: 0 };
                    }
                    this.stats.typeStats[type].items++;
                });
                
                // 항목 검증
                const validation = this.validator.validate(item);
                
                // 결과 기록
                this.results.validationResults.push({
                    index,
                    format,
                    types,
                    valid: validation.valid,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    item
                });
                
                // 통계 업데이트
                if (validation.valid) {
                    this.stats.validItems++;
                }
                
                this.stats.totalErrors += validation.errors.length;
                this.stats.totalWarnings += validation.warnings.length;
                
                if (this.stats.formatStats[format]) {
                    this.stats.formatStats[format].errors += validation.errors.length;
                    this.stats.formatStats[format].warnings += validation.warnings.length;
                }
                
                // 타입별 통계 업데이트
                types.forEach(type => {
                    if (this.stats.typeStats[type]) {
                        this.stats.typeStats[type].errors += validation.errors.length;
                        this.stats.typeStats[type].warnings += validation.warnings.length;
                    }
                });
            });
            
            // 점수 계산
            this._calculateScore();
            
            // 요약 생성
            this._generateSummary();
            
            return this.results;
        }
        
        /**
         * 항목의 스키마 타입 가져오기
         * @param {Object} item - 구조화 데이터 항목
         * @return {Array} 타입 배열
         */
        _getItemTypes(item) {
            if (!item['@type']) {
                return ['UnknownType'];
            }
            
            return Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        }
        
        /**
         * 검증 점수 계산
         */
        _calculateScore() {
            // 기본 점수: 전체 항목 중 유효한 항목 비율
            let score = this.stats.totalItems > 0 
                ? (this.stats.validItems / this.stats.totalItems) * 100 
                : 0;
            
            // 오류 수에 따른 감점
            const errorPenalty = Math.min(50, this.stats.totalErrors * 5);
            score = Math.max(0, score - errorPenalty);
            
            // 경고 수에 따른 감점
            const warningPenalty = Math.min(25, this.stats.totalWarnings * 2);
            score = Math.max(0, score - warningPenalty);
            
            // 최종 점수 설정
            this.results.score = Math.round(score);
            
            // 최종 유효성 상태 설정
            this.results.valid = this.stats.validItems > 0 && this.stats.totalErrors === 0;
        }
        
        /**
         * 검증 요약 생성
         */
        _generateSummary() {
            // 공통 오류 집계 (중복 제거)
            const errorCodes = new Set();
            const warningCodes = new Set();
            
            this.results.validationResults.forEach(result => {
                if (result.errors) {
                    result.errors.forEach(error => {
                        errorCodes.add(error.code);
                    });
                }
                
                if (result.warnings) {
                    result.warnings.forEach(warning => {
                        warningCodes.add(warning.code);
                    });
                }
            });
            
            // 주요 오류 요약
            if (errorCodes.size > 0) {
                this.results.summary.errors.push({
                    message: `${errorCodes.size}가지 유형의 오류가 발견되었습니다.`,
                    code: 'multiple-error-types',
                    count: errorCodes.size
                });
            }
            
            // 형식별 오류 요약
            for (const [format, stats] of Object.entries(this.stats.formatStats)) {
                if (stats.items > 0 && stats.errors > 0) {
                    const formatName = this._getFormatDisplayName(format);
                    
                    this.results.summary.errors.push({
                        message: `${formatName} 형식에서 ${stats.errors}개의 오류가 발견되었습니다.`,
                        code: `${format}-errors`,
                        format,
                        count: stats.errors
                    });
                }
            }
            
            // 필수 속성 누락 요약
            this._summarizePropertyIssues('missing-required-property', '필수 속성 누락');
            
            // 타입별 통계 분석
            this._analyzeTypeStats();
            
            // 형식별 제안
            this._generateFormatSuggestions();
            
            // 성능 제안
            this._generatePerformanceSuggestions();
        }
        
        /**
         * 속성 문제 요약
         * @param {string} code - 문제 코드
         * @param {string} label - 문제 레이블
         */
        _summarizePropertyIssues(code, label) {
            // 해당 코드의 모든 오류 수집
            const issues = [];
            
            this.results.validationResults.forEach(result => {
                if (result.errors) {
                    result.errors.forEach(error => {
                        if (error.code === code) {
                            issues.push(error);
                        }
                    });
                }
            });
            
            if (issues.length === 0) {
                return;
            }
            
            // 타입별 누락 속성 집계
            const typePropsMap = {};
            
            issues.forEach(issue => {
                const type = issue.type;
                const prop = issue.property;
                
                if (!type || !prop) return;
                
                if (!typePropsMap[type]) {
                    typePropsMap[type] = new Set();
                }
                
                typePropsMap[type].add(prop);
            });
            
            // 요약 메시지 생성
            for (const [type, props] of Object.entries(typePropsMap)) {
                if (props.size > 0) {
                    const propList = Array.from(props).join(', ');
                    
                    this.results.summary.warnings.push({
                        message: `'${type}' 타입에서 필수 속성이 누락되었습니다: ${propList}`,
                        code: code,
                        type,
                        properties: Array.from(props)
                    });
                }
            }
        }
        
        /**
         * 타입 통계 분석
         */
        _analyzeTypeStats() {
            // 특정 중요 타입 확인
            const specialTypes = {
                'Organization': '조직', 
                'LocalBusiness': '지역 비즈니스',
                'Product': '제품', 
                'BreadcrumbList': '브레드크럼',
                'Article': '기사', 
                'BlogPosting': '블로그 게시물',
                'FAQPage': 'FAQ 페이지', 
                'WebPage': '웹 페이지'
            };
            
            // 검색 결과에 중요한 타입이 있는지 확인
            for (const [type, label] of Object.entries(specialTypes)) {
                if (this.stats.typeStats[type] && this.stats.typeStats[type].items > 0) {
                    const stats = this.stats.typeStats[type];
                    
                    // 오류가 있으면 경고
                    if (stats.errors > 0) {
                        this.results.summary.warnings.push({
                            message: `'${label}' 타입에서 ${stats.errors}개의 오류가 발견되었습니다.`,
                            code: `${type.toLowerCase()}-errors`,
                            type,
                            count: stats.errors
                        });
                    }
                }
            }
            
            // 알려지지 않은 타입 확인
            if (this.stats.typeStats['UnknownType'] && this.stats.typeStats['UnknownType'].items > 0) {
                this.results.summary.warnings.push({
                    message: `타입이 지정되지 않은 구조화 데이터가 ${this.stats.typeStats['UnknownType'].items}개 있습니다.`,
                    code: 'unknown-type-items',
                    count: this.stats.typeStats['UnknownType'].items
                });
            }
        }
        
        /**
         * 형식별 제안 생성
         */
        _generateFormatSuggestions() {
            // 형식 선호도 제안
            const formatCounts = {};
            let totalItems = 0;
            
            for (const [format, stats] of Object.entries(this.stats.formatStats)) {
                if (stats.items > 0) {
                    formatCounts[format] = stats.items;
                    totalItems += stats.items;
                }
            }
            
            if (totalItems === 0) {
                this.results.summary.suggestions.push({
                    message: '구조화 데이터를 구현하여 검색 결과에 리치 스니펫으로 표시될 수 있습니다. JSON-LD 형식이 권장됩니다.',
                    code: 'add-structured-data'
                });
                return;
            }
            
            // 여러 형식이 섞여 있고 JSON-LD가 아니면 JSON-LD 권장
            if (Object.keys(formatCounts).length > 1 && (!formatCounts['json-ld'] || formatCounts['json-ld'] < totalItems / 2)) {
                this.results.summary.suggestions.push({
                    message: '여러 구조화 데이터 형식이 혼합되어 있습니다. Google에서 권장하는 JSON-LD 형식으로 통일하는 것이 좋습니다.',
                    code: 'use-jsonld-format'
                });
            }
            // Microdata 또는 RDFa만 사용 중이면 JSON-LD 고려 제안
            else if (!formatCounts['json-ld'] && (formatCounts['microdata'] > 0 || formatCounts['rdfa'] > 0)) {
                this.results.summary.suggestions.push({
                    message: '현재 JSON-LD 형식을 사용하지 않고 있습니다. Google에서는 JSON-LD 형식을 권장합니다.',
                    code: 'consider-jsonld-format'
                });
            }
        }
        
        /**
         * 성능 관련 제안 생성
         */
        _generatePerformanceSuggestions() {
            // 항목 수가 많은 경우 최적화 제안
            if (this.stats.totalItems > 10) {
                this.results.summary.suggestions.push({
                    message: '구조화 데이터 항목이 많습니다. 중복을 제거하고 필요한 항목만 유지하세요.',
                    code: 'optimize-structured-data-count'
                });
            }
            
            // 중첩 깊이가 깊은 항목 감지
            let hasDeepNesting = false;
            
            this.results.validationResults.forEach(result => {
                const nestingDepth = this._calculateNestingDepth(result.item);
                if (nestingDepth > 5) {
                    hasDeepNesting = true;
                }
            });
            
            if (hasDeepNesting) {
                this.results.summary.suggestions.push({
                    message: '일부 구조화 데이터의 중첩 깊이가 깊습니다. 구조를 단순화하면 파싱 성능이 향상될 수 있습니다.',
                    code: 'reduce-nesting-depth'
                });
            }
        }
        
        /**
         * 객체의 중첩 깊이 계산
         * @param {Object} obj - 검사할 객체
         * @return {number} 중첩 깊이
         */
        _calculateNestingDepth(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 10) {
                return depth;
            }
            
            let maxDepth = depth;
            
            for (const key in obj) {
                if (key.startsWith('@') || key.startsWith('_')) {
                    continue;
                }
                
                const value = obj[key];
                
                if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value)) {
                        // 배열 항목의 최대 깊이 확인
                        for (const item of value) {
                            if (typeof item === 'object' && item !== null) {
                                const itemDepth = this._calculateNestingDepth(item, depth + 1);
                                maxDepth = Math.max(maxDepth, itemDepth);
                            }
                        }
                    } else {
                        // 객체의 깊이 확인
                        const nestedDepth = this._calculateNestingDepth(value, depth + 1);
                        maxDepth = Math.max(maxDepth, nestedDepth);
                    }
                }
            }
            
            return maxDepth;
        }
        
        /**
         * 형식 표시 이름 가져오기
         * @param {string} format - 형식 코드
         * @return {string} 형식 표시 이름
         */
        _getFormatDisplayName(format) {
            const formatNames = {
                'json-ld': 'JSON-LD',
                'microdata': 'Microdata',
                'rdfa': 'RDFa',
                'unknown': '알 수 없는 형식'
            };
            
            return formatNames[format] || format;
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.structuredData.validationEngine = function(options) {
        return new ValidationEngine(options);
    };
    
    logger.debug('구조화 데이터 검증 엔진 모듈 초기화 완료');
})();