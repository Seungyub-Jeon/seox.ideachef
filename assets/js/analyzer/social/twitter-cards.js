/**
 * Twitter Cards 태그 분석 컴포넌트
 * 
 * 웹페이지의 Twitter Cards 메타 태그를 감지, 검증 및 분석하여
 * 트위터에서의 최적 공유를 위한 분석 결과를 제공합니다.
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
     * Twitter Cards 태그 분석 클래스
     */
    class TwitterCardsAnalyzer {
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
                recommendations: [],
                cardType: null,
                fallbackToOG: false
            };
            
            // Open Graph 태그 참조
            this.ogTags = this.getOpenGraphTags();
            
            // 필수 Twitter Card 태그 정의 (기본 세트)
            this.requiredTags = [
                'twitter:card'
            ];
            
            // 카드 타입별 필수 태그
            this.cardTypeRequiredTags = {
                'summary': ['twitter:title', 'twitter:description'],
                'summary_large_image': ['twitter:title', 'twitter:description', 'twitter:image'],
                'app': ['twitter:app:id:iphone', 'twitter:app:id:googleplay'],
                'player': ['twitter:player', 'twitter:player:width', 'twitter:player:height']
            };
            
            // 권장 이미지 크기 (Twitter 권장사항)
            this.recommendedImageSize = {
                'summary': {
                    width: 300,
                    height: 157,
                    aspectRatio: 1.91
                },
                'summary_large_image': {
                    width: 1200,
                    height: 675,
                    aspectRatio: 1.91
                }
            };
            
            // 권장 문자 길이
            this.recommendedLength = {
                'twitter:title': {
                    max: 70
                },
                'twitter:description': {
                    max: 200
                }
            };
        }
        
        /**
         * Twitter Cards 태그 분석 실행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('Twitter Cards 태그 분석 시작');
            
            // 모든 메타 태그 추출
            const metaTags = this.doc.querySelectorAll('meta');
            const twitterTags = {};
            
            // Twitter Cards 태그 필터링
            metaTags.forEach(tag => {
                const name = tag.getAttribute('name');
                if (name && name.startsWith('twitter:')) {
                    twitterTags[name] = tag.getAttribute('content');
                }
            });
            
            // 결과 저장
            this.results.tags = twitterTags;
            
            // 카드 타입 확인
            this.checkCardType(twitterTags);
            
            // 필수 태그 확인
            this.checkRequiredTags(twitterTags);
            
            // 태그 내용 검증
            this.validateTagContents(twitterTags);
            
            // Open Graph 태그 대체 검증
            this.checkOgFallback(twitterTags);
            
            // 이미지 검증
            if (twitterTags['twitter:image']) {
                this.validateImage(twitterTags['twitter:image'], this.results.cardType);
            }
            
            // 점수 계산
            this.calculateScore();
            
            // 권장사항 생성
            this.generateRecommendations();
            
            logger.debug('Twitter Cards 태그 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * Open Graph 태그 추출
         * @return {Object} Open Graph 태그
         */
        getOpenGraphTags() {
            const metaTags = this.doc.querySelectorAll('meta');
            const ogTags = {};
            
            metaTags.forEach(tag => {
                const property = tag.getAttribute('property');
                if (property && property.startsWith('og:')) {
                    ogTags[property] = tag.getAttribute('content');
                }
            });
            
            return ogTags;
        }
        
        /**
         * 카드 타입 확인
         * @param {Object} twitterTags - 추출된 Twitter Card 태그
         */
        checkCardType(twitterTags) {
            const cardType = twitterTags['twitter:card'];
            
            if (!cardType) {
                this.results.issues.push({
                    id: 'missing_card_type',
                    type: 'missing',
                    tag: 'twitter:card',
                    severity: 'critical',
                    description: '필수 twitter:card 태그가 없습니다.',
                    solution: '<meta name="twitter:card" content="summary"> 또는 다른 카드 타입을 추가하세요.'
                });
                return;
            }
            
            this.results.cardType = cardType;
            
            // 유효한 카드 타입 확인
            const validCardTypes = ['summary', 'summary_large_image', 'app', 'player'];
            if (!validCardTypes.includes(cardType)) {
                this.results.issues.push({
                    id: 'invalid_card_type',
                    type: 'content',
                    tag: 'twitter:card',
                    severity: 'major',
                    description: `'${cardType}'는 유효한 Twitter Card 타입이 아닙니다.`,
                    solution: '유효한 카드 타입(summary, summary_large_image, app, player)을 사용하세요.'
                });
            }
        }
        
        /**
         * 필수 태그 확인
         * @param {Object} twitterTags - 추출된 Twitter Card 태그
         */
        checkRequiredTags(twitterTags) {
            // 기본 필수 태그 확인
            this.requiredTags.forEach(tag => {
                if (!twitterTags[tag] || twitterTags[tag].trim() === '') {
                    this.results.issues.push({
                        id: `missing_${tag.replace(':', '_')}`,
                        type: 'missing',
                        tag: tag,
                        severity: 'critical',
                        description: `필수 Twitter Card 태그 '${tag}'가 없습니다.`,
                        solution: `<meta name="${tag}" content="적절한 내용">을 head 섹션에 추가하세요.`
                    });
                }
            });
            
            // 카드 타입별 필수 태그 확인
            if (this.results.cardType && this.cardTypeRequiredTags[this.results.cardType]) {
                const typeRequiredTags = this.cardTypeRequiredTags[this.results.cardType];
                
                typeRequiredTags.forEach(tag => {
                    if (!twitterTags[tag] || twitterTags[tag].trim() === '') {
                        // Open Graph 태그로 대체 가능한지 확인
                        const ogEquivalent = this.getOgEquivalent(tag);
                        if (ogEquivalent && this.ogTags[ogEquivalent]) {
                            this.results.fallbackToOG = true;
                            this.results.issues.push({
                                id: `missing_${tag.replace(':', '_')}`,
                                type: 'missing',
                                tag: tag,
                                severity: 'minor',
                                description: `'${tag}' 태그가 없지만 Open Graph 태그 '${ogEquivalent}'로 대체됩니다.`,
                                solution: `최적의 결과를 위해 <meta name="${tag}" content="적절한 내용">을 추가하세요.`
                            });
                        } else {
                            this.results.issues.push({
                                id: `missing_${tag.replace(':', '_')}`,
                                type: 'missing',
                                tag: tag,
                                severity: 'major',
                                description: `'${this.results.cardType}' 카드 타입에 필요한 '${tag}' 태그가 없습니다.`,
                                solution: `<meta name="${tag}" content="적절한 내용">을 head 섹션에 추가하세요.`
                            });
                        }
                    }
                });
            }
        }
        
        /**
         * 태그 내용 검증
         * @param {Object} twitterTags - 추출된 Twitter Card 태그
         */
        validateTagContents(twitterTags) {
            // 제목 길이 검증
            if (twitterTags['twitter:title']) {
                const titleLength = twitterTags['twitter:title'].length;
                const maxLength = this.recommendedLength['twitter:title'].max;
                
                if (titleLength > maxLength) {
                    this.results.issues.push({
                        id: 'long_title',
                        type: 'content',
                        tag: 'twitter:title',
                        severity: 'minor',
                        description: `'twitter:title'이 너무 깁니다 (${titleLength}자). 최대 ${maxLength}자 이하가 권장됩니다.`,
                        solution: '주요 키워드를 유지하면서 제목을 줄이세요.'
                    });
                }
            }
            
            // 설명 길이 검증
            if (twitterTags['twitter:description']) {
                const descLength = twitterTags['twitter:description'].length;
                const maxLength = this.recommendedLength['twitter:description'].max;
                
                if (descLength > maxLength) {
                    this.results.issues.push({
                        id: 'long_description',
                        type: 'content',
                        tag: 'twitter:description',
                        severity: 'minor',
                        description: `'twitter:description'이 너무 깁니다 (${descLength}자). 최대 ${maxLength}자 이하가 권장됩니다.`,
                        solution: '주요 내용을 유지하면서 설명을 줄이세요.'
                    });
                }
            }
            
            // 사이트 및 생성자 검증
            if (!twitterTags['twitter:site'] && !twitterTags['twitter:creator']) {
                this.results.issues.push({
                    id: 'missing_site_creator',
                    type: 'missing',
                    tag: 'twitter:site',
                    severity: 'minor',
                    description: "'twitter:site' 또는 'twitter:creator' 태그가 없습니다.",
                    solution: '@username 형식의 트위터 계정을 포함하는 twitter:site 또는 twitter:creator 태그를 추가하세요.'
                });
            } else {
                // @username 형식 검증
                if (twitterTags['twitter:site'] && !twitterTags['twitter:site'].startsWith('@')) {
                    this.results.issues.push({
                        id: 'invalid_site_format',
                        type: 'content',
                        tag: 'twitter:site',
                        severity: 'minor',
                        description: "'twitter:site' 값이 '@' 로 시작하지 않습니다.",
                        solution: '@username 형식으로 설정하세요.'
                    });
                }
                
                if (twitterTags['twitter:creator'] && !twitterTags['twitter:creator'].startsWith('@')) {
                    this.results.issues.push({
                        id: 'invalid_creator_format',
                        type: 'content',
                        tag: 'twitter:creator',
                        severity: 'minor',
                        description: "'twitter:creator' 값이 '@' 로 시작하지 않습니다.",
                        solution: '@username 형식으로 설정하세요.'
                    });
                }
            }
            
            // player 카드 검증
            if (this.results.cardType === 'player' && twitterTags['twitter:player']) {
                try {
                    const playerUrl = new URL(twitterTags['twitter:player']);
                    if (playerUrl.protocol !== 'https:') {
                        this.results.issues.push({
                            id: 'player_not_https',
                            type: 'content',
                            tag: 'twitter:player',
                            severity: 'major',
                            description: "Player URL은 HTTPS 프로토콜을 사용해야 합니다.",
                            solution: 'player URL을 HTTPS로 변경하세요.'
                        });
                    }
                } catch (e) {
                    this.results.issues.push({
                        id: 'invalid_player_url',
                        type: 'content',
                        tag: 'twitter:player',
                        severity: 'major',
                        description: "유효하지 않은 player URL입니다.",
                        solution: '유효한 HTTPS URL을 사용하세요.'
                    });
                }
                
                // player 크기 검증
                if (!twitterTags['twitter:player:width'] || !twitterTags['twitter:player:height']) {
                    this.results.issues.push({
                        id: 'missing_player_dimensions',
                        type: 'missing',
                        tag: 'twitter:player',
                        severity: 'major',
                        description: "Player 카드에 필요한 너비 또는 높이 태그가 없습니다.",
                        solution: 'twitter:player:width와 twitter:player:height 태그를 추가하세요.'
                    });
                }
            }
        }
        
        /**
         * Open Graph 태그 대체 검증
         * @param {Object} twitterTags - 추출된 Twitter Card 태그
         */
        checkOgFallback(twitterTags) {
            // Twitter 태그가 거의 없고 Open Graph 태그가 있는 경우 확인
            if (Object.keys(twitterTags).length <= 1 && Object.keys(this.ogTags).length >= 3) {
                this.results.fallbackToOG = true;
                
                const missingTwitterTags = [];
                
                // 카드 타입에 따른 필수 Twitter 태그 확인
                if (this.results.cardType && this.cardTypeRequiredTags[this.results.cardType]) {
                    this.cardTypeRequiredTags[this.results.cardType].forEach(tag => {
                        if (!twitterTags[tag]) {
                            const ogEquivalent = this.getOgEquivalent(tag);
                            if (ogEquivalent && this.ogTags[ogEquivalent]) {
                                missingTwitterTags.push({ tag, ogEquivalent });
                            }
                        }
                    });
                }
                
                if (missingTwitterTags.length > 0) {
                    this.results.issues.push({
                        id: 'relying_on_og_fallback',
                        type: 'fallback',
                        tag: 'twitter:card',
                        severity: 'minor',
                        description: "Open Graph 태그에 의존하고 있습니다. Twitter는 이를 지원하지만, 전용 Twitter Card 태그가 권장됩니다.",
                        solution: '최적의 결과를 위해 전용 Twitter Card 태그를 추가하세요.'
                    });
                }
            }
        }
        
        /**
         * Twitter 태그에 해당하는 Open Graph 태그 반환
         * @param {string} twitterTag - Twitter 태그
         * @return {string} 해당하는 Open Graph 태그
         */
        getOgEquivalent(twitterTag) {
            const mapping = {
                'twitter:title': 'og:title',
                'twitter:description': 'og:description',
                'twitter:image': 'og:image',
                'twitter:url': 'og:url'
            };
            
            return mapping[twitterTag];
        }
        
        /**
         * 이미지 검증
         * @param {string} imageUrl - 이미지 URL
         * @param {string} cardType - 카드 타입
         */
        validateImage(imageUrl, cardType) {
            // URL 형식 검증
            try {
                new URL(imageUrl);
            } catch (e) {
                this.results.issues.push({
                    id: 'invalid_image_url',
                    type: 'content',
                    tag: 'twitter:image',
                    severity: 'major',
                    description: `'twitter:image' URL이 유효하지 않습니다.`,
                    solution: '유효한 전체 URL(프로토콜 포함)을 사용하세요.'
                });
                return;
            }
            
            // 이미지 크기 태그 확인
            const hasImageWidth = !!this.results.tags['twitter:image:width'];
            const hasImageHeight = !!this.results.tags['twitter:image:height'];
            
            if (!hasImageWidth || !hasImageHeight) {
                // 중요한 이슈는 아니지만 권장
                this.results.issues.push({
                    id: 'missing_image_dimensions',
                    type: 'missing',
                    tag: 'twitter:image',
                    severity: 'info',
                    description: '이미지 크기 태그가 지정되지 않았습니다.',
                    solution: '최적의 이미지 로딩을 위해 twitter:image:width 및 twitter:image:height 태그를 추가하세요.'
                });
            } else {
                // 카드 타입별 이미지 크기 검증
                if (cardType && this.recommendedImageSize[cardType]) {
                    const width = parseInt(this.results.tags['twitter:image:width']);
                    const height = parseInt(this.results.tags['twitter:image:height']);
                    const recommended = this.recommendedImageSize[cardType];
                    
                    if (!isNaN(width) && !isNaN(height)) {
                        // 크기 및 비율 검증
                        const actualRatio = width / height;
                        const targetRatio = recommended.aspectRatio;
                        
                        if (Math.abs(actualRatio - targetRatio) > 0.1) {
                            this.results.issues.push({
                                id: 'suboptimal_image_ratio',
                                type: 'content',
                                tag: 'twitter:image',
                                severity: 'minor',
                                description: `이미지 비율(${actualRatio.toFixed(2)})이 권장 비율(${targetRatio})과 다릅니다.`,
                                solution: `${cardType} 카드 타입에 최적화된 이미지 비율을 사용하세요.`
                            });
                        }
                        
                        if (cardType === 'summary' && (width < 144 || height < 144)) {
                            this.results.issues.push({
                                id: 'image_too_small',
                                type: 'content',
                                tag: 'twitter:image',
                                severity: 'minor',
                                description: 'summary 카드 이미지가 최소 권장 크기(144x144px)보다 작습니다.',
                                solution: '최소 144x144 크기의 이미지를 사용하세요.'
                            });
                        } else if (cardType === 'summary_large_image' && (width < recommended.width || height < recommended.height)) {
                            this.results.issues.push({
                                id: 'large_image_too_small',
                                type: 'content',
                                tag: 'twitter:image',
                                severity: 'minor',
                                description: `summary_large_image 카드 이미지가 권장 크기(${recommended.width}x${recommended.height}px)보다 작습니다.`,
                                solution: `최소 ${recommended.width}x${recommended.height} 크기의 이미지를 사용하세요.`
                            });
                        }
                    }
                }
            }
            
            // 이미지 대체 텍스트 확인
            if (!this.results.tags['twitter:image:alt']) {
                this.results.issues.push({
                    id: 'missing_image_alt',
                    type: 'missing',
                    tag: 'twitter:image',
                    severity: 'minor',
                    description: `'twitter:image:alt' 태그가 없습니다.`,
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
                'critical': 30,
                'major': 15,
                'minor': 5,
                'info': 0
            };
            
            // 이슈에 따른 감점
            this.results.issues.forEach(issue => {
                score -= penalties[issue.severity] || 0;
            });
            
            // 카드 타입 있을 경우 기본 점수 부여
            if (this.results.cardType) {
                score += 10;
            }
            
            // Open Graph로 대체될 경우 약간 감점
            if (this.results.fallbackToOG) {
                score -= 10;
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
            if (Object.keys(this.results.tags).length === 0) {
                this.results.recommendations.push({
                    id: 'add_basic_twitter_tags',
                    priority: 'high',
                    description: '기본 Twitter Card 태그를 추가하여 Twitter에서의 콘텐츠 공유를 최적화하세요.'
                });
            }
            
            // 카드 타입별 권장사항
            if (this.results.cardType) {
                switch (this.results.cardType) {
                    case 'summary':
                        if (!this.results.issues.some(issue => issue.id.includes('image_too_small'))) {
                            this.results.recommendations.push({
                                id: 'upgrade_to_large_image',
                                priority: 'low',
                                description: '더 큰 이미지 미리보기를 위해 summary_large_image 카드 타입 사용을 고려하세요.'
                            });
                        }
                        break;
                        
                    case 'summary_large_image':
                        // 이미 최적의 카드 타입
                        break;
                        
                    case 'player':
                        if (!this.results.tags['twitter:player:stream']) {
                            this.results.recommendations.push({
                                id: 'add_player_stream',
                                priority: 'medium',
                                description: '동영상 플레이어 카드에 twitter:player:stream 태그를 추가하여 비디오 콘텐츠 미리보기를 제공하세요.'
                            });
                        }
                        break;
                }
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
                score: 65,
                cardType: 'summary',
                fallbackToOG: true,
                tags: {
                    'twitter:card': 'summary'
                },
                issues: [
                    {
                        id: 'missing_twitter_title',
                        type: 'missing',
                        tag: 'twitter:title',
                        severity: 'minor',
                        description: "'twitter:title' 태그가 없지만 Open Graph 태그 'og:title'로 대체됩니다.",
                        solution: "최적의 결과를 위해 <meta name=\"twitter:title\" content=\"적절한 내용\">을 추가하세요."
                    },
                    {
                        id: 'missing_twitter_description',
                        type: 'missing',
                        tag: 'twitter:description',
                        severity: 'minor',
                        description: "'twitter:description' 태그가 없지만 Open Graph 태그 'og:description'로 대체됩니다.",
                        solution: "최적의 결과를 위해 <meta name=\"twitter:description\" content=\"적절한 내용\">을 추가하세요."
                    },
                    {
                        id: 'missing_site_creator',
                        type: 'missing',
                        tag: 'twitter:site',
                        severity: 'minor',
                        description: "'twitter:site' 또는 'twitter:creator' 태그가 없습니다.",
                        solution: '@username 형식의 트위터 계정을 포함하는 twitter:site 또는 twitter:creator 태그를 추가하세요.'
                    }
                ],
                recommendations: [
                    {
                        id: 'missing_twitter_title_recommendation',
                        priority: 'medium',
                        description: "최적의 결과를 위해 <meta name=\"twitter:title\" content=\"적절한 내용\">을 추가하세요."
                    },
                    {
                        id: 'missing_twitter_description_recommendation',
                        priority: 'medium',
                        description: "최적의 결과를 위해 <meta name=\"twitter:description\" content=\"적절한 내용\">을 추가하세요."
                    },
                    {
                        id: 'missing_site_creator_recommendation',
                        priority: 'medium',
                        description: '@username 형식의 트위터 계정을 포함하는 twitter:site 또는 twitter:creator 태그를 추가하세요.'
                    },
                    {
                        id: 'upgrade_to_large_image',
                        priority: 'low',
                        description: '더 큰 이미지 미리보기를 위해 summary_large_image 카드 타입 사용을 고려하세요.'
                    }
                ]
            };
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.social.twitterCards = {
        /**
         * Twitter Cards 태그 분석 실행
         * @param {Document} [doc] - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 분석 결과
         */
        analyze: function(doc) {
            doc = doc || document;
            
            const analyzer = new TwitterCardsAnalyzer(doc);
            return analyzer.analyze();
        },
        
        /**
         * 모의 분석 실행 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock: function() {
            const analyzer = new TwitterCardsAnalyzer(document);
            return analyzer.analyzeMock();
        }
    };
    
    logger.debug('Twitter Cards 태그 분석 모듈 초기화 완료');
})();