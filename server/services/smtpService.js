const net = require('net');
const tls = require('tls');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const { pool } = require('../database/config');

class SMTPService {
  constructor() {
    this.settings = null;
    this.settingsLoaded = false;
    this.loadSettings();
  }

  async loadSettings() {
    try {
      console.log('📧 Loading SMTP settings...');
      const [settings] = await pool.execute(
        'SELECT * FROM smtp_settings WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
      );
      
      if (settings.length > 0) {
        this.settings = settings[0];
        console.log('📧 SMTP settings loaded from database:', {
          host: this.settings.smtp_host,
          port: this.settings.smtp_port,
          user: this.settings.smtp_user,
          secure: this.settings.smtp_secure
        });
      } else {
        // Fallback to environment variables
        this.settings = {
          smtp_host: process.env.SMTP_HOST || 'smtp.hostinger.com',
          smtp_port: parseInt(process.env.SMTP_PORT) || 465,
          smtp_user: process.env.SMTP_USER || 'info@wtechnology.in',
          smtp_pass: process.env.SMTP_PASS || 'Admin@6706',
          smtp_secure: (parseInt(process.env.SMTP_PORT) || 465) === 465,
          from_name: 'Car Detailing Studio - W Technology',
          from_email: process.env.SMTP_USER || 'info@wtechnology.in'
        };
        console.log('📧 SMTP settings loaded from environment variables:', {
          host: this.settings.smtp_host,
          port: this.settings.smtp_port,
          user: this.settings.smtp_user,
          secure: this.settings.smtp_secure
        });
      }
      this.settingsLoaded = true;
    } catch (error) {
      console.error('❌ Failed to load SMTP settings:', error.message);
      // Use fallback settings
      this.settings = {
        smtp_host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        smtp_port: parseInt(process.env.SMTP_PORT) || 465,
        smtp_user: process.env.SMTP_USER || 'info@wtechnology.in',
        smtp_pass: process.env.SMTP_PASS || 'Admin@6706',
        smtp_secure: (parseInt(process.env.SMTP_PORT) || 465) === 465,
        from_name: 'Car Detailing Studio - W Technology',
        from_email: process.env.SMTP_USER || 'info@wtechnology.in'
      };
      this.settingsLoaded = true;
      console.log('📧 Using fallback SMTP settings');
    }
  }

