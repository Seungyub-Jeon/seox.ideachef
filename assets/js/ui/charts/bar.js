/**
 * 바 차트 컴포넌트 생성 함수
 * @param {HTMLElement} container - 차트를 렌더링할 컨테이너
 * @param {Object} data - { labels: [...], values: [...] }
 * @param {Object} options - { max: number, color: string, ... }
 * @returns {HTMLElement} 생성된 차트 DOM
 *
 * 사용 예시:
 *   createBarChart(document.getElementById('myBar'), { labels: [...], values: [...] }, { max: 100 });
 */
function createBarChart(container, data, options = {}) {
    const max = options.max || Math.max(...data.values, 100);
    const goodColor = options.goodColor || '#28a745';
    const averageColor = options.averageColor || '#ffc107';
    const poorColor = options.poorColor || '#dc3545';
    const barColor = options.barColor || goodColor;
    const n = data.labels.length;

    const chart = document.createElement('div');
    chart.className = 'kwa-bar-chart';

    for (let i = 0; i < n; i++) {
        const value = data.values[i];
        const label = data.labels[i];
        const percent = Math.round((value / max) * 100);

        const item = document.createElement('div');
        item.className = 'kwa-bar-chart-item';

        // 라벨
        const labelDiv = document.createElement('div');
        labelDiv.className = 'kwa-bar-label';
        labelDiv.innerHTML = `<span>${label}</span><span>${value}</span>`;
        item.appendChild(labelDiv);

        // 트랙
        const track = document.createElement('div');
        track.className = 'kwa-bar-track';

        // 프로그레스
        const progress = document.createElement('div');
        progress.className = 'kwa-bar-progress';
        // 점수에 따라 색상 클래스 적용
        if (percent >= 80) {
            progress.classList.add('kwa-bar-progress-good');
            progress.style.backgroundColor = goodColor;
        } else if (percent >= 50) {
            progress.classList.add('kwa-bar-progress-average');
            progress.style.backgroundColor = averageColor;
        } else {
            progress.classList.add('kwa-bar-progress-poor');
            progress.style.backgroundColor = poorColor;
        }
        progress.style.width = percent + '%';
        track.appendChild(progress);
        item.appendChild(track);

        chart.appendChild(item);
    }

    // 기존 차트 제거 후 렌더링
    container.innerHTML = '';
    container.appendChild(chart);
    return chart;
}

// 글로벌 네임스페이스로 export
window.KoreanWebAnalyzer = window.KoreanWebAnalyzer || {};
window.KoreanWebAnalyzer.ui = window.KoreanWebAnalyzer.ui || {};
window.KoreanWebAnalyzer.ui.charts = window.KoreanWebAnalyzer.ui.charts || {};
window.KoreanWebAnalyzer.ui.charts.createBarChart = createBarChart; 