import dotenv from 'dotenv';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';

dotenv.config();

// 环境变量替换的值类型（需要先定义）
type ConfigValue = string | number | boolean | ConfigObject | ConfigArray | null | undefined;
interface ConfigObject {
    [key: string]: ConfigValue;
}
type ConfigArray = ConfigValue[];

// YAML 配置文件类型定义
interface YamlAppConfig extends ConfigObject {
    env?: string;
    port?: number;
    apiPrefix?: string;
}

interface YamlCorsConfig extends ConfigObject {
    origin?: string;
}

interface YamlJwtConfig extends ConfigObject {
    secret?: string;
    expiresIn?: string;
    refreshExpiresIn?: string;
}

interface YamlRateLimitConfig extends ConfigObject {
    windowMs?: number;
    maxRequests?: number;
}

interface YamlLoggingConfig extends ConfigObject {
    level?: string;
}

interface YamlMemoryDatabaseConfig extends ConfigObject {
    filename?: string;
}

interface YamlSqliteDatabaseConfig extends ConfigObject {
    filepath?: string; // Database file path, e.g., './data/constella.db'
}

/**
 * 基础数据库扩展接口 - 用于未来支持其他数据库类型
 */
interface YamlDatabaseExtensionConfig extends ConfigObject {
    // Reserved for future database extensions (PostgreSQL, MySQL, etc.)
    // [key: string]: any;
}

interface YamlDatabaseConfig extends ConfigObject {
    type?: string; // 'memory', 'sqlite', or future database types
    memory?: YamlMemoryDatabaseConfig;
    sqlite?: YamlSqliteDatabaseConfig;
    // Reserved for future database extensions
    extension?: YamlDatabaseExtensionConfig;
}

interface YamlWebSocketConfig extends ConfigObject {
    path?: string;
    pingInterval?: number;
    pingTimeout?: number;
}

interface YamlYjsPersistenceConfig extends ConfigObject {
    type?: string;
    leveldbPath?: string;
    snapshotInterval?: number;
}

interface YamlDatabasePerformanceConfig extends ConfigObject {
    enabled?: boolean;
    slowQueryMs?: number;
    logAllQueries?: boolean;
}

interface YamlMaintenanceConfig extends ConfigObject {
    enabled?: boolean;
    intervalMs?: number;
    snapshotRetention?: number;
    tokenGraceMs?: number;
    assetOrphanMaxAgeMs?: number;
}

interface YamlPerformanceConfig extends ConfigObject {
    database?: YamlDatabasePerformanceConfig;
    maintenance?: YamlMaintenanceConfig;
}

interface YamlYjsConfig extends ConfigObject {
    persistence?: YamlYjsPersistenceConfig;
}

interface YamlConfig extends ConfigObject {
    app?: YamlAppConfig;
    cors?: YamlCorsConfig;
    jwt?: YamlJwtConfig;
    rateLimit?: YamlRateLimitConfig;
    logging?: YamlLoggingConfig;
    database?: YamlDatabaseConfig;
    performance?: YamlPerformanceConfig;
    websocket?: YamlWebSocketConfig;
    yjs?: YamlYjsConfig;
}

const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_JWT_SECRETS = new Set([
    'your_jwt_secret_key',
    'your_jwt_secret_key_change_in_production',
    'changeme',
    'change_me',
    'default',
]);

interface UserRuntimeConfig extends ConfigObject {
    jwt?: YamlJwtConfig;
}

// 加载 Yaml 配置文件
function loadYamlConfig(): YamlConfig {
    const env = process.env.NODE_ENV || 'development';
    const configDir = path.join(process.cwd(), 'config');

    // 优先加载环境特定的配置文件
    const envConfigPath = path.join(configDir, `${env}.yaml`);
    const defaultConfigPath = path.join(configDir, 'default.yaml');

    let configPath = defaultConfigPath;
    if (fs.existsSync(envConfigPath)) {
        configPath = envConfigPath;
    }

    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        let yamlConfig = yaml.load(fileContents) as YamlConfig;

        // 替换环境变量占位符
        yamlConfig = replaceEnvVariables(yamlConfig) as YamlConfig;

        return yamlConfig;
    } catch (error) {
        console.error(`Failed to load config from ${configPath}:`, error);
        return {};
    }
}

