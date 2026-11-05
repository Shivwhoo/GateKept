const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const AuditLog = require('../src/models/AuditLog');
const { signToken } = require('../src/middleware/auth');

describe('Gatekept End-to-End System Integration Test Suite', () => {
  let admin, guard, student;
  let adminCookie, guardCookie, studentCookie;
  let droppedParcelId;
  let parcelCollectionCode;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.COLLEGE_EMAIL_DOMAIN = 'campus.edu';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Setup Student
    student = await User.create({
      name: 'Rohan Verma',
      email: 'rohan@campus.edu',
      phone: '9811122233',
      passwordHash: 'hash',
      hostel: 'Hostel B',
      room: '312',
      role: 'student',
      emailVerified: true,
    });
    studentCookie = `gatekept_token=${signToken(student)}`;

    // 2. Setup Guard
    guard = await User.create({
      name: 'Guard Baldev',
      email: 'guard@campus.edu',
      phone: '9811100000',
      passwordHash: 'hash',
      hostel: 'Gate 1',
      room: 'Desk',
      role: 'guard',
      emailVerified: true,
    });
    guardCookie = `gatekept_token=${signToken(guard)}`;

    // 3. Setup Admin
    admin = await User.create({
      name: 'Admin Superintendent',
      email: 'admin@campus.edu',
      phone: '9800099999',
      passwordHash: 'hash',
      hostel: 'Main Office',
      room: 'HQ',
      role: 'admin',
      emailVerified: true,
    });
    adminCookie = `gatekept_token=${signToken(admin)}`;
  });

  after(async () => {
    await closeDB();
  });

  // FLOW 1: Drop parcel via public QR
  it('1. Public delivery agent drops parcel with student phone -> status awaiting_guard', async () => {
    const res = await request(app)
      .post('/api/drop')
      .send({
        phone: '9811122233',
        name: 'Rohan Verma',
        courier: 'Amazon',
        photo: 'data:image/jpeg;base64,mockphotodata',
        note: 'Blue package box',
        _hp: '', // clean honeypot
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.parcel.status, 'awaiting_guard');
    assert.strictEqual(res.body.parcel.studentMatched, true);
    assert.strictEqual(res.body.parcel.collectionCode, undefined); // Hidden from delivery

    droppedParcelId = res.body.parcel.id;

    const saved = await Parcel.findById(droppedParcelId);
    assert.ok(saved);
    parcelCollectionCode = saved.collectionCode;
    assert.strictEqual(parcelCollectionCode.length, 4);
  });

  // FLOW 2: Guard inspects incoming and receives parcel
  it('2. Guard views incoming list (without code) and receives parcel -> status at_gate', async () => {
    // Check incoming list
    const incomingRes = await request(app)
      .get('/api/parcels/incoming')
      .set('Cookie', guardCookie);

    assert.strictEqual(incomingRes.status, 200);
    const found = incomingRes.body.parcels.find((p) => p._id.toString() === droppedParcelId);
    assert.ok(found);
    assert.strictEqual(found.collectionCode, undefined); // Hidden from guard

    // Guard receives parcel
    const receiveRes = await request(app)
      .post(`/api/parcels/${droppedParcelId}/receive`)
      .set('Cookie', guardCookie);

    assert.strictEqual(receiveRes.status, 200);
    assert.strictEqual(receiveRes.body.parcel.status, 'at_gate');
    assert.strictEqual(receiveRes.body.parcel.collectionCode, undefined);

    const check = await Parcel.findById(droppedParcelId);
    assert.strictEqual(check.status, 'at_gate');
    assert.ok(check.receivedAt);
    assert.strictEqual(check.receivedBy.toString(), guard._id.toString());
  });

  // FLOW 3: Student sees parcel and 4-digit code in their dashboard
  it('3. Student retrieves collection code from their personal dashboard', async () => {
    const res = await request(app)
      .get('/api/parcels/mine')
      .set('Cookie', studentCookie);

    assert.strictEqual(res.status, 200);
    const myParcel = res.body.parcels.find((p) => p._id.toString() === droppedParcelId);
    assert.ok(myParcel);
    assert.strictEqual(myParcel.collectionCode, parcelCollectionCode);
    assert.strictEqual(myParcel.status, 'at_gate');
  });

  // FLOW 4: Incorrect code verification behavior & lockout
  it('4. Guard attempts release with wrong code -> increments attempt counter', async () => {
    const res = await request(app)
      .post(`/api/parcels/${droppedParcelId}/release`)
      .set('Cookie', guardCookie)
      .send({ code: '0000' }); // Deliberately wrong

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_COLLECTION_CODE');

    const check = await Parcel.findById(droppedParcelId);
    assert.strictEqual(check.codeAttempts, 1);
  });

  // FLOW 5: Correct code release
  it('5. Guard releases parcel with correct code -> status collected', async () => {
    const res = await request(app)
      .post(`/api/parcels/${droppedParcelId}/release`)
      .set('Cookie', guardCookie)
      .send({ code: parcelCollectionCode });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcel.status, 'collected');

    const check = await Parcel.findById(droppedParcelId);
    assert.strictEqual(check.status, 'collected');
    assert.ok(check.collectedAt);
    assert.strictEqual(check.collectedByStudentVerified, true);
  });

  // FLOW 6: Lockout test on a fresh parcel
  it('6. Five consecutive wrong attempts lock parcel and require admin override', async () => {
    const fresh = await Parcel.create({
      student: student._id,
      rawPhone: student.phone,
      courier: 'Swiggy',
      photoUrl: 'https://images.unsplash.com/mock',
      collectionCode: '7788',
      status: 'at_gate',
    });

    // 4 wrong attempts
    for (let i = 1; i <= 4; i++) {
      const wrongRes = await request(app)
        .post(`/api/parcels/${fresh._id}/release`)
        .set('Cookie', guardCookie)
        .send({ code: `111${i}` });
      assert.strictEqual(wrongRes.status, 400);
    }

    // 5th wrong attempt triggers lockout
    const fifthRes = await request(app)
      .post(`/api/parcels/${fresh._id}/release`)
      .set('Cookie', guardCookie)
      .send({ code: '9999' });

    assert.strictEqual(fifthRes.status, 403);
    assert.strictEqual(fifthRes.body.error.code, 'PARCEL_LOCKED');

    // Admin overrides
    const overrideRes = await request(app)
      .post(`/api/admin/parcels/${fresh._id}/override`)
      .set('Cookie', adminCookie)
      .send({ action: 'unlock' });

    assert.strictEqual(overrideRes.status, 200);
    assert.strictEqual(overrideRes.body.parcel.status, 'at_gate');
    assert.strictEqual(overrideRes.body.parcel.codeAttempts, 0);
  });

  // FLOW 7: Role guards authorization
  it('7. Role guards strictly enforce route privileges', async () => {
    // Student trying to hit admin stats
    const studentAsAdmin = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', studentCookie);
    assert.strictEqual(studentAsAdmin.status, 403);

    // Guard trying to hit admin users
    const guardAsAdmin = await request(app)
      .get('/api/admin/users')
      .set('Cookie', guardCookie);
    assert.strictEqual(guardAsAdmin.status, 403);

    // Public trying to hit guard at-gate
    const publicAsGuard = await request(app)
      .get('/api/parcels/at-gate');
    assert.strictEqual(publicAsGuard.status, 401);
  });
});

