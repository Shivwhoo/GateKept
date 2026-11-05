const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const AuditLog = require('../src/models/AuditLog');
const { signToken } = require('../src/middleware/auth');

describe('Stage 6: Admin Dashboard, Stats, Users & CSV Export', () => {
  let adminUser, guardUser;
  let adminCookie, guardCookie;
  let lockedParcel;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});

    // Create admin
    adminUser = await User.create({
      name: 'Superintendent Rao',
      email: 'admin@campus.edu',
      phone: '9900011122',
      passwordHash: 'hash',
      hostel: 'Admin Office',
      room: '1',
      role: 'admin',
      emailVerified: true,
    });
    adminCookie = `gatekept_token=${signToken(adminUser)}`;

    // Create guard
    guardUser = await User.create({
      name: 'Guard Baldev',
      email: 'baldev@campus.edu',
      phone: '9911122233',
      passwordHash: 'hash',
      hostel: 'Gate 1',
      room: 'Desk',
      role: 'guard',
      emailVerified: true,
    });
    guardCookie = `gatekept_token=${signToken(guardUser)}`;

    // Create a locked parcel
    lockedParcel = await Parcel.create({
      rawPhone: '9876543210',
      courier: 'Amazon',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '0000',
      status: 'locked',
      codeAttempts: 5,
    });

    // Create a collected parcel
    await Parcel.create({
      rawPhone: '9876543210',
      courier: 'Flipkart',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '1111',
      status: 'collected',
      receivedAt: new Date(Date.now() - 3600000), // 1 hour ago
      collectedAt: new Date(),
    });
  });

  after(async () => {
    await closeDB();
  });

  it('Denies non-admin users access to admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', guardCookie);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  it('Admin retrieves stats strip successfully', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats.lockedCount >= 1);
    assert.ok(res.body.stats.totalCollected >= 1);
  });

  it('Admin retrieves all parcels with status filter', async () => {
    const res = await request(app)
      .get('/api/admin/parcels?status=locked')
      .set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcels.length, 1);
    assert.strictEqual(res.body.parcels[0].status, 'locked');
  });

  it('Admin exports parcel log as CSV', async () => {
    const res = await request(app)
      .get('/api/admin/export.csv')
      .set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Parcel ID,Dropped At,Courier,Status'));
    assert.ok(res.text.includes('Amazon'));
    assert.ok(res.text.includes('Flipkart'));
  });

  it('Admin creates a new guard user', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Guard Surender',
        email: 'surender@campus.edu',
        phone: '9888877777',
        password: 'password123',
        hostel: 'Gate 2',
        room: 'Desk B',
        role: 'guard',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.role, 'guard');
    assert.strictEqual(res.body.user.emailVerified, true);
  });

  it('Admin deactivates a user', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${guardUser._id}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.isActive, false);

    const check = await User.findById(guardUser._id);
    assert.strictEqual(check.isActive, false);
  });

  it('Admin overrides locked parcel (resets to at_gate with new code)', async () => {
    const res = await request(app)
      .post(`/api/admin/parcels/${lockedParcel._id}/override`)
      .set('Cookie', adminCookie)
      .send({ action: 'unlock' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcel.status, 'at_gate');
    assert.strictEqual(res.body.parcel.codeAttempts, 0);

    const check = await Parcel.findById(lockedParcel._id);
    assert.strictEqual(check.status, 'at_gate');
    assert.strictEqual(check.codeAttempts, 0);

    const audit = await AuditLog.findOne({
      parcel: lockedParcel._id,
      action: 'admin_override_unlock',
    });
    assert.ok(audit);
  });
});

