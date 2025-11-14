#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚗 Car Detailing Studio Management System Setup');
console.log('==============================================\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${step}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if Node.js is installed
function checkNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    if (majorVersion < 16) {
      logError('Node.js version 16 or higher is required');
      logInfo('Please install Node.js from https://nodejs.org/');
      process.exit(1);
    }
    
    logSuccess(`Node.js ${version} detected`);
    return true;
  } catch (error) {
    logError('Node.js is not installed');
    logInfo('Please install Node.js from https://nodejs.org/');
    process.exit(1);
  }
}

// Check if npm is installed
function checkNpm() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    logSuccess(`npm ${version} detected`);
    return true;
  } catch (error) {
    logError('npm is not installed');
    process.exit(1);
  }
}

// Install dependencies
function installDependencies() {
  logStep('Installing dependencies...');
  
  try {
    // Install root dependencies
    logInfo('Installing root dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('Root dependencies installed');
    
    // Install server dependencies
    logInfo('Installing server dependencies...');
    execSync('cd server && npm install', { stdio: 'inherit' });
    logSuccess('Server dependencies installed');
    
    // Install client dependencies
    logInfo('Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
    logSuccess('Client dependencies installed');
    
    return true;
  } catch (error) {
    logError('Failed to install dependencies');
    logError(error.message);
    return false;
  }
}

// Create environment file
function createEnvFile() {
  logStep('Setting up environment configuration...');
  
  const envPath = path.join(__dirname, 'server', '.env');
  const envExamplePath = path.join(__dirname, 'server', 'env.example');
  
  if (fs.existsSync(envPath)) {
    logWarning('.env file already exists');
    return true;
  }
  
  if (!fs.existsSync(envExamplePath)) {
    logError('env.example file not found');
    return false;
  }
  
  try {
    fs.copyFileSync(envExamplePath, envPath);
    logSuccess('.env file created');
    logInfo('Please edit server/.env with your configuration');
    return true;
  } catch (error) {
    logError('Failed to create .env file');
    logError(error.message);
    return false;
  }
}

// Setup database
function setupDatabase() {
  logStep('Setting up database...');
  
  try {
    logInfo('Running database setup...');
    execSync('cd server && npm run setup-db', { stdio: 'inherit' });
    logSuccess('Database setup completed');
    return true;
  } catch (error) {
    logError('Failed to setup database');
    logError(error.message);
    logWarning('Please ensure MySQL is running and configured correctly');
    return false;
  }
}

// Create uploads directory
function createUploadsDirectory() {
  logStep('Creating uploads directory...');
  
  const uploadsPath = path.join(__dirname, 'server', 'uploads');
  
  if (!fs.existsSync(uploadsPath)) {
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      logSuccess('Uploads directory created');
    } catch (error) {
      logError('Failed to create uploads directory');
      logError(error.message);
      return false;
    }
  } else {
    logInfo('Uploads directory already exists');
  }
  
  return true;
}

// Display next steps
function displayNextSteps() {
  logStep('Setup completed! Next steps:');
  
  logInfo('1. Configure your environment:');
  log('   - Edit server/.env with your database and email settings');
  
  logInfo('2. Start the application:');
  log('   - Development: npm run dev');
  log('   - Production: npm run build && npm start');
  
  logInfo('3. Access the application:');
  log('   - Admin Panel: http://localhost:3000/admin');
  log('   - Customer Portal: http://localhost:3000/portal');
  
  logInfo('4. Default login credentials:');
  log('   - Username: admin');
  log('   - Password: admin123');
  
  logInfo('5. Important security notes:');
  log('   - Change default admin password immediately');
  log('   - Update JWT_SECRET in production');
  log('   - Configure proper email/SMS settings');
  
  log('\n🎉 Happy detailing!', 'green');
}

// Main setup function
async function main() {
  try {
    log('Starting setup process...', 'bright');
    
    // Check prerequisites
    checkNodeVersion();
    checkNpm();
    
    // Install dependencies
    if (!installDependencies()) {
      process.exit(1);
    }
    
    // Create environment file
    if (!createEnvFile()) {
      process.exit(1);
    }
    
    // Create uploads directory
    if (!createUploadsDirectory()) {
      process.exit(1);
    }
    
    // Setup database
    logWarning('Database setup requires MySQL to be running');
    logInfo('Please ensure MySQL is started and accessible');
    
    const setupDb = process.argv.includes('--setup-db');
    if (setupDb) {
      if (!setupDatabase()) {
        logWarning('Database setup failed. You can run it manually later with: npm run setup-db');
      }
    } else {
      logInfo('Skipping database setup. Run with --setup-db flag to setup database automatically');
      logInfo('Or run manually: cd server && npm run setup-db');
    }
    
    displayNextSteps();
    
  } catch (error) {
    logError('Setup failed');
    logError(error.message);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  main();
}

module.exports = { main };
