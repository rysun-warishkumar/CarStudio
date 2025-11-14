const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Create transporter with SMTP configuration
      const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
      const isSecure = smtpPort === 465;
      
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: smtpPort,
        secure: isSecure, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      // Don't throw error - allow app to continue without email service
    }
  }

  async loadEmailTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return handlebars.compile(templateContent);
    } catch (error) {
      console.error(`Error loading email template ${templateName}:`, error.message);
      throw error;
    }
  }

  async sendBookingConfirmation(bookingData) {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email service not available - skipping email send');
        return { success: false, message: 'Email service not configured' };
      }

      // Load and compile the email template
      const template = await this.loadEmailTemplate('bookingConfirmation');
      
      // Prepare template data
      const templateData = {
        customerName: `${bookingData.customer_name}`,
        bookingId: bookingData.id,
        bookingDate: new Date(bookingData.booking_date).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        bookingTime: bookingData.booking_time,
        customerPhone: bookingData.customer_phone || 'Not provided',
        vehicleMake: bookingData.vehicle_make || 'Not specified',
        vehicleModel: bookingData.vehicle_model || 'Not specified',
        vehicleRegistration: bookingData.vehicle_registration || 'Not provided',
        bookingStatus: bookingData.status || 'confirmed',
        services: bookingData.services || [],
        totalAmount: bookingData.total_amount?.toLocaleString('en-IN') || '0',
        notes: bookingData.notes || ''
      };

      // Generate HTML content
      const htmlContent = template(templateData);

      // Email options
      const mailOptions = {
        from: {
          name: 'Car Detailing Studio - W Technology',
          address: process.env.SMTP_USER || process.env.EMAIL_USER || 'info@wtechnology.in'
        },
        to: bookingData.customer_email || bookingData.email,
        subject: `Booking Confirmation #${bookingData.id} - Car Detailing Studio`,
        html: htmlContent,
        // Add text version for email clients that don't support HTML
        text: this.generateTextVersion(templateData)
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking confirmation email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  generateTextVersion(data) {
    return `
Hello ${data.customerName}!

Thank you for choosing Car Detailing Studio! Your booking has been confirmed.

BOOKING DETAILS:
- Booking ID: #${data.bookingId}
- Date & Time: ${data.bookingDate} at ${data.bookingTime}
- Customer: ${data.customerName}
- Phone: ${data.customerPhone}
- Vehicle: ${data.vehicleMake} ${data.vehicleModel}
- Registration: ${data.vehicleRegistration}
- Status: ${data.bookingStatus}

SERVICES BOOKED:
${data.services.map(service => `- ${service.serviceName} (Qty: ${service.quantity}) - ₹${service.price}`).join('\n')}

TOTAL AMOUNT: ₹${data.totalAmount}

IMPORTANT INFORMATION:
- Please arrive 10 minutes before your scheduled appointment
- Bring a valid ID and vehicle registration documents
- Remove all personal belongings from your vehicle
- We accept cash, card, and digital payments
- For any changes or cancellations, please contact us at least 2 hours in advance

CONTACT INFORMATION:
- Phone: +91 98765 43210
- Email: info@cardetailingstudio.com
- Address: 123 Auto Care Street, Car City, CC 12345
- Business Hours: Mon-Sat: 8:00 AM - 7:00 PM

Thank you for choosing Car Detailing Studio!

Best regards,
Car Detailing Studio Team
Developed by W Technology
    `.trim();
  }

  async testEmailConnection() {
    try {
      if (!this.transporter) {
        return { success: false, message: 'Email service not initialized' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
