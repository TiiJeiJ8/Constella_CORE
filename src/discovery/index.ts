import os from 'os';
import { randomUUID } from 'crypto';
import Bonjour, { Service } from 'bonjour-service';
import logger from '../config/logger';
import { config } from '../config';

const DISCOVERY_TYPE = 'constella';
const DISCOVERY_PROTOCOL = 'tcp';
const DEFAULT_VERSION = '1.0.0';
const instanceId = process.env.CONSTELLA_INSTANCE_ID || randomUUID();
const serverName = process.env.CONSTELLA_SERVER_NAME?.trim() || os.hostname();
const serverVersion = process.env.CONSTELLA_VERSION || process.env.npm_package_version || DEFAULT_VERSION;

let bonjour: Bonjour | null = null;
let publishedService: Service | null = null;

export interface DiscoveryMetadata {
    app: 'constella';
    serviceType: string;
    protocol: 'tcp' | 'udp';
    instanceId: string;
    serverName: string;
    version: string;
    apiPrefix: string;
    websocketPath: string;
    capabilities: string[];
}

export function getDiscoveryMetadata(): DiscoveryMetadata {
    return {
        app: 'constella',
        serviceType: DISCOVERY_TYPE,
        protocol: DISCOVERY_PROTOCOL,
        instanceId,
        serverName,
        version: serverVersion,
        apiPrefix: config.apiPrefix,
        websocketPath: config.websocket.path,
        capabilities: ['api', 'auth', 'rooms', 'yjs'],
    };
}

export function startLanDiscoveryPublisher(port: number): void {
    if (bonjour || publishedService) {
        return;
    }

    const metadata = getDiscoveryMetadata();

    try {
        bonjour = new Bonjour({}, (error: unknown) => {
            logger.error('LAN discovery publisher error:', error);
        });

        publishedService = bonjour.publish({
            name: metadata.serverName,
            type: metadata.serviceType,
            protocol: metadata.protocol,
            port,
            txt: {
                app: metadata.app,
                instanceId: metadata.instanceId,
                serverName: metadata.serverName,
                version: metadata.version,
                apiPrefix: metadata.apiPrefix,
                websocketPath: metadata.websocketPath,
            },
        });

        publishedService.on('up', () => {
            logger.info(`LAN discovery published as ${metadata.serverName} on _${metadata.serviceType}._${metadata.protocol}`);
        });

        publishedService.on('error', (error: unknown) => {
            logger.error('Failed to publish LAN discovery service:', error);
        });
    } catch (error) {
        logger.error('Failed to initialize LAN discovery publisher:', error);
        stopLanDiscoveryPublisher().catch((stopError) => {
            logger.error('Failed to clean up LAN discovery publisher after init error:', stopError);
        });
    }
}

export async function stopLanDiscoveryPublisher(): Promise<void> {
    const activeBonjour = bonjour;

    bonjour = null;
    publishedService = null;

    if (!activeBonjour) {
        return;
    }

    await new Promise<void>((resolve) => {
        try {
            activeBonjour.unpublishAll(() => {
                activeBonjour.destroy(() => {
                    logger.info('LAN discovery publisher stopped');
                    resolve();
                });
            });
        } catch (error) {
            logger.error('Failed to stop LAN discovery publisher cleanly:', error);
            resolve();
        }
    });
}