  getSettings() {
    return this.settings;
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

  async sendEmail(to, subject, htmlContent, textContent) {
    // Wait for settings to be loaded
    if (!this.settingsLoaded) {
      console.log('📧 Waiting for SMTP settings to load...');
      let attempts = 0;
      while (!this.settingsLoaded && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }

    if (!this.settings) {
      return { success: false, message: 'SMTP settings not configured' };
    }

    console.log('📧 Sending email using settings:', {
      host: this.settings.smtp_host,
      port: this.settings.smtp_port,
      user: this.settings.smtp_user,
      secure: this.settings.smtp_secure
    });

    return new Promise((resolve) => {
      // Set timeout for the entire operation
      const timeout = setTimeout(() => {
        console.error('❌ SMTP operation timed out after 30 seconds');
        resolve({ success: false, message: 'SMTP operation timed out' });
      }, 30000);

      let socket;
      let response = '';
      let ehloComplete = false;

      const cleanup = () => {
        clearTimeout(timeout);
        if (socket) {
          socket.destroy();
        }
      };

      const handleError = (error) => {
        console.error('❌ SMTP error:', error.message);
        cleanup();
        resolve({ success: false, message: `SMTP error: ${error.message}` });
      };

      const handleData = (data) => {
        response += data.toString();
        const lines = response.split('\r\n');
        response = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.length === 0) continue;
          
          const code = parseInt(line.substring(0, 3));
          const message = line.substring(4);

          console.log(`📧 SMTP: ${line}`);

          if (code === 220) {
            // Server ready
            socket.write('EHLO localhost\r\n');
          } else if (code === 250) {
            // Check if this is the last line of EHLO response
            if (!ehloComplete && !message.includes('-')) {
              // This is the last line of EHLO response (no dash prefix)
              ehloComplete = true;
              console.log('📧 EHLO complete, starting authentication...');
              socket.write('AUTH LOGIN\r\n');
            }
          } else if (code === 334 && message.includes('VXNlcm5hbWU6')) {
            // Username prompt
            console.log('📧 Sending username...');
            socket.write(Buffer.from(this.settings.smtp_user).toString('base64') + '\r\n');
          } else if (code === 334 && message.includes('UGFzc3dvcmQ6')) {
            // Password prompt
            console.log('📧 Sending password...');
            socket.write(Buffer.from(this.settings.smtp_pass).toString('base64') + '\r\n');
          } else if (code === 235) {
            // Authentication successful
            console.log('📧 Authentication successful!');
            this.sendMailData(socket, to, subject, htmlContent, textContent);
          } else if (code === 250 && message.includes('OK') && message.includes('queued')) {
            // Mail sent successfully
            console.log('📧 Mail queued successfully, closing connection...');
            socket.write('QUIT\r\n');
          } else if (code === 250 && message.includes('Ok: queued')) {
            // Mail queued successfully (alternative format)
            console.log('📧 Mail queued successfully, closing connection...');
            socket.write('QUIT\r\n');
          } else if (code === 221) {
            // Server closing connection
            console.log('✅ Email sent successfully');
            cleanup();
            resolve({ success: true, message: 'Email sent successfully' });
          } else if (code === 250 && message.includes('Ok: queued') && !message.includes('250 2.0.0')) {
            // Handle duplicate queued responses
            console.log('📧 Duplicate queued response, ignoring...');
          } else if (code >= 400) {
            // Error response
            console.error('❌ SMTP error response:', line);
            cleanup();
            
            // Handle specific error codes
            let errorMessage = `SMTP error: ${line}`;
            if (line.includes('452') && line.includes('too many recipients')) {
              errorMessage = 'SMTP rate limit exceeded. Please try again later.';
            } else if (line.includes('550')) {
              errorMessage = 'Email address rejected by server.';
            } else if (line.includes('535')) {
              errorMessage = 'Authentication failed. Please check SMTP credentials.';
            }
            
            resolve({ success: false, message: errorMessage });
          }
        }
      };

      try {
        socket = this.settings.smtp_secure ? 
          tls.connect(this.settings.smtp_port, this.settings.smtp_host, { timeout: 10000 }) : 
          net.connect(this.settings.smtp_port, this.settings.smtp_host);

        socket.on('connect', () => {
          console.log('📧 Connected to SMTP server');
        });

        socket.on('data', handleData);
        socket.on('error', handleError);
        socket.on('close', () => {
          console.log('📧 SMTP connection closed');
        });

        socket.on('timeout', () => {
          console.error('❌ SMTP connection timeout');
          cleanup();
          resolve({ success: false, message: 'SMTP connection timeout' });
        });

      } catch (error) {
        handleError(error);
      }
    });
  }

