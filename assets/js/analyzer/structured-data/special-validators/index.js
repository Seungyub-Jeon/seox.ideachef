/**
 * 특수 스키마 유형 검증기 모듈
 * 특정 Schema.org 타입을 위한 고급 검증기 모듈을 제공합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData.specialValidators');

KoreanWebAnalyzer.analyzer.structuredData.specialValidators.index = (function() {
    'use strict';
    
    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('SpecialValidators');
    
    // 검증기 클래스들
    const BreadcrumbValidator = KoreanWebAnalyzer.analyzer.structuredData.specialValidators.BreadcrumbValidator;
    const FAQValidator = KoreanWebAnalyzer.analyzer.structuredData.specialValidators.FAQValidator;
    const ProductValidator = KoreanWebAnalyzer.analyzer.structuredData.specialValidators.ProductValidator;
    
    /**
     * 특수 검증기 팩토리
     * 스키마 타입에 따라 적절한 검증기를 생성합니다.
     */
    function SpecialValidatorFactory() {
        // 지원하는 특수 스키마 타입
        this.supportedTypes = {
            'BreadcrumbList': BreadcrumbValidator,
            'FAQPage': FAQValidator,
            'Product': ProductValidator
        };
        
        // 검증 결과를 저장할 객체
        this.results = {
            validatedItems: 0,
            validItems: 0,
            invalidItems: 0,
            byType: {},
            errors: [],
            warnings: [],
            recommendations: []
        };
    }
    
    /**
     * 특정 타입에 대한 검증기가 있는지 확인합니다.
     * @param {string} schemaType - 확인할 스키마 타입
     * @returns {boolean} 해당 타입의 검증기 지원 여부
     */
    SpecialValidatorFactory.prototype.hasValidatorFor = function(schemaType) {
        return schemaType in this.supportedTypes;
    };
    
    /**
     * 스키마 타입에 적합한 검증기를 생성합니다.
     * @param {string} schemaType - 검증기를 생성할 스키마 타입
     * @returns {Object|null} 생성된 검증기 또는 null
     */
    SpecialValidatorFactory.prototype.createValidator = function(schemaType) {
        if (!this.hasValidatorFor(schemaType)) {
            return null;
        }
        
        const ValidatorClass = this.supportedTypes[schemaType];
        return new ValidatorClass();
    };
    
    /**
     * 구조화 데이터 항목을 검증합니다.
     * @param {Array} items - 검증할 구조화 데이터 항목 배열
     * @returns {Object} 검증 결과
     */
    SpecialValidatorFactory.prototype.validate = function(items) {
        logger.debug('특수 스키마 유형 검증 시작', { itemCount: items.length });
        
        // 결과 초기화
        this.results = {
            validatedItems: 0,
            validItems: 0,
            invalidItems: 0,
            byType: {},
            errors: [],
            warnings: [],
            recommendations: []
        };
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            logger.debug('검증할 항목이 없습니다');
            return this.results;
        }
        
        // 각 항목 검증
        items.forEach(item => {
            const schemaType = item['@type'];
            
            // 지원하는 타입인 경우에만 검증
            if (this.hasValidatorFor(schemaType)) {
                const validator = this.createValidator(schemaType);
                const validationResult = validator.validate(item);
                
                // 검증 결과 통계
                this.results.validatedItems++;
                
                if (validationResult.valid) {
                    this.results.validItems++;
                } else {
                    this.results.invalidItems++;
                }
                
                // 타입별 통계 업데이트
                if (!this.results.byType[schemaType]) {
                    this.results.byType[schemaType] = {
                        total: 0,
                        valid: 0,
                        errors: [],
                        warnings: [],
                        stats: validationResult.stats
                    };
                }
                
                this.results.byType[schemaType].total++;
                
                if (validationResult.valid) {
                    this.results.byType[schemaType].valid++;
                }
                
                // 오류 및 경고 수집
                validationResult.errors.forEach(error => {
                    const enhancedError = {
                        ...error,
                        schemaType,
                        itemId: item['@id'] || null
                    };
                    
                    this.results.errors.push(enhancedError);
                    this.results.byType[schemaType].errors.push(enhancedError);
                });
                
                validationResult.warnings.forEach(warning => {
                    const enhancedWarning = {
                        ...warning,
                        schemaType,
                        itemId: item['@id'] || null
                    };
                    
                    this.results.warnings.push(enhancedWarning);
                    this.results.byType[schemaType].warnings.push(enhancedWarning);
                });
                
                // 권장 사항 수집
                validationResult.recommendations.forEach(recommendation => {
                    const enhancedRecommendation = {
                        ...recommendation,
                        schemaType
                    };
                    
                    // 중복 권장 사항 방지
                    const isDuplicate = this.results.recommendations.some(
                        rec => rec.message === recommendation.message && rec.schemaType === schemaType
                    );
                    
                    if (!isDuplicate) {
                        this.results.recommendations.push(enhancedRecommendation);
                    }
                });
            }
        });
        
        // 중요도에 따라 권장 사항 정렬
        this.results.recommendations.sort((a, b) => {
            const importanceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
            return importanceOrder[a.importance] - importanceOrder[b.importance];
        });
        
        logger.debug('특수 스키마 유형 검증 완료', {
            validItems: this.results.validItems,
            invalidItems: this.results.invalidItems,
            errorCount: this.results.errors.length,
            warningCount: this.results.warnings.length
        });
        
        return this.results;
    };
    
    return {
        SpecialValidatorFactory: SpecialValidatorFactory,
        
        /**
         * 검증기 팩토리 인스턴스를 생성합니다.
         * @returns {SpecialValidatorFactory} 검증기 팩토리 인스턴스
         */
        createFactory: function() {
            return new SpecialValidatorFactory();
        },
        
        /**
         * 구조화 데이터를 검증합니다.
         * @param {Array} items - 검증할 구조화 데이터 항목 배열
         * @returns {Object} 검증 결과
         */
        validateItems: function(items) {
            const factory = new SpecialValidatorFactory();
            return factory.validate(items);
        }
    };
})();