const smtpService = require('./services/smtpService');

async function testImprovedDesign() {
  console.log('🧪 Testing improved status update email design...');
  
  try {
    // Wait for settings to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const testBookingData = {
      id: 456,
      customer_name: 'Wanish Kumar',
      customer_phone: '+91 98765 43210',
      customer_email: 'mwarishji@gmail.com',
      booking_date: '2024-01-15',
      booking_time: '10:00',
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_registration: 'ABC123',
      status: 'confirmed',
      total_amount: 1500,
      services: [
        {
          serviceName: 'Full Car Wash',
          quantity: 1,
          price: 800
        }
      ]
    };

    console.log('📧 Testing improved design for "confirmed" status...');
    const result = await smtpService.sendStatusUpdateEmail(testBookingData, 'confirmed', 'Your booking has been confirmed and we are preparing for your service.');
    
    console.log('📧 Test result:', result);
    
    if (result.success) {
      console.log('✅ Improved design email sent successfully!');
    } else {
      console.log('❌ Email failed:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImprovedDesign();

