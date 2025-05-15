<?php
/**
 * 통계 컴포넌트 템플릿
 * 분석 통계를 시각화하는 컴포넌트
 */

// 페이지 직접 접근 방지
if (!defined('INCLUDED')) {
  header('HTTP/1.0 403 Forbidden');
  exit;
}

include_once __DIR__ . '/../../lib/stats.php';

// 통계 데이터 가져오기
$generalStats = getStatistics('general');
$dailyStats = getStatistics('daily');
$analyticsStats = getAnalyticsStatistics();

?>

<div class="stats-container">
  <h2>분석 통계</h2>
  
  <div class="stats-summary">
    <div class="stats-card">
      <div class="stats-card-title">총 분석 횟수</div>
      <div class="stats-card-value"><?php echo $generalStats['total']['report_saved'] ?? 0; ?></div>
    </div>
    
    <div class="stats-card">
      <div class="stats-card-title">총 보고서 열람 횟수</div>
      <div class="stats-card-value"><?php echo $generalStats['total']['report_viewed'] ?? 0; ?></div>
    </div>
    
    <div class="stats-card">
      <div class="stats-card-title">총 보고서 공유 횟수</div>
      <div class="stats-card-value"><?php echo $generalStats['total']['report_shared'] ?? 0; ?></div>
    </div>
  </div>
  
  <h3>일일 통계</h3>
  
  <div class="stats-chart">
    <canvas id="dailyStatsChart"></canvas>
  </div>
  
  <h3>평균 점수</h3>
  
  <div class="stats-scores">
    <div class="score-item">
      <div class="score-label">전체 평균</div>
      <div class="score-bar">
        <div class="score-fill" style="width: <?php echo $analyticsStats['overall']['average']; ?>%;">
          <?php echo $analyticsStats['overall']['average']; ?>
        </div>
      </div>
    </div>
    
    <div class="score-item">
      <div class="score-label">성능 평균</div>
      <div class="score-bar">
        <div class="score-fill" style="width: <?php echo $analyticsStats['performance']['average']; ?>%;">
          <?php echo $analyticsStats['performance']['average']; ?>
        </div>
      </div>
    </div>
    
    <div class="score-item">
      <div class="score-label">모바일 평균</div>
      <div class="score-bar">
        <div class="score-fill" style="width: <?php echo $analyticsStats['mobile']['average']; ?>%;">
          <?php echo $analyticsStats['mobile']['average']; ?>
        </div>
      </div>
    </div>
    
    <div class="score-item">
      <div class="score-label">보안 평균</div>
      <div class="score-bar">
        <div class="score-fill" style="width: <?php echo $analyticsStats['security']['average']; ?>%;">
          <?php echo $analyticsStats['security']['average']; ?>
        </div>
      </div>
    </div>
  </div>
  
  <h3>가장 흔한 문제점</h3>
  
  <div class="common-issues">
    <ul class="issues-list">
      <?php foreach ($analyticsStats['common_issues'] as $issue): ?>
      <li class="issue-item <?php echo $issue['severity']; ?>">
        <span class="issue-count"><?php echo $issue['count']; ?>회</span>
        <span class="issue-category"><?php echo htmlspecialchars($issue['category']); ?></span>
        <span class="issue-description"><?php echo htmlspecialchars($issue['description']); ?></span>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
</div>

<script>
  // 일일 통계 차트 생성
  const dailyData = <?php echo json_encode($dailyStats['daily'] ?? []); ?>;
  const chartLabels = Object.keys(dailyData).reverse();
  const savedData = chartLabels.map(date => dailyData[date].report_saved || 0);
  const viewedData = chartLabels.map(date => dailyData[date].report_viewed || 0);
  const sharedData = chartLabels.map(date => dailyData[date].report_shared || 0);
  
  const ctx = document.getElementById('dailyStatsChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: '분석 횟수',
          data: savedData,
          borderColor: '#4285f4',
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          tension: 0.1
        },
        {
          label: '열람 횟수',
          data: viewedData,
          borderColor: '#34a853',
          backgroundColor: 'rgba(52, 168, 83, 0.1)',
          tension: 0.1
        },
        {
          label: '공유 횟수',
          data: sharedData,
          borderColor: '#fbbc05',
          backgroundColor: 'rgba(251, 188, 5, 0.1)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '일일 사용량 통계'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
</script>

<style>
  .stats-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Noto Sans KR', sans-serif;
  }
  
  .stats-summary {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
  }
  
  .stats-card {
    flex: 1;
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 20px;
    margin: 0 10px;
    text-align: center;
  }
  
  .stats-card-title {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
  }
  
  .stats-card-value {
    font-size: 28px;
    font-weight: bold;
    color: #4285f4;
  }
  
  .stats-chart {
    margin-bottom: 30px;
    height: 300px;
  }
  
  .stats-scores {
    margin-bottom: 30px;
  }
  
  .score-item {
    margin-bottom: 15px;
  }
  
  .score-label {
    font-size: 14px;
    margin-bottom: 5px;
  }
  
  .score-bar {
    background-color: #f0f0f0;
    border-radius: 4px;
    height: 24px;
    overflow: hidden;
  }
  
  .score-fill {
    background-color: #4285f4;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 10px;
    color: white;
    font-size: 12px;
    font-weight: bold;
    transition: width 0.5s ease;
  }
  
  .common-issues {
    margin-bottom: 30px;
  }
  
  .issues-list {
    list-style-type: none;
    padding: 0;
  }
  
  .issue-item {
    padding: 10px;
    margin-bottom: 10px;
    border-left: 4px solid #ccc;
    background-color: #f9f9f9;
  }
  
  .issue-item.critical,
  .issue-item.high {
    border-left-color: #ea4335;
  }
  
  .issue-item.major,
  .issue-item.medium {
    border-left-color: #fbbc05;
  }
  
  .issue-item.minor,
  .issue-item.low {
    border-left-color: #34a853;
  }
  
  .issue-count {
    display: inline-block;
    background-color: #4285f4;
    color: white;
    border-radius: 4px;
    padding: 2px 6px;
    margin-right: 10px;
    font-size: 12px;
  }
  
  .issue-category {
    font-weight: bold;
    margin-right: 10px;
    color: #666;
  }
</style>