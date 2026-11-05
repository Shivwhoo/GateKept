const path = require('path');
// Ensure modules in server/node_modules can be resolved
module.paths.push(path.join(__dirname, '../server/node_modules'));

const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Load environment config
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { connectDB, closeDB } = require('../server/src/config/db');
const User = require('../server/src/models/User');
const { Parcel, COURIER_ENUM } = require('../server/src/models/Parcel');
const AuditLog = require('../server/src/models/AuditLog');
const { generateCollectionCode } = require('../server/src/utils/code');

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80',
];

const SAMPLE_NOTES = [
  'Fragile electronics - handle with care',
  'Heavy cardboard box',
  'Small envelope from Amazon',
  'Keep in cool place',
  'Deliver to desk immediately',
  'Course textbooks - CSE Dept',
  'Hostel essentials package',
  'Two taped boxes bundled together',
];

async function seed() {
  console.log('🌱 Starting Gatekept Database Seeder (Real IIIT Dharwad Roster)...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Parcel.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('🧹 Cleaned existing database records.');

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Create Admins (both iiitdwd.ac.in and campus.edu for universal compatibility)
  const admin = await User.create({
    name: 'Superintendent K. Rao',
    email: 'admin@iiitdwd.ac.in',
    phone: '9800000001',
    passwordHash: defaultPasswordHash,
    hostel: 'Admin Block',
    room: 'Office 1',
    role: 'admin',
    emailVerified: true,
  });

  const adminBackup = await User.create({
    name: 'Chief Warden Office',
    email: 'admin@campus.edu',
    phone: '9800000099',
    passwordHash: defaultPasswordHash,
    hostel: 'Admin Block',
    room: 'Warden Suite',
    role: 'admin',
    emailVerified: true,
  });
  console.log('✅ Created Admins: admin@iiitdwd.ac.in & admin@campus.edu (pass: password123)');

  // 2. Create Guards
  const guard1 = await User.create({
    name: 'Guard Baldev Singh',
    email: 'guard1@iiitdwd.ac.in',
    phone: '9800000002',
    passwordHash: defaultPasswordHash,
    hostel: 'Hostel Gate 1',
    room: 'Desk North',
    role: 'guard',
    emailVerified: true,
  });

  const guard2 = await User.create({
    name: 'Guard Surender Kumar',
    email: 'guard2@iiitdwd.ac.in',
    phone: '9800000003',
    passwordHash: defaultPasswordHash,
    hostel: 'Hostel Gate 2',
    room: 'Desk South',
    role: 'guard',
    emailVerified: true,
  });

  // Also create campus.edu guard accounts for test compatibility
  await User.create({
    name: 'Guard Baldev Singh (Relief)',
    email: 'guard1@campus.edu',
    phone: '9800000012',
    passwordHash: defaultPasswordHash,
    hostel: 'Hostel Gate 1',
    room: 'Desk North',
    role: 'guard',
    emailVerified: true,
  });
  await User.create({
    name: 'Guard Surender Kumar (Relief)',
    email: 'guard2@campus.edu',
    phone: '9800000013',
    passwordHash: defaultPasswordHash,
    hostel: 'Hostel Gate 2',
    room: 'Desk South',
    role: 'guard',
    emailVerified: true,
  });
  console.log('✅ Created Guards: guard1@iiitdwd.ac.in, guard2@iiitdwd.ac.in (pass: password123)');

  // 3. Load Real IIIT Dharwad Students Roster
  const rosterPath = path.join(__dirname, 'iiitdwd_students_all.json');
  let rawStudents = [];
  if (fs.existsSync(rosterPath)) {
    rawStudents = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  }

  // Ensure Shivam Kishore (24BCS140) is #1
  const targetUser = rawStudents.find((s) => s.regNo === '24BCS140') || {
    regNo: '24BCS140',
    name: 'SHIVAM KISHORE',
    email: '24bcs140@iiitdwd.ac.in',
  };

  const otherStudents = rawStudents.filter((s) => s.regNo !== '24BCS140');

  // Select 50 representative real students across branches (CSE, DSAI, ECE)
  const selectedRoster = [targetUser];
  const batchMap = {};
  for (const s of otherStudents) {
    const batch = s.regNo.slice(0, 5);
    batchMap[batch] = (batchMap[batch] || 0) + 1;
    if (batchMap[batch] <= 4) {
      selectedRoster.push(s);
    }
    if (selectedRoster.length >= 50) break;
  }

  const hostels = ['Hostel Block 1', 'Hostel Block 2', 'Girls Hostel'];
  const createdStudents = [];

  for (let idx = 0; idx < selectedRoster.length; idx++) {
    const item = selectedRoster[idx];
    const isTarget = item.regNo === '24BCS140';

    const phone = isTarget ? '9876543210' : `98765${String(idx).padStart(5, '0')}`;
    const hostel = isTarget ? 'Hostel Block 1' : hostels[idx % hostels.length];
    const room = isTarget ? '140' : String(100 + (idx % 40));

    const student = await User.create({
      name: item.name,
      email: item.email.toLowerCase(),
      phone,
      hostel,
      room,
      passwordHash: defaultPasswordHash,
      role: 'student',
      emailVerified: true,
    });
    createdStudents.push(student);
  }
  console.log(`✅ Seeded ${createdStudents.length} Real IIIT Dharwad Students:`);
  console.log(`   - Target: ${targetUser.name} (${targetUser.email}) - phone: 9876543210 (pass: password123)`);
  console.log(`   - Batches represented: 23BCS, 23BDS, 23BEC, 24BCS, 24BDS, 24BEC, 25BCS, 25BDA, 26BAI`);

  // 4. Create 50 Sample Parcels in mixed states
  // We guarantee Shivam Kishore has 5 active parcels in diverse states!
  const now = Date.now();
  const sampleParcels = [];
  const shivam = createdStudents[0];

  const shivamScenarios = [
    {
      courier: 'Blinkit',
      note: 'Midnight snack delivery & energy drinks - Room 140',
      status: 'awaiting_guard',
      offsetMinutes: 12,
      photoUrl: SAMPLE_PHOTOS[0],
    },
    {
      courier: 'Amazon',
      note: 'AmazonBasics Adjustable Laptop Stand & Mouse',
      status: 'at_gate',
      code: '8492',
      offsetMinutes: 180, // 3 hours ago
      photoUrl: SAMPLE_PHOTOS[1],
    },
    {
      courier: 'Flipkart',
      note: 'Boat Rockerz 450 Bluetooth Headphones',
      status: 'at_gate',
      code: '4271',
      offsetMinutes: 1600, // >26 hours ago (escalated!)
      photoUrl: SAMPLE_PHOTOS[2],
    },
    {
      courier: 'Myntra',
      note: "Puma Men's Training Shoes - Size 9",
      status: 'collected',
      code: '1905',
      offsetMinutes: 2880, // 2 days ago
      photoUrl: SAMPLE_PHOTOS[3],
    },
    {
      courier: 'Swiggy',
      note: 'Hyderabadi Dum Biryani meal box',
      status: 'collected',
      code: '7731',
      offsetMinutes: 4320, // 3 days ago
      photoUrl: SAMPLE_PHOTOS[4],
    },
  ];

  // Insert Shivam's 5 parcels
  for (const scen of shivamScenarios) {
    const droppedAt = new Date(now - scen.offsetMinutes * 60 * 1000);
    let receivedAt = null;
    let receivedBy = null;
    let collectedAt = null;
    let collectedBy = null;
    let collectedByStudentVerified = false;
    let remindersSent = 0;
    let escalatedAt = null;

    if (scen.status === 'at_gate') {
      receivedAt = new Date(droppedAt.getTime() + 10 * 60 * 1000);
      receivedBy = guard1._id;
      const elapsedHours = (now - receivedAt.getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        escalatedAt = new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000);
        remindersSent = 2;
      } else if (elapsedHours > 6) {
        remindersSent = 1;
      }
    } else if (scen.status === 'collected') {
      receivedAt = new Date(droppedAt.getTime() + 15 * 60 * 1000);
      receivedBy = guard2._id;
      collectedAt = new Date(receivedAt.getTime() + 45 * 60 * 1000);
      collectedBy = guard2._id;
      collectedByStudentVerified = true;
    }

    const parcel = await Parcel.create({
      student: shivam._id,
      rawPhone: shivam.phone,
      rawName: shivam.name,
      courier: scen.courier,
      photoUrl: scen.photoUrl,
      note: scen.note,
      collectionCode: scen.code || generateCollectionCode(),
      codeAttempts: 0,
      status: scen.status,
      droppedAt,
      receivedAt,
      receivedBy,
      collectedAt,
      collectedBy,
      collectedByStudentVerified,
      remindersSent,
      escalatedAt,
    });
    sampleParcels.push(parcel);

    await AuditLog.create({
      parcel: parcel._id,
      actor: null,
      actorRole: 'delivery',
      action: 'dropped',
      meta: { courier: scen.courier, status: scen.status },
      at: droppedAt,
    });

    if (receivedAt) {
      await AuditLog.create({
        parcel: parcel._id,
        actor: receivedBy,
        actorRole: 'guard',
        action: 'received',
        meta: { guardName: guard1.name },
        at: receivedAt,
      });
    }

    if (collectedAt) {
      await AuditLog.create({
        parcel: parcel._id,
        actor: collectedBy,
        actorRole: 'guard',
        action: 'released',
        meta: { verified: true },
        at: collectedAt,
      });
    }
  }

  // Insert 45 more parcels across the rest of the student cohort
  for (let i = 6; i <= 50; i++) {
    const courier = COURIER_ENUM[i % COURIER_ENUM.length];
    const photoUrl = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];
    const note = SAMPLE_NOTES[i % SAMPLE_NOTES.length];
    const code = generateCollectionCode();
    const student = createdStudents[i % createdStudents.length];
    const guard = i % 2 === 0 ? guard1 : guard2;

    let status = 'at_gate';
    let droppedAt = new Date(now - i * 35 * 60 * 1000);
    let receivedAt = null;
    let receivedBy = null;
    let collectedAt = null;
    let collectedBy = null;
    let collectedByStudentVerified = false;
    let remindersSent = 0;
    let escalatedAt = null;
    let codeAttempts = 0;
    let studentRef = student._id;
    let rawPhone = student.phone;
    let rawName = student.name;

    if (i <= 12) {
      // 7 awaiting_guard
      status = 'awaiting_guard';
      droppedAt = new Date(now - (i - 5) * 8 * 60 * 1000);
    } else if (i <= 17) {
      // 5 unmatched (unregistered phone numbers)
      status = 'unmatched';
      studentRef = null;
      rawPhone = `999900000${i}`;
      rawName = `Campus Visitor / Guest ${i}`;
      droppedAt = new Date(now - i * 20 * 60 * 1000);
      receivedAt = new Date(now - i * 15 * 60 * 1000);
      receivedBy = guard._id;
    } else if (i <= 20) {
      // 3 locked parcels (5 failed attempts)
      status = 'locked';
      codeAttempts = 5;
      receivedAt = new Date(now - i * 40 * 60 * 1000);
      receivedBy = guard._id;
    } else if (i <= 34) {
      // 14 collected parcels
      status = 'collected';
      receivedAt = new Date(droppedAt.getTime() + 15 * 60 * 1000);
      receivedBy = guard._id;
      collectedAt = new Date(receivedAt.getTime() + (i * 10) * 60 * 1000);
      collectedBy = guard._id;
      collectedByStudentVerified = true;
    } else {
      // 16 at_gate parcels
      status = 'at_gate';
      receivedAt = new Date(droppedAt.getTime() + 10 * 60 * 1000);
      receivedBy = guard._id;

      const elapsedHours = (now - receivedAt.getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        escalatedAt = new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000);
        remindersSent = 2;
      } else if (elapsedHours > 6) {
        remindersSent = 1;
      }
    }

    const parcel = await Parcel.create({
      student: studentRef,
      rawPhone,
      rawName,
      courier,
      photoUrl,
      note,
      collectionCode: code,
      codeAttempts,
      status,
      droppedAt,
      receivedAt,
      receivedBy,
      collectedAt,
      collectedBy,
      collectedByStudentVerified,
      remindersSent,
      escalatedAt,
    });

    sampleParcels.push(parcel);

    await AuditLog.create({
      parcel: parcel._id,
      actor: null,
      actorRole: 'delivery',
      action: 'dropped',
      meta: { courier, status },
      at: droppedAt,
    });

    if (receivedAt) {
      await AuditLog.create({
        parcel: parcel._id,
        actor: receivedBy,
        actorRole: 'guard',
        action: 'received',
        meta: { guardName: guard.name },
        at: receivedAt,
      });
    }

    if (collectedAt) {
      await AuditLog.create({
        parcel: parcel._id,
        actor: collectedBy,
        actorRole: 'guard',
        action: 'released',
        meta: { verified: true },
        at: collectedAt,
      });
    }
  }

  const statusCounts = sampleParcels.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n✅ Seeded ${sampleParcels.length} Real Parcels in mixed states:`);
  console.log(`   - Awaiting Guard: ${statusCounts.awaiting_guard || 0}`);
  console.log(`   - At Gate (Stored): ${statusCounts.at_gate || 0}`);
  console.log(`   - Collected: ${statusCounts.collected || 0}`);
  console.log(`   - Unmatched: ${statusCounts.unmatched || 0}`);
  console.log(`   - Locked: ${statusCounts.locked || 0}`);
  console.log('\n🎉 Seed data populated successfully with real IIIT Dharwad records!');
  await closeDB();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seed;
