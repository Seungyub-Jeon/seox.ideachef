/**
 * 한국어 웹사이트 분석기
 * 지역화 기능 감지 시스템
 * 
 * 웹페이지의 날짜/시간 형식, 숫자 형식, 통화 기호 및 지역별 콘텐츠를 
 * 분석하고 지역화 수준을 평가합니다.
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
    
    // 날짜 형식 패턴
    const datePatterns = {
        // MM/DD/YYYY (미국식)
        usDatePattern: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(\d{4}|\d{2})\b/g,
        
        // DD/MM/YYYY (유럽식, 영국식)
        euDatePattern: /\b(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/(\d{4}|\d{2})\b/g,
        
        // YYYY/MM/DD (ISO, 한국식, 중국식, 일본식)
        isoDatePattern: /\b(\d{4})[\/-](0?[1-9]|1[0-2])[\/-](0?[1-9]|[12][0-9]|3[01])\b/g,
        
        // YYYY-MM-DD (ISO 8601)
        iso8601DatePattern: /\b(\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])\b/g,
        
        // DD.MM.YYYY (독일식, 러시아식)
        deDotDatePattern: /\b(0?[1-9]|[12][0-9]|3[01])\.(0?[1-9]|1[0-2])\.(\d{4}|\d{2})\b/g,
        
        // 년/월/일 형식 (한국어)
        koreanDatePattern: /\b(\d{4})년\s*(0?[1-9]|1[0-2])월\s*(0?[1-9]|[12][0-9]|3[01])일\b/g,
        
        // 年月日 형식 (일본어, 중국어)
        cjkDatePattern: /\b(\d{4})年\s*(0?[1-9]|1[0-2])月\s*(0?[1-9]|[12][0-9]|3[01])日\b/g
    };
    
    // 시간 형식 패턴
    const timePatterns = {
        // 12시간제 (AM/PM)
        time12hPattern: /\b(0?[1-9]|1[0-2]):([0-5][0-9])(?::([0-5][0-9]))?\s*(am|pm|AM|PM|a\.m\.|p\.m\.)\b/g,
        
        // 24시간제
        time24hPattern: /\b([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?\b/g,
        
        // 한국어/일본어/중국어 시간 표기
        cjkTimePattern: /\b(\d{1,2})시\s*(\d{1,2})분(?:\s*(\d{1,2})초)?\b/g
    };
    
    // 숫자 형식 패턴
    const numberPatterns = {
        // 1,000.00 형식 (영어권, 한국 등)
        commaDecimalPattern: /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g,
        
        // 1.000,00 형식 (유럽, 남미 등)
        dotDecimalPattern: /\b\d{1,3}(?:\.\d{3})*(?:,\d+)?\b/g,
        
        // 1 000,00 형식 (프랑스, 러시아 등)
        spaceDecimalPattern: /\b\d{1,3}(?: \d{3})*(?:,\d+)?\b/g,
        
        // 1'000.00 형식 (스위스 등)
        apostropheDecimalPattern: /\b\d{1,3}(?:'\d{3})*(?:\.\d+)?\b/g
    };
    
    // 통화 기호 및 형식
    const currencyPatterns = {
        // 앞에 오는 기호
        preCurrencyPattern: /[$€£¥₩₽₹¢₺₴฿₫₴₸¤][ ]?\d+(?:[,.]\d+)?/g,
        
        // 뒤에 오는 기호
        postCurrencyPattern: /\d+(?:[,.]\d+)?[ ]?[$€£¥₩₽₹¢₺₴฿₫₴₸¤]/g,
        
        // 통화 코드 (ISO 4217)
        currencyCodePattern: /\b(?:USD|EUR|GBP|JPY|KRW|CNY|HKD|TWD|CHF|CAD|AUD|NZD|INR|RUB|BRL|ZAR)\s*\d+(?:[,.]\d+)?\b/g,
        
        // 문자열 표기 ('달러', '유로' 등)
        currencyNamePattern: /\d+(?:[,.]\d+)?\s*(?:dollars?|euros?|pounds?|won|yen|yuan|rupees?|roubles?|руб(?:ля|лей)?|원|円|元|₫)/gi
    };
    
    // 주요 통화 기호 및 이름
    const currencySymbols = {
        '$': {name: '달러', code: 'USD', countries: ['미국', '캐나다', '호주']},
        '€': {name: '유로', code: 'EUR', countries: ['유럽연합']},
        '£': {name: '파운드', code: 'GBP', countries: ['영국']},
        '¥': {name: '엔/위안', code: 'JPY/CNY', countries: ['일본', '중국']},
        '₩': {name: '원', code: 'KRW', countries: ['한국']},
        '₽': {name: '루블', code: 'RUB', countries: ['러시아']},
        '₹': {name: '루피', code: 'INR', countries: ['인도']},
        '₺': {name: '리라', code: 'TRY', countries: ['터키']},
        '₴': {name: '흐리브냐', code: 'UAH', countries: ['우크라이나']},
        '฿': {name: '바트', code: 'THB', countries: ['태국']},
        '₫': {name: '동', code: 'VND', countries: ['베트남']}
    };
    
    /**
     * 지역화 기능 감지 클래스
     */
    class LocalizationDetector {
        constructor(isBookmarklet = false) {
            this.isBookmarklet = isBookmarklet;
            this.doc = document;
        }
        
        /**
         * 날짜/시간 형식 분석
         * @return {Object} 날짜/시간 형식 분석 결과
         */
        analyzeDateTimeFormats() {
            const results = {
                dateFormats: {},
                timeFormats: {},
                detectedFormats: [],
                primaryDateFormat: null,
                primaryTimeFormat: null,
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedDateTimeAnalysis();
            }
            
            // 텍스트 노드 수집
            const textNodes = this._getAllTextNodes(this.doc.body);
            const allText = textNodes.map(node => node.nodeValue).join(' ');
            
            // 날짜 형식 분석
            Object.entries(datePatterns).forEach(([patternName, pattern]) => {
                const matches = allText.match(pattern) || [];
                if (matches.length > 0) {
                    results.dateFormats[patternName] = {
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    };
                    
                    results.detectedFormats.push({
                        type: 'date',
                        pattern: patternName,
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    });
                }
            });
            
            // 시간 형식 분석
            Object.entries(timePatterns).forEach(([patternName, pattern]) => {
                const matches = allText.match(pattern) || [];
                if (matches.length > 0) {
                    results.timeFormats[patternName] = {
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    };
                    
                    results.detectedFormats.push({
                        type: 'time',
                        pattern: patternName,
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    });
                }
            });
            
            // 주요 날짜 형식 결정 (가장 많이 사용된 형식)
            if (results.detectedFormats.filter(f => f.type === 'date').length > 0) {
                const primaryDate = results.detectedFormats
                    .filter(f => f.type === 'date')
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryDateFormat = primaryDate.pattern;
            }
            
            // 주요 시간 형식 결정 (가장 많이 사용된 형식)
            if (results.detectedFormats.filter(f => f.type === 'time').length > 0) {
                const primaryTime = results.detectedFormats
                    .filter(f => f.type === 'time')
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryTimeFormat = primaryTime.pattern;
            }
            
            // 날짜 형식이 여러 개 있는 경우 (일관성 문제)
            if (Object.keys(results.dateFormats).length > 1) {
                results.issues.push({
                    type: 'inconsistent-date-formats',
                    severity: 'warning',
                    message: '페이지에 여러 날짜 형식이 혼합되어 있습니다.',
                    details: `발견된 날짜 형식: ${Object.keys(results.dateFormats).join(', ')}`
                });
            }
            
            // 시간 형식이 여러 개 있는 경우 (일관성 문제)
            if (Object.keys(results.timeFormats).length > 1) {
                results.issues.push({
                    type: 'inconsistent-time-formats',
                    severity: 'warning',
                    message: '페이지에 여러 시간 형식이 혼합되어 있습니다.',
                    details: `발견된 시간 형식: ${Object.keys(results.timeFormats).join(', ')}`
                });
            }
            
            return results;
        }
        
        /**
         * 간소화된 날짜/시간 분석 (북마클릿 모드용)
         * @return {Object} 간소화된 날짜/시간 분석 결과
         */
        _simplifiedDateTimeAnalysis() {
            const results = {
                dateFormats: {},
                timeFormats: {},
                detectedFormats: [],
                primaryDateFormat: null,
                primaryTimeFormat: null,
                issues: []
            };
            
            // 전체 HTML에서 텍스트 추출 (간소화)
            const html = this.doc.body.innerHTML;
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
            
            // 간소화된 날짜 형식 감지 (자주 사용되는 패턴만)
            const usDateMatches = text.match(datePatterns.usDatePattern) || [];
            const euDateMatches = text.match(datePatterns.euDatePattern) || [];
            const isoDateMatches = text.match(datePatterns.iso8601DatePattern) || [];
            
            // 날짜 패턴 결과 추가
            if (usDateMatches.length > 0) {
                results.dateFormats.usDatePattern = {
                    count: usDateMatches.length,
                    examples: usDateMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'date',
                    pattern: 'usDatePattern',
                    count: usDateMatches.length,
                    examples: usDateMatches.slice(0, 2)
                });
            }
            
            if (euDateMatches.length > 0) {
                results.dateFormats.euDatePattern = {
                    count: euDateMatches.length,
                    examples: euDateMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'date',
                    pattern: 'euDatePattern',
                    count: euDateMatches.length,
                    examples: euDateMatches.slice(0, 2)
                });
            }
            
            if (isoDateMatches.length > 0) {
                results.dateFormats.iso8601DatePattern = {
                    count: isoDateMatches.length,
                    examples: isoDateMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'date',
                    pattern: 'iso8601DatePattern',
                    count: isoDateMatches.length,
                    examples: isoDateMatches.slice(0, 2)
                });
            }
            
            // 간소화된 시간 형식 감지
            const time12hMatches = text.match(timePatterns.time12hPattern) || [];
            const time24hMatches = text.match(timePatterns.time24hPattern) || [];
            
            // 시간 패턴 결과 추가
            if (time12hMatches.length > 0) {
                results.timeFormats.time12hPattern = {
                    count: time12hMatches.length,
                    examples: time12hMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'time',
                    pattern: 'time12hPattern',
                    count: time12hMatches.length,
                    examples: time12hMatches.slice(0, 2)
                });
            }
            
            if (time24hMatches.length > 0) {
                results.timeFormats.time24hPattern = {
                    count: time24hMatches.length,
                    examples: time24hMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'time',
                    pattern: 'time24hPattern',
                    count: time24hMatches.length,
                    examples: time24hMatches.slice(0, 2)
                });
            }
            
            // 주요 형식 결정
            if (results.detectedFormats.filter(f => f.type === 'date').length > 0) {
                const primaryDate = results.detectedFormats
                    .filter(f => f.type === 'date')
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryDateFormat = primaryDate.pattern;
            }
            
            if (results.detectedFormats.filter(f => f.type === 'time').length > 0) {
                const primaryTime = results.detectedFormats
                    .filter(f => f.type === 'time')
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryTimeFormat = primaryTime.pattern;
            }
            
            return results;
        }
        
        /**
         * 숫자 형식 분석
         * @return {Object} 숫자 형식 분석 결과
         */
        analyzeNumberFormats() {
            const results = {
                numberFormats: {},
                detectedFormats: [],
                primaryNumberFormat: null,
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedNumberAnalysis();
            }
            
            // 텍스트 노드 수집
            const textNodes = this._getAllTextNodes(this.doc.body);
            const allText = textNodes.map(node => node.nodeValue).join(' ');
            
            // 숫자 형식 분석
            Object.entries(numberPatterns).forEach(([patternName, pattern]) => {
                const matches = allText.match(pattern) || [];
                if (matches.length > 0) {
                    results.numberFormats[patternName] = {
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    };
                    
                    results.detectedFormats.push({
                        type: 'number',
                        pattern: patternName,
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    });
                }
            });
            
            // 주요 숫자 형식 결정 (가장 많이 사용된 형식)
            if (results.detectedFormats.length > 0) {
                const primaryFormat = results.detectedFormats
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryNumberFormat = primaryFormat.pattern;
            }
            
            // 숫자 형식이 여러 개 있는 경우 (일관성 문제)
            if (Object.keys(results.numberFormats).length > 1) {
                results.issues.push({
                    type: 'inconsistent-number-formats',
                    severity: 'warning',
                    message: '페이지에 여러 숫자 형식이 혼합되어 있습니다.',
                    details: `발견된 숫자 형식: ${Object.keys(results.numberFormats).join(', ')}`
                });
            }
            
            return results;
        }
        
        /**
         * 간소화된 숫자 형식 분석 (북마클릿 모드용)
         * @return {Object} 간소화된 숫자 형식 분석 결과
         */
        _simplifiedNumberAnalysis() {
            const results = {
                numberFormats: {},
                detectedFormats: [],
                primaryNumberFormat: null,
                issues: []
            };
            
            // 전체 HTML에서 텍스트 추출 (간소화)
            const html = this.doc.body.innerHTML;
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
            
            // 간소화된 숫자 형식 감지 (자주 사용되는 패턴만)
            const commaMatches = text.match(numberPatterns.commaDecimalPattern) || [];
            const dotMatches = text.match(numberPatterns.dotDecimalPattern) || [];
            
            // 결과 추가
            if (commaMatches.length > 0) {
                results.numberFormats.commaDecimalPattern = {
                    count: commaMatches.length,
                    examples: commaMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'number',
                    pattern: 'commaDecimalPattern',
                    count: commaMatches.length,
                    examples: commaMatches.slice(0, 2)
                });
            }
            
            if (dotMatches.length > 0) {
                results.numberFormats.dotDecimalPattern = {
                    count: dotMatches.length,
                    examples: dotMatches.slice(0, 2)
                };
                results.detectedFormats.push({
                    type: 'number',
                    pattern: 'dotDecimalPattern',
                    count: dotMatches.length,
                    examples: dotMatches.slice(0, 2)
                });
            }
            
            // 주요 형식 결정
            if (results.detectedFormats.length > 0) {
                const primaryFormat = results.detectedFormats
                    .sort((a, b) => b.count - a.count)[0];
                
                results.primaryNumberFormat = primaryFormat.pattern;
            }
            
            return results;
        }
        
        /**
         * 통화 형식 및 기호 분석
         * @return {Object} 통화 형식 분석 결과
         */
        analyzeCurrencyFormats() {
            const results = {
                currencyFormats: {},
                detectedCurrencies: [],
                primaryCurrency: null,
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedCurrencyAnalysis();
            }
            
            // 텍스트 노드 수집
            const textNodes = this._getAllTextNodes(this.doc.body);
            const allText = textNodes.map(node => node.nodeValue).join(' ');
            
            // 통화 형식 분석
            Object.entries(currencyPatterns).forEach(([patternName, pattern]) => {
                const matches = allText.match(pattern) || [];
                if (matches.length > 0) {
                    results.currencyFormats[patternName] = {
                        count: matches.length,
                        examples: matches.slice(0, 3)
                    };
                }
            });
            
            // 통화 기호 분석
            Object.entries(currencySymbols).forEach(([symbol, info]) => {
                const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                const matches = allText.match(regex) || [];
                
                if (matches.length > 0) {
                    results.detectedCurrencies.push({
                        symbol: symbol,
                        name: info.name,
                        code: info.code,
                        countries: info.countries,
                        count: matches.length
                    });
                }
            });
            
            // 주요 통화 결정 (가장 많이 사용된 통화)
            if (results.detectedCurrencies.length > 0) {
                results.primaryCurrency = results.detectedCurrencies
                    .sort((a, b) => b.count - a.count)[0];
            }
            
            // 통화가 여러 개 있는 경우 (국제화 사이트일 수 있음)
            if (results.detectedCurrencies.length > 1) {
                // 이슈가 아니라 정보
                results.hasMultipleCurrencies = true;
            }
            
            return results;
        }
        
        /**
         * 간소화된 통화 형식 분석 (북마클릿 모드용)
         * @return {Object} 간소화된 통화 형식 분석 결과
         */
        _simplifiedCurrencyAnalysis() {
            const results = {
                currencyFormats: {},
                detectedCurrencies: [],
                primaryCurrency: null,
                issues: []
            };
            
            // 전체 HTML에서 텍스트 추출 (간소화)
            const html = this.doc.body.innerHTML;
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
            
            // 통화 기호 분석 (간소화)
            Object.entries(currencySymbols).forEach(([symbol, info]) => {
                const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                const matches = text.match(regex) || [];
                
                if (matches.length > 0) {
                    results.detectedCurrencies.push({
                        symbol: symbol,
                        name: info.name,
                        code: info.code,
                        countries: info.countries,
                        count: matches.length
                    });
                }
            });
            
            // 주요 통화 결정
            if (results.detectedCurrencies.length > 0) {
                results.primaryCurrency = results.detectedCurrencies
                    .sort((a, b) => b.count - a.count)[0];
            }
            
            if (results.detectedCurrencies.length > 1) {
                results.hasMultipleCurrencies = true;
            }
            
            return results;
        }
        
        /**
         * 지역 특화 콘텐츠 분석
         * @return {Object} 지역 특화 콘텐츠 분석 결과
         */
        analyzeRegionalContent() {
            const results = {
                detectedRegions: [],
                primaryRegion: null,
                hasRegionalAdaptations: false,
                issues: []
            };
            
            // 북마클릿 모드에서는 간소화된 분석
            if (this.isBookmarklet) {
                return this._simplifiedRegionalAnalysis();
            }
            
            // 지역화 관련 요소들
            const hreflangElements = this.doc.querySelectorAll('link[rel="alternate"][hreflang]');
            const metaGeoRegion = this.doc.querySelector('meta[name="geo.region"], meta[property="geo:region"]');
            const metaGeoPosition = this.doc.querySelector('meta[name="geo.position"], meta[property="geo:position"]');
            const htmlLang = this.doc.documentElement.getAttribute('lang');
            
            // hreflang 요소 분석
            if (hreflangElements.length > 0) {
                const hreflangValues = Array.from(hreflangElements).map(el => {
                    const hreflang = el.getAttribute('hreflang');
                    const href = el.getAttribute('href');
                    return { hreflang, href };
                });
                
                results.hreflangLinks = hreflangValues;
                
                // 지역 코드 추출 (예: ko-KR, en-US에서 KR, US 파트)
                const regionCodes = hreflangValues
                    .map(item => item.hreflang.split('-')[1])
                    .filter(Boolean);
                
                regionCodes.forEach(code => {
                    if (code) {
                        results.detectedRegions.push({
                            code: code,
                            source: 'hreflang'
                        });
                    }
                });
                
                results.hasRegionalAdaptations = true;
            }
            
            // 지역 메타 태그 분석
            if (metaGeoRegion) {
                const region = metaGeoRegion.getAttribute('content');
                if (region) {
                    results.detectedRegions.push({
                        code: region,
                        source: 'meta-geo-region'
                    });
                    results.hasRegionalAdaptations = true;
                }
            }
            
            // HTML lang 속성에서 지역 코드 추출
            if (htmlLang && htmlLang.includes('-')) {
                const regionCode = htmlLang.split('-')[1];
                if (regionCode) {
                    results.detectedRegions.push({
                        code: regionCode,
                        source: 'html-lang'
                    });
                }
            }
            
            // 콘텐츠 기반 지역 감지 (통화, 시간 형식 등)
            const currencyAnalysis = this.analyzeCurrencyFormats();
            const dateTimeAnalysis = this.analyzeDateTimeFormats();
            const numberAnalysis = this.analyzeNumberFormats();
            
            // 통화 기반 지역 추론
            if (currencyAnalysis.primaryCurrency) {
                const currency = currencyAnalysis.primaryCurrency;
                const regions = currency.countries;
                
                if (regions && regions.length > 0) {
                    results.currencyBasedRegion = {
                        currency: currency.symbol,
                        name: currency.name,
                        regions: regions
                    };
                    
                    // 명확한 지역이 하나뿐인 경우
                    if (regions.length === 1) {
                        results.detectedRegions.push({
                            name: regions[0],
                            source: 'currency-symbol'
                        });
                    }
                }
            }
            
            // 날짜 형식 기반 지역 추론
            if (dateTimeAnalysis.primaryDateFormat) {
                let regionHint = null;
                
                switch (dateTimeAnalysis.primaryDateFormat) {
                    case 'usDatePattern':
                        regionHint = '북미';
                        break;
                    case 'euDatePattern':
                        regionHint = '유럽';
                        break;
                    case 'isoDatePattern':
                    case 'iso8601DatePattern':
                        regionHint = '국제 표준';
                        break;
                    case 'koreanDatePattern':
                        regionHint = '한국';
                        break;
                    case 'cjkDatePattern':
                        regionHint = '동아시아';
                        break;
                    case 'deDotDatePattern':
                        regionHint = '독일/중앙유럽';
                        break;
                }
                
                if (regionHint) {
                    results.dateFormatBasedRegion = {
                        format: dateTimeAnalysis.primaryDateFormat,
                        regionHint: regionHint
                    };
                    
                    results.detectedRegions.push({
                        name: regionHint,
                        source: 'date-format'
                    });
                }
            }
            
            // 주요 지역 결정
            if (results.detectedRegions.length > 0) {
                // hreflang이나 meta 태그 기반 우선 (더 신뢰할 수 있음)
                const explicitRegions = results.detectedRegions.filter(
                    r => ['hreflang', 'meta-geo-region', 'html-lang'].includes(r.source)
                );
                
                if (explicitRegions.length > 0) {
                    results.primaryRegion = explicitRegions[0];
                } else {
                    results.primaryRegion = results.detectedRegions[0];
                }
            }
            
            return results;
        }
        
        /**
         * 간소화된 지역 특화 콘텐츠 분석 (북마클릿 모드용)
         * @return {Object} 간소화된 지역 특화 콘텐츠 분석 결과
         */
        _simplifiedRegionalAnalysis() {
            const results = {
                detectedRegions: [],
                primaryRegion: null,
                hasRegionalAdaptations: false,
                issues: []
            };
            
            // 기본 지역 감지 요소만 확인
            const hreflangElements = this.doc.querySelectorAll('link[rel="alternate"][hreflang]');
            const htmlLang = this.doc.documentElement.getAttribute('lang');
            
            // hreflang 요소가 있으면 지역 적응이 있다고 판단
            if (hreflangElements.length > 0) {
                results.hasRegionalAdaptations = true;
                
                // 간소화된 방식으로 최대 3개까지만 수집
                const hreflangValues = Array.from(hreflangElements).slice(0, 3).map(el => {
                    const hreflang = el.getAttribute('hreflang');
                    return { hreflang };
                });
                
                results.hreflangLinks = hreflangValues;
                
                // 지역 코드 추출
                hreflangValues.forEach(item => {
                    if (item.hreflang && item.hreflang.includes('-')) {
                        const regionCode = item.hreflang.split('-')[1];
                        if (regionCode) {
                            results.detectedRegions.push({
                                code: regionCode,
                                source: 'hreflang'
                            });
                        }
                    }
                });
            }
            
            // HTML lang 속성에서 지역 코드 추출
            if (htmlLang && htmlLang.includes('-')) {
                const regionCode = htmlLang.split('-')[1];
                if (regionCode) {
                    results.detectedRegions.push({
                        code: regionCode,
                        source: 'html-lang'
                    });
                }
            }
            
            // 주요 지역 결정
            if (results.detectedRegions.length > 0) {
                results.primaryRegion = results.detectedRegions[0];
            }
            
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
         * 전체 지역화 분석 수행
         * @return {Object} 지역화 분석 결과
         */
        analyze() {
            const results = {
                dateTimeFormats: this.analyzeDateTimeFormats(),
                numberFormats: this.analyzeNumberFormats(),
                currencyFormats: this.analyzeCurrencyFormats(),
                regionalContent: this.analyzeRegionalContent(),
                score: 0,
                issues: []
            };
            
            // 모든 이슈 통합
            const allIssues = [
                ...results.dateTimeFormats.issues,
                ...results.numberFormats.issues,
                ...results.regionalContent.issues
            ];
            
            results.allIssues = allIssues;
            
            // 점수 계산
            const score = this._calculateScore(results);
            results.score = score;
            
            return results;
        }
        
        /**
         * 지역화 분석 점수 계산
         * @param {Object} results - 분석 결과
         * @return {number} 점수 (0-100)
         */
        _calculateScore(results) {
            let score = 100;
            const issueCount = results.allIssues.length;
            
            // 발견된 지역화 요소에 따른 점수 부여
            
            // 날짜/시간 형식 (최대 25점)
            if (!results.dateTimeFormats.primaryDateFormat && 
                !results.dateTimeFormats.primaryTimeFormat) {
                score -= 25; // 날짜/시간 형식이 전혀 감지되지 않음
            } else if (!results.dateTimeFormats.primaryDateFormat || 
                     !results.dateTimeFormats.primaryTimeFormat) {
                score -= 15; // 날짜 또는 시간 중 하나만 감지됨
            } else if (results.dateTimeFormats.issues.length > 0) {
                score -= 10; // 날짜/시간 형식 일관성 문제
            }
            
            // 숫자 형식 (최대 25점)
            if (!results.numberFormats.primaryNumberFormat) {
                score -= 25; // 숫자 형식이 감지되지 않음
            } else if (results.numberFormats.issues.length > 0) {
                score -= 10; // 숫자 형식 일관성 문제
            }
            
            // 통화 형식 (최대 25점)
            if (!results.currencyFormats.detectedCurrencies || 
                results.currencyFormats.detectedCurrencies.length === 0) {
                score -= 25; // 통화 형식이 감지되지 않음
            }
            
            // 지역 적응 (최대 25점)
            if (!results.regionalContent.hasRegionalAdaptations) {
                score -= 25; // 지역 적응이 감지되지 않음
            } else if (!results.regionalContent.primaryRegion) {
                score -= 15; // 지역 적응은 있지만 주요 지역을 결정할 수 없음
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
    window.KoreanWebAnalyzer.analyzer.i18n.LocalizationDetector = LocalizationDetector;
    
    // 지역화 분석 함수 등록
    window.KoreanWebAnalyzer.analyzer.i18n.analyzeLocalization = function(isBookmarklet = false) {
        const detector = new LocalizationDetector(isBookmarklet);
        return detector.analyze();
    };
})();