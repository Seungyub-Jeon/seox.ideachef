/**
 * 레이더 차트 컴포넌트 생성 함수
 * @param {HTMLElement} container - 차트를 렌더링할 컨테이너
 * @param {Object} data - { labels: [...], values: [...] }
 * @param {Object} options - { max: number, color: string, ... }
 * @returns {SVGElement} 생성된 SVG 차트
 *
 * 사용 예시:
 *   createRadarChart(document.getElementById('myRadar'), { labels: [...], values: [...] }, { max: 100 });
 */
function createRadarChart(container, data, options = {}) {
    const size = options.size || 280;
    const max = options.max || Math.max(...data.values, 100);
    const levels = options.levels || 5;
    const color = options.color || '#4285f4';
    const areaColor = options.areaColor || 'rgba(66,133,244,0.2)';
    const labelColor = options.labelColor || '#6c757d';
    const n = data.labels.length;
    const angleStep = (2 * Math.PI) / n;

    // SVG 생성
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.classList.add('kwa-radar-chart');

    const center = size / 2;
    const radius = center - 30;

    // 레벨 원 그리기
    for (let l = 1; l <= levels; l++) {
        const r = (radius * l) / levels;
        const level = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        level.setAttribute('cx', center);
        level.setAttribute('cy', center);
        level.setAttribute('r', r);
        level.setAttribute('class', 'kwa-radar-level');
        svg.appendChild(level);
    }

    // 축 그리기
    for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);
        const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axis.setAttribute('x1', center);
        axis.setAttribute('y1', center);
        axis.setAttribute('x2', x2);
        axis.setAttribute('y2', y2);
        axis.setAttribute('class', 'kwa-radar-axis');
        svg.appendChild(axis);
    }

    // 데이터 영역 그리기
    let areaPath = '';
    for (let i = 0; i < n; i++) {
        const value = data.values[i];
        const angle = i * angleStep - Math.PI / 2;
        const r = (value / max) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        areaPath += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    }
    areaPath += 'Z';
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', areaPath.trim());
    area.setAttribute('class', 'kwa-radar-area');
    area.setAttribute('fill', areaColor);
    area.setAttribute('stroke', color);
    svg.appendChild(area);

    // 데이터 점 찍기
    for (let i = 0; i < n; i++) {
        const value = data.values[i];
        const angle = i * angleStep - Math.PI / 2;
        const r = (value / max) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('r', 4);
        point.setAttribute('class', 'kwa-radar-point');
        point.setAttribute('fill', color);
        svg.appendChild(point);
    }

    // 라벨 추가
    for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + (radius + 18) * Math.cos(angle);
        const y = center + (radius + 18) * Math.sin(angle) + 5;
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.setAttribute('class', 'kwa-radar-label');
        label.setAttribute('fill', labelColor);
        label.textContent = data.labels[i];
        svg.appendChild(label);
    }

    // 기존 차트 제거 후 렌더링
    container.innerHTML = '';
    container.appendChild(svg);
    return svg;
}

// 글로벌 네임스페이스로 export
window.KoreanWebAnalyzer = window.KoreanWebAnalyzer || {};
window.KoreanWebAnalyzer.ui = window.KoreanWebAnalyzer.ui || {};
window.KoreanWebAnalyzer.ui.charts = window.KoreanWebAnalyzer.ui.charts || {};
window.KoreanWebAnalyzer.ui.charts.createRadarChart = createRadarChart; 