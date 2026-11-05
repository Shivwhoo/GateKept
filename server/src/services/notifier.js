const nodemailer = require('nodemailer');
const config = require('../config/env');

class NotifierService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
      console.log(`✉️  SMTP Transport configured for ${config.SMTP_HOST}`);
    } else {
      console.log('ℹ️  SMTP not configured. Using console mock logger for emails.');
    }
  }

  /**
   * Core send email method
   */
  async sendEmail({ to, subject, text, html }) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: config.SMTP_FROM,
          to,
          subject,
          text,
          html,
        });
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error(`❌ Failed to send email to ${to}:`, err.message);
        // Do not crash the app, return failure
        return { success: false, error: err.message };
      }
    } else {
      // Dev/Fallback mock
      console.log('\n================== [GATEKEPT EMAIL MOCK] ==================');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text:\n${text}`);
      console.log('===========================================================\n');
      return { success: true, mocked: true };
    }
  }

  /**
   * Send 6-digit registration OTP
   */
  async sendOtpEmail(email, otp) {
    const subject = `[Gatekept] Your verification code is ${otp}`;
    const text = `Welcome to Gatekept!\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\nDo not share this code with anyone.`;
    const html = `
      <div style="font-family: 'Courier New', monospace; background-color: #F4F1EA; color: #16150F; padding: 24px; border: 2px solid #16150F; max-width: 500px; margin: 0 auto;">
        <div style="border-bottom: 2px dashed #16150F; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">GATEKEPT // HOSTEL SECURITY</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #5F5C54;">STUDENT VERIFICATION DISPATCH</p>
        </div>
        <p>Use the following one-time code to activate your account:</p>
        <div style="background-color: #FAF8F5; border: 2px solid #16150F; padding: 16px; text-align: center; margin: 20px 0; box-shadow: 4px 4px 0 #16150F;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #FF5B1F;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #5F5C54;">Expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send parcel arrival notification with collection code & photo
   */
  async sendParcelArrivedEmail({ to, studentName, courier, photoUrl, collectionCode, hostel, room }) {
    const subject = `[Gatekept] Parcel from ${courier} arrived at the gate! Code: ${collectionCode}`;
    const text = `Hi ${studentName},\n\nA parcel from ${courier} has been received at the security desk for Hostel ${hostel}, Room ${room}.\n\nYour 4-digit Collection Code: ${collectionCode}\n\nShow this code and your college ID to the guard to collect your parcel.\nPhoto: ${photoUrl}\n\nDo not share your collection code.`;
    const html = `
      <div style="font-family: 'Courier New', monospace; background-color: #F4F1EA; color: #16150F; padding: 24px; border: 2px solid #16150F; max-width: 520px; margin: 0 auto;">
        <div style="border-bottom: 2px dashed #16150F; padding-bottom: 12px; margin-bottom: 16px;">
          <span style="background-color: #FF5B1F; color: #FFF; padding: 3px 8px; font-size: 11px; font-weight: bold; letter-spacing: 1px;">PARCEL AT GATE</span>
          <h2 style="margin: 8px 0 0 0; font-size: 22px;">PARCEL RECEIVED</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #5F5C54;">Courier: <strong>${courier}</strong> | Recipient: <strong>${studentName}</strong> (${hostel} - ${room})</p>
        </div>

        <p style="margin: 12px 0;">Your parcel has been checked in by the security guard and is safely stored at the desk.</p>

        <div style="background-color: #FAF8F5; border: 2px solid #16150F; padding: 20px; text-align: center; margin: 20px 0; box-shadow: 4px 4px 0 #16150F;">
          <div style="font-size: 12px; color: #5F5C54; letter-spacing: 2px; text-transform: uppercase;">Collection Code</div>
          <div style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #16150F; margin: 8px 0;">${collectionCode}</div>
          <div style="font-size: 12px; color: #FF5B1F; font-weight: bold;">Show this to the guard with your College ID</div>
        </div>

        ${photoUrl ? `
          <div style="margin: 16px 0; text-align: center;">
            <div style="font-size: 12px; margin-bottom: 6px; text-align: left; color: #5F5C54;">PARCEL PHOTO ON ARRIVAL:</div>
            <img src="${photoUrl}" alt="Parcel Photo" style="max-width: 100%; border: 1.5px solid #16150F; max-height: 280px; object-fit: contain; background: #fff;" />
          </div>
        ` : ''}

        <div style="border-top: 2px dashed #16150F; padding-top: 12px; margin-top: 20px; font-size: 12px; color: #5F5C54;">
          Parcels uncollected for >6 hours will receive reminders. Stored securely at the gate desk.
        </div>
      </div>
    `;
    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send uncollected parcel reminder
   */
  async sendParcelReminderEmail({ to, studentName, courier, collectionCode, hoursWaiting }) {
    const subject = `[Gatekept Reminder] Parcel from ${courier} waiting at gate (${hoursWaiting} hrs)`;
    const text = `Hi ${studentName},\n\nYour parcel from ${courier} has been at the hostel gate desk for ${hoursWaiting} hours.\n\nYour Collection Code is still: ${collectionCode}\n\nPlease pick it up from the security desk with your College ID today.`;
    const html = `
      <div style="font-family: 'Courier New', monospace; background-color: #F4F1EA; color: #16150F; padding: 24px; border: 2px solid #16150F; max-width: 500px; margin: 0 auto;">
        <div style="border-bottom: 2px dashed #16150F; padding-bottom: 12px; margin-bottom: 16px;">
          <span style="background-color: #C28800; color: #FFF; padding: 3px 8px; font-size: 11px; font-weight: bold; letter-spacing: 1px;">REMINDER</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px;">PARCEL STILL AWAITING PICKUP</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #5F5C54;">Courier: <strong>${courier}</strong> (${hoursWaiting}h elapsed)</p>
        </div>
        <p>Please collect your package from the gate security desk before shift end.</p>
        <div style="background-color: #FAF8F5; border: 2px solid #16150F; padding: 16px; text-align: center; margin: 16px 0; box-shadow: 4px 4px 0 #16150F;">
          <div style="font-size: 11px; color: #5F5C54; letter-spacing: 1px;">COLLECTION CODE</div>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #16150F; margin: 4px 0;">${collectionCode}</div>
        </div>
      </div>
    `;
    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Push notification extension interface
   */
  async sendPushNotification(subscription, payload) {
    // Interface ready for web push integration in the future
    console.log('Push notification dispatched (stub interface):', payload);
    return { success: true, stub: true };
  }
}

module.exports = new NotifierService();
