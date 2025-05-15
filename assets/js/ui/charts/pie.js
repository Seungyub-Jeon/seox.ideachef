/**
 * 파이 차트 컴포넌트 생성 함수
 * @param {HTMLElement} container - 차트를 렌더링할 컨테이너
 * @param {Object} data - { labels: [...], values: [...] }
 * @param {Object} options - { colors: [...], ... }
 * @returns {SVGElement} 생성된 SVG 차트
 *
 * 사용 예시:
 *   createPieChart(document.getElementById('myPie'), { labels: [...], values: [...] }, { colors: [...] });
 */
function createPieChart(container, data, options = {}) {
    const size = options.size || 180;
    const colors = options.colors || ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#a142f4', '#ff6d01', '#46bdc6'];
    const n = data.labels.length;
    const total = data.values.reduce((a, b) => a + b, 0) || 1;
    const radius = size / 2 - 10;
    const center = size / 2;

    // SVG 생성
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.classList.add('kwa-pie-chart');

    let startAngle = 0;
    for (let i = 0; i < n; i++) {
        const value = data.values[i];
        const angle = (value / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
        const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
        const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
        const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);
        const largeArc = angle > Math.PI ? 1 : 0;
        const pathData = [
            'M', center, center,
            'L', x1, y1,
            'A', radius, radius, 0, largeArc, 1, x2, y2,
            'Z'
        ].join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'kwa-pie-slice');
        path.setAttribute('fill', colors[i % colors.length]);
        svg.appendChild(path);
        startAngle = endAngle;
    }

    // 기존 차트 제거 후 렌더링
    container.innerHTML = '';
    container.appendChild(svg);

    // 범례 생성
    const legend = document.createElement('div');
    legend.className = 'kwa-pie-legend';
    for (let i = 0; i < n; i++) {
        const item = document.createElement('div');
        item.className = 'kwa-pie-legend-item';
        const colorBox = document.createElement('span');
        colorBox.className = 'kwa-pie-legend-color';
        colorBox.style.backgroundColor = colors[i % colors.length];
        item.appendChild(colorBox);
        const label = document.createElement('span');
        label.textContent = data.labels[i];
        item.appendChild(label);
        legend.appendChild(item);
    }
    container.appendChild(legend);
    return svg;
}

// 글로벌 네임스페이스로 export
window.KoreanWebAnalyzer = window.KoreanWebAnalyzer || {};
window.KoreanWebAnalyzer.ui = window.KoreanWebAnalyzer.ui || {};
window.KoreanWebAnalyzer.ui.charts = window.KoreanWebAnalyzer.ui.charts || {};
window.KoreanWebAnalyzer.ui.charts.createPieChart = createPieChart; 