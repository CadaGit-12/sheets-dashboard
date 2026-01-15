import { Component , OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SheetsAPI as SheetsAPIService } from '../../core/Services/sheets-api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard implements OnInit {

  data: any[] = [];
  loading = true;

  constructor(private sheetsAPI: SheetsAPIService) {}

  ngOnInit(): void {
    this.sheetsAPI.getSheetsData().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching sheets data:', error);
        this.loading = false;
      }
    });
  }

}