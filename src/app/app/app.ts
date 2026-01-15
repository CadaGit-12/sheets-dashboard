import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SheetsAPI as SheetsAPIService } from '../core/Services/sheets-api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
  template: `
    <h1>Angular → Backend Debug</h1>

    <p *ngIf="loading">Loading data...</p>

    <pre *ngIf="data">{{ data | json }}</pre>

    <p *ngIf="error" style="color:red">
      Error: {{ error }}
    </p>
  `
})
export class App implements OnInit {
  data: any = null;
  loading = true;
  error: string | null = null;

  constructor(private sheetsApi: SheetsAPIService) {}

  ngOnInit(): void {
    this.sheetsApi.getSheetsData().subscribe({
      next: (res: any) => {
        console.log('API RESPONSE:', res);
        this.data = res;
        this.loading = false;
      },
      error: (err: { message: string; }) => {
        console.error('API ERROR:', err);
        this.error = err.message || 'Unknown error';
        this.loading = false;
      }
    });
  }
}
