/**
 * 한국어 웹사이트 분석기
 * 언어 감지 및 분석 컴포넌트
 * 
 * 웹페이지에서 사용되는 언어 관련 요소를 분석하고
 * 다국어 지원, 언어 전환 메커니즘 등을 감지합니다.
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
    
    // 언어 코드 ISO 639-1 매핑 (주요 언어)
    const languageCodes = {
        'ar': '아랍어',
        'bn': '벵골어',
        'cs': '체코어',
        'da': '덴마크어',
        'de': '독일어',
        'el': '그리스어',
        'en': '영어',
        'es': '스페인어',
        'fi': '핀란드어',
        'fr': '프랑스어',
        'he': '히브리어',
        'hi': '힌디어',
        'hu': '헝가리어',
        'id': '인도네시아어',
        'it': '이탈리아어',
        'ja': '일본어',
        'ko': '한국어',
        'nl': '네덜란드어',
        'no': '노르웨이어',
        'pl': '폴란드어',
        'pt': '포르투갈어',
        'ro': '루마니아어',
        'ru': '러시아어',
        'sv': '스웨덴어',
        'th': '태국어',
        'tr': '터키어',
        'uk': '우크라이나어',
        'vi': '베트남어',
        'zh': '중국어'
    };
    
    // RTL(Right-to-Left) 언어 목록
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'dv', 'ha', 'yi', 'ps'];
    
    /**
     * 언어 감지 및 분석 클래스
     */
    class LanguageDetector {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.doc = document;
        }
        
        /**
         * 문서 및 요소의 lang 속성 분석
         * @return {Object} 언어 속성 결과
         */
        detectLangAttributes() {
            const results = {
                documentLang: null,
                elementLangs: [],
                hasMixedLanguages: false,
                issues: []
            };
            
            // 문서 수준의 lang 속성 분석
            const htmlElement = this.doc.documentElement;
            if (htmlElement.hasAttribute('lang')) {
                const documentLang = htmlElement.getAttribute('lang').toLowerCase();
                results.documentLang = {
                    code: documentLang,
                    name: this._getLanguageName(documentLang),
                    isRTL: this._isRTL(documentLang)
                };
                
                // lang 속성이 비어있으면 이슈 등록
                if (!documentLang) {
                    results.issues.push({
                        type: 'empty-lang-attribute',
                        severity: 'error',
                        message: 'HTML 요소의 lang 속성이 비어 있습니다.',
                        element: htmlElement
                    });
                }
                
                // 올바르지 않은 언어 코드인 경우 이슈 등록
                if (documentLang && !this._isValidLanguageCode(documentLang)) {
                    results.issues.push({
                        type: 'invalid-lang-code',
                        severity: 'error',
                        message: `'${documentLang}'은(는) 유효한 언어 코드가 아닙니다.`,
                        element: htmlElement
                    });
                }
            } else {
                // lang 속성이 없는 경우 이슈 등록
                results.issues.push({
                    type: 'missing-lang-attribute',
                    severity: 'error',
                    message: 'HTML 요소에 lang 속성이 없습니다.',
                    element: htmlElement
                });
            }
            
            // 페이지 내 다른 언어 속성 검색
            const elementsWithLang = this.doc.querySelectorAll('[lang]:not(html)');
            const langMap = new Map(); // 언어별 요소 수 집계
            
            elementsWithLang.forEach(element => {
                const elementLang = element.getAttribute('lang').toLowerCase();
                
                // 언어 정보 추가
                const langInfo = {
                    code: elementLang,
                    name: this._getLanguageName(elementLang),
                    element: element,
                    elementType: element.tagName.toLowerCase(),
                    isRTL: this._isRTL(elementLang)
                };
                
                results.elementLangs.push(langInfo);
                
                // 언어별 요소 수 집계
                if (elementLang) {
                    if (langMap.has(elementLang)) {
                        langMap.set(elementLang, langMap.get(elementLang) + 1);
                    } else {
                        langMap.set(elementLang, 1);
                    }
                }
                
                // lang 속성이 비어있으면 이슈 등록
                if (!elementLang) {
                    results.issues.push({
                        type: 'empty-lang-attribute',
                        severity: 'warning',
                        message: `<${element.tagName.toLowerCase()}> 요소의 lang 속성이 비어 있습니다.`,
                        element: element
                    });
                }
                
                // 올바르지 않은 언어 코드인 경우 이슈 등록
                if (elementLang && !this._isValidLanguageCode(elementLang)) {
                    results.issues.push({
                        type: 'invalid-lang-code',
                        severity: 'warning',
                        message: `'${elementLang}'은(는) 유효한 언어 코드가 아닙니다.`,
                        element: element
                    });
                }
            });
            
            // 언어 분포 계산
            results.languageDistribution = Array.from(langMap.entries()).map(([code, count]) => ({
                code,
                name: this._getLanguageName(code),
                count
            }));
            
            // 다양한 언어 사용 여부 확인
            results.hasMixedLanguages = langMap.size > 1 || 
                (results.documentLang && langMap.size > 0 && 
                 !langMap.has(results.documentLang.code));
            
            return results;
        }
        
        /**
         * 언어 전환 메커니즘 감지
         * @return {Object} 언어 전환 메커니즘 결과
         */
        detectLanguageSwitching() {
            const results = {
                hasLanguageSwitcher: false,
                languageSwitchers: [],
                issues: []
            };
            
            // 일반적인 언어 전환 패턴들
            const languageSwitcherPatterns = [
                // 클래스 기반 패턴
                '.language-switcher', 
                '.lang-switcher', 
                '.language-selector',
                '.lang-selector',
                '[class*="language-switch"]',
                '[class*="lang-switch"]',
                
                // 역할 기반 패턴
                '[aria-label*="language"]',
                '[aria-label*="Language"]',
                '[aria-label*="lang"]',
                '[aria-label*="Lang"]',
                
                // 데이터 속성 기반 패턴
                '[data-language]',
                '[data-lang]',
                '[data-i18n]'
            ];
            
            // 선택기를 합쳐서 한 번에 쿼리
            const combinedSelector = languageSwitcherPatterns.join(',');
            const potentialSwitchers = this.doc.querySelectorAll(combinedSelector);
            
            // 언어 관련 링크 감지
            const languageLinks = this.doc.querySelectorAll('a[hreflang], a[href*="lang="], a[href*="/en/"], a[href*="/ko/"], a[href*="/ja/"], a[href*="/zh/"]');
            
            // 언어 선택 옵션 (드롭다운 등)
            const languageOptions = this.doc.querySelectorAll('select option[value*="lang"], select[name*="lang"] option, select[id*="lang"] option');
            
            // 언어 코드 또는 이름이 포함된 텍스트 요소
            const languageTexts = Array.from(this.doc.querySelectorAll('a, button, span'))
                .filter(el => {
                    const text = (el.textContent || '').trim().toLowerCase();
                    // 언어 이름이나 코드가 포함된 짧은 텍스트
                    return (text.length < 15) && (
                        Object.keys(languageCodes).some(code => text === code) ||
                        Object.values(languageCodes).some(name => text.includes(name.toLowerCase())) ||
                        ['english', 'korean', 'japanese', 'chinese', '한국어', '영어', '일본어', '중국어'].some(name => 
                            text.includes(name.toLowerCase())
                        )
                    );
                });
            
            // 감지된 모든 잠재적 언어 전환 요소 결합
            const allSwitchers = [
                ...Array.from(potentialSwitchers),
                ...Array.from(languageLinks),
                ...Array.from(languageOptions),
                ...languageTexts
            ];
            
            // 중복 제거
            const uniqueSwitchers = Array.from(new Set(allSwitchers));
            
            // 감지된 언어 전환 요소 분석
            if (uniqueSwitchers.length > 0) {
                results.hasLanguageSwitcher = true;
                
                uniqueSwitchers.forEach(element => {
                    results.languageSwitchers.push({
                        element: element,
                        type: element.tagName.toLowerCase(),
                        text: (element.textContent || '').trim(),
                        attributes: this._getRelevantAttributes(element)
                    });
                });
            } else {
                // 언어 전환 요소가 없는 경우 (다국어 사이트일 가능성이 있으면 이슈로 등록)
                const langAttrs = this.detectLangAttributes();
                if (langAttrs.hasMixedLanguages) {
                    results.issues.push({
                        type: 'missing-language-switcher',
                        severity: 'warning',
                        message: '페이지에 다양한 언어가 사용되고 있지만 언어 전환 메커니즘이 감지되지 않았습니다.',
                        element: this.doc.documentElement
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 요소의 관련 속성 추출
         * @param {Element} element - 분석할 요소
         * @return {Object} 관련 속성 맵
         */
        _getRelevantAttributes(element) {
            const relevantAttrs = ['lang', 'hreflang', 'href', 'data-lang', 'data-language', 'aria-label', 'title', 'id', 'class', 'name'];
            const attrs = {};
            
            relevantAttrs.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    attrs[attr] = element.getAttribute(attr);
                }
            });
            
            return attrs;
        }
        
        /**
         * 언어 코드의 유효성 검사
         * @param {string} langCode - 언어 코드
         * @return {boolean} 유효성 여부
         */
        _isValidLanguageCode(langCode) {
            // 기본 ISO 639-1 2자리 코드 (en, ko, fr 등)
            if (/^[a-z]{2}$/i.test(langCode)) {
                return true;
            }
            
            // ISO 639-1 + 국가 코드 (en-US, ko-KR 등)
            if (/^[a-z]{2}-[a-z]{2}$/i.test(langCode)) {
                return true;
            }
            
            // ISO 639-2 3자리 코드 (kor, eng 등)
            if (/^[a-z]{3}$/i.test(langCode)) {
                return true;
            }
            
            // 확장 언어 태그 (zh-Hans, zh-Hant 등)
            if (/^[a-z]{2}-[a-z]{4}$/i.test(langCode)) {
                return true;
            }
            
            return false;
        }
        
        /**
         * 언어 코드를 언어 이름으로 변환
         * @param {string} langCode - 언어 코드
         * @return {string} 언어 이름
         */
        _getLanguageName(langCode) {
            if (!langCode) return '알 수 없음';
            
            // 하이픈이 있는 경우 (en-US 등) 기본 언어 코드만 사용
            const baseCode = langCode.split('-')[0].toLowerCase();
            
            return languageCodes[baseCode] || '알 수 없음';
        }
        
        /**
         * 언어가 RTL(오른쪽에서 왼쪽) 언어인지 확인
         * @param {string} langCode - 언어 코드
         * @return {boolean} RTL 여부
         */
        _isRTL(langCode) {
            if (!langCode) return false;
            
            // 하이픈이 있는 경우 (ar-EG 등) 기본 언어 코드만 사용
            const baseCode = langCode.split('-')[0].toLowerCase();
            
            return rtlLanguages.includes(baseCode);
        }
        
        /**
         * 다국어 콘텐츠 감지
         * @return {Object} 다국어 콘텐츠 분석 결과
         */
        detectMultilingualContent() {
            // 북마클릿 모드에서는 간소화된 분석 수행
            if (this.isBookmarklet) {
                return this._simplifiedMultilingualDetection();
            }
            
            // 전체 분석 로직 (기본)
            const results = {
                detectedLanguages: [],
                primaryLanguage: null,
                issues: []
            };
            
            // lang 속성 분석 결과 가져오기
            const langAttrs = this.detectLangAttributes();
            
            // 문서 기본 언어 설정
            if (langAttrs.documentLang) {
                results.primaryLanguage = langAttrs.documentLang;
            }
            
            // lang 속성 기반 언어 목록 생성
            const detectedLangs = new Set();
            if (langAttrs.documentLang && langAttrs.documentLang.code) {
                detectedLangs.add(langAttrs.documentLang.code);
            }
            
            langAttrs.elementLangs.forEach(lang => {
                if (lang.code) {
                    detectedLangs.add(lang.code);
                }
            });
            
            // 감지된 언어 추가
            detectedLangs.forEach(langCode => {
                results.detectedLanguages.push({
                    code: langCode,
                    name: this._getLanguageName(langCode),
                    isRTL: this._isRTL(langCode)
                });
            });
            
            // 문서에 언어가 지정되지 않은 경우 이슈 추가
            if (!results.primaryLanguage) {
                results.issues.push({
                    type: 'no-primary-language',
                    severity: 'error',
                    message: '문서에 기본 언어가 지정되지 않았습니다.',
                    element: this.doc.documentElement
                });
            }
            
            // 이슈 병합
            results.issues = [...results.issues, ...langAttrs.issues];
            
            return results;
        }
        
        /**
         * 간소화된 다국어 콘텐츠 감지 (북마클릿 모드용)
         * @return {Object} 간소화된 다국어 분석 결과
         */
        _simplifiedMultilingualDetection() {
            const results = {
                detectedLanguages: [],
                primaryLanguage: null,
                issues: []
            };
            
            // 문서 lang 속성 확인
            const htmlElement = this.doc.documentElement;
            const documentLang = htmlElement.getAttribute('lang');
            
            if (documentLang) {
                results.primaryLanguage = {
                    code: documentLang.toLowerCase(),
                    name: this._getLanguageName(documentLang),
                    isRTL: this._isRTL(documentLang)
                };
            } else {
                results.issues.push({
                    type: 'no-primary-language',
                    severity: 'error',
                    message: '문서에 기본 언어가 지정되지 않았습니다.',
                    element: htmlElement
                });
            }
            
            // 최대 10개의 lang 속성을 가진 요소 확인
            const elementsWithLang = Array.from(this.doc.querySelectorAll('[lang]:not(html)')).slice(0, 10);
            const detectedLangs = new Set();
            
            if (documentLang) {
                detectedLangs.add(documentLang.toLowerCase());
            }
            
            elementsWithLang.forEach(element => {
                const lang = element.getAttribute('lang');
                if (lang) {
                    detectedLangs.add(lang.toLowerCase());
                }
            });
            
            // 감지된 언어 추가
            detectedLangs.forEach(langCode => {
                results.detectedLanguages.push({
                    code: langCode,
                    name: this._getLanguageName(langCode),
                    isRTL: this._isRTL(langCode)
                });
            });
            
            return results;
        }
        
        /**
         * 전체 언어 분석 수행
         * @return {Object} 언어 분석 결과
         */
        analyze() {
            const results = {
                langAttributes: this.detectLangAttributes(),
                languageSwitching: this.detectLanguageSwitching(),
                multilingualContent: this.detectMultilingualContent(),
                score: 0,
                issues: []
            };
            
            // 이슈 통합
            results.issues = [
                ...results.langAttributes.issues,
                ...results.languageSwitching.issues,
                ...results.multilingualContent.issues
            ];
            
            // 점수 계산
            const score = this._calculateScore(results);
            results.score = score;
            
            return results;
        }
        
        /**
         * 언어 분석 점수 계산
         * @param {Object} results - 분석 결과
         * @return {number} 점수 (0-100)
         */
        _calculateScore(results) {
            let score = 100;
            
            // 문서 lang 속성 확인 (25점)
            if (!results.langAttributes.documentLang) {
                score -= 25;
            } else if (!this._isValidLanguageCode(results.langAttributes.documentLang.code)) {
                score -= 15;
            }
            
            // 다국어 사이트에서 언어 전환 메커니즘 확인 (25점)
            if (results.langAttributes.hasMixedLanguages && !results.languageSwitching.hasLanguageSwitcher) {
                score -= 25;
            }
            
            // 이슈 심각도에 따른 감점
            const errorCount = results.issues.filter(issue => issue.severity === 'error').length;
            const warningCount = results.issues.filter(issue => issue.severity === 'warning').length;
            
            score -= errorCount * 10;
            score -= warningCount * 5;
            
            // 최소 점수 0, 최대 점수 100으로 제한
            return Math.max(0, Math.min(100, score));
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.i18n.LanguageDetector = LanguageDetector;
    
    // 언어 감지 분석 함수 등록
    window.KoreanWebAnalyzer.analyzer.i18n.analyzeLanguage = function(isBookmarklet = false) {
        const detector = new LanguageDetector(isBookmarklet);
        return detector.analyze();
    };
})();