import { Component , OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
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

export class PlayerDashboard implements OnInit, AfterViewInit {
  @ViewChild('winChartCanvas') winChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('roleChartCanvas') roleChartCanvas?: ElementRef<HTMLCanvasElement>;
  
  sheetTitles: SheetsMetadata[] = [];
  selectedSheet?: string;
  searchQuery = '';
  winChart?: Chart;
  roleChart?: Chart;
  roleSortBy: 'category' | 'winrate' | 'games' = 'category';

  data?: PlayerSheetResponse;
  loading = false;
  error?: string;

  constructor(private sheetsService: SheetsAPIService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
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
      this.roleChartCanvas.nativeElement.height = 400;
      
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
                  
                  // Center the text vertically on the bar
                  const barCenterY = element.y + element.height / 2;
                  ctx.fillText(label, element.x, barCenterY);
                });
              }
            });
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
        // Ensure loading text disappears
        setTimeout(() => this.cdr.detectChanges(), 200);
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
}