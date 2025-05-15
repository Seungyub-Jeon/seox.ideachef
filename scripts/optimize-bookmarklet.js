/**
 * 북마클릿 최적화 스크립트
 * 
 * 북마클릿 코드 크기를 최소화하고 URL로 변환하는 스크립트
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const chalk = require('chalk');

// 설정
const SOURCE_PATH = path.join(__dirname, '../dist/assets/js/loader.min.js');
const OUTPUT_PATH = path.join(__dirname, '../dist/bookmarklet.txt');
const HTML_PATH = path.join(__dirname, '../dist/index.html');
const REPORT_PATH = path.join(__dirname, '../dist/bookmarklet-report.json');

// 북마클릿 URL 템플릿
const URL_PREFIX = 'javascript:';

// 최대 크기 제한 (브라우저별)
const SIZE_LIMITS = {
    IE: 2083,        // IE URL 제한
    SAFARI: 65536,   // Safari URL 제한
    CHROME: 10485760 // Chrome URL 제한 (현실적으로 훨씬 작게 유지해야 함)
};

/**
 * 문자열에서 특정 패턴을 짧은 식별자로 대체하여 압축
 * @param {string} code - 원본 코드
 * @return {string} 압축된 코드
 */
function customCompress(code) {
    // 자주 사용되는 패턴과 대체할 짧은 식별자 매핑
    const patterns = [
        { pattern: 'document.getElementById', replace: 'function(t){return document.getElementById(t)}' },
        { pattern: 'document.createElement', replace: 'function(t){return document.createElement(t)}' },
        { pattern: 'document.querySelector', replace: 'function(t){return document.querySelector(t)}' },
        { pattern: 'window.addEventListener', replace: 'function(t,e){window.addEventListener(t,e)}' },
        { pattern: 'document.body.appendChild', replace: 'function(t){document.body.appendChild(t)}' }
    ];
    
    // 이미 선언된 함수인지 확인
    let compressedCode = code;
    let functionMap = {};
    let varIndex = 0;
    
    // 함수 선언 부분 추가 (IIFE 내부에 삽입)
    let fnDeclarations = '';
    
    // 각 패턴에 대해 압축 적용
    patterns.forEach((p, index) => {
        // 최소 2번 이상 사용되는 패턴만 처리
        const occurrences = (compressedCode.match(new RegExp(p.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (occurrences >= 2) {
            const varName = `_${String.fromCharCode(97 + varIndex++)}`;
            functionMap[p.pattern] = varName;
            
            // 함수 선언 추가
            fnDeclarations += `var ${varName}=${p.replace};`;
            
            // 코드에서 패턴 대체
            compressedCode = compressedCode.replace(new RegExp(p.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), varName);
        }
    });
    
    // 함수 선언부가 있는 경우에만 삽입
    if (fnDeclarations) {
        // IIFE 내부 시작 위치 찾기
        const iifeStart = compressedCode.indexOf('{') + 1;
        if (iifeStart > 0) {
            compressedCode = compressedCode.slice(0, iifeStart) + fnDeclarations + compressedCode.slice(iifeStart);
        }
    }
    
    return compressedCode;
}

/**
 * 문자열에서 반복되는 코드 패턴을 함수 호출로 대체하여 압축
 * @param {string} code - 원본 코드
 * @return {string} 압축된 코드
 */
function ultraCompress(code) {
    // 추가 압축을 위한 패턴들
    const replacements = [
        // document 관련 패턴
        {pattern: /document\.createElement\(['"](\w+)['"]\)/g, replace: 'C("$1")'},
        {pattern: /document\.body\.appendChild/g, replace: 'B'},
        {pattern: /document\.getElementById/g, replace: 'I'},
        {pattern: /document\.querySelector/g, replace: 'Q'},
        
        // window 관련 패턴
        {pattern: /window\.KWA/g, replace: 'K'},
        {pattern: /window\.addEventListener/g, replace: 'W'},
        
        // 스타일 관련 패턴
        {pattern: /style\.position/g, replace: 'S.p'},
        {pattern: /style\.top/g, replace: 'S.t'},
        {pattern: /style\.right/g, replace: 'S.r'},
        {pattern: /style\.zIndex/g, replace: 'S.z'},
        {pattern: /style\.backgroundColor/g, replace: 'S.b'},
        {pattern: /style\.color/g, replace: 'S.c'},
        {pattern: /style\.border/g, replace: 'S.d'},
        
        // 기타 패턴
        {pattern: /function\(\)/g, replace: 'function()'},
        {pattern: /console\.log/g, replace: 'L'},
        {pattern: /console\.error/g, replace: 'E'},
        {pattern: /Date\.now\(\)/g, replace: 'N()'},
    ];
    
    // 함수 선언 생성
    const functionDeclarations = [
        'C=function(t){return document.createElement(t)}',
        'B=document.body.appendChild.bind(document.body)',
        'I=document.getElementById.bind(document)',
        'Q=document.querySelector.bind(document)',
        'K=window.KWA',
        'W=window.addEventListener.bind(window)',
        'L=console.log.bind(console)',
        'E=console.error.bind(console)',
        'N=Date.now',
        'S={p:"position",t:"top",r:"right",z:"zIndex",b:"backgroundColor",c:"color",d:"border"}'
    ].join(',');
    
    // IIFE 내부에 함수 선언 삽입
    let compressedCode = code;
    const iifeStart = compressedCode.indexOf('{') + 1;
    
    if (iifeStart > 0) {
        // 함수 선언부 삽입
        compressedCode = compressedCode.slice(0, iifeStart) + 'var ' + functionDeclarations + ';' + compressedCode.slice(iifeStart);
        
        // 각 패턴 대체 적용
        replacements.forEach(item => {
            compressedCode = compressedCode.replace(item.pattern, item.replace);
        });
    }
    
    return compressedCode;
}

/**
 * 브라우저 최대 URL 길이 확인
 * @param {number} length - URL 길이
 * @return {Object} 브라우저별 호환성 정보
 */
function checkBrowserCompatibility(length) {
    return {
        IE: length <= SIZE_LIMITS.IE,
        Safari: length <= SIZE_LIMITS.SAFARI,
        Chrome: length <= SIZE_LIMITS.CHROME,
        Firefox: length <= SIZE_LIMITS.CHROME, // Firefox는 Chrome과 유사한 제한
        Edge: length <= SIZE_LIMITS.CHROME // Edge는 Chrome과 유사한 제한
    };
}

/**
 * 북마클릿 최적화 및 URL 생성
 */
async function optimizeBookmarklet() {
    console.log(chalk.blue('북마클릿 최적화 시작...'));
    
    try {
        // 결과 보고서 객체
        const report = {
            timestamp: new Date().toISOString(),
            steps: [],
            compatibility: {},
            finalSize: 0
        };
        
        // 로더 스크립트 읽기
        const loaderCode = fs.readFileSync(SOURCE_PATH, 'utf8');
        const originalSize = loaderCode.length;
        console.log(`${chalk.yellow('원본 스크립트 크기')}: ${chalk.green(originalSize)} 바이트`);
        
        report.steps.push({
            step: 'original',
            size: originalSize,
            description: '원본 로더 스크립트'
        });
        
        // 1단계 최적화 (terser 기본 설정)
        console.log(chalk.blue('1단계 최적화 (기본 압축) 진행 중...'));
        const optimizedResult1 = await minify(loaderCode, {
            compress: {
                booleans_as_integers: true,
                drop_console: true,
                passes: 2,
                ecma: 2015
            },
            mangle: true,
            format: {
                ascii_only: true,
                beautify: false,
                comments: false
            },
            sourceMap: false
        });
        
        if (!optimizedResult1 || !optimizedResult1.code) {
            throw new Error('1단계 코드 최적화 실패');
        }
        
        const optimizedCode1 = optimizedResult1.code;
        console.log(`${chalk.yellow('1단계 최적화 후 크기')}: ${chalk.green(optimizedCode1.length)} 바이트 (${chalk.green(Math.round(optimizedCode1.length / originalSize * 100))}%)`);
        
        report.steps.push({
            step: 'terser-basic',
            size: optimizedCode1.length,
            reduction: Math.round((1 - optimizedCode1.length / originalSize) * 100),
            description: 'Terser 기본 최적화'
        });
        
        // 2단계 최적화 (고급 설정)
        console.log(chalk.blue('2단계 최적화 (고급 압축) 진행 중...'));
        const optimizedResult2 = await minify(optimizedCode1, {
            compress: {
                booleans_as_integers: true,
                drop_console: true,
                drop_debugger: true,
                ecma: 2015,
                module: true,
                passes: 3,
                pure_getters: true,
                unsafe: true,
                unsafe_arrows: true,
                unsafe_comps: true,
                unsafe_Function: true,
                unsafe_math: true,
                unsafe_methods: true,
                unsafe_proto: true,
                unsafe_regexp: true,
                unsafe_undefined: true
            },
            mangle: {
                properties: {
                    keep_quoted: true,
                    reserved: ['arguments', 'KoreanWebAnalyzer']
                },
                module: true,
                toplevel: true
            },
            format: {
                ascii_only: true,
                beautify: false,
                comments: false,
                ecma: 2015,
                wrap_iife: true
            },
            sourceMap: false,
            ecma: 2015,
            module: true,
            toplevel: true
        });
        
        if (!optimizedResult2 || !optimizedResult2.code) {
            throw new Error('2단계 코드 최적화 실패');
        }
        
        const optimizedCode2 = optimizedResult2.code;
        console.log(`${chalk.yellow('2단계 최적화 후 크기')}: ${chalk.green(optimizedCode2.length)} 바이트 (${chalk.green(Math.round(optimizedCode2.length / originalSize * 100))}%)`);
        
        report.steps.push({
            step: 'terser-advanced',
            size: optimizedCode2.length,
            reduction: Math.round((1 - optimizedCode2.length / originalSize) * 100),
            description: 'Terser 고급 최적화'
        });
        
        // 3단계 최적화 (패턴 대체)
        console.log(chalk.blue('3단계 최적화 (패턴 대체) 진행 중...'));
        const customCompressedCode = customCompress(optimizedCode2);
        console.log(`${chalk.yellow('3단계 최적화 후 크기')}: ${chalk.green(customCompressedCode.length)} 바이트 (${chalk.green(Math.round(customCompressedCode.length / originalSize * 100))}%)`);
        
        report.steps.push({
            step: 'custom-patterns',
            size: customCompressedCode.length,
            reduction: Math.round((1 - customCompressedCode.length / originalSize) * 100),
            description: '커스텀 패턴 대체 최적화'
        });
        
        // 4단계 최적화 (극단적 패턴 대체)
        console.log(chalk.blue('4단계 최적화 (극단적 패턴 대체) 진행 중...'));
        const ultraCompressedCode = ultraCompress(customCompressedCode);
        console.log(`${chalk.yellow('4단계 최적화 후 크기')}: ${chalk.green(ultraCompressedCode.length)} 바이트 (${chalk.green(Math.round(ultraCompressedCode.length / originalSize * 100))}%)`);
        
        report.steps.push({
            step: 'ultra-patterns',
            size: ultraCompressedCode.length,
            reduction: Math.round((1 - ultraCompressedCode.length / originalSize) * 100),
            description: '극단적 패턴 대체 최적화'
        });
        
        // 최종 코드
        const finalCode = ultraCompressedCode;
        
        // 북마클릿 URL 생성
        const bookmarkletUrl = URL_PREFIX + encodeURIComponent(finalCode);
        console.log(`${chalk.yellow('북마클릿 URL 크기')}: ${chalk.green(bookmarkletUrl.length)} 바이트 (${chalk.green(Math.round(bookmarkletUrl.length / originalSize * 100))}%)`);
        
        report.steps.push({
            step: 'bookmarklet-url',
            size: bookmarkletUrl.length,
            description: 'URL 인코딩 북마클릿'
        });
        
        // 최대 크기 확인 (브라우저 제한)
        const compatibility = checkBrowserCompatibility(bookmarkletUrl.length);
        report.compatibility = compatibility;
        report.finalSize = bookmarkletUrl.length;
        
        // 호환성 결과 출력
        console.log(chalk.blue('\n브라우저 호환성:'));
        Object.entries(compatibility).forEach(([browser, isCompatible]) => {
            const statusColor = isCompatible ? chalk.green : chalk.red;
            const status = isCompatible ? '호환 가능' : '호환 불가';
            console.log(`- ${chalk.bold(browser)}: ${statusColor(status)}`);
        });
        
        if (bookmarkletUrl.length > SIZE_LIMITS.IE) {
            console.warn(chalk.yellow(`\n경고: 북마클릿 URL이 IE 최대 크기(${SIZE_LIMITS.IE} 바이트)를 초과합니다.`));
            console.warn(chalk.yellow(`현재 크기: ${bookmarkletUrl.length} 바이트 (${Math.round(bookmarkletUrl.length / SIZE_LIMITS.IE * 100)}% 초과)`));
        }
        
        // 파일로 저장
        fs.writeFileSync(OUTPUT_PATH, bookmarkletUrl);
        console.log(`\n${chalk.green('북마클릿 URL 저장 완료')}: ${OUTPUT_PATH}`);
        
        // 보고서 저장
        fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
        console.log(`${chalk.green('최적화 보고서 저장 완료')}: ${REPORT_PATH}`);
        
        // HTML 파일에 URL 삽입
        if (fs.existsSync(HTML_PATH)) {
            let htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
            
            // 북마클릿 링크 찾아 교체
            const bookmarkletLinkRegex = /<a href="javascript:.*?" class="bookmarklet">/;
            if (bookmarkletLinkRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(bookmarkletLinkRegex, `<a href="${bookmarkletUrl}" class="bookmarklet">`);
                fs.writeFileSync(HTML_PATH, htmlContent);
                console.log(`${chalk.green('index.html 파일에 북마클릿 URL 삽입 완료')}`);
            } else {
                console.warn(chalk.yellow('index.html 파일에서 북마클릿 링크를 찾을 수 없습니다.'));
            }
        } else {
            console.warn(chalk.yellow(`${HTML_PATH} 파일이 존재하지 않습니다.`));
        }
        
        console.log(chalk.green('\n북마클릿 최적화 완료'));
        
    } catch (err) {
        console.error(chalk.red('북마클릿 최적화 중 오류 발생:'), err);
        process.exit(1);
    }
}

// 실행
optimizeBookmarklet();