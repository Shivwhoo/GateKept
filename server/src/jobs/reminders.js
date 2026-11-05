const cron = require('node-cron');
const { Parcel } = require('../models/Parcel');
const AuditLog = require('../models/AuditLog');
const notifier = require('../services/notifier');

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Runs the reminder & escalation evaluation check across all parcels at gate
 */
async function runReminderAndEscalationCheck() {
  const now = new Date();
  const summary = { remindersSent: 0, escalated: 0, checked: 0 };

  try {
    // Find parcels at gate
    const atGateParcels = await Parcel.find({
      status: 'at_gate',
    }).populate('student');

    summary.checked = atGateParcels.length;

    for (const parcel of atGateParcels) {
      // Calculate elapsed time from receivedAt (or droppedAt fallback)
      const startTime = parcel.receivedAt || parcel.droppedAt;
      if (!startTime) continue;

      const elapsedMs = now.getTime() - new Date(startTime).getTime();

      // 1. Escalation check: > 24 hours
      if (elapsedMs >= TWENTY_FOUR_HOURS_MS && !parcel.escalatedAt) {
        parcel.escalatedAt = now;
        await parcel.save();

        await AuditLog.create({
          parcel: parcel._id,
          actor: null,
          actorRole: 'system',
          action: 'escalated',
          meta: {
            hoursWaiting: Math.floor(elapsedMs / (1000 * 60 * 60)),
            reason: 'exceeded_24_hours_uncollected',
          },
        });

        summary.escalated += 1;
      }

      // 2. Reminder check: > 6 hours and max 2 reminders sent
      if (elapsedMs >= SIX_HOURS_MS && parcel.remindersSent < 2) {
        parcel.remindersSent += 1;
        await parcel.save();

        const hoursWaiting = Math.floor(elapsedMs / (1000 * 60 * 60));

        if (parcel.student && parcel.student.email) {
          await notifier.sendParcelReminderEmail({
            to: parcel.student.email,
            studentName: parcel.student.name,
            courier: parcel.courier,
            collectionCode: parcel.collectionCode,
            hoursWaiting,
          });
        }

        await AuditLog.create({
          parcel: parcel._id,
          actor: null,
          actorRole: 'system',
          action: 'reminder_sent',
          meta: {
            reminderNumber: parcel.remindersSent,
            hoursWaiting,
          },
        });

        summary.remindersSent += 1;
      }
    }

    return summary;
  } catch (err) {
    console.error('Error running reminder & escalation check:', err.message);
    throw err;
  }
}

/**
 * Initializes cron schedule (runs every 30 minutes: '0,30 * * * *')
 */
function initReminderCron() {
  // Cron schedule: every 30 minutes
  const task = cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ Running 30-minute parcel reminder & escalation check...');
    const result = await runReminderAndEscalationCheck();
    console.log(`⏰ Reminder check finished: ${result.remindersSent} reminders, ${result.escalated} escalated.`);
  });

  console.log('⏰ Parcel reminder cron job initialized (interval: 30 minutes).');
  return task;
}

module.exports = {
  runReminderAndEscalationCheck,
  initReminderCron,
};

