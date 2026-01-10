import request from 'supertest';
import app from '../src/app';

describe('User API Tests', () => {
    let accessToken: string;
    let userId: string;
    let testUser = {
        username: `usertest_${Date.now()}`,
        email: `usertest_${Date.now()}@example.com`,
        password: 'Test123456!',
    };

    // Setup: Register and login a test user
    beforeAll(async () => {
        const registerResponse = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser);

        accessToken = registerResponse.body.data.accessToken;
        userId = registerResponse.body.data.user.id;
    });

    describe('GET /api/v1/users/:id', () => {
        it('should get user by id successfully with authentication', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.id).toBe(userId);
            expect(response.body.data).toHaveProperty('username');
            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data.username).toBe(testUser.username);
            expect(response.body.data.email).toBe(testUser.email);
        });

        it('should not include password in response', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data).not.toHaveProperty('password');
            expect(response.body.data).not.toHaveProperty('passwordHash');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with malformed authorization header', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', 'InvalidFormat token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent user id', async () => {
            const response = await request(app)
                .get('/api/v1/users/non-existent-user-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should return user with created timestamp', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data).toHaveProperty('createdAt');
            const createdAt = new Date(response.body.data.createdAt);
            expect(createdAt).toBeInstanceOf(Date);
            expect(isNaN(createdAt.getTime())).toBe(false);
        });

        it('should return user with updated timestamp', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data).toHaveProperty('updatedAt');
            const updatedAt = new Date(response.body.data.updatedAt);
            expect(updatedAt).toBeInstanceOf(Date);
            expect(isNaN(updatedAt.getTime())).toBe(false);
        });

        it('should allow user to access their own profile', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userId);
        });

        it('should allow user to access other users profiles if authenticated', async () => {
            // Create another user
            const otherUser = {
                username: `otheruser_${Date.now()}`,
                email: `otheruser_${Date.now()}@example.com`,
                password: 'Test123456!',
            };
            const otherUserResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(otherUser);

            const otherUserId = otherUserResponse.body.data.user.id;

            // Access other user's profile with current user's token
            const response = await request(app)
                .get(`/api/v1/users/${otherUserId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(otherUserId);
            expect(response.body.data.username).toBe(otherUser.username);
        });

        it('should handle concurrent requests efficiently', async () => {
            const promises = Array(5).fill(null).map(() =>
                request(app)
                    .get(`/api/v1/users/${userId}`)
                    .set('Authorization', `Bearer ${accessToken}`)
            );

            const responses = await Promise.all(promises);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.id).toBe(userId);
            });
        });
    });
});
