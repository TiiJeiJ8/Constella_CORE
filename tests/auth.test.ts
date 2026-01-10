import request from 'supertest';
import app from '../src/app';

describe('Auth API Tests', () => {
    let testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'Test123456!',
    };

    let refreshToken: string;

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data.user).toHaveProperty('id');
            expect(response.body.data.user.username).toBe(testUser.username);
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });

        it('should fail with duplicate username', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(409);

            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'invalid-email',
                    password: 'Test123456!',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with weak password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'new@example.com',
                    password: '123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with missing required fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: testUser.username,
                    password: testUser.password,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            accessToken = response.body.data.accessToken;
            refreshToken = response.body.data.refreshToken;
        });

        it('should login successfully with email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: testUser.email,
                    password: testUser.password,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should fail with incorrect password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: testUser.username,
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent username', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'Test123456!',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with missing credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        it('should refresh access token successfully', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({
                    refreshToken: refreshToken,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });

        it('should fail with invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({
                    refreshToken: 'invalid-token',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with missing refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with expired refresh token', async () => {
            // This test would require a way to create expired tokens
            // or wait for token expiration - implementation depends on your setup
        });
    });
});
