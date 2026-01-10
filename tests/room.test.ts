import request from 'supertest';
import app from '../src/app';

describe('Room API Tests', () => {
    let accessToken: string;
    let userId: string;
    let roomId: string;
    let testUser = {
        username: `roomtest_${Date.now()}`,
        email: `roomtest_${Date.now()}@example.com`,
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

    describe('POST /api/v1/rooms', () => {
        it('should create a room successfully with authentication', async () => {
            const response = await request(app)
                .post('/api/v1/rooms')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Test Room',
                    description: 'A test room for unit testing',
                    isPublic: true,
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.name).toBe('Test Room');
            expect(response.body.data.isPublic).toBe(true);

            roomId = response.body.data.id;
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/v1/rooms')
                .send({
                    name: 'Test Room',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/rooms')
                .set('Authorization', 'Bearer invalid-token')
                .send({
                    name: 'Test Room',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should create private room successfully', async () => {
            const response = await request(app)
                .post('/api/v1/rooms')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Private Test Room',
                    description: 'A private room',
                    isPublic: false,
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isPublic).toBe(false);
        });

        it('should fail with missing required fields', async () => {
            const response = await request(app)
                .post('/api/v1/rooms')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/rooms', () => {
        it('should get rooms list successfully', async () => {
            const response = await request(app)
                .get('/api/v1/rooms')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should support pagination with limit and offset', async () => {
            const response = await request(app)
                .get('/api/v1/rooms')
                .query({ limit: 5, offset: 0 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });

        it('should filter rooms by userId', async () => {
            const response = await request(app)
                .get('/api/v1/rooms')
                .query({ userId: userId })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return empty array when no rooms match filter', async () => {
            const response = await request(app)
                .get('/api/v1/rooms')
                .query({ userId: 'non-existent-user-id' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/rooms/:id', () => {
        it('should get room by id successfully', async () => {
            const response = await request(app)
                .get(`/api/v1/rooms/${roomId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(roomId);
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('isPublic');
        });

        it('should fail with non-existent room id', async () => {
            const response = await request(app)
                .get('/api/v1/rooms/non-existent-id')
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should return room with members list', async () => {
            const response = await request(app)
                .get(`/api/v1/rooms/${roomId}`)
                .expect(200);

            expect(response.body.data).toHaveProperty('members');
            expect(Array.isArray(response.body.data.members)).toBe(true);
        });
    });

    describe('POST /api/v1/rooms/:id/join', () => {
        let publicRoomId: string;

        beforeAll(async () => {
            const roomResponse = await request(app)
                .post('/api/v1/rooms')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Public Join Test Room',
                    isPublic: true,
                });
            publicRoomId = roomResponse.body.data.id;
        });

        it('should join a public room successfully', async () => {
            // Create another user to join the room
            const newUser = {
                username: `joiner_${Date.now()}`,
                email: `joiner_${Date.now()}@example.com`,
                password: 'Test123456!',
            };
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(newUser);

            const newUserToken = registerResponse.body.data.accessToken;

            const response = await request(app)
                .post(`/api/v1/rooms/${publicRoomId}/join`)
                .set('Authorization', `Bearer ${newUserToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post(`/api/v1/rooms/${publicRoomId}/join`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent room', async () => {
            const response = await request(app)
                .post('/api/v1/rooms/non-existent-room/join')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/rooms/:id/invite', () => {
        it('should invite user to room successfully', async () => {
            // Create a user to invite
            const inviteeUser = {
                username: `invitee_${Date.now()}`,
                email: `invitee_${Date.now()}@example.com`,
                password: 'Test123456!',
            };
            const inviteeResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(inviteeUser);

            const inviteeId = inviteeResponse.body.data.user.id;

            const response = await request(app)
                .post(`/api/v1/rooms/${roomId}/invite`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    userId: inviteeId,
                    role: 'member',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post(`/api/v1/rooms/${roomId}/invite`)
                .send({
                    userId: 'some-user-id',
                    role: 'member',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid role', async () => {
            const response = await request(app)
                .post(`/api/v1/rooms/${roomId}/invite`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    userId: 'some-user-id',
                    role: 'invalid-role',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/rooms/:id/permissions', () => {
        it('should update member permissions successfully', async () => {
            const response = await request(app)
                .put(`/api/v1/rooms/${roomId}/permissions`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    userId: userId,
                    role: 'admin',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .put(`/api/v1/rooms/${roomId}/permissions`)
                .send({
                    userId: userId,
                    role: 'admin',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail without proper permissions', async () => {
            // Create a regular member
            const memberUser = {
                username: `member_${Date.now()}`,
                email: `member_${Date.now()}@example.com`,
                password: 'Test123456!',
            };
            const memberResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(memberUser);

            const memberToken = memberResponse.body.data.accessToken;

            const response = await request(app)
                .put(`/api/v1/rooms/${roomId}/permissions`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    userId: userId,
                    role: 'admin',
                })
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/rooms/:id/relay-token', () => {
        it('should generate relay token successfully', async () => {
            const response = await request(app)
                .post(`/api/v1/rooms/${roomId}/relay-token`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('relayToken');
            expect(typeof response.body.data.relayToken).toBe('string');
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post(`/api/v1/rooms/${roomId}/relay-token`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent room', async () => {
            const response = await request(app)
                .post('/api/v1/rooms/non-existent-room/relay-token')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should generate different tokens for each request', async () => {
            const response1 = await request(app)
                .post(`/api/v1/rooms/${roomId}/relay-token`)
                .set('Authorization', `Bearer ${accessToken}`);

            const response2 = await request(app)
                .post(`/api/v1/rooms/${roomId}/relay-token`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response1.body.data.relayToken).not.toBe(response2.body.data.relayToken);
        });
    });
});
