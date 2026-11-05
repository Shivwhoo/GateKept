const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const Otp = require('../src/models/Otp');

describe('Stage 1: Project Scaffold, Models & Auth with OTP', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.COLLEGE_EMAIL_DOMAIN = 'campus.edu';
    await connectDB();
    await User.deleteMany({});
    await Otp.deleteMany({});
  });

  after(async () => {
    await closeDB();
  });

  it('Health check endpoint responds with 200 OK', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('Rejects student registration with non-college email domain', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Rivera',
        email: 'alex@gmail.com', // Not @campus.edu
        phone: '9876543210',
        password: 'password123',
        hostel: 'Hostel A',
        room: '204',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_EMAIL_DOMAIN');
  });

  it('Registers student with valid college email and sends OTP', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Rivera',
        email: 'alex@campus.edu',
        phone: '+91 98765 43210',
        password: 'password123',
        hostel: 'Hostel A',
        room: '204',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.requiresVerification, true);

    const user = await User.findOne({ email: 'alex@campus.edu' });
    assert.ok(user);
    assert.strictEqual(user.phone, '9876543210'); // Normalized phone
    assert.strictEqual(user.emailVerified, false);

    const otpRecord = await Otp.findOne({ email: 'alex@campus.edu' });
    assert.ok(otpRecord);
    assert.strictEqual(otpRecord.otp.length, 6);
  });

  it('Rejects login before email is verified', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alex@campus.edu',
        password: 'password123',
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  it('Rejects invalid OTP during verification', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'alex@campus.edu',
        otp: '000000',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_OTP');
  });

  it('Verifies OTP, activates account, and sets httpOnly auth cookie', async () => {
    const otpRecord = await Otp.findOne({ email: 'alex@campus.edu' });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'alex@campus.edu',
        otp: otpRecord.otp,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Auth cookie should be set in header');
    assert.ok(cookies.some((c) => c.includes('gatekept_token=')));
    assert.ok(cookies.some((c) => c.includes('HttpOnly')));

    const updatedUser = await User.findOne({ email: 'alex@campus.edu' });
    assert.strictEqual(updatedUser.emailVerified, true);
  });

  it('Logs in verified student and provides access to /api/auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alex@campus.edu',
        password: 'password123',
      });

    assert.strictEqual(loginRes.status, 200);
    const cookies = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, 'alex@campus.edu');
    assert.strictEqual(meRes.body.user.role, 'student');
  });
});
