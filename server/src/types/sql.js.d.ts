declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export type SqlValue = string | number | Uint8Array | null;

  export interface BindParams {
    [key: string]: SqlValue;
  }

  export interface ParamsObject {
    [key: string]: SqlValue;
  }

  export interface Statement {
    bind(params?: BindParams | SqlValue[]): boolean;
    step(): boolean;
    getAsObject(params?: BindParams | SqlValue[]): ParamsObject;
    get(params?: BindParams | SqlValue[]): SqlValue[];
    run(params?: BindParams | SqlValue[]): void;
    free(): boolean;
    reset(): void;
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: BindParams | SqlValue[]): Database;
    exec(sql: string, params?: BindParams | SqlValue[]): QueryExecResult[];
    each(sql: string, params: BindParams | SqlValue[], callback: (row: ParamsObject) => void, done?: () => void): Database;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export default function initSqlJs(config?: {
    locateFile?: (filename: string) => string;
  }): Promise<SqlJsStatic>;
}
