import { Component , OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SheetsAPI as SheetsAPIService } from '../../core/Services/sheets-api';
import { PlayerSheetResponse, SheetsMetadata } from '../../core/models/sheets.models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class PlayerDashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('winChartCanvas') winChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('roleChartCanvas') roleChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChartCanvas') categoryChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teamChartCanvas') teamChartCanvas?: ElementRef<HTMLCanvasElement>;
  
  sheetTitles: SheetsMetadata[] = [];
  selectedSheet?: string;
  searchQuery = '';
  winChart?: Chart;
  roleChart?: Chart;
  categoryChart?: Chart;
  teamChart?: Chart;
  roleSortBy: 'category' | 'winrate' | 'games' = 'category';

  data?: PlayerSheetResponse;
  loading = false;
  error?: string;
  backendHealth: 'loading' | 'ok' | 'error' = 'loading';
  private healthCheckInterval?: number;

  constructor(private sheetsService: SheetsAPIService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Check backend health and start polling
    this.checkBackendHealth();
    this.healthCheckInterval = window.setInterval(() => this.checkBackendHealth(), 30000);

    // Startup metadata fetch
    this.sheetsService.getMetadata().subscribe({
      next: meta => {
        console.log('Metadata fetched', meta);
        this.sheetTitles = meta;
        this.cdr.detectChanges();
      },
      error: err => console.error('Metadata fetch failed', err)
    });
  }

  ngAfterViewInit(): void {
    if (this.data) {
      this.createWinChart();
      this.createRoleChart();
      this.createCategoryChart();
      this.createTeamChart();
    }
  }

  getCategoryColor(category: string | null | undefined): string {
    if (!category) return '#999999'; // default gray for null/undefined
    const categoryLower = category.toLowerCase();
    if (categoryLower === 'townsfolk') return '#0066cc';
    if (categoryLower === 'outsider') return '#87ceeb';
    if (categoryLower === 'minion') return '#ffa500';
    if (categoryLower === 'demon') return '#cc0000';
    return '#999999'; // default gray
  }

  setSortBy(sortOption: 'category' | 'winrate' | 'games') {
    this.roleSortBy = sortOption;
    this.createRoleChart();
  }

  filteredPlayers() {
    if (!this.searchQuery) {
      return this.sheetTitles.map(sheet => sheet.title);
    }
    return this.sheetTitles
      .map(sheet => sheet.title)
      .filter(title => title.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  onSearchKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const filtered = this.filteredPlayers();
      if (filtered.length === 1 && filtered[0].toLowerCase() === this.searchQuery.toLowerCase()) {
        this.onPlayerSelect(filtered[0]);
      }
    }
  }

  createWinChart() {
    // Use a larger timeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (!this.data || !this.winChartCanvas?.nativeElement) return;

      const winrate = this.data.summary.overall_winrate;
      const games = this.data.summary.games_played;
      
      // Calculate wins and losses
      const wins = Math.round(games * winrate);
      const losses = games - wins;

      // Destroy existing chart if it exists
      if (this.winChart) {
        this.winChart.destroy();
      }

      const ctx = this.winChartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      this.winChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Wins', 'Losses'],
          datasets: [{
            data: [wins, losses],
            backgroundColor: winrate > 0 ? ['#0066cc', '#cc0000'] : ['#cc0000', '#cc0000'],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }, 100);
  }

  createRoleChart() {
    // Use a larger timeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (!this.data?.by_role || !this.roleChartCanvas?.nativeElement) return;

      // Destroy existing chart if it exists
      if (this.roleChart) {
        this.roleChart.destroy();
      }

      const roles = this.data.by_role;
      
      // Sort based on selected sort option
      let rolesSorted = [...roles];
      if (this.roleSortBy === 'winrate') {
        rolesSorted.sort((a, b) => b.winrate - a.winrate);
      } else if (this.roleSortBy === 'games') {
        rolesSorted.sort((a, b) => b.games - a.games);
      } else {
        // Sort by category (default)
        const categoryOrder: { [key: string]: number } = { townsfolk: 0, outsider: 1, minion: 2, demon: 3 };
        rolesSorted.sort((a, b) => {
          const catA = (a.category || '').toLowerCase();
          const catB = (b.category || '').toLowerCase();
          const orderA = categoryOrder[catA] ?? 999;
          const orderB = categoryOrder[catB] ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return b.winrate - a.winrate; // Secondary sort by winrate
        });
      }

      const ctx = this.roleChartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      // Calculate dynamic width based on number of roles
      const roleCount = rolesSorted.length;
      const minWidth = 800;
      const minBarWidth = 100;
      const chartWidth = Math.max(minWidth, roleCount * minBarWidth);
      
      // Set canvas width
      this.roleChartCanvas.nativeElement.width = chartWidth;
      this.roleChartCanvas.nativeElement.height = 450;
      
      const labels = rolesSorted.map(r => r.role);
      const winrates = rolesSorted.map(r => r.winrate);
      const games = rolesSorted.map(r => r.games);
      const colors = rolesSorted.map(r => {
        const color = this.getCategoryColor(r.category);
        return r.winrate < 0 ? '#ff6666' : color; // Lighter red for negative winrates
      });

      this.roleChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Winrate',
            data: winrates.map(w => Math.round(w * 10000) / 100), // Convert to percentage with 2 decimals
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            barPercentage: 0.8,
            categoryPercentage: 0.6
          }]
        },
        options: {
          indexAxis: 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const winrate = winrates[context.dataIndex];
                  const gameCount = games[context.dataIndex];
                  return `Winrate: ${(winrate * 100).toFixed(1)}%, Games: ${gameCount}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return (value as number).toFixed(0) + '%';
                }
              },
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              }
            },
            x: {
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              },
              ticks: {
                autoSkip: false,
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 11
                }
              }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (!meta.hidden) {
                meta.data.forEach((element: any, index: number) => {
                  const gameCount = games[index];
                  const label = gameCount.toString();
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  // Position text above if positive winrate, below if negative
                  const barCenterX = element.x;
                  const labelY = winrates[index] >= 0 ? element.y - 5 : element.y + 10;
                  ctx.fillText(label, barCenterX, labelY);
                });
              }
            });
          }
        },
        {
          id: 'zeroDots',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            const yAxis = chart.scales.y;
            const zeroPixel = yAxis.getPixelForValue(0);
            
            // Store dot positions for hover detection
            const dotPositions: { x: number; y: number; index: number }[] = [];
            
            chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (!meta.hidden) {
                meta.data.forEach((element: any, index: number) => {
                  // Check if winrate is 0
                  if (winrates[index] === 0) {
                    const dotX = element.x;
                    const dotY = zeroPixel;
                    const dotRadius = 2.5;
                    
                    dotPositions.push({ x: dotX, y: dotY, index: index });
                    
                    // Draw circle
                    ctx.fillStyle = colors[index];
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Draw border
                    ctx.strokeStyle = colors[index];
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }
                });
              }
            });
            
            // Store dot positions in chart for hover detection
            (chart as any).zeroDotPositions = dotPositions;
          }
        },
        {
          id: 'zeroLine',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            const yAxis = chart.scales.y;
            const zeroPixel = yAxis.getPixelForValue(0);
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(chart.chartArea.left, zeroPixel);
            ctx.lineTo(chart.chartArea.right, zeroPixel);
            ctx.stroke();
          }
        }]
      });
      
      // Add hover listener for zero dots
      const canvas = this.roleChartCanvas?.nativeElement;
      if (canvas) {
        canvas.addEventListener('mousemove', (event: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          
          const dotPositions = (this.roleChart as any)?.zeroDotPositions || [];
          let foundDot = false;
          
          for (const dot of dotPositions) {
            const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
            if (distance <= 5) {
              // Dot hovered, show tooltip
              if (this.roleChart) {
                this.roleChart.setActiveElements([{ datasetIndex: 0, index: dot.index }]);
                this.roleChart.draw();
              }
              foundDot = true;
              break;
            }
          }
          
          if (!foundDot) {
            // No dot hovered, clear tooltip
            if (this.roleChart) {
              this.roleChart.setActiveElements([]);
              this.roleChart.draw();
            }
          }
        });
      }
    }, 100);
  }

  createCategoryChart() {
    // Use a larger timeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (!this.data?.by_category || !this.categoryChartCanvas?.nativeElement) return;

      // Destroy existing chart if it exists
      if (this.categoryChart) {
        this.categoryChart.destroy();
      }

      const categoryData = this.data.by_category;
      
      // Fixed order for categories
      const categoryOrder: { [key: string]: number } = { 
        townsfolk: 0, 
        outsider: 1, 
        minion: 2, 
        demon: 3 
      };
      
      let categoriesSorted = [...categoryData];
      categoriesSorted.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        const orderA = categoryOrder[catA] ?? 999;
        const orderB = categoryOrder[catB] ?? 999;
        return orderA - orderB;
      });

      const ctx = this.categoryChartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      const labels = categoriesSorted.map(c => c.category);
      const winrates = categoriesSorted.map(c => c.winrate);
      const games = categoriesSorted.map(c => c.games);
      const colors = categoriesSorted.map(c => {
        const catLower = (c.category || '').toLowerCase();
        if (catLower === 'townsfolk') return '#0066cc';
        if (catLower === 'outsider') return '#87ceeb';
        if (catLower === 'minion') return '#ffa500';
        if (catLower === 'demon') return '#cc0000';
        return '#999999';
      });

      this.categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Winrate',
            data: winrates.map(w => Math.round(w * 10000) / 100),
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            barPercentage: 0.8,
            categoryPercentage: 0.6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const winrate = winrates[context.dataIndex];
                  const gameCount = games[context.dataIndex];
                  return `Winrate: ${(winrate * 100).toFixed(1)}%, Games: ${gameCount}`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return (value as number).toFixed(0) + '%';
                }
              },
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              }
            },
            y: {
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (!meta.hidden) {
                meta.data.forEach((element: any, index: number) => {
                  const gameCount = games[index];
                  const label = gameCount.toString();
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'middle';
                  
                  // Position text immediately to the right of the bar
                  const textX = element.x + 5;
                  const barCenterY = element.y;
                  ctx.fillText(label, textX, barCenterY);
                });
              }
            });
          }
        },
        {
          id: 'zeroLine',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const zeroPixel = xAxis.getPixelForValue(0);
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(zeroPixel, chart.chartArea.top);
            ctx.lineTo(zeroPixel, chart.chartArea.bottom);
            ctx.stroke();
          }
        }]
      });
    }, 100);
  }

  createTeamChart() {
    // Use a larger timeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (!this.data?.by_team || !this.teamChartCanvas?.nativeElement) return;

      // Destroy existing chart if it exists
      if (this.teamChart) {
        this.teamChart.destroy();
      }

      const teamData = this.data.by_team;
      
      // Fixed order for teams
      const teamOrder: { [key: string]: number } = { 
        good: 0, 
        evil: 1
      };
      
      let teamsSorted = [...teamData];
      teamsSorted.sort((a, b) => {
        const teamA = (a.team || '').toLowerCase();
        const teamB = (b.team || '').toLowerCase();
        const orderA = teamOrder[teamA] ?? 999;
        const orderB = teamOrder[teamB] ?? 999;
        return orderA - orderB;
      });

      const ctx = this.teamChartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      const labels = teamsSorted.map(t => t.team);
      const winrates = teamsSorted.map(t => t.winrate);
      const games = teamsSorted.map(t => t.games);
      const colors = teamsSorted.map(t => {
        const teamLower = (t.team || '').toLowerCase();
        if (teamLower === 'good') return '#0066cc';
        if (teamLower === 'evil') return '#cc0000';
        return '#999999';
      });

      this.teamChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Winrate',
            data: winrates.map(w => Math.round(w * 10000) / 100),
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            barPercentage: 0.8,
            categoryPercentage: 0.6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const winrate = winrates[context.dataIndex];
                  const gameCount = games[context.dataIndex];
                  return `Winrate: ${(winrate * 100).toFixed(1)}%, Games: ${gameCount}`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return (value as number).toFixed(0) + '%';
                }
              },
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              }
            },
            y: {
              grid: {
                lineWidth: 2,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              border: {
                width: 4,
                color: 'rgba(0, 0, 0, 0.3)'
              }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (!meta.hidden) {
                meta.data.forEach((element: any, index: number) => {
                  const gameCount = games[index];
                  const label = gameCount.toString();
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'middle';
                  
                  // Position text immediately to the right of the bar
                  const textX = element.x + 5;
                  const barCenterY = element.y;
                  ctx.fillText(label, textX, barCenterY);
                });
              }
            });
          }
        },
        {
          id: 'zeroLine',
          afterDatasetsDraw(chart: any) {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const zeroPixel = xAxis.getPixelForValue(0);
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(zeroPixel, chart.chartArea.top);
            ctx.lineTo(zeroPixel, chart.chartArea.bottom);
            ctx.stroke();
          }
        }]
      });
    }, 100);
  }

  onPlayerSelect(title: string) {
    this.searchQuery = '';
    this.onSheetChange(title);
  }

  onSheetChange(title: string) {
    this.selectedSheet = title;
    this.loading = true;
    this.error = undefined;
    console.log(`Requesting data for sheet: ${title}`);

    this.sheetsService.getPlayerSheet(title).subscribe({
      next: res => {
        console.log('Sheet data received successfully:', res);
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
        // Create charts after data is rendered
        this.createWinChart();
        this.createRoleChart();
        this.createCategoryChart();
        this.createTeamChart();
      },
      error: err => {
        console.error('Sheet fetch error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Full error object:', err);
        this.loading = false;
        this.error = 'Failed to load sheet data. The request may have timed out. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  checkBackendHealth(): void {
    this.sheetsService.getMetadata().subscribe({
      next: () => {
        this.backendHealth = 'ok';
        this.cdr.detectChanges();
      },
      error: () => {
        this.backendHealth = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}