  sendMailData(socket, to, subject, htmlContent, textContent) {
    console.log('📧 Sending email data to:', to);
    
    const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
    const fromEmail = this.settings.from_email;
    const fromName = this.settings.from_name;
    
    // Email headers and body
    const emailData = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      textContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`
    ].join('\r\n');

    // Store the original data handler
    const originalOnData = socket.listeners('data')[0];
    let mailStep = 0; // 0: MAIL FROM, 1: RCPT TO, 2: DATA, 3: Complete

    // Replace the data handler temporarily
    socket.removeAllListeners('data');
    
    socket.on('data', (data) => {
      const response = data.toString();
      console.log(`📧 SMTP: ${response.trim()}`);
      
      const code = parseInt(response.substring(0, 3));
      
      if (mailStep === 0 && code === 250) {
        // MAIL FROM accepted, send RCPT TO
        console.log('📧 MAIL FROM accepted, sending RCPT TO...');
        mailStep = 1;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (mailStep === 1 && code === 250) {
        // RCPT TO accepted, send DATA
        console.log('📧 RCPT TO accepted, sending DATA...');
        mailStep = 2;
        socket.write('DATA\r\n');
      } else if (mailStep === 2 && code === 354) {
        // DATA accepted, send email content
        console.log('📧 DATA accepted, sending email content...');
        mailStep = 3;
        socket.write(emailData + '\r\n.\r\n');
      } else if (mailStep === 3 && code === 250) {
        // Email sent successfully
        console.log('📧 Email content sent successfully');
        // Send QUIT command
        socket.write('QUIT\r\n');
        // Restore original data handler
        socket.removeAllListeners('data');
        socket.on('data', originalOnData);
        // Let the original handler process the response
        originalOnData(data);
      } else if (code >= 400) {
        // Error response
        console.error('❌ SMTP error in sendMailData:', response.trim());
        // Restore original data handler
        socket.removeAllListeners('data');
        socket.on('data', originalOnData);
        // Let the original handler process the error
        originalOnData(data);
      }
    });

    // Start the process
    console.log('📧 Sending MAIL FROM...');
    socket.write(`MAIL FROM:<${fromEmail}>\r\n`);
  }

  async sendStatusUpdateEmail(bookingData, newStatus, notes = '') {
    try {
      console.log('📧 Preparing status update email...');
      
      // Validate email address
      const recipient = bookingData.customer_email || bookingData.email;
      if (!recipient || !this.isValidEmail(recipient)) {
        console.log('⚠️ Invalid email address:', recipient);
        return { success: false, message: 'Invalid email address' };
      }
      
      // Map the data to match template expectations
      const templateData = {
        customerName: bookingData.customer_name || bookingData.customerName,
        bookingId: bookingData.id,
        bookingDate: bookingData.booking_date,
        bookingTime: bookingData.booking_time,
        customerPhone: bookingData.customer_phone || bookingData.phone,
        vehicleMake: bookingData.vehicle_make || bookingData.vehicleMake,
        vehicleModel: bookingData.vehicle_model || bookingData.vehicleModel,
        vehicleRegistration: bookingData.vehicle_registration || bookingData.vehicleRegistration,
        bookingStatus: newStatus,
        totalAmount: bookingData.total_amount || bookingData.totalAmount,
        services: bookingData.services || [],
        statusNotes: notes || '',
        statusMessage: this.getStatusMessage(newStatus),
        // Progress tracker classes
        pendingClass: newStatus === 'pending' ? 'status-pending' : 'step-inactive',
        confirmedClass: ['confirmed', 'in_progress', 'completed'].includes(newStatus) ? 'status-confirmed' : 'step-inactive',
        inProgressClass: ['in_progress', 'completed'].includes(newStatus) ? 'status-in_progress' : 'step-inactive',
        completedClass: newStatus === 'completed' ? 'status-completed' : 'step-inactive'
      };
      
      console.log('📧 Status update template data prepared:', templateData);
      
      const template = await this.loadEmailTemplate('statusUpdate');
      const htmlContent = template(templateData);
      const textContent = this.generateStatusUpdateTextVersion(templateData);
      
      const subject = `Booking Status Update #${bookingData.id} - Car Detailing Studio`;
      
      console.log('📧 Sending status update email to:', recipient);
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await this.sendEmail(recipient, subject, htmlContent, textContent);
      
      if (result.success) {
        console.log('✅ Status update email sent successfully');
      } else {
        console.log('⚠️ Failed to send status update email:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending status update email:', error.message);
      return { success: false, message: `Failed to send email: ${error.message}` };
    }
  }

  getStatusMessage(status) {
    const statusMessages = {
      'pending': 'Your booking is being reviewed and will be confirmed shortly.',
      'confirmed': 'Your booking has been confirmed! We look forward to serving you.',
      'in_progress': 'Your car detailing service is now in progress.',
      'completed': 'Your car detailing service has been completed! Your vehicle is ready for pickup.',
      'cancelled': 'Your booking has been cancelled. Please contact us if you have any questions.'
    };
    return statusMessages[status] || 'Your booking status has been updated.';
  }

  generateStatusUpdateTextVersion(data) {
    return `
Booking Status Update - Car Detailing Studio

Dear ${data.customerName},

Your booking status has been updated.

Booking Details:
- Booking ID: #${data.bookingId}
- Date: ${data.bookingDate}
- Time: ${data.bookingTime}
- Vehicle: ${data.vehicleMake} ${data.vehicleModel} (${data.vehicleRegistration})
- New Status: ${data.bookingStatus}

${data.statusMessage}

${data.statusNotes ? `Notes: ${data.statusNotes}` : ''}

Services Booked:
${data.services.map(service => `- ${service.serviceName} (Qty: ${service.quantity}) - ₹${service.price}`).join('\n')}

Total Amount: ₹${data.totalAmount}

Contact Information:
Phone: +91 98765 43210
Email: info@wtechnology.in
Address: 123 Auto Care Street, Car City, CC 12345

Business Hours: Mon-Sat: 8:00 AM - 7:00 PM

Thank you for choosing Car Detailing Studio!

Best regards,
Car Detailing Studio Team
Developed by W Technology
    `.trim();
  }

