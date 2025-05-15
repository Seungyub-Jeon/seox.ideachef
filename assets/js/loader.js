/**
 * 극소형 북마클릿 로더 - 최소화된 로더 스크립트
 * 크기 제한을 극복하기 위해 최적화됨
 */
(function() {
    // 이미 실행 중인지 확인
    if(window.KWA) {
        alert('분석기가 이미 실행 중입니다');
        return;
    }
    
    // 최소한의 네임스페이스 생성
    window.KWA = {v:'0.1.0'};
    
    // 스크립트 요소 생성
    var s = document.createElement('script');
    s.src = 'https://your-domain.com/assets/js/bootstrap.min.js?'+Date.now();
    s.async = true;
    
    // 로드/오류 처리
    s.onload = function() {
        console.log('로드 완료');
    };
    
    s.onerror = function() {
        var d = document.createElement('div');
        d.innerHTML = '<div style="position:fixed;top:20px;right:20px;padding:15px;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;border-radius:5px;z-index:9999999;font-family:sans-serif">로드 실패</div>';
        document.body.appendChild(d);
        setTimeout(function(){d.remove()},3000);
    };
    
    // 스크립트 삽입
    document.body.appendChild(s);
})();