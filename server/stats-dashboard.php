<?php
/**
 * 통계 대시보드 페이지
 * 분석 통계 정보를 시각화하여 보여주는 대시보드
 */

// 포함 여부 확인 변수
define('INCLUDED', true);

// 필요한 라이브러리 로드
require_once 'lib/stats.php';
?>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>한국 웹 분석기 - 통계 대시보드</title>
    <link rel="stylesheet" href="../assets/css/main.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Noto Sans KR', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .dashboard-header {
            background-color: #4285f4;
            color: white;
            text-align: center;
            padding: 30px 0;
            margin-bottom: 30px;
        }
        
        .dashboard-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .dashboard-subtitle {
            font-size: 16px;
            opacity: 0.8;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .dashboard-content {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin-bottom: 30px;
        }
        
        .dashboard-section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        
        .footer {
            text-align: center;
            padding: 20px 0;
            color: #666;
            font-size: 14px;
            margin-top: 40px;
        }
        
        .tab-container {
            margin-bottom: 30px;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }
        
        .tab.active {
            border-bottom-color: #4285f4;
            color: #4285f4;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="dashboard-header">
        <div class="container">
            <div class="dashboard-title">한국 웹 분석기 통계 대시보드</div>
            <div class="dashboard-subtitle">웹사이트 분석 통계 및 인사이트</div>
        </div>
    </div>
    
    <div class="container">
        <div class="dashboard-content">
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-tab="overview">개요</div>
                    <div class="tab" data-tab="performance">성능</div>
                    <div class="tab" data-tab="mobile">모바일</div>
                    <div class="tab" data-tab="security">보안</div>
                    <div class="tab" data-tab="trends">트렌드</div>
                </div>
                
                <div class="tab-content active" id="overview-tab">
                    <div class="dashboard-section">
                        <div class="section-title">전체 통계</div>
                        <?php include 'templates/components/stats.php'; ?>
                    </div>
                </div>
                
                <div class="tab-content" id="performance-tab">
                    <div class="dashboard-section">
                        <div class="section-title">성능 분석 통계</div>
                        <div class="chart-container">
                            <h3>성능 점수 분포</h3>
                            <canvas id="performanceDistChart"></canvas>
                        </div>
                        
                        <div class="issues-container">
                            <h3>가장 흔한 성능 이슈</h3>
                            <ul class="issues-list">
                                <?php
                                $performanceIssues = array_filter($analyticsStats['common_issues'], function($issue) {
                                    return $issue['category'] === 'performance';
                                });
                                foreach ($performanceIssues as $issue):
                                ?>
                                <li class="issue-item <?php echo $issue['severity']; ?>">
                                    <span class="issue-count"><?php echo $issue['count']; ?>회</span>
                                    <span class="issue-description"><?php echo htmlspecialchars($issue['description']); ?></span>
                                </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="mobile-tab">
                    <div class="dashboard-section">
                        <div class="section-title">모바일 분석 통계</div>
                        <div class="chart-container">
                            <h3>모바일 점수 분포</h3>
                            <canvas id="mobileDistChart"></canvas>
                        </div>
                        
                        <div class="issues-container">
                            <h3>가장 흔한 모바일 이슈</h3>
                            <ul class="issues-list">
                                <?php
                                $mobileIssues = array_filter($analyticsStats['common_issues'], function($issue) {
                                    return $issue['category'] === 'mobile';
                                });
                                foreach ($mobileIssues as $issue):
                                ?>
                                <li class="issue-item <?php echo $issue['severity']; ?>">
                                    <span class="issue-count"><?php echo $issue['count']; ?>회</span>
                                    <span class="issue-description"><?php echo htmlspecialchars($issue['description']); ?></span>
                                </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="security-tab">
                    <div class="dashboard-section">
                        <div class="section-title">보안 분석 통계</div>
                        <div class="chart-container">
                            <h3>보안 점수 분포</h3>
                            <canvas id="securityDistChart"></canvas>
                        </div>
                        
                        <div class="issues-container">
                            <h3>가장 흔한 보안 이슈</h3>
                            <ul class="issues-list">
                                <?php
                                $securityIssues = array_filter($analyticsStats['common_issues'], function($issue) {
                                    return $issue['category'] === 'security';
                                });
                                foreach ($securityIssues as $issue):
                                ?>
                                <li class="issue-item <?php echo $issue['severity']; ?>">
                                    <span class="issue-count"><?php echo $issue['count']; ?>회</span>
                                    <span class="issue-description"><?php echo htmlspecialchars($issue['description']); ?></span>
                                </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="trends-tab">
                    <div class="dashboard-section">
                        <div class="section-title">점수 트렌드</div>
                        <div class="chart-container">
                            <h3>월별 평균 점수 트렌드</h3>
                            <canvas id="scoresTrendChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <div class="container">
            &copy; 2023 한국 웹 분석기. 모든 권리 보유.
        </div>
    </div>
    
    <script>
        // 탭 기능
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // 현재 활성 탭 제거
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // 클릭한 탭 활성화
                this.classList.add('active');
                document.getElementById(this.dataset.tab + '-tab').classList.add('active');
            });
        });
        
        // 점수 분포 차트 데이터
        const performanceDist = <?php echo json_encode($analyticsStats['performance']['distribution'] ?? []); ?>;
        const mobileDist = <?php echo json_encode($analyticsStats['mobile']['distribution'] ?? []); ?>;
        const securityDist = <?php echo json_encode($analyticsStats['security']['distribution'] ?? []); ?>;
        
        // 성능 점수 분포 차트
        const perfCtx = document.getElementById('performanceDistChart').getContext('2d');
        new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(performanceDist),
                datasets: [{
                    label: '웹사이트 수',
                    data: Object.values(performanceDist),
                    backgroundColor: '#4285f4'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        // 모바일 점수 분포 차트
        const mobileCtx = document.getElementById('mobileDistChart').getContext('2d');
        new Chart(mobileCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(mobileDist),
                datasets: [{
                    label: '웹사이트 수',
                    data: Object.values(mobileDist),
                    backgroundColor: '#34a853'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        // 보안 점수 분포 차트
        const securityCtx = document.getElementById('securityDistChart').getContext('2d');
        new Chart(securityCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(securityDist),
                datasets: [{
                    label: '웹사이트 수',
                    data: Object.values(securityDist),
                    backgroundColor: '#ea4335'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        // 월별 데이터 (예시 데이터)
        const monthlyData = {
            labels: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06'],
            datasets: [
                {
                    label: '전체 점수',
                    data: [68, 70, 73, 75, 78, 80],
                    borderColor: '#4285f4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    tension: 0.1
                },
                {
                    label: '성능 점수',
                    data: [72, 74, 76, 78, 81, 83],
                    borderColor: '#34a853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    tension: 0.1
                },
                {
                    label: '모바일 점수',
                    data: [65, 68, 70, 74, 76, 79],
                    borderColor: '#fbbc05',
                    backgroundColor: 'rgba(251, 188, 5, 0.1)',
                    tension: 0.1
                },
                {
                    label: '보안 점수',
                    data: [70, 72, 75, 77, 79, 82],
                    borderColor: '#ea4335',
                    backgroundColor: 'rgba(234, 67, 53, 0.1)',
                    tension: 0.1
                }
            ]
        };
        
        // 월별 점수 트렌드 차트
        const trendsCtx = document.getElementById('scoresTrendChart').getContext('2d');
        new Chart(trendsCtx, {
            type: 'line',
            data: monthlyData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '최근 6개월 평균 점수 트렌드'
                    }
                },
                scales: {
                    y: {
                        min: 50,
                        max: 100
                    }
                }
            }
        });
    </script>
</body>
</html>