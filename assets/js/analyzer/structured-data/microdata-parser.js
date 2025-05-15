/**
 * Microdata 구조화 데이터 파서
 * 
 * HTML 문서에서 Microdata 형식의 구조화 데이터를 감지하고 추출합니다.
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
     * Microdata 파서 클래스
     */
    class MicrodataParser {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
        }
        
        /**
         * 문서에서 Microdata 감지
         * @return {boolean} Microdata 구조화 데이터 존재 여부
         */
        detect() {
            // itemscope 또는 itemtype 속성을 가진 요소 탐색
            const elements = this.doc.querySelectorAll('[itemscope], [itemtype]');
            return elements.length > 0;
        }
        
        /**
         * 문서에서 모든 Microdata 데이터 추출
         * @return {Array} 추출된 Microdata 객체 배열
         */
        extract() {
            // 최상위 itemscope 요소 찾기 (부모에 itemscope가 없는 것)
            const topLevelElements = this._findTopLevelItemScopes();
            const results = [];
            
            topLevelElements.forEach((element, index) => {
                try {
                    const itemData = this._extractItemData(element);
                    
                    // 유효한 아이템인 경우만 추가
                    if (this._isValidMicrodata(itemData)) {
                        results.push(this._normalizeData(itemData, index, element));
                    }
                } catch (error) {
                    logger.warn('Microdata 파싱 오류', { 
                        error: error.message, 
                        element: element.outerHTML.substring(0, 100) + '...' 
                    });
                    
                    // 파싱 오류 정보 추가
                    results.push({
                        _error: true,
                        _format: 'microdata',
                        _index: index,
                        _message: error.message,
                        _element: element,
                        _raw: element.outerHTML
                    });
                }
            });
            
            return results;
        }
        
        /**
         * 최상위 itemscope 요소 찾기
         * @return {Array} 최상위 itemscope 요소 배열
         */
        _findTopLevelItemScopes() {
            const allItemScopes = Array.from(this.doc.querySelectorAll('[itemscope]'));
            
            // 부모에 itemscope가 없는 요소만 필터링
            return allItemScopes.filter(element => {
                let parent = element.parentElement;
                
                while (parent) {
                    if (parent.hasAttribute('itemscope')) {
                        return false;
                    }
                    parent = parent.parentElement;
                }
                
                return true;
            });
        }
        
        /**
         * 요소에서 Microdata 데이터 추출
         * @param {Element} element - Microdata 요소
         * @return {Object} 추출된 데이터 객체
         */
        _extractItemData(element) {
            const result = {};
            
            // itemtype 추출
            if (element.hasAttribute('itemtype')) {
                result['@type'] = this._getTypeName(element.getAttribute('itemtype'));
            }
            
            // itemid 추출
            if (element.hasAttribute('itemid')) {
                result['@id'] = element.getAttribute('itemid');
            }
            
            // itemprop 처리 (현재 요소의 속성)
            if (element.hasAttribute('itemprop')) {
                const propName = element.getAttribute('itemprop');
                const propValue = this._getPropertyValue(element);
                
                // 특수 처리: 현재 요소가 itemscope와 itemprop을 모두 가지면
                // 그 자체가 중첩된 객체임
                if (propName && propValue !== null) {
                    // 이 경우는 현재 노드가 중첩 항목임
                    return {
                        [propName]: result
                    };
                }
            }
            
            // 속성 추출
            const propElements = element.querySelectorAll('[itemprop]');
            
            propElements.forEach(propElement => {
                // 중간에 다른 itemscope가 있으면 건너뜀 (중첩 처리 위함)
                let parent = propElement.parentElement;
                while (parent && parent !== element) {
                    if (parent.hasAttribute('itemscope') && parent !== propElement) {
                        return; // 이 속성은 다른 항목에 속함
                    }
                    parent = parent.parentElement;
                }
                
                const propName = propElement.getAttribute('itemprop');
                
                // 속성값 추출
                if (propElement.hasAttribute('itemscope')) {
                    // 중첩된 항목 처리
                    const nestedData = this._extractItemData(propElement);
                    this._addPropertyToResult(result, propName, nestedData);
                } else {
                    // 일반 속성 처리
                    const propValue = this._getPropertyValue(propElement);
                    if (propValue !== null) {
                        this._addPropertyToResult(result, propName, propValue);
                    }
                }
            });
            
            return result;
        }
        
        /**
         * itemtype URL에서 타입명 추출
         * @param {string} itemtype - itemtype 속성값 
         * @return {string} 추출된 타입명
         */
        _getTypeName(itemtype) {
            if (!itemtype) return '';
            
            // URL에서 마지막 세그먼트 추출
            const parts = itemtype.split('/');
            const lastPart = parts[parts.length - 1].split('#');
            
            return lastPart[lastPart.length - 1]; 
        }
        
        /**
         * 요소에서 속성값 추출
         * @param {Element} element - 속성 요소
         * @return {any} 추출된 속성값
         */
        _getPropertyValue(element) {
            const tagName = element.tagName.toLowerCase();
            
            // meta 태그
            if (tagName === 'meta') {
                return element.getAttribute('content') || '';
            }
            
            // 링크, 이미지 등
            if (tagName === 'a' || tagName === 'link') {
                return element.href || '';
            }
            
            if (tagName === 'img') {
                return element.src || '';
            }
            
            // 시간 요소
            if (tagName === 'time') {
                return element.getAttribute('datetime') || element.textContent.trim();
            }
            
            // 오디오, 비디오, 소스 요소
            if (['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(tagName)) {
                return element.src || '';
            }
            
            // data 요소
            if (tagName === 'data') {
                return element.getAttribute('value') || element.textContent.trim();
            }
            
            // 그 외의 경우 텍스트 내용 반환
            return element.textContent.trim();
        }
        
        /**
         * 결과 객체에 속성 추가 (중복 처리 포함)
         * @param {Object} result - 결과 객체
         * @param {string} propName - 속성명
         * @param {any} propValue - 속성값
         */
        _addPropertyToResult(result, propName, propValue) {
            // 이미 해당 속성이 있는 경우
            if (propName in result) {
                // 이미 배열인 경우 추가
                if (Array.isArray(result[propName])) {
                    result[propName].push(propValue);
                } else {
                    // 배열로 변환하여 추가
                    result[propName] = [result[propName], propValue];
                }
            } else {
                // 새 속성 추가
                result[propName] = propValue;
            }
        }
        
        /**
         * Microdata 객체를 정규화된 형식으로 변환
         * @param {Object} data - Microdata 객체
         * @param {number} index - 요소 인덱스
         * @param {Element} element - 원본 요소
         * @return {Object} 정규화된 구조화 데이터 객체
         */
        _normalizeData(data, index, element) {
            // 기본 메타데이터 추가
            const normalized = {
                ...data,
                _format: 'microdata',
                _index: index,
                _element: element,
                _extracted: new Date().toISOString()
            };
            
            // @context 추가 (Schema.org 기본값)
            if (!normalized['@context']) {
                normalized['@context'] = 'https://schema.org';
            }
            
            return normalized;
        }
        
        /**
         * Microdata 객체 유효성 검사
         * @param {Object} data - 검사할 객체
         * @return {boolean} 유효한 Microdata 객체 여부
         */
        _isValidMicrodata(data) {
            // 최소한 @type 또는 itemprop이 있는지 확인
            if (!data || typeof data !== 'object') {
                return false;
            }
            
            const hasType = data['@type'] !== undefined;
            
            // 속성이 하나라도 있는지 확인 (@type, @id, _format 등 메타 속성 제외)
            const hasProps = Object.keys(data).some(key => !key.startsWith('@') && !key.startsWith('_'));
            
            return hasType && hasProps;
        }
        
        /**
         * 스키마 타입 목록 추출
         * @param {Array} microdataItems - Microdata 객체 배열
         * @return {Array} 추출된 스키마 타입 목록
         */
        extractSchemaTypes(microdataItems) {
            const types = new Set();
            
            microdataItems.forEach(item => {
                if (item._error) {
                    return;
                }
                
                if (item['@type']) {
                    if (Array.isArray(item['@type'])) {
                        item['@type'].forEach(type => types.add(type));
                    } else {
                        types.add(item['@type']);
                    }
                }
                
                // 중첩 속성에서 타입 추출
                this._extractNestedTypes(item, types);
            });
            
            return Array.from(types);
        }
        
        /**
         * 중첩된 객체에서 타입 추출
         * @param {Object} item - Microdata 객체
         * @param {Set} types - 타입 집합
         */
        _extractNestedTypes(item, types) {
            for (const key in item) {
                if (key.startsWith('@') || key.startsWith('_')) continue;
                
                const value = item[key];
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    if (value['@type']) {
                        if (Array.isArray(value['@type'])) {
                            value['@type'].forEach(type => types.add(type));
                        } else {
                            types.add(value['@type']);
                        }
                    }
                    // 재귀적으로 중첩 객체 처리
                    this._extractNestedTypes(value, types);
                } else if (Array.isArray(value)) {
                    // 배열 항목 처리
                    value.forEach(item => {
                        if (typeof item === 'object' && item !== null) {
                            if (item['@type']) {
                                if (Array.isArray(item['@type'])) {
                                    item['@type'].forEach(type => types.add(type));
                                } else {
                                    types.add(item['@type']);
                                }
                            }
                            this._extractNestedTypes(item, types);
                        }
                    });
                }
            }
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.structuredData.microdataParser = function(doc) {
        return new MicrodataParser(doc);
    };
    
    logger.debug('Microdata 구조화 데이터 파서 모듈 초기화 완료');
})();