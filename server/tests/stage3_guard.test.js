const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const AuditLog = require('../src/models/AuditLog');
const { signToken } = require('../src/middleware/auth');

describe('Stage 3: Guard Dashboard, Receive & Code Release Verification', () => {
  let guardUser;
  let studentUser;
  let guardCookie;
  let studentCookie;
  let testParcel;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});

    // Create guard
    guardUser = await User.create({
      name: 'Head Guard Ram Singh',
      email: 'guard1@campus.edu',
      phone: '9811122233',
      passwordHash: 'hash123',
      hostel: 'Gate 1',
      room: 'Security Desk',
      role: 'guard',
      emailVerified: true,
    });
    const guardToken = signToken(guardUser);
    guardCookie = `gatekept_token=${guardToken}`;

    // Create student
    studentUser = await User.create({
      name: 'Aditi Rao',
      email: 'aditi@campus.edu',
      phone: '9899988877',
      passwordHash: 'hash123',
      hostel: 'Hostel C',
      room: '104',
      role: 'student',
      emailVerified: true,
    });
    const studentToken = signToken(studentUser);
    studentCookie = `gatekept_token=${studentToken}`;

    // Create parcel in awaiting_guard state
    testParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      rawName: studentUser.name,
      courier: 'Amazon',
      photoUrl: 'https://images.unsplash.com/photo-sample',
      collectionCode: '7412',
      status: 'awaiting_guard',
    });
  });

  after(async () => {
    await closeDB();
  });

  it('Denies student access to guard endpoints', async () => {
    const res = await request(app)
      .get('/api/parcels/incoming')
      .set('Cookie', studentCookie);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  it('Lists incoming parcels for guard without revealing collection code', async () => {
    const res = await request(app)
      .get('/api/parcels/incoming')
      .set('Cookie', guardCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcels.length, 1);
    // Code must NOT be in response
    assert.strictEqual(res.body.parcels[0].collectionCode, undefined);
  });

  it('Guard receives parcel at desk (status becomes at_gate)', async () => {
    const res = await request(app)
      .post(`/api/parcels/${testParcel._id}/receive`)
      .set('Cookie', guardCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.parcel.status, 'at_gate');
    assert.strictEqual(res.body.parcel.collectionCode, undefined);

    const updated = await Parcel.findById(testParcel._id);
    assert.strictEqual(updated.status, 'at_gate');
    assert.ok(updated.receivedAt);
    assert.strictEqual(updated.receivedBy.toString(), guardUser._id.toString());
  });

  it('Lists at-gate parcels with search support', async () => {
    const res = await request(app)
      .get('/api/parcels/at-gate?search=Aditi')
      .set('Cookie', guardCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcels.length, 1);
    assert.strictEqual(res.body.parcels[0].student.name, 'Aditi Rao');
  });

  it('Rejects release with incorrect collection code and increments attempts', async () => {
    const res = await request(app)
      .post(`/api/parcels/${testParcel._id}/release`)
      .set('Cookie', guardCookie)
      .send({ code: '0000' }); // Wrong code

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_COLLECTION_CODE');

    const updated = await Parcel.findById(testParcel._id);
    assert.strictEqual(updated.codeAttempts, 1);
  });

  it('Locks parcel after 5 consecutive incorrect attempts', async () => {
    // Send 4 more incorrect codes (attempts 2, 3, 4, 5)
    await request(app).post(`/api/parcels/${testParcel._id}/release`).set('Cookie', guardCookie).send({ code: '1111' });
    await request(app).post(`/api/parcels/${testParcel._id}/release`).set('Cookie', guardCookie).send({ code: '2222' });
    await request(app).post(`/api/parcels/${testParcel._id}/release`).set('Cookie', guardCookie).send({ code: '3333' });
    const fifthRes = await request(app).post(`/api/parcels/${testParcel._id}/release`).set('Cookie', guardCookie).send({ code: '4444' });

    assert.strictEqual(fifthRes.status, 403);
    assert.strictEqual(fifthRes.body.error.code, 'PARCEL_LOCKED');

    const lockedParcel = await Parcel.findById(testParcel._id);
    assert.strictEqual(lockedParcel.status, 'locked');
    assert.strictEqual(lockedParcel.codeAttempts, 5);
  });

  it('Successfully releases a new parcel with the correct 4-digit code', async () => {
    // Create another parcel in at_gate status
    const newParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      courier: 'Flipkart',
      photoUrl: 'https://images.unsplash.com/photo-2',
      collectionCode: '9182',
      status: 'at_gate',
    });

    const res = await request(app)
      .post(`/api/parcels/${newParcel._id}/release`)
      .set('Cookie', guardCookie)
      .send({ code: '9182' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.parcel.status, 'collected');

    const updated = await Parcel.findById(newParcel._id);
    assert.strictEqual(updated.status, 'collected');
    assert.ok(updated.collectedAt);
    assert.strictEqual(updated.collectedBy.toString(), guardUser._id.toString());
  });

  it('Guard can manually log a parcel directly at gate', async () => {
    const res = await request(app)
      .post('/api/parcels')
      .set('Cookie', guardCookie)
      .send({
        phone: '9899988877',
        name: 'Aditi Rao',
        courier: 'Swiggy',
        note: 'Food container at desk',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.parcel.status, 'at_gate');
    assert.strictEqual(res.body.parcel.courier, 'Swiggy');
  });
});

