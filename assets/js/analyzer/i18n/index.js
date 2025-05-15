/**
 * 한국어 웹사이트 분석기
 * 국제화 및 지역화 모듈 (메인 통합 모듈)
 * 
 * 모든 국제화/지역화 컴포넌트를 통합하고 종합적인 분석 결과를 제공합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer) {
        window.KoreanWebAnalyzer.analyzer = {};
    }
    
    // i18n 네임스페이스는 개별 모듈에서 생성됨
    
    /**
     * 국제화/지역화 분석기 클래스
     */
    class I18nAnalyzer {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.doc = document;
            
            // 개별 분석기 컴포넌트 초기화
            if (window.KoreanWebAnalyzer.analyzer.i18n) {
                const i18n = window.KoreanWebAnalyzer.analyzer.i18n;
                
                if (i18n.LanguageDetector) {
                    this.languageDetector = new i18n.LanguageDetector(isBookmarklet);
                }
                
                if (i18n.EncodingAnalyzer) {
                    this.encodingAnalyzer = new i18n.EncodingAnalyzer(isBookmarklet);
                }
                
                if (i18n.LocalizationDetector) {
                    this.localizationDetector = new i18n.LocalizationDetector(isBookmarklet);
                }
                
                if (i18n.MultilanguageEvaluator) {
                    this.multilanguageEvaluator = new i18n.MultilanguageEvaluator(isBookmarklet);
                }
            }
        }
        
        /**
         * 전체 국제화/지역화 분석 수행
         * @return {Promise} 분석 결과 프로미스
         */
        analyze() {
            return new Promise((resolve) => {
                const results = {
                    score: 0,
                    language: null,
                    encoding: null,
                    localization: null,
                    multilanguage: null,
                    issues: [],
                    recommendations: []
                };
                
                // 북마클릿 모드에서는 간소화된 분석
                if (this.isBookmarklet) {
                    this._performSimplifiedAnalysis(results)
                        .then(finalResults => resolve(finalResults));
                    return;
                }
                
                // 전체 분석 수행
                Promise.all([
                    this._analyzeLanguage(),
                    this._analyzeEncoding(),
                    this._analyzeLocalization(),
                    this._analyzeMultilanguage()
                ])
                .then(([languageResults, encodingResults, localizationResults, multilanguageResults]) => {
                    // 각 분석 결과 저장
                    results.language = languageResults;
                    results.encoding = encodingResults;
                    results.localization = localizationResults;
                    results.multilanguage = multilanguageResults;
                    
                    // 모든 이슈 통합
                    this._aggregateIssues(results);
                    
                    // 추천 사항 생성
                    this._generateRecommendations(results);
                    
                    // 종합 점수 계산
                    results.score = this._calculateOverallScore(results);
                    
                    resolve(results);
                });
            });
        }
        
        /**
         * 간소화된 분석 수행 (북마클릿 모드용)
         * @param {Object} results - 분석 결과 객체
         * @return {Promise} 분석 결과 프로미스
         */
        _performSimplifiedAnalysis(results) {
            return new Promise((resolve) => {
                const analysisPromises = [];
                
                // 언어 분석
                if (this.languageDetector) {
                    analysisPromises.push(
                        new Promise(r => r(this.languageDetector.analyze()))
                    );
                } else {
                    analysisPromises.push(Promise.resolve(null));
                }
                
                // 인코딩 분석
                if (this.encodingAnalyzer) {
                    analysisPromises.push(
                        new Promise(r => r(this.encodingAnalyzer.analyze()))
                    );
                } else {
                    analysisPromises.push(Promise.resolve(null));
                }
                
                // 지역화 분석
                if (this.localizationDetector) {
                    analysisPromises.push(
                        new Promise(r => r(this.localizationDetector.analyze()))
                    );
                } else {
                    analysisPromises.push(Promise.resolve(null));
                }
                
                // 다국어 지원 분석
                if (this.multilanguageEvaluator) {
                    analysisPromises.push(
                        new Promise(r => r(this.multilanguageEvaluator.analyze()))
                    );
                } else {
                    analysisPromises.push(Promise.resolve(null));
                }
                
                Promise.all(analysisPromises)
                    .then(([languageResults, encodingResults, localizationResults, multilanguageResults]) => {
                        // 각 분석 결과 저장
                        results.language = languageResults;
                        results.encoding = encodingResults;
                        results.localization = localizationResults;
                        results.multilanguage = multilanguageResults;
                        
                        // 간소화된 이슈 통합 및 추천 사항
                        this._aggregateIssues(results);
                        this._generateRecommendations(results);
                        
                        // 종합 점수 계산
                        results.score = this._calculateOverallScore(results);
                        
                        resolve(results);
                    });
            });
        }
        
        /**
         * 언어 분석 수행
         * @return {Promise} 언어 분석 결과 프로미스
         */
        _analyzeLanguage() {
            return new Promise((resolve) => {
                if (this.languageDetector) {
                    resolve(this.languageDetector.analyze());
                } else {
                    resolve(null);
                }
            });
        }
        
        /**
         * 인코딩 분석 수행
         * @return {Promise} 인코딩 분석 결과 프로미스
         */
        _analyzeEncoding() {
            return new Promise((resolve) => {
                if (this.encodingAnalyzer) {
                    resolve(this.encodingAnalyzer.analyze());
                } else {
                    resolve(null);
                }
            });
        }
        
        /**
         * 지역화 분석 수행
         * @return {Promise} 지역화 분석 결과 프로미스
         */
        _analyzeLocalization() {
            return new Promise((resolve) => {
                if (this.localizationDetector) {
                    resolve(this.localizationDetector.analyze());
                } else {
                    resolve(null);
                }
            });
        }
        
        /**
         * 다국어 지원 분석 수행
         * @return {Promise} 다국어 지원 분석 결과 프로미스
         */
        _analyzeMultilanguage() {
            return new Promise((resolve) => {
                if (this.multilanguageEvaluator) {
                    resolve(this.multilanguageEvaluator.analyze());
                } else {
                    resolve(null);
                }
            });
        }
        
        /**
         * 모든 이슈 통합
         * @param {Object} results - 분석 결과 객체
         */
        _aggregateIssues(results) {
            const allIssues = [];
            
            // 언어 이슈
            if (results.language && results.language.issues) {
                results.language.issues.forEach(issue => {
                    allIssues.push({
                        ...issue,
                        category: 'language'
                    });
                });
            }
            
            // 인코딩 이슈
            if (results.encoding && results.encoding.allIssues) {
                results.encoding.allIssues.forEach(issue => {
                    allIssues.push({
                        ...issue,
                        category: 'encoding'
                    });
                });
            }
            
            // 지역화 이슈
            if (results.localization && results.localization.allIssues) {
                results.localization.allIssues.forEach(issue => {
                    allIssues.push({
                        ...issue,
                        category: 'localization'
                    });
                });
            }
            
            // 다국어 지원 이슈
            if (results.multilanguage && results.multilanguage.allIssues) {
                results.multilanguage.allIssues.forEach(issue => {
                    allIssues.push({
                        ...issue,
                        category: 'multilanguage'
                    });
                });
            }
            
            // 심각도별 정렬
            results.issues = allIssues.sort((a, b) => {
                if (a.severity === 'error' && b.severity !== 'error') return -1;
                if (a.severity !== 'error' && b.severity === 'error') return 1;
                return 0;
            });
        }
        
        /**
         * 추천 사항 생성
         * @param {Object} results - 분석 결과 객체
         */
        _generateRecommendations(results) {
            const recommendations = [];
            
            // 언어 관련 추천 사항
            if (results.language) {
                if (!results.language.langAttributes.documentLang) {
                    recommendations.push({
                        category: 'language',
                        priority: 'high',
                        content: 'HTML 문서에 lang 속성을 추가하세요. 예: <html lang="ko">',
                        details: '문서 언어를 명시하는 것은 접근성과 검색 엔진 최적화에 중요합니다.'
                    });
                }
                
                if (results.language.languageSwitching && 
                    !results.language.languageSwitching.hasLanguageSwitcher && 
                    results.language.langAttributes.hasMixedLanguages) {
                    recommendations.push({
                        category: 'language',
                        priority: 'medium',
                        content: '다국어 콘텐츠를 제공하는 경우 언어 전환 메커니즘을 구현하세요.',
                        details: '사용자가 언어를 쉽게 전환할 수 있는 UI 요소를 제공하는 것이 좋습니다.'
                    });
                }
            }
            
            // 인코딩 관련 추천 사항
            if (results.encoding) {
                if (!results.encoding.declarations.metaCharset && 
                    !results.encoding.declarations.httpEquivCharset) {
                    recommendations.push({
                        category: 'encoding',
                        priority: 'high',
                        content: 'UTF-8 문자 인코딩을 명시적으로 선언하세요. 예: <meta charset="utf-8">',
                        details: '문자 인코딩을 명시하는 것은 모든 언어 문자가 올바르게 표시되도록 보장합니다.'
                    });
                }
                
                if (results.encoding.declarations.detectedEncodings.length > 1) {
                    recommendations.push({
                        category: 'encoding',
                        priority: 'high',
                        content: '문서 내 모든 인코딩 선언이 UTF-8로 일관되게 설정되어 있는지 확인하세요.',
                        details: '여러 인코딩 선언이 충돌하면 문자 표시에 문제가 발생할 수 있습니다.'
                    });
                }
            }
            
            // 지역화 관련 추천 사항
            if (results.localization) {
                const dateTimeFormats = results.localization.dateTimeFormats;
                if (dateTimeFormats && Object.keys(dateTimeFormats.dateFormats).length > 1) {
                    recommendations.push({
                        category: 'localization',
                        priority: 'medium',
                        content: '웹사이트 전체에서 일관된 날짜/시간 형식을 사용하세요.',
                        details: '다양한 날짜 형식 사용은 사용자에게 혼란을 줄 수 있습니다.'
                    });
                }
                
                const numberFormats = results.localization.numberFormats;
                if (numberFormats && Object.keys(numberFormats.numberFormats).length > 1) {
                    recommendations.push({
                        category: 'localization',
                        priority: 'medium',
                        content: '웹사이트 전체에서 일관된 숫자 형식을 사용하세요.',
                        details: '다양한 숫자 형식 사용은 사용자에게 혼란을 줄 수 있습니다.'
                    });
                }
            }
            
            // 다국어 지원 관련 추천 사항
            if (results.multilanguage) {
                if (!results.multilanguage.urlStructure.hasLanguageInUrl) {
                    recommendations.push({
                        category: 'multilanguage',
                        priority: 'high',
                        content: '다국어 웹사이트의 경우 URL에 언어 식별자를 포함하세요. (예: /ko/, /en/)',
                        details: 'URL에 언어 정보를 포함하면 사용자와 검색 엔진이 언어 버전을 쉽게 식별할 수 있습니다.'
                    });
                }
                
                if (!results.multilanguage.multilanguageMetadata.hreflangTags.length) {
                    recommendations.push({
                        category: 'multilanguage',
                        priority: 'high',
                        content: '다국어 웹사이트의 각 언어 버전에 hreflang 태그를 추가하세요.',
                        details: 'hreflang 태그는 검색 엔진이 올바른 언어 버전을 사용자에게 제공하는 데 도움이 됩니다.'
                    });
                }
                
                const rtlSupport = results.multilanguage.rtlSupport;
                const documentLang = document.documentElement.getAttribute('lang');
                if (documentLang) {
                    const langCode = documentLang.split('-')[0].toLowerCase();
                    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'dv', 'ha', 'yi', 'ps'];
                    
                    if (rtlLanguages.includes(langCode) && !rtlSupport.hasRtlSupport) {
                        recommendations.push({
                            category: 'multilanguage',
                            priority: 'high',
                            content: 'RTL(오른쪽에서 왼쪽) 언어 지원을 구현하세요.',
                            details: 'RTL 언어를 지원하려면 dir="rtl" 속성과 적절한 CSS 스타일링이 필요합니다.'
                        });
                    }
                }
            }
            
            // 우선순위별 정렬
            results.recommendations = recommendations.sort((a, b) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (a.priority !== 'high' && b.priority === 'high') return 1;
                return 0;
            });
        }
        
        /**
         * 종합 점수 계산
         * @param {Object} results - 분석 결과 객체
         * @return {number} 종합 점수 (0-100)
         */
        _calculateOverallScore(results) {
            // 각 카테고리 가중치
            const weights = {
                language: 0.25,    // 25%
                encoding: 0.25,    // 25%
                localization: 0.25,// 25%
                multilanguage: 0.25 // 25%
            };
            
            let weightedSum = 0;
            let totalWeight = 0;
            
            // 언어 점수
            if (results.language) {
                weightedSum += results.language.score * weights.language;
                totalWeight += weights.language;
            }
            
            // 인코딩 점수
            if (results.encoding) {
                weightedSum += results.encoding.score * weights.encoding;
                totalWeight += weights.encoding;
            }
            
            // 지역화 점수
            if (results.localization) {
                weightedSum += results.localization.score * weights.localization;
                totalWeight += weights.localization;
            }
            
            // 다국어 지원 점수
            if (results.multilanguage) {
                weightedSum += results.multilanguage.score * weights.multilanguage;
                totalWeight += weights.multilanguage;
            }
            
            // 가중치 합이 0인 경우 (모든 분석기가 실패한 경우)
            if (totalWeight === 0) {
                return 0;
            }
            
            // 가중 평균 계산
            return Math.round(weightedSum / totalWeight);
        }
    }
    
    // 네임스페이스에 국제화/지역화 분석기 등록
    window.KoreanWebAnalyzer.analyzer.i18n.I18nAnalyzer = I18nAnalyzer;
    
    // 외부 API 함수: 국제화/지역화 분석 수행
    window.KoreanWebAnalyzer.analyzer.i18n.analyze = function(isBookmarklet = false) {
        const analyzer = new I18nAnalyzer(isBookmarklet);
        return analyzer.analyze();
    };
})();