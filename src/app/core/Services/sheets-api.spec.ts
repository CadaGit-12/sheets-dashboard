import { TestBed } from '@angular/core/testing';

import { SheetsAPI } from './sheets-api';

describe('SheetsAPI', () => {
  let service: SheetsAPI;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SheetsAPI);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