// 递归替换配置中的环境变量占位符
function replaceEnvVariables(obj: ConfigValue): ConfigValue {
    if (typeof obj === 'string') {
        // 匹配 ${VAR_NAME} 格式
        const envVarRegex = /\$\{([^}]+)\}/g;
        return obj.replace(envVarRegex, (match, varName) => {
            return process.env[varName] || match;
        });
    } else if (Array.isArray(obj)) {
        return obj.map((item) => replaceEnvVariables(item)) as ConfigArray;
    } else if (typeof obj === 'object' && obj !== null) {
        const result: ConfigObject = {};
        for (const key in obj) {
            result[key] = replaceEnvVariables((obj as ConfigObject)[key]);
        }
        return result;
    }
    return obj;
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
    const value = process.env[name];
    if (value === undefined) return defaultValue;
    return !['false', '0', 'off', 'no'].includes(value.toLowerCase());
}

function readNumberEnv(name: string, defaultValue: number): number {
    const value = Number.parseInt(process.env[name] || '', 10);
    return Number.isFinite(value) ? value : defaultValue;
}

function getUserConfigBaseDir(): string {
    if (process.env.CONSTELLA_USER_CONFIG_DIR) {
        return process.env.CONSTELLA_USER_CONFIG_DIR;
    }

    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Constella');
    }

    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(xdgConfigHome, 'Constella');
}

function getUserConfigPath(): string {
    return path.join(getUserConfigBaseDir(), 'config.local.yaml');
}

function isUnsafeJwtSecret(secret?: string): boolean {
    if (!secret) return true;
    const normalizedSecret = secret.trim();
    if (!normalizedSecret) return true;
    if (PLACEHOLDER_JWT_SECRETS.has(normalizedSecret)) return true;
    return normalizedSecret.length < MIN_JWT_SECRET_LENGTH;
}

function loadUserRuntimeConfig(): UserRuntimeConfig {
    const userConfigPath = getUserConfigPath();
    if (!fs.existsSync(userConfigPath)) {
        return {};
    }

    try {
        const raw = fs.readFileSync(userConfigPath, 'utf8');
        const parsed = yaml.load(raw);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed as UserRuntimeConfig;
        }
    } catch (error) {
        console.error(`Failed to load user runtime config from ${userConfigPath}:`, error);
    }

    return {};
}

function saveUserRuntimeConfig(configToSave: UserRuntimeConfig): void {
    const userConfigPath = getUserConfigPath();
    const userConfigDir = path.dirname(userConfigPath);
    fs.mkdirSync(userConfigDir, { recursive: true });

    const dumped = yaml.dump(configToSave, {
        noRefs: true,
        lineWidth: 120,
    });
    fs.writeFileSync(userConfigPath, dumped, 'utf8');
}

function resolveJwtSecret(yamlSecret?: string): string {
    const env = process.env.NODE_ENV || 'development';
    const envSecret = process.env.JWT_SECRET;
    if (!isUnsafeJwtSecret(envSecret)) {
        return envSecret!.trim();
    }
    if (envSecret) {
        console.warn('JWT_SECRET from env is unsafe or too short, ignoring it.');
    }

    if (!isUnsafeJwtSecret(yamlSecret)) {
        return yamlSecret!.trim();
    }
    if (yamlSecret) {
        console.warn('JWT secret from yaml is placeholder/unsafe, ignoring it.');
    }

    if (env === 'test') {
        return 'test_jwt_secret_key_for_testing_only';
    }

    const userRuntimeConfig = loadUserRuntimeConfig();
    const userSecret = userRuntimeConfig.jwt?.secret;
    if (!isUnsafeJwtSecret(userSecret)) {
        return userSecret!.trim();
    }

    const generatedSecret = randomBytes(48).toString('hex');

    try {
        saveUserRuntimeConfig({
            ...userRuntimeConfig,
            jwt: {
                ...userRuntimeConfig.jwt,
                secret: generatedSecret,
            },
        });
        console.warn(`Generated JWT secret for local runtime config at ${getUserConfigPath()}.`);
        return generatedSecret;
    } catch (error) {
        if (env === 'production') {
            throw new Error(
                `JWT secret is missing and auto-persist failed. Set JWT_SECRET or make ${getUserConfigPath()} writable.`
            );
        }
        console.error('Failed to persist generated JWT secret, using in-memory secret for current process.', error);
        return generatedSecret;
    }
}

