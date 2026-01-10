import request from 'supertest';
import app from '../src/app';

describe('Health API Tests', () => {
    describe('GET /api/v1/health', () => {
        it('should return health status successfully', async () => {
            const response = await request(app).get('/api/v1/health').expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.status).toBe('healthy');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
        });

        it('should return valid timestamp format', async () => {
            const response = await request(app).get('/api/v1/health').expect(200);

            const timestamp = new Date(response.body.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(isNaN(timestamp.getTime())).toBe(false);
        });

        it('should return system uptime', async () => {
            const response = await request(app).get('/api/v1/health').expect(200);

            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
        });

        it('should return memory usage info', async () => {
            const response = await request(app).get('/api/v1/health').expect(200);

            expect(response.body).toHaveProperty('memory');
            expect(typeof response.body.memory).toBe('object');
            expect(response.body.memory).toHaveProperty('heapUsed');
            expect(response.body.memory).toHaveProperty('rss');
        });

        it('should handle multiple concurrent health checks', async () => {
            const promises = Array(10)
                .fill(null)
                .map(() => request(app).get('/api/v1/health'));

            const responses = await Promise.all(promises);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
                expect(response.body.status).toBe('healthy');
            });
        });
    });
});
