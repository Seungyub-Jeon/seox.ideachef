# 한국어 웹사이트 분석기 북마클릿

이 프로젝트는 웹사이트의 SEO, 웹표준, 웹접근성을 즉시 분석하고 한국어로 상세한 보고서를 제공하는 북마클릿 도구입니다.

## 기능

- **빠른 페이지 분석**: 북마클릿 활성화 시 현재 페이지의 HTML 구조, 메타 태그, 콘텐츠 분석 즉시 실행
- **SEO 분석**: 제목 태그, 메타 설명, 헤딩 구조, 이미지 최적화, 내부/외부 링크, 키워드 밀도 등 평가
- **웹표준 검증**: HTML 유효성, 구조적 마크업, 시맨틱 태그 사용 여부 분석
- **웹접근성 점검**: 대체 텍스트, 키보드 접근성, 색상 대비, ARIA 속성, 문서 구조 등 접근성 요소 평가
- **종합 보고서 생성**: 분석 결과를 시각적으로 명확하게 표현하는 직관적인 대시보드 제공
- **실행 가능한 개선 제안**: 각 문제점에 대한 구체적인 해결 방법 제시
- **점수 시각화**: 각 영역별 점수 및 전체 성능을 백분율로 표시하여 직관적 이해 지원

## 시작하기

### 개발 환경 설정

1. 저장소 복제
   ```
   git clone https://github.com/yourusername/se-ideachef.git
   cd se-ideachef
   ```

2. 의존성 설치
   ```
   npm install
   ```

3. 개발 서버 실행
   ```
   npm run dev
   ```
   이제 `http://localhost:3000`에서 개발 버전을 확인할 수 있습니다.

### 빌드 방법

1. 프로덕션 빌드
   ```
   npm run build
   ```
   이 명령은 `/dist` 디렉토리에 최적화된 파일을 생성합니다.

2. 북마클릿 URL 생성
   ```
   npm run build:bookmarklet
   ```
   이 명령은 압축된 북마클릿 코드를 생성하고 index.html 파일에 삽입합니다.

## 프로젝트 구조

```
web-analyzer/
│
├── assets/
│   ├── css/
│   │   ├── main.css               # 메인 스타일시트
│   │   ├── overlay.css            # 오버레이 스타일
│   │   └── charts.css             # 차트 관련 스타일
│   │
│   ├── js/
│   │   ├── bookmarklet.js         # 북마클릿 소스 코드 (비압축)
│   │   ├── bookmarklet.min.js     # 압축된 북마클릿 코드
│   │   ├── analyzer/
│   │   │   ├── seo.js             # SEO 분석 모듈
│   │   │   ├── standards.js       # 웹표준 분석 모듈
│   │   │   ├── accessibility.js   # 웹접근성 분석 모듈
│   │   │   ├── performance.js     # 성능 분석 모듈
│   │   │   ├── security.js        # 보안 분석 모듈
│   │   │   └── mobile.js          # 모바일 친화성 분석 모듈
│   │   │
│   │   ├── ui/
│   │   │   ├── overlay.js         # 오버레이 UI 관리
│   │   │   ├── tabs.js            # 탭 인터페이스 관리
│   │   │   ├── charts.js          # 차트 렌더링
│   │   │   └── details.js         # 상세 정보 패널
│   │   │
│   │   └── utils/
│   │       ├── parser.js          # HTML 파싱 유틸리티
│   │       ├── css-parser.js      # CSS 파싱 유틸리티 
│   │       ├── score.js           # 점수 계산 유틸리티
│   │       └── report.js          # 보고서 생성 유틸리티
│   │
│   └── images/                    # 아이콘 및 이미지
│
├── scripts/                       # 빌드 및 개발 스크립트
│
├── dist/                          # 빌드된 파일
│
├── index.html                     # 메인 랜딩 페이지 (설치 안내)
├── webpack.config.js              # Webpack 설정
└── package.json                   # 프로젝트 정보 및 의존성
```

## 기여 방법

1. 이 저장소를 포크합니다.
2. 새 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`).
3. 변경 사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`).
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성합니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 문의

질문이나 제안이 있으시면 이슈를 생성하거나 다음 주소로 문의해 주세요: example@example.com