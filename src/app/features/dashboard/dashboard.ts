import { Component , OnInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SheetsAPI as SheetsAPIService } from '../../core/Services/sheets-api';
import { PlayerSheetResponse, SheetsMetadata } from '../../core/models/sheets.models';

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class PlayerDashboard implements OnInit {
  sheetTitles: SheetsMetadata[] = [];
  selectedSheet?: string;

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