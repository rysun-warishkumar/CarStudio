# 🚗 Car Detailing Studio Management System

A comprehensive web-based management system for car detailing studios, featuring both admin panel and customer portal with full booking, inventory, staff, and billing management capabilities.

## ✨ Features

### 🏢 Admin Panel
- **Dashboard**: Real-time analytics and overview
- **Customer Management**: Complete CRM with vehicle tracking
- **Booking System**: Advanced scheduling with time slots
- **Service Management**: Categories, services, and packages
- **Inventory Management**: Stock tracking with alerts
- **Staff Management**: Role-based access and performance tracking
- **Job Cards**: Workflow management with photo documentation
- **Billing & Payments**: GST-compliant invoicing
- **Reports & Analytics**: Comprehensive business insights
- **Loyalty Program**: Points system and membership management

### 👥 Customer Portal
- **Easy Booking**: Simple service booking interface
- **Service Tracking**: Real-time status updates
- **Profile Management**: Vehicle and booking history
- **Loyalty Points**: View and redeem points
- **Mobile Responsive**: Works on all devices

### 🔧 Technical Features
- **Role-based Access**: Admin, Manager, Technician, Customer Service
- **Real-time Updates**: Live status tracking
- **Mobile Responsive**: Works on desktop, tablet, and mobile
- **Secure Authentication**: JWT-based security
- **Database Management**: MySQL with proper relationships
- **API Integration**: RESTful API architecture
- **File Upload**: Photo documentation for job cards
- **Email/SMS Integration**: Customer notifications (configurable)

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** authentication
- **bcryptjs** password hashing
- **Multer** file uploads
- **Nodemailer** email integration
- **Twilio** SMS integration (optional)

### Frontend
- **React.js** with hooks
- **React Router** for navigation
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **React Hook Form** for forms
- **Recharts** for analytics
- **Lucide React** for icons
- **React Hot Toast** for notifications

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **XAMPP** (for local development)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CarDetailingStudioManagement
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Setup

#### Option A: Using SQL Files (Recommended)
1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database named `car_detailing_studio`
4. Import the database schema:
   - Import `database_setup_safe.sql` to create all tables
   - Import `sample_data.sql` to add default admin user and sample data

#### Option B: Using Setup Script
1. Create a new MySQL database:
```sql
CREATE DATABASE car_detailing_studio;
```
2. Run the setup script:
```bash
cd server
npm run setup-db
```

### 4. Environment Configuration

#### Server Configuration
1. Copy the environment template:
```bash
cd server
cp env.example .env
```

2. Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=car_detailing_studio
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Configuration (Twilio) - Optional
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### 5. Database Initialization
```bash
cd server
npm run setup-db
```

This will:
- Create all necessary tables
- Insert sample data (service categories, services, packages)
- Create default admin user (username: `admin`, password: `admin123`)

### 6. Start the Application

#### Development Mode
```bash
# From the root directory
npm run dev
```

This will start both server (port 5000) and client (port 3000) simultaneously.

#### Production Mode
```bash
# Build the client
cd client
npm run build

# Start the server
cd ../server
npm start
```

### 7. Access the Application

- **Admin Panel**: http://localhost:3000/admin
- **Customer Portal**: http://localhost:3000/portal
- **API Documentation**: http://localhost:5000/health

## 🔐 Default Login Credentials

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin (full access)

## 📱 Usage Guide

### Admin Panel Navigation

1. **Dashboard**: Overview of daily operations
2. **Customers**: Manage customer profiles and vehicles
3. **Bookings**: Create and manage service bookings
4. **Services**: Configure service categories and pricing
5. **Inventory**: Track stock levels and manage supplies
6. **Staff**: Manage team members and assignments
7. **Job Cards**: Track work progress and quality control
8. **Billing**: Generate invoices and manage payments
9. **Reports**: View business analytics and insights
10. **Loyalty**: Manage customer loyalty program
11. **Settings**: System configuration and user management

### Customer Portal Usage

1. **Browse Services**: View available services and packages
2. **Book Service**: 
   - Select service/package, date, and time
   - **Provide complete vehicle information** (number, brand, model, type, color, year)
   - Fill in customer contact details
3. **Track Progress**: Monitor service status in real-time
4. **View History**: Access past bookings and invoices
5. **Manage Profile**: Update personal and vehicle information

