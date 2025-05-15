/**
 * Open Graph 태그 분석 컴포넌트
 * 
 * 웹페이지의 Open Graph 메타 태그를 감지, 검증 및 분석하여
 * 소셜 미디어에서의 최적 공유를 위한 분석 결과를 제공합니다.
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
    
    if (!window.KoreanWebAnalyzer.analyzer.social) {
        window.KoreanWebAnalyzer.analyzer.social = {};
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    /**
     * Open Graph 태그 분석 클래스
     */
    class OpenGraphAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                score: 0,
                tags: {},
                issues: [],
                recommendations: []
            };
            
            // 필수 Open Graph 태그 정의
            this.requiredTags = [
                'og:title',
                'og:description',
                'og:image',
                'og:url'
            ];
            
            // 권장 Open Graph 태그 정의
            this.recommendedTags = [
                'og:type',
                'og:site_name'
            ];
            
            // 권장 이미지 크기 (Facebook 최적화)
            this.recommendedImageSize = {
                width: 1200,
                height: 630,
                minWidth: 600,
                minHeight: 315
            };
            
            // 권장 문자 길이
            this.recommendedLength = {
                'og:title': {
                    min: 15,
                    max: 70
                },
                'og:description': {
                    min: 50,
                    max: 200
                }
            };
        }
        
        /**
         * Open Graph 태그 분석 실행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('Open Graph 태그 분석 시작');
            
            // 모든 메타 태그 추출
            const metaTags = this.doc.querySelectorAll('meta');
            const ogTags = {};
            
            // Open Graph 태그 필터링
            metaTags.forEach(tag => {
                const property = tag.getAttribute('property');
                if (property && property.startsWith('og:')) {
                    ogTags[property] = tag.getAttribute('content');
                }
            });
            
            // 결과 저장
            this.results.tags = ogTags;
            
            // 필수 태그 확인
            this.checkRequiredTags(ogTags);
            
            // 태그 내용 검증
            this.validateTagContents(ogTags);
            
            // 이미지 검증
            if (ogTags['og:image']) {
                this.validateImage(ogTags['og:image']);
            }
            
            // 점수 계산
            this.calculateScore();
            
            // 권장사항 생성
            this.generateRecommendations();
            
            logger.debug('Open Graph 태그 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * 필수 태그 확인
         * @param {Object} ogTags - 추출된 Open Graph 태그
         */
        checkRequiredTags(ogTags) {
            this.requiredTags.forEach(tag => {
                if (!ogTags[tag] || ogTags[tag].trim() === '') {
                    this.results.issues.push({
                        id: `missing_${tag.replace(':', '_')}`,
                        type: 'missing',
                        tag: tag,
                        severity: 'major',
                        description: `필수 Open Graph 태그 '${tag}'가 없습니다.`,
                        solution: `<meta property="${tag}" content="적절한 내용">을 head 섹션에 추가하세요.`
                    });
                }
            });
            
            this.recommendedTags.forEach(tag => {
                if (!ogTags[tag] || ogTags[tag].trim() === '') {
                    this.results.issues.push({
                        id: `missing_${tag.replace(':', '_')}`,
                        type: 'missing',
                        tag: tag,
                        severity: 'minor',
                        description: `권장 Open Graph 태그 '${tag}'가 없습니다.`,
                        solution: `<meta property="${tag}" content="적절한 내용">을 head 섹션에 추가하세요.`
                    });
                }
            });
        }
        
        /**
         * 태그 내용 검증
         * @param {Object} ogTags - 추출된 Open Graph 태그
         */
        validateTagContents(ogTags) {
            // 제목 길이 검증
            if (ogTags['og:title']) {
                const titleLength = ogTags['og:title'].length;
                const recommendedLength = this.recommendedLength['og:title'];
                
                if (titleLength < recommendedLength.min) {
                    this.results.issues.push({
                        id: 'short_title',
                        type: 'content',
                        tag: 'og:title',
                        severity: 'minor',
                        description: `'og:title'이 너무 짧습니다 (${titleLength}자). 최소 ${recommendedLength.min}자 이상이 권장됩니다.`,
                        solution: '더 설명적이고 구체적인 제목을 사용하세요.'
                    });
                } else if (titleLength > recommendedLength.max) {
                    this.results.issues.push({
                        id: 'long_title',
                        type: 'content',
                        tag: 'og:title',
                        severity: 'minor',
                        description: `'og:title'이 너무 깁니다 (${titleLength}자). 최대 ${recommendedLength.max}자 이하가 권장됩니다.`,
                        solution: '주요 키워드를 유지하면서 제목을 줄이세요.'
                    });
                }
                
                // 페이지 제목과 OG 제목 비교
                const pageTitle = this.doc.title;
                if (pageTitle && pageTitle.trim() !== '' && ogTags['og:title'] !== pageTitle) {
                    this.results.issues.push({
                        id: 'title_mismatch',
                        type: 'content',
                        tag: 'og:title',
                        severity: 'info',
                        description: `'og:title'이 페이지 제목과 다릅니다.`,
                        solution: '소셜 미디어 전략에 따라 의도적이 아니라면, 일관성을 위해 동일하게 유지하는 것이 좋습니다.'
                    });
                }
            }
            
            // 설명 길이 검증
            if (ogTags['og:description']) {
                const descLength = ogTags['og:description'].length;
                const recommendedLength = this.recommendedLength['og:description'];
                
                if (descLength < recommendedLength.min) {
                    this.results.issues.push({
                        id: 'short_description',
                        type: 'content',
                        tag: 'og:description',
                        severity: 'minor',
                        description: `'og:description'이 너무 짧습니다 (${descLength}자). 최소 ${recommendedLength.min}자 이상이 권장됩니다.`,
                        solution: '더 설명적이고 구체적인 설명을 추가하세요.'
                    });
                } else if (descLength > recommendedLength.max) {
                    this.results.issues.push({
                        id: 'long_description',
                        type: 'content',
                        tag: 'og:description',
                        severity: 'minor',
                        description: `'og:description'이 너무 깁니다 (${descLength}자). 최대 ${recommendedLength.max}자 이하가 권장됩니다.`,
                        solution: '주요 내용을 유지하면서 설명을 줄이세요.'
                    });
                }
                
                // 메타 설명과 OG 설명 비교
                const metaDescription = this.doc.querySelector('meta[name="description"]');
                if (metaDescription && metaDescription.getAttribute('content').trim() !== '' && 
                    ogTags['og:description'] !== metaDescription.getAttribute('content')) {
                    this.results.issues.push({
                        id: 'description_mismatch',
                        type: 'content',
                        tag: 'og:description',
                        severity: 'info',
                        description: `'og:description'이 메타 설명과 다릅니다.`,
                        solution: '소셜 미디어 전략에 따라 의도적이 아니라면, 일관성을 위해 동일하게 유지하는 것이 좋습니다.'
                    });
                }
            }
            
            // URL 검증
            if (ogTags['og:url']) {
                try {
                    new URL(ogTags['og:url']); // URL 형식 검증
                    
                    // 현재 URL과 OG URL 비교
                    const currentUrl = this.doc.location.href.split('#')[0]; // 해시 제거
                    if (ogTags['og:url'] !== currentUrl) {
                        this.results.issues.push({
                            id: 'url_mismatch',
                            type: 'content',
                            tag: 'og:url',
                            severity: 'minor',
                            description: `'og:url'이 현재 페이지 URL과 다릅니다.`,
                            solution: '현재 페이지의 정식 URL을 사용하세요.'
                        });
                    }
                } catch (e) {
                    this.results.issues.push({
                        id: 'invalid_url',
                        type: 'content',
                        tag: 'og:url',
                        severity: 'major',
                        description: `'og:url'이 유효한 URL 형식이 아닙니다.`,
                        solution: '유효한 전체 URL(프로토콜 포함)을 사용하세요.'
                    });
                }
            }
            
            // 타입 검증
            if (ogTags['og:type']) {
                const validTypes = ['website', 'article', 'book', 'profile', 'music.song', 'music.album', 
                                   'music.playlist', 'music.radio_station', 'video.movie', 'video.episode', 
                                   'video.tv_show', 'video.other'];
                
                if (!validTypes.includes(ogTags['og:type'])) {
                    this.results.issues.push({
                        id: 'invalid_type',
                        type: 'content',
                        tag: 'og:type',
                        severity: 'minor',
                        description: `'og:type'이 표준 Open Graph 타입이 아닙니다.`,
                        solution: '표준 타입(website, article, book 등)을 사용하세요.'
                    });
                }
            }
        }
        
        /**
         * 이미지 검증
         * @param {string} imageUrl - 이미지 URL
         */
        validateImage(imageUrl) {
            // URL 형식 검증
            try {
                new URL(imageUrl);
            } catch (e) {
                this.results.issues.push({
                    id: 'invalid_image_url',
                    type: 'content',
                    tag: 'og:image',
                    severity: 'major',
                    description: `'og:image' URL이 유효하지 않습니다.`,
                    solution: '유효한 전체 URL(프로토콜 포함)을 사용하세요.'
                });
                return;
            }
            
            // 이미지 접근성 및 크기 검증은 추가 분석 모듈에서 수행
            // 이 단계에서는 URL 형식만 검증
            
            // 추가 이미지 속성 확인
            const hasImageWidth = !!this.results.tags['og:image:width'];
            const hasImageHeight = !!this.results.tags['og:image:height'];
            
            if (!hasImageWidth || !hasImageHeight) {
                this.results.issues.push({
                    id: 'missing_image_dimensions',
                    type: 'missing',
                    tag: 'og:image',
                    severity: 'minor',
                    description: `'og:image:width' 및 'og:image:height' 태그가 없습니다.`,
                    solution: '이미지 크기 태그를 추가하여 소셜 미디어 플랫폼의 이미지 로딩 성능을 향상시키세요.'
                });
            } else {
                // 이미지 크기 검증
                const width = parseInt(this.results.tags['og:image:width']);
                const height = parseInt(this.results.tags['og:image:height']);
                
                if (isNaN(width) || isNaN(height)) {
                    this.results.issues.push({
                        id: 'invalid_image_dimensions',
                        type: 'content',
                        tag: 'og:image',
                        severity: 'minor',
                        description: '이미지 크기 값이 유효한 숫자가 아닙니다.',
                        solution: '이미지 크기에 유효한 숫자 값을 사용하세요.'
                    });
                } else if (width < this.recommendedImageSize.minWidth || height < this.recommendedImageSize.minHeight) {
                    this.results.issues.push({
                        id: 'small_image',
                        type: 'content',
                        tag: 'og:image',
                        severity: 'minor',
                        description: `이미지 크기(${width}x${height})가 권장 최소 크기(${this.recommendedImageSize.minWidth}x${this.recommendedImageSize.minHeight})보다 작습니다.`,
                        solution: `소셜 미디어에서 최적의 미리보기를 위해 최소 ${this.recommendedImageSize.minWidth}x${this.recommendedImageSize.minHeight} 크기의 이미지를 사용하세요.`
                    });
                } else if (width < this.recommendedImageSize.width || height < this.recommendedImageSize.height) {
                    this.results.issues.push({
                        id: 'suboptimal_image_size',
                        type: 'content',
                        tag: 'og:image',
                        severity: 'info',
                        description: `이미지 크기(${width}x${height})가 권장 크기(${this.recommendedImageSize.width}x${this.recommendedImageSize.height})보다 작습니다.`,
                        solution: `최적의 미리보기를 위해 ${this.recommendedImageSize.width}x${this.recommendedImageSize.height} 크기의 이미지를 사용하는 것이 좋습니다.`
                    });
                }
            }
            
            // 이미지 대체 텍스트 확인
            if (!this.results.tags['og:image:alt']) {
                this.results.issues.push({
                    id: 'missing_image_alt',
                    type: 'missing',
                    tag: 'og:image',
                    severity: 'minor',
                    description: `'og:image:alt' 태그가 없습니다.`,
                    solution: '접근성 향상을 위해 이미지 대체 텍스트를 추가하세요.'
                });
            }
        }
        
        /**
         * 분석 점수 계산
         */
        calculateScore() {
            let score = 100; // 기본 점수
            
            // 이슈 심각도별 감점
            const penalties = {
                'critical': 25,
                'major': 15,
                'minor': 5,
                'info': 0
            };
            
            // 이슈에 따른 감점
            this.results.issues.forEach(issue => {
                score -= penalties[issue.severity] || 0;
            });
            
            // 필수 태그 보너스
            let requiredTagsCount = 0;
            this.requiredTags.forEach(tag => {
                if (this.results.tags[tag]) requiredTagsCount++;
            });
            
            // 모든 필수 태그가 있으면 보너스
            if (requiredTagsCount === this.requiredTags.length) {
                score += 10;
            }
            
            // 점수 범위 조정
            this.results.score = Math.max(0, Math.min(100, score));
        }
        
        /**
         * 권장사항 생성
         */
        generateRecommendations() {
            // 이슈 기반 권장사항 생성
            this.results.issues.forEach(issue => {
                this.results.recommendations.push({
                    id: issue.id + '_recommendation',
                    priority: this.getSeverityPriority(issue.severity),
                    description: issue.solution
                });
            });
            
            // 일반적인 권장사항 추가
            if (Object.keys(this.results.tags).length === 0) {
                this.results.recommendations.push({
                    id: 'add_basic_og_tags',
                    priority: 'high',
                    description: '기본 Open Graph 태그(og:title, og:description, og:image, og:url)를 추가하여 소셜 미디어 공유 최적화를 시작하세요.'
                });
            }
        }
        
        /**
         * 심각도에 따른 우선순위 반환
         * @param {string} severity - 이슈 심각도
         * @return {string} 우선순위
         */
        getSeverityPriority(severity) {
            switch (severity) {
                case 'critical':
                    return 'high';
                case 'major':
                    return 'high';
                case 'minor':
                    return 'medium';
                case 'info':
                    return 'low';
                default:
                    return 'medium';
            }
        }
        
        /**
         * 모의 분석용 메서드 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock() {
            // 모의 분석 결과 생성
            return {
                score: 75,
                tags: {
                    'og:title': '한국 웹 분석기 - 웹사이트 최적화 도구',
                    'og:description': '한국 웹사이트를 분석하고 최적화하는 도구입니다.',
                    'og:image': 'https://example.com/images/preview.jpg',
                    'og:url': 'https://example.com/analyzer',
                    'og:type': 'website'
                },
                issues: [
                    {
                        id: 'missing_image_dimensions',
                        type: 'missing',
                        tag: 'og:image',
                        severity: 'minor',
                        description: '\'og:image:width\' 및 \'og:image:height\' 태그가 없습니다.',
                        solution: '이미지 크기 태그를 추가하여 소셜 미디어 플랫폼의 이미지 로딩 성능을 향상시키세요.'
                    },
                    {
                        id: 'missing_image_alt',
                        type: 'missing',
                        tag: 'og:image',
                        severity: 'minor',
                        description: '\'og:image:alt\' 태그가 없습니다.',
                        solution: '접근성 향상을 위해 이미지 대체 텍스트를 추가하세요.'
                    }
                ],
                recommendations: [
                    {
                        id: 'missing_image_dimensions_recommendation',
                        priority: 'medium',
                        description: '이미지 크기 태그를 추가하여 소셜 미디어 플랫폼의 이미지 로딩 성능을 향상시키세요.'
                    },
                    {
                        id: 'missing_image_alt_recommendation',
                        priority: 'medium',
                        description: '접근성 향상을 위해 이미지 대체 텍스트를 추가하세요.'
                    }
                ]
            };
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.social.openGraph = {
        /**
         * Open Graph 태그 분석 실행
         * @param {Document} [doc] - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new OpenGraphAnalyzer(doc);
            return analyzer.analyze();
        },
        
        /**
         * 모의 분석 실행 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock: function() {
            const analyzer = new OpenGraphAnalyzer(document);
            return analyzer.analyzeMock();
        }
    };
    
    logger.debug('Open Graph 태그 분석 모듈 초기화 완료');
})();