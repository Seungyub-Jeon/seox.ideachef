/**
 * StructuredDataAnalyzer - 구조화 데이터 분석 모듈
 * 웹페이지의 구조화 데이터(JSON-LD, Microdata, RDFa)를 감지, 추출, 분석합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData');

KoreanWebAnalyzer.analyzer.structuredData.Analyzer = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('StructuredDataAnalyzer');
    
    // 요소 가져오기
    const JSONLDParser = KoreanWebAnalyzer.analyzer.structuredData.JSONLDParser;
    const MicrodataParser = KoreanWebAnalyzer.analyzer.structuredData.MicrodataParser;
    const RDFaParser = KoreanWebAnalyzer.analyzer.structuredData.RDFaParser;
    const SchemaValidator = KoreanWebAnalyzer.analyzer.structuredData.SchemaValidator;
    const ValidationEngine = KoreanWebAnalyzer.analyzer.structuredData.ValidationEngine;
    const SpecialValidators = KoreanWebAnalyzer.analyzer.structuredData.specialValidators.index;

    /**
     * StructuredDataAnalyzer 생성자
     * @param {Document} document - 분석할 문서 객체
     */
    function StructuredDataAnalyzer(document) {
        this.doc = document;
        this.parsers = {
            jsonld: new JSONLDParser(document),
            microdata: new MicrodataParser(document),
            rdfa: new RDFaParser(document)
        };
        this.validator = new SchemaValidator();
        this.validationEngine = new ValidationEngine();
        this.specialValidatorsFactory = SpecialValidators.createFactory();
        
        // 분석 결과를 저장할 객체
        this.results = {
            hasStructuredData: false,
            score: 0,
            formats: {
                jsonld: { found: false, items: 0 },
                microdata: { found: false, items: 0 },
                rdfa: { found: false, items: 0 }
            },
            items: [],
            schemaTypes: {},
            validation: {
                valid: 0,
                errors: 0,
                warnings: 0
            },
            specialValidation: null,
            recommendations: []
        };
    }

    /**
     * 웹페이지의 구조화 데이터를 분석합니다.
     * @returns {Object} 분석 결과
     */
    StructuredDataAnalyzer.prototype.analyze = function() {
        logger.debug('구조화 데이터 분석 시작');
        
        try {
            // 데이터 추출
            this._detectAndExtractData();
            
            // 데이터 유효성 검증
            this._validateData();
            
            // 특수 스키마 유형 검증
            this._validateSpecialTypes();
            
            // 데이터 요약
            this._summarizeData();
            
            // 스키마 타입 집계
            this._collectSchemaTypes();
            
            // 점수 계산
            this._calculateScore();
            
            // 권장 사항 생성
            this._generateRecommendations();
            
            logger.debug('구조화 데이터 분석 완료', this.results);
            
            return {
                score: this.results.score,
                details: this.results
            };
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
    };

    /**
     * 모든 형식의 구조화 데이터를 감지하고 추출합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._detectAndExtractData = function() {
        logger.debug('구조화 데이터 감지 및 추출');
        
        // JSON-LD 감지 및 추출
        const hasJsonLd = this.parsers.jsonld.detect();
        this.results.formats.jsonld.found = hasJsonLd;
        
        if (hasJsonLd) {
            const jsonLdData = this.parsers.jsonld.extract();
            this.results.items = this.results.items.concat(jsonLdData);
            this.results.formats.jsonld.items = jsonLdData.length;
        }
        
        // Microdata 감지 및 추출
        const hasMicrodata = this.parsers.microdata.detect();
        this.results.formats.microdata.found = hasMicrodata;
        
        if (hasMicrodata) {
            const microdataData = this.parsers.microdata.extract();
            this.results.items = this.results.items.concat(microdataData);
            this.results.formats.microdata.items = microdataData.length;
        }
        
        // RDFa 감지 및 추출
        const hasRdfa = this.parsers.rdfa.detect();
        this.results.formats.rdfa.found = hasRdfa;
        
        if (hasRdfa) {
            const rdfaData = this.parsers.rdfa.extract();
            this.results.items = this.results.items.concat(rdfaData);
            this.results.formats.rdfa.items = rdfaData.length;
        }
        
        // 구조화 데이터 존재 여부 기록
        this.results.hasStructuredData = 
            hasJsonLd || hasMicrodata || hasRdfa;
        
        logger.debug('구조화 데이터 감지 결과', {
            hasStructuredData: this.results.hasStructuredData,
            jsonld: { found: hasJsonLd, items: this.results.formats.jsonld.items },
            microdata: { found: hasMicrodata, items: this.results.formats.microdata.items },
            rdfa: { found: hasRdfa, items: this.results.formats.rdfa.items },
            totalItems: this.results.items.length
        });
    };

    /**
     * 추출된 구조화 데이터의 유효성을 검증합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._validateData = function() {
        if (!this.results.hasStructuredData || this.results.items.length === 0) {
            logger.debug('검증할 구조화 데이터가 없습니다');
            return;
        }
        
        logger.debug('구조화 데이터 유효성 검증 시작');
        
        // ValidationEngine으로 모든 항목 검증
        const validationResults = this.validationEngine.validateItems(this.results.items);
        
        // 유효성 검증 결과 기록
        this.results.validation = validationResults.summary;
        
        logger.debug('구조화 데이터 유효성 검증 완료', {
            valid: validationResults.summary.valid,
            errors: validationResults.summary.errors.length,
            warnings: validationResults.summary.warnings.length
        });
    };

    /**
     * 특수 스키마 타입에 대한 추가 검증을 수행합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._validateSpecialTypes = function() {
        if (!this.results.hasStructuredData || this.results.items.length === 0) {
            logger.debug('특수 검증을 위한 구조화 데이터가 없습니다');
            return;
        }
        
        logger.debug('특수 스키마 타입 검증 시작');
        
        // 특수 검증기로 항목 검증
        const specialValidationResults = this.specialValidatorsFactory.validate(this.results.items);
        
        // 특수 검증 결과 기록
        this.results.specialValidation = specialValidationResults;
        
        logger.debug('특수 스키마 타입 검증 완료', {
            validatedItems: specialValidationResults.validatedItems,
            validItems: specialValidationResults.validItems,
            invalidItems: specialValidationResults.invalidItems
        });
    };

    /**
     * 분석된 데이터를 요약합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._summarizeData = function() {
        logger.debug('구조화 데이터 요약');
        
        // 요약 정보 계산
        this.results.summary = {
            totalItems: this.results.items.length,
            formatCount: Object.values(this.results.formats)
                .filter(format => format.found).length
        };
    };

    /**
     * 추출된 항목에서 스키마 타입을 집계합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._collectSchemaTypes = function() {
        logger.debug('스키마 타입 집계');
        
        const schemaTypes = {};
        
        this.results.items.forEach(item => {
            const type = item['@type'];
            
            if (!type) return;
            
            // 타입이 배열인 경우 각 타입을 개별적으로 처리
            const types = Array.isArray(type) ? type : [type];
            
            types.forEach(t => {
                if (!schemaTypes[t]) {
                    schemaTypes[t] = 1;
                } else {
                    schemaTypes[t]++;
                }
            });
        });
        
        this.results.schemaTypes = schemaTypes;
        
        logger.debug('스키마 타입 집계 완료', schemaTypes);
    };

    /**
     * 분석 결과에 따른 점수를 계산합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._calculateScore = function() {
        logger.debug('구조화 데이터 점수 계산');
        
        // 구조화 데이터가 없는 경우
        if (!this.results.hasStructuredData) {
            this.results.score = 0;
            return;
        }
        
        // 기본 점수 부여 (최대 100점)
        let score = 30;  // 구조화 데이터 있음 (+30)
        
        // 형식 다양성 점수 (최대 +15)
        const formatCount = this.results.summary.formatCount;
        score += Math.min(formatCount * 5, 15);
        
        // 항목 수 점수 (최대 +15)
        const itemCount = this.results.items.length;
        if (itemCount >= 5) {
            score += 15;
        } else {
            score += itemCount * 3;
        }
        
        // 스키마 타입 다양성 점수 (최대 +10)
        const typeCount = Object.keys(this.results.schemaTypes).length;
        if (typeCount >= 5) {
            score += 10;
        } else {
            score += typeCount * 2;
        }
        
        // 유효성 검증 점수 (최대 +30)
        if (this.results.validation) {
            const errorPenalty = Math.min(this.results.validation.errors.length * 3, 20);
            const warningPenalty = Math.min(this.results.validation.warnings.length, 10);
            
            score -= (errorPenalty + warningPenalty);
            
            // 특수 검증 결과 반영
            if (this.results.specialValidation && 
                this.results.specialValidation.validatedItems > 0) {
                
                const specialValidRatio = this.results.specialValidation.validItems / 
                                         this.results.specialValidation.validatedItems;
                
                score += Math.round(specialValidRatio * 20);  // 최대 +20
            }
        }
        
        // 점수 범위 제한 (0-100)
        this.results.score = Math.max(0, Math.min(100, score));
        
        logger.debug('최종 구조화 데이터 점수', this.results.score);
    };

    /**
     * 분석 결과를 기반으로 권장 사항을 생성합니다.
     * @private
     */
    StructuredDataAnalyzer.prototype._generateRecommendations = function() {
        logger.debug('구조화 데이터 권장 사항 생성');
        
        const recommendations = [];
        
        // 구조화 데이터가 없는 경우
        if (!this.results.hasStructuredData) {
            recommendations.push({
                message: '웹페이지에 구조화 데이터를 추가하세요. Schema.org 어휘를 사용하여 JSON-LD, Microdata 또는 RDFa 형식으로 구현할 수 있습니다.',
                importance: 'high'
            });
            
            recommendations.push({
                message: 'Google이 권장하는 JSON-LD 형식으로 시작하는 것이 좋습니다.',
                importance: 'medium'
            });
            
            this.results.recommendations = recommendations;
            return;
        }
        
        // 형식 관련 권장 사항
        if (!this.results.formats.jsonld.found) {
            recommendations.push({
                message: 'JSON-LD 형식으로 구조화 데이터를 추가하는 것이 좋습니다. Google이 권장하는 형식이며 HTML과 분리되어 관리하기 쉽습니다.',
                importance: 'medium'
            });
        }
        
        // 검증 오류 관련 권장 사항
        if (this.results.validation && this.results.validation.errors.length > 0) {
            recommendations.push({
                message: `${this.results.validation.errors.length}개의 구조화 데이터 오류를 수정하세요. 오류가 있는 구조화 데이터는 검색 엔진에서 제대로 활용되지 않을 수 있습니다.`,
                importance: 'high'
            });
        }
        
        // 특수 검증 결과에서 권장 사항 추가
        if (this.results.specialValidation && 
            this.results.specialValidation.recommendations.length > 0) {
            
            this.results.specialValidation.recommendations.forEach(rec => {
                recommendations.push(rec);
            });
        }
        
        // 스키마 타입 추가 권장 사항
        const commonTypes = [
            'Organization', 'LocalBusiness', 'Product', 'Article', 'BreadcrumbList',
            'FAQPage', 'HowTo', 'Recipe', 'Event', 'Person', 'WebSite'
        ];
        
        const missingCommonTypes = commonTypes.filter(
            type => !Object.keys(this.results.schemaTypes).includes(type)
        );
        
        if (missingCommonTypes.length > 0) {
            const suggestedTypes = missingCommonTypes.slice(0, 3).join(', ');
            
            recommendations.push({
                message: `페이지 콘텐츠와 관련된 경우 다음 스키마 타입 추가를 고려하세요: ${suggestedTypes}`,
                importance: 'low'
            });
        }
        
        // 일반 권장 사항
        recommendations.push({
            message: '모든 구조화 데이터가 페이지의 실제 콘텐츠와 일치하는지 확인하세요.',
            importance: 'medium'
        });
        
        // 중요도에 따라 권장 사항 정렬
        recommendations.sort((a, b) => {
            const importanceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
            return importanceOrder[a.importance] - importanceOrder[b.importance];
        });
        
        // 최대 10개로 제한
        this.results.recommendations = recommendations.slice(0, 10);
        
        logger.debug('구조화 데이터 권장 사항 생성 완료', {
            count: this.results.recommendations.length
        });
    };

    return StructuredDataAnalyzer;
})();