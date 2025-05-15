/**
 * FAQValidator - FAQ 스키마 타입을 위한 특수 검증기
 * Schema.org FAQPage 타입 구현에 대한 고급 검증을 수행합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData.specialValidators');

KoreanWebAnalyzer.analyzer.structuredData.specialValidators.FAQValidator = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('FAQValidator');

    /**
     * FAQValidator 생성자
     */
    function FAQValidator() {
        this.errors = [];
        this.warnings = [];
        this.stats = {
            totalItems: 0,
            validItems: 0,
            questions: {
                valid: 0,
                tooShort: 0,
                tooLong: 0,
                missing: 0
            },
            answers: {
                valid: 0,
                tooShort: 0,
                missing: 0
            }
        };
    }

    /**
     * FAQ 페이지 데이터 검증
     * @param {Object} faqPage - 검증할 FAQPage 데이터
     * @returns {Object} 검증 결과
     */
    FAQValidator.prototype.validate = function(faqPage) {
        logger.debug('FAQ 검증 시작', faqPage);
        
        this.errors = [];
        this.warnings = [];
        
        // FAQPage 타입 검증
        if (!faqPage || faqPage['@type'] !== 'FAQPage') {
            this.errors.push({
                message: 'FAQ는 FAQPage 타입이어야 합니다.',
                code: 'invalid-faq-type'
            });
            return this._getResults();
        }
        
        // mainEntity 검증
        if (!faqPage.mainEntity) {
            this.errors.push({
                message: 'FAQPage에는 mainEntity 속성이 필요합니다.',
                code: 'missing-main-entity'
            });
            return this._getResults();
        }
        
        // mainEntity가 배열 형식인지 확인
        const faqItems = Array.isArray(faqPage.mainEntity) 
            ? faqPage.mainEntity 
            : [faqPage.mainEntity];
        
        this.stats.totalItems = faqItems.length;
        
        // 최소 항목 수 검증
        if (faqItems.length < 2) {
            this.warnings.push({
                message: 'FAQPage에는 최소 2개 이상의 Q&A 항목이 있어야 효과적입니다.',
                code: 'insufficient-faq-items'
            });
        }
        
        // 각 FAQ 항목에 대한 검증
        faqItems.forEach((item, index) => {
            // Question 타입 검증
            if (!item || item['@type'] !== 'Question') {
                this.errors.push({
                    message: `FAQ 항목 #${index+1}은(는) Question 타입이어야 합니다.`,
                    code: 'invalid-question-type',
                    item: index
                });
                return;
            }
            
            // 질문(name) 검증
            if (!item.name) {
                this.stats.questions.missing++;
                this.errors.push({
                    message: `FAQ 항목 #${index+1}에 name(질문) 속성이 없습니다.`,
                    code: 'missing-question',
                    item: index
                });
            } else if (item.name.length < 10) {
                this.stats.questions.tooShort++;
                this.warnings.push({
                    message: `FAQ 항목 #${index+1}의 질문이 너무 짧습니다. (${item.name.length} 문자)`,
                    code: 'short-question',
                    item: index
                });
            } else if (item.name.length > 150) {
                this.stats.questions.tooLong++;
                this.warnings.push({
                    message: `FAQ 항목 #${index+1}의 질문이 너무 깁니다. (${item.name.length} 문자)`,
                    code: 'long-question',
                    item: index
                });
            } else {
                this.stats.questions.valid++;
            }
            
            // 답변(acceptedAnswer) 검증
            if (!item.acceptedAnswer) {
                this.stats.answers.missing++;
                this.errors.push({
                    message: `FAQ 항목 #${index+1}에 acceptedAnswer 속성이 없습니다.`,
                    code: 'missing-answer',
                    item: index
                });
                return;
            }
            
            // 답변이 Answer 타입인지 검증
            if (item.acceptedAnswer['@type'] !== 'Answer') {
                this.errors.push({
                    message: `FAQ 항목 #${index+1}의 답변은 Answer 타입이어야 합니다.`,
                    code: 'invalid-answer-type',
                    item: index
                });
                return;
            }
            
            // 답변 텍스트(text) 검증
            if (!item.acceptedAnswer.text) {
                this.errors.push({
                    message: `FAQ 항목 #${index+1}의 답변에 text 속성이 없습니다.`,
                    code: 'missing-answer-text',
                    item: index
                });
            } else if (item.acceptedAnswer.text.length < 25) {
                this.stats.answers.tooShort++;
                this.warnings.push({
                    message: `FAQ 항목 #${index+1}의 답변이 너무 짧습니다. (${item.acceptedAnswer.text.length} 문자)`,
                    code: 'short-answer',
                    item: index
                });
            } else {
                this.stats.answers.valid++;
            }
        });
        
        // 모든 항목이 정상인 경우
        if (this.errors.length === 0) {
            this.stats.validItems = this.stats.totalItems;
        } else {
            this.stats.validItems = this.stats.totalItems - this.errors.filter(e => e.item !== undefined).length;
        }
        
        return this._getResults();
    };

    /**
     * 검증 결과를 반환합니다.
     * @returns {Object} 검증 결과 객체
     */
    FAQValidator.prototype._getResults = function() {
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            stats: this.stats,
            recommendations: this._generateRecommendations()
        };
    };

    /**
     * 검증 결과를 기반으로 권장 사항을 생성합니다.
     * @returns {Array} 권장 사항 목록
     */
    FAQValidator.prototype._generateRecommendations = function() {
        const recommendations = [];
        
        // 질문 관련 권장 사항
        if (this.stats.questions.missing > 0) {
            recommendations.push({
                message: '모든 FAQ 항목에는 name 속성으로 질문을 제공해야 합니다.',
                importance: 'high'
            });
        }
        
        if (this.stats.questions.tooShort > 0) {
            recommendations.push({
                message: '질문은 최소 10자 이상으로 구체적이고 명확하게 작성하세요.',
                importance: 'medium'
            });
        }
        
        if (this.stats.questions.tooLong > 0) {
            recommendations.push({
                message: '질문은 150자 이내로 간결하게 작성하는 것이 좋습니다.',
                importance: 'low'
            });
        }
        
        // 답변 관련 권장 사항
        if (this.stats.answers.missing > 0) {
            recommendations.push({
                message: '모든 FAQ 질문에는 acceptedAnswer 속성으로 답변을 제공해야 합니다.',
                importance: 'high'
            });
        }
        
        if (this.stats.answers.tooShort > 0) {
            recommendations.push({
                message: '답변은 최소 25자 이상으로 충분한 정보를 제공해야 합니다.',
                importance: 'medium'
            });
        }
        
        // 항목 수 관련 권장 사항
        if (this.stats.totalItems < 2) {
            recommendations.push({
                message: 'FAQPage는 최소 2개 이상의 Q&A 항목을 포함해야 검색엔진에서 효과적으로 표시됩니다.',
                importance: 'medium'
            });
        }
        
        // 일반 권장 사항
        recommendations.push({
            message: 'FAQ 항목을 웹페이지의 실제 콘텐츠와 일치시켜 사용자 경험을 향상시키세요.',
            importance: 'medium'
        });
        
        return recommendations;
    };

    return FAQValidator;
})();