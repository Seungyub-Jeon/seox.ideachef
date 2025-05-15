/**
 * 소셜 미디어 최적화 분석 모듈
 * 
 * Open Graph, Twitter Cards 등 소셜 미디어 공유 최적화를 위한
 * 메타태그 및 기능을 분석하는 종합 모듈입니다.
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
     * 소셜 미디어 분석 클래스
     */
    class SocialMediaAnalyzer {
        /**
         * 생성자
         * @param {Document} document - 분석할 문서
         */
        constructor(document) {
            this.doc = document;
            this.results = {
                score: 0,
                summary: '',
                details: {},
                issues: [],
                recommendations: []
            };
            
            // 분석 컴포넌트 참조
            this.components = {
                openGraph: window.KoreanWebAnalyzer.analyzer.social.openGraph,
                twitterCards: window.KoreanWebAnalyzer.analyzer.social.twitterCards,
                imageVerification: window.KoreanWebAnalyzer.analyzer.social.imageVerification,
                sharingFunctionality: window.KoreanWebAnalyzer.analyzer.social.sharingFunctionality
            };
            
            // 컴포넌트 가중치 (전체 점수 계산용)
            this.weights = {
                openGraph: 0.35,          // Open Graph 점수 (35%)
                twitterCards: 0.25,       // Twitter Cards 점수 (25%)
                imageVerification: 0.2,   // 이미지 검증 점수 (20%)
                sharingFunctionality: 0.2 // 공유 기능 점수 (20%)
            };
        }
        
        /**
         * 소셜 미디어 최적화 분석 실행
         * @return {Object} 분석 결과
         */
        analyze() {
            logger.debug('소셜 미디어 최적화 분석 시작');
            
            // 각 컴포넌트 분석 실행
            const componentResults = this.runAnalysisComponents();
            
            // 컴포넌트 결과 저장
            this.results.details = componentResults;
            
            // 종합 점수 계산
            this.calculateOverallScore();
            
            // 이슈 통합
            this.aggregateIssues(componentResults);
            
            // 권장사항 통합
            this.aggregateRecommendations(componentResults);
            
            // 요약 생성
            this.generateSummary();
            
            logger.debug('소셜 미디어 최적화 분석 완료', { score: this.results.score });
            
            return this.results;
        }
        
        /**
         * 분석 컴포넌트 실행
         * @return {Object} 컴포넌트별 분석 결과
         */
        runAnalysisComponents() {
            const componentResults = {};
            
            // Open Graph 분석
            if (this.components.openGraph) {
                try {
                    logger.debug('Open Graph 분석 컴포넌트 실행');
                    componentResults.openGraph = this.components.openGraph.analyze(this.doc);
                    logger.debug('Open Graph 분석 완료', { score: componentResults.openGraph.score });
                } catch (error) {
                    logger.error('Open Graph 분석 중 오류 발생', error);
                    componentResults.openGraph = { score: 0, error: error.message };
                }
            }
            
            // 추후 다른 컴포넌트 추가 시 여기에 구현
            
            return componentResults;
        }
        
        /**
         * 종합 점수 계산
         */
        calculateOverallScore() {
            let weightedScore = 0;
            let totalWeight = 0;
            
            // 현재 구현된 컴포넌트만 포함
            const activeComponents = Object.keys(this.results.details);
            
            // 가중치 적용하여 점수 계산
            for (const component of activeComponents) {
                const weight = this.weights[component] || 0;
                const componentResult = this.results.details[component];
                
                if (componentResult && typeof componentResult.score === 'number') {
                    weightedScore += componentResult.score * weight;
                    totalWeight += weight;
                }
            }
            
            // 가중치 합계가 0이면 기본값 반환
            if (totalWeight === 0) {
                this.results.score = 0;
                return;
            }
            
            // 가중치로 나누어 최종 점수 계산
            this.results.score = Math.round(weightedScore / totalWeight);
        }
        
        /**
         * 컴포넌트별 이슈 통합
         * @param {Object} componentResults - 컴포넌트별 분석 결과
         */
        aggregateIssues(componentResults) {
            for (const [component, result] of Object.entries(componentResults)) {
                if (result && Array.isArray(result.issues)) {
                    // 컴포넌트 정보 추가하여 이슈 통합
                    result.issues.forEach(issue => {
                        const enhancedIssue = { ...issue, component };
                        this.results.issues.push(enhancedIssue);
                    });
                }
            }
            
            // 이슈 심각도에 따라 정렬
            this.sortIssuesByPriority();
        }
        
        /**
         * 컴포넌트별 권장사항 통합
         * @param {Object} componentResults - 컴포넌트별 분석 결과
         */
        aggregateRecommendations(componentResults) {
            for (const [component, result] of Object.entries(componentResults)) {
                if (result && Array.isArray(result.recommendations)) {
                    // 컴포넌트 정보 추가하여 권장사항 통합
                    result.recommendations.forEach(recommendation => {
                        const enhancedRecommendation = { ...recommendation, component };
                        this.results.recommendations.push(enhancedRecommendation);
                    });
                }
            }
            
            // 권장사항 우선순위에 따라 정렬
            this.sortRecommendationsByPriority();
        }
        
        /**
         * 이슈를 심각도에 따라 정렬
         */
        sortIssuesByPriority() {
            const severityOrder = {
                'critical': 4,
                'major': 3,
                'minor': 2,
                'info': 1
            };
            
            this.results.issues.sort((a, b) => {
                return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
            });
        }
        
        /**
         * 권장사항을 우선순위에 따라 정렬
         */
        sortRecommendationsByPriority() {
            const priorityOrder = {
                'high': 3,
                'medium': 2,
                'low': 1
            };
            
            this.results.recommendations.sort((a, b) => {
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            });
        }
        
        /**
         * 분석 요약 생성
         */
        generateSummary() {
            const score = this.results.score;
            
            // 점수 기반 요약 텍스트
            if (score >= 90) {
                this.results.summary = '소셜 미디어 최적화가 매우 잘 되어 있습니다. 몇 가지 미세한 개선으로 완벽해질 수 있습니다.';
            } else if (score >= 70) {
                this.results.summary = '소셜 미디어 최적화가 대체로 잘 되어 있으나, 일부 개선이 필요합니다.';
            } else if (score >= 40) {
                this.results.summary = '소셜 미디어 최적화에 중요한 부분이 누락되어 있습니다. 권장사항을 검토하고 개선하세요.';
            } else {
                this.results.summary = '소셜 미디어 최적화가 매우 부족합니다. 기본적인 메타 태그부터 구현해야 합니다.';
            }
            
            // 주요 이슈 수 추가
            const criticalCount = this.results.issues.filter(i => i.severity === 'critical').length;
            const majorCount = this.results.issues.filter(i => i.severity === 'major').length;
            
            if (criticalCount > 0 || majorCount > 0) {
                this.results.summary += ` 발견된 주요 이슈: ${criticalCount}개의 심각한 이슈, ${majorCount}개의 주요 이슈.`;
            }
        }
        
        /**
         * 모의 분석용 메서드 (테스트 목적)
         * @return {Object} 모의 분석 결과
         */
        analyzeMock() {
            // 컴포넌트 모의 분석 결과 수집
            const mockResults = {};
            
            // Open Graph 모의 분석
            if (this.components.openGraph) {
                mockResults.openGraph = this.components.openGraph.analyzeMock();
            }
            
            // 종합 결과 구성
            const result = {
                score: 65,
                summary: '소셜 미디어 최적화에 일부 개선이 필요합니다. 발견된 주요 이슈: 0개의 심각한 이슈, 2개의 주요 이슈.',
                details: mockResults,
                issues: [
                    {
                        id: 'missing_twitter_cards',
                        component: 'twitterCards',
                        type: 'missing',
                        tag: 'twitter:card',
                        severity: 'major',
                        description: '기본 Twitter Card 태그가 없습니다.',
                        solution: 'twitter:card, twitter:title, twitter:description, twitter:image 태그를 추가하세요.'
                    },
                    {
                        id: 'missing_image_dimensions',
                        component: 'openGraph',
                        type: 'missing',
                        tag: 'og:image',
                        severity: 'minor',
                        description: '\'og:image:width\' 및 \'og:image:height\' 태그가 없습니다.',
                        solution: '이미지 크기 태그를 추가하여 소셜 미디어 플랫폼의 이미지 로딩 성능을 향상시키세요.'
                    },
                    {
                        id: 'missing_image_alt',
                        component: 'openGraph',
                        type: 'missing',
                        tag: 'og:image',
                        severity: 'minor',
                        description: '\'og:image:alt\' 태그가 없습니다.',
                        solution: '접근성 향상을 위해 이미지 대체 텍스트를 추가하세요.'
                    }
                ],
                recommendations: [
                    {
                        id: 'add_twitter_cards_recommendation',
                        component: 'twitterCards',
                        priority: 'high',
                        description: 'Twitter Card 태그를 추가하여 Twitter에서의 콘텐츠 공유를 최적화하세요.'
                    },
                    {
                        id: 'missing_image_dimensions_recommendation',
                        component: 'openGraph',
                        priority: 'medium',
                        description: '이미지 크기 태그를 추가하여 소셜 미디어 플랫폼의 이미지 로딩 성능을 향상시키세요.'
                    },
                    {
                        id: 'missing_image_alt_recommendation',
                        component: 'openGraph',
                        priority: 'medium',
                        description: '접근성 향상을 위해 이미지 대체 텍스트를 추가하세요.'
                    }
                ]
            };
            
            return result;
        }
    }
    
    // 모듈 등록
    window.KoreanWebAnalyzer.analyzer.social.analyze = function(doc) {
        doc = doc || document;
        
        const analyzer = new SocialMediaAnalyzer(doc);
        return analyzer.analyze();
    };
    
    window.KoreanWebAnalyzer.analyzer.social.analyzeMock = function() {
        const analyzer = new SocialMediaAnalyzer(document);
        return analyzer.analyzeMock();
    };
    
    logger.debug('소셜 미디어 최적화 분석 모듈 초기화 완료');
})();