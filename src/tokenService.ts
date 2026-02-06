import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs from 'sql.js';

export class TokenService {
    /**
     * Returns the platform-specific path to Cursor's state.vscdb SQLite database.
     */
    static getDbPath(): string {
        const platform = process.platform;
        const homeDir = os.homedir();
        switch (platform) {
            case 'darwin':
                return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
            case 'win32':
                return path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
            case 'linux':
                return path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * Reads the cursorAuth/accessToken value from the SQLite database.
     */
    static async readAccessToken(): Promise<string | null> {
        const dbPath = this.getDbPath();

        if (!fs.existsSync(dbPath)) {
            return null;
        }

        try {
            const SQL = await initSqlJs();
            const fileBuffer = fs.readFileSync(dbPath);
            const db = new SQL.Database(fileBuffer);

            try {
                const results = db.exec("SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'");
                if (results.length > 0 && results[0].values.length > 0) {
                    return results[0].values[0][0] as string;
                }
                return null;
            } finally {
                db.close();
            }
        } catch (error) {
            console.error('Failed to read Cursor auth token from database:', error);
            return null;
        }
    }

    /**
     * Decodes a JWT payload and extracts the user ID from the sub claim.
     * The sub claim format is "auth0|user_XXXXX".
     */
    static extractUserId(jwt: string): string | null {
        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = parts[1];
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
            const sub: string = decoded.sub;
            if (!sub || !sub.includes('|')) {
                return null;
            }
            return sub.split('|')[1];
        } catch (error) {
            console.error('Failed to decode JWT:', error);
            return null;
        }
    }

    /**
     * Constructs the full WorkosCursorSessionToken cookie value from the
     * locally stored access token.
     * Format: WorkosCursorSessionToken=user_XXXXX%3A%3A<JWT>
     */
    static async constructSessionCookie(): Promise<string | null> {
        const jwt = await this.readAccessToken();
        if (!jwt) {
            return null;
        }

        const userId = this.extractUserId(jwt);
        if (!userId) {
            return null;
        }

        return `WorkosCursorSessionToken=${userId}%3A%3A${jwt}`;
    }
}
