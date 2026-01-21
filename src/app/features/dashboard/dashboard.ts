import { Component , OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SheetsAPI as SheetsAPIService } from '../../core/Services/sheets-api';
import { PlayerSheetResponse } from '../../core/models/sheets.models';

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-dashboard.html',
  styleUrl: './player-dashboard.css',
})

export class PlayerDashboard implements OnInit {
  sheetTitles: string[] = [];
  selectedSheet?: string;

  data?: PlayerSheetResponse;
  loading = false;

  constructor(private sheetsService: SheetsAPIService) {}

  ngOnInit(): void {
    // Startup metadata fetch
    this.sheetsService.getMetadata().subscribe({
      next: titles => this.sheetTitles = titles,
      error: err => console.error('Metadata fetch failed', err)
    });
  }

  onSheetChange(title: string) {
    this.selectedSheet = title;
    this.loading = true;

    this.sheetsService.getPlayerSheet(title).subscribe({
      next: res => {
        this.data = res;
        this.loading = false;
      },
      error: err => {
        console.error('Sheet fetch error', err);
        this.loading = false;
      }
    });
  }
  

}