  async sendBookingConfirmation(bookingData) {
    try {
      console.log('📧 Preparing booking confirmation email...');
      
      // Validate email address
      const recipient = bookingData.customer_email || bookingData.email;
      if (!recipient || !this.isValidEmail(recipient)) {
        console.log('⚠️ Invalid email address:', recipient);
        return { success: false, message: 'Invalid email address' };
      }
      
      // Map the data to match template expectations
      const templateData = {
        customerName: bookingData.customer_name || bookingData.customerName,
        bookingId: bookingData.id,
        bookingDate: bookingData.booking_date,
        bookingTime: bookingData.booking_time,
        customerPhone: bookingData.customer_phone || bookingData.phone,
        vehicleMake: bookingData.vehicle_make || bookingData.vehicleMake,
        vehicleModel: bookingData.vehicle_model || bookingData.vehicleModel,
        vehicleRegistration: bookingData.vehicle_registration || bookingData.vehicleRegistration,
        bookingStatus: bookingData.status,
        totalAmount: bookingData.total_amount || bookingData.totalAmount,
        services: bookingData.services || []
      };
      
      console.log('📧 Template data prepared:', templateData);
      
      const template = await this.loadEmailTemplate('bookingConfirmation');
      const htmlContent = template(templateData);
      const textContent = this.generateTextVersion(templateData);
      
      const subject = `Booking Confirmation #${bookingData.id} - Car Detailing Studio`;
      
      console.log('📧 Sending booking confirmation to:', recipient);
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await this.sendEmail(recipient, subject, htmlContent, textContent);
      
      if (result.success) {
        console.log('✅ Booking confirmation email sent successfully');
      } else {
        console.log('⚠️ Failed to send booking confirmation email:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error.message);
      return { success: false, message: `Failed to send email: ${error.message}` };
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateTextVersion(data) {
    return `
Booking Confirmation - Car Detailing Studio

Dear ${data.customerName},

Thank you for booking with Car Detailing Studio! Your booking has been confirmed.

Booking Details:
- Booking ID: #${data.bookingId}
- Date: ${data.bookingDate}
- Time: ${data.bookingTime}
- Vehicle: ${data.vehicleMake} ${data.vehicleModel} (${data.vehicleRegistration})

Services Booked:
${data.services.map(service => `- ${service.serviceName} (Qty: ${service.quantity}) - ₹${service.price}`).join('\n')}

Total Amount: ₹${data.totalAmount}
Status: ${data.bookingStatus}

Contact Information:
Phone: +91 98765 43210
Email: info@wtechnology.in
Address: 123 Auto Care Street, Car City, CC 12345

Business Hours: Mon-Sat: 8:00 AM - 7:00 PM

We look forward to serving you!

Best regards,
Car Detailing Studio Team
Developed by W Technology
    `.trim();
  }

  async testConnection() {
    try {
      if (!this.settings) {
        await this.loadSettings();
      }

      if (!this.settings) {
        return { success: false, message: 'SMTP settings not configured' };
      }

      console.log('🧪 Testing SMTP connection...');
      console.log(`Host: ${this.settings.smtp_host}:${this.settings.smtp_port}`);
      console.log(`User: ${this.settings.smtp_user}`);
      console.log(`Secure: ${this.settings.smtp_secure}`);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('❌ SMTP connection test timed out');
          resolve({ success: false, message: 'Connection test timed out' });
        }, 15000);

        const socket = this.settings.smtp_secure ? 
          tls.connect(this.settings.smtp_port, this.settings.smtp_host, { timeout: 10000 }) : 
          net.connect(this.settings.smtp_port, this.settings.smtp_host);

        socket.on('connect', () => {
          console.log('✅ SMTP connection successful');
          clearTimeout(timeout);
          socket.end();
          resolve({ success: true, message: 'SMTP connection successful' });
        });

        socket.on('error', (error) => {
          console.error('❌ SMTP connection failed:', error.message);
          clearTimeout(timeout);
          resolve({ success: false, message: `Connection failed: ${error.message}` });
        });

        socket.on('timeout', () => {
          console.error('❌ SMTP connection timeout');
          clearTimeout(timeout);
          socket.destroy();
          resolve({ success: false, message: 'Connection timeout' });
        });
      });
      
    } catch (error) {
      console.error('❌ SMTP connection test error:', error.message);
      return { success: false, message: `Connection test error: ${error.message}` };
    }
  }
}

module.exports = new SMTPService();