const yamlConfig = loadYamlConfig();
const jwtSecret = resolveJwtSecret(yamlConfig.jwt?.secret);

export const config = {
    // Application
    env: yamlConfig.app?.env || process.env.NODE_ENV || 'development',
    port: yamlConfig.app?.port || parseInt(process.env.PORT || '3000', 10),
    apiPrefix: yamlConfig.app?.apiPrefix || process.env.API_PREFIX || '/api/v1',

    // CORS
    corsOrigin: yamlConfig.cors?.origin
        ? (yamlConfig.cors.origin.includes(',')
            ? yamlConfig.cors.origin.split(',').map((o: string) => o.trim())
            : yamlConfig.cors.origin)
        : process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:5173', 'http://localhost:3000'],

    // JWT
    jwt: {
        secret: jwtSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || yamlConfig.jwt?.expiresIn || '7d',
        refreshExpiresIn:
            process.env.JWT_REFRESH_EXPIRES_IN || yamlConfig.jwt?.refreshExpiresIn || '30d',
    },

    // Rate Limiting
    rateLimit: {
        windowMs:
            yamlConfig.rateLimit?.windowMs ||
            parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests:
            yamlConfig.rateLimit?.maxRequests ||
            parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // Logging
    logLevel: yamlConfig.logging?.level || process.env.LOG_LEVEL || 'info',

    // Performance
    performance: {
        database: {
            enabled: yamlConfig.performance?.database?.enabled ?? readBooleanEnv('DB_PERF_ENABLED', true),
            slowQueryMs:
                yamlConfig.performance?.database?.slowQueryMs ??
                readNumberEnv('DB_SLOW_QUERY_MS', 120),
            logAllQueries:
                yamlConfig.performance?.database?.logAllQueries ??
                readBooleanEnv('DB_PERF_LOG_ALL_QUERIES', false),
        },
        maintenance: {
            enabled:
                yamlConfig.performance?.maintenance?.enabled ??
                readBooleanEnv('DB_MAINTENANCE_ENABLED', true),
            intervalMs:
                yamlConfig.performance?.maintenance?.intervalMs ??
                readNumberEnv('DB_MAINTENANCE_INTERVAL_MS', 30 * 60 * 1000),
            snapshotRetention:
                yamlConfig.performance?.maintenance?.snapshotRetention ??
                readNumberEnv('DB_SNAPSHOT_RETENTION', 5),
            tokenGraceMs:
                yamlConfig.performance?.maintenance?.tokenGraceMs ??
                readNumberEnv('DB_TOKEN_GRACE_MS', 5 * 60 * 1000),
            assetOrphanMaxAgeMs:
                yamlConfig.performance?.maintenance?.assetOrphanMaxAgeMs ??
                readNumberEnv('DB_ASSET_ORPHAN_MAX_AGE_MS', 24 * 60 * 60 * 1000),
        },
    },

    // Database
    database: {
        type: yamlConfig.database?.type || 'memory',
        memory: yamlConfig.database?.memory || { filename: ':memory:' },
        sqlite: yamlConfig.database?.sqlite || { filepath: './data/constella.db' },
    },

    // WebSocket
    websocket: {
        path: yamlConfig.websocket?.path || '/ws',
        pingInterval: yamlConfig.websocket?.pingInterval || 30000,
        pingTimeout: yamlConfig.websocket?.pingTimeout || 5000,
    },

    // Yjs
    yjs: {
        persistence: {
            type: yamlConfig.yjs?.persistence?.type || 'memory',
            leveldbPath: yamlConfig.yjs?.persistence?.leveldbPath || './data/yjs',
            snapshotInterval: yamlConfig.yjs?.persistence?.snapshotInterval || 3600000,
        },
    },
    // Frontend static assets path (can override with FRONTEND_DIST env)
    frontendDistPath:
        process.env.FRONTEND_DIST || path.join(process.cwd(), '..', 'web', 'dist'),
};