**Important**: When booking from the customer portal, all vehicle information fields are required to ensure proper job card creation in the admin panel.

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/status` - Update booking status

### Services
- `GET /api/services` - Get all services
- `POST /api/services` - Create new service
- `GET /api/services/categories` - Get service categories
- `GET /api/services/packages/all` - Get service packages

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new item
- `POST /api/inventory/:id/add-stock` - Add stock
- `POST /api/inventory/:id/remove-stock` - Remove stock

### Staff
- `GET /api/staff` - Get all staff members
- `POST /api/staff` - Create new staff member
- `GET /api/staff/technicians/available` - Get available technicians

### Job Cards
- `GET /api/job-cards` - Get all job cards
- `PUT /api/job-cards/:id/status` - Update job status
- `POST /api/job-cards/:id/photos` - Upload job photos

### Billing
- `POST /api/billing/generate-invoice` - Generate invoice
- `GET /api/billing` - Get all invoices
- `PUT /api/billing/:id/payment` - Update payment status

### Reports
- `GET /api/reports/dashboard` - Dashboard overview
- `GET /api/reports/revenue` - Revenue analytics
- `GET /api/reports/customers` - Customer analytics
- `GET /api/reports/staff-performance` - Staff performance

### Loyalty
- `GET /api/loyalty/customer/:id` - Get customer loyalty info
- `POST /api/loyalty/award-points` - Award loyalty points
- `POST /api/loyalty/redeem-points` - Redeem loyalty points

## 🎨 Customization

### Styling
The application uses Tailwind CSS for styling. You can customize the theme by editing:
- `client/tailwind.config.js` - Theme configuration
- `client/src/index.css` - Custom styles

### Business Logic
- Service pricing and categories in `server/database/setup.js`
- Working hours in `server/routes/bookings.js`
- Loyalty points calculation in `server/routes/loyalty.js`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Role-based Access**: Granular permissions system
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Secure cross-origin requests
- **Rate Limiting**: API request throttling

## 📊 Database Schema

The system includes the following main tables:
- `users` - System users and authentication (login credentials)
- `customers` - Customer information
- `vehicles` - Customer vehicles
- `service_categories` - Service categories
- `services` - Individual services
- `service_packages` - Service packages
- `bookings` - Service bookings
- `booking_services` - Services in bookings
- `job_cards` - Work orders
- `staff` - Staff members (linked to users table via user_id)
- `inventory_items` - Stock items
- `inventory_transactions` - Stock movements
- `billing` - Invoices and payments
- `loyalty_transactions` - Loyalty points
- `notifications` - Customer notifications
- `system_settings` - Business settings and theme configuration

### Staff & User Account Relationship

**Important**: The system uses two separate tables for staff management:
- **`users` table**: Stores login credentials (username, password, email, role)
- **`staff` table**: Stores personal/professional information (name, phone, position, salary)

**Relationship**: Each staff member has one user account (`staff.user_id` → `users.id`)

**Staff Creation Flow**: When adding a staff member, both user account and staff record are created together in a single transaction to ensure data consistency.

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   - Set `NODE_ENV=production`
   - Configure production database
   - Set secure JWT secret
   - Configure email/SMS services

2. **Build Application**:
   ```bash
   cd client
   npm run build
   ```

3. **Server Deployment**:
   - Use PM2 or similar process manager
   - Configure reverse proxy (nginx)
   - Set up SSL certificates

4. **Database Backup**:
   - Set up automated database backups
   - Configure database replication if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support & Troubleshooting

### Common Issues

#### Database Import Issues
- **Problem**: MySQL crashes or errors during import
- **Solution**: Use `database_setup_safe.sql` which uses `TEXT` instead of `JSON` for better compatibility

#### Login Issues
- **Problem**: Cannot login with admin/admin123
- **Solution**: Ensure `sample_data.sql` is imported (contains correct password hash)

#### Vehicle Information Missing
- **Problem**: Job cards show "N/A" for vehicle details
- **Solution**: Ensure customers provide complete vehicle information when booking from portal

#### Dashboard Showing Zeros
- **Problem**: Dashboard metrics show zero values
- **Solution**: Import `sample_data.sql` to add test data, or create bookings/customers through the admin panel

### Database Files

**Required SQL Files:**
- `database_setup_safe.sql` - Main database schema (import first)
- `sample_data.sql` - Default admin user and sample data (import second)

**Note**: The `sample_data.sql` file contains the correct password hash for admin/admin123 login.

### For Support
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks
- Database backups
- Log rotation
- Security updates
- Performance monitoring
- Customer data cleanup

### Version Updates
- Check for dependency updates
- Test thoroughly before deployment
- Maintain backward compatibility
- Update documentation

---

**Built with ❤️ for Car Detailing Studios**
