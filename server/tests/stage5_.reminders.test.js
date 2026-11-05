const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const { Parcel } = require('../src/models/Parcel');
const AuditLog = require('../src/models/AuditLog');
const { runReminderAndEscalationCheck } = require('../src/jobs/reminders');

describe('Stage 5: Cron Reminders & Escalation Job', () => {
  let studentUser;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await User.deleteMany({});
    await Parcel.deleteMany({});
    await AuditLog.deleteMany({});

    studentUser = await User.create({
      name: 'Pooja Hegde',
      email: 'pooja@campus.edu',
      phone: '9870011223',
      passwordHash: 'hash',
      hostel: 'Hostel D',
      room: '401',
      role: 'student',
      emailVerified: true,
    });
  });

  after(async () => {
    await closeDB();
  });

  it('Does not trigger reminders for fresh parcels (<6 hours)', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const freshParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      courier: 'Amazon',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '1122',
      status: 'at_gate',
      receivedAt: twoHoursAgo,
      droppedAt: twoHoursAgo,
      remindersSent: 0,
    });

    const summary = await runReminderAndEscalationCheck();
    assert.strictEqual(summary.remindersSent, 0);
    assert.strictEqual(summary.escalated, 0);

    const check = await Parcel.findById(freshParcel._id);
    assert.strictEqual(check.remindersSent, 0);
    assert.strictEqual(check.escalatedAt, null);
  });

  it('Sends reminder #1 for parcels waiting >6 hours', async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const waitingParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      courier: 'Flipkart',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '3344',
      status: 'at_gate',
      receivedAt: eightHoursAgo,
      droppedAt: eightHoursAgo,
      remindersSent: 0,
    });

    const summary = await runReminderAndEscalationCheck();
    assert.strictEqual(summary.remindersSent, 1);

    const check = await Parcel.findById(waitingParcel._id);
    assert.strictEqual(check.remindersSent, 1);

    const audit = await AuditLog.findOne({ parcel: waitingParcel._id, action: 'reminder_sent' });
    assert.ok(audit);
    assert.strictEqual(audit.meta.reminderNumber, 1);
  });

  it('Respects maximum of 2 reminders', async () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const cappedParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      courier: 'Myntra',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '5566',
      status: 'at_gate',
      receivedAt: twelveHoursAgo,
      droppedAt: twelveHoursAgo,
      remindersSent: 2, // Already reached maximum 2 reminders
    });

    await runReminderAndEscalationCheck();

    const check = await Parcel.findById(cappedParcel._id);
    assert.strictEqual(check.remindersSent, 2); // Still 2
  });

  it('Escalates parcels waiting >24 hours at the gate', async () => {
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
    const overdueParcel = await Parcel.create({
      student: studentUser._id,
      rawPhone: studentUser.phone,
      courier: 'Zomato',
      photoUrl: 'https://images.unsplash.com/sample',
      collectionCode: '7788',
      status: 'at_gate',
      receivedAt: thirtyHoursAgo,
      droppedAt: thirtyHoursAgo,
      remindersSent: 2,
    });

    const summary = await runReminderAndEscalationCheck();
    assert.strictEqual(summary.escalated, 1);

    const check = await Parcel.findById(overdueParcel._id);
    assert.ok(check.escalatedAt);

    const audit = await AuditLog.findOne({ parcel: overdueParcel._id, action: 'escalated' });
    assert.ok(audit);
  });
});

