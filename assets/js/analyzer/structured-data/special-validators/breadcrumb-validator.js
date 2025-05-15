/**
 * BreadcrumbValidator - Breadcrumb 스키마 타입을 위한 특수 검증기
 * Schema.org BreadcrumbList 타입 구현에 대한 고급 검증을 수행합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData.specialValidators');

KoreanWebAnalyzer.analyzer.structuredData.specialValidators.BreadcrumbValidator = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('BreadcrumbValidator');

    /**
     * BreadcrumbValidator 생성자
     */
    function BreadcrumbValidator() {
        this.errors = [];
        this.warnings = [];
        this.stats = {
            totalItems: 0,
            validItems: 0,
            itemPosition: {
                correct: 0,
                incorrect: 0,
                missing: 0
            },
            itemUrl: {
                absolute: 0,
                relative: 0,
                missing: 0
            }
        };
    }

    /**
     * Breadcrumb 항목이 올바른 순서로 배치되었는지 검증합니다.
     * @param {Object} breadcrumb - 검증할 Breadcrumb 데이터
     * @returns {Object} 검증 결과
     */
    BreadcrumbValidator.prototype.validate = function(breadcrumb) {
        logger.debug('Breadcrumb 검증 시작', breadcrumb);
        
        this.errors = [];
        this.warnings = [];
        
        // BreadcrumbList 타입 검증
        if (!breadcrumb || breadcrumb['@type'] !== 'BreadcrumbList') {
            this.errors.push({
                message: 'Breadcrumb는 BreadcrumbList 타입이어야 합니다.',
                code: 'invalid-breadcrumb-type'
            });
            return this._getResults();
        }
        
        // itemListElement 검증
        if (!breadcrumb.itemListElement || !Array.isArray(breadcrumb.itemListElement)) {
            this.errors.push({
                message: 'Breadcrumb에는 itemListElement 배열이 필요합니다.',
                code: 'missing-item-list-element'
            });
            return this._getResults();
        }
        
        this.stats.totalItems = breadcrumb.itemListElement.length;
        
        // 최소 항목 수 검증
        if (breadcrumb.itemListElement.length < 2) {
            this.warnings.push({
                message: 'Breadcrumb에는 최소 2개 이상의 항목이 있어야 효과적입니다.',
                code: 'insufficient-breadcrumb-items'
            });
        }
        
        // 각 항목에 대한 검증
        breadcrumb.itemListElement.forEach((item, index) => {
            // ListItem 타입 검증
            if (!item || item['@type'] !== 'ListItem') {
                this.errors.push({
                    message: `Breadcrumb 항목 #${index+1}은(는) ListItem 타입이어야 합니다.`,
                    code: 'invalid-list-item-type',
                    item: index
                });
                return;
            }
            
            // position 검증
            if (!item.position) {
                this.stats.itemPosition.missing++;
                this.errors.push({
                    message: `Breadcrumb 항목 #${index+1}에 position 속성이 없습니다.`,
                    code: 'missing-position',
                    item: index
                });
            } else if (parseInt(item.position) !== (index + 1)) {
                this.stats.itemPosition.incorrect++;
                this.errors.push({
                    message: `Breadcrumb 항목 #${index+1}의 position이 ${item.position}으로 잘못 설정되었습니다.`,
                    code: 'incorrect-position',
                    item: index
                });
            } else {
                this.stats.itemPosition.correct++;
            }
            
            // name 검증
            if (!item.name && (!item.item || !item.item.name)) {
                this.warnings.push({
                    message: `Breadcrumb 항목 #${index+1}에 name 속성이 없습니다.`,
                    code: 'missing-name',
                    item: index
                });
            }
            
            // URL 검증
            let url = null;
            if (item.item && item.item.id) {
                url = item.item.id;
            } else if (item.item && item.item['@id']) {
                url = item.item['@id'];
            }
            
            if (!url) {
                this.stats.itemUrl.missing++;
                this.warnings.push({
                    message: `Breadcrumb 항목 #${index+1}에 URL이 없습니다.`,
                    code: 'missing-url',
                    item: index
                });
            } else if (url.startsWith('http') || url.startsWith('https')) {
                this.stats.itemUrl.absolute++;
            } else {
                this.stats.itemUrl.relative++;
                this.warnings.push({
                    message: `Breadcrumb 항목 #${index+1}에 상대 URL이 사용되었습니다. 절대 URL을 사용하는 것이 좋습니다.`,
                    code: 'relative-url',
                    item: index
                });
            }
        });
        
        // 모든 항목이 정상인 경우
        if (this.errors.length === 0) {
            this.stats.validItems = this.stats.totalItems;
        }
        
        return this._getResults();
    };

    /**
     * 검증 결과를 반환합니다.
     * @returns {Object} 검증 결과 객체
     */
    BreadcrumbValidator.prototype._getResults = function() {
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
    BreadcrumbValidator.prototype._generateRecommendations = function() {
        const recommendations = [];
        
        // 위치 속성 문제 관련 권장 사항
        if (this.stats.itemPosition.incorrect > 0 || this.stats.itemPosition.missing > 0) {
            recommendations.push({
                message: 'Breadcrumb 항목의 position 속성이 순차적으로 1부터 시작하여 증가해야 합니다.',
                importance: 'high'
            });
        }
        
        // URL 관련 권장 사항
        if (this.stats.itemUrl.relative > 0) {
            recommendations.push({
                message: 'Breadcrumb 항목에는 상대 URL 대신 절대 URL을 사용하세요.',
                importance: 'medium'
            });
        }
        
        if (this.stats.itemUrl.missing > 0) {
            recommendations.push({
                message: '모든 Breadcrumb 항목에는 URL을 제공해야 합니다.',
                importance: 'high'
            });
        }
        
        // 항목 수 관련 권장 사항
        if (this.stats.totalItems < 2) {
            recommendations.push({
                message: 'Breadcrumb는 최소 2개 이상의 항목으로 구성하여 사용자에게 명확한 내비게이션 경로를 제공하세요.',
                importance: 'medium'
            });
        }
        
        return recommendations;
    };

    return BreadcrumbValidator;
})();