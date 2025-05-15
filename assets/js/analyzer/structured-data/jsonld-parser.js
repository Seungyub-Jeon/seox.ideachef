/**
 * JSON-LD 구조화 데이터 파서
 * 
 * HTML 문서에서 JSON-LD 형식의 구조화 데이터를 감지하고 추출합니다.
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
     * JSON-LD 파서 클래스
     */
    class JSONLDParser {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
        }
        
        /**
         * 문서에서 JSON-LD 스크립트 감지
         * @return {boolean} JSON-LD 구조화 데이터 존재 여부
         */
        detect() {
            const scripts = this.doc.querySelectorAll('script[type="application/ld+json"]');
            return scripts.length > 0;
        }
        
        /**
         * 문서에서 모든 JSON-LD 데이터 추출
         * @return {Array} 추출된 JSON-LD 객체 배열
         */
        extract() {
            const scripts = this.doc.querySelectorAll('script[type="application/ld+json"]');
            const results = [];
            
            scripts.forEach((script, index) => {
                try {
                    const content = script.textContent.trim();
                    if (!content) {
                        return;
                    }
                    
                    const jsonData = JSON.parse(content);
                    
                    // JSON-LD 객체 또는 배열을 결과에 추가
                    if (Array.isArray(jsonData)) {
                        jsonData.forEach(item => {
                            if (this._isValidJSONLD(item)) {
                                results.push(this._normalizeData(item, index));
                            }
                        });
                    } else if (this._isValidJSONLD(jsonData)) {
                        results.push(this._normalizeData(jsonData, index));
                    }
                } catch (error) {
                    logger.warn('JSON-LD 파싱 오류', { 
                        error: error.message, 
                        script: script.textContent.substring(0, 100) + '...'
                    });
                    
                    // 파싱 오류 정보 추가
                    results.push({
                        _error: true,
                        _format: 'json-ld',
                        _index: index,
                        _message: error.message,
                        _raw: script.textContent
                    });
                }
            });
            
            return results;
        }
        
        /**
         * JSON-LD 객체를 정규화된 형식으로 변환
         * @param {Object} data - JSON-LD 객체
         * @param {number} index - 스크립트 인덱스
         * @return {Object} 정규화된 구조화 데이터 객체
         */
        _normalizeData(data, index) {
            // 기본 메타데이터 추가
            const normalized = {
                ...data,
                _format: 'json-ld',
                _index: index,
                _extracted: new Date().toISOString()
            };
            
            // @context가 문자열이거나 없는 경우 표준 context 설정
            if (typeof normalized['@context'] === 'string' || !normalized['@context']) {
                normalized['@context'] = {
                    _original: normalized['@context'] || '',
                    _normalized: 'https://schema.org'
                };
            }
            
            return normalized;
        }
        
        /**
         * JSON-LD 객체 유효성 검사
         * @param {Object} data - 검사할 객체
         * @return {boolean} 유효한 JSON-LD 객체 여부
         */
        _isValidJSONLD(data) {
            // 최소한 @context와 @type이 있어야 함
            if (!data || typeof data !== 'object') {
                return false;
            }
            
            // @graph 컨테이너 확인
            if (data['@graph'] && Array.isArray(data['@graph'])) {
                return true;
            }
            
            // @context 확인 (문자열 또는 객체)
            const hasContext = data['@context'] !== undefined;
            
            // @type 또는 @id 확인
            const hasType = data['@type'] !== undefined;
            const hasId = data['@id'] !== undefined;
            
            return hasContext && (hasType || hasId);
        }
        
        /**
         * 스키마 타입 목록 추출
         * @param {Array} jsonldData - JSON-LD 객체 배열
         * @return {Array} 추출된 스키마 타입 목록
         */
        extractSchemaTypes(jsonldData) {
            const types = new Set();
            
            jsonldData.forEach(data => {
                if (data._error) {
                    return;
                }
                
                // @type 처리
                if (data['@type']) {
                    if (Array.isArray(data['@type'])) {
                        data['@type'].forEach(type => types.add(type));
                    } else {
                        types.add(data['@type']);
                    }
                }
                
                // @graph 내의 @type 처리
                if (data['@graph'] && Array.isArray(data['@graph'])) {
                    data['@graph'].forEach(item => {
                        if (item['@type']) {
                            if (Array.isArray(item['@type'])) {
                                item['@type'].forEach(type => types.add(type));
                            } else {
                                types.add(item['@type']);
                            }
                        }
                    });
                }
            });
            
            return Array.from(types);
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.structuredData.jsonldParser = function(doc) {
        return new JSONLDParser(doc);
    };
    
    logger.debug('JSON-LD 구조화 데이터 파서 모듈 초기화 완료');
})();