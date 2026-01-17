import dotenv from 'dotenv';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

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

interface YamlPostgresPoolConfig extends ConfigObject {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

interface YamlPostgresDatabaseConfig extends ConfigObject {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    pool?: YamlPostgresPoolConfig;
}

interface YamlDatabaseConfig extends ConfigObject {
    type?: string;
    memory?: YamlMemoryDatabaseConfig;
    postgres?: YamlPostgresDatabaseConfig;
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
    websocket?: YamlWebSocketConfig;
    yjs?: YamlYjsConfig;
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

const yamlConfig = loadYamlConfig();

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
        secret: yamlConfig.jwt?.secret || process.env.JWT_SECRET || 'your_jwt_secret_key',
        expiresIn: yamlConfig.jwt?.expiresIn || process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn:
            yamlConfig.jwt?.refreshExpiresIn || process.env.JWT_REFRESH_EXPIRES_IN || '30d',
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

    // Database
    database: {
        type: yamlConfig.database?.type || 'memory',
        memory: yamlConfig.database?.memory || { filename: ':memory:' },
        postgres: {
            host: yamlConfig.database?.postgres?.host || process.env.DB_HOST || 'localhost',
            port:
                yamlConfig.database?.postgres?.port || parseInt(process.env.DB_PORT || '5432', 10),
            database:
                yamlConfig.database?.postgres?.database || process.env.DB_NAME || 'constella_core',
            user: yamlConfig.database?.postgres?.user || process.env.DB_USER || 'postgres',
            password: yamlConfig.database?.postgres?.password || process.env.DB_PASSWORD || '',
            // Allow overriding SSL via environment variable DB_SSL (true/false).
            ssl: (process.env.DB_SSL
                ? process.env.DB_SSL === 'true'
                : (yamlConfig.database?.postgres?.ssl || false)),
            pool: {
                min: yamlConfig.database?.postgres?.pool?.min || 2,
                max: yamlConfig.database?.postgres?.pool?.max || 10,
                idleTimeoutMillis: yamlConfig.database?.postgres?.pool?.idleTimeoutMillis || 30000,
                connectionTimeoutMillis:
                    yamlConfig.database?.postgres?.pool?.connectionTimeoutMillis || 2000,
            },
        },
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
