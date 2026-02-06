declare module 'sql.js' {
    interface SqlJsStatic {
        Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
    }

    interface Database {
        exec(sql: string): QueryExecResult[];
        close(): void;
    }

    interface QueryExecResult {
        columns: string[];
        values: any[][];
    }

    interface SqlJsConfig {
        locateFile?: (file: string) => string;
    }

    export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
