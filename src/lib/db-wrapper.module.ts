import { NgModule, ModuleWithProviders } from '@angular/core';
import { DbConfig, DBSchema } from './db-wrapper.models';
import { DB_CONFIG, provideDbWrapper, DbWrapperService, DB_SCHEMA } from './db-wrapper.service';

@NgModule()
export class DbWrapperModule {
  static forRoot(dbConfig: DbConfig, schema?: DBSchema): ModuleWithProviders {
    return {
      ngModule: DbWrapperModule,
      providers: [
        { provide: DB_CONFIG,  useValue: dbConfig },
        { provide: DB_SCHEMA, useValue: schema },
        { provide: DbWrapperService, useFactory: provideDbWrapper, deps: [DB_CONFIG, DB_SCHEMA] }
      ]
    };
  }

}
