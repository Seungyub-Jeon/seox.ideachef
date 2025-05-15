/**
 * RDFa 구조화 데이터 파서
 * 
 * HTML 문서에서 RDFa 형식의 구조화 데이터를 감지하고 추출합니다.
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
     * RDFa 파서 클래스
     */
    class RDFaParser {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.namespaces = {
                '': 'http://schema.org/',
                'schema': 'http://schema.org/',
                'og': 'http://ogp.me/ns#',
                'fb': 'http://ogp.me/ns/fb#',
                'rdfs': 'http://www.w3.org/2000/01/rdf-schema#'
            };
            
            // 문서에서 prefix 속성으로 정의된 네임스페이스 파싱
            this._parseDocumentNamespaces();
        }
        
        /**
         * 문서에서 RDFa 감지
         * @return {boolean} RDFa 구조화 데이터 존재 여부
         */
        detect() {
            // RDFa 관련 속성을 가진 요소 탐색
            const elements = this.doc.querySelectorAll(
                '[property], [typeof], [vocab], [resource], [about]'
            );
            return elements.length > 0;
        }
        
        /**
         * 문서에서 모든 RDFa 데이터 추출
         * @return {Array} 추출된 RDFa 객체 배열
         */
        extract() {
            // vocab 또는 typeof가 있는 최상위 요소 찾기
            const topLevelElements = this._findTopLevelRDFaElements();
            const results = [];
            
            topLevelElements.forEach((element, index) => {
                try {
                    const rdfaData = this._extractRDFaData(element);
                    
                    // 유효한 데이터인 경우만 추가
                    if (this._isValidRDFa(rdfaData)) {
                        results.push(this._normalizeData(rdfaData, index, element));
                    }
                } catch (error) {
                    logger.warn('RDFa 파싱 오류', { 
                        error: error.message, 
                        element: element.outerHTML.substring(0, 100) + '...' 
                    });
                    
                    // 파싱 오류 정보 추가
                    results.push({
                        _error: true,
                        _format: 'rdfa',
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
         * 문서에서 정의된 네임스페이스 파싱
         */
        _parseDocumentNamespaces() {
            // html, head, body 요소에서 prefix 속성 확인
            const elements = [
                this.doc.documentElement,
                this.doc.head,
                this.doc.body
            ];
            
            elements.forEach(element => {
                if (element && element.hasAttribute('prefix')) {
                    const prefixAttr = element.getAttribute('prefix');
                    this._parsePrefixAttribute(prefixAttr);
                }
            });
        }
        
        /**
         * prefix 속성 파싱
         * @param {string} prefixAttr - prefix 속성값 
         */
        _parsePrefixAttribute(prefixAttr) {
            if (!prefixAttr) return;
            
            // prefix 정의 분리 (예: 'og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#')
            const parts = prefixAttr.split(/\s+/);
            
            for (let i = 0; i < parts.length - 1; i += 2) {
                const prefix = parts[i].replace(':', '');
                const uri = parts[i + 1];
                
                if (prefix && uri) {
                    this.namespaces[prefix] = uri;
                }
            }
        }
        
        /**
         * 최상위 RDFa 요소 찾기
         * @return {Array} 최상위 RDFa 요소 배열
         */
        _findTopLevelRDFaElements() {
            // vocab 속성이 있는 요소
            const vocabElements = Array.from(this.doc.querySelectorAll('[vocab]'));
            
            // typeof 속성이 있고 상위에 typeof를 가진 요소가 없는 요소
            const typeofElements = Array.from(this.doc.querySelectorAll('[typeof]')).filter(element => {
                let parent = element.parentElement;
                
                while (parent) {
                    if (parent.hasAttribute('typeof')) {
                        return false;
                    }
                    parent = parent.parentElement;
                }
                
                return true;
            });
            
            // about 속성이 있는 요소
            const aboutElements = Array.from(this.doc.querySelectorAll('[about]'));
            
            // 중복 제거 후 반환
            return [...new Set([...vocabElements, ...typeofElements, ...aboutElements])];
        }
        
        /**
         * 요소에서 RDFa 데이터 추출
         * @param {Element} element - RDFa 요소
         * @return {Object} 추출된 데이터 객체
         */
        _extractRDFaData(element) {
            const result = {};
            
            // vocab 속성 처리
            if (element.hasAttribute('vocab')) {
                const vocab = element.getAttribute('vocab');
                if (vocab) {
                    result['@context'] = vocab;
                }
            }
            
            // typeof 속성 처리
            if (element.hasAttribute('typeof')) {
                const typeValue = element.getAttribute('typeof');
                result['@type'] = this._expandTerm(typeValue);
            }
            
            // about 또는 resource 속성 처리
            if (element.hasAttribute('about')) {
                result['@id'] = element.getAttribute('about');
            } else if (element.hasAttribute('resource')) {
                result['@id'] = element.getAttribute('resource');
            }
            
            // property 속성이 있는 모든 하위 요소 처리
            const propertyElements = this._findPropertyElements(element);
            
            propertyElements.forEach(propElement => {
                const propName = propElement.getAttribute('property');
                if (!propName) return;
                
                const expandedProp = this._expandTerm(propName);
                
                // property 값 추출
                if (propElement.hasAttribute('typeof')) {
                    // 중첩된 객체인 경우
                    const nestedData = this._extractRDFaData(propElement);
                    this._addPropertyToResult(result, expandedProp, nestedData);
                } else if (propElement.hasAttribute('content')) {
                    // content 속성이 있는 경우
                    const content = propElement.getAttribute('content');
                    this._addPropertyToResult(result, expandedProp, content);
                } else if (propElement.hasAttribute('resource')) {
                    // resource 속성이 있는 경우 (URI 참조)
                    const resource = propElement.getAttribute('resource');
                    this._addPropertyToResult(result, expandedProp, resource);
                } else {
                    // 일반 텍스트 내용
                    const content = this._getElementValue(propElement);
                    this._addPropertyToResult(result, expandedProp, content);
                }
            });
            
            return result;
        }
        
        /**
         * 요소값 추출
         * @param {Element} element - 요소
         * @return {string} 추출된 값
         */
        _getElementValue(element) {
            const tagName = element.tagName.toLowerCase();
            
            if (tagName === 'meta') {
                return element.getAttribute('content') || '';
            }
            
            if (tagName === 'a' || tagName === 'link') {
                return element.href || '';
            }
            
            if (tagName === 'img') {
                return element.src || '';
            }
            
            if (tagName === 'time') {
                return element.getAttribute('datetime') || element.textContent.trim();
            }
            
            if (['audio', 'embed', 'iframe', 'source', 'track', 'video'].includes(tagName)) {
                return element.src || '';
            }
            
            if (tagName === 'data') {
                return element.getAttribute('value') || element.textContent.trim();
            }
            
            return element.textContent.trim();
        }
        
        /**
         * 요소 내에서 property 속성을 가진 요소 찾기
         * @param {Element} element - 부모 요소
         * @return {Array} property 속성을 가진 요소 배열
         */
        _findPropertyElements(element) {
            const allPropertyElements = Array.from(element.querySelectorAll('[property]'));
            
            // 다른 typeof 요소의 하위가 아닌 property 요소만 필터링
            return allPropertyElements.filter(propElement => {
                let parent = propElement.parentElement;
                
                while (parent && parent !== element) {
                    if (parent.hasAttribute('typeof') && parent !== propElement) {
                        return false; // 다른 typeof 요소의 하위임
                    }
                    parent = parent.parentElement;
                }
                
                return true;
            });
        }
        
        /**
         * 접두사가 있는 용어 확장
         * @param {string} term - 확장할 용어 (예: 'schema:Person')
         * @return {string} 확장된 용어
         */
        _expandTerm(term) {
            if (!term) return '';
            
            // 이미 URI인 경우
            if (term.includes('://')) {
                return term;
            }
            
            // 접두사 분리
            const parts = term.split(':');
            
            if (parts.length === 2) {
                const prefix = parts[0];
                const localName = parts[1];
                
                // 알려진 접두사인 경우 확장
                if (this.namespaces[prefix]) {
                    return localName;
                }
            }
            
            // 접두사가 없거나 알 수 없는 접두사인 경우 원래 용어 반환
            return term;
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
         * RDFa 객체를 정규화된 형식으로 변환
         * @param {Object} data - RDFa 객체
         * @param {number} index - 요소 인덱스
         * @param {Element} element - 원본 요소
         * @return {Object} 정규화된 구조화 데이터 객체
         */
        _normalizeData(data, index, element) {
            // 기본 메타데이터 추가
            const normalized = {
                ...data,
                _format: 'rdfa',
                _index: index,
                _element: element,
                _extracted: new Date().toISOString()
            };
            
            // @context 없으면 기본값 추가
            if (!normalized['@context']) {
                normalized['@context'] = 'https://schema.org';
            }
            
            return normalized;
        }
        
        /**
         * RDFa 객체 유효성 검사
         * @param {Object} data - 검사할 객체
         * @return {boolean} 유효한 RDFa 객체 여부
         */
        _isValidRDFa(data) {
            // 빈 객체 또는 객체가 아닌 경우
            if (!data || typeof data !== 'object') {
                return false;
            }
            
            // @type 또는 속성이 하나라도 있어야 함
            const hasType = data['@type'] !== undefined;
            
            // 속성이 하나라도 있는지 확인 (@type, @id, @context, _format 등 메타 속성 제외)
            const hasProps = Object.keys(data).some(key => !key.startsWith('@') && !key.startsWith('_'));
            
            return hasType || hasProps;
        }
        
        /**
         * 스키마 타입 목록 추출
         * @param {Array} rdfaItems - RDFa 객체 배열
         * @return {Array} 추출된 스키마 타입 목록
         */
        extractSchemaTypes(rdfaItems) {
            const types = new Set();
            
            rdfaItems.forEach(item => {
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
         * @param {Object} item - RDFa 객체
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
    window.KoreanWebAnalyzer.analyzer.structuredData.rdfaParser = function(doc) {
        return new RDFaParser(doc);
    };
    
    logger.debug('RDFa 구조화 데이터 파서 모듈 초기화 완료');
})();