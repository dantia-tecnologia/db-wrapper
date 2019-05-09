import { InjectionToken } from '@angular/core';
import { WindowService } from './window.service';
import { DBTable, DbConfig, DBSchema, DBView,
  DBColumn, DBUnique, DBForeign, SqlTransaction, SqlResultSet, SqlError, DefaultType } from './db-wrapper.models';

export class DbWrapperService {
  private _dbName: string;
  private _location: string;
  private _iosDatabaseLocation: string;
  schema: DBSchema;
  db: any;

  constructor(dbConfig: DbConfig, dbSchema?: DBSchema) {

    this._dbName = dbConfig.dbName;
    this._location = dbConfig.location;
    this._iosDatabaseLocation = dbConfig.iosDatabaseLocation;
    this.init();
    if (dbSchema) {
      this.generate(dbSchema).catch(err => {
        throw new Error( err.message);
      });
    }
  }

  init(): void {
    const window = (new WindowService()).nativeWindow;
    if (typeof window.cordova === 'undefined') {
        this.db = window.openDatabase(this._dbName, '1.0', 'database', -1);
    } else {
        this.db = window.sqlitePlugin.openDatabase({
            name: this._dbName,
            location: this._location,
            androidLockWorkaround: 1
        });
    }
  }

  generate(schema: DBSchema): Promise<any> {

    const sentences = [];
    this.schema = schema;

    schema.tables.forEach(table => {
      sentences.push(this.createTable(table));
    });
    if (schema.views) {
      schema.views.forEach( view => {
        sentences.push(this.createView(view));
      });
    }
    return Promise.all(sentences);
  }

  createTable(table: DBTable): Promise<any> {
    let sql = '', sentences = [], onConflictPrimary;

    table.columns.forEach(col => {
      sentences.push(this.defColumn(col));
    });

    onConflictPrimary = 'on conflict fail';

    if (Array.isArray(table.primary) )  {
      sentences.push (' CONSTRAINT identificador PRIMARY KEY (' + table.primary.join(',') + ') ' + onConflictPrimary );
    }
    if (typeof table.primary === 'string')   {
      sentences.push (' CONSTRAINT identificador PRIMARY KEY (' + table.primary + ') ' + onConflictPrimary );
    }
    if (table.uniques) {
      table.uniques.forEach( uniq => {
        sentences.push(this.defUnique(uniq));
      });
    }

    if (table.foreigns) {
      table.foreigns.forEach ( fore => {
        sentences.push(this.defForeign(fore));
      });
    }

    sql = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + sentences.join(',') +')';

    return this.query(sql);
  }


  createView(view: DBView): Promise<any> {
    let sql: string;

    sql = 'CREATE VIEW IF NOT EXISTS ' + view.name
      + ' AS ' + view.sql;

    return this.query(sql);

  }

  getSchemaTable(tableName: string): DBTable {
    let res: DBTable;

    this.schema.tables.forEach( table => {
      if (table.name === tableName) {
        res = table;
      }
    });
    return res;

  }

  getUniquesTable(table: DBTable): Object {
    let res: {};
    table.uniques.forEach(uniq => {
      res[uniq.name] = uniq;
    });
    return res;
  }

  query(query: string, bindings: any[]= []): Promise<SqlResultSet> {
    return new Promise((resolve, reject) => {
      if (query.indexOf('select') === 0) {
        this.db.readTransaction((transaction: SqlTransaction) => {
            transaction.executeSql(query, bindings, (transaction: SqlTransaction, result: SqlResultSet) => {
                resolve(result);
            }, (transaction: SqlTransaction, error: SqlError) => {
                reject(error);
            });
        }, (err: SqlError) => reject(err) );
      } else {
        this.db.transaction((transaction: SqlTransaction) => {
            transaction.executeSql(query, bindings, (transaction: SqlTransaction, result: SqlResultSet) => {
                resolve(result);
            }, (transaction: SqlTransaction, error: SqlError) => {
                reject(error);
            });
        }, (err: SqlError) => reject(err) );
      }
    });
  }

  Count(query: string, bindings: any[]= []): Promise<number> {
    return this.query(query, bindings).then(rows => {
        return this.rowsCount(rows);
    });
  }

  insert(table: string, bindings: {}): Promise<SqlResultSet> {
    let sql = '', sqlBinds = [], sqlKeys = [], sqlValues = [] ;

    sql = sql + 'insert into ' + table + ' ';

    for (const index in bindings) {
       if (bindings.hasOwnProperty(index)) {
            sqlKeys.push(index);
            sqlValues.push(bindings[index]);
            sqlBinds.push('?');
       }
    }

    sql = sql + '(' + sqlKeys.join(',') + ') values (' + sqlBinds.join(',') + ')';
    return new Promise((resolve, reject) => {
      this.db.transaction(transaction => {
          transaction.executeSql(sql, sqlValues, (transaction: SqlTransaction, result: SqlResultSet) => {
              resolve(result);
          }, (transaction: SqlTransaction, error: SqlError) => {
              reject(error);
          });
      });
    });
  }

  update(table: string, bindings: {}, where: {}): Promise<SqlResultSet> {
    let sql = '', sqlBinds = [], sqlKeys =[], sqlValues = [] ;

    sql = sql + 'update ' + table + ' set ';

    for (let index in bindings) {
       if (bindings.hasOwnProperty(index)) {
            let newObj = bindings[index];
            if (typeof newObj === 'object' && newObj !== null) {
                sqlValues.push(newObj.value);
                if (newObj.ifnull) {
                    sqlBinds.push(index + ' = ifnull( ' + index + ',0) + ?');
                } else if (newObj.operator) {
                    sqlBinds.push(index + ' = ' + index + newObj.operator + ' ?');
                } else {
                    sqlBinds.push(index + ' = ?');
                }

            } else {
                sqlBinds.push(index + ' = ?');
                sqlValues.push(bindings[index]);

            }
       }
    }

    for (let index in where) {
       if (where.hasOwnProperty(index)) {
            if (typeof where[index] === 'object'  && where[index] !== null){
                sqlKeys.push(index + ' ' + where[index].operator + ' ?');
                sqlValues.push(where[index].value);
            } else {
                sqlKeys.push(index + ' = ?');
                sqlValues.push(where[index]);
            }
       }
    }

    sql = sql + sqlBinds.join(',') + ' where ' + sqlKeys.join(' and ');
    return new Promise((resolve, reject) => {
      this.db.transaction(transaction => {
        transaction.executeSql(sql, sqlValues, (transaction: SqlTransaction, result: SqlResultSet) => {
            resolve(result);
        }, (transaction: SqlTransaction, error: SqlError) => {
            reject(error);
        });
      });
    });
  }

  dropTable (tables: []): Promise<void> {
    let cont = 1;

    cont = tables.length;
    return new Promise((resolve, reject) => {
      tables.some( table => {
        if (cont !== 0) {
          this.query('DROP TABLE ' + table)
          .then( () => {
              if (cont === 1 ) { resolve();
              } else { cont--; }
          }, err => {
            cont = 0;
            reject(err);
            return true;
          });
          return false;
        }
      });
    })
  }

  fetchAll(result: SqlResultSet): Object[] {
    let output = [];

    for (let i = 0; i < result.rows.length; i++) {
        output.push(result.rows.item(i));
    }

    return output;
  }

  fetch(result: SqlResultSet): Object {
      let objeto = undefined, newObj= undefined;
      if (result.rows.length !== 0) {
          objeto = result.rows.item(0);
          newObj = {};
          const keys = Object.keys(objeto);
          for (let key in keys) {
              newObj[keys[key]] = objeto[keys[key]];
          }
      }
      return newObj;
  }


  rowsCount(result: SqlResultSet): number {
      return result.rows.length;
  }

/* Private */

  private defColumn(col: DBColumn): string {
    let colSql: string;

    colSql = col.name + ' ' + col.type;
    if (!col.isNullable) {
      colSql +=  ' NOT NULL ';
    }
    if (col.default) {
      colSql += ' DEFAULT ' + col.default + ' ';
    }
    if (col.type === 'text' && col.length) {
      colSql += ` CONSTRAINT ${col.name}_length CHECK ( `;
      if (col.isNullable) {
        colSql += `${col.name} is null OR `;
      }
      colSql += `length(${col.name}) <= ${col.length} )`;

    }

    return colSql;

  }

  private defUnique(unique: DBUnique): string {
    let uniqSql: string;

    // depende del entorno, producción o desarrollo
    const onConflictUnique = 'on conflict replace';

    if (Array.isArray(unique.fields) )  {
      uniqSql = ` CONSTRAINT ${unique.name} UNIQUE ( ${unique.fields.join(',')} ) ${onConflictUnique} `;
    }
    if (typeof unique.fields === 'string')   {
      uniqSql = ` CONSTRAINT ${unique.name} UNIQUE ( ${unique.fields} ) ${onConflictUnique} `;
    }

    return uniqSql;
  }

  private defForeign(fore: DBForeign): string {
    let foreSql: string;

    if (Array.isArray(fore.foreignKey) )  {
      foreSql = ` FOREIGN KEY (  ${fore.foreignKey.join(',')} ) `;
    }

    if (typeof fore.foreignKey === 'string')   {
      foreSql = ` FOREIGN KEY (  ${fore.foreignKey} ) `;
    }

    if (Array.isArray(fore.primaryKey) )  {
      foreSql = ` REFERENCES ${fore.referenceTable} (  ${fore.primaryKey.join(',')} ) `;
    }

    if (typeof fore.primaryKey === 'string')   {
      foreSql = ` REFERENCES ${fore.referenceTable} (  ${fore.primaryKey} ) `;
    }

    return foreSql;
  }

}



export const DB_CONFIG = new InjectionToken<DbConfig>('dbWrapperConfig');
export const DB_SCHEMA = new InjectionToken<DBSchema>('dbWrapperSchema');

export function getDefaultDbConfig(): DbConfig {
  return {
    dbName: 'db.sqlite',
    location: 'default',
    iosDatabaseLocation: 'Library'
  };
}

export function provideDbWrapper(dbConfig: DbConfig, dbSchema?: DBSchema): DbWrapperService {
  const config = !!dbConfig ? dbConfig : getDefaultDbConfig();
  return new DbWrapperService(config, dbSchema);
}



