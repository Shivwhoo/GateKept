const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const AuditLog = require('../src/models/AuditLog');

describe('Stage 2: Public Drop Form with Matching & Captcha', () => {
  let registeredStudent;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});

    // Create a registered student
    registeredStudent = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@campus.edu',
      phone: '9876501234',
      passwordHash: 'hashed123',
      hostel: 'Hostel B',
      room: '302',
      role: 'student',
      emailVerified: true,
    });
  });

  after(async () => {
    await closeDB();
  });

  it('Rejects bot submission with honeypot filled', async () => {
    const res = await request(app)
      .post('/api/drop')
      .send({
        phone: '9876501234',
        courier: 'Amazon',
        photo: 'data:image/jpeg;base64,samplephoto',
        _hp: 'i_am_a_bot',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'SPAM_DETECTED');
  });

  it('Successfully drops parcel for registered student (status awaiting_guard)', async () => {
    const res = await request(app)
      .post('/api/drop')
      .send({
        phone: '9876501234',
        name: 'Rohan Sharma',
        courier: 'Amazon',
        photo: 'data:image/jpeg;base64,mockimagedata',
        note: 'Small cardboard box',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.parcel.status, 'awaiting_guard');
    assert.strictEqual(res.body.parcel.studentMatched, true);
    assert.strictEqual(res.body.parcel.matchedStudentName, 'Rohan Sharma');

    // CRITICAL: Ensure collection code is NEVER sent to delivery agent!
    assert.strictEqual(res.body.parcel.collectionCode, undefined);
    assert.strictEqual(res.body.collectionCode, undefined);

    // Verify DB
    const parcelInDb = await Parcel.findById(res.body.parcel.id);
    assert.ok(parcelInDb);
    assert.strictEqual(parcelInDb.status, 'awaiting_guard');
    assert.strictEqual(parcelInDb.student.toString(), registeredStudent._id.toString());
    assert.strictEqual(parcelInDb.collectionCode.length, 4);

    // Verify AuditLog
    const audit = await AuditLog.findOne({ parcel: parcelInDb._id, action: 'dropped' });
    assert.ok(audit);
    assert.strictEqual(audit.actorRole, 'delivery');
  });

  it('Successfully drops parcel for unregistered phone (status unmatched)', async () => {
    const res = await request(app)
      .post('/api/drop')
      .send({
        phone: '9999988888',
        name: 'Guest Person',
        courier: 'Flipkart',
        photo: 'data:image/jpeg;base64,mockimagedata',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.parcel.status, 'unmatched');
    assert.strictEqual(res.body.parcel.studentMatched, false);

    const parcelInDb = await Parcel.findById(res.body.parcel.id);
    assert.ok(parcelInDb);
    assert.strictEqual(parcelInDb.student, null);
    assert.strictEqual(parcelInDb.status, 'unmatched');
  });
});

