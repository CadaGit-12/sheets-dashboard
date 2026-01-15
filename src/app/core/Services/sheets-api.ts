import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SheetsAPI {
  private apiUrl = 'https://angular-project-backend.onrender.com';

  constructor(private http: HttpClient) {}

  getSheetsData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sheets`);
  }
}
