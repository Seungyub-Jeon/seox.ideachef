/**
 * 북마클릿 URL 생성 스크립트
 * 
 * loader.min.js 파일을 읽고 북마클릿 URL로 변환하여 index.html에 삽입합니다.
 */

const fs = require('fs');
const path = require('path');

// 파일 경로 설정
const loaderPath = path.join(__dirname, '../dist/assets/js/loader.min.js');
const indexPath = path.join(__dirname, '../dist/index.html');

// 버전 가져오기
const packageJson = require('../package.json');
const version = packageJson.version;

function generateBookmarklet() {
  console.log('북마클릿 URL 생성 중...');
  
  try {
    // loader.min.js 파일 읽기
    if (!fs.existsSync(loaderPath)) {
      console.error(`오류: ${loaderPath} 파일을 찾을 수 없습니다. 먼저 'npm run build'를 실행해 주세요.`);
      process.exit(1);
    }
    
    let loaderCode = fs.readFileSync(loaderPath, 'utf8');
    
    // 북마클릿 URL 형식으로 변환
    const bookmarkletUrl = `javascript:${encodeURIComponent(loaderCode)}`;
    
    console.log(`북마클릿 URL 생성 완료 (길이: ${bookmarkletUrl.length} 자)`);
    
    // index.html 파일이 존재하는지 확인
    if (!fs.existsSync(indexPath)) {
      console.error(`오류: ${indexPath} 파일을 찾을 수 없습니다. 먼저 'npm run build'를 실행해 주세요.`);
      process.exit(1);
    }
    
    // index.html 파일 읽기
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    
    // 북마클릿 링크 찾아 교체
    const bookmarkletLinkRegex = /<a href="javascript:.*?" class="bookmarklet">/;
    if (!bookmarkletLinkRegex.test(indexHtml)) {
      console.error('오류: index.html 파일에서 북마클릿 링크를 찾을 수 없습니다.');
      process.exit(1);
    }
    
    // 북마클릿 링크 교체
    indexHtml = indexHtml.replace(bookmarkletLinkRegex, `<a href="${bookmarkletUrl}" class="bookmarklet">`);
    
    // 버전 교체
    indexHtml = indexHtml.replace(/버전: [0-9.]+/g, `버전: ${version}`);
    
    // 파일 저장
    fs.writeFileSync(indexPath, indexHtml);
    
    console.log(`index.html 파일에 북마클릿 URL 삽입 완료 (버전: ${version})`);
    
  } catch (err) {
    console.error('북마클릿 URL 생성 중 오류 발생:', err);
    process.exit(1);
  }
}

// 실행
generateBookmarklet();