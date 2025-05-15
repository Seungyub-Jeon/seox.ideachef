/**
 * ProductValidator - Product 스키마 타입을 위한 특수 검증기
 * Schema.org Product 타입 구현에 대한 고급 검증을 수행합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData.specialValidators');

KoreanWebAnalyzer.analyzer.structuredData.specialValidators.ProductValidator = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('ProductValidator');

    /**
     * ProductValidator 생성자
     */
    function ProductValidator() {
        this.errors = [];
        this.warnings = [];
        this.stats = {
            totalProducts: 0,
            validProducts: 0,
            name: {
                present: 0,
                missing: 0
            },
            image: {
                present: 0,
                missing: 0,
                invalid: 0
            },
            description: {
                present: 0,
                missing: 0,
                tooShort: 0
            },
            offers: {
                present: 0,
                missing: 0,
                hasPrice: 0,
                hasPriceCurrency: 0,
                hasAvailability: 0,
                invalidPrice: 0
            },
            aggregateRating: {
                present: 0,
                missing: 0,
                valid: 0,
                invalid: 0
            },
            brand: {
                present: 0,
                missing: 0
            },
            sku: {
                present: 0,
                missing: 0
            },
            gtin: {
                present: 0,
                missing: 0
            }
        };
    }

    /**
     * Product 데이터 검증
     * @param {Object} product - 검증할 Product 데이터
     * @returns {Object} 검증 결과
     */
    ProductValidator.prototype.validate = function(product) {
        logger.debug('Product 검증 시작', product);
        
        this.errors = [];
        this.warnings = [];
        
        // Product 타입 검증
        if (!product || product['@type'] !== 'Product') {
            this.errors.push({
                message: '제품 정보는 Product 타입이어야 합니다.',
                code: 'invalid-product-type'
            });
            return this._getResults();
        }
        
        this.stats.totalProducts++;
        
        // 필수 속성 검증
        
        // 이름(name) 검증
        if (!product.name) {
            this.stats.name.missing++;
            this.errors.push({
                message: '제품에 name 속성이 없습니다.',
                code: 'missing-name'
            });
        } else {
            this.stats.name.present++;
        }
        
        // 이미지(image) 검증
        if (!product.image) {
            this.stats.image.missing++;
            this.errors.push({
                message: '제품에 image 속성이 없습니다.',
                code: 'missing-image'
            });
        } else {
            const images = Array.isArray(product.image) ? product.image : [product.image];
            
            if (images.length === 0) {
                this.stats.image.missing++;
                this.errors.push({
                    message: '제품에 유효한 이미지가 없습니다.',
                    code: 'empty-image-array'
                });
            } else {
                this.stats.image.present++;
                
                // 이미지 URL 검증
                images.forEach((img, index) => {
                    const imgUrl = typeof img === 'string' ? img : img.url || img['@id'];
                    
                    if (!imgUrl) {
                        this.stats.image.invalid++;
                        this.errors.push({
                            message: `제품 이미지 #${index+1}에 URL이 없습니다.`,
                            code: 'missing-image-url'
                        });
                    } else if (!imgUrl.startsWith('http') && !imgUrl.startsWith('https')) {
                        this.stats.image.invalid++;
                        this.warnings.push({
                            message: `제품 이미지 #${index+1}에 상대 URL이 사용되었습니다. 절대 URL을 사용하는 것이 좋습니다.`,
                            code: 'relative-image-url'
                        });
                    }
                });
            }
        }
        
        // 설명(description) 검증
        if (!product.description) {
            this.stats.description.missing++;
            this.warnings.push({
                message: '제품에 description 속성이 없습니다. 제품 설명을 추가하는 것이 좋습니다.',
                code: 'missing-description'
            });
        } else {
            this.stats.description.present++;
            
            // 설명 길이 검증
            if (product.description.length < 50) {
                this.stats.description.tooShort++;
                this.warnings.push({
                    message: `제품 설명이 너무 짧습니다. (${product.description.length} 문자)`,
                    code: 'short-description'
                });
            }
        }
        
        // 가격 정보(offers) 검증
        if (!product.offers) {
            this.stats.offers.missing++;
            this.errors.push({
                message: '제품에 offers 속성이 없습니다.',
                code: 'missing-offers'
            });
        } else {
            this.stats.offers.present++;
            
            const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
            
            offers.forEach((offer, index) => {
                // 가격(price) 검증
                if (!offer.price && !offer.lowPrice) {
                    this.errors.push({
                        message: `제품 가격 정보 #${index+1}에 price 또는 lowPrice 속성이 없습니다.`,
                        code: 'missing-price'
                    });
                } else {
                    this.stats.offers.hasPrice++;
                    
                    // 가격 형식 검증
                    const price = offer.price || offer.lowPrice;
                    if (isNaN(parseFloat(price))) {
                        this.stats.offers.invalidPrice++;
                        this.errors.push({
                            message: `제품 가격 정보 #${index+1}의 가격이 유효한 숫자가 아닙니다: ${price}`,
                            code: 'invalid-price-format'
                        });
                    }
                }
                
                // 통화(priceCurrency) 검증
                if (!offer.priceCurrency) {
                    this.errors.push({
                        message: `제품 가격 정보 #${index+1}에 priceCurrency 속성이 없습니다.`,
                        code: 'missing-price-currency'
                    });
                } else {
                    this.stats.offers.hasPriceCurrency++;
                }
                
                // 재고 상태(availability) 검증
                if (!offer.availability) {
                    this.warnings.push({
                        message: `제품 가격 정보 #${index+1}에 availability 속성이 없습니다.`,
                        code: 'missing-availability'
                    });
                } else {
                    this.stats.offers.hasAvailability++;
                    
                    // 유효한 availability 값인지 검증
                    const validAvailability = [
                        'https://schema.org/InStock',
                        'https://schema.org/OutOfStock',
                        'https://schema.org/PreOrder',
                        'https://schema.org/Discontinued',
                        'http://schema.org/InStock',
                        'http://schema.org/OutOfStock',
                        'http://schema.org/PreOrder',
                        'http://schema.org/Discontinued'
                    ];
                    
                    if (!validAvailability.includes(offer.availability)) {
                        this.warnings.push({
                            message: `제품 가격 정보 #${index+1}의 availability 값이 유효하지 않습니다: ${offer.availability}`,
                            code: 'invalid-availability'
                        });
                    }
                }
            });
        }
        
        // 평점(aggregateRating) 검증
        if (product.aggregateRating) {
            this.stats.aggregateRating.present++;
            
            if (product.aggregateRating['@type'] !== 'AggregateRating') {
                this.stats.aggregateRating.invalid++;
                this.errors.push({
                    message: '제품 평점은 AggregateRating 타입이어야 합니다.',
                    code: 'invalid-rating-type'
                });
            } else if (!product.aggregateRating.ratingValue || !product.aggregateRating.reviewCount) {
                this.stats.aggregateRating.invalid++;
                this.errors.push({
                    message: '제품 평점에는 ratingValue와 reviewCount 속성이 모두 필요합니다.',
                    code: 'incomplete-rating'
                });
            } else {
                this.stats.aggregateRating.valid++;
                
                // 평점 값 범위 검증
                const ratingValue = parseFloat(product.aggregateRating.ratingValue);
                if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
                    this.warnings.push({
                        message: `제품 평점 값이 유효하지 않습니다: ${product.aggregateRating.ratingValue}`,
                        code: 'invalid-rating-value'
                    });
                }
                
                // 리뷰 수 검증
                const reviewCount = parseInt(product.aggregateRating.reviewCount);
                if (isNaN(reviewCount) || reviewCount <= 0) {
                    this.warnings.push({
                        message: `제품 리뷰 수가 유효하지 않습니다: ${product.aggregateRating.reviewCount}`,
                        code: 'invalid-review-count'
                    });
                }
            }
        } else {
            this.stats.aggregateRating.missing++;
            // 평점은 필수가 아니므로 경고만 추가
            this.warnings.push({
                message: '제품에 평점 정보(aggregateRating)가 없습니다. 평점 정보를 제공하면 검색 결과에서 더 눈에 띄게 표시됩니다.',
                code: 'missing-rating'
            });
        }
        
        // 브랜드(brand) 검증
        if (product.brand) {
            this.stats.brand.present++;
            
            // 브랜드 형식 검증
            if (typeof product.brand === 'object' && !product.brand.name) {
                this.warnings.push({
                    message: '제품 브랜드 객체에 name 속성이 없습니다.',
                    code: 'missing-brand-name'
                });
            }
        } else {
            this.stats.brand.missing++;
            this.warnings.push({
                message: '제품에 brand 속성이 없습니다. 브랜드 정보를 추가하는 것이 좋습니다.',
                code: 'missing-brand'
            });
        }
        
        // SKU 검증
        if (product.sku) {
            this.stats.sku.present++;
        } else {
            this.stats.sku.missing++;
            this.warnings.push({
                message: '제품에 sku 속성이 없습니다. SKU를 추가하면 제품 식별에 도움이 됩니다.',
                code: 'missing-sku'
            });
        }
        
        // GTIN (EAN, UPC, ISBN 등) 검증
        const hasGtin = product.gtin || product.gtin8 || product.gtin13 || product.gtin14 || 
                       product.isbn || product.mpn;
        
        if (hasGtin) {
            this.stats.gtin.present++;
        } else {
            this.stats.gtin.missing++;
            this.warnings.push({
                message: '제품에 GTIN, ISBN, MPN과 같은 표준 식별자가 없습니다. 가능한 경우 추가하는 것이 좋습니다.',
                code: 'missing-product-identifier'
            });
        }
        
        // 검증 결과 확인
        if (this.errors.length === 0) {
            this.stats.validProducts++;
        }
        
        return this._getResults();
    };

    /**
     * 검증 결과를 반환합니다.
     * @returns {Object} 검증 결과 객체
     */
    ProductValidator.prototype._getResults = function() {
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
    ProductValidator.prototype._generateRecommendations = function() {
        const recommendations = [];
        
        // 필수 속성 관련 권장 사항
        if (this.stats.name.missing > 0) {
            recommendations.push({
                message: '모든 제품에는 name 속성을 제공해야 합니다.',
                importance: 'high'
            });
        }
        
        if (this.stats.image.missing > 0 || this.stats.image.invalid > 0) {
            recommendations.push({
                message: '모든 제품에는 유효한 이미지 URL을 제공해야 합니다. 이미지는 절대 URL(http://, https://)을 사용하세요.',
                importance: 'high'
            });
        }
        
        if (this.stats.offers.missing > 0) {
            recommendations.push({
                message: '모든 제품에는 offers 속성으로 가격 정보를 제공해야 합니다.',
                importance: 'high'
            });
        }
        
        if (this.stats.offers.hasPrice < this.stats.offers.present || 
            this.stats.offers.hasPriceCurrency < this.stats.offers.present) {
            recommendations.push({
                message: '모든 제품 가격 정보에는 price와 priceCurrency 속성이 모두 필요합니다.',
                importance: 'high'
            });
        }
        
        // 추가 권장 사항
        if (this.stats.description.missing > 0 || this.stats.description.tooShort > 0) {
            recommendations.push({
                message: '모든 제품에는 상세한 제품 설명(최소 50자 이상)을 제공하세요.',
                importance: 'medium'
            });
        }
        
        if (this.stats.aggregateRating.missing > 0) {
            recommendations.push({
                message: '제품에 aggregateRating 속성을 추가하여 리뷰 정보를 제공하면 검색 결과에서 평점이 표시됩니다.',
                importance: 'medium'
            });
        }
        
        if (this.stats.brand.missing > 0) {
            recommendations.push({
                message: '제품에 brand 속성을 추가하여 브랜드 정보를 명확히 제공하세요.',
                importance: 'medium'
            });
        }
        
        if (this.stats.gtin.missing > 0) {
            recommendations.push({
                message: '가능한 경우 제품에 gtin, isbn, mpn과 같은 표준 제품 식별자를 추가하세요.',
                importance: 'medium'
            });
        }
        
        if (this.stats.offers.hasAvailability < this.stats.offers.present) {
            recommendations.push({
                message: '제품 가격 정보에 availability 속성을 추가하여 재고 상태를 명확히 표시하세요.',
                importance: 'medium'
            });
        }
        
        // 일반 권장 사항
        recommendations.push({
            message: '제품 구조화 데이터를 실제 페이지 콘텐츠와 일치시켜 정확한 정보를 제공하세요.',
            importance: 'medium'
        });
        
        return recommendations;
    };

    return ProductValidator;
})();