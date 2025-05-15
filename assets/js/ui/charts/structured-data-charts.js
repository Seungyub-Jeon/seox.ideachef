/**
 * StructuredDataCharts - 구조화 데이터 분석 결과를 차트로 시각화하는 모듈
 */
KoreanWebAnalyzer.namespace('ui.charts');

KoreanWebAnalyzer.ui.charts.StructuredDataCharts = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('StructuredDataCharts');

    /**
     * 점수 차트를 생성합니다.
     * @param {number} score - 표시할 점수 (0-100)
     * @returns {HTMLElement} 생성된 차트 요소
     */
    function createScoreChart(score) {
        logger.debug('점수 차트 생성', { score });

        // 차트 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'structured-data-chart score-chart-container';

        // 점수 차트 HTML 생성
        container.innerHTML = `
            <div class="score-chart">
                <div class="score-chart-background"></div>
                <div class="score-chart-fill ${getScoreClass(score)}"></div>
                <div class="score-chart-center">${score}</div>
            </div>
        `;

        // 점수에 따른 회전 각도 계산 (0-100 → 0-180deg)
        const rotation = (score / 100) * 180;
        const fill = container.querySelector('.score-chart-fill');
        
        // 애니메이션 적용
        setTimeout(() => {
            fill.style.transform = `rotate(${rotation}deg)`;
        }, 100);

        return container;
    }

    /**
     * 형식 분포 막대 차트를 생성합니다.
     * @param {Object} formats - 형식 분포 데이터
     * @returns {HTMLElement} 생성된 차트 요소
     */
    function createFormatBarChart(formats) {
        logger.debug('형식 분포 차트 생성', formats);

        // 전체 항목 수 계산
        const total = formats.jsonld.items + formats.microdata.items + formats.rdfa.items;
        
        if (total === 0) {
            // 데이터가 없는 경우 메시지 표시
            const container = document.createElement('div');
            container.className = 'structured-data-chart';
            container.innerHTML = '<p class="no-data-message">구조화 데이터가 없습니다.</p>';
            return container;
        }

        // 차트 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'structured-data-chart bar-chart';

        // 제목 추가
        const title = document.createElement('h4');
        title.textContent = '형식 분포';
        title.className = 'chart-title';
        container.appendChild(title);

        // 차트 내용 컨테이너 생성
        const chartContainer = document.createElement('div');
        chartContainer.className = 'bar-chart-container';
        container.appendChild(chartContainer);

        // JSON-LD 막대 추가
        addBarItem(chartContainer, 'JSON-LD', formats.jsonld.items, total, 'jsonld');
        
        // Microdata 막대 추가
        addBarItem(chartContainer, 'Microdata', formats.microdata.items, total, 'microdata');
        
        // RDFa 막대 추가
        addBarItem(chartContainer, 'RDFa', formats.rdfa.items, total, 'rdfa');

        return container;
    }

    /**
     * 스키마 타입 분포 파이 차트를 생성합니다.
     * @param {Object} schemaTypes - 스키마 타입 분포 데이터
     * @returns {HTMLElement} 생성된 차트 요소
     */
    function createSchemaTypesPieChart(schemaTypes) {
        logger.debug('스키마 타입 파이 차트 생성');

        // 타입 데이터 정리
        const typeEntries = Object.entries(schemaTypes);
        
        if (typeEntries.length === 0) {
            // 데이터가 없는 경우 메시지 표시
            const container = document.createElement('div');
            container.className = 'structured-data-chart';
            container.innerHTML = '<p class="no-data-message">스키마 타입 데이터가 없습니다.</p>';
            return container;
        }

        // 차트 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'structured-data-chart';

        // 제목 추가
        const title = document.createElement('h4');
        title.textContent = '스키마 타입 분포';
        title.className = 'chart-title';
        container.appendChild(title);

        // 상위 5개 타입만 표시 (나머지는 '기타'로 묶음)
        let topTypes = typeEntries.sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = typeEntries.reduce((sum, [_, count]) => sum + count, 0);
        
        // 상위 5개 이외의 타입이 있는지 확인
        const otherCount = typeEntries.length > 5 ? 
            typeEntries.slice(5).reduce((sum, [_, count]) => sum + count, 0) : 0;
        
        if (otherCount > 0) {
            topTypes.push(['기타', otherCount]);
        }
        
        // 파이 차트 SVG 생성
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "150");
        svg.setAttribute("height", "150");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.classList.add("pie-chart");
        
        // 색상 배열
        const colors = [
            '#F44336', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#795548'
        ];
        
        // 파이 차트 조각 그리기
        let startAngle = 0;
        const centerX = 50;
        const centerY = 50;
        const radius = 50;
        
        topTypes.forEach(([type, count], index) => {
            const percentage = count / total;
            const endAngle = startAngle + (percentage * 360);
            
            // SVG 패스 생성
            const path = document.createElementNS(svgNS, "path");
            const color = colors[index % colors.length];
            
            // 원호 그리기 계산
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);
            
            const largeArcFlag = percentage > 0.5 ? 1 : 0;
            
            // SVG 패스 문자열 생성
            const d = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;
            
            path.setAttribute("d", d);
            path.setAttribute("fill", color);
            
            svg.appendChild(path);
            
            startAngle = endAngle;
        });
        
        container.appendChild(svg);
        
        // 범례 추가
        const legend = document.createElement('div');
        legend.className = 'pie-chart-legend';
        
        topTypes.forEach(([type, count], index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'pie-chart-legend-item';
            
            const color = document.createElement('div');
            color.className = 'pie-chart-legend-color';
            color.style.backgroundColor = colors[index % colors.length];
            
            const text = document.createElement('div');
            text.className = 'pie-chart-legend-text';
            text.textContent = `${type} (${count})`;
            
            legendItem.appendChild(color);
            legendItem.appendChild(text);
            legend.appendChild(legendItem);
        });
        
        container.appendChild(legend);
        
        return container;
    }

    /**
     * 유효성 검증 레이더 차트를 생성합니다.
     * @param {Object} validation - 유효성 검증 결과 데이터
     * @returns {HTMLElement} 생성된 차트 요소
     */
    function createValidationRadarChart(validation) {
        logger.debug('유효성 검증 레이더 차트 생성');

        if (!validation) {
            // 데이터가 없는 경우 메시지 표시
            const container = document.createElement('div');
            container.className = 'structured-data-chart';
            container.innerHTML = '<p class="no-data-message">유효성 검증 데이터가 없습니다.</p>';
            return container;
        }

        // 차트 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'structured-data-chart';

        // 제목 추가
        const title = document.createElement('h4');
        title.textContent = '유효성 검증 결과';
        title.className = 'chart-title';
        container.appendChild(title);

        // 레이더 차트에 표시할 지표
        // - 필수 속성 완전성 (missing-required-property 오류 기반)
        // - 권장 속성 완전성 (missing-recommended-property 경고 기반)
        // - 타입 정확성 (invalid-type 오류 기반)
        // - 속성 타입 정확성 (invalid-property-type 오류 기반)
        // - 형식 정확성 (format 관련 오류/경고 기반)
        
        // 지표별 점수 계산 (0-100)
        const scores = calculateValidationScores(validation);
        
        // 레이더 차트 SVG 생성
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "250");
        svg.setAttribute("height", "250");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.classList.add("radar-chart");
        
        // 배경 축 그리기
        const axisLabels = [
            "필수 속성", "권장 속성", "타입 정확성", 
            "속성 타입 정확성", "형식 정확성"
        ];
        
        const centerX = 50;
        const centerY = 50;
        const radius = 40;
        const angles = [0, 72, 144, 216, 288]; // 5개 지표를 균등하게 배치 (360/5)
        
        // 배경 원 그리기
        for (let r = 10; r <= radius; r += 10) {
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", centerX.toString());
            circle.setAttribute("cy", centerY.toString());
            circle.setAttribute("r", r.toString());
            circle.classList.add("radar-chart-circle");
            svg.appendChild(circle);
        }
        
        // 축 및 레이블 그리기
        angles.forEach((angle, i) => {
            const radians = (angle - 90) * Math.PI / 180;
            const x = centerX + radius * Math.cos(radians);
            const y = centerY + radius * Math.sin(radians);
            
            // 축선 그리기
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", centerX.toString());
            line.setAttribute("y1", centerY.toString());
            line.setAttribute("x2", x.toString());
            line.setAttribute("y2", y.toString());
            line.setAttribute("stroke", "#ddd");
            line.setAttribute("stroke-width", "1");
            svg.appendChild(line);
            
            // 레이블 배치 위치 조정
            const labelRadius = radius + 10;
            const labelX = centerX + labelRadius * Math.cos(radians);
            const labelY = centerY + labelRadius * Math.sin(radians);
            
            // 레이블 텍스트 추가
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", labelX.toString());
            text.setAttribute("y", labelY.toString());
            text.setAttribute("text-anchor", "middle");
            text.classList.add("radar-chart-label");
            text.textContent = axisLabels[i];
            svg.appendChild(text);
        });
        
        // 데이터 다각형 그리기
        let points = "";
        
        scores.forEach((score, i) => {
            const radians = (angles[i] - 90) * Math.PI / 180;
            const r = (score / 100) * radius;
            const x = centerX + r * Math.cos(radians);
            const y = centerY + r * Math.sin(radians);
            
            points += `${x},${y} `;
        });
        
        const polygon = document.createElementNS(svgNS, "polygon");
        polygon.setAttribute("points", points.trim());
        polygon.classList.add("radar-chart-polygon");
        svg.appendChild(polygon);
        
        container.appendChild(svg);
        
        return container;
    }

    /**
     * 유효성 검증 결과에서 레이더 차트 점수를 계산합니다.
     * @param {Object} validation - 유효성 검증 결과
     * @returns {Array} 5개 지표에 대한 점수 배열
     * @private
     */
    function calculateValidationScores(validation) {
        // 기본 만점 시작
        const scores = [100, 100, 100, 100, 100];
        
        // 오류와 경고가 없으면 만점 반환
        if (!validation.errors && !validation.warnings) {
            return scores;
        }
        
        // 필수 속성 완전성 점수 계산
        const requiredPropertyErrors = (validation.errors || []).filter(
            error => error.code && error.code.includes('missing-required-property')
        ).length;
        
        if (requiredPropertyErrors > 0) {
            // 필수 속성 오류가 있으면 최대 50점 감점
            scores[0] = Math.max(0, 100 - (requiredPropertyErrors * 10));
        }
        
        // 권장 속성 완전성 점수 계산
        const recommendedPropertyWarnings = (validation.warnings || []).filter(
            warning => warning.code && warning.code.includes('missing-recommended-property')
        ).length;
        
        if (recommendedPropertyWarnings > 0) {
            // 권장 속성 경고가 있으면 최대 30점 감점
            scores[1] = Math.max(0, 100 - (recommendedPropertyWarnings * 5));
        }
        
        // 타입 정확성 점수 계산
        const typeErrors = (validation.errors || []).filter(
            error => error.code && (
                error.code.includes('invalid-type') || 
                error.code.includes('unknown-type')
            )
        ).length;
        
        if (typeErrors > 0) {
            // 타입 오류가 있으면 최대 70점 감점
            scores[2] = Math.max(0, 100 - (typeErrors * 15));
        }
        
        // 속성 타입 정확성 점수 계산
        const propertyTypeErrors = (validation.errors || []).filter(
            error => error.code && error.code.includes('invalid-property-type')
        ).length;
        
        if (propertyTypeErrors > 0) {
            // 속성 타입 오류가 있으면 최대 60점 감점
            scores[3] = Math.max(0, 100 - (propertyTypeErrors * 12));
        }
        
        // 형식 정확성 점수 계산
        const formatErrors = (validation.errors || []).filter(
            error => error.code && (
                error.code.includes('format') || 
                error.code.includes('syntax')
            )
        ).length;
        
        const formatWarnings = (validation.warnings || []).filter(
            warning => warning.code && (
                warning.code.includes('format') || 
                warning.code.includes('syntax')
            )
        ).length;
        
        if (formatErrors > 0 || formatWarnings > 0) {
            // 형식 오류/경고가 있으면 최대 50점 감점
            scores[4] = Math.max(0, 100 - (formatErrors * 10) - (formatWarnings * 5));
        }
        
        return scores;
    }

    /**
     * 막대 차트에 항목을 추가합니다.
     * @param {HTMLElement} container - 막대 차트 컨테이너
     * @param {string} label - 항목 레이블
     * @param {number} value - 항목 값
     * @param {number} total - 전체 합계 (백분율 계산용)
     * @param {string} className - 추가 클래스명
     * @private
     */
    function addBarItem(container, label, value, total, className) {
        // 값이 0이면 표시하지 않음
        if (value === 0) return;
        
        // 퍼센트 계산
        const percent = total > 0 ? Math.round((value / total) * 100) : 0;
        
        // 항목 요소 생성
        const item = document.createElement('div');
        item.className = 'bar-chart-item';
        
        // 레이블과 값 표시
        item.innerHTML = `
            <div class="bar-chart-label">
                <span class="bar-chart-label-text">${label}</span>
                <span class="bar-chart-value">${value} (${percent}%)</span>
            </div>
            <div class="bar-chart-bar-container">
                <div class="bar-chart-bar ${className}" style="width: 0%"></div>
            </div>
        `;
        
        container.appendChild(item);
        
        // 애니메이션 적용
        setTimeout(() => {
            const bar = item.querySelector('.bar-chart-bar');
            bar.style.width = `${percent}%`;
        }, 100);
    }

    /**
     * 점수에 따른 클래스명을 반환합니다.
     * @param {number} score - 점수
     * @returns {string} 점수 클래스
     * @private
     */
    function getScoreClass(score) {
        if (score < 50) return 'low';
        if (score < 80) return 'medium';
        return 'high';
    }

    return {
        createScoreChart: createScoreChart,
        createFormatBarChart: createFormatBarChart,
        createSchemaTypesPieChart: createSchemaTypesPieChart,
        createValidationRadarChart: createValidationRadarChart
    };
})();