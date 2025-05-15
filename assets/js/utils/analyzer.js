/**
 * 데이터 분석 유틸리티
 * 
 * HTML 요소 분석 및 점수 계산을 위한 공통 유틸리티를 제공합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        console.error('KoreanWebAnalyzer 네임스페이스가 존재하지 않습니다.');
        return;
    }
    
    // utils 네임스페이스 확인
    if (!window.KoreanWebAnalyzer.utils) {
        window.KoreanWebAnalyzer.utils = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    // 분석 유틸리티 정의
    window.KoreanWebAnalyzer.utils.analyzer = {
        /**
         * 점수 계산
         * @param {number} value - 현재 값
         * @param {number} min - 최소값
         * @param {number} max - 최대값
         * @param {boolean} [invert=false] - 점수 반전 여부 (작을수록 좋음)
         * @return {number} 0-100 사이의 점수
         */
        calculateScore: function(value, min, max, invert = false) {
            // 범위 제한
            value = Math.max(min, Math.min(max, value));
            
            // 점수 계산 (0-100 범위로 정규화)
            let score = ((value - min) / (max - min)) * 100;
            
            // 반전 (작을수록 좋은 경우)
            if (invert) {
                score = 100 - score;
            }
            
            // 반올림하여 정수 반환
            return Math.round(score);
        },
        
        /**
         * 심각도 결정
         * @param {number} score - 0-100 사이의 점수
         * @return {string} 심각도 레벨 (critical, major, minor, info)
         */
        determineSeverity: function(score) {
            if (score < 30) {
                return 'critical';
            } else if (score < 50) {
                return 'major';
            } else if (score < 80) {
                return 'minor';
            } else {
                return 'info';
            }
        },
        
        /**
         * 이슈 객체 생성
         * @param {string} type - 이슈 유형
         * @param {string} severity - 심각도
         * @param {string} message - 이슈 메시지
         * @param {string} details - 상세 설명
         * @param {Element} [element] - 관련 DOM 요소
         * @param {string} [solution] - 해결 방법
         * @return {Object} 이슈 객체
         */
        createIssue: function(type, severity, message, details, element, solution) {
            return {
                type: type,
                severity: severity,
                message: message,
                details: details,
                element: element,
                solution: solution
            };
        },
        
        /**
         * 여러 점수의 평균 계산
         * @param {Object} scores - 점수 객체 맵
         * @return {number} 평균 점수
         */
        calculateAverageScore: function(scores) {
            const values = Object.values(scores);
            
            if (values.length === 0) {
                return 0;
            }
            
            const sum = values.reduce((acc, val) => {
                return acc + (typeof val === 'object' ? val.score : val);
            }, 0);
            
            return Math.round(sum / values.length);
        },
        
        /**
         * 메타 태그 분석
         * @param {Document} [doc] - 분석할 문서 (기본: 현재 문서)
         * @return {Object} 메타 태그 분석 결과
         */
        analyzeMetaTags: function(doc) {
            doc = doc || document;
            
            const result = {
                score: 0,
                issues: [],
                tags: {}
            };
            
            // 제목 분석
            const title = doc.title;
            result.tags.title = title;
            
            if (!title || title.trim() === '') {
                result.issues.push(this.createIssue(
                    'missing-title',
                    'critical',
                    '문서 제목이 없습니다.',
                    '모든 HTML 문서는 의미 있는 제목을 가져야 합니다.',
                    doc.querySelector('title'),
                    '문서에 <title> 태그를 추가하고 의미 있는 제목을 입력하세요.'
                ));
            } else if (title.length < 10) {
                result.issues.push(this.createIssue(
                    'title-too-short',
                    'major',
                    '문서 제목이 너무 짧습니다.',
                    `현재 제목 길이: ${title.length}자 (최소 10자 권장)`,
                    doc.querySelector('title'),
                    '더 구체적이고 설명적인 제목을 사용하세요.'
                ));
            } else if (title.length > 60) {
                result.issues.push(this.createIssue(
                    'title-too-long',
                    'minor',
                    '문서 제목이 너무 깁니다.',
                    `현재 제목 길이: ${title.length}자 (최대 60자 권장)`,
                    doc.querySelector('title'),
                    '검색 결과에서 제목이 잘릴 수 있으므로 60자 이내로 줄이는 것이 좋습니다.'
                ));
            }
            
            // 메타 설명 분석
            const metaDescription = doc.querySelector('meta[name="description"]');
            if (!metaDescription) {
                result.issues.push(this.createIssue(
                    'missing-description',
                    'major',
                    '메타 설명이 없습니다.',
                    '검색 엔진 최적화를 위해 메타 설명을 추가해야 합니다.',
                    doc.querySelector('head'),
                    '<head> 섹션에 메타 설명을 추가하세요. 예: <meta name="description" content="페이지 설명">'
                ));
            } else {
                const description = metaDescription.getAttribute('content');
                result.tags.description = description;
                
                if (!description || description.trim() === '') {
                    result.issues.push(this.createIssue(
                        'empty-description',
                        'major',
                        '메타 설명이 비어 있습니다.',
                        '메타 설명이 존재하지만 내용이 없습니다.',
                        metaDescription,
                        '메타 설명에 페이지 내용을 요약하는 의미 있는 설명을 추가하세요.'
                    ));
                } else if (description.length < 50) {
                    result.issues.push(this.createIssue(
                        'description-too-short',
                        'minor',
                        '메타 설명이 너무 짧습니다.',
                        `현재 설명 길이: ${description.length}자 (최소 50자 권장)`,
                        metaDescription,
                        '더 구체적이고 정보를 제공하는 메타 설명을 작성하세요.'
                    ));
                } else if (description.length > 160) {
                    result.issues.push(this.createIssue(
                        'description-too-long',
                        'minor',
                        '메타 설명이 너무 깁니다.',
                        `현재 설명 길이: ${description.length}자 (최대 160자 권장)`,
                        metaDescription,
                        '검색 결과에서 설명이 잘릴 수 있으므로 160자 이내로 줄이는 것이 좋습니다.'
                    ));
                }
            }
            
            // 뷰포트 메타 태그 확인
            const viewportMeta = doc.querySelector('meta[name="viewport"]');
            result.tags.viewport = viewportMeta ? viewportMeta.getAttribute('content') : null;
            
            if (!viewportMeta) {
                result.issues.push(this.createIssue(
                    'missing-viewport',
                    'major',
                    '뷰포트 메타 태그가 없습니다.',
                    '모바일 장치에서 적절한 렌더링을 위해 뷰포트 메타 태그가 필요합니다.',
                    doc.querySelector('head'),
                    '<head> 섹션에 뷰포트 메타 태그를 추가하세요. 예: <meta name="viewport" content="width=device-width, initial-scale=1">'
                ));
            }
            
            // 문자 인코딩 메타 태그 확인
            const charsetMeta = doc.querySelector('meta[charset]');
            result.tags.charset = charsetMeta ? charsetMeta.getAttribute('charset') : null;
            
            if (!charsetMeta) {
                result.issues.push(this.createIssue(
                    'missing-charset',
                    'minor',
                    '문자 인코딩 메타 태그가 없습니다.',
                    '문자 인코딩 선언은 특수 문자의 올바른 표시를 보장합니다.',
                    doc.querySelector('head'),
                    '<head> 섹션 맨 앞에 문자 인코딩 메타 태그를 추가하세요. 예: <meta charset="UTF-8">'
                ));
            }
            
            // 점수 계산
            let score = 100;
            
            // 주요 메타 태그 부재에 따른 감점
            if (!title || title.trim() === '') score -= 30;
            if (!metaDescription) score -= 20;
            if (!viewportMeta) score -= 15;
            if (!charsetMeta) score -= 10;
            
            // 부적절한 길이에 따른 감점
            if (title && (title.length < 10 || title.length > 60)) score -= 10;
            if (metaDescription && metaDescription.getAttribute('content') && 
                (metaDescription.getAttribute('content').length < 50 || 
                 metaDescription.getAttribute('content').length > 160)) score -= 10;
            
            // 최종 점수 설정 (0-100 범위로 제한)
            result.score = Math.max(0, Math.min(100, score));
            
            return result;
        },
        
        /**
         * 이미지 접근성 분석
         * @param {Document} [doc] - 분석할 문서 (기본: 현재 문서)
         * @return {Object} 이미지 접근성 분석 결과
         */
        analyzeImagesAccessibility: function(doc) {
            doc = doc || document;
            
            const result = {
                score: 0,
                issues: [],
                stats: {
                    total: 0,
                    withAlt: 0,
                    withoutAlt: 0,
                    emptyAlt: 0,
                    decorative: 0
                }
            };
            
            // 이미지 요소 수집
            const images = doc.querySelectorAll('img');
            result.stats.total = images.length;
            
            // 이미지가 없는 경우 만점 반환
            if (images.length === 0) {
                result.score = 100;
                return result;
            }
            
            // 각 이미지 분석
            images.forEach(img => {
                const hasAlt = img.hasAttribute('alt');
                const alt = img.getAttribute('alt');
                const isDecorative = hasAlt && alt === '';
                const src = img.getAttribute('src') || '';
                const role = img.getAttribute('role');
                
                // 통계 업데이트
                if (hasAlt) {
                    result.stats.withAlt++;
                    if (alt === '') {
                        result.stats.emptyAlt++;
                        if (role === 'presentation' || role === 'none') {
                            result.stats.decorative++;
                        }
                    }
                } else {
                    result.stats.withoutAlt++;
                }
                
                // 대체 텍스트 없음
                if (!hasAlt) {
                    result.issues.push(this.createIssue(
                        'missing-alt',
                        'critical',
                        '이미지에 대체 텍스트가 없습니다.',
                        `이미지 URL: ${src}`,
                        img,
                        '모든 의미 있는 이미지에 alt 속성을 추가하세요. 예: <img src="..." alt="이미지 설명">'
                    ));
                }
                // 의미 없는 장식용 이미지이지만 role 속성이 없음
                else if (isDecorative && role !== 'presentation' && role !== 'none') {
                    result.issues.push(this.createIssue(
                        'decorative-without-role',
                        'minor',
                        '장식용 이미지에 role 속성이 없습니다.',
                        `이미지에 빈 alt 속성이 있지만, 장식용 역할이 명시되지 않았습니다. 이미지 URL: ${src}`,
                        img,
                        '장식용 이미지에는 role="presentation" 또는 role="none" 속성을 추가하세요.'
                    ));
                }
                // 비어 있지 않은 대체 텍스트가 너무 짧거나 파일명과 유사함
                else if (alt && alt !== '' && (alt.length < 5 || alt.includes('.jpg') || alt.includes('.png'))) {
                    result.issues.push(this.createIssue(
                        'poor-alt-text',
                        'major',
                        '이미지의 대체 텍스트가 부적절합니다.',
                        `대체 텍스트가 너무 짧거나 파일명에 불과합니다: "${alt}"`,
                        img,
                        '의미 있고 설명적인 대체 텍스트를 제공하세요. 파일명이나 짧은 단어는 이미지의 목적을 설명하지 못합니다.'
                    ));
                }
            });
            
            // 점수 계산
            if (result.stats.total > 0) {
                // 대체 텍스트가 있는 이미지 비율 계산 (장식용 이미지는 적절히 처리된 것으로 간주)
                const correctlyHandledImages = result.stats.withAlt;
                const score = (correctlyHandledImages / result.stats.total) * 100;
                result.score = Math.round(score);
            } else {
                result.score = 100; // 이미지가 없으면 만점
            }
            
            return result;
        },
        
        /**
         * 헤딩 구조 분석
         * @param {Document} [doc] - 분석할 문서 (기본: 현재 문서)
         * @return {Object} 헤딩 구조 분석 결과
         */
        analyzeHeadings: function(doc) {
            doc = doc || document;
            
            const result = {
                score: 0,
                issues: [],
                stats: {
                    h1: 0,
                    h2: 0,
                    h3: 0,
                    h4: 0,
                    h5: 0,
                    h6: 0,
                    total: 0
                },
                headings: []
            };
            
            // 모든 헤딩 요소 수집
            const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
            
            // 헤딩이 없는 경우 낮은 점수 반환
            if (headings.length === 0) {
                result.score = 30;
                result.issues.push(this.createIssue(
                    'no-headings',
                    'critical',
                    '문서에 헤딩 요소가 없습니다.',
                    '헤딩 구조는 문서의 구조를 정의하고 접근성을 개선합니다.',
                    doc.body,
                    '문서의 섹션과 하위 섹션을 정의하기 위해 의미 있는 헤딩 구조(h1-h6)를 사용하세요.'
                ));
                return result;
            }
            
            // 헤딩 분석을 위한 구조 생성
            let lastLevel = 0;
            let hasH1 = false;
            let h1Count = 0;
            let skippedLevels = false;
            
            // 각 헤딩 요소 처리
            headings.forEach(heading => {
                const level = parseInt(heading.tagName.charAt(1));
                const text = heading.textContent.trim();
                
                // 통계 업데이트
                result.stats[`h${level}`]++;
                result.stats.total++;
                
                // h1 태그 확인
                if (level === 1) {
                    hasH1 = true;
                    h1Count++;
                }
                
                // 헤딩 레벨 건너뜀 확인 (예: h1 다음 h3)
                if (lastLevel > 0 && level > lastLevel + 1) {
                    skippedLevels = true;
                    result.issues.push(this.createIssue(
                        'skipped-heading-level',
                        'major',
                        `헤딩 레벨이 건너뛰었습니다: h${lastLevel} 다음 h${level}`,
                        `"${text}" 헤딩의 레벨이 이전 헤딩보다 2 이상 높습니다.`,
                        heading,
                        `헤딩 레벨을 순차적으로 사용하세요. h${lastLevel} 다음에는 h${lastLevel + 1}을 사용해야 합니다.`
                    ));
                }
                
                lastLevel = level;
                
                // 헤딩 정보 저장
                result.headings.push({
                    level: level,
                    text: text,
                    element: heading
                });
                
                // 빈 헤딩 확인
                if (text === '') {
                    result.issues.push(this.createIssue(
                        'empty-heading',
                        'major',
                        `빈 헤딩: h${level}`,
                        '헤딩 요소에 내용이 없습니다.',
                        heading,
                        '모든 헤딩 요소에는 의미 있는 내용이 있어야 합니다.'
                    ));
                }
            });
            
            // h1 부재 확인
            if (!hasH1) {
                result.issues.push(this.createIssue(
                    'missing-h1',
                    'critical',
                    '문서에 h1 요소가 없습니다.',
                    '모든 페이지의 메인 헤딩은 h1 요소여야 합니다.',
                    doc.body,
                    '페이지의 주요 제목을 나타내는 h1 요소를 추가하세요.'
                ));
            }
            
            // 중복 h1 확인
            if (h1Count > 1) {
                result.issues.push(this.createIssue(
                    'multiple-h1',
                    'major',
                    `h1 요소가 여러 개 있습니다: ${h1Count}개`,
                    '대부분의 페이지는 단일 h1 요소만 포함해야 합니다.',
                    null,
                    '페이지당 하나의 주요 h1 헤딩만 사용하고, 하위 섹션에는 h2-h6을 사용하세요.'
                ));
            }
            
            // 첫 번째 헤딩이 h1이 아닌 경우
            if (result.headings.length > 0 && result.headings[0].level !== 1) {
                result.issues.push(this.createIssue(
                    'first-heading-not-h1',
                    'major',
                    `첫 번째 헤딩이 h1이 아닙니다: h${result.headings[0].level}`,
                    '페이지의 첫 번째 헤딩은 일반적으로 h1이어야 합니다.',
                    result.headings[0].element,
                    '페이지의 첫 번째이자 주요 헤딩으로 h1을 사용하세요.'
                ));
            }
            
            // 점수 계산
            let score = 100;
            
            // 감점 요소
            if (!hasH1) score -= 30;
            if (h1Count > 1) score -= 15;
            if (skippedLevels) score -= 15;
            if (result.headings.length > 0 && result.headings[0].level !== 1) score -= 15;
            
            // 빈 헤딩에 대한 감점
            const emptyHeadings = result.issues.filter(issue => issue.type === 'empty-heading').length;
            score -= emptyHeadings * 5;
            
            // 최종 점수 설정 (0-100 범위로 제한)
            result.score = Math.max(0, Math.min(100, score));
            
            return result;
        },
        
        /**
         * 링크 접근성 분석
         * @param {Document} [doc] - 분석할 문서 (기본: 현재 문서)
         * @return {Object} 링크 접근성 분석 결과
         */
        analyzeLinks: function(doc) {
            doc = doc || document;
            
            const result = {
                score: 0,
                issues: [],
                stats: {
                    total: 0,
                    withText: 0,
                    withoutText: 0,
                    withTitle: 0,
                    emptyHref: 0,
                    internal: 0,
                    external: 0
                },
                links: []
            };
            
            // 링크 요소 수집
            const links = doc.querySelectorAll('a');
            result.stats.total = links.length;
            
            // 링크가 없는 경우 만점 반환
            if (links.length === 0) {
                result.score = 100;
                return result;
            }
            
            // 현재 도메인 및 경로
            const currentDomain = window.location.hostname;
            
            // 각 링크 분석
            links.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent.trim();
                const hasText = text !== '';
                const hasTitle = link.hasAttribute('title');
                const title = link.getAttribute('title');
                const hasHref = link.hasAttribute('href');
                const hasImage = link.querySelector('img') !== null;
                const hasAriaLabel = link.hasAttribute('aria-label');
                const ariaLabel = link.getAttribute('aria-label');
                
                // 링크 정보 저장
                const linkInfo = {
                    href: href,
                    text: text,
                    title: title,
                    element: link,
                    hasImage: hasImage
                };
                
                result.links.push(linkInfo);
                
                // 통계 업데이트
                if (hasText) result.stats.withText++;
                else result.stats.withoutText++;
                
                if (hasTitle) result.stats.withTitle++;
                
                if (!hasHref || href === '' || href === '#') {
                    result.stats.emptyHref++;
                } else if (href && (href.indexOf('://') === -1 || href.indexOf(currentDomain) !== -1)) {
                    result.stats.internal++;
                } else {
                    result.stats.external++;
                }
                
                // 접근성 이슈 확인
                
                // 1. 링크 텍스트 부재
                if (!hasText && !hasImage && !hasAriaLabel) {
                    result.issues.push(this.createIssue(
                        'empty-link-text',
                        'critical',
                        '링크에 텍스트가 없습니다.',
                        '스크린 리더 사용자는 링크의 목적을 알 수 없습니다.',
                        link,
                        '모든 링크에는 설명적인 텍스트를 제공하세요.'
                    ));
                }
                
                // 2. 의미 없는 링크 텍스트
                if (hasText && (text === 'click here' || text === 'here' || text === '여기' || text === '여기를 클릭' || text === '여기를 누르세요')) {
                    result.issues.push(this.createIssue(
                        'generic-link-text',
                        'major',
                        `의미 없는 링크 텍스트: "${text}"`,
                        '링크 텍스트는 링크의 목적을 설명해야 합니다.',
                        link,
                        '링크의 목적을 설명하는 의미 있는 링크 텍스트를 사용하세요. "여기를 클릭" 대신 "연락처 페이지" 같은 설명적인 텍스트를 사용하세요.'
                    ));
                }
                
                // 3. 빈 href 속성
                if (!hasHref || href === '') {
                    result.issues.push(this.createIssue(
                        'missing-href',
                        'major',
                        '링크에 href 속성이 없습니다.',
                        '링크는 유효한 href 속성이 있어야 합니다.',
                        link,
                        '모든 링크에 유효한 href 속성을 추가하세요.'
                    ));
                }
                
                // 4. 이미지만 있는 링크는 alt 또는 aria-label 필요
                if (hasImage && !hasText && !hasAriaLabel) {
                    const img = link.querySelector('img');
                    const imgAlt = img ? img.getAttribute('alt') : '';
                    
                    if (!imgAlt || imgAlt === '') {
                        result.issues.push(this.createIssue(
                            'image-link-no-alternative',
                            'critical',
                            '이미지 링크에 대체 텍스트가 없습니다.',
                            '이미지만 포함하는 링크는 이미지에 대체 텍스트가 있거나 링크에 aria-label이 있어야 합니다.',
                            link,
                            '이미지에 alt 속성을 추가하거나 링크에 aria-label 속성을 추가하세요.'
                        ));
                    }
                }
                
                // 5. 중복된 title과 텍스트
                if (hasTitle && hasText && title === text) {
                    result.issues.push(this.createIssue(
                        'duplicate-title-text',
                        'minor',
                        '링크 텍스트와 title 속성이 중복됩니다.',
                        `링크 텍스트와 title이 모두 "${text}"입니다.`,
                        link,
                        'title 속성은 링크 텍스트에 보완적인 정보를 제공해야 합니다. 중복된 경우 title을 제거하거나 추가 정보를 제공하도록 변경하세요.'
                    ));
                }
            });
            
            // 점수 계산
            let score = 100;
            
            // 빈 링크 텍스트 감점
            const emptyTextLinks = result.issues.filter(issue => issue.type === 'empty-link-text').length;
            if (result.stats.total > 0) {
                score -= (emptyTextLinks / result.stats.total) * 50;
            }
            
            // 의미 없는 링크 텍스트 감점
            const genericTextLinks = result.issues.filter(issue => issue.type === 'generic-link-text').length;
            if (result.stats.total > 0) {
                score -= (genericTextLinks / result.stats.total) * 30;
            }
            
            // href 없는 링크 감점
            const missingHrefLinks = result.issues.filter(issue => issue.type === 'missing-href').length;
            if (result.stats.total > 0) {
                score -= (missingHrefLinks / result.stats.total) * 30;
            }
            
            // 이미지 링크 대체 텍스트 부재 감점
            const imageLinksNoAlt = result.issues.filter(issue => issue.type === 'image-link-no-alternative').length;
            if (result.stats.total > 0) {
                score -= (imageLinksNoAlt / result.stats.total) * 40;
            }
            
            // 최종 점수 설정 (0-100 범위로 제한)
            result.score = Math.max(0, Math.min(100, Math.round(score)));
            
            return result;
        },
        
        /**
         * 콘텐츠 품질/키워드/가독성 분석
         * @param {Document} [doc] - 분석할 문서 (기본: 현재 문서)
         * @return {Object} 콘텐츠 분석 결과
         */
        analyzeContent: function(doc) {
            doc = doc || document;
            const result = {
                score: 0,
                issues: [],
                stats: {
                    textLength: 0,
                    avgSentenceLength: 0,
                    keywordDensity: 0,
                    keyword: '',
                    duplicate: false
                }
            };
            // 본문 텍스트 추출 (main, article, body 우선)
            let contentEl = doc.querySelector('main, article');
            if (!contentEl) contentEl = doc.body;
            const text = contentEl ? contentEl.innerText || '' : '';
            result.stats.textLength = text.length;
            // 문장 분리
            const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
            result.stats.avgSentenceLength = sentences.length > 0 ? Math.round(text.length / sentences.length) : 0;
            // 키워드(제목에서 추출, 단어 빈도 상위 1개)
            const words = text.toLowerCase().match(/\b[\w가-힣]{2,}\b/g) || [];
            const freq = {};
            words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
            const keyword = sorted.length > 0 ? sorted[0][0] : '';
            result.stats.keyword = keyword;
            result.stats.keywordDensity = keyword && words.length > 0 ? Math.round((freq[keyword]/words.length)*1000)/10 : 0;
            // 얇은 콘텐츠(길이 300자 미만)
            if (text.length < 300) {
                result.issues.push(this.createIssue(
                    'thin-content', 'major', '본문 콘텐츠가 너무 짧습니다.', `현재 길이: ${text.length}자 (최소 300자 권장)`, contentEl,
                    '충분한 정보를 제공하는 본문 콘텐츠를 작성하세요.'
                ));
            }
            // 키워드 과다(밀도 5% 초과)
            if (result.stats.keywordDensity > 5) {
                result.issues.push(this.createIssue(
                    'keyword-stuffing', 'major', '키워드가 과도하게 반복됩니다.', `키워드 "${keyword}" 밀도: ${result.stats.keywordDensity}% (5% 이하 권장)`, contentEl,
                    '키워드 남용을 피하고 자연스러운 문장을 작성하세요.'
                ));
            }
            // 가독성(평균 문장 길이 40자 초과)
            if (result.stats.avgSentenceLength > 40) {
                result.issues.push(this.createIssue(
                    'poor-readability', 'minor', '문장이 너무 깁니다.', `평균 문장 길이: ${result.stats.avgSentenceLength}자 (40자 이하 권장)`, contentEl,
                    '짧고 명확한 문장으로 가독성을 높이세요.'
                ));
            }
            // 중복 콘텐츠(간단: title이 본문에 2회 이상 등장)
            const title = doc.title || '';
            if (title && text.split(title).length > 2) {
                result.stats.duplicate = true;
                result.issues.push(this.createIssue(
                    'duplicate-content', 'minor', '제목이 본문에 과도하게 반복됩니다.', `제목 "${title}"이 본문에 여러 번 등장합니다.`, contentEl,
                    '제목 반복을 줄이고 다양한 표현을 사용하세요.'
                ));
            }
            // 점수 계산(가중치 예시)
            let score = 100;
            if (text.length < 300) score -= 30;
            if (result.stats.keywordDensity > 5) score -= 20;
            if (result.stats.avgSentenceLength > 40) score -= 10;
            if (result.stats.duplicate) score -= 10;
            result.score = Math.max(0, Math.min(100, score));
            return result;
        }
    };
})();

