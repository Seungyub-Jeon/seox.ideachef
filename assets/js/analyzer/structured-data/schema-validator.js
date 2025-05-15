/**
 * Schema.org 검증 엔진
 * 
 * 구조화 데이터를 Schema.org 명세에 따라 검증합니다.
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
     * Schema.org 검증기 클래스
     */
    class SchemaValidator {
        /**
         * 생성자
         * @param {Object} options - 검증 옵션
         */
        constructor(options = {}) {
            this.options = options;
            
            // Schema.org 타입 정의
            this.schemaDefinitions = this._initSchemaDefinitions();
            
            // 검증 결과
            this.validationResults = {
                valid: false,
                errors: [],
                warnings: []
            };
        }
        
        /**
         * 구조화 데이터 검증
         * @param {Object} data - 검증할 구조화 데이터
         * @return {Object} 검증 결과
         */
        validate(data) {
            if (!data || typeof data !== 'object') {
                this._addError('구조화 데이터가 유효한 객체가 아닙니다.', 'invalid-data');
                return this.validationResults;
            }
            
            // 검증 결과 초기화
            this.validationResults = {
                valid: true,
                errors: [],
                warnings: []
            };
            
            // 기본 유효성 검사
            this._validateBasicStructure(data);
            
            // 타입별 검증
            if (data['@type']) {
                const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
                
                // 모든 타입에 대해 검증
                for (const type of types) {
                    this._validateSchemaType(data, type);
                }
            }
            
            // 중첩된 객체 검증
            this._validateNestedObjects(data);
            
            // 최종 유효성 결정 (오류가 없어야 유효)
            this.validationResults.valid = this.validationResults.errors.length === 0;
            
            return this.validationResults;
        }
        
        /**
         * 기본 구조 검증
         * @param {Object} data - 검증할 데이터
         */
        _validateBasicStructure(data) {
            // @context 검증
            if (!data['@context'] && !data._format) {
                this._addWarning('@context가 없습니다.', 'missing-context');
            }
            
            // @type 검증
            if (!data['@type']) {
                this._addError('@type이 없습니다. 대부분의 구조화 데이터에는 Schema.org 타입이 필요합니다.', 'missing-type');
            } else {
                const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
                
                // 알려진 타입인지 확인
                for (const type of types) {
                    if (!this.schemaDefinitions[type]) {
                        this._addWarning(`'${type}'은(는) 알려지지 않은 Schema.org 타입입니다.`, 'unknown-type');
                    }
                }
            }
            
            // 빈 객체 확인
            if (Object.keys(data).filter(key => !key.startsWith('@') && !key.startsWith('_')).length === 0) {
                this._addError('구조화 데이터에 속성이 없습니다.', 'empty-schema');
            }
        }
        
        /**
         * Schema.org 타입 검증
         * @param {Object} data - 검증할 데이터
         * @param {string} type - 스키마 타입
         */
        _validateSchemaType(data, type) {
            const typeDefinition = this.schemaDefinitions[type];
            
            // 알려지지 않은 타입은 건너뜀
            if (!typeDefinition) {
                return;
            }
            
            // 필수 속성 검증
            if (typeDefinition.required) {
                for (const prop of typeDefinition.required) {
                    if (!(prop in data)) {
                        this._addError(
                            `'${type}' 타입에 필수 속성 '${prop}'가 없습니다.`,
                            'missing-required-property',
                            { type, property: prop }
                        );
                    }
                }
            }
            
            // 권장 속성 검증
            if (typeDefinition.recommended) {
                for (const prop of typeDefinition.recommended) {
                    if (!(prop in data)) {
                        this._addWarning(
                            `'${type}' 타입에 권장 속성 '${prop}'가 없습니다.`,
                            'missing-recommended-property',
                            { type, property: prop }
                        );
                    }
                }
            }
            
            // 속성 타입 검증
            if (typeDefinition.properties) {
                for (const [prop, expectedType] of Object.entries(typeDefinition.properties)) {
                    if (prop in data) {
                        this._validatePropertyType(data[prop], expectedType, prop, type);
                    }
                }
            }
            
            // 알려지지 않은 속성 검사
            if (typeDefinition.properties) {
                const knownProps = new Set([
                    ...Object.keys(typeDefinition.properties),
                    '@type', '@context', '@id'
                ]);
                
                for (const prop in data) {
                    if (!prop.startsWith('_') && !knownProps.has(prop)) {
                        this._addWarning(
                            `'${prop}'은(는) '${type}' 타입의 표준 속성이 아닙니다.`,
                            'unknown-property',
                            { type, property: prop }
                        );
                    }
                }
            }
        }
        
        /**
         * 속성 타입 검증
         * @param {any} value - 속성값
         * @param {string|Array} expectedType - 예상 타입
         * @param {string} property - 속성명
         * @param {string} schemaType - 스키마 타입명
         */
        _validatePropertyType(value, expectedType, property, schemaType) {
            // expectedType이 배열이면 여러 타입 중 하나가 유효함
            const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType];
            
            // 배열인 경우 각 항목 검증
            if (Array.isArray(value)) {
                for (const item of value) {
                    this._validateSingleValueType(item, expectedTypes, property, schemaType);
                }
                return;
            }
            
            // 단일 값 검증
            this._validateSingleValueType(value, expectedTypes, property, schemaType);
        }
        
        /**
         * 단일 값 타입 검증
         * @param {any} value - 검증할 값
         * @param {Array} expectedTypes - 예상 타입 배열
         * @param {string} property - 속성명
         * @param {string} schemaType - 스키마 타입명
         */
        _validateSingleValueType(value, expectedTypes, property, schemaType) {
            // 기본 타입 확인
            const jsType = typeof value;
            
            // 각 예상 타입에 대해 확인
            for (const type of expectedTypes) {
                // Schema.org 데이터 타입
                if (type === 'Text' && jsType === 'string') {
                    return; // 유효함
                }
                
                if (type === 'Number' && (jsType === 'number' || !isNaN(Number(value)))) {
                    return; // 유효함
                }
                
                if (type === 'Boolean' && (jsType === 'boolean' || value === 'true' || value === 'false')) {
                    return; // 유효함
                }
                
                if (type === 'Date' || type === 'DateTime') {
                    // ISO 날짜 형식 확인
                    if (jsType === 'string' && this._isValidDateString(value)) {
                        return; // 유효함
                    }
                }
                
                if (type === 'URL' && jsType === 'string' && this._isValidURL(value)) {
                    return; // 유효함
                }
                
                // 객체 타입 확인
                if (jsType === 'object' && value !== null) {
                    if (value['@type'] === type || (value._format && !value['@type'])) {
                        return; // 유효함
                    }
                }
            }
            
            // 어떤 타입도 일치하지 않으면 오류
            this._addWarning(
                `'${schemaType}' 타입의 '${property}' 속성값이 예상 타입(${expectedTypes.join(', ')})과 일치하지 않습니다.`,
                'invalid-property-type',
                { type: schemaType, property, expectedTypes }
            );
        }
        
        /**
         * 날짜 문자열 유효성 검사
         * @param {string} dateStr - 검사할 날짜 문자열
         * @return {boolean} 유효한 날짜 여부
         */
        _isValidDateString(dateStr) {
            // ISO 형식 또는 간단한 날짜 형식 확인
            const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
            return isoDatePattern.test(dateStr) && !isNaN(new Date(dateStr).getTime());
        }
        
        /**
         * URL 유효성 검사
         * @param {string} urlStr - 검사할 URL 문자열
         * @return {boolean} 유효한 URL 여부
         */
        _isValidURL(urlStr) {
            try {
                new URL(urlStr);
                return true;
            } catch (e) {
                return false;
            }
        }
        
        /**
         * 중첩된 객체 검증
         * @param {Object} data - 검증할 데이터
         */
        _validateNestedObjects(data) {
            for (const key in data) {
                // 메타 속성 무시
                if (key.startsWith('@') || key.startsWith('_')) {
                    continue;
                }
                
                const value = data[key];
                
                // 중첩된 객체 검증
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    if (value['@type']) {
                        // 중첩된 타입이 있는 경우 재귀적으로 검증
                        const nestedResults = new SchemaValidator(this.options).validate(value);
                        
                        // 중첩 객체의 오류와 경고를 부모로 전파
                        for (const error of nestedResults.errors) {
                            error.path = `${key}.${error.path || ''}`;
                            this.validationResults.errors.push(error);
                        }
                        
                        for (const warning of nestedResults.warnings) {
                            warning.path = `${key}.${warning.path || ''}`;
                            this.validationResults.warnings.push(warning);
                        }
                    }
                } else if (Array.isArray(value)) {
                    // 배열 항목 검증
                    for (let i = 0; i < value.length; i++) {
                        const item = value[i];
                        
                        if (typeof item === 'object' && item !== null && item['@type']) {
                            // 배열 내 객체 검증
                            const nestedResults = new SchemaValidator(this.options).validate(item);
                            
                            // 중첩 객체의 오류와 경고를 부모로 전파
                            for (const error of nestedResults.errors) {
                                error.path = `${key}[${i}].${error.path || ''}`;
                                this.validationResults.errors.push(error);
                            }
                            
                            for (const warning of nestedResults.warnings) {
                                warning.path = `${key}[${i}].${warning.path || ''}`;
                                this.validationResults.warnings.push(warning);
                            }
                        }
                    }
                }
            }
        }
        
        /**
         * 오류 추가
         * @param {string} message - 오류 메시지
         * @param {string} code - 오류 코드
         * @param {Object} details - 추가 세부 정보
         */
        _addError(message, code, details = {}) {
            this.validationResults.errors.push({
                message,
                code,
                ...details
            });
        }
        
        /**
         * 경고 추가
         * @param {string} message - 경고 메시지
         * @param {string} code - 경고 코드
         * @param {Object} details - 추가 세부 정보
         */
        _addWarning(message, code, details = {}) {
            this.validationResults.warnings.push({
                message,
                code,
                ...details
            });
        }
        
        /**
         * Schema.org 타입 정의 초기화
         * @return {Object} Schema.org 타입 정의
         */
        _initSchemaDefinitions() {
            // 기본 Schema.org 타입 정의
            return {
                // Thing (모든 타입의 기본)
                'Thing': {
                    properties: {
                        'name': 'Text',
                        'description': 'Text',
                        'url': 'URL',
                        'image': ['URL', 'ImageObject'],
                        'sameAs': 'URL'
                    },
                    recommended: ['name', 'url']
                },
                
                // 주요 콘텐츠 타입
                'Article': {
                    properties: {
                        'headline': 'Text',
                        'author': ['Person', 'Organization'],
                        'publisher': 'Organization',
                        'datePublished': 'Date',
                        'dateModified': 'Date',
                        'articleBody': 'Text',
                        'articleSection': 'Text',
                        'wordCount': 'Number',
                        'mainEntityOfPage': ['URL', 'WebPage']
                    },
                    required: ['headline'],
                    recommended: ['author', 'datePublished', 'image', 'publisher']
                },
                
                'BlogPosting': {
                    properties: {
                        'headline': 'Text',
                        'author': ['Person', 'Organization'],
                        'publisher': 'Organization',
                        'datePublished': 'Date',
                        'dateModified': 'Date',
                        'articleBody': 'Text',
                        'wordCount': 'Number',
                        'mainEntityOfPage': ['URL', 'WebPage']
                    },
                    required: ['headline'],
                    recommended: ['author', 'datePublished', 'image', 'publisher']
                },
                
                'WebPage': {
                    properties: {
                        'name': 'Text',
                        'description': 'Text',
                        'url': 'URL',
                        'author': ['Person', 'Organization'],
                        'publisher': 'Organization',
                        'datePublished': 'Date',
                        'dateModified': 'Date',
                        'breadcrumb': ['BreadcrumbList', 'Text'],
                        'mainEntity': 'Thing',
                        'speakable': ['SpeakableSpecification', 'URL'],
                        'primaryImageOfPage': 'ImageObject'
                    },
                    recommended: ['name', 'description', 'dateModified', 'datePublished']
                },
                
                // 상품 및 제공
                'Product': {
                    properties: {
                        'name': 'Text',
                        'description': 'Text',
                        'image': ['URL', 'ImageObject'],
                        'brand': ['Brand', 'Organization'],
                        'sku': 'Text',
                        'mpn': 'Text',
                        'gtin13': 'Text',
                        'offers': ['Offer', 'AggregateOffer'],
                        'aggregateRating': 'AggregateRating',
                        'review': ['Review', 'AggregateRating']
                    },
                    required: ['name'],
                    recommended: ['image', 'offers']
                },
                
                'Offer': {
                    properties: {
                        'price': 'Number',
                        'priceCurrency': 'Text',
                        'availability': 'Text',
                        'url': 'URL',
                        'seller': 'Organization',
                        'validFrom': 'DateTime',
                        'validThrough': 'DateTime',
                        'itemCondition': 'Text',
                        'priceValidUntil': 'Date'
                    },
                    required: ['price', 'priceCurrency'],
                    recommended: ['availability', 'url']
                },
                
                // 리뷰 및 평점
                'Review': {
                    properties: {
                        'author': ['Person', 'Organization'],
                        'datePublished': 'Date',
                        'reviewBody': 'Text',
                        'reviewRating': 'Rating',
                        'itemReviewed': 'Thing',
                        'name': 'Text'
                    },
                    required: ['itemReviewed'],
                    recommended: ['author', 'reviewRating']
                },
                
                'Rating': {
                    properties: {
                        'ratingValue': 'Number',
                        'bestRating': 'Number',
                        'worstRating': 'Number',
                        'ratingCount': 'Number'
                    },
                    required: ['ratingValue'],
                    recommended: ['bestRating', 'worstRating']
                },
                
                'AggregateRating': {
                    properties: {
                        'ratingValue': 'Number',
                        'bestRating': 'Number',
                        'worstRating': 'Number',
                        'ratingCount': 'Number',
                        'reviewCount': 'Number',
                        'itemReviewed': 'Thing'
                    },
                    required: ['ratingValue'],
                    recommended: ['ratingCount', 'reviewCount', 'bestRating', 'worstRating']
                },
                
                // 구조화된 목록 유형
                'ItemList': {
                    properties: {
                        'itemListElement': ['ListItem', 'Thing'],
                        'itemListOrder': 'Text',
                        'numberOfItems': 'Number'
                    },
                    required: ['itemListElement'],
                    recommended: ['numberOfItems']
                },
                
                'ListItem': {
                    properties: {
                        'position': 'Number',
                        'item': 'Thing',
                        'name': 'Text',
                        'url': 'URL'
                    },
                    required: ['position'],
                    recommended: ['item']
                },
                
                'BreadcrumbList': {
                    properties: {
                        'itemListElement': 'ListItem',
                        'numberOfItems': 'Number'
                    },
                    required: ['itemListElement'],
                    recommended: ['numberOfItems']
                },
                
                // FAQ
                'FAQPage': {
                    properties: {
                        'mainEntity': ['Question', 'ItemList']
                    },
                    required: ['mainEntity'],
                    recommended: []
                },
                
                'Question': {
                    properties: {
                        'name': 'Text',
                        'text': 'Text',
                        'answerCount': 'Number',
                        'acceptedAnswer': ['Answer', 'ItemList'],
                        'suggestedAnswer': ['Answer', 'ItemList']
                    },
                    required: ['name'],
                    recommended: ['acceptedAnswer']
                },
                
                'Answer': {
                    properties: {
                        'text': 'Text',
                        'author': ['Person', 'Organization'],
                        'dateCreated': 'Date',
                        'upvoteCount': 'Number',
                        'url': 'URL'
                    },
                    required: ['text'],
                    recommended: ['author']
                },
                
                // 이벤트
                'Event': {
                    properties: {
                        'name': 'Text',
                        'startDate': 'DateTime',
                        'endDate': 'DateTime',
                        'location': ['Place', 'PostalAddress', 'VirtualLocation', 'Text'],
                        'description': 'Text',
                        'image': ['URL', 'ImageObject'],
                        'organizer': ['Person', 'Organization'],
                        'performer': ['Person', 'Organization'],
                        'offers': 'Offer',
                        'eventStatus': 'Text',
                        'eventAttendanceMode': 'Text'
                    },
                    required: ['name', 'startDate'],
                    recommended: ['location', 'image', 'endDate']
                },
                
                // 연락처
                'Person': {
                    properties: {
                        'name': 'Text',
                        'givenName': 'Text',
                        'familyName': 'Text',
                        'email': 'Text',
                        'telephone': 'Text',
                        'url': 'URL',
                        'jobTitle': 'Text',
                        'worksFor': 'Organization',
                        'address': ['PostalAddress', 'Text'],
                        'birthDate': 'Date',
                        'image': ['URL', 'ImageObject'],
                        'sameAs': 'URL'
                    },
                    required: ['name'],
                    recommended: ['image', 'url']
                },
                
                'Organization': {
                    properties: {
                        'name': 'Text',
                        'legalName': 'Text',
                        'url': 'URL',
                        'logo': ['URL', 'ImageObject'],
                        'address': ['PostalAddress', 'Text'],
                        'contactPoint': ['ContactPoint'],
                        'sameAs': 'URL',
                        'telephone': 'Text',
                        'email': 'Text',
                        'location': 'Place',
                        'foundingDate': 'Date',
                        'founder': ['Person', 'Organization'],
                        'numberOfEmployees': 'Number'
                    },
                    required: ['name'],
                    recommended: ['logo', 'url', 'address']
                },
                
                'LocalBusiness': {
                    properties: {
                        'name': 'Text',
                        'address': ['PostalAddress', 'Text'],
                        'telephone': 'Text',
                        'email': 'Text',
                        'url': 'URL',
                        'image': ['URL', 'ImageObject'],
                        'logo': ['URL', 'ImageObject'],
                        'priceRange': 'Text',
                        'openingHours': 'Text',
                        'openingHoursSpecification': 'OpeningHoursSpecification',
                        'geo': 'GeoCoordinates',
                        'servesCuisine': 'Text',
                        'paymentAccepted': 'Text',
                        'currenciesAccepted': 'Text'
                    },
                    required: ['name', 'address'],
                    recommended: ['telephone', 'openingHours', 'priceRange', 'image']
                },
                
                // 미디어
                'ImageObject': {
                    properties: {
                        'contentUrl': 'URL',
                        'url': 'URL',
                        'width': 'Number',
                        'height': 'Number',
                        'caption': 'Text',
                        'exifData': 'Text',
                        'thumbnail': ['URL', 'ImageObject']
                    },
                    required: ['contentUrl'],
                    recommended: ['width', 'height']
                },
                
                'VideoObject': {
                    properties: {
                        'contentUrl': 'URL',
                        'embedUrl': 'URL',
                        'duration': 'Text',
                        'thumbnailUrl': 'URL',
                        'uploadDate': 'Date',
                        'width': 'Number',
                        'height': 'Number',
                        'description': 'Text',
                        'transcript': 'Text',
                        'caption': 'Text',
                        'thumbnail': ['URL', 'ImageObject']
                    },
                    required: ['contentUrl'],
                    recommended: ['thumbnailUrl', 'uploadDate', 'duration']
                },
                
                // 장소 및 주소
                'Place': {
                    properties: {
                        'name': 'Text',
                        'address': ['PostalAddress', 'Text'],
                        'geo': 'GeoCoordinates',
                        'telephone': 'Text',
                        'openingHoursSpecification': 'OpeningHoursSpecification',
                        'photo': ['ImageObject', 'URL'],
                        'url': 'URL'
                    },
                    required: ['name'],
                    recommended: ['address', 'geo']
                },
                
                'PostalAddress': {
                    properties: {
                        'streetAddress': 'Text',
                        'addressLocality': 'Text',
                        'addressRegion': 'Text',
                        'postalCode': 'Text',
                        'addressCountry': 'Text'
                    },
                    required: ['streetAddress'],
                    recommended: ['addressLocality', 'addressCountry']
                },
                
                'GeoCoordinates': {
                    properties: {
                        'latitude': 'Number',
                        'longitude': 'Number',
                        'elevation': 'Number'
                    },
                    required: ['latitude', 'longitude'],
                    recommended: []
                },
                
                // Recipe
                'Recipe': {
                    properties: {
                        'name': 'Text',
                        'author': ['Person', 'Organization'],
                        'description': 'Text',
                        'image': ['URL', 'ImageObject'],
                        'recipeIngredient': 'Text',
                        'recipeInstructions': ['Text', 'ItemList'],
                        'cookTime': 'Text',
                        'prepTime': 'Text',
                        'totalTime': 'Text',
                        'recipeYield': 'Text',
                        'nutrition': 'NutritionInformation',
                        'aggregateRating': 'AggregateRating',
                        'review': 'Review',
                        'recipeCuisine': 'Text',
                        'keywords': 'Text'
                    },
                    required: ['name', 'recipeIngredient', 'recipeInstructions'],
                    recommended: ['image', 'author', 'cookTime', 'recipeYield']
                }
            };
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.structuredData.schemaValidator = function(options) {
        return new SchemaValidator(options);
    };
    
    logger.debug('Schema.org 검증 엔진 모듈 초기화 완료');
})();