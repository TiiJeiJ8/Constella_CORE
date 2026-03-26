import { performance as nodePerformance } from 'perf_hooks';
import logger from '../config/logger';

export interface DatabasePerformanceConfig {
    enabled: boolean;
    slowQueryMs: number;
    logAllQueries: boolean;
}

export interface DatabaseQueryContext {
    databaseType: string;
    sql: string;
    params?: unknown[];
}

function compactSql(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
}

function formatParams(params?: unknown[]): string {
    if (!params || params.length === 0) {
        return '[]';
    }

    try {
        return JSON.stringify(params);
    } catch {
        return '[unserializable params]';
    }
}

class DatabasePerformanceMonitor {
    constructor(private readonly config: DatabasePerformanceConfig) {}

    async trackQuery<T>(context: DatabaseQueryContext, executor: () => T | Promise<T>): Promise<T> {
        if (!this.config.enabled) {
            return executor();
        }

        const startedAt = nodePerformance.now();
        try {
            const result = await executor();
            const elapsedMs = nodePerformance.now() - startedAt;
            this.logQuery(context, elapsedMs, false);
            return result;
        } catch (error) {
            const elapsedMs = nodePerformance.now() - startedAt;
            this.logQuery(context, elapsedMs, true, error);
            throw error;
        }
    }

    private logQuery(context: DatabaseQueryContext, elapsedMs: number, failed: boolean, error?: unknown) {
        const sql = compactSql(context.sql);
        const params = formatParams(context.params);
        const isSlow = elapsedMs >= this.config.slowQueryMs;

        if (isSlow || this.config.logAllQueries || failed) {
            const message = [
                `[DB Perf] ${context.databaseType.toUpperCase()} query`,
                `took ${elapsedMs.toFixed(1)}ms`,
                failed ? '(failed)' : '',
                `sql=${sql}`,
                `params=${params}`,
            ]
                .filter(Boolean)
                .join(' ');

            if (failed) {
                logger.warn(message, error);
                return;
            }

            if (isSlow) {
                logger.warn(message);
                return;
            }

            logger.debug(message);
        }
    }
}

export function createDatabasePerformanceMonitor(config: DatabasePerformanceConfig) {
    return new DatabasePerformanceMonitor(config);
}
