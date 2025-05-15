/**
 * 한국어 웹사이트 분석기
 * 다국어 지원 평가 모듈
 * 
 * 웹사이트의 다국어 지원 인프라 및 RTL 언어 지원을 평가합니다.
 * URL 패턴, 번역 메커니즘, 언어별 메타데이터 등을 검사합니다.
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
    
    // RTL(Right-to-Left) 언어 목록
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'dv', 'ha', 'yi', 'ps'];
    
    /**
     * 다국어 지원 평가 클래스
     */
    class MultilanguageEvaluator {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.doc = document;
            this.url = window.location.href;
            
            // 언어 감지기 참조
            if (window.KoreanWebAnalyzer.analyzer.i18n.LanguageDetector) {
                this.languageDetector = new window.KoreanWebAnalyzer.analyzer.i18n.LanguageDetector(isBookmarklet);
            }
        }
        
        /**
         * 언어별 URL 구조 분석
         * @return {Object} URL 구조 분석 결과
         */
        analyzeUrlStructure() {
            const results = {
                currentUrl: this.url,
                urlPattern: null,
                hasLanguageInUrl: false,
                languageInPath: null,
                languageInSubdomain: null,
                languageInQueryParam: null,
                alternateUrls: [],
                issues: []
            };
            
            const url = new URL(this.url);
            const path = url.pathname;
            const hostname = url.hostname;
            const searchParams = url.searchParams;
            
            // 1. URL 경로에 언어 코드가 있는지 확인 (/en/, /ko/, /fr/ 등)
            const pathLanguageMatch = path.match(/^\/([a-z]{2}(-[a-z]{2})?)\//i);
            if (pathLanguageMatch) {
                results.hasLanguageInUrl = true;
                results.languageInPath = pathLanguageMatch[1].toLowerCase();
                results.urlPattern = 'path-prefix';
            }
            
            // 2. 서브도메인에 언어 코드가 있는지 확인 (en.example.com, ko.example.com 등)
            const subdomainMatch = hostname.match(/^([a-z]{2})\.(.+)$/i);
            if (subdomainMatch) {
                const possibleLang = subdomainMatch[1].toLowerCase();
                // 일반적인 언어 코드인지 확인 (www, dev 등은 제외)
                if (possibleLang !== 'www' && possibleLang !== 'dev' && possibleLang !== 'api') {
                    results.hasLanguageInUrl = true;
                    results.languageInSubdomain = possibleLang;
                    results.urlPattern = 'subdomain';
                }
            }
            
            // 3. 쿼리 파라미터에 언어 지정이 있는지 확인 (?lang=en, ?locale=ko 등)
            const langParams = ['lang', 'locale', 'language', 'l'];
            let foundLangParam = null;
            
            langParams.forEach(param => {
                if (searchParams.has(param)) {
                    const langValue = searchParams.get(param);
                    if (langValue && langValue.length >= 2) {
                        foundLangParam = {
                            param: param,
                            value: langValue.toLowerCase()
                        };
                    }
                }
            });
            
            if (foundLangParam) {
                results.hasLanguageInUrl = true;
                results.languageInQueryParam = foundLangParam;
                results.urlPattern = 'query-parameter';
            }
            
            // 4. hreflang 링크 확인
            const hreflangLinks = this.doc.querySelectorAll('link[rel="alternate"][hreflang]');
            if (hreflangLinks.length > 0) {
                results.alternateUrls = Array.from(hreflangLinks).map(link => {
                    return {
                        hreflang: link.getAttribute('hreflang'),
                        href: link.getAttribute('href')
                    };
                });
            }
            
            // 5. 다국어 URL 패턴 없이 다국어 컨텐츠가 있는 경우 이슈 등록
            if (!results.hasLanguageInUrl && this.languageDetector) {
                const langAnalysis = this.languageDetector.detectMultilingualContent();
                if (langAnalysis.detectedLanguages.length > 1) {
                    results.issues.push({
                        type: 'missing-language-url-pattern',
                        severity: 'warning',
                        message: '여러 언어가 감지되었지만 URL에 언어 식별자가 없습니다.',
                        details: '다국어 웹사이트는 URL에 언어 정보를 포함하는 것이 좋습니다 (예: /en/, ko.example.com).',
                        element: this.doc.documentElement
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 콘텐츠 번역 메커니즘 분석
         * @return {Object} 번역 메커니즘 분석 결과
         */
        analyzeTranslationMechanisms() {
            const results = {
                hasTranslationMechanism: false,
                detectedMechanisms: [],
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedTranslationAnalysis();
            }
            
            // 1. 번역 관련 스크립트 확인
            const scripts = this.doc.querySelectorAll('script');
            
            // 일반적인 번역 라이브러리 및 API 패턴
            const translationLibraryPatterns = [
                /i18n/i,
                /translate/i,
                /localize/i,
                /intl/i,
                /googletranslate/i,
                /language/i
            ];
            
            // 스크립트에서 번역 관련 코드 탐색
            scripts.forEach(script => {
                const src = script.getAttribute('src') || '';
                const content = script.textContent || '';
                
                // 스크립트 URL에서 번역 라이브러리 탐지
                translationLibraryPatterns.forEach(pattern => {
                    if (pattern.test(src)) {
                        results.hasTranslationMechanism = true;
                        results.detectedMechanisms.push({
                            type: 'translation-script',
                            source: src,
                            pattern: pattern.toString()
                        });
                    }
                });
                
                // 스크립트 내용에서 번역 관련 키워드 탐지
                // 주요 i18n 라이브러리 패턴
                const i18nPatterns = [
                    /i18n\s*\.\s*t\(/i,      // i18next 패턴
                    /\$t\s*\(/i,             // Vue-i18n 패턴
                    /gettext\s*\(/i,         // gettext 패턴 
                    /translate\s*\(/i,       // 일반 번역 함수
                    /intl\s*\.\s*formatMessage/i, // react-intl 패턴
                    /L10n/i,                 // L10n 라이브러리
                    /formatjs/i,             // FormatJS 라이브러리
                    /polyglot/i              // Polyglot.js
                ];
                
                // 스크립트 내용에서 번역 패턴 탐지
                i18nPatterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        results.hasTranslationMechanism = true;
                        results.detectedMechanisms.push({
                            type: 'translation-code',
                            pattern: pattern.toString()
                        });
                    }
                });
            });
            
            // 2. HTML 요소에서 번역 관련 속성 확인
            const translationAttributes = [
                'data-i18n',
                'data-translate',
                'data-lang-key',
                'data-localize',
                'translate'
            ];
            
            translationAttributes.forEach(attr => {
                const elements = this.doc.querySelectorAll(`[${attr}]`);
                if (elements.length > 0) {
                    results.hasTranslationMechanism = true;
                    results.detectedMechanisms.push({
                        type: 'translation-attribute',
                        attribute: attr,
                        count: elements.length
                    });
                }
            });
            
            // 3. 번역 위젯 또는 도구 감지
            const translationWidgets = [
                '.google-translate-element',
                '#google_translate_element',
                '[id*="google_translate"]',
                '[class*="google_translate"]',
                '[id*="translation-widget"]',
                '[class*="translation-widget"]'
            ];
            
            const widgetSelector = translationWidgets.join(',');
            const widgets = this.doc.querySelectorAll(widgetSelector);
            
            if (widgets.length > 0) {
                results.hasTranslationMechanism = true;
                results.detectedMechanisms.push({
                    type: 'translation-widget',
                    count: widgets.length
                });
            }
            
            // 4. 언어 전환 UI가 있지만 번역 메커니즘이 감지되지 않은 경우
            if (!results.hasTranslationMechanism && this.languageDetector) {
                const langSwitching = this.languageDetector.detectLanguageSwitching();
                if (langSwitching.hasLanguageSwitcher) {
                    // 번역이 서버 측에서 처리되거나 페이지를 다시 로드하는 방식일 수 있음
                    results.detectedMechanisms.push({
                        type: 'server-side-translation',
                        details: '언어 전환 UI가 존재하지만 클라이언트 측 번역 메커니즘은 감지되지 않았습니다. 서버 측 번역 또는 페이지 리로드 방식일 수 있습니다.'
                    });
                    results.hasTranslationMechanism = true;
                }
            }
            
            return results;
        }
        
        /**
         * 간소화된 번역 메커니즘 분석 (북마클릿 모드용)
         * @return {Object} 간소화된 번역 메커니즘 분석 결과
         */
        _simplifiedTranslationAnalysis() {
            const results = {
                hasTranslationMechanism: false,
                detectedMechanisms: [],
                issues: []
            };
            
            // 몇 가지 주요 패턴만 빠르게 확인
            const translationAttributes = ['data-i18n', 'translate', 'data-translate'];
            translationAttributes.forEach(attr => {
                const elements = this.doc.querySelectorAll(`[${attr}]`);
                if (elements.length > 0) {
                    results.hasTranslationMechanism = true;
                    results.detectedMechanisms.push({
                        type: 'translation-attribute',
                        attribute: attr,
                        count: elements.length
                    });
                }
            });
            
            // Google 번역 위젯 확인
            const googleTranslateElement = this.doc.querySelector('#google_translate_element, .google-translate-element');
            if (googleTranslateElement) {
                results.hasTranslationMechanism = true;
                results.detectedMechanisms.push({
                    type: 'translation-widget',
                    widget: 'Google Translate'
                });
            }
            
            // 몇 가지 주요 스크립트 패턴 확인
            const scripts = this.doc.querySelectorAll('script[src*="i18n"], script[src*="translate"], script[src*="localize"]');
            if (scripts.length > 0) {
                results.hasTranslationMechanism = true;
                results.detectedMechanisms.push({
                    type: 'translation-script',
                    count: scripts.length
                });
            }
            
            return results;
        }
        
        /**
         * RTL 언어 지원 평가
         * @return {Object} RTL 지원 평가 결과
         */
        evaluateRtlSupport() {
            const results = {
                hasRtlSupport: false,
                rtlElements: [],
                rtlStyleProperties: [],
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedRtlEvaluation();
            }
            
            // 1. dir 속성 확인
            const rtlDirElements = this.doc.querySelectorAll('[dir="rtl"]');
            if (rtlDirElements.length > 0) {
                results.hasRtlSupport = true;
                results.rtlElements = Array.from(rtlDirElements).map(el => ({
                    element: el,
                    tagName: el.tagName.toLowerCase()
                }));
            }
            
            // 2. 문서 루트에 RTL 설정이 있는지 확인
            const htmlDir = this.doc.documentElement.getAttribute('dir');
            if (htmlDir === 'rtl') {
                results.hasRtlSupport = true;
                results.isDocumentRtl = true;
            }
            
            // 3. RTL 관련 CSS 클래스 확인
            const rtlClasses = [
                '.rtl',
                '[class*="rtl"]',
                '[class*="right-to-left"]'
            ];
            
            const rtlClassSelector = rtlClasses.join(',');
            const rtlClassElements = this.doc.querySelectorAll(rtlClassSelector);
            
            if (rtlClassElements.length > 0) {
                results.hasRtlSupport = true;
                results.rtlClassElements = rtlClassElements.length;
            }
            
            // 4. RTL 특화 스타일 속성 감지
            const elementsToCheck = [
                this.doc.body,
                ...this.doc.querySelectorAll('div, p, section, article, header, footer, main, nav')
            ];
            
            // 대표 요소만 최대 20개까지 확인 (성능 문제 방지)
            const sampleElements = elementsToCheck.slice(0, 20);
            
            sampleElements.forEach(element => {
                const styles = window.getComputedStyle(element);
                
                // RTL 관련 스타일 속성
                const rtlProperties = [
                    'direction',
                    'text-align',
                    'float',
                    'margin-left',
                    'margin-right',
                    'padding-left',
                    'padding-right'
                ];
                
                rtlProperties.forEach(property => {
                    const value = styles.getPropertyValue(property);
                    
                    // RTL 지원을 시사하는 값
                    if (
                        (property === 'direction' && value === 'rtl') ||
                        (property === 'text-align' && value === 'right')
                    ) {
                        results.hasRtlSupport = true;
                        results.rtlStyleProperties.push({
                            property: property,
                            value: value,
                            element: element
                        });
                    }
                });
            });
            
            // 5. 문서의 lang 속성이 RTL 언어인데 RTL 지원이 없는 경우
            const documentLang = this.doc.documentElement.getAttribute('lang');
            if (documentLang) {
                const langCode = documentLang.split('-')[0].toLowerCase();
                
                if (rtlLanguages.includes(langCode) && !results.hasRtlSupport) {
                    results.issues.push({
                        type: 'missing-rtl-support',
                        severity: 'error',
                        message: `문서 언어(${langCode})는 RTL 언어이지만 RTL 지원이 감지되지 않았습니다.`,
                        details: 'RTL 언어는 dir="rtl" 속성과 관련 스타일링이 필요합니다.',
                        element: this.doc.documentElement
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 간소화된 RTL 지원 평가 (북마클릿 모드용)
         * @return {Object} 간소화된 RTL 지원 평가 결과
         */
        _simplifiedRtlEvaluation() {
            const results = {
                hasRtlSupport: false,
                issues: []
            };
            
            // HTML 기본 확인
            const htmlDir = this.doc.documentElement.getAttribute('dir');
            if (htmlDir === 'rtl') {
                results.hasRtlSupport = true;
                results.isDocumentRtl = true;
            }
            
            // RTL 속성을 가진 요소 카운트
            const rtlElements = this.doc.querySelectorAll('[dir="rtl"]');
            if (rtlElements.length > 0) {
                results.hasRtlSupport = true;
                results.rtlElementCount = rtlElements.length;
            }
            
            // 문서 언어 확인
            const documentLang = this.doc.documentElement.getAttribute('lang');
            if (documentLang) {
                const langCode = documentLang.split('-')[0].toLowerCase();
                results.documentLang = langCode;
                
                if (rtlLanguages.includes(langCode) && !results.hasRtlSupport) {
                    results.issues.push({
                        type: 'missing-rtl-support',
                        severity: 'error',
                        message: `문서 언어(${langCode})는 RTL 언어이지만 RTL 지원이 감지되지 않았습니다.`
                    });
                }
            }
            
            return results;
        }
        
        /**
         * 다국어 메타데이터 분석
         * @return {Object} 메타데이터 분석 결과
         */
        analyzeMultilanguageMetadata() {
            const results = {
                hreflangTags: [],
                languageMeta: {},
                hasMultilanguageMetadata: false,
                issues: []
            };
            
            // 1. hreflang 태그 분석
            const hreflangLinks = this.doc.querySelectorAll('link[rel="alternate"][hreflang]');
            
            if (hreflangLinks.length > 0) {
                results.hasMultilanguageMetadata = true;
                
                hreflangLinks.forEach(link => {
                    const hreflang = link.getAttribute('hreflang');
                    const href = link.getAttribute('href');
                    
                    results.hreflangTags.push({
                        hreflang: hreflang,
                        href: href
                    });
                });
                
                // x-default 확인 (검색 엔진을 위한 기본 언어 버전)
                const hasXDefault = Array.from(hreflangLinks).some(
                    link => link.getAttribute('hreflang') === 'x-default'
                );
                
                if (!hasXDefault && hreflangLinks.length > 1) {
                    results.issues.push({
                        type: 'missing-x-default',
                        severity: 'warning',
                        message: 'hreflang 태그 중 x-default가 없습니다.',
                        details: 'x-default는 사용자 언어와 일치하는 버전이 없을 때 기본 페이지를 지정합니다.',
                        element: this.doc.head
                    });
                }
            }
            
            // 2. 언어 관련 메타 태그 분석
            const metaTags = this.doc.querySelectorAll('meta');
            
            metaTags.forEach(meta => {
                const name = meta.getAttribute('name');
                const property = meta.getAttribute('property');
                const content = meta.getAttribute('content');
                
                // 언어 관련 메타 태그
                if (
                    (name && (
                        name === 'language' ||
                        name === 'content-language' ||
                        name.includes('og:locale')
                    )) ||
                    (property && (
                        property === 'og:locale' ||
                        property.includes('og:locale:alternate')
                    ))
                ) {
                    results.hasMultilanguageMetadata = true;
                    results.languageMeta[name || property] = content;
                }
            });
            
            // 3. HTML의 lang 속성과 메타 태그의 언어 일관성 검사
            const htmlLang = this.doc.documentElement.getAttribute('lang');
            const metaContentLang = results.languageMeta['content-language'];
            const metaOgLocale = results.languageMeta['og:locale'];
            
            if (htmlLang && metaContentLang && !metaContentLang.startsWith(htmlLang)) {
                results.issues.push({
                    type: 'inconsistent-language-metadata',
                    severity: 'warning',
                    message: '문서 lang 속성과 content-language 메타 태그가 일치하지 않습니다.',
                    details: `HTML: ${htmlLang}, Meta: ${metaContentLang}`,
                    element: this.doc.head
                });
            }
            
            if (htmlLang && metaOgLocale && !metaOgLocale.startsWith(htmlLang.replace('-', '_'))) {
                results.issues.push({
                    type: 'inconsistent-language-metadata',
                    severity: 'warning',
                    message: '문서 lang 속성과 og:locale 메타 태그가 일치하지 않습니다.',
                    details: `HTML: ${htmlLang}, OG: ${metaOgLocale}`,
                    element: this.doc.head
                });
            }
            
            return results;
        }
        
        /**
         * 전체 다국어 지원 평가 수행
         * @return {Object} 다국어 지원 평가 결과
         */
        analyze() {
            const results = {
                urlStructure: this.analyzeUrlStructure(),
                translationMechanisms: this.analyzeTranslationMechanisms(),
                rtlSupport: this.evaluateRtlSupport(),
                multilanguageMetadata: this.analyzeMultilanguageMetadata(),
                score: 0,
                issues: []
            };
            
            // 모든 이슈 통합
            const allIssues = [
                ...results.urlStructure.issues,
                ...results.translationMechanisms.issues,
                ...results.rtlSupport.issues,
                ...results.multilanguageMetadata.issues
            ];
            
            results.allIssues = allIssues;
            
            // 다국어 지원 여부 평가
            results.hasMultilanguageSupport = (
                results.urlStructure.hasLanguageInUrl ||
                results.translationMechanisms.hasTranslationMechanism ||
                results.rtlSupport.hasRtlSupport ||
                results.multilanguageMetadata.hasMultilanguageMetadata
            );
            
            // 점수 계산
            const score = this._calculateScore(results);
            results.score = score;
            
            return results;
        }
        
        /**
         * 다국어 지원 점수 계산
         * @param {Object} results - 분석 결과
         * @return {number} 점수 (0-100)
         */
        _calculateScore(results) {
            let score = 100;
            
            // 다국어 지원이 전혀 없는 경우
            if (!results.hasMultilanguageSupport) {
                // 완전히 단일 언어 사이트인 경우, 기본 점수 유지
                // 다국어 콘텐츠가 있지만 지원이 없는 경우, 낮은 점수
                if (this.languageDetector) {
                    const langAnalysis = this.languageDetector.detectMultilingualContent();
                    if (langAnalysis.detectedLanguages.length > 1) {
                        return 20; // 다국어 콘텐츠에 대한 지원이 없음
                    }
                }
                
                return 80; // 단일 언어 사이트 (다국어 지원이 필요없는 경우)
            }
            
            // URL 구조 (최대 25점)
            if (!results.urlStructure.hasLanguageInUrl) {
                score -= 25;
            }
            
            // 번역 메커니즘 (최대 25점)
            if (!results.translationMechanisms.hasTranslationMechanism) {
                score -= 25;
            }
            
            // RTL 지원 - RTL 언어가 있는 경우만 해당 (최대 25점)
            const documentLang = this.doc.documentElement.getAttribute('lang');
            if (documentLang) {
                const langCode = documentLang.split('-')[0].toLowerCase();
                if (rtlLanguages.includes(langCode) && !results.rtlSupport.hasRtlSupport) {
                    score -= 25;
                }
            }
            
            // 다국어 메타데이터 (최대 25점)
            if (!results.multilanguageMetadata.hasMultilanguageMetadata) {
                score -= 25;
            } else if (!results.multilanguageMetadata.hreflangTags.length) {
                score -= 15; // hreflang 없음
            }
            
            // 이슈 심각도에 따른 감점
            const errorCount = results.allIssues.filter(issue => issue.severity === 'error').length;
            const warningCount = results.allIssues.filter(issue => issue.severity === 'warning').length;
            
            score -= errorCount * 10;
            score -= warningCount * 5;
            
            // 최소 점수 0, 최대 점수 100으로 제한
            return Math.max(0, Math.min(100, Math.round(score)));
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.i18n.MultilanguageEvaluator = MultilanguageEvaluator;
    
    // 다국어 지원 평가 함수 등록
    window.KoreanWebAnalyzer.analyzer.i18n.evaluateMultilanguageSupport = function(isBookmarklet = false) {
        const evaluator = new MultilanguageEvaluator(isBookmarklet);
        return evaluator.analyze();
    };
})();