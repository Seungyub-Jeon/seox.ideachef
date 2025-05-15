/**
 * 모바일 친화성 분석 모듈
 * 
 * 웹페이지의 모바일 친화성을 분석하고 개선 방안을 제시합니다.
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
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * 모바일 친화성 분석기 클래스
     */
    class MobileAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                viewport: { score: 0, issues: [] },
                touchTargets: { score: 0, issues: [] },
                fontSizes: { score: 0, issues: [] },
                mediaQueries: { score: 0, issues: [] },
                responsiveDesign: { score: 0, issues: [] },
                touchOptimization: { score: 0, issues: [] },
                contentPriority: { score: 0, issues: [] },
                offlineSupport: { score: 0, issues: [] }
            };
            this.analyzer = window.KoreanWebAnalyzer.utils.analyzer;
            this.isMobileUserAgent = this.checkMobileUserAgent();
            this.viewportWidth = window.innerWidth;
        }
        
        /**
         * 모바일 친화성 분석 수행
         * @return {Object} 모바일 친화성 분석 결과
         */
        analyze() {
            logger.debug('모바일 친화성 분석 시작');
            
            // 각 영역별 분석 수행
            this.checkViewport();
            this.checkTouchTargets();
            this.checkFontSizes();
            this.checkMediaQueries();
            this.checkResponsiveDesign();
            this.checkTouchOptimization();
            this.checkContentPriority();
            this.checkOfflineSupport();
            
            // 최종 점수 계산
            const score = this.calculateScore();
            
            logger.debug('모바일 친화성 분석 완료', { score });
            
            return {
                score: score,
                details: this.results
            };
        }
        
        /**
         * 뷰포트 설정 확인
         */
        checkViewport() {
            logger.debug('뷰포트 설정 확인 중');
            
            let score = 100;
            const viewportMeta = this.doc.querySelector('meta[name="viewport"]');
            
            if (!viewportMeta) {
                score = 0;
                this.results.viewport.issues.push(
                    this.analyzer.createIssue(
                        'missing-viewport',
                        'critical',
                        '뷰포트 메타 태그가 없습니다.',
                        '모바일 기기에서 페이지를 올바르게 표시하려면 뷰포트 메타 태그가 필요합니다.',
                        null,
                        '<head> 섹션에 다음과 같은 뷰포트 태그를 추가하세요: <meta name="viewport" content="width=device-width, initial-scale=1">'
                    )
                );
            } else {
                const content = viewportMeta.getAttribute('content') || '';
                
                // 필수 속성 확인
                const hasWidth = content.includes('width=');
                const hasInitialScale = content.includes('initial-scale=');
                const isWidthDevice = content.includes('width=device-width');
                
                if (!hasWidth) {
                    score -= 40;
                    this.results.viewport.issues.push(
                        this.analyzer.createIssue(
                            'missing-viewport-width',
                            'critical',
                            '뷰포트 width 속성이 없습니다.',
                            '뷰포트 메타 태그에는 width 속성이 포함되어야 합니다.',
                            viewportMeta,
                            'width=device-width를 뷰포트 content 속성에 추가하세요.'
                        )
                    );
                } else if (!isWidthDevice) {
                    score -= 30;
                    this.results.viewport.issues.push(
                        this.analyzer.createIssue(
                            'non-responsive-viewport-width',
                            'major',
                            '뷰포트가 device-width로 설정되지 않았습니다.',
                            '고정 너비 값은 반응형 디자인에 적합하지 않습니다.',
                            viewportMeta,
                            'width=device-width로 변경하여 반응형 디자인을 구현하세요.'
                        )
                    );
                }
                
                if (!hasInitialScale) {
                    score -= 20;
                    this.results.viewport.issues.push(
                        this.analyzer.createIssue(
                            'missing-viewport-scale',
                            'major',
                            '뷰포트 initial-scale 속성이 없습니다.',
                            '뷰포트 메타 태그에는 initial-scale 속성이 포함되어야 합니다.',
                            viewportMeta,
                            'initial-scale=1.0을 뷰포트 content 속성에 추가하세요.'
                        )
                    );
                }
                
                // user-scalable=no 확인 (접근성 문제)
                if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
                    score -= 25;
                    this.results.viewport.issues.push(
                        this.analyzer.createIssue(
                            'prevents-zooming',
                            'major',
                            '사용자의 확대/축소를 방지하고 있습니다.',
                            'user-scalable=no 또는 maximum-scale=1 설정은 접근성 문제를 일으킬 수 있습니다.',
                            viewportMeta,
                            '시각 장애가 있는 사용자가 콘텐츠를 확대할 수 있도록 이 제한을 제거하세요.'
                        )
                    );
                }
            }
            
            // 최종 점수 설정
            this.results.viewport.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.viewport.stats = {
                hasViewportMeta: !!viewportMeta,
                content: viewportMeta ? viewportMeta.getAttribute('content') : null
            };
        }
        
        /**
         * 터치 타겟 크기 확인
         */
        checkTouchTargets() {
            logger.debug('터치 타겟 크기 확인 중');
            
            // 클릭 가능 요소 선택
            const clickableElements = Array.from(this.doc.querySelectorAll('a, button, input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"], select, [role="button"], [tabindex]:not([tabindex="-1"])'));
            
            // 초기 점수 설정
            let score = 100;
            
            // 문제가 있는 요소 통계
            const smallTargets = [];
            const overlappingTargets = [];
            
            // 각 요소 분석
            clickableElements.forEach((element, index) => {
                // 요소 위치 및 크기
                const rect = element.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                
                // 최소 터치 영역 크기 (44x44px - WCAG 기준)
                if (width < 44 || height < 44) {
                    smallTargets.push({
                        element: element,
                        width: width,
                        height: height
                    });
                    
                    // 샘플링: 첫 10개만 이슈로 기록
                    if (smallTargets.length <= 10) {
                        this.results.touchTargets.issues.push(
                            this.analyzer.createIssue(
                                'small-touch-target',
                                'major',
                                '터치 타겟이 너무 작습니다.',
                                `크기: ${Math.round(width)}x${Math.round(height)}px (권장: 최소 44x44px)`,
                                element,
                                '모바일 사용자가 쉽게 탭할 수 있도록 터치 영역을 44x44px 이상으로 확장하세요.'
                            )
                        );
                    }
                }
                
                // 중첩/인접 터치 영역 체크 (너무 근접한 클릭 요소)
                for (let i = index + 1; i < clickableElements.length; i++) {
                    const otherRect = clickableElements[i].getBoundingClientRect();
                    
                    // 두 요소 간 거리 계산
                    const horizontalGap = Math.max(0,
                        Math.min(rect.right, otherRect.right) - 
                        Math.max(rect.left, otherRect.left)
                    );
                    
                    const verticalGap = Math.max(0,
                        Math.min(rect.bottom, otherRect.bottom) - 
                        Math.max(rect.top, otherRect.top)
                    );
                    
                    // 중첩 또는 매우 근접(8px 이내)한 경우
                    if (horizontalGap > 0 && verticalGap > 0 || 
                        (Math.abs(rect.left - otherRect.right) < 8 || 
                         Math.abs(rect.right - otherRect.left) < 8 || 
                         Math.abs(rect.top - otherRect.bottom) < 8 || 
                         Math.abs(rect.bottom - otherRect.top) < 8)) {
                        
                        // 이미 기록된 쌍인지 확인 (중복 방지)
                        const pairExists = overlappingTargets.some(pair => 
                            (pair.element1 === element && pair.element2 === clickableElements[i]) ||
                            (pair.element1 === clickableElements[i] && pair.element2 === element)
                        );
                        
                        if (!pairExists) {
                            overlappingTargets.push({
                                element1: element,
                                element2: clickableElements[i]
                            });
                            
                            // 샘플링: 첫 5개 쌍만 이슈로 기록
                            if (overlappingTargets.length <= 5) {
                                this.results.touchTargets.issues.push(
                                    this.analyzer.createIssue(
                                        'crowded-touch-targets',
                                        'major',
                                        '터치 타겟이 너무 밀집해 있습니다.',
                                        '근접한 터치 타겟은 모바일 사용자가 정확하게 탭하기 어렵게 만듭니다.',
                                        element,
                                        '터치 타겟 사이에 충분한 여백(최소 8px)을 제공하세요.'
                                    )
                                );
                            }
                        }
                    }
                }
            });
            
            // 너무 작은 터치 영역 비율에 따른 점수 조정
            if (clickableElements.length > 0) {
                const smallTargetRatio = smallTargets.length / clickableElements.length;
                
                if (smallTargetRatio > 0.5) {
                    score -= 50;
                } else if (smallTargetRatio > 0.3) {
                    score -= 30;
                } else if (smallTargetRatio > 0.1) {
                    score -= 15;
                }
            }
            
            // 중첩 터치 영역에 따른 추가 감점
            if (overlappingTargets.length > 10) {
                score -= 30;
            } else if (overlappingTargets.length > 5) {
                score -= 20;
            } else if (overlappingTargets.length > 0) {
                score -= 10;
            }
            
            // 최종 점수 설정
            this.results.touchTargets.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.touchTargets.stats = {
                totalClickableElements: clickableElements.length,
                smallTouchTargets: smallTargets.length,
                overlappingTargets: overlappingTargets.length
            };
        }
        
        /**
         * 폰트 크기 확인
         */
        checkFontSizes() {
            logger.debug('폰트 크기 확인 중');
            
            let score = 100;
            const smallTextElements = [];
            
            // 텍스트 요소 수집 (일부 샘플링)
            const textElements = Array.from(this.doc.querySelectorAll('p, span, div, li, h1, h2, h3, h4, h5, h6, a, button, input, label, td, th, caption'));
            const samplesToCheck = Math.min(textElements.length, 200); // 최대 200개 요소만 확인
            
            for (let i = 0; i < samplesToCheck; i++) {
                const element = textElements[i];
                
                // 텍스트가 있는 요소만 분석
                if (element.textContent.trim().length === 0) continue;
                
                // 계산된 스타일 가져오기
                const style = window.getComputedStyle(element);
                const fontSize = parseFloat(style.fontSize);
                
                // 16px 기준 (모바일에서 권장하는 최소 폰트 크기)
                if (fontSize < 16 && fontSize > 0) {
                    smallTextElements.push({
                        element: element,
                        fontSize: fontSize,
                        text: element.textContent.trim().substring(0, 50) // 샘플 텍스트
                    });
                    
                    // 샘플링: 첫 10개만 이슈로 기록
                    if (smallTextElements.length <= 10) {
                        this.results.fontSizes.issues.push(
                            this.analyzer.createIssue(
                                'small-text',
                                fontSize < 12 ? 'major' : 'minor',
                                '텍스트 크기가 너무 작습니다.',
                                `폰트 크기: ${fontSize.toFixed(1)}px (권장: 최소 16px)`,
                                element,
                                '모바일 가독성을 위해 본문 텍스트는 최소 16px 이상으로 설정하세요.'
                            )
                        );
                    }
                }
            }
            
            // 작은 텍스트 비율에 따른 점수 조정
            if (textElements.length > 0) {
                const smallTextRatio = smallTextElements.length / Math.min(textElements.length, 200);
                
                if (smallTextRatio > 0.5) {
                    score -= 50;
                } else if (smallTextRatio > 0.3) {
                    score -= 30;
                } else if (smallTextRatio > 0.1) {
                    score -= 15;
                }
            }
            
            // 최종 점수 설정
            this.results.fontSizes.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.fontSizes.stats = {
                totalTextElements: textElements.length,
                smallTextElements: smallTextElements.length
            };
        }
        
        /**
         * 미디어 쿼리 사용 확인
         */
        checkMediaQueries() {
            logger.debug('미디어 쿼리 사용 확인 중');
            
            let score = 100;
            let mediaQueryCount = 0;
            const breakpoints = new Set();
            
            // 스타일시트 분석
            try {
                const styleSheets = Array.from(this.doc.styleSheets);
                
                styleSheets.forEach(sheet => {
                    try {
                        const rules = sheet.cssRules || sheet.rules || [];
                        
                        for (let i = 0; i < rules.length; i++) {
                            const rule = rules[i];
                            
                            // 미디어 쿼리 규칙 확인
                            if (rule.type === CSSRule.MEDIA_RULE) {
                                mediaQueryCount++;
                                
                                // 미디어 쿼리 문자열
                                const mediaText = rule.media.mediaText;
                                
                                // 브레이크포인트 추출
                                if (mediaText.includes('max-width') || mediaText.includes('min-width')) {
                                    const widthMatches = mediaText.match(/\((?:max|min)-width:\s*(\d+)(?:px|em|rem)\)/g);
                                    
                                    if (widthMatches) {
                                        widthMatches.forEach(match => {
                                            breakpoints.add(match);
                                        });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // CORS 에러 등은 무시
                    }
                });
            } catch (e) {
                // 스타일시트 접근 에러 무시
            }
            
            // 미디어 쿼리 사용 부족에 따른 점수 조정
            if (mediaQueryCount === 0) {
                score = 0;
                this.results.mediaQueries.issues.push(
                    this.analyzer.createIssue(
                        'no-media-queries',
                        'critical',
                        '미디어 쿼리를 사용하지 않습니다.',
                        '반응형 디자인을 위해서는 미디어 쿼리가 필요합니다.',
                        null,
                        '다양한 화면 크기에 대응하기 위해 CSS 미디어 쿼리를 사용하세요.'
                    )
                );
            } else if (mediaQueryCount < 3) {
                score -= 50;
                this.results.mediaQueries.issues.push(
                    this.analyzer.createIssue(
                        'few-media-queries',
                        'major',
                        '미디어 쿼리 사용이 제한적입니다.',
                        `미디어 쿼리 수: ${mediaQueryCount}개 (권장: 최소 3개)`,
                        null,
                        '데스크톱, 태블릿, 모바일 등 다양한 화면 크기에 대응하는 미디어 쿼리를 추가하세요.'
                    )
                );
            }
            
            // 브레이크포인트 다양성 확인
            if (breakpoints.size < 2 && mediaQueryCount > 0) {
                score -= 30;
                this.results.mediaQueries.issues.push(
                    this.analyzer.createIssue(
                        'limited-breakpoints',
                        'major',
                        '브레이크포인트가 제한적입니다.',
                        `브레이크포인트 수: ${breakpoints.size}개 (권장: 최소 2개)`,
                        null,
                        '다양한 디바이스 크기(모바일, 태블릿, 데스크톱)에 대응하는 브레이크포인트를 설정하세요.'
                    )
                );
            }
            
            // 최종 점수 설정
            this.results.mediaQueries.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.mediaQueries.stats = {
                mediaQueryCount: mediaQueryCount,
                breakpointCount: breakpoints.size,
                breakpoints: Array.from(breakpoints)
            };
        }
        
        /**
         * 반응형 디자인 검사
         */
        checkResponsiveDesign() {
            logger.debug('반응형 디자인 검사 중');
            
            let score = 100;
            const issues = [];
            
            // 1. 고정 너비 요소 확인
            const fixedWidthElements = this.findFixedWidthElements();
            
            if (fixedWidthElements.length > 10) {
                score -= 40;
                issues.push(
                    this.analyzer.createIssue(
                        'many-fixed-width-elements',
                        'critical',
                        '많은 요소가 고정 너비를 사용합니다.',
                        `고정 너비 요소 수: ${fixedWidthElements.length}개`,
                        null,
                        '고정 픽셀 값 대신 %, em, rem 또는 vw와 같은 상대 단위를 사용하세요.'
                    )
                );
            } else if (fixedWidthElements.length > 5) {
                score -= 25;
                issues.push(
                    this.analyzer.createIssue(
                        'some-fixed-width-elements',
                        'major',
                        '일부 요소가 고정 너비를 사용합니다.',
                        `고정 너비 요소 수: ${fixedWidthElements.length}개`,
                        null,
                        '고정 픽셀 값 대신 상대 단위를 사용하여 반응형 레이아웃을 구현하세요.'
                    )
                );
            }
            
            // 2. 수평 스크롤 확인
            if (this.hasHorizontalOverflow()) {
                score -= 40;
                issues.push(
                    this.analyzer.createIssue(
                        'horizontal-scroll',
                        'critical',
                        '페이지에 수평 스크롤이 발생합니다.',
                        '콘텐츠가 뷰포트 너비를 초과하여 모바일 사용성이 저하됩니다.',
                        null,
                        '콘텐츠를 화면 너비에 맞추고, max-width: 100%를 사용하여 오버플로우를 방지하세요.'
                    )
                );
            }
            
            // 3. 고정 위치 레이아웃 확인
            const fixedPositionElements = Array.from(this.doc.querySelectorAll('*')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.position === 'fixed' || style.position === 'absolute';
            });
            
            if (fixedPositionElements.length > 5) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'many-fixed-position-elements',
                        'minor',
                        '고정 위치 요소가 많습니다.',
                        `고정 위치 요소 수: ${fixedPositionElements.length}개`,
                        null,
                        '지나치게 많은 fixed/absolute 요소는 모바일에서 가독성과 상호작용성을 저하시킬 수 있습니다.'
                    )
                );
            }
            
            // 4. 이미지 반응성 확인
            const nonResponsiveImages = this.findNonResponsiveImages();
            
            if (nonResponsiveImages.length > 5) {
                score -= 30;
                issues.push(
                    this.analyzer.createIssue(
                        'non-responsive-images',
                        'major',
                        '반응형 이미지를 사용하지 않습니다.',
                        `반응형이 아닌 이미지 수: ${nonResponsiveImages.length}개`,
                        null,
                        'max-width: 100%, 유동적 너비, srcset 속성 등을 사용하여 이미지를 반응형으로 만드세요.'
                    )
                );
            }
            
            // 5. 테이블 반응성 확인
            const tables = Array.from(this.doc.querySelectorAll('table'));
            let nonResponsiveTables = 0;
            
            tables.forEach(table => {
                const style = window.getComputedStyle(table);
                const parent = table.parentElement;
                const parentStyle = parent ? window.getComputedStyle(parent) : null;
                
                // 테이블이나 부모 요소에 오버플로우 처리가 안 된 경우
                if (style.width !== 'auto' && !style.width.includes('%') &&
                    (!parentStyle || parentStyle.overflowX !== 'auto')) {
                    nonResponsiveTables++;
                }
            });
            
            if (nonResponsiveTables > 0) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'non-responsive-tables',
                        'major',
                        '반응형 테이블을 사용하지 않습니다.',
                        `반응형이 아닌 테이블 수: ${nonResponsiveTables}개`,
                        null,
                        '테이블을 오버플로우 컨테이너로 감싸거나, 모바일에서 테이블을 재구성하세요.'
                    )
                );
            }
            
            // 이슈 추가
            this.results.responsiveDesign.issues = issues;
            
            // 최종 점수 설정
            this.results.responsiveDesign.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.responsiveDesign.stats = {
                fixedWidthElementsCount: fixedWidthElements.length,
                hasHorizontalOverflow: this.hasHorizontalOverflow(),
                fixedPositionElementsCount: fixedPositionElements.length,
                nonResponsiveImagesCount: nonResponsiveImages.length,
                tablesCount: tables.length,
                nonResponsiveTablesCount: nonResponsiveTables
            };
        }
        
        /**
         * 터치 최적화 확인
         */
        checkTouchOptimization() {
            logger.debug('터치 최적화 확인 중');
            
            let score = 100;
            const issues = [];
            
            // 1. 호버 이벤트에 의존하는 기능 확인
            const elementsWithHover = this.findElementsWithHoverEffects();
            
            if (elementsWithHover.length > 10) {
                score -= 30;
                issues.push(
                    this.analyzer.createIssue(
                        'hover-dependent',
                        'major',
                        '호버에 의존하는 요소가 많습니다.',
                        `호버 효과가 있는 요소 수: ${elementsWithHover.length}개`,
                        null,
                        '호버에 의존하는 기능은 터치 기기에서 접근하기 어려울 수 있습니다. 터치 이벤트에도 대응하는 디자인을 고려하세요.'
                    )
                );
            } else if (elementsWithHover.length > 5) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'some-hover-dependent',
                        'minor',
                        '일부 요소가 호버에 의존합니다.',
                        `호버 효과가 있는 요소 수: ${elementsWithHover.length}개`,
                        null,
                        '모바일 사용자를 위해 호버 없이도 콘텐츠나 기능에 접근할 수 있게 하세요.'
                    )
                );
            }
            
            // 2. 드래그 앤 드롭 기능 확인
            const elementsWithDragDrop = Array.from(this.doc.querySelectorAll('[draggable="true"], [ondragstart], [ondrag], [ondragend]'));
            
            if (elementsWithDragDrop.length > 0) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'drag-drop-features',
                        'minor',
                        '드래그 앤 드롭 기능이 있습니다.',
                        `드래그 앤 드롭 요소 수: ${elementsWithDragDrop.length}개`,
                        null,
                        '모바일 기기에서는 드래그 앤 드롭 대신 터치 친화적인 대안을 제공하세요.'
                    )
                );
            }
            
            // 3. 탭 지연 방지 확인
            const hasTouchAction = this.checkTouchActionNone();
            
            if (!hasTouchAction) {
                score -= 10;
                issues.push(
                    this.analyzer.createIssue(
                        'tap-delay',
                        'minor',
                        '탭 지연이 발생할 수 있습니다.',
                        '터치 액션 최적화가 적용되지 않았습니다.',
                        null,
                        'touch-action: manipulation을 적용하여 300ms 탭 지연을 방지하세요.'
                    )
                );
            }
            
            // 4. 터치 피드백 확인
            const hasTouchFeedback = this.checkTouchFeedback();
            
            if (!hasTouchFeedback) {
                score -= 20;
                issues.push(
                    this.analyzer.createIssue(
                        'no-touch-feedback',
                        'major',
                        '터치 피드백이 부족합니다.',
                        '상호작용 요소에 명확한 터치 피드백이 없습니다.',
                        null,
                        '버튼, 링크 등에 :active 상태 스타일을 적용하여 터치 피드백을 제공하세요.'
                    )
                );
            }
            
            // 이슈 추가
            this.results.touchOptimization.issues = issues;
            
            // 최종 점수 설정
            this.results.touchOptimization.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.touchOptimization.stats = {
                elementsWithHoverCount: elementsWithHover.length,
                elementsWithDragDropCount: elementsWithDragDrop.length,
                hasTouchAction: hasTouchAction,
                hasTouchFeedback: hasTouchFeedback
            };
        }
        
        /**
         * 콘텐츠 우선순위 확인
         */
        checkContentPriority() {
            logger.debug('콘텐츠 우선순위 확인 중');
            
            let score = 100;
            const issues = [];
            
            // 1. 중요 콘텐츠 가시성
            const importantContent = this.checkImportantContentVisibility();
            
            if (!importantContent.visible) {
                score -= 30;
                issues.push(
                    this.analyzer.createIssue(
                        'hidden-important-content',
                        'major',
                        '중요 콘텐츠가 즉시 표시되지 않습니다.',
                        '모바일에서 중요 콘텐츠가 화면 밖으로 밀려나거나 가려질 수 있습니다.',
                        null,
                        '모바일 뷰에서는 중요 콘텐츠를 상단에 배치하고, 불필요한 요소를 제거하세요.'
                    )
                );
            }
            
            // 2. 가로 스크롤 콘텐츠 사용
            const horizontalScrollContainers = this.findHorizontalScrollContainers();
            
            if (horizontalScrollContainers.length > 3) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'many-horizontal-scroll-containers',
                        'minor',
                        '가로 스크롤 요소가 많습니다.',
                        `가로 스크롤 컨테이너 수: ${horizontalScrollContainers.length}개`,
                        null,
                        '과도한 가로 스크롤 요소는 사용자 경험을 저하시킬 수 있습니다. 필요한 경우에만 사용하세요.'
                    )
                );
            }
            
            // 3. 콘텐츠 밀도 확인
            const contentDensity = this.checkContentDensity();
            
            if (contentDensity === 'high') {
                score -= 25;
                issues.push(
                    this.analyzer.createIssue(
                        'high-content-density',
                        'major',
                        '콘텐츠 밀도가 높습니다.',
                        '모바일에서 콘텐츠가 너무 밀집되어 사용성이 저하될 수 있습니다.',
                        null,
                        '모바일 화면에서는 여백을 늘리고, 글꼴 크기를 키우고, 요소 간 간격을 확보하세요.'
                    )
                );
            } else if (contentDensity === 'medium') {
                score -= 10;
                issues.push(
                    this.analyzer.createIssue(
                        'medium-content-density',
                        'minor',
                        '콘텐츠 밀도가 다소 높습니다.',
                        '모바일에서 더 넓은 여백과 간격이 필요할 수 있습니다.',
                        null,
                        '모바일 화면에서는 요소 간 여백을 더 확보하세요.'
                    )
                );
            }
            
            // 4. 모바일에서 숨겨지거나 축소되는 콘텐츠 확인
            const hiddenContentCount = this.checkHiddenContentOnMobile();
            
            if (hiddenContentCount === 0 && this.viewportWidth < 768) {
                score -= 15;
                issues.push(
                    this.analyzer.createIssue(
                        'no-content-prioritization',
                        'minor',
                        '모바일에서 콘텐츠 우선순위가 적용되지 않았습니다.',
                        '모바일에서 표시되는 콘텐츠가 데스크톱과 동일하게 유지됩니다.',
                        null,
                        '모바일에서는 덜 중요한 콘텐츠를 숨기거나 아코디언/탭 등으로 재구성하세요.'
                    )
                );
            }
            
            // 이슈 추가
            this.results.contentPriority.issues = issues;
            
            // 최종 점수 설정
            this.results.contentPriority.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.contentPriority.stats = {
                importantContentVisible: importantContent.visible,
                horizontalScrollContainersCount: horizontalScrollContainers.length,
                contentDensity: contentDensity,
                hiddenContentOnMobileCount: hiddenContentCount
            };
        }
        
        /**
         * 오프라인 지원 확인
         */
        checkOfflineSupport() {
            logger.debug('오프라인 지원 확인 중');
            
            let score = 70; // 기본 점수
            const issues = [];
            
            // 1. 서비스 워커 등록 확인
            let hasServiceWorker = false;
            
            if (navigator.serviceWorker) {
                try {
                    navigator.serviceWorker.getRegistrations()
                        .then(registrations => {
                            hasServiceWorker = registrations && registrations.length > 0;
                            
                            if (!hasServiceWorker) {
                                issues.push(
                                    this.analyzer.createIssue(
                                        'no-service-worker',
                                        'minor',
                                        '서비스 워커가 등록되지 않았습니다.',
                                        '서비스 워커를 사용하면 오프라인 경험 및 성능을 개선할 수 있습니다.',
                                        null,
                                        '서비스 워커를 구현하여 네트워크 오프라인 상태에서도 기본 기능을 제공하세요.'
                                    )
                                );
                                
                                // 점수 업데이트
                                score -= 20;
                                this.results.offlineSupport.score = Math.max(0, Math.min(100, score));
                            }
                        })
                        .catch(err => {
                            logger.debug('서비스 워커 확인 중 오류 발생', err);
                        });
                } catch (e) {
                    logger.debug('서비스 워커 확인 중 오류 발생', e);
                }
            } else {
                issues.push(
                    this.analyzer.createIssue(
                        'service-worker-not-supported',
                        'info',
                        '서비스 워커가 지원되지 않습니다.',
                        '현재 브라우저 또는 환경에서 서비스 워커를 지원하지 않습니다.',
                        null,
                        'Service Worker API를 지원하는 최신 브라우저를 사용하세요.'
                    )
                );
            }
            
            // 2. 매니페스트 파일 확인
            const hasManifest = !!this.doc.querySelector('link[rel="manifest"]');
            
            if (!hasManifest) {
                score -= 20;
                issues.push(
                    this.analyzer.createIssue(
                        'no-manifest',
                        'minor',
                        '웹 앱 매니페스트가 없습니다.',
                        '홈 화면에 추가 및 오프라인 경험을 위한 매니페스트 파일이 필요합니다.',
                        null,
                        '<link rel="manifest" href="/manifest.json">을 추가하고 필요한 매니페스트 속성을 구성하세요.'
                    )
                );
            }
            
            // 3. 캐시 API 사용 확인
            let hasCacheAPI = false;
            
            if (typeof caches !== 'undefined') {
                hasCacheAPI = true;
            } else {
                score -= 10;
                issues.push(
                    this.analyzer.createIssue(
                        'no-cache-api',
                        'info',
                        'Cache API가 지원되지 않습니다.',
                        '현재 브라우저 또는 환경에서 Cache API를 지원하지 않습니다.',
                        null,
                        'Cache API를 지원하는 최신 브라우저를 사용하세요.'
                    )
                );
            }
            
            // 4. IndexedDB 사용 확인
            let hasIndexedDB = false;
            
            if (window.indexedDB) {
                hasIndexedDB = true;
            } else {
                score -= 10;
                issues.push(
                    this.analyzer.createIssue(
                        'no-indexeddb',
                        'info',
                        'IndexedDB가 지원되지 않습니다.',
                        '현재 브라우저 또는 환경에서 IndexedDB를 지원하지 않습니다.',
                        null,
                        'IndexedDB를 지원하는 최신 브라우저를 사용하세요.'
                    )
                );
            }
            
            // 5. 앱 쉘 아키텍처 확인 (기본적인 확인)
            const hasAppShell = this.checkAppShellArchitecture();
            
            if (!hasAppShell) {
                score -= 20;
                issues.push(
                    this.analyzer.createIssue(
                        'no-app-shell',
                        'minor',
                        '앱 쉘 아키텍처가 없습니다.',
                        '오프라인 경험을 위한 앱 쉘 구조가 감지되지 않았습니다.',
                        null,
                        '앱 쉘 아키텍처를 구현하여 기본 UI를 빠르게 로드하고 오프라인에서도 표시할 수 있게 하세요.'
                    )
                );
            }
            
            // 이슈 추가
            this.results.offlineSupport.issues = issues;
            
            // 최종 점수 설정
            this.results.offlineSupport.score = Math.max(0, Math.min(100, score));
            
            // 결과에 통계 추가
            this.results.offlineSupport.stats = {
                hasServiceWorker: hasServiceWorker,
                hasManifest: hasManifest,
                hasCacheAPI: hasCacheAPI,
                hasIndexedDB: hasIndexedDB,
                hasAppShell: hasAppShell
            };
        }
        
        /**
         * 최종 점수 계산
         * @return {number} 0-100 사이의 종합 점수
         */
        calculateScore() {
            const weights = {
                viewport: 0.15,
                touchTargets: 0.15,
                fontSizes: 0.15,
                mediaQueries: 0.1,
                responsiveDesign: 0.2,
                touchOptimization: 0.1,
                contentPriority: 0.1,
                offlineSupport: 0.05
            };
            
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 가중치 적용하여 점수 계산
            for (const [key, weight] of Object.entries(weights)) {
                if (typeof this.results[key].score === 'number') {
                    weightedScore += this.results[key].score * weight;
                    totalWeight += weight;
                }
            }
            
            // 총 가중치가 0이면 기본값 반환
            if (totalWeight === 0) {
                return 0;
            }
            
            // 가중치로 나누어 최종 점수 계산
            return Math.round(weightedScore / totalWeight);
        }
        
        /**
         * 사용자 에이전트가 모바일인지 확인
         * @return {boolean} 모바일 여부
         */
        checkMobileUserAgent() {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            
            // 간단한 모바일 감지 정규식
            return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        }
        
        /**
         * 페이지에 수평 오버플로우가 있는지 확인
         * @return {boolean} 수평 오버플로우 여부
         */
        hasHorizontalOverflow() {
            const docWidth = this.doc.documentElement.scrollWidth;
            const windowWidth = window.innerWidth;
            
            return docWidth > windowWidth + 5; // 5px 여유 추가
        }
        
        /**
         * 고정 너비 요소 찾기
         * @return {Array} 고정 너비 요소
         */
        findFixedWidthElements() {
            const elements = Array.from(this.doc.querySelectorAll('*'));
            const fixedWidthElements = [];
            
            // 샘플링 (모든 요소 검사는 성능 문제로 500개까지만)
            const samplesToCheck = Math.min(elements.length, 500);
            
            for (let i = 0; i < samplesToCheck; i++) {
                const style = window.getComputedStyle(elements[i]);
                const width = style.width;
                const maxWidth = style.maxWidth;
                
                // 고정 너비 픽셀 값 (px)이고 컨테이너 크기에 따라 조정되지 않는 경우
                if (width.endsWith('px') && width !== 'auto' && width !== '0px' &&
                    maxWidth === 'none' && !elements[i].matches('img, svg, canvas, video, iframe')) {
                    
                    // 화면 너비의 90% 이상인 경우는 문제 없음 (사실상 전체 너비)
                    const numWidth = parseFloat(width);
                    if (numWidth < window.innerWidth * 0.9) {
                        fixedWidthElements.push(elements[i]);
                    }
                }
            }
            
            return fixedWidthElements;
        }
        
        /**
         * 반응형이 아닌 이미지 찾기
         * @return {Array} 반응형이 아닌 이미지
         */
        findNonResponsiveImages() {
            const images = Array.from(this.doc.querySelectorAll('img'));
            const nonResponsiveImages = [];
            
            images.forEach(img => {
                const style = window.getComputedStyle(img);
                const parent = img.parentElement;
                const parentStyle = parent ? window.getComputedStyle(parent) : null;
                
                // 이미지에 max-width: 100%가 없고, srcset도 없는 경우
                if (style.maxWidth !== '100%' && !img.hasAttribute('srcset')) {
                    // 부모 요소도 반응형이 아닌 경우
                    if (!parentStyle || parentStyle.maxWidth !== '100%') {
                        nonResponsiveImages.push(img);
                    }
                }
            });
            
            return nonResponsiveImages;
        }
        
        /**
         * 호버 효과가 있는 요소 찾기
         * @return {Array} 호버 효과 요소
         */
        findElementsWithHoverEffects() {
            const hoverElements = [];
            
            try {
                const styleSheets = Array.from(this.doc.styleSheets);
                
                // 스타일시트 검사
                styleSheets.forEach(sheet => {
                    try {
                        const rules = sheet.cssRules || sheet.rules || [];
                        
                        for (let i = 0; i < rules.length; i++) {
                            const rule = rules[i];
                            
                            // :hover 선택자가 있는 규칙 찾기
                            if (rule.selectorText && rule.selectorText.includes(':hover')) {
                                const baseSelector = rule.selectorText.replace(/:hover/g, '');
                                const elements = Array.from(this.doc.querySelectorAll(baseSelector));
                                
                                hoverElements.push(...elements);
                            }
                        }
                    } catch (e) {
                        // CORS 에러 등 무시
                    }
                });
            } catch (e) {
                // 스타일시트 접근 오류 무시
            }
            
            // 중복 제거
            return [...new Set(hoverElements)];
        }
        
        /**
         * touch-action: none/manipulation 확인
         * @return {boolean} 탭 지연 방지 설정 여부
         */
        checkTouchActionNone() {
            // viewport meta의 user-scalable=no 확인
            const viewportMeta = this.doc.querySelector('meta[name="viewport"]');
            if (viewportMeta) {
                const content = viewportMeta.getAttribute('content') || '';
                if (content.includes('user-scalable=no')) {
                    return true; // 탭 지연 방지됨 (권장하지는 않음)
                }
            }
            
            // CSS touch-action 속성 확인
            try {
                const bodyStyle = window.getComputedStyle(this.doc.body);
                if (bodyStyle.touchAction === 'manipulation' || bodyStyle.touchAction === 'none') {
                    return true;
                }
                
                // html 태그 확인
                const htmlStyle = window.getComputedStyle(this.doc.documentElement);
                if (htmlStyle.touchAction === 'manipulation' || htmlStyle.touchAction === 'none') {
                    return true;
                }
            } catch (e) {
                // 스타일 접근 오류 무시
            }
            
            return false;
        }
        
        /**
         * 터치 피드백 스타일 확인
         * @return {boolean} 터치 피드백 제공 여부
         */
        checkTouchFeedback() {
            // 버튼, 링크의 활성 상태 스타일 확인
            let hasActivePseudoClass = false;
            
            try {
                const styleSheets = Array.from(this.doc.styleSheets);
                
                // 스타일시트 검사
                styleSheets.forEach(sheet => {
                    try {
                        const rules = sheet.cssRules || sheet.rules || [];
                        
                        for (let i = 0; i < rules.length; i++) {
                            const rule = rules[i];
                            
                            // :active 선택자가 있는 규칙 찾기
                            if (rule.selectorText && rule.selectorText.includes(':active')) {
                                hasActivePseudoClass = true;
                            }
                        }
                    } catch (e) {
                        // CORS 에러 등 무시
                    }
                });
            } catch (e) {
                // 스타일시트 접근 오류 무시
            }
            
            return hasActivePseudoClass;
        }
        
        /**
         * 중요 콘텐츠 가시성 확인
         * @return {Object} 중요 콘텐츠 가시성 정보
         */
        checkImportantContentVisibility() {
            // 중요 콘텐츠 요소 (제목, 주요 콘텐츠)
            const mainHeading = this.doc.querySelector('h1');
            const mainContent = this.doc.querySelector('main, article, [role="main"]');
            
            let visibleHeight = window.innerHeight;
            let result = { visible: true };
            
            if (mainHeading) {
                const rect = mainHeading.getBoundingClientRect();
                if (rect.top < 0 || rect.top > visibleHeight) {
                    result.visible = false;
                    result.element = mainHeading;
                }
            }
            
            if (mainContent) {
                const rect = mainContent.getBoundingClientRect();
                if (rect.top > visibleHeight || rect.top + 100 > visibleHeight) {
                    result.visible = false;
                    result.element = mainContent;
                }
            }
            
            return result;
        }
        
        /**
         * 가로 스크롤 컨테이너 찾기
         * @return {Array} 가로 스크롤 컨테이너
         */
        findHorizontalScrollContainers() {
            const elements = Array.from(this.doc.querySelectorAll('*'));
            const horizontalScrollContainers = [];
            
            // 샘플링 (500개까지)
            const samplesToCheck = Math.min(elements.length, 500);
            
            for (let i = 0; i < samplesToCheck; i++) {
                const style = window.getComputedStyle(elements[i]);
                
                // 가로 스크롤이 있는 요소 (overflow-x: auto/scroll)
                if (
                    (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
                    elements[i].scrollWidth > elements[i].clientWidth
                ) {
                    horizontalScrollContainers.push(elements[i]);
                }
            }
            
            return horizontalScrollContainers;
        }
        
        /**
         * 콘텐츠 밀도 분석
         * @return {string} 콘텐츠 밀도 (high, medium, low)
         */
        checkContentDensity() {
            const body = this.doc.body;
            const bodyStyle = window.getComputedStyle(body);
            
            // 기본 여백 확인
            const padding = parseFloat(bodyStyle.padding) || 0;
            const lineHeight = parseFloat(bodyStyle.lineHeight) || 1.2;
            
            // 자식 요소 간 여백
            const children = Array.from(body.children);
            let totalMargin = 0;
            let marginChecks = 0;
            
            children.forEach(child => {
                const style = window.getComputedStyle(child);
                const marginTop = parseFloat(style.marginTop) || 0;
                const marginBottom = parseFloat(style.marginBottom) || 0;
                
                totalMargin += marginTop + marginBottom;
                marginChecks += 2;
            });
            
            // 평균 여백 계산
            const avgMargin = marginChecks > 0 ? totalMargin / marginChecks : 0;
            
            // 콘텐츠 밀도 결정
            if (padding < 10 && avgMargin < 10 && lineHeight < 1.4) {
                return 'high';
            } else if (padding < 20 && avgMargin < 15 && lineHeight < 1.5) {
                return 'medium';
            } else {
                return 'low';
            }
        }
        
        /**
         * 모바일에서 숨겨진 콘텐츠 확인
         * @return {number} 숨겨진 콘텐츠 수
         */
        checkHiddenContentOnMobile() {
            // 모바일에서 숨겨진 요소 (display: none, visibility: hidden)
            const elements = Array.from(this.doc.querySelectorAll('*'));
            let hiddenContentCount = 0;
            
            // 샘플링 (500개까지)
            const samplesToCheck = Math.min(elements.length, 500);
            
            for (let i = 0; i < samplesToCheck; i++) {
                const style = window.getComputedStyle(elements[i]);
                
                if (style.display === 'none' || style.visibility === 'hidden') {
                    hiddenContentCount++;
                }
            }
            
            return hiddenContentCount;
        }
        
        /**
         * 앱 쉘 아키텍처 확인
         * @return {boolean} 앱 쉘 구조 여부
         */
        checkAppShellArchitecture() {
            // 앱 쉘 구조의 특징 확인
            // 1. PWA 관련 매니페스트와 서비스 워커
            const hasManifest = !!this.doc.querySelector('link[rel="manifest"]');
            
            // 2. 일반적인 앱 쉘 구조 컴포넌트 (헤더, 푸터, 네비게이션)
            const hasHeader = !!this.doc.querySelector('header, [role="banner"]');
            const hasNav = !!this.doc.querySelector('nav, [role="navigation"]');
            const hasFooter = !!this.doc.querySelector('footer, [role="contentinfo"]');
            const hasMainContent = !!this.doc.querySelector('main, [role="main"]');
            
            // 앱 쉘 구조 판단 (최소 요구 사항)
            return hasManifest && (hasHeader && hasNav && hasMainContent);
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.mobile = {
        /**
         * 모바일 친화성 분석 수행
         * @param {Document} [doc] - 분석할 문서
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new MobileAnalyzer(doc);
            return analyzer.analyze();
        }
    };
    
    logger.debug('모바일 친화성 분석 모듈 초기화 완료');
})();