/**
 * SEO 분석 모듈
 * 웹페이지의 SEO 최적화 상태를 분석합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.seo');

KoreanWebAnalyzer.analyzer.seo.index = (function() {
    'use strict';
    
    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('SEO');
    
    // 구조화 데이터 모듈 참조
    const structuredData = KoreanWebAnalyzer.analyzer.structuredData.index;
    
    /**
     * SEO 분석 실행
     * @param {Document} document - 분석할 문서 객체
     * @returns {Object} 분석 결과
     */
    function analyze(document) {
        logger.debug('SEO 분석 시작');
        
        try {
            // 결과 객체 초기화
            const result = {
                score: 0,
                categories: {
                    meta: { score: 0, issues: [] },
                    content: { score: 0, issues: [] },
                    links: { score: 0, issues: [] },
                    images: { score: 0, issues: [] },
                    structured_data: { score: 0, issues: [] },
                    mobile: { score: 0, issues: [] }
                },
                issues: [],
                recommendations: []
            };
            
            // 메타 태그 분석
            analyzeMetaTags(document, result);
            
            // 콘텐츠 분석
            analyzeContent(document, result);
            
            // 링크 분석
            analyzeLinks(document, result);
            
            // 이미지 분석
            analyzeImages(document, result);
            
            // 구조화 데이터 분석
            analyzeStructuredData(document, result);
            
            // 모바일 최적화 분석
            analyzeMobileOptimization(document, result);
            
            // 모든 이슈 통합
            collectAllIssues(result);
            
            // 권장 사항 생성
            generateRecommendations(result);
            
            // 전체 점수 계산
            calculateOverallScore(result);
            
            logger.debug('SEO 분석 완료', { score: result.score });
            
            return result;
        } catch (error) {
            logger.error('SEO 분석 중 오류 발생', error);
            
            return {
                score: 0,
                error: error.message
            };
        }
    }
    
    /**
     * 메타 태그 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeMetaTags(document, result) {
        logger.debug('메타 태그 분석');
        
        const metaResult = result.categories.meta;
        const issues = metaResult.issues;
        
        // 타이틀 태그 확인
        const title = document.querySelector('title');
        if (!title || !title.textContent.trim()) {
            issues.push({
                severity: 'critical',
                message: '페이지에 title 태그가 없거나 비어 있습니다.',
                solution: '<title> 태그를 추가하고 페이지 내용을 정확하게 설명하는 제목을 설정하세요.'
            });
        } else {
            const titleText = title.textContent.trim();
            
            // 타이틀 길이 확인 (10-60자 권장)
            if (titleText.length < 10) {
                issues.push({
                    severity: 'major',
                    message: 'title 태그가 너무 짧습니다 (현재 ' + titleText.length + '자).',
                    solution: 'title 태그는 최소 10자 이상이어야 효과적입니다. 더 설명적인 제목을 사용하세요.'
                });
            } else if (titleText.length > 60) {
                issues.push({
                    severity: 'minor',
                    message: 'title 태그가 너무 깁니다 (현재 ' + titleText.length + '자).',
                    solution: 'title 태그는 검색 결과에서 잘릴 수 있습니다. 60자 이내로 줄이는 것이 좋습니다.'
                });
            }
        }
        
        // 메타 설명 확인
        const metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription || !metaDescription.getAttribute('content') || !metaDescription.getAttribute('content').trim()) {
            issues.push({
                severity: 'major',
                message: '페이지에 meta description 태그가 없거나 비어 있습니다.',
                solution: '<meta name="description"> 태그를 추가하고 페이지 내용을 요약하는 설명을 설정하세요.'
            });
        } else {
            const descriptionText = metaDescription.getAttribute('content').trim();
            
            // 설명 길이 확인 (50-160자 권장)
            if (descriptionText.length < 50) {
                issues.push({
                    severity: 'minor',
                    message: 'meta description이 너무 짧습니다 (현재 ' + descriptionText.length + '자).',
                    solution: 'meta description은 최소 50자 이상이어야 효과적입니다. 페이지 내용을 더 자세히 설명하세요.'
                });
            } else if (descriptionText.length > 160) {
                issues.push({
                    severity: 'info',
                    message: 'meta description이 너무 깁니다 (현재 ' + descriptionText.length + '자).',
                    solution: 'meta description은 검색 결과에서 잘릴 수 있습니다. 160자 이내로 줄이는 것이 좋습니다.'
                });
            }
        }
        
        // 메타 뷰포트 확인
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
            issues.push({
                severity: 'major',
                message: '페이지에 meta viewport 태그가 없습니다.',
                solution: '<meta name="viewport"> 태그를 추가하여 모바일 기기에서 올바르게 표시되도록 하세요.'
            });
        } else {
            const viewportContent = metaViewport.getAttribute('content');
            if (!viewportContent || !viewportContent.includes('width=')) {
                issues.push({
                    severity: 'minor',
                    message: 'meta viewport 태그가 올바르게 설정되지 않았습니다.',
                    solution: '<meta name="viewport" content="width=device-width, initial-scale=1"> 같은 형식으로 설정하세요.'
                });
            }
        }
        
        // 캐노니컬 URL 확인
        const canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical || !canonical.getAttribute('href')) {
            issues.push({
                severity: 'minor',
                message: '페이지에 canonical URL이 설정되지 않았습니다.',
                solution: '<link rel="canonical"> 태그를 추가하여 중복 콘텐츠 문제를 방지하세요.'
            });
        }
        
        // 메타 로봇 확인
        const metaRobots = document.querySelector('meta[name="robots"]');
        if (metaRobots) {
            const robotsContent = metaRobots.getAttribute('content');
            if (robotsContent && (robotsContent.includes('noindex') || robotsContent.includes('none'))) {
                issues.push({
                    severity: 'critical',
                    message: '페이지가 검색 엔진에 색인되지 않도록 설정되어 있습니다 (noindex).',
                    solution: '의도적이 아니라면, meta robots 태그에서 noindex 지시문을 제거하세요.'
                });
            }
        }
        
        // 언어 설정 확인
        const htmlLang = document.documentElement.getAttribute('lang');
        if (!htmlLang) {
            issues.push({
                severity: 'minor',
                message: 'HTML 문서에 lang 속성이 설정되지 않았습니다.',
                solution: '<html> 태그에 lang 속성을 추가하여 문서의 언어를 명시하세요 (예: <html lang="ko">).'
            });
        }
        
        // 메타 태그 점수 계산
        metaResult.score = calculateCategoryScore(issues);
    }
    
    /**
     * 콘텐츠 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeContent(document, result) {
        logger.debug('콘텐츠 분석');
        
        const contentResult = result.categories.content;
        const issues = contentResult.issues;
        
        // 제목 구조 확인 (h1-h6)
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            issues.push({
                severity: 'major',
                message: '페이지에 h1 태그가 없습니다.',
                solution: '메인 제목으로 h1 태그를 추가하세요. 모든 페이지에는 하나의 h1 태그가 있어야 합니다.'
            });
        } else if (h1s.length > 1) {
            issues.push({
                severity: 'minor',
                message: '페이지에 ' + h1s.length + '개의 h1 태그가 있습니다.',
                solution: 'h1 태그는 페이지당 하나만 사용하는 것이 좋습니다. 나머지는 h2-h6로 변경하세요.'
            });
        }
        
        // 제목 계층 구조 확인
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let prevLevel = 0;
        let skippedLevels = false;
        
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const currentLevel = parseInt(heading.tagName.substring(1));
            
            if (currentLevel > prevLevel + 1 && prevLevel !== 0) {
                skippedLevels = true;
                break;
            }
            
            prevLevel = currentLevel;
        }
        
        if (skippedLevels) {
            issues.push({
                severity: 'minor',
                message: '제목 계층 구조가 올바르지 않습니다.',
                solution: '제목 태그는 순차적으로 사용하세요. 예를 들어, h1 다음에 h3을 바로 사용하지 말고 h2를 사용하세요.'
            });
        }
        
        // 본문 텍스트 분량 확인
        const bodyText = document.body.textContent.trim();
        const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;
        
        if (wordCount < 300) {
            issues.push({
                severity: 'minor',
                message: '페이지 콘텐츠 분량이 적습니다 (약 ' + wordCount + '단어).',
                solution: '검색 엔진은 더 많은 콘텐츠가 있는 페이지를 선호합니다. 콘텐츠를 최소 300단어 이상으로 늘리세요.'
            });
        }
        
        // 키워드 밀도 확인 (구현 예시)
        // 실제로는 핵심 키워드를 파악하고 밀도를 계산하는 복잡한 알고리즘이 필요합니다.
        // 이 예제에서는 간단히 구현합니다.
        
        // 내부 링크 확인
        const internalLinks = document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"], a[href^="#"]');
        if (internalLinks.length < 2) {
            issues.push({
                severity: 'minor',
                message: '페이지에 내부 링크가 충분하지 않습니다.',
                solution: '내부 링크를 추가하면 검색 엔진이 사이트 구조를 더 잘 이해하고 SEO에 도움이 됩니다.'
            });
        }
        
        // 콘텐츠 점수 계산
        contentResult.score = calculateCategoryScore(issues);
    }
    
    /**
     * 링크 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeLinks(document, result) {
        logger.debug('링크 분석');
        
        const linksResult = result.categories.links;
        const issues = linksResult.issues;
        
        // 모든 링크 가져오기
        const links = document.querySelectorAll('a[href]');
        const validLinks = Array.from(links).filter(link => {
            const href = link.getAttribute('href');
            return href && href !== '#' && !href.startsWith('javascript:');
        });
        
        // 링크 텍스트 확인
        let emptyTextLinks = 0;
        let genericTextLinks = 0;
        const genericTexts = ['여기', '클릭', 'click', 'here', '바로가기', '링크', 'link'];
        
        validLinks.forEach(link => {
            const linkText = link.textContent.trim();
            
            if (!linkText) {
                emptyTextLinks++;
            } else if (genericTexts.some(text => linkText.toLowerCase().includes(text.toLowerCase()))) {
                genericTextLinks++;
            }
        });
        
        if (emptyTextLinks > 0) {
            issues.push({
                severity: 'major',
                message: emptyTextLinks + '개의 링크에 텍스트가 없습니다.',
                solution: '모든 링크에는 설명적인 텍스트가 포함되어야 합니다. 이미지 링크는 alt 텍스트를 추가하세요.'
            });
        }
        
        if (genericTextLinks > 0) {
            issues.push({
                severity: 'minor',
                message: genericTextLinks + '개의 링크에 일반적인 텍스트('여기', '클릭' 등)가 사용되었습니다.',
                solution: '일반적인 링크 텍스트 대신 링크의 목적지나 기능을 설명하는 구체적인 텍스트를 사용하세요.'
            });
        }
        
        // 외부 링크 rel 속성 확인
        const externalLinks = Array.from(links).filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('http://') || href.startsWith('https://')) && 
                   !href.includes(window.location.hostname);
        });
        
        let noReferrerLinks = 0;
        
        externalLinks.forEach(link => {
            const rel = link.getAttribute('rel');
            if (!rel || (!rel.includes('nofollow') && !rel.includes('ugc') && !rel.includes('sponsored'))) {
                noReferrerLinks++;
            }
        });
        
        if (noReferrerLinks > 5) {
            issues.push({
                severity: 'info',
                message: noReferrerLinks + '개의 외부 링크에 rel 속성이 없습니다.',
                solution: '신뢰할 수 없는 외부 링크에는 rel="nofollow", rel="ugc", 또는 rel="sponsored" 속성을 추가하세요.'
            });
        }
        
        // 깨진 링크 확인 (클라이언트에서 완전히 확인하기 어려움)
        // 서버 측 검사가 더 정확합니다.
        
        // 링크 점수 계산
        linksResult.score = calculateCategoryScore(issues);
    }
    
    /**
     * 이미지 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeImages(document, result) {
        logger.debug('이미지 분석');
        
        const imagesResult = result.categories.images;
        const issues = imagesResult.issues;
        
        // 모든 이미지 가져오기
        const images = document.querySelectorAll('img');
        
        if (images.length === 0) {
            issues.push({
                severity: 'info',
                message: '페이지에 이미지가 없습니다.',
                solution: '적절한 이미지를 추가하면 사용자 경험이 향상되고 "이미지 검색"에서 노출 기회가 늘어납니다.'
            });
            
            // 이미지가 없으면 기본 점수 부여하고 종료
            imagesResult.score = 80;
            return;
        }
        
        // alt 텍스트 확인
        let missingAltImages = 0;
        let emptyAltImages = 0;
        
        images.forEach(img => {
            if (!img.hasAttribute('alt')) {
                missingAltImages++;
            } else if (img.getAttribute('alt').trim() === '') {
                emptyAltImages++;
            }
        });
        
        if (missingAltImages > 0) {
            issues.push({
                severity: 'major',
                message: missingAltImages + '개의 이미지에 alt 속성이 없습니다.',
                solution: '모든 이미지에 alt 속성을 추가하세요. 장식용 이미지에는 빈 alt=""를 사용할 수 있습니다.'
            });
        }
        
        if (emptyAltImages > 0 && emptyAltImages !== images.length) {
            issues.push({
                severity: 'info',
                message: emptyAltImages + '개의 이미지에 빈 alt 속성이 있습니다.',
                solution: '장식용이 아닌 이미지에는 설명적인 alt 텍스트를 제공하세요.'
            });
        }
        
        // 파일 이름 확인 (의미 있는 파일 이름 권장)
        let badFilenameImages = 0;
        const badFilenamePatterns = [/^[0-9]+\.(jpe?g|png|gif|webp)$/i, /^img_[0-9]+\.(jpe?g|png|gif|webp)$/i, /^image[0-9]*\.(jpe?g|png|gif|webp)$/i];
        
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                const filename = src.split('/').pop();
                if (badFilenamePatterns.some(pattern => pattern.test(filename))) {
                    badFilenameImages++;
                }
            }
        });
        
        if (badFilenameImages > 3) {
            issues.push({
                severity: 'minor',
                message: badFilenameImages + '개의 이미지에 의미 없는 파일 이름이 사용되었습니다.',
                solution: '이미지 파일 이름은 내용을 설명하는 의미 있는 이름을 사용하는 것이 좋습니다.'
            });
        }
        
        // 이미지 크기 속성 확인
        let missingSizeImages = 0;
        
        images.forEach(img => {
            if ((!img.hasAttribute('width') || !img.hasAttribute('height'))) {
                missingSizeImages++;
            }
        });
        
        if (missingSizeImages > 3) {
            issues.push({
                severity: 'minor',
                message: missingSizeImages + '개의 이미지에 width/height 속성이 없습니다.',
                solution: '이미지에 width와 height 속성을 추가하면 레이아웃 이동을 방지하고 페이지 로딩 성능이 향상됩니다.'
            });
        }
        
        // 이미지 점수 계산
        imagesResult.score = calculateCategoryScore(issues);
    }
    
    /**
     * 구조화 데이터 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeStructuredData(document, result) {
        logger.debug('구조화 데이터 분석');
        
        const structuredDataResult = result.categories.structured_data;
        const issues = structuredDataResult.issues;
        
        try {
            // 구조화 데이터 모듈에서 SEO 데이터 가져오기
            const sdData = structuredData.provideSEOData(document);
            
            // 구조화 데이터 존재 확인
            if (!sdData.hasStructuredData) {
                issues.push({
                    severity: 'major',
                    message: '페이지에 구조화 데이터(Schema.org)가 없습니다.',
                    solution: 'JSON-LD, Microdata, 또는 RDFa 형식으로 구조화 데이터를 추가하여 검색 결과에서 리치 스니펫을 표시할 수 있게 하세요.'
                });
            } else {
                // 오류 및 경고 확인
                if (sdData.errorCount > 0) {
                    issues.push({
                        severity: 'major',
                        message: '구조화 데이터에 ' + sdData.errorCount + '개의 오류가 있습니다.',
                        solution: '구조화 데이터의 유효성 검사를 통과하도록 오류를 수정하세요.'
                    });
                }
                
                if (sdData.warningCount > 0) {
                    issues.push({
                        severity: 'minor',
                        message: '구조화 데이터에 ' + sdData.warningCount + '개의 경고가 있습니다.',
                        solution: '구조화 데이터의 권장 사항을 준수하여 경고를 해결하세요.'
                    });
                }
                
                // 스키마 타입 다양성 확인
                const typeCount = sdData.schemaTypeCount || 0;
                if (typeCount < 2) {
                    issues.push({
                        severity: 'minor',
                        message: '구조화 데이터 스키마 타입이 제한적입니다 (' + typeCount + '개).',
                        solution: '페이지 콘텐츠에 적합한 다양한 스키마 타입을 추가하여 검색 결과 표시를 개선하세요.'
                    });
                }
                
                // 권장 사항 추가
                sdData.recommendations.forEach(rec => {
                    if (rec.importance === 'high') {
                        issues.push({
                            severity: 'major',
                            message: rec.message,
                            solution: rec.message
                        });
                    } else if (rec.importance === 'medium') {
                        issues.push({
                            severity: 'minor',
                            message: rec.message,
                            solution: rec.message
                        });
                    }
                });
            }
            
            // 구조화 데이터 점수 설정 (직접 점수 가져오기)
            structuredDataResult.score = sdData.score || 0;
        } catch (error) {
            logger.error('구조화 데이터 분석 중 오류 발생', error);
            
            issues.push({
                severity: 'info',
                message: '구조화 데이터 분석 중 오류가 발생했습니다.',
                solution: '페이지의 구조화 데이터 구문을 확인하세요.'
            });
            
            // 오류 발생 시 기본 점수 부여
            structuredDataResult.score = 50;
        }
    }
    
    /**
     * 모바일 최적화 분석
     * @param {Document} document - 분석할 문서 객체
     * @param {Object} result - 결과 객체
     */
    function analyzeMobileOptimization(document, result) {
        logger.debug('모바일 최적화 분석');
        
        const mobileResult = result.categories.mobile;
        const issues = mobileResult.issues;
        
        // 뷰포트 태그 확인
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            issues.push({
                severity: 'critical',
                message: '페이지에 viewport 메타 태그가 없습니다.',
                solution: '<meta name="viewport" content="width=device-width, initial-scale=1"> 태그를 <head> 섹션에 추가하세요.'
            });
        } else {
            const content = viewport.getAttribute('content');
            if (!content) {
                issues.push({
                    severity: 'major',
                    message: 'viewport 메타 태그에 content 속성이 없습니다.',
                    solution: 'viewport 메타 태그에 content="width=device-width, initial-scale=1"와 같은 값을 설정하세요.'
                });
            } else {
                // 뷰포트 설정 검증
                if (!content.includes('width=device-width')) {
                    issues.push({
                        severity: 'major',
                        message: 'viewport에 device-width가 설정되지 않았습니다.',
                        solution: 'viewport 메타 태그에 width=device-width를 포함하세요.'
                    });
                }
                
                if (!content.includes('initial-scale=')) {
                    issues.push({
                        severity: 'minor',
                        message: 'viewport에 initial-scale이 설정되지 않았습니다.',
                        solution: 'viewport 메타 태그에 initial-scale=1을 포함하세요.'
                    });
                }
            }
        }
        
        // 탭 대상 크기 확인
        const tooSmallTapTargets = [];
        const minTapSize = 44; // CSS 픽셀
        
        // 링크, 버튼 등 탭 대상 요소
        const tapTargets = document.querySelectorAll('a, button, input, select, textarea');
        
        Array.from(tapTargets).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width < minTapSize || rect.height < minTapSize) {
                tooSmallTapTargets.push(el);
            }
        });
        
        if (tooSmallTapTargets.length > 5) {
            issues.push({
                severity: 'minor',
                message: tooSmallTapTargets.length + '개의 탭 대상이 너무 작습니다.',
                solution: '모바일에서 탭 대상(링크, 버튼 등)은 최소 44x44px 이상으로 설정하여 사용자가 쉽게 누를 수 있게 하세요.'
            });
        }
        
        // 텍스트 크기 확인
        const smallTextElements = [];
        const minFontSize = 16; // 픽셀
        
        // 텍스트 요소
        const textElements = document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, span, div');
        
        Array.from(textElements).forEach(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize);
            
            if (fontSize < minFontSize && el.textContent.trim()) {
                smallTextElements.push(el);
            }
        });
        
        if (smallTextElements.length > 10) {
            issues.push({
                severity: 'minor',
                message: '많은 텍스트 요소가 작은 글꼴 크기를 사용합니다.',
                solution: '모바일에서 가독성을 높이기 위해 기본 텍스트 크기를 16px 이상으로 설정하세요.'
            });
        }
        
        // 모바일 최적화 점수 계산
        mobileResult.score = calculateCategoryScore(issues);
    }
    
    /**
     * 모든 이슈 수집
     * @param {Object} result - 결과 객체
     */
    function collectAllIssues(result) {
        const allIssues = [];
        
        // 각 카테고리의 이슈 수집
        for (const [category, data] of Object.entries(result.categories)) {
            if (Array.isArray(data.issues)) {
                // 카테고리 정보 추가
                data.issues.forEach(issue => {
                    issue.category = category;
                });
                
                allIssues.push(...data.issues);
            }
        }
        
        // 심각도에 따라 정렬
        allIssues.sort((a, b) => {
            const severityOrder = { 'critical': 0, 'major': 1, 'minor': 2, 'info': 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        
        result.issues = allIssues;
    }
    
    /**
     * 권장 사항 생성
     * @param {Object} result - 결과 객체
     */
    function generateRecommendations(result) {
        // 상위 10개 이슈에서 권장 사항 생성
        const topIssues = result.issues.slice(0, 10);
        
        result.recommendations = topIssues.map(issue => {
            return {
                category: issue.category,
                severity: issue.severity,
                message: issue.message,
                solution: issue.solution
            };
        });
    }
    
    /**
     * 전체 점수 계산
     * @param {Object} result - 결과 객체
     */
    function calculateOverallScore(result) {
        // 각 카테고리별 가중치 설정
        const weights = {
            meta: 0.25,
            content: 0.25,
            links: 0.15,
            images: 0.1,
            structured_data: 0.15,
            mobile: 0.1
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        // 가중 평균 계산
        for (const [category, data] of Object.entries(result.categories)) {
            if (typeof data.score === 'number') {
                const weight = weights[category] || 0;
                totalScore += data.score * weight;
                totalWeight += weight;
            }
        }
        
        // 최종 점수 (0-100)
        result.score = Math.round(totalWeight > 0 ? totalScore / totalWeight : 0);
        
        // 점수 범위 제한
        result.score = Math.max(0, Math.min(100, result.score));
    }
    
    /**
     * 카테고리 점수 계산
     * @param {Array} issues - 이슈 목록
     * @returns {number} 점수 (0-100)
     */
    function calculateCategoryScore(issues) {
        // 기본 점수
        let score = 100;
        
        // 심각도별 감점
        issues.forEach(issue => {
            switch (issue.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'major':
                    score -= 15;
                    break;
                case 'minor':
                    score -= 5;
                    break;
                case 'info':
                    score -= 2;
                    break;
            }
        });
        
        // 점수 범위 제한
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 분석 결과를 HTML 보고서로 생성합니다.
     * @param {Object} result - SEO 분석 결과
     * @returns {HTMLElement} 생성된 보고서 HTML 요소
     */
    function generateReport(result) {
        logger.debug('SEO 보고서 생성');
        
        // 보고서 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'seo-report';
        
        // 점수 섹션
        const scoreSection = document.createElement('div');
        scoreSection.className = 'score-section';
        scoreSection.innerHTML = `
            <h2>SEO 점수</h2>
            <div class="score-container">
                <div class="score-circle ${getScoreClass(result.score)}">
                    <span class="score-value">${result.score}</span>
                </div>
            </div>
            <div class="category-scores">
                ${Object.entries(result.categories).map(([category, data]) => `
                    <div class="category-score">
                        <span class="category-name">${getCategoryName(category)}</span>
                        <span class="category-value ${getScoreClass(data.score)}">${data.score}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(scoreSection);
        
        // 이슈 섹션
        const issuesSection = document.createElement('div');
        issuesSection.className = 'issues-section';
        issuesSection.innerHTML = `
            <h2>주요 이슈</h2>
            ${result.issues.length > 0 ? `
                <ul class="issues-list">
                    ${result.issues.map(issue => `
                        <li class="issue-item ${issue.severity}">
                            <div class="issue-header">
                                <span class="issue-severity">${getSeverityName(issue.severity)}</span>
                                <span class="issue-category">${getCategoryName(issue.category)}</span>
                            </div>
                            <p class="issue-message">${issue.message}</p>
                            <p class="issue-solution"><strong>해결 방법:</strong> ${issue.solution}</p>
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="no-issues">SEO 이슈가 발견되지 않았습니다.</p>'}
        `;
        container.appendChild(issuesSection);
        
        // 권장 사항 섹션
        const recommendationsSection = document.createElement('div');
        recommendationsSection.className = 'recommendations-section';
        recommendationsSection.innerHTML = `
            <h2>권장 사항</h2>
            ${result.recommendations.length > 0 ? `
                <ul class="recommendations-list">
                    ${result.recommendations.map(rec => `
                        <li class="recommendation-item ${rec.severity}">
                            <p class="recommendation-message">${rec.message}</p>
                            <p class="recommendation-solution"><strong>해결 방법:</strong> ${rec.solution}</p>
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="no-recommendations">권장 사항이 없습니다.</p>'}
        `;
        container.appendChild(recommendationsSection);
        
        return container;
    }
    
    /**
     * 점수에 따른 클래스 반환
     * @param {number} score - 점수
     * @returns {string} 점수 클래스
     */
    function getScoreClass(score) {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'average';
        if (score >= 30) return 'poor';
        return 'critical';
    }
    
    /**
     * 카테고리 이름 반환
     * @param {string} category - 카테고리 키
     * @returns {string} 카테고리 이름
     */
    function getCategoryName(category) {
        const categoryNames = {
            meta: '메타 태그',
            content: '콘텐츠',
            links: '링크',
            images: '이미지',
            structured_data: '구조화 데이터',
            mobile: '모바일 최적화'
        };
        
        return categoryNames[category] || category;
    }
    
    /**
     * 심각도 이름 반환
     * @param {string} severity - 심각도 키
     * @returns {string} 심각도 이름
     */
    function getSeverityName(severity) {
        const severityNames = {
            critical: '심각',
            major: '중요',
            minor: '경미',
            info: '정보'
        };
        
        return severityNames[severity] || severity;
    }
    
    // 공개 API
    return {
        analyze: analyze,
        generateReport: generateReport
    };
})();