/**
 * SEOAnalyzer 클래스: 통합 SEO 분석 API
 *
 * 사용 예시:
 *   const analyzer = new window.KoreanWebAnalyzer.utils.SEOAnalyzer(document);
 *   const result = analyzer.analyze();
 *   // result: { score, issues, details }
 */
window.KoreanWebAnalyzer.utils.SEOAnalyzer = function(doc) {
    this.doc = doc || document;
    this.analyzer = window.KoreanWebAnalyzer.utils.analyzer;
};

window.KoreanWebAnalyzer.utils.SEOAnalyzer.prototype.analyze = function() {
    const meta = this.analyzer.analyzeMetaTags(this.doc);
    const headings = this.analyzer.analyzeHeadings(this.doc);
    const links = this.analyzer.analyzeLinks(this.doc);
    const content = this.analyzer.analyzeContent(this.doc);
    // TODO: 키워드/콘텐츠/소셜 분석 등 추가 예정

    // 종합 점수 계산 (가중치 예시)
    const weights = { meta: 0.2, headings: 0.2, links: 0.3, content: 0.3 };
    const score = Math.round(
        meta.score * weights.meta +
        headings.score * weights.headings +
        links.score * weights.links +
        content.score * weights.content
    );

    // 이슈 통합
    const issues = [].concat(meta.issues, headings.issues, links.issues, content.issues);

    // 상세 결과
    const details = {
        meta,
        headings,
        links,
        content
    };

    return { score, issues, details };
};