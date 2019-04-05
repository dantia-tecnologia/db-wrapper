import { TestBed } from '@angular/core/testing';

import { DbWrapperService } from './db-wrapper.service';

describe('DbWrapperService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DbWrapperService = TestBed.get(DbWrapperService);
    expect(service).toBeTruthy();
  });
});
