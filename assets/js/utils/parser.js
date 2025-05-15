/**
 * HTML 파싱 유틸리티
 * 
 * 페이지의 HTML 구조를 분석하고 필요한 요소를 추출하는 유틸리티 함수들
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
    
    // HTML 파서 정의
    window.KoreanWebAnalyzer.utils.parser = {
        /**
         * 문서의 메타 태그를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 메타 태그 정보
         */
        getMetaTags: function(doc) {
            doc = doc || document;
            
            const metas = doc.querySelectorAll('meta');
            const result = {
                charset: null,
                viewport: null,
                description: null,
                keywords: null,
                author: null,
                robots: null,
                byName: {},
                byProperty: {}
            };
            
            metas.forEach(meta => {
                // charset 속성 확인
                if (meta.getAttribute('charset')) {
                    result.charset = meta.getAttribute('charset');
                }
                
                // name 속성으로 분류
                if (meta.getAttribute('name')) {
                    const name = meta.getAttribute('name').toLowerCase();
                    const content = meta.getAttribute('content');
                    
                    result.byName[name] = content;
                    
                    // 주요 메타 태그 별도 저장
                    if (name === 'viewport') result.viewport = content;
                    if (name === 'description') result.description = content;
                    if (name === 'keywords') result.keywords = content;
                    if (name === 'author') result.author = content;
                    if (name === 'robots') result.robots = content;
                }
                
                // property 속성으로 분류 (Open Graph 등)
                if (meta.getAttribute('property')) {
                    const property = meta.getAttribute('property');
                    const content = meta.getAttribute('content');
                    
                    result.byProperty[property] = content;
                }
            });
            
            return result;
        },
        
        /**
         * 문서의 헤딩 구조를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Array} 헤딩 요소 배열
         */
        getHeadings: function(doc) {
            doc = doc || document;
            
            const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const result = [];
            
            headings.forEach(heading => {
                result.push({
                    level: parseInt(heading.tagName.substring(1)),
                    text: heading.textContent.trim(),
                    id: heading.id,
                    element: heading
                });
            });
            
            return result;
        },
        
        /**
         * 문서의 링크를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 내부/외부 링크 정보
         */
        getLinks: function(doc) {
            doc = doc || document;
            const links = doc.querySelectorAll('a');
            const currentDomain = window.location.hostname;
            
            const result = {
                internal: [],
                external: [],
                mail: [],
                empty: [],
                total: links.length
            };
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                
                // href 없는 경우
                if (!href) {
                    result.empty.push({
                        element: link,
                        text: link.textContent.trim()
                    });
                    return;
                }
                
                // 메일 링크
                if (href.startsWith('mailto:')) {
                    result.mail.push({
                        href: href,
                        text: link.textContent.trim(),
                        element: link
                    });
                    return;
                }
                
                // URL 객체 생성 시도
                try {
                    // 상대 URL을 절대 URL로 변환
                    const absoluteUrl = new URL(href, window.location.href);
                    const linkDomain = absoluteUrl.hostname;
                    
                    const linkInfo = {
                        href: href,
                        absoluteUrl: absoluteUrl.href,
                        domain: linkDomain,
                        text: link.textContent.trim(),
                        hasTitle: !!link.getAttribute('title'),
                        title: link.getAttribute('title') || '',
                        isNoFollow: link.getAttribute('rel') && link.getAttribute('rel').includes('nofollow'),
                        target: link.getAttribute('target') || '',
                        element: link
                    };
                    
                    // 내부/외부 링크 구분
                    if (linkDomain === currentDomain) {
                        result.internal.push(linkInfo);
                    } else {
                        result.external.push(linkInfo);
                    }
                } catch (err) {
                    // URL 파싱 실패 (잘못된 URL 등)
                    console.warn('링크 파싱 오류:', href, err);
                }
            });
            
            return result;
        },
        
        /**
         * 문서의 이미지를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Array} 이미지 정보 배열
         */
        getImages: function(doc) {
            doc = doc || document;
            const images = doc.querySelectorAll('img');
            const result = [];
            
            images.forEach(img => {
                result.push({
                    src: img.getAttribute('src'),
                    alt: img.getAttribute('alt') || '',
                    hasAlt: !!img.getAttribute('alt'),
                    width: img.getAttribute('width') || null,
                    height: img.getAttribute('height') || null,
                    naturalWidth: img.naturalWidth || null,
                    naturalHeight: img.naturalHeight || null,
                    loading: img.getAttribute('loading') || null,
                    isLazy: img.getAttribute('loading') === 'lazy',
                    element: img
                });
            });
            
            return result;
        },
        
        /**
         * 문서의 스크립트를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 스크립트 정보
         */
        getScripts: function(doc) {
            doc = doc || document;
            const scripts = doc.querySelectorAll('script');
            
            const result = {
                inline: [],
                external: [],
                total: scripts.length
            };
            
            scripts.forEach(script => {
                const src = script.getAttribute('src');
                
                if (src) {
                    // 외부 스크립트
                    result.external.push({
                        src: src,
                        async: script.async,
                        defer: script.defer,
                        type: script.getAttribute('type') || 'text/javascript',
                        element: script
                    });
                } else {
                    // 인라인 스크립트
                    result.inline.push({
                        content: script.textContent,
                        type: script.getAttribute('type') || 'text/javascript',
                        element: script
                    });
                }
            });
            
            return result;
        },
        
        /**
         * 문서의 스타일시트를 추출
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 스타일시트 정보
         */
        getStylesheets: function(doc) {
            doc = doc || document;
            const links = doc.querySelectorAll('link[rel="stylesheet"]');
            const styles = doc.querySelectorAll('style');
            
            const result = {
                external: [],
                inline: [],
                total: links.length + styles.length
            };
            
            links.forEach(link => {
                result.external.push({
                    href: link.getAttribute('href'),
                    media: link.getAttribute('media') || 'all',
                    element: link
                });
            });
            
            styles.forEach(style => {
                result.inline.push({
                    content: style.textContent,
                    media: style.getAttribute('media') || 'all',
                    element: style
                });
            });
            
            return result;
        },
        
        /**
         * 문서의 구조화된 데이터를 추출 (Schema.org)
         * @param {Document} doc - 분석할 문서 (기본값: 현재 문서)
         * @return {Object} 구조화된 데이터 정보
         */
        getStructuredData: function(doc) {
            doc = doc || document;
            
            // 결과 객체
            const result = {
                jsonld: [],
                microdata: [],
                rdfa: []
            };
            
            // JSON-LD 추출
            const jsonldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
            jsonldScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    result.jsonld.push({
                        data: data,
                        element: script
                    });
                } catch (err) {
                    console.warn('JSON-LD 파싱 오류:', err);
                }
            });
            
            // Microdata, RDFa 추출은 더 복잡한 구현이 필요하며, 미래 업데이트로 구현 예정
            
            return result;
        }
    };
})();