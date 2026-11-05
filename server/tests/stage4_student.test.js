const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const { signToken } = require('../src/middleware/auth');

describe('Stage 4: Student Dashboard & Code Security', () => {
  let student1, student2;
  let cookie1, cookie2;
  let parcelStudent1, parcelStudent2;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});

    // Create student 1
    student1 = await User.create({
      name: 'Maya Patel',
      email: 'maya@campus.edu',
      phone: '9822233344',
      passwordHash: 'hash',
      hostel: 'Hostel A',
      room: '101',
      role: 'student',
      emailVerified: true,
    });
    cookie1 = `gatekept_token=${signToken(student1)}`;

    // Create student 2
    student2 = await User.create({
      name: 'Karan Mehra',
      email: 'karan@campus.edu',
      phone: '9844455566',
      passwordHash: 'hash',
      hostel: 'Hostel B',
      room: '202',
      role: 'student',
      emailVerified: true,
    });
    cookie2 = `gatekept_token=${signToken(student2)}`;

    // Create parcels
    parcelStudent1 = await Parcel.create({
      student: student1._id,
      rawPhone: student1.phone,
      courier: 'Blinkit',
      photoUrl: 'https://images.unsplash.com/photo-1',
      collectionCode: '4321',
      status: 'at_gate',
    });

    parcelStudent2 = await Parcel.create({
      student: student2._id,
      rawPhone: student2.phone,
      courier: 'Amazon',
      photoUrl: 'https://images.unsplash.com/photo-2',
      collectionCode: '9876',
      status: 'at_gate',
    });
  });

  after(async () => {
    await closeDB();
  });

  it('Student 1 sees only their own parcels with their collection code', async () => {
    const res = await request(app)
      .get('/api/parcels/mine')
      .set('Cookie', cookie1);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcels.length, 1);
    assert.strictEqual(res.body.parcels[0]._id.toString(), parcelStudent1._id.toString());
    assert.strictEqual(res.body.parcels[0].collectionCode, '4321');
  });

  it('Student 2 sees only their own parcels with their collection code', async () => {
    const res = await request(app)
      .get('/api/parcels/mine')
      .set('Cookie', cookie2);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parcels.length, 1);
    assert.strictEqual(res.body.parcels[0]._id.toString(), parcelStudent2._id.toString());
    assert.strictEqual(res.body.parcels[0].collectionCode, '9876');
  });

  it('Unauthenticated requests are blocked from /api/parcels/mine', async () => {
    const res = await request(app).get('/api/parcels/mine');
    assert.strictEqual(res.status, 401);
  });
});

