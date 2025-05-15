/**
 * 모듈 크기 분석 도구
 * 
 * 빌드된 모듈의 크기를 분석하고 보고서를 생성하는 스크립트
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 설정
const DIST_DIR = path.join(__dirname, '../dist/assets/js');
const OUTPUT_PATH = path.join(__dirname, '../dist/size-report.json');
const MAX_BOOKMARKLET_SIZE = 2083; // IE URL 제한

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 단위 크기
 * @return {string} 변환된 크기 문자열 (KB)
 */
function formatSize(bytes) {
    const kb = (bytes / 1024).toFixed(2);
    return `${kb} KB`;
}

/**
 * 모듈 크기를 분석하고 보고서 생성
 */
function analyzeSizes() {
    console.log(chalk.blue('모듈 크기 분석 시작...'));
    
    try {
        // 디렉토리 확인
        if (!fs.existsSync(DIST_DIR)) {
            console.error(chalk.red('dist 디렉토리가 존재하지 않습니다. 먼저 빌드를 실행하세요.'));
            process.exit(1);
        }
        
        const sizeReport = {
            modules: {},
            utilsModules: {},
            analyzerModules: {},
            uiModules: {},
            totalSize: 0,
            essentialSize: 0,
            lazyLoadSize: 0,
            bookmarkletSize: 0,
            date: new Date().toISOString()
        };
        
        // 메인 모듈 파일 분석
        const mainModuleFiles = ['bookmarklet.min.js', 'loader.min.js', 'core.min.js'];
        mainModuleFiles.forEach(filename => {
            const filePath = path.join(DIST_DIR, filename);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const size = stats.size;
                sizeReport.modules[filename] = size;
                sizeReport.totalSize += size;
                
                // 필수 모듈 크기 계산
                sizeReport.essentialSize += size;
                
                console.log(`${chalk.green(filename)}: ${formatSize(size)}`);
            }
        });
        
        // utils 모듈 분석
        const utilsDir = path.join(DIST_DIR, 'utils');
        if (fs.existsSync(utilsDir)) {
            fs.readdirSync(utilsDir).forEach(filename => {
                if (filename.endsWith('.min.js')) {
                    const filePath = path.join(utilsDir, filename);
                    const stats = fs.statSync(filePath);
                    const size = stats.size;
                    sizeReport.utilsModules[filename] = size;
                    sizeReport.totalSize += size;
                    
                    // parser와 observer는 필수 모듈로 간주
                    if (filename.includes('parser') || filename.includes('observer')) {
                        sizeReport.essentialSize += size;
                    } else {
                        sizeReport.lazyLoadSize += size;
                    }
                    
                    console.log(`${chalk.yellow('utils/' + filename)}: ${formatSize(size)}`);
                }
            });
        }
        
        // analyzer 모듈 분석
        const analyzerDir = path.join(DIST_DIR, 'analyzer');
        if (fs.existsSync(analyzerDir)) {
            fs.readdirSync(analyzerDir).forEach(filename => {
                if (filename.endsWith('.min.js')) {
                    const filePath = path.join(analyzerDir, filename);
                    const stats = fs.statSync(filePath);
                    const size = stats.size;
                    sizeReport.analyzerModules[filename] = size;
                    sizeReport.totalSize += size;
                    sizeReport.lazyLoadSize += size; // 모든 분석기는 지연 로드
                    
                    console.log(`${chalk.cyan('analyzer/' + filename)}: ${formatSize(size)}`);
                }
            });
        }
        
        // UI 모듈 분석
        const uiDir = path.join(DIST_DIR, 'ui');
        if (fs.existsSync(uiDir)) {
            fs.readdirSync(uiDir).forEach(filename => {
                if (filename.endsWith('.min.js')) {
                    const filePath = path.join(uiDir, filename);
                    const stats = fs.statSync(filePath);
                    const size = stats.size;
                    sizeReport.uiModules[filename] = size;
                    sizeReport.totalSize += size;
                    
                    // overlay는 필수, 나머지는 지연 로드
                    if (filename.includes('overlay')) {
                        sizeReport.essentialSize += size;
                    } else {
                        sizeReport.lazyLoadSize += size;
                    }
                    
                    console.log(`${chalk.magenta('ui/' + filename)}: ${formatSize(size)}`);
                }
            });
        }
        
        // 북마클릿 파일 분석
        const bookmarkletPath = path.join(__dirname, '../dist/bookmarklet.txt');
        if (fs.existsSync(bookmarkletPath)) {
            const bookmarkletContent = fs.readFileSync(bookmarkletPath, 'utf8');
            sizeReport.bookmarkletSize = bookmarkletContent.length;
            
            const sizePercent = (bookmarkletContent.length / MAX_BOOKMARKLET_SIZE * 100).toFixed(2);
            const sizeColor = bookmarkletContent.length > MAX_BOOKMARKLET_SIZE ? chalk.red : chalk.green;
            
            console.log(`${chalk.bold('북마클릿 URL 크기')}: ${sizeColor(formatSize(bookmarkletContent.length))} (${sizeColor(sizePercent)}% of ${MAX_BOOKMARKLET_SIZE} bytes)`);
        }
        
        // 요약 출력
        console.log('\n' + chalk.bold('요약:'));
        console.log(`${chalk.bold('총 크기')}: ${formatSize(sizeReport.totalSize)}`);
        console.log(`${chalk.bold('필수 모듈 크기')}: ${formatSize(sizeReport.essentialSize)}`);
        console.log(`${chalk.bold('지연 로드 모듈 크기')}: ${formatSize(sizeReport.lazyLoadSize)}`);
        
        // 보고서 저장
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sizeReport, null, 2));
        console.log(`\n${chalk.green('크기 보고서가 생성되었습니다')}: ${OUTPUT_PATH}`);
        
    } catch (err) {
        console.error(chalk.red('분석 중 오류 발생:'), err);
        process.exit(1);
    }
}

// 실행
analyzeSizes();