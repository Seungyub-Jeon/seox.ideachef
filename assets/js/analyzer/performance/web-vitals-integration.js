/**
 * Core Web Vitals 성능 모듈 통합
 * 
 * 기존 성능 모듈과 Core Web Vitals 분석을 통합하여 보다 포괄적인 성능 분석 결과를 제공합니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        console.error('KoreanWebAnalyzer 네임스페이스가 존재하지 않습니다.');
        return;
    }
    
    if (!window.KoreanWebAnalyzer.analyzer || !window.KoreanWebAnalyzer.analyzer.performance) {
        console.error('성능 분석 모듈이 초기화되지 않았습니다.');
        return;
    }
    
    // 로거 참조
    const logger = window.KoreanWebAnalyzer.logger || console;
    
    // Web Vitals 모듈 확인
    if (!window.KoreanWebAnalyzer.analyzer.webVitals) {
        logger.warn('Core Web Vitals 모듈이 로드되지 않았습니다. 통합을 건너뜁니다.');
        return;
    }
    
    /**
     * Core Web Vitals 결과를 UI에 표시하기 위한 유틸리티
     */
    const WebVitalsUI = {
        /**
         * Core Web Vitals 결과를 UI 요소로 변환
         * @param {Object} webVitalsResults - Core Web Vitals 분석 결과
         * @return {HTMLElement} UI 요소
         */
        createResultsElement(webVitalsResults) {
            if (!webVitalsResults) return null;
            
            const container = document.createElement('div');
            container.className = 'web-vitals-results';
            
            // 제목 추가
            const title = document.createElement('h3');
            title.textContent = 'Core Web Vitals 분석';
            container.appendChild(title);
            
            // 점수 표시
            const scoreElement = document.createElement('div');
            scoreElement.className = 'web-vitals-score';
            const score = webVitalsResults.overall?.score || 0;
            let scoreClass = 'poor';
            
            if (score >= 90) {
                scoreClass = 'good';
            } else if (score >= 50) {
                scoreClass = 'needs-improvement';
            }
            
            scoreElement.innerHTML = `
                <div class="score-value ${scoreClass}">${score}</div>
                <div class="score-label">Core Web Vitals 점수</div>
            `;
            container.appendChild(scoreElement);
            
            // 메트릭 정보 표시
            const metricsContainer = document.createElement('div');
            metricsContainer.className = 'web-vitals-metrics';
            
            // LCP 메트릭
            if (webVitalsResults.lcp) {
                const lcpElement = this.createMetricElement(
                    'LCP',
                    webVitalsResults.lcp.displayValue,
                    webVitalsResults.lcp.score,
                    '페이지에서 가장 큰 콘텐츠가 표시되는 시간'
                );
                metricsContainer.appendChild(lcpElement);
            }
            
            // FID 메트릭
            if (webVitalsResults.fid) {
                const fidElement = this.createMetricElement(
                    'FID',
                    webVitalsResults.fid.displayValue,
                    webVitalsResults.fid.score,
                    '사용자 입력에 페이지가 응답하는 데 걸리는 시간'
                );
                metricsContainer.appendChild(fidElement);
            }
            
            // CLS 메트릭
            if (webVitalsResults.cls) {
                const clsElement = this.createMetricElement(
                    'CLS',
                    webVitalsResults.cls.displayValue,
                    webVitalsResults.cls.score,
                    '페이지 로딩 중 레이아웃 이동 정도'
                );
                metricsContainer.appendChild(clsElement);
            }
            
            container.appendChild(metricsContainer);
            
            // 추천사항 표시
            if (webVitalsResults.overall && webVitalsResults.overall.recommendations) {
                const recommendationsElement = this.createRecommendationsElement(
                    webVitalsResults.overall.recommendations
                );
                container.appendChild(recommendationsElement);
            }
            
            return container;
        },
        
        /**
         * 메트릭 UI 요소 생성
         * @param {string} name - 메트릭 이름
         * @param {string} value - 메트릭 값
         * @param {number} score - 메트릭 점수 (0-100)
         * @param {string} description - 메트릭 설명
         * @return {HTMLElement} 메트릭 UI 요소
         */
        createMetricElement(name, value, score, description) {
            const metricElement = document.createElement('div');
            metricElement.className = 'metric-item';
            
            let scoreClass = 'poor';
            if (score >= 90) {
                scoreClass = 'good';
            } else if (score >= 50) {
                scoreClass = 'needs-improvement';
            }
            
            metricElement.innerHTML = `
                <div class="metric-header">
                    <span class="metric-name">${name}</span>
                    <span class="metric-value ${scoreClass}">${value}</span>
                </div>
                <div class="metric-description">${description}</div>
            `;
            
            return metricElement;
        },
        
        /**
         * 추천사항 UI 요소 생성
         * @param {Array} recommendations - 추천사항 목록
         * @return {HTMLElement} 추천사항 UI 요소
         */
        createRecommendationsElement(recommendations) {
            const recommendationsElement = document.createElement('div');
            recommendationsElement.className = 'web-vitals-recommendations';
            
            const title = document.createElement('h4');
            title.textContent = '개선 권장사항';
            recommendationsElement.appendChild(title);
            
            if (!recommendations || recommendations.length === 0) {
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = '개선 권장사항이 없습니다.';
                recommendationsElement.appendChild(emptyMessage);
                return recommendationsElement;
            }
            
            const list = document.createElement('ul');
            
            for (const recommendation of recommendations) {
                const item = document.createElement('li');
                
                // 우선순위 마커 추가
                const priorityMarker = document.createElement('span');
                priorityMarker.className = `priority-marker ${recommendation.priority || 'medium'}`;
                item.appendChild(priorityMarker);
                
                // 추천사항 제목 및 설명
                const content = document.createElement('div');
                content.className = 'recommendation-content';
                
                const recTitle = document.createElement('div');
                recTitle.className = 'recommendation-title';
                recTitle.textContent = recommendation.title;
                content.appendChild(recTitle);
                
                const recDesc = document.createElement('div');
                recDesc.className = 'recommendation-description';
                recDesc.textContent = recommendation.description;
                content.appendChild(recDesc);
                
                // 코드 예제가 있는 경우 추가
                if (recommendation.code) {
                    const codeExample = document.createElement('pre');
                    codeExample.className = 'code-example';
                    codeExample.textContent = recommendation.code;
                    content.appendChild(codeExample);
                }
                
                item.appendChild(content);
                list.appendChild(item);
            }
            
            recommendationsElement.appendChild(list);
            return recommendationsElement;
        }
    };
    
    // 기존 UI 렌더러에 Web Vitals UI 렌더러 통합
    if (window.KoreanWebAnalyzer.ui && window.KoreanWebAnalyzer.ui.performance) {
        const originalRenderResults = window.KoreanWebAnalyzer.ui.performance.renderResults;
        
        // UI 렌더러 확장
        window.KoreanWebAnalyzer.ui.performance.renderResults = function(container, results) {
            // 기존 성능 결과 렌더링
            originalRenderResults(container, results);
            
            // Core Web Vitals 결과가 있으면 추가 렌더링
            if (results.details && results.details.webVitals) {
                const webVitalsElement = WebVitalsUI.createResultsElement(results.details.webVitals);
                
                if (webVitalsElement) {
                    const webVitalsContainer = document.createElement('div');
                    webVitalsContainer.className = 'performance-section web-vitals-section';
                    webVitalsContainer.appendChild(webVitalsElement);
                    
                    // 컨테이너에 Web Vitals 섹션 추가
                    container.appendChild(webVitalsContainer);
                }
            }
        };
    }
    
    logger.debug('Core Web Vitals 성능 모듈 통합 완료');
})();