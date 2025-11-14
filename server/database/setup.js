const mysql = require('mysql2/promise');
require('dotenv').config();

const setupDatabase = async () => {
  let connection;
  
  try {
    // Connect to MySQL without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Connected to MySQL server');

    // Create database if not exists
    const dbName = process.env.DB_NAME || 'car_detailing_studio';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Use the database
    await connection.query(`USE ${dbName}`);

    // Create tables
    const tables = [
      // Users table (for authentication)
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'technician', 'customer_service') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20) NOT NULL,
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        pincode VARCHAR(10),
        loyalty_points INT DEFAULT 0,
        membership_type ENUM('basic', 'premium', 'vip') DEFAULT 'basic',
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Vehicles table
      `CREATE TABLE IF NOT EXISTS vehicles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        vehicle_number VARCHAR(20) NOT NULL,
        vehicle_type ENUM('hatchback', 'sedan', 'suv', 'luxury', 'commercial') NOT NULL,
        brand VARCHAR(50),
        model VARCHAR(50),
        year INT,
        color VARCHAR(30),
        registration_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )`,

      // Service categories table
      `CREATE TABLE IF NOT EXISTS service_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Services table
      `CREATE TABLE IF NOT EXISTS services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        duration_minutes INT DEFAULT 60,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
      )`,

      // Service packages table
      `CREATE TABLE IF NOT EXISTS service_packages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        validity_days INT DEFAULT 365,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Package services mapping
      `CREATE TABLE IF NOT EXISTS package_services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        package_id INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT DEFAULT 1,
        FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )`,

      // Staff table
      `CREATE TABLE IF NOT EXISTS staff (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20) NOT NULL,
        position VARCHAR(50) NOT NULL,
        hire_date DATE NOT NULL,
        salary DECIMAL(10,2),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      // Inventory items table
      `CREATE TABLE IF NOT EXISTS inventory_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        unit VARCHAR(20) DEFAULT 'pieces',
        current_stock INT DEFAULT 0,
        min_stock_level INT DEFAULT 10,
        cost_per_unit DECIMAL(10,2),
        supplier VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Bookings table
      `CREATE TABLE IF NOT EXISTS bookings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL,
        payment_status ENUM('pending', 'paid', 'partial') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )`,

      // Booking services mapping
      `CREATE TABLE IF NOT EXISTS booking_services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )`,

      // Job cards table
      `CREATE TABLE IF NOT EXISTS job_cards (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        assigned_technician_id INT,
        status ENUM('assigned', 'in_progress', 'qc_check', 'completed', 'delivered') DEFAULT 'assigned',
        start_time DATETIME,
        end_time DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (assigned_technician_id) REFERENCES staff(id)
      )`,

      // Job card photos table
      `CREATE TABLE IF NOT EXISTS job_card_photos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_card_id INT NOT NULL,
        photo_type ENUM('before', 'after', 'during') NOT NULL,
        photo_url VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
      )`,

      // Billing table
      `CREATE TABLE IF NOT EXISTS billing (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        invoice_number VARCHAR(20) UNIQUE NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0.00,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('cash', 'card', 'upi', 'bank_transfer') NOT NULL,
        payment_status ENUM('pending', 'paid', 'partial') DEFAULT 'pending',
        paid_amount DECIMAL(10,2) DEFAULT 0.00,
        billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )`,

      // Inventory transactions table
      `CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        transaction_type ENUM('in', 'out') NOT NULL,
        quantity INT NOT NULL,
        reference_type ENUM('purchase', 'job_usage', 'adjustment') NOT NULL,
        reference_id INT,
        notes TEXT,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
      )`,

      // Customer feedback table
      `CREATE TABLE IF NOT EXISTS customer_feedback (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )`,

      // Loyalty transactions table
      `CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        transaction_type ENUM('earned', 'redeemed', 'expired') NOT NULL,
        points INT NOT NULL,
        reference_type ENUM('purchase', 'redemption', 'expiry') NOT NULL,
        reference_id INT,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT,
        type ENUM('booking_confirmation', 'service_reminder', 'completion_notification', 'promotional') NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        sent_via ENUM('email', 'sms', 'whatsapp', 'in_app') NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`
    ];

    // Execute table creation
    for (const table of tables) {
      await connection.execute(table);
    }

    console.log('✅ All tables created successfully');

    // Insert sample data
    await insertSampleData(connection);

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 You can now start the application');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const insertSampleData = async (connection) => {
  try {
    // Insert sample service categories
    const categories = [
      ['Basic Wash', 'Basic car washing services'],
      ['Detailing', 'Professional car detailing services'],
      ['Ceramic Coating', 'Advanced ceramic coating services'],
      ['PPF Installation', 'Paint Protection Film services']
    ];

    for (const [name, description] of categories) {
      await connection.execute(
        'INSERT IGNORE INTO service_categories (name, description) VALUES (?, ?)',
        [name, description]
      );
    }

    // Insert sample services
    const services = [
      [1, 'Basic Car Wash', 'Exterior wash and interior cleaning', 299.00, 45],
      [1, 'Premium Wash', 'Basic wash + tire dressing + air freshener', 499.00, 60],
      [2, 'Interior Detailing', 'Complete interior cleaning and sanitization', 799.00, 90],
      [2, 'Exterior Detailing', 'Complete exterior detailing with clay bar', 999.00, 120],
      [2, 'Full Detailing', 'Complete interior and exterior detailing', 1499.00, 180],
      [3, 'Ceramic Coating', '9H ceramic coating application', 4999.00, 240],
      [4, 'PPF Front Bumper', 'Paint protection film for front bumper', 2999.00, 120]
    ];

    for (const [categoryId, name, description, price, duration] of services) {
      await connection.execute(
        'INSERT IGNORE INTO services (category_id, name, description, base_price, duration_minutes) VALUES (?, ?, ?, ?, ?)',
        [categoryId, name, description, price, duration]
      );
    }

    // Insert sample service packages
    const packages = [
      ['Monthly Wash Package', '4 basic washes per month', 999.00, 30],
      ['Premium Detailing Package', '2 full detailing sessions', 2499.00, 90],
      ['Ceramic Protection Package', 'Ceramic coating + 1 year maintenance', 5999.00, 365]
    ];

    for (const [name, description, price, validity] of packages) {
      await connection.execute(
        'INSERT IGNORE INTO service_packages (name, description, price, validity_days) VALUES (?, ?, ?, ?)',
        [name, description, price, validity]
      );
    }

    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(
      'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@cardetailing.com', hashedPassword, 'admin']
    );

    console.log('✅ Sample data inserted successfully');

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
