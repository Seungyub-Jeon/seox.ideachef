/**
 * StructuredDataReportGenerator - 구조화 데이터 분석 보고서 생성 모듈
 * 구조화 데이터 분석 결과를 시각적인 보고서로 변환합니다.
 */
KoreanWebAnalyzer.namespace('analyzer.structuredData');

KoreanWebAnalyzer.analyzer.structuredData.ReportGenerator = (function() {
    'use strict';

    // 로거 가져오기
    const logger = KoreanWebAnalyzer.utils.Logger.getLogger('StructuredDataReportGenerator');

    /**
     * ReportGenerator 생성자
     */
    function ReportGenerator() {
        this.templates = {
            mainContainer: `
                <div class="structured-data-report">
                    <div class="summary-section"></div>
                    <div class="format-stats-section"></div>
                    <div class="schema-types-section"></div>
                    <div class="validation-section"></div>
                    <div class="recommendations-section"></div>
                    <div class="data-preview-section"></div>
                </div>
            `,
            
            summarySection: `
                <div class="section-header">
                    <h3>구조화 데이터 분석</h3>
                    <div class="score-badge">{{score}}</div>
                </div>
                <div class="section-content">
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">구조화 데이터 항목</span>
                            <span class="stat-value">{{totalItems}}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">형식</span>
                            <span class="stat-value">{{formatCount}}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">스키마 타입</span>
                            <span class="stat-value">{{typeCount}}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">오류</span>
                            <span class="stat-value {{errorClass}}">{{errorCount}}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">경고</span>
                            <span class="stat-value {{warningClass}}">{{warningCount}}</span>
                        </div>
                    </div>
                    {{#if hasStructuredData}}
                    <div class="summary-text">
                        <p>이 페이지에는 {{formatNames}} 형식의 구조화 데이터가 포함되어 있습니다.</p>
                    </div>
                    {{else}}
                    <div class="summary-text">
                        <p>이 페이지에는 구조화 데이터가 포함되어 있지 않습니다.</p>
                    </div>
                    {{/if}}
                </div>
            `,
            
            formatStatsSection: `
                <div class="section-header">
                    <h3>형식별 통계</h3>
                </div>
                <div class="section-content">
                    <div class="format-stats">
                        {{#each formats}}
                        <div class="format-item {{#if found}}found{{/if}}">
                            <div class="format-icon {{name}}-icon"></div>
                            <div class="format-details">
                                <div class="format-name">{{displayName}}</div>
                                <div class="format-count">{{items}} 항목</div>
                            </div>
                        </div>
                        {{/each}}
                    </div>
                </div>
            `,
            
            schemaTypesSection: `
                <div class="section-header">
                    <h3>스키마 타입</h3>
                </div>
                <div class="section-content">
                    {{#if hasTypes}}
                    <div class="schema-types-list">
                        {{#each types}}
                        <div class="schema-type-item">
                            <span class="schema-type-name">{{name}}</span>
                            <span class="schema-type-count">{{count}}</span>
                        </div>
                        {{/each}}
                    </div>
                    {{else}}
                    <p class="no-data-message">구조화 데이터가 없거나 스키마 타입을 식별할 수 없습니다.</p>
                    {{/if}}
                </div>
            `,
            
            validationSection: `
                <div class="section-header">
                    <h3>유효성 검증</h3>
                </div>
                <div class="section-content">
                    {{#if hasValidation}}
                    <div class="validation-summary">
                        <div class="validation-stat {{errorClass}}">
                            <span class="validation-count">{{errorCount}}</span>
                            <span class="validation-label">오류</span>
                        </div>
                        <div class="validation-stat {{warningClass}}">
                            <span class="validation-count">{{warningCount}}</span>
                            <span class="validation-label">경고</span>
                        </div>
                    </div>
                    
                    {{#if hasErrors}}
                    <div class="validation-details">
                        <h4>오류</h4>
                        <ul class="validation-list error-list">
                            {{#each errors}}
                            <li class="validation-item">
                                <div class="validation-message">{{message}}</div>
                                {{#if schemaType}}
                                <div class="validation-meta">
                                    <span class="schema-type-tag">{{schemaType}}</span>
                                </div>
                                {{/if}}
                            </li>
                            {{/each}}
                        </ul>
                    </div>
                    {{/if}}
                    
                    {{#if hasWarnings}}
                    <div class="validation-details">
                        <h4>경고</h4>
                        <ul class="validation-list warning-list">
                            {{#each warnings}}
                            <li class="validation-item">
                                <div class="validation-message">{{message}}</div>
                                {{#if schemaType}}
                                <div class="validation-meta">
                                    <span class="schema-type-tag">{{schemaType}}</span>
                                </div>
                                {{/if}}
                            </li>
                            {{/each}}
                        </ul>
                    </div>
                    {{/if}}
                    {{else}}
                    <p class="no-data-message">유효성 검증 결과가 없습니다.</p>
                    {{/if}}
                </div>
            `,
            
            recommendationsSection: `
                <div class="section-header">
                    <h3>권장 사항</h3>
                </div>
                <div class="section-content">
                    {{#if hasRecommendations}}
                    <ul class="recommendations-list">
                        {{#each recommendations}}
                        <li class="recommendation-item {{importance}}">
                            <div class="recommendation-importance-indicator"></div>
                            <div class="recommendation-content">{{message}}</div>
                        </li>
                        {{/each}}
                    </ul>
                    {{else}}
                    <p class="no-data-message">권장 사항이 없습니다.</p>
                    {{/if}}
                </div>
            `,
            
            dataPreviewSection: `
                <div class="section-header">
                    <h3>데이터 미리보기</h3>
                    <button class="toggle-preview-btn">표시</button>
                </div>
                <div class="section-content data-preview-content" style="display: none;">
                    {{#if hasItems}}
                    <div class="data-preview-container">
                        <pre class="data-preview-code">{{itemsJson}}</pre>
                    </div>
                    {{else}}
                    <p class="no-data-message">미리볼 구조화 데이터가 없습니다.</p>
                    {{/if}}
                </div>
            `
        };
    }

    /**
     * 분석 결과를 HTML 보고서로 생성합니다.
     * @param {Object} result - 구조화 데이터 분석 결과
     * @returns {HTMLElement} 생성된 보고서 HTML 요소
     */
    ReportGenerator.prototype.generateReport = function(result) {
        logger.debug('보고서 생성 시작', { score: result.score });
        
        try {
            // 메인 컨테이너 생성
            const container = document.createElement('div');
            container.innerHTML = this.templates.mainContainer.trim();
            const report = container.firstChild;
            
            // 요약 섹션 생성
            const summarySection = report.querySelector('.summary-section');
            summarySection.innerHTML = this._generateSummarySection(result);
            
            // 형식별 통계 섹션 생성
            const formatStatsSection = report.querySelector('.format-stats-section');
            formatStatsSection.innerHTML = this._generateFormatStatsSection(result.details);
            
            // 스키마 타입 섹션 생성
            const schemaTypesSection = report.querySelector('.schema-types-section');
            schemaTypesSection.innerHTML = this._generateSchemaTypesSection(result.details);
            
            // 유효성 검증 섹션 생성
            const validationSection = report.querySelector('.validation-section');
            validationSection.innerHTML = this._generateValidationSection(result.details);
            
            // 권장 사항 섹션 생성
            const recommendationsSection = report.querySelector('.recommendations-section');
            recommendationsSection.innerHTML = this._generateRecommendationsSection(result.details);
            
            // 데이터 미리보기 섹션 생성
            const dataPreviewSection = report.querySelector('.data-preview-section');
            dataPreviewSection.innerHTML = this._generateDataPreviewSection(result.details);
            
            // 이벤트 추가
            this._addEventListeners(report);
            
            logger.debug('보고서 생성 완료');
            
            return report;
        } catch (error) {
            logger.error('보고서 생성 중 오류 발생', error);
            
            // 오류 보고서 생성
            const errorContainer = document.createElement('div');
            errorContainer.className = 'structured-data-report error';
            errorContainer.innerHTML = `
                <div class="section-header">
                    <h3>구조화 데이터 분석</h3>
                </div>
                <div class="section-content">
                    <p class="error-message">보고서 생성 중 오류가 발생했습니다: ${error.message}</p>
                </div>
            `;
            
            return errorContainer;
        }
    };

    /**
     * 요약 섹션 HTML을 생성합니다.
     * @param {Object} result - 분석 결과
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateSummarySection = function(result) {
        const details = result.details;
        
        const formatNames = [];
        if (details.formats) {
            if (details.formats.jsonld && details.formats.jsonld.found) formatNames.push('JSON-LD');
            if (details.formats.microdata && details.formats.microdata.found) formatNames.push('Microdata');
            if (details.formats.rdfa && details.formats.rdfa.found) formatNames.push('RDFa');
        }
        
        const errorCount = details.validation && details.validation.errors ? 
                          details.validation.errors.length : 0;
        const warningCount = details.validation && details.validation.warnings ? 
                            details.validation.warnings.length : 0;
        
        const data = {
            score: result.score,
            hasStructuredData: details.hasStructuredData,
            totalItems: details.items ? details.items.length : 0,
            formatCount: formatNames.length,
            formatNames: formatNames.join(', '),
            typeCount: details.schemaTypes ? Object.keys(details.schemaTypes).length : 0,
            errorCount: errorCount,
            warningCount: warningCount,
            errorClass: errorCount > 0 ? 'has-errors' : '',
            warningClass: warningCount > 0 ? 'has-warnings' : ''
        };
        
        return this._renderTemplate(this.templates.summarySection, data);
    };

    /**
     * 형식별 통계 섹션 HTML을 생성합니다.
     * @param {Object} details - 분석 결과 상세 정보
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateFormatStatsSection = function(details) {
        const formats = [];
        
        if (details.formats) {
            formats.push({
                name: 'jsonld',
                displayName: 'JSON-LD',
                found: details.formats.jsonld.found,
                items: details.formats.jsonld.items
            });
            
            formats.push({
                name: 'microdata',
                displayName: 'Microdata',
                found: details.formats.microdata.found,
                items: details.formats.microdata.items
            });
            
            formats.push({
                name: 'rdfa',
                displayName: 'RDFa',
                found: details.formats.rdfa.found,
                items: details.formats.rdfa.items
            });
        }
        
        const data = {
            formats: formats
        };
        
        return this._renderTemplate(this.templates.formatStatsSection, data);
    };

    /**
     * 스키마 타입 섹션 HTML을 생성합니다.
     * @param {Object} details - 분석 결과 상세 정보
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateSchemaTypesSection = function(details) {
        const types = [];
        
        if (details.schemaTypes) {
            for (const [name, count] of Object.entries(details.schemaTypes)) {
                types.push({ name, count });
            }
            
            // 타입 이름 알파벳순 정렬
            types.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        const data = {
            hasTypes: types.length > 0,
            types: types
        };
        
        return this._renderTemplate(this.templates.schemaTypesSection, data);
    };

    /**
     * 유효성 검증 섹션 HTML을 생성합니다.
     * @param {Object} details - 분석 결과 상세 정보
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateValidationSection = function(details) {
        const errors = [];
        const warnings = [];
        
        if (details.validation && details.validation.errors) {
            // 일반 검증 오류
            details.validation.errors.forEach(error => {
                errors.push({
                    message: error.message,
                    code: error.code
                });
            });
        }
        
        if (details.specialValidation && details.specialValidation.errors) {
            // 특수 검증 오류
            details.specialValidation.errors.forEach(error => {
                errors.push({
                    message: error.message,
                    code: error.code,
                    schemaType: error.schemaType
                });
            });
        }
        
        if (details.validation && details.validation.warnings) {
            // 일반 검증 경고
            details.validation.warnings.forEach(warning => {
                warnings.push({
                    message: warning.message,
                    code: warning.code
                });
            });
        }
        
        if (details.specialValidation && details.specialValidation.warnings) {
            // 특수 검증 경고
            details.specialValidation.warnings.forEach(warning => {
                warnings.push({
                    message: warning.message,
                    code: warning.code,
                    schemaType: warning.schemaType
                });
            });
        }
        
        // 중복 제거
        const uniqueErrors = this._removeDuplicates(errors, 'message');
        const uniqueWarnings = this._removeDuplicates(warnings, 'message');
        
        const data = {
            hasValidation: details.validation || details.specialValidation,
            hasErrors: uniqueErrors.length > 0,
            hasWarnings: uniqueWarnings.length > 0,
            errorCount: uniqueErrors.length,
            warningCount: uniqueWarnings.length,
            errors: uniqueErrors,
            warnings: uniqueWarnings,
            errorClass: uniqueErrors.length > 0 ? 'has-errors' : '',
            warningClass: uniqueWarnings.length > 0 ? 'has-warnings' : ''
        };
        
        return this._renderTemplate(this.templates.validationSection, data);
    };

    /**
     * 권장 사항 섹션 HTML을 생성합니다.
     * @param {Object} details - 분석 결과 상세 정보
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateRecommendationsSection = function(details) {
        const recommendations = [];
        
        if (details.recommendations && details.recommendations.length > 0) {
            details.recommendations.forEach(rec => {
                recommendations.push({
                    message: rec.message,
                    importance: rec.importance || 'medium'
                });
            });
        }
        
        const data = {
            hasRecommendations: recommendations.length > 0,
            recommendations: recommendations
        };
        
        return this._renderTemplate(this.templates.recommendationsSection, data);
    };

    /**
     * 데이터 미리보기 섹션 HTML을 생성합니다.
     * @param {Object} details - 분석 결과 상세 정보
     * @returns {string} 생성된 HTML
     * @private
     */
    ReportGenerator.prototype._generateDataPreviewSection = function(details) {
        const data = {
            hasItems: details.items && details.items.length > 0,
            itemsJson: details.items ? JSON.stringify(details.items, null, 2) : ''
        };
        
        return this._renderTemplate(this.templates.dataPreviewSection, data);
    };

    /**
     * 템플릿을 렌더링합니다.
     * @param {string} template - 템플릿 문자열
     * @param {Object} data - 템플릿에 적용할 데이터
     * @returns {string} 렌더링된 HTML
     * @private
     */
    ReportGenerator.prototype._renderTemplate = function(template, data) {
        let html = template;
        
        // {{변수}} 치환
        html = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const keys = key.trim().split('.');
            let value = data;
            
            for (const k of keys) {
                if (value === undefined || value === null) {
                    return '';
                }
                value = value[k];
            }
            
            return value !== undefined ? value : '';
        });
        
        // {{#if 조건}}...{{else}}...{{/if}} 처리
        html = html.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, 
            (match, condition, ifContent, elseContent) => {
                const keys = condition.trim().split('.');
                let value = data;
                
                for (const k of keys) {
                    if (value === undefined || value === null) {
                        value = undefined;
                        break;
                    }
                    value = value[k];
                }
                
                const conditionMet = value ? true : false;
                return conditionMet ? ifContent : (elseContent || '');
            }
        );
        
        // {{#each 배열}}...{{/each}} 처리
        html = html.replace(/\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, 
            (match, arrayName, content) => {
                const keys = arrayName.trim().split('.');
                let array = data;
                
                for (const k of keys) {
                    if (array === undefined || array === null) {
                        array = undefined;
                        break;
                    }
                    array = array[k];
                }
                
                if (!array || !Array.isArray(array) || array.length === 0) {
                    return '';
                }
                
                return array.map(item => {
                    let itemContent = content;
                    
                    // 항목 속성 치환
                    itemContent = itemContent.replace(/\{\{([^}]+)\}\}/g, (propMatch, propKey) => {
                        if (propKey === '.') {
                            return item;
                        }
                        
                        const propKeys = propKey.trim().split('.');
                        let propValue = item;
                        
                        for (const pk of propKeys) {
                            if (propValue === undefined || propValue === null) {
                                return '';
                            }
                            propValue = propValue[pk];
                        }
                        
                        return propValue !== undefined ? propValue : '';
                    });
                    
                    return itemContent;
                }).join('');
            }
        );
        
        return html;
    };

    /**
     * 보고서에 이벤트 리스너를 추가합니다.
     * @param {HTMLElement} report - 보고서 요소
     * @private
     */
    ReportGenerator.prototype._addEventListeners = function(report) {
        const toggleBtn = report.querySelector('.toggle-preview-btn');
        const previewContent = report.querySelector('.data-preview-content');
        
        if (toggleBtn && previewContent) {
            toggleBtn.addEventListener('click', function() {
                const isVisible = previewContent.style.display !== 'none';
                
                previewContent.style.display = isVisible ? 'none' : 'block';
                toggleBtn.textContent = isVisible ? '표시' : '숨기기';
            });
        }
    };

    /**
     * 배열에서 특정 속성의 중복 항목을 제거합니다.
     * @param {Array} array - 처리할 배열
     * @param {string} key - 중복 확인에 사용할 키
     * @returns {Array} 중복이 제거된 배열
     * @private
     */
    ReportGenerator.prototype._removeDuplicates = function(array, key) {
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    };

    return ReportGenerator;
})();