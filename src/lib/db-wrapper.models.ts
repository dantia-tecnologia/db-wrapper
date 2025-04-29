
export enum DataType {
    Integer = 'integer',
    Int = 'integer',
    TinyInt = 'integer',
    SmallInt = 'integer',
    BigInt = 'integer',
    Text = 'text',
    Char = 'text',
    NChar = 'text',
    VarChar = 'text',
    NVarChar = 'text',
    CLOB = 'text',
    BLOB = 'blob',
    Real = 'real',
    Double = 'real',
    Decimal = 'real',
    Float = 'real',
    Boolean = 'integer',
    DateTime = 'text',
    Date = 'text'

}

export enum DefaultType {
    Integer = '0',
    Int = '0',
    TinyInt = '0',
    SmallInt = '0',
    BigInt = '0',
    Text = '\'\'',
    Char = '\'\'',
    NChar = '\'\'',
    VarChar = '\'\'',
    NVarChar = '\'\'',
    CLOB = '\'\'',
    BLOB = '0',
    Real = '0.0',
    Double = '0.0',
    Decimal = '0.0',
    Float = '0.0',
    Boolean = '0',
    DateTime = '(datetime(\'now\', \'localtime\'))',
    Date = '(date(\'now\', \'localtime\'))'
}


export interface SqlTransaction {
    /**
     * Executes SQL statement via current transaction.
     * @param sql SQL statement to execute.
     * @param params SQL stetement arguments.
     * @param successCallback Called in case of query has been successfully done.
     * @param errorCallback   Called, when query fails. Return false to continue transaction; true or no return to rollback.
     */
    executeSql(sql: string,
        params?: any[],
        successCallback?: (transaction: SqlTransaction, resultSet: SqlResultSet) => void,
        errorCallback?: (transaction: SqlTransaction, error: SqlError) => any): void;
}

export interface SqlResultSet {
    insertId: number;
    rowsAffected: number;
    rows: SqlResultSetRowList;
}

export interface SqlResultSetRowList {
    length: number;
    item(index: number): Object;
}

export interface SqlError {
    code: number;
    message: string;
}

/**
 * Interfaz con la configuración de websql
 */
export interface DbConfig {
    /**
     *  nombre de la base de datos
    */
    dbName: string;
    /**
     * default 'default'
    */
    location?: string;
    /**
     * default 'Library'
    */
    iosDatabaseLocation?: string;
    /**
     * default 'default'
    */    
    androidDatabaseProvider?: string;
}

/**
 * Intefaz para definir un constraint unique
 *
 */
export interface DBUnique {
    name: string; /** nombre  */
    fields: string | string[]; /** lista de campos */
}

export interface DBForeign {
    name: string;
    foreignKey: string | string[];
    referenceTable: string;
    primaryKey: string | string[];
}

export interface DBColumn {
    name: string;
    type: DataType;
    length?: number;
    isNullable?: boolean;
    default?: DefaultType | string;
}

export interface DBTable {
    name: string;
    columns: DBColumn[];
    primary: string | string[];
    uniques?: DBUnique[];
    foreigns?: DBForeign[];
    sync?: string;
}


export interface DBView {
    name: string;
    sql: string;
}

export interface DBSchema {
    tables: DBTable[],
    views?: DBView[]
}

