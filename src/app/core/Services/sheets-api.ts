import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlayerSheetResponse, SheetsMetadata } from '../models/sheets.models';

@Injectable({
  providedIn: 'root',
})
export class SheetsAPI {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Startup metadata call */
  getMetadata(): Observable<SheetsMetadata[]> {
    return this.http.get<SheetsMetadata[]>(`${this.apiUrl}/metadata`);
  }

  /** Lazy-load single player sheet */
  getPlayerSheet(sheetTitle: string): Observable<PlayerSheetResponse> {
    return this.http.get<PlayerSheetResponse>(
      `${this.apiUrl}/sheets/${encodeURIComponent(sheetTitle)}`
    );
  }
}
