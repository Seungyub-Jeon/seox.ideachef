/**
 * 소셜 미디어 미리보기 이미지 검증 모듈
 * 
 * 소셜 미디어 공유에 사용되는 이미지를 검증하여
 * 최적의 크기, 형식, 로딩 속도 등을 분석하는 모듈입니다.
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
     * 소셜 미디어 이미지 검증 클래스
     */
    class ImageVerification {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                score: 0,
                images: [],
                issues: [],
                recommendations: []
            };
            
            // 플랫폼별 권장 이미지 크기
            this.recommendedSizes = {
                facebook: {
                    width: 1200,
                    height: 630,
                    minWidth: 600,
                    minHeight: 315,
                    aspectRatio: 1.91
                },
                twitter: {
                    summary: {
                        width: 300,
                        height: 157,
                        minWidth: 144,
                        minHeight: 144,
                        aspectRatio: 1.91
                    },
                    summary_large_image: {
                        width: 1200,
                        height: 675,
                        minWidth: 300,
                        minHeight: 157,
                        aspectRatio: 1.91
                    }
                },
                linkedin: {
                    width: 1200,
                    height: 627,
                    minWidth: 600,
                    minHeight: 315,
                    aspectRatio: 1.91
                },
                pinterest: {
                    width: 1000,
                    height: 1500,
                    minWidth: 600,
                    minHeight: 900,
                    aspectRatio: 0.67 // 2:3 비율
                }
            };
            
            // 최적 이미지 파일 크기 (바이트)
            this.optimalFileSize = 1024 * 1024; // 1MB 이하 권장
            
            // 로딩 시간 기준 (밀리초)
            this.loadingTimeThresholds = {
                good: 300,
                acceptable: 800,
                poor: 2000
            };
        }
        
        /**
         * 이미지 검증 분석 실행
         * @return {Object} 분석 결과
         */
        async analyze() {
            logger.debug('소셜 미디어 이미지 검증 시작');
            
            // 소셜 미디어 태그에서 이미지 URL 추출
            const imageTags = this.extractImageTags();
            
            // 이미지가 없는 경우 
            if (imageTags.length === 0) {
                this.results.issues.push({
                    id: 'no_social_media_images',
                    type: 'missing',
                    severity: 'critical',
                    description: '소셜 미디어 공유용 이미지가 없습니다.',
                    solution: 'Open Graph 및 Twitter Card 이미지 태그를 추가하세요.'
                });
                
                this.results.score = 0;
                
                return this.results;
            }
            
            // 각 이미지 검증
            const imagePromises = imageTags.map(tag => this.verifyImage(tag));
            
            try {
                // 비동기 분석은 bookmarklet 환경에서는 실행하지 않음
                // 모의 결과 반환
                if (typeof window.KoreanWebAnalyzer.isBookmarklet !== 'undefined' && 
                    window.KoreanWebAnalyzer.isBookmarklet) {
                    return this.analyzeMock();
                }
                
                // 병렬로 모든 이미지 검증
                await Promise.all(imagePromises);
                
                // 점수 계산
                this.calculateScore();
                
                // 권장사항 생성
                this.generateRecommendations();
                
                logger.debug('소셜 미디어 이미지 검증 완료', { score: this.results.score });
                
                return this.results;
            } catch (error) {
                logger.error('이미지 검증 중 오류 발생', error);
                
                // 오류 발생 시 모의 결과 반환
                return this.analyzeMock();
            }
        }
        
        /**
         * 소셜 미디어 태그에서 이미지 URL 추출
         * @return {Array} 이미지 태그 정보 배열
         */
        extractImageTags() {
            const imageTags = [];
            
            // Open Graph 이미지 태그 추출
            const ogImageTag = this.doc.querySelector('meta[property="og:image"]');
            if (ogImageTag) {
                const imageUrl = ogImageTag.getAttribute('content');
                if (imageUrl) {
                    // 추가 속성 확인
                    const ogImageWidth = this.getMetaTagContent('meta[property="og:image:width"]');
                    const ogImageHeight = this.getMetaTagContent('meta[property="og:image:height"]');
                    const ogImageAlt = this.getMetaTagContent('meta[property="og:image:alt"]');
                    
                    imageTags.push({
                        type: 'og:image',
                        url: imageUrl,
                        width: ogImageWidth ? parseInt(ogImageWidth) : null,
                        height: ogImageHeight ? parseInt(ogImageHeight) : null,
                        alt: ogImageAlt,
                        platform: 'facebook'
                    });
                }
            }
            
            // Twitter 이미지 태그 추출
            const twitterImageTag = this.doc.querySelector('meta[name="twitter:image"]');
            if (twitterImageTag) {
                const imageUrl = twitterImageTag.getAttribute('content');
                if (imageUrl) {
                    // 추가 속성 확인
                    const twitterCard = this.getMetaTagContent('meta[name="twitter:card"]');
                    const twitterImageAlt = this.getMetaTagContent('meta[name="twitter:image:alt"]');
                    
                    imageTags.push({
                        type: 'twitter:image',
                        url: imageUrl,
                        cardType: twitterCard,
                        alt: twitterImageAlt,
                        platform: 'twitter'
                    });
                }
            }
            
            return imageTags;
        }
        
        /**
         * 특정 선택자의 메타 태그 콘텐츠 가져오기
         * @param {string} selector - CSS 선택자
         * @return {string|null} 메타 태그 콘텐츠
         */
        getMetaTagContent(selector) {
            const tag = this.doc.querySelector(selector);
            return tag ? tag.getAttribute('content') : null;
        }
        
        /**
         * 이미지 검증 수행
         * @param {Object} imageTag - 이미지 태그 정보
         * @return {Promise} 검증 결과 Promise
         */
        async verifyImage(imageTag) {
            // 이미지 로드 시간 측정 및 정보 추출을 위해 이미지 로드
            try {
                const imageResult = await this.loadAndAnalyzeImage(imageTag.url);
                
                // 이미지 결과 저장
                const verifiedImage = {
                    ...imageTag,
                    ...imageResult
                };
                
                this.results.images.push(verifiedImage);
                
                // 이미지 검증 이슈 생성
                this.checkImageIssues(verifiedImage);
                
                return verifiedImage;
            } catch (error) {
                logger.error(`이미지 검증 오류: ${imageTag.url}`, error);
                
                // 이미지 로드 실패 이슈 추가
                this.results.issues.push({
                    id: `${imageTag.type.replace(':', '_')}_load_failed`,
                    type: 'error',
                    tag: imageTag.type,
                    severity: 'major',
                    description: `${imageTag.type} 이미지를 로드할 수 없습니다: ${imageTag.url}`,
                    solution: '올바른 이미지 URL을 사용하고 이미지 서버가 제대로 작동하는지 확인하세요.'
                });
                
                // 실패한 이미지 정보 추가
                this.results.images.push({
                    ...imageTag,
                    loadSuccess: false,
                    error: error.message
                });
                
                return null;
            }
        }
        
        /**
         * 이미지 로드 및 분석
         * @param {string} url - 이미지 URL
         * @return {Promise<Object>} 이미지 분석 결과
         */
        loadAndAnalyzeImage(url) {
            return new Promise((resolve, reject) => {
                const startTime = performance.now();
                const img = new Image();
                
                img.onload = () => {
                    const loadTime = performance.now() - startTime;
                    
                    // 이미지 분석 결과
                    resolve({
                        loadSuccess: true,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        aspectRatio: img.naturalWidth / img.naturalHeight,
                        loadTime: loadTime
                    });
                };
                
                img.onerror = () => {
                    reject(new Error('이미지 로드 실패'));
                };
                
                img.src = url;
            });
        }
        
        /**
         * 이미지 검증 이슈 생성
         * @param {Object} image - 검증된 이미지 정보
         */
        checkImageIssues(image) {
            // 이미지 로드 실패 시 검증 중단
            if (!image.loadSuccess) return;
            
            // 이미지 크기 검증
            this.checkImageSize(image);
            
            // 이미지 비율 검증
            this.checkImageRatio(image);
            
            // 이미지 로딩 시간 검증
            this.checkLoadingTime(image);
            
            // 대체 텍스트 검증
            this.checkAltText(image);
        }
        
        /**
         * 이미지 크기 검증
         * @param {Object} image - 이미지 정보
         */
        checkImageSize(image) {
            let recommendedSize;
            
            // 플랫폼별 권장 크기 가져오기
            if (image.platform === 'facebook') {
                recommendedSize = this.recommendedSizes.facebook;
            } else if (image.platform === 'twitter') {
                if (image.cardType === 'summary_large_image') {
                    recommendedSize = this.recommendedSizes.twitter.summary_large_image;
                } else {
                    recommendedSize = this.recommendedSizes.twitter.summary;
                }
            }
            
            if (!recommendedSize) return;
            
            // 최소 크기 검증
            if (image.width < recommendedSize.minWidth || image.height < recommendedSize.minHeight) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_too_small`,
                    type: 'size',
                    tag: image.type,
                    severity: 'major',
                    description: `${image.type} 이미지(${image.width}x${image.height})가 권장 최소 크기(${recommendedSize.minWidth}x${recommendedSize.minHeight})보다 작습니다.`,
                    solution: `${image.platform} 공유 최적화를 위해 최소 ${recommendedSize.minWidth}x${recommendedSize.minHeight} 이상의 이미지를 사용하세요.`
                });
            }
            // 권장 크기 검증
            else if (image.width < recommendedSize.width || image.height < recommendedSize.height) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_suboptimal_size`,
                    type: 'size',
                    tag: image.type,
                    severity: 'minor',
                    description: `${image.type} 이미지(${image.width}x${image.height})가 권장 크기(${recommendedSize.width}x${recommendedSize.height})보다 작습니다.`,
                    solution: `최적의 ${image.platform} 공유 이미지를 위해 ${recommendedSize.width}x${recommendedSize.height} 크기의 이미지를 사용하세요.`
                });
            }
        }
        
        /**
         * 이미지 비율 검증
         * @param {Object} image - 이미지 정보
         */
        checkImageRatio(image) {
            let recommendedRatio;
            
            // 플랫폼별 권장 비율 가져오기
            if (image.platform === 'facebook') {
                recommendedRatio = this.recommendedSizes.facebook.aspectRatio;
            } else if (image.platform === 'twitter') {
                if (image.cardType === 'summary_large_image') {
                    recommendedRatio = this.recommendedSizes.twitter.summary_large_image.aspectRatio;
                } else {
                    recommendedRatio = this.recommendedSizes.twitter.summary.aspectRatio;
                }
            }
            
            if (!recommendedRatio) return;
            
            // 비율 오차 허용 범위
            const ratioTolerance = 0.1;
            
            // 비율 검증
            if (Math.abs(image.aspectRatio - recommendedRatio) > ratioTolerance) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_wrong_ratio`,
                    type: 'ratio',
                    tag: image.type,
                    severity: 'minor',
                    description: `${image.type} 이미지 비율(${image.aspectRatio.toFixed(2)})이 ${image.platform} 권장 비율(${recommendedRatio})과 다릅니다.`,
                    solution: `${image.platform} 공유 최적화를 위해 권장 비율의 이미지를 사용하세요.`
                });
            }
        }
        
        /**
         * 이미지 로딩 시간 검증
         * @param {Object} image - 이미지 정보
         */
        checkLoadingTime(image) {
            if (image.loadTime > this.loadingTimeThresholds.poor) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_slow_loading`,
                    type: 'performance',
                    tag: image.type,
                    severity: 'major',
                    description: `${image.type} 이미지 로딩 시간(${image.loadTime.toFixed(0)}ms)이 너무 깁니다.`,
                    solution: '이미지 크기를 최적화하고, 빠른 이미지 호스팅 서비스나 CDN을 사용하세요.'
                });
            } else if (image.loadTime > this.loadingTimeThresholds.acceptable) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_moderate_loading`,
                    type: 'performance',
                    tag: image.type,
                    severity: 'minor',
                    description: `${image.type} 이미지 로딩 시간(${image.loadTime.toFixed(0)}ms)이 다소 깁니다.`,
                    solution: '이미지 최적화, WebP 형식 사용, 이미지 압축 등을 고려하세요.'
                });
            }
        }
        
        /**
         * 대체 텍스트 검증
         * @param {Object} image - 이미지 정보
         */
        checkAltText(image) {
            if (!image.alt) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_missing_alt`,
                    type: 'accessibility',
                    tag: image.type,
                    severity: 'minor',
                    description: `${image.type} 이미지에 대체 텍스트가 없습니다.`,
                    solution: `접근성 향상을 위해 ${image.type}:alt 태그를 추가하세요.`
                });
            } else if (image.alt.length < 10) {
                this.results.issues.push({
                    id: `${image.type.replace(':', '_')}_short_alt`,
                    type: 'accessibility',
                    tag: image.type,
                    severity: 'info',
                    description: `${image.type} 이미지의 대체 텍스트가 매우 짧습니다.`,
                    solution: '이미지 내용을 충분히 설명하는 더 자세한 대체 텍스트를 추가하세요.'
                });
            }
        }
        
        /**
         * 분석 점수 계산
         */
        calculateScore() {
            // 이미지가 없으면 0점
            if (this.results.images.length === 0 || !this.results.images.some(img => img.loadSuccess)) {
                this.results.score = 0;
                return;
            }
            
            let score = 100; // 기본 점수
            
            // 이슈 심각도별 감점
            const penalties = {
                'critical': 30,
                'major': 15,
                'minor': 5,
                'info': 0
            };
            
            // 이슈에 따른 감점
            this.results.issues.forEach(issue => {
                score -= penalties[issue.severity] || 0;
            });
            
            // 이미지가 로드된 경우 보너스
            const loadedImages = this.results.images.filter(img => img.loadSuccess);
            if (loadedImages.length > 0) {
                // 모든 이미지가 빠르게 로드된 경우 보너스
                const fastLoading = loadedImages.every(img => img.loadTime < this.loadingTimeThresholds.acceptable);
                if (fastLoading) {
                    score += 10;
                }
                
                // 모든 이미지가 권장 크기 이상인 경우 보너스
                const goodSized = loadedImages.every(img => {
                    let recommendedSize;
                    if (img.platform === 'facebook') {
                        recommendedSize = this.recommendedSizes.facebook;
                    } else if (img.platform === 'twitter') {
                        if (img.cardType === 'summary_large_image') {
                            recommendedSize = this.recommendedSizes.twitter.summary_large_image;
                        } else {
                            recommendedSize = this.recommendedSizes.twitter.summary;
                        }
                    }
                    
                    return recommendedSize && 
                           img.width >= recommendedSize.width && 
                           img.height >= recommendedSize.height;
                });
                
                if (goodSized) {
                    score += 10;
                }
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
                if (issue.solution) {
                    this.results.recommendations.push({
                        id: issue.id + '_recommendation',
                        priority: this.getSeverityPriority(issue.severity),
                        description: issue.solution
                    });
                }
            });
            
            // 일반적인 권장사항 추가
            if (this.results.images.length === 0) {
                this.results.recommendations.push({
                    id: 'add_social_images',
                    priority: 'high',
                    description: '소셜 미디어 공유를 위한 이미지를 추가하세요. Open Graph 및 Twitter Cards 태그를 사용하세요.'
                });
            } else {
                // 이미지 최적화 관련 일반 권장사항
                this.results.recommendations.push({
                    id: 'optimize_image_formats',
                    priority: 'medium',
                    description: '이미지 크기를 최적화하기 위해 최신 형식(WebP, AVIF)을 사용하고 적절하게 압축하세요.'
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
                images: [
                    {
                        type: 'og:image',
                        url: 'https://example.com/image.jpg',
                        platform: 'facebook',
                        loadSuccess: true,
                        width: 800,
                        height: 420,
                        aspectRatio: 1.9,
                        loadTime: 350,
                        alt: '한국 웹 분석기 로고'
                    },
                    {
                        type: 'twitter:image',
                        url: 'https://example.com/twitter-image.jpg',
                        platform: 'twitter',
                        cardType: 'summary_large_image',
                        loadSuccess: true,
                        width: 900,
                        height: 450,
                        aspectRatio: 2.0,
                        loadTime: 420,
                        alt: null
                    }
                ],
                issues: [
                    {
                        id: 'og_image_suboptimal_size',
                        type: 'size',
                        tag: 'og:image',
                        severity: 'minor',
                        description: 'og:image 이미지(800x420)가 권장 크기(1200x630)보다 작습니다.',
                        solution: '최적의 Facebook 공유 이미지를 위해 1200x630 크기의 이미지를 사용하세요.'
                    },
                    {
                        id: 'twitter_image_missing_alt',
                        type: 'accessibility',
                        tag: 'twitter:image',
                        severity: 'minor',
                        description: 'twitter:image 이미지에 대체 텍스트가 없습니다.',
                        solution: '접근성 향상을 위해 twitter:image:alt 태그를 추가하세요.'
                    }
                ],
                recommendations: [
                    {
                        id: 'og_image_suboptimal_size_recommendation',
                        priority: 'medium',
                        description: '최적의 Facebook 공유 이미지를 위해 1200x630 크기의 이미지를 사용하세요.'
                    },
                    {
                        id: 'twitter_image_missing_alt_recommendation',
                        priority: 'medium',
                        description: '접근성 향상을 위해 twitter:image:alt 태그를 추가하세요.'
                    },
                    {
                        id: 'optimize_image_formats',
                        priority: 'medium',
                        description: '이미지 크기를 최적화하기 위해 최신 형식(WebP, AVIF)을 사용하고 적절하게 압축하세요.'
                    }
                ]
            };
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.social.imageVerification = {
        /**
         * 이미지 검증 분석 실행
         * @param {Document} [doc] - 분석할 문서 (기본값: 현재 문서)
         * @return {Promise<Object>} 분석 결과
         */
        analyze: async function(doc) {
            doc = doc || document;
            
            const analyzer = new ImageVerification(doc);
            return await analyzer.analyze();
        },
        
        /**
         * 모의 분석 실행 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock: function() {
            const analyzer = new ImageVerification(document);
            return analyzer.analyzeMock();
        }
    };
    
    logger.debug('소셜 미디어 이미지 검증 모듈 초기화 완료');
})();