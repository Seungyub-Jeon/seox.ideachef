/**
 * 보고서 저장 및 공유 관련 서비스
 * 클라이언트-서버 통신을 담당하는 모듈
 */
class ReportService {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'server/api.php';
    this.lastError = null;
  }

  /**
   * 보고서를 서버에 저장하는 함수
   * @param {Object} report 저장할 보고서 데이터
   * @returns {Promise<Object>} 저장 결과 (ID 포함)
   */
  async saveReport(report) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_report',
          report: report
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '보고서 저장 실패');
      }
      
      return {
        success: true,
        id: result.id
      };
    } catch (error) {
      this.lastError = error.message;
      console.error('보고서 저장 오류:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 저장된 보고서를 불러오는 함수
   * @param {string} id 보고서 ID
   * @returns {Promise<Object>} 보고서 데이터
   */
  async getReport(id) {
    try {
      const response = await fetch(`${this.apiUrl}?action=get_report&id=${id}`);
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      console.error('보고서 불러오기 오류:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * 서버 측 분석을 요청하는 함수
   * @param {string} url 분석할 URL
   * @returns {Promise<Object>} 서버 분석 결과
   */
  async requestServerAnalysis(url) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'analyze',
          url: url
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      console.error('서버 분석 오류:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * 보고서를 공유하는 함수
   * @param {string} reportId 보고서 ID
   * @param {Object} options 공유 옵션 (만료 시간 등)
   * @returns {Promise<Object>} 공유 결과 (공유 URL 포함)
   */
  async shareReport(reportId, options = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'share_report',
          id: reportId,
          options: options
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '보고서 공유 실패');
      }
      
      return {
        success: true,
        shareId: result.share_id,
        url: result.url,
        expiresAt: result.expires_at
      };
    } catch (error) {
      this.lastError = error.message;
      console.error('보고서 공유 오류:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 보고서를 PDF로 다운로드하는 함수
   * @param {string} reportId 보고서 ID
   * @returns {Promise<Object>} 다운로드 결과
   */
  async downloadReportAsPdf(reportId) {
    try {
      // PDF 생성이 준비되면 실제 코드로 대체
      const url = `${this.apiUrl}?action=download_pdf&id=${reportId}`;
      
      // 새 창에서 PDF 열기
      window.open(url, '_blank');
      
      return {
        success: true
      };
    } catch (error) {
      this.lastError = error.message;
      console.error('PDF 다운로드 오류:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 소셜 미디어에 보고서를 공유하는 함수
   * @param {string} platform 공유할 플랫폼 (twitter, facebook 등)
   * @param {string} shareUrl 공유할 URL
   * @param {string} title 공유 제목
   */
  shareSocial(platform, shareUrl, title) {
    // 인코딩된 URL 및 제목
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    
    let url = '';
    
    switch (platform.toLowerCase()) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'kakaotalk':
        // Kakao SDK가 필요합니다
        if (window.Kakao) {
          window.Kakao.Link.sendDefault({
            objectType: 'feed',
            content: {
              title: title,
              description: '한국 웹 분석기 보고서',
              imageUrl: 'https://your-domain.com/assets/images/logo.png',
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl
              }
            },
            buttons: [
              {
                title: '보고서 보기',
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl
                }
              }
            ]
          });
          return {
            success: true
          };
        } else {
          throw new Error('Kakao SDK가 로드되지 않았습니다.');
        }
      default:
        throw new Error('지원하지 않는 플랫폼입니다.');
    }
    
    // 새 창에서 공유 URL 열기
    window.open(url, '_blank', 'width=600,height=450');
    
    return {
      success: true
    };
  }

  /**
   * 마지막 오류 메시지를 가져오는 함수
   * @returns {string} 마지막 오류 메시지
   */
  getLastError() {
    return this.lastError;
  }
}

// 전역으로 내보내기
window.ReportService = ReportService;