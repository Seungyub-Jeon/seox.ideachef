/**
 * 한국어 웹사이트 분석기
 * 문자 인코딩 분석 컴포넌트
 * 
 * 웹페이지의 문자 인코딩 선언과 실제 인코딩 상태를 분석하고,
 * 잠재적인 인코딩 문제를 감지합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer) {
        window.KoreanWebAnalyzer.analyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer.i18n) {
        window.KoreanWebAnalyzer.analyzer.i18n = {};
    }
    
    // 자주 사용되는 인코딩 목록
    const commonEncodings = {
        'utf-8': '유니코드 (UTF-8)',
        'utf-16': '유니코드 (UTF-16)',
        'iso-8859-1': 'ISO 8859-1 (Latin-1)',
        'windows-1252': 'Windows-1252 (서유럽 언어)',
        'euc-kr': 'EUC-KR (한국어)',
        'ks_c_5601-1987': 'KS X 1001 (한국어)',
        'iso-2022-kr': 'ISO-2022-KR (한국어)',
        'shift_jis': 'Shift-JIS (일본어)',
        'euc-jp': 'EUC-JP (일본어)',
        'iso-2022-jp': 'ISO-2022-JP (일본어)',
        'gb2312': 'GB2312 (중국어 간체)',
        'gbk': 'GBK (중국어 간체)',
        'big5': 'Big5 (중국어 번체)',
        'iso-8859-2': 'ISO 8859-2 (중앙유럽 언어)',
        'windows-1251': 'Windows-1251 (키릴 문자)',
        'koi8-r': 'KOI8-R (러시아어)'
    };
    
    /**
     * 문자 인코딩 분석 클래스
     */
    class EncodingAnalyzer {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.doc = document;
        }
        
        /**
         * 문서의 인코딩 선언 분석
         * @return {Object} 인코딩 선언 분석 결과
         */
        analyzeEncodingDeclarations() {
            const results = {
                metaCharset: null,
                contentTypeCharset: null,
                httpEquivCharset: null,
                xmlEncoding: null,
                detectedEncodings: [],
                issues: []
            };
            
            // 1. <meta charset="..."> 형식 (HTML5)
            const metaCharset = this.doc.querySelector('meta[charset]');
            if (metaCharset) {
                const charset = metaCharset.getAttribute('charset').toLowerCase();
                results.metaCharset = {
                    value: charset,
                    description: this._getEncodingDescription(charset),
                    element: metaCharset
                };
                
                results.detectedEncodings.push({
                    type: 'meta-charset',
                    value: charset,
                    description: this._getEncodingDescription(charset)
                });
                
                // 유효하지 않은 인코딩 값 검사
                if (!this._isValidEncoding(charset)) {
                    results.issues.push({
                        type: 'invalid-charset',
                        severity: 'error',
                        message: `'${charset}'은(는) 유효한 문자 인코딩이 아닙니다.`,
                        element: metaCharset
                    });
                }
            }
            
            // 2. <meta http-equiv="Content-Type" content="text/html; charset=..."> 형식 (HTML4)
            const metaHttpEquiv = this.doc.querySelector('meta[http-equiv="Content-Type"], meta[http-equiv="content-type"]');
            if (metaHttpEquiv) {
                const content = metaHttpEquiv.getAttribute('content') || '';
                const charsetMatch = content.match(/charset=([^;]+)/i);
                
                if (charsetMatch && charsetMatch[1]) {
                    const charset = charsetMatch[1].trim().toLowerCase();
                    results.httpEquivCharset = {
                        value: charset,
                        description: this._getEncodingDescription(charset),
                        element: metaHttpEquiv
                    };
                    
                    results.detectedEncodings.push({
                        type: 'http-equiv',
                        value: charset,
                        description: this._getEncodingDescription(charset)
                    });
                    
                    // 유효하지 않은 인코딩 값 검사
                    if (!this._isValidEncoding(charset)) {
                        results.issues.push({
                            type: 'invalid-http-equiv-charset',
                            severity: 'error',
                            message: `'${charset}'은(는) 유효한 문자 인코딩이 아닙니다.`,
                            element: metaHttpEquiv
                        });
                    }
                } else {
                    // charset 값이 없는 Content-Type
                    results.issues.push({
                        type: 'missing-charset-in-content-type',
                        severity: 'error',
                        message: 'Content-Type meta 태그에 charset이 지정되지 않았습니다.',
                        element: metaHttpEquiv
                    });
                }
            }
            
            // 3. XML 선언 인코딩 (XHTML 문서)
            const xmlDeclaration = this.doc.querySelector('xml');
            if (xmlDeclaration && xmlDeclaration.hasAttribute('encoding')) {
                const encoding = xmlDeclaration.getAttribute('encoding').toLowerCase();
                results.xmlEncoding = {
                    value: encoding,
                    description: this._getEncodingDescription(encoding),
                    element: xmlDeclaration
                };
                
                results.detectedEncodings.push({
                    type: 'xml-declaration',
                    value: encoding,
                    description: this._getEncodingDescription(encoding)
                });
            }
            
            // 인코딩 선언 누락 이슈
            if (!results.metaCharset && !results.httpEquivCharset && !results.xmlEncoding) {
                results.issues.push({
                    type: 'missing-charset-declaration',
                    severity: 'error',
                    message: '문서에 문자 인코딩 선언이 없습니다.',
                    element: this.doc.head || this.doc.documentElement
                });
            }
            
            // 인코딩 선언 불일치 검사
            if (results.detectedEncodings.length > 1) {
                const encodings = results.detectedEncodings.map(enc => enc.value);
                const uniqueEncodings = new Set(encodings);
                
                if (uniqueEncodings.size > 1) {
                    results.issues.push({
                        type: 'inconsistent-encoding-declarations',
                        severity: 'error',
                        message: '문서에 서로 다른 문자 인코딩 선언이 있습니다.',
                        details: `발견된 인코딩: ${Array.from(uniqueEncodings).join(', ')}`,
                        element: this.doc.head || this.doc.documentElement
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 인코딩 불일치 또는 렌더링 문제 감지
         * @return {Object} 인코딩 문제 감지 결과
         */
        detectEncodingIssues() {
            const results = {
                potentialIssues: [],
                hasEncodingIssues: false,
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석 수행
            if (this.isBookmarklet) {
                return this._simplifiedEncodingIssueDetection();
            }
            
            // 인코딩 선언 분석 결과
            const declarations = this.analyzeEncodingDeclarations();
            
            // 1. 모지바케(mojibake) 패턴 검사
            const textNodes = this._getAllTextNodes(this.doc.body);
            const problematicCharCount = this._countProblematicCharacters(textNodes);
            
            if (problematicCharCount > 10) {
                results.potentialIssues.push({
                    type: 'mojibake',
                    severity: 'error',
                    message: '문서에 인코딩 오류로 인한 깨진 문자가 발견되었습니다.',
                    details: `발견된 깨진 문자 수: ${problematicCharCount}`,
                    element: this.doc.body
                });
                results.hasEncodingIssues = true;
            }
            
            // 2. 인코딩과 언어 호환성 검사
            const htmlLang = this.doc.documentElement.getAttribute('lang');
            if (htmlLang) {
                const baseCode = htmlLang.split('-')[0].toLowerCase();
                const declaredEncoding = (declarations.metaCharset && declarations.metaCharset.value) || 
                                         (declarations.httpEquivCharset && declarations.httpEquivCharset.value) || 
                                         (declarations.xmlEncoding && declarations.xmlEncoding.value);
                
                if (declaredEncoding) {
                    // CJK 언어 호환성 검사
                    if (['ko', 'ja', 'zh'].includes(baseCode)) {
                        if (declaredEncoding === 'iso-8859-1' || declaredEncoding === 'windows-1252') {
                            results.potentialIssues.push({
                                type: 'encoding-language-mismatch',
                                severity: 'error',
                                message: `${baseCode === 'ko' ? '한국어' : baseCode === 'ja' ? '일본어' : '중국어'} 페이지에 부적합한 인코딩(${declaredEncoding})이 사용되었습니다.`,
                                details: `아시아 언어에는 UTF-8 또는 해당 언어 전용 인코딩을 사용해야 합니다.`,
                                element: this.doc.documentElement
                            });
                            results.hasEncodingIssues = true;
                        }
                    }
                    
                    // 아랍어, 히브리어 등 RTL 언어 호환성 검사
                    if (['ar', 'he', 'fa'].includes(baseCode) && declaredEncoding !== 'utf-8' && declaredEncoding !== 'utf-16') {
                        results.potentialIssues.push({
                            type: 'encoding-language-mismatch',
                            severity: 'error',
                            message: `RTL 언어 페이지에 부적합한 인코딩(${declaredEncoding})이 사용되었습니다.`,
                            details: `RTL 언어에는 UTF-8 또는 UTF-16 인코딩을 사용해야 합니다.`,
                            element: this.doc.documentElement
                        });
                        results.hasEncodingIssues = true;
                    }
                }
            }
            
            // 3. 이슈 통합
            results.issues = [...results.potentialIssues, ...declarations.issues];
            
            return results;
        }
        
        /**
         * 간소화된 인코딩 이슈 감지 (북마클릿 모드용)
         * @return {Object} 간소화된 인코딩 이슈 감지 결과
         */
        _simplifiedEncodingIssueDetection() {
            const results = {
                potentialIssues: [],
                hasEncodingIssues: false,
                issues: []
            };
            
            // 인코딩 선언 분석
            const declarations = this.analyzeEncodingDeclarations();
            
            // 기본 이슈만 추가
            results.issues = [...declarations.issues];
            results.hasEncodingIssues = declarations.issues.length > 0;
            
            return results;
        }
        
        /**
         * 문서 내 모든 텍스트 노드 가져오기
         * @param {Node} node - 시작 노드
         * @return {Array} 텍스트 노드 배열
         */
        _getAllTextNodes(node) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                node,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                // 공백만 있는 노드는 제외
                if (currentNode.nodeValue.trim().length > 0) {
                    textNodes.push(currentNode);
                }
            }
            
            return textNodes;
        }
        
        /**
         * 텍스트 노드에서 인코딩 문제를 나타내는 문자 카운트
         * @param {Array} textNodes - 텍스트 노드 배열
         * @return {number} 문제 문자 수
         */
        _countProblematicCharacters(textNodes) {
            let count = 0;
            
            // 모지바케(mojibake) 패턴 및 인코딩 오류 문자
            const problematicPatterns = [
                /â€/g,        // UTF-8 인코딩이 ISO-8859-1으로 잘못 해석된 경우
                /Ã¢â‚¬â„¢/g, // 다중 인코딩 오류
                /ï¿½/g,       // 대체 문자 (�)
                /ï»¿/g,       // UTF-8 BOM이 텍스트로 보이는 경우
                /ã€/g,        // 일본어/중국어 인코딩 오류
                /ì/g,         // 한국어 인코딩 오류 (ㅇ)
                /í/g,         // 한국어 인코딩 오류 (ㅎ)
                /å¤/g,        // 중국어 인코딩 오류
                /æ¥/g,        // 일본어 인코딩 오류
                /Ð/g,         // 키릴 문자 인코딩 오류
                /Ø/g,         // 아랍어/히브리어 인코딩 오류
                /Þ/g,         // 북유럽 언어 인코딩 오류
                /â€œ|â€/g,   // 인용 부호 인코딩 오류
            ];
            
            textNodes.forEach(node => {
                const text = node.nodeValue;
                
                problematicPatterns.forEach(pattern => {
                    const matches = text.match(pattern);
                    if (matches) {
                        count += matches.length;
                    }
                });
                
                // 유니코드 대체 문자(�) 카운트
                const replacementChars = text.match(/\uFFFD/g);
                if (replacementChars) {
                    count += replacementChars.length;
                }
            });
            
            return count;
        }
        
        /**
         * 인코딩 값이 유효한지 확인
         * @param {string} encoding - 인코딩 값
         * @return {boolean} 유효성 여부
         */
        _isValidEncoding(encoding) {
            if (!encoding) return false;
            
            const normalizedEncoding = encoding.toLowerCase().trim();
            
            // 일반적인 인코딩 목록에 있는지 확인
            if (commonEncodings.hasOwnProperty(normalizedEncoding)) {
                return true;
            }
            
            // 기타 유효한 인코딩 패턴 확인
            // IANA 문자셋 레지스트리에 있는 인코딩 형식을 따르는지 검사
            return /^[a-z0-9._-]+$/i.test(normalizedEncoding);
        }
        
        /**
         * 인코딩 설명 반환
         * @param {string} encoding - 인코딩 값
         * @return {string} 인코딩 설명
         */
        _getEncodingDescription(encoding) {
            if (!encoding) return '알 수 없음';
            
            const normalizedEncoding = encoding.toLowerCase().trim();
            return commonEncodings[normalizedEncoding] || normalizedEncoding;
        }
        
        /**
         * 전체 인코딩 분석 수행
         * @return {Object} 인코딩 분석 결과
         */
        analyze() {
            const results = {
                declarations: this.analyzeEncodingDeclarations(),
                issues: this.detectEncodingIssues(),
                recommendedEncoding: 'utf-8',
                score: 0
            };
            
            // 모든 이슈 통합
            const allIssues = [
                ...results.declarations.issues,
                ...results.issues.issues
            ];
            
            results.allIssues = allIssues;
            
            // 점수 계산
            const score = this._calculateScore(results);
            results.score = score;
            
            return results;
        }
        
        /**
         * 인코딩 분석 점수 계산
         * @param {Object} results - 분석 결과
         * @return {number} 점수 (0-100)
         */
        _calculateScore(results) {
            let score = 100;
            
            // 인코딩 선언이 없는 경우 (30점 감점)
            if (results.declarations.detectedEncodings.length === 0) {
                score -= 30;
            }
            
            // 인코딩 선언이 일관되지 않은 경우 (20점 감점)
            if (results.declarations.detectedEncodings.length > 1) {
                const encodings = results.declarations.detectedEncodings.map(enc => enc.value);
                const uniqueEncodings = new Set(encodings);
                
                if (uniqueEncodings.size > 1) {
                    score -= 20;
                }
            }
            
            // 인코딩 이슈가 있는 경우 (30점 감점)
            if (results.issues.hasEncodingIssues) {
                score -= 30;
            }
            
            // 이슈 심각도에 따른 감점
            const errorCount = results.allIssues.filter(issue => issue.severity === 'error').length;
            const warningCount = results.allIssues.filter(issue => issue.severity === 'warning').length;
            
            score -= errorCount * 10;
            score -= warningCount * 5;
            
            // 최소 점수 0, 최대 점수 100으로 제한
            return Math.max(0, Math.min(100, score));
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.i18n.EncodingAnalyzer = EncodingAnalyzer;
    
    // 인코딩 분석 함수 등록
    window.KoreanWebAnalyzer.analyzer.i18n.analyzeEncoding = function(isBookmarklet = false) {
        const analyzer = new EncodingAnalyzer(isBookmarklet);
        return analyzer.analyze();
    };
})();