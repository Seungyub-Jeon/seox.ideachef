/**
 * 한국어 웹사이트 분석기
 * Core Web Vitals 추천 엔진
 * 
 * Core Web Vitals 이슈에 대한 최적화 추천사항을 생성하는 모듈입니다.
 */

(function() {
    // 네임스페이스 확인
    if (!window.KoreanWebAnalyzer) {
        window.KoreanWebAnalyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer) {
        window.KoreanWebAnalyzer.analyzer = {};
    }
    
    if (!window.KoreanWebAnalyzer.analyzer.webVitals) {
        window.KoreanWebAnalyzer.analyzer.webVitals = {};
    }
    
    /**
     * Core Web Vitals 추천 엔진 클래스
     */
    class RecommendationEngine {
        constructor(metricsCollector, elementAnalyzer) {
            this.metricsCollector = metricsCollector;
            this.elementAnalyzer = elementAnalyzer;
            this.recommendations = {
                lcp: [],
                fid: [],
                cls: [],
                general: []
            };
        }
        
        /**
         * 추천사항 생성
         * @param {Object} metrics - Core Web Vitals 메트릭 객체
         * @param {Object} elementAnalysis - 요소 분석 결과 객체
         * @return {Object} 추천사항 목록
         */
        generateRecommendations(metrics, elementAnalysis) {
            this.metrics = metrics;
            this.elementAnalysis = elementAnalysis;
            
            // 각 메트릭별 추천사항 생성
            this._generateLCPRecommendations();
            this._generateFIDRecommendations();
            this._generateCLSRecommendations();
            
            // 일반적인 추천사항 생성
            this._generateGeneralRecommendations();
            
            return this.recommendations;
        }
        
        /**
         * LCP 추천사항 생성
         */
        _generateLCPRecommendations() {
            if (!this.metrics || !this.metrics.lcp) return;
            
            const lcp = this.metrics.lcp;
            const lcpAnalysis = this.elementAnalysis.lcp;
            
            // LCP 점수에 따른 일반적인 추천사항
            if (lcp.score === 'poor' || lcp.score === 'needs-improvement') {
                this.recommendations.lcp.push({
                    title: 'LCP 성능 개선 필요',
                    description: `현재 LCP 값은 ${Math.round(lcp.value)}ms로, ${lcp.score === 'poor' ? '매우 느린' : '개선이 필요한'} 수준입니다. LCP는 2.5초 이하가 좋은 수준입니다.`,
                    priority: lcp.score === 'poor' ? 'high' : 'medium',
                    effort: 'medium'
                });
            }
            
            // 이슈별 추천사항 생성
            if (lcpAnalysis && lcpAnalysis.issues) {
                lcpAnalysis.issues.forEach(issue => {
                    const recommendation = this._getLCPRecommendationForIssue(issue);
                    if (recommendation) {
                        this.recommendations.lcp.push(recommendation);
                    }
                });
            }
            
            // LCP 요소 식별 기반 추천사항
            if (lcp.element) {
                const tagName = lcp.element.tagName.toLowerCase();
                
                // 이미지 최적화 추천사항
                if (tagName === 'img') {
                    this._addLCPImageRecommendations(lcp.element);
                } 
                // 비디오 최적화 추천사항
                else if (tagName === 'video') {
                    this._addLCPVideoRecommendations(lcp.element);
                } 
                // 텍스트 관련 최적화 추천사항
                else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'].includes(tagName)) {
                    this._addLCPTextRecommendations(lcp.element);
                }
            }
        }
        
        /**
         * LCP 이슈에 대한 추천사항 가져오기
         * @param {Object} issue - LCP 이슈 객체
         * @return {Object|null} 추천사항 객체
         */
        _getLCPRecommendationForIssue(issue) {
            switch (issue.type) {
                case 'no-dimensions':
                    return {
                        title: '이미지 크기 지정하기',
                        description: '이미지 요소에 width와 height 속성을 명시적으로 설정하세요. 이는 이미지 로드 중 레이아웃 변화를 방지합니다.',
                        code: `<img src="image.jpg" width="800" height="600" alt="설명" />`,
                        priority: 'high',
                        effort: 'low'
                    };
                    
                case 'oversized-image':
                    return {
                        title: '이미지 크기 최적화',
                        description: '표시 크기에 맞게 이미지 크기를 조정하세요. 불필요하게 큰 이미지는 다운로드 시간을 늘립니다.',
                        code: '적절한 크기의 이미지를 생성하여 제공하거나, srcset 속성을 사용하여 여러 크기의 이미지를 제공하세요.',
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'not-next-gen-format':
                    return {
                        title: '최신 이미지 형식 사용',
                        description: 'WebP, AVIF와 같은 최신 이미지 형식을 사용하면 더 나은 압축률로 로딩 시간을 단축할 수 있습니다.',
                        code: `<picture>
  <source type="image/avif" srcset="image.avif" />
  <source type="image/webp" srcset="image.webp" />
  <img src="image.jpg" alt="설명" width="800" height="600" />
</picture>`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'no-lazy-loading':
                    return {
                        title: '뷰포트 바깥 이미지 지연 로딩 적용',
                        description: '뷰포트에 보이지 않는 이미지에 지연 로딩을 적용하여 초기 로딩 시간을 개선하세요.',
                        code: `<img src="image.jpg" loading="lazy" alt="설명" width="800" height="600" />`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'no-srcset':
                    return {
                        title: '반응형 이미지 적용',
                        description: 'srcset과 sizes 속성을 사용하여 다양한 화면 크기에 최적화된 이미지를 제공하세요.',
                        code: `<img src="image-800w.jpg" 
     srcset="image-400w.jpg 400w, image-800w.jpg 800w, image-1200w.jpg 1200w"
     sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
     alt="설명" width="800" height="600" />`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'low-priority':
                    return {
                        title: 'LCP 이미지에 우선순위 설정',
                        description: 'LCP를 구성하는 중요 이미지에 fetchpriority="high" 속성을 적용하여 로딩 우선순위를 높이세요.',
                        code: `<img src="hero-image.jpg" fetchpriority="high" alt="설명" width="800" height="600" />`,
                        priority: 'high',
                        effort: 'low'
                    };
                    
                case 'no-poster':
                    return {
                        title: '비디오에 포스터 이미지 추가',
                        description: '비디오 요소에 포스터 이미지를 추가하여 비디오 로딩 중에도 시각적 콘텐츠를 제공하세요.',
                        code: `<video poster="video-poster.jpg" src="video.mp4" controls></video>`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'no-preload':
                    return {
                        title: '비디오 프리로드 설정',
                        description: '비디오 요소에 preload="metadata" 또는 preload="auto"를 설정하여 로딩 성능을 최적화하세요.',
                        code: `<video preload="metadata" src="video.mp4" controls></video>`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'no-font-display':
                case 'missing-font-display':
                    return {
                        title: '웹폰트에 font-display 설정',
                        description: '웹폰트에 font-display: swap 속성을 적용하여 폰트 로딩 중에도 텍스트가 표시되도록 하세요.',
                        code: `@font-face {
  font-family: 'CustomFont';
  src: url('custom-font.woff2') format('woff2');
  font-display: swap; /* 추가 */
}`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'hidden-text':
                    return {
                        title: '숨겨진 텍스트 요소 최적화',
                        description: '초기에 숨겨진 텍스트 요소로 인해 LCP가 지연될 수 있습니다. 불필요한 숨김 처리를 제거하세요.',
                        code: `/* 대신 CSS transition으로 부드럽게 표시하기 */
.element {
  opacity: 0;
  transition: opacity 0.3s;
}
.element.loaded {
  opacity: 1;
}`,
                        priority: 'high',
                        effort: 'medium'
                    };
                    
                case 'animated-text':
                    return {
                        title: '텍스트 애니메이션 최적화',
                        description: '텍스트 요소의 애니메이션을 최적화하여 렌더링 성능을 개선하세요.',
                        code: `/* transform과 opacity만 애니메이션하기 */
@keyframes optimized {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'missing-preconnect':
                    return {
                        title: '구글 폰트에 preconnect 적용',
                        description: '구글 폰트 사용 시 preconnect를 적용하여 연결 속도를 개선하세요.',
                        code: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'blocking-ancestor':
                    return {
                        title: '상위 요소 렌더링 차단 제거',
                        description: 'LCP 요소의 상위 요소가 렌더링을 차단하고 있습니다. display, visibility, opacity 속성을 확인하세요.',
                        code: `/* 대신 CSS transition으로 부드럽게 표시하기 */
.parent {
  opacity: 0;
  transition: opacity 0.3s;
}
.parent.loaded {
  opacity: 1;
}`,
                        priority: 'high',
                        effort: 'medium'
                    };
                    
                default:
                    return null;
            }
        }
        
        /**
         * LCP 이미지 요소에 대한 추천사항 추가
         * @param {Element} imgElement - LCP 이미지 요소
         */
        _addLCPImageRecommendations(imgElement) {
            // 이미지 프리로드 추천
            this.recommendations.lcp.push({
                title: '중요 이미지 프리로드',
                description: 'LCP 이미지를 프리로드하여 더 빠르게 로드되도록 하세요.',
                code: `<link rel="preload" href="${imgElement.src}" as="image" />`,
                priority: 'high',
                effort: 'low'
            });
            
            // 이미지 CDN 사용 추천
            this.recommendations.lcp.push({
                title: 'CDN 활용 및 이미지 최적화',
                description: '이미지 CDN을 사용하여 디바이스와 화면 크기에 맞게 최적화된 이미지를 제공하세요.',
                code: '이미지 CDN을 사용하면 자동으로 최적화된 형식(WebP, AVIF)으로 이미지를 제공하고, 적절한 크기로 리사이징할 수 있습니다.',
                priority: 'medium',
                effort: 'medium'
            });
            
            // 이미지 최적화 툴 사용 추천
            this.recommendations.lcp.push({
                title: '이미지 최적화 도구 사용',
                description: 'Imagemin, Squoosh 등의 도구를 사용하여 이미지를 최적화하세요.',
                code: 'npm install imagemin-cli\nimagemin images/* --out-dir=optimized',
                priority: 'medium',
                effort: 'medium'
            });
        }
        
        /**
         * LCP 비디오 요소에 대한 추천사항 추가
         * @param {Element} videoElement - LCP 비디오 요소
         */
        _addLCPVideoRecommendations(videoElement) {
            // 비디오 포스터 이미지 최적화 추천
            this.recommendations.lcp.push({
                title: '비디오 포스터 이미지 최적화',
                description: '비디오 포스터 이미지를 최적화하고 적절한 크기로 제공하세요.',
                code: `<video poster="optimized-poster.webp" src="video.mp4" controls></video>`,
                priority: 'high',
                effort: 'low'
            });
            
            // 비디오 대신 이미지 사용 검토 추천
            this.recommendations.lcp.push({
                title: '필요시 비디오 대신 이미지 사용 검토',
                description: '초기 로딩에는 비디오 대신 고품질 이미지를 사용하고, 사용자 상호작용 후 비디오를 로드하는 방식을 검토하세요.',
                code: `<div class="video-container">
  <img src="poster.webp" alt="비디오 썸네일" class="video-poster" onclick="loadVideo(this)" />
  <!-- 클릭시 비디오로 대체 -->
</div>`,
                priority: 'medium',
                effort: 'medium'
            });
        }
        
        /**
         * LCP 텍스트 요소에 대한 추천사항 추가
         * @param {Element} textElement - LCP 텍스트 요소
         */
        _addLCPTextRecommendations(textElement) {
            // 웹폰트 최적화 추천
            this.recommendations.lcp.push({
                title: '웹폰트 최적화',
                description: '웹폰트 로딩을 최적화하여 텍스트 표시 시간을 단축하세요.',
                code: `<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

@font-face {
  font-family: 'CustomFont';
  font-display: swap;
  src: url('font.woff2') format('woff2');
}`,
                priority: 'high',
                effort: 'medium'
            });
            
            // 시스템 폰트 대체 추천
            this.recommendations.lcp.push({
                title: '시스템 폰트 대체 사용',
                description: '가능하다면 시스템 폰트를 사용하여 폰트 로딩 시간을 제거하세요.',
                code: `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";`,
                priority: 'medium',
                effort: 'low'
            });
            
            // 텍스트 렌더링 최적화 추천
            this.recommendations.lcp.push({
                title: '텍스트 렌더링 최적화',
                description: '텍스트 렌더링을 최적화하여 LCP를 개선하세요.',
                code: `/* CSS 애니메이션 최적화 */
.text {
  will-change: transform, opacity;
  /* 주의: will-change는 필요한 경우에만 사용 */
}`,
                priority: 'medium',
                effort: 'medium'
            });
        }
        
        /**
         * FID 추천사항 생성
         */
        _generateFIDRecommendations() {
            if (!this.metrics || !this.metrics.fid) return;
            
            const fid = this.metrics.fid;
            const fidAnalysis = this.elementAnalysis.fid;
            
            // FID 점수에 따른 일반적인 추천사항
            if (fid.score === 'poor' || fid.score === 'needs-improvement') {
                this.recommendations.fid.push({
                    title: 'FID 성능 개선 필요',
                    description: `현재 FID 값은 ${Math.round(fid.value)}ms로, ${fid.score === 'poor' ? '매우 느린' : '개선이 필요한'} 수준입니다. FID는 100ms 이하가 좋은 수준입니다.`,
                    priority: fid.score === 'poor' ? 'high' : 'medium',
                    effort: 'medium'
                });
            }
            
            // 이슈별 추천사항 생성
            if (fidAnalysis && fidAnalysis.issues) {
                fidAnalysis.issues.forEach(issue => {
                    const recommendation = this._getFIDRecommendationForIssue(issue);
                    if (recommendation) {
                        this.recommendations.fid.push(recommendation);
                    }
                });
            }
            
            // 일반적인 FID 개선 추천사항
            this._addGeneralFIDRecommendations();
        }
        
        /**
         * FID 이슈에 대한 추천사항 가져오기
         * @param {Object} issue - FID 이슈 객체
         * @return {Object|null} 추천사항 객체
         */
        _getFIDRecommendationForIssue(issue) {
            switch (issue.type) {
                case 'blocking-script':
                    return {
                        title: '헤드의 렌더링 차단 스크립트 최적화',
                        description: '헤드에 있는 동기식 스크립트는 HTML 파싱을 차단합니다. async 또는 defer 속성을 사용하세요.',
                        code: `<script src="script.js" defer></script>
<script src="critical-script.js" async></script>`,
                        priority: 'high',
                        effort: 'low'
                    };
                    
                case 'large-inline-script':
                    return {
                        title: '큰 인라인 스크립트 최적화',
                        description: '큰 인라인 스크립트를 외부 파일로 분리하고 defer 속성을 사용하여 로드하세요.',
                        code: `<script src="separated-script.js" defer></script>`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'many-third-party-scripts':
                    return {
                        title: '서드파티 스크립트 최적화',
                        description: `${issue.elements ? issue.elements.length : '다수'}개의 서드파티 스크립트가 있습니다. 필요한 스크립트만 유지하고, 가능한 경우 지연 로딩을 적용하세요.`,
                        code: `<!-- 중요하지 않은 스크립트 지연 로딩 -->
<script>
  // 사용자 상호작용 후 스크립트 로드
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://third-party.com/script.js';
      document.body.appendChild(script);
    }, 3000);
  });
</script>`,
                        priority: 'high',
                        effort: 'high'
                    };
                    
                case 'inline-event-handler':
                case 'many-inline-handlers':
                    return {
                        title: '인라인 이벤트 핸들러 최적화',
                        description: '인라인 이벤트 핸들러 대신 addEventListener를 사용하여 스크립트를 분리하세요.',
                        code: `<!-- 변경 전 -->
<button onclick="doSomething()">버튼</button>

<!-- 변경 후 -->
<button id="myButton">버튼</button>
<script>
  document.getElementById('myButton').addEventListener('click', doSomething);
</script>`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'non-passive-listeners':
                    return {
                        title: '수동 이벤트 리스너 적용',
                        description: '스크롤 이벤트와 같은 이벤트에 passive: true 옵션을 적용하여 스크롤 성능을 개선하세요.',
                        code: `document.addEventListener('touchstart', handler, { passive: true });
document.addEventListener('wheel', handler, { passive: true });`,
                        priority: 'medium',
                        effort: 'low'
                    };
                    
                case 'render-blocking-stylesheet':
                    return {
                        title: '렌더링 차단 스타일시트 최적화',
                        description: '중요한 CSS는 인라인하고, 나머지는 비동기적으로 로드하세요.',
                        code: `<!-- 중요 CSS 인라인 -->
<style>
  /* 중요한 스타일만 여기에 */
</style>

<!-- 나머지 CSS 비동기 로드 -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>`,
                        priority: 'high',
                        effort: 'medium'
                    };
                    
                case 'excessive-css-rules':
                    return {
                        title: 'CSS 규칙 최적화',
                        description: '과도한 CSS 규칙은 파싱 시간을 증가시킵니다. CSS를 분할하고 필요한 규칙만 포함하세요.',
                        code: '불필요한 CSS 규칙을 제거하고, 핵심 스타일과 비핵심 스타일을 분리하세요. CSS 분석 도구를 사용하여 사용되지 않는 CSS를 식별할 수 있습니다.',
                        priority: 'medium',
                        effort: 'high'
                    };
                    
                default:
                    return null;
            }
        }
        
        /**
         * 일반적인 FID 개선 추천사항 추가
         */
        _addGeneralFIDRecommendations() {
            // 코드 분할 추천
            this.recommendations.fid.push({
                title: '코드 분할 적용',
                description: '대규모 JavaScript 번들을 작은 청크로 분할하여 초기 로드 시간을 단축하세요.',
                code: '현대적인 번들러(Webpack, Rollup, Parcel 등)를 사용하여 코드 분할을 구현하고, 필요한 경우에만 코드를 로드하세요.',
                priority: 'high',
                effort: 'high'
            });
            
            // 웹 워커 사용 추천
            this.recommendations.fid.push({
                title: '웹 워커 활용',
                description: '무거운 계산 작업을 웹 워커로 이동하여 메인 스레드의 부하를 줄이세요.',
                code: `// 웹 워커 생성
const worker = new Worker('worker.js');

// 작업 요청
worker.postMessage({ data: complexData });

// 결과 수신
worker.onmessage = function(e) {
  const result = e.data;
  // 결과 처리
};`,
                priority: 'high',
                effort: 'high'
            });
            
            // 서드파티 스크립트 최적화 추천
            this.recommendations.fid.push({
                title: '서드파티 스크립트 지연 로딩',
                description: '중요하지 않은 서드파티 스크립트(분석, 광고 등)를 지연 로딩하세요.',
                code: `// 지연 로딩 함수
function loadScript(src, async = true, defer = true) {
  const script = document.createElement('script');
  script.src = src;
  if (async) script.async = true;
  if (defer) script.defer = true;
  document.body.appendChild(script);
}

// 사용자 상호작용 후 로드
window.addEventListener('load', () => {
  setTimeout(() => {
    loadScript('https://analytics.example.com/script.js');
  }, 2000);
});`,
                priority: 'medium',
                effort: 'medium'
            });
        }
        
        /**
         * CLS 추천사항 생성
         */
        _generateCLSRecommendations() {
            if (!this.metrics || !this.metrics.cls) return;
            
            const cls = this.metrics.cls;
            const clsAnalysis = this.elementAnalysis.cls;
            
            // CLS 점수에 따른 일반적인 추천사항
            if (cls.score === 'poor' || cls.score === 'needs-improvement') {
                this.recommendations.cls.push({
                    title: 'CLS 성능 개선 필요',
                    description: `현재 CLS 값은 ${cls.value.toFixed(2)}로, ${cls.score === 'poor' ? '매우 높은' : '개선이 필요한'} 수준입니다. CLS는 0.1 이하가 좋은 수준입니다.`,
                    priority: cls.score === 'poor' ? 'high' : 'medium',
                    effort: 'medium'
                });
            }
            
            // 이슈별 추천사항 생성
            if (clsAnalysis && clsAnalysis.issues) {
                clsAnalysis.issues.forEach(issue => {
                    const recommendation = this._getCLSRecommendationForIssue(issue);
                    if (recommendation) {
                        this.recommendations.cls.push(recommendation);
                    }
                });
            }
            
            // 일반적인 CLS 개선 추천사항
            this._addGeneralCLSRecommendations();
        }
        
        /**
         * CLS 이슈에 대한 추천사항 가져오기
         * @param {Object} issue - CLS 이슈 객체
         * @return {Object|null} 추천사항 객체
         */
        _getCLSRecommendationForIssue(issue) {
            switch (issue.type) {
                case 'no-dimensions':
                case 'images-without-dimensions':
                    return {
                        title: '이미지에 크기 지정하기',
                        description: '모든 이미지에 width와 height 속성을 설정하여 레이아웃 변화를 방지하세요.',
                        code: `<img src="image.jpg" width="800" height="600" alt="설명" />`,
                        priority: 'high',
                        effort: 'medium'
                    };
                    
                case 'ad-or-dynamic-content':
                case 'ads-or-dynamic-content':
                    return {
                        title: '광고 및 동적 콘텐츠 최적화',
                        description: '광고나 동적으로 로드되는 콘텐츠를 위한 공간을 미리 확보하세요.',
                        code: `/* 광고 컨테이너에 최소 크기 지정 */
.ad-container {
  min-height: 250px;
  min-width: 300px;
}`,
                        priority: 'high',
                        effort: 'medium'
                    };
                    
                case 'font-cls':
                    return {
                        title: '폰트 로딩으로 인한 CLS 최적화',
                        description: '웹폰트에 font-display: swap을 적용하고, 가능한 경우 폰트를 프리로드하세요.',
                        code: `<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

@font-face {
  font-family: 'CustomFont';
  font-display: swap;
  src: url('font.woff2') format('woff2');
}`,
                        priority: 'high',
                        effort: 'low'
                    };
                    
                case 'animation-cls':
                    return {
                        title: '애니메이션으로 인한 CLS 최적화',
                        description: '레이아웃 변화가 없는 transform 애니메이션을 사용하세요.',
                        code: `/* 대신 transform 사용 */
@keyframes slide {
  from { transform: translateX(-100px); }
  to { transform: translateX(0); }
}

/* 이렇게 하지 마세요 */
@keyframes slide-bad {
  from { margin-left: -100px; }
  to { margin-left: 0; }
}`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'fouc':
                    return {
                        title: 'FOUC(Flash of Unstyled Content) 방지',
                        description: '스타일이 적용되기 전에 콘텐츠가 표시되어 레이아웃 변화가 발생할 수 있습니다.',
                        code: `/* 주요 스타일 인라인화 */
<style>
  /* 초기 레이아웃을 위한 중요 스타일 */
  body { visibility: visible; }
</style>

<!-- 나머지 스타일은 비동기 로드 -->`,
                        priority: 'medium',
                        effort: 'medium'
                    };
                    
                case 'scrollbar-cls':
                    return {
                        title: '스크롤바로 인한 레이아웃 변화 방지',
                        description: 'scrollbar-gutter 속성을 사용하여 스크롤바 등장 시 레이아웃 변화를 방지하세요.',
                        code: `/* 최신 브라우저에서 지원 */
body {
  scrollbar-gutter: stable;
}

/* 대체 방법 */
html {
  overflow-y: scroll;
}`,
                        priority: 'low',
                        effort: 'low'
                    };
                    
                default:
                    return null;
            }
        }
        
        /**
         * 일반적인 CLS 개선 추천사항 추가
         */
        _addGeneralCLSRecommendations() {
            // 콘텐츠 크기 지정 추천
            this.recommendations.cls.push({
                title: '콘텐츠 크기 미리 지정',
                description: '동적 콘텐츠에 대해 미리 공간을 할당하여 레이아웃 변화를 방지하세요.',
                code: `/* 로딩 중 플레이스홀더 사용 */
.content-placeholder {
  min-height: 200px;
  background: #f0f0f0;
}`,
                priority: 'high',
                effort: 'medium'
            });
            
            // 애니메이션 최적화 추천
            this.recommendations.cls.push({
                title: '레이아웃 친화적 애니메이션 사용',
                description: 'opacity와 transform 속성만 애니메이션하여 레이아웃 재계산을 방지하세요.',
                code: `/* 좋은 예 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 나쁜 예 */
@keyframes badAnimation {
  from { height: 0; margin-top: 20px; }
  to { height: 100px; margin-top: 0; }
}`,
                priority: 'medium',
                effort: 'medium'
            });
            
            // 조건부 콘텐츠 로딩 최적화 추천
            this.recommendations.cls.push({
                title: '조건부 콘텐츠 로딩 최적화',
                description: '사용자 상호작용 이전에 필요한 콘텐츠만 로드하고, 나머지는 상호작용 후 로드하세요.',
                code: `// 초기 중요 콘텐츠 로드 후, 스크롤 또는 클릭 시 추가 콘텐츠 로드
document.addEventListener('DOMContentLoaded', () => {
  // 중요 콘텐츠만 초기에 표시
  loadInitialContent();
  
  // 사용자 상호작용 후 추가 콘텐츠 로드
  document.addEventListener('scroll', debounce(() => {
    loadAdditionalContent();
  }, 200));
});`,
                priority: 'medium',
                effort: 'high'
            });
        }
        
        /**
         * 일반적인 추천사항 생성
         */
        _generateGeneralRecommendations() {
            // 서버 응답 시간 개선 추천
            this.recommendations.general.push({
                title: '서버 응답 시간 개선',
                description: '서버 응답 시간은 Core Web Vitals에 간접적으로 영향을 미칩니다. 서버 사이드 캐싱, CDN 활용, 데이터베이스 최적화 등을 고려하세요.',
                priority: 'medium',
                effort: 'high'
            });
            
            // 캐싱 전략 추천
            this.recommendations.general.push({
                title: '효과적인 캐싱 전략 구현',
                description: '정적 자산에 대한 적절한 Cache-Control 헤더를 설정하여 재방문 시 로딩 성능을 개선하세요.',
                code: `
/* 서버 설정 예제 */
Cache-Control: max-age=31536000, immutable

/* 서비스 워커를 통한 캐싱 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});`,
                priority: 'medium',
                effort: 'medium'
            });
            
            // 리소스 우선순위 지정 추천
            this.recommendations.general.push({
                title: '리소스 우선순위 지정',
                description: '중요한 리소스에 우선순위를 부여하여 로딩 순서를 최적화하세요.',
                code: `<!-- 중요 CSS 프리로드 -->
<link rel="preload" href="critical.css" as="style">

<!-- 큰 이미지 프리로드 -->
<link rel="preload" href="hero.webp" as="image" imagesrcset="hero-400.webp 400w, hero-800.webp 800w" imagesizes="100vw">

<!-- 필요한 스크립트만 우선순위 지정 -->
<script src="critical.js" fetchpriority="high"></script>`,
                priority: 'high',
                effort: 'medium'
            });
            
            // 모바일 최적화 추천
            this.recommendations.general.push({
                title: '모바일 최적화',
                description: 'Core Web Vitals는 모바일에서 더 중요합니다. 모바일 기기의 성능 제약을 고려한 최적화가 필요합니다.',
                priority: 'high',
                effort: 'medium'
            });
        }
        
        /**
         * 추천사항에 우선순위 점수 부여
         * @param {Object} recommendations - 추천사항 목록
         * @return {Object} 점수가 부여된 추천사항 목록
         */
        _prioritizeRecommendations(recommendations) {
            const prioritizedRecommendations = { ...recommendations };
            
            // 각 섹션별 추천사항 우선순위 점수 부여
            for (const section in prioritizedRecommendations) {
                prioritizedRecommendations[section] = prioritizedRecommendations[section].map(rec => {
                    let priorityScore = 0;
                    
                    // 추천사항 우선순위에 따른 점수
                    switch (rec.priority) {
                        case 'high':
                            priorityScore += 3;
                            break;
                        case 'medium':
                            priorityScore += 2;
                            break;
                        case 'low':
                            priorityScore += 1;
                            break;
                    }
                    
                    // 구현 노력에 따른 점수 조정
                    if (rec.effort === 'low') {
                        priorityScore += 1;
                    } else if (rec.effort === 'high') {
                        priorityScore -= 1;
                    }
                    
                    return {
                        ...rec,
                        priorityScore
                    };
                });
                
                // 우선순위 점수에 따라 정렬
                prioritizedRecommendations[section].sort((a, b) => b.priorityScore - a.priorityScore);
            }
            
            return prioritizedRecommendations;
        }
        
        /**
         * 코드 스니펫이 존재하는 최상위 추천사항 추출
         * @param {Object} recommendations - 추천사항 목록
         * @param {number} count - 추출할 추천사항 수
         * @return {Array} 추출된 추천사항 배열
         */
        getTopRecommendations(recommendations = this.recommendations, count = 5) {
            const prioritized = this._prioritizeRecommendations(recommendations);
            const allRecommendations = [
                ...prioritized.lcp,
                ...prioritized.fid,
                ...prioritized.cls,
                ...prioritized.general
            ];
            
            // 코드 스니펫이 있는 추천사항 필터링
            const withCode = allRecommendations.filter(rec => rec.code);
            const withoutCode = allRecommendations.filter(rec => !rec.code);
            
            // 코드 스니펫이 있는 추천사항 우선 선택
            const topRecommendations = [
                ...withCode.slice(0, Math.min(count, withCode.length)),
                ...withoutCode.slice(0, Math.max(0, count - withCode.length))
            ].slice(0, count);
            
            return topRecommendations;
        }
    }
    
    // 애널라이저 등록
    window.KoreanWebAnalyzer.analyzer.webVitals.RecommendationEngine = RecommendationEngine;
})();