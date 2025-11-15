# 🗄️ Using Hostinger MySQL with Render - Complete Guide

This guide will walk you through setting up your MySQL database on Hostinger and connecting it to your Render deployment.

## 📋 Prerequisites

1. **Hostinger Account** - With hosting plan that includes MySQL
2. **Access to Hostinger hPanel** - Your hosting control panel
3. **Render Account** - For deploying your application

## 🗄️ Part 1: Setting Up MySQL Database on Hostinger

### Step 1: Access Hostinger hPanel

1. Log in to your Hostinger account
2. Go to **"hPanel"** (Hosting Panel)
3. Navigate to **"Databases"** section

### Step 2: Create MySQL Database

1. Click on **"MySQL Databases"** or **"phpMyAdmin"**
2. Click **"Create New Database"** or **"Add Database"**
3. Fill in the details:
   - **Database Name**: `car_studio_db` (or your preferred name)
   - **Database User**: Create a new user (e.g., `car_studio_user`)
   - **Password**: Generate a strong password (save this!)
   - **Host**: Usually `localhost` (note this down)

4. Click **"Create"** or **"Add"**

### Step 3: Note Down Database Credentials

**Important:** Save these credentials securely. You'll need them for Render:

```
Database Name: car_detailing_studio
Database User: car_studio_user
Database Password: [your-password]
Database Host: localhost (or the host provided by Hostinger)
Database Port: 3306 (default MySQL port)
```

**Note:** Some Hostinger plans use a different host format like:
- `mysql.hostinger.com`
- `your-domain.com` (if using domain-based hosting)
- `localhost` (if on shared hosting)

Check your Hostinger database details page to confirm the exact hostname.

### Step 4: Access phpMyAdmin

1. In hPanel, go to **"Databases"** → **"phpMyAdmin"**
2. Click **"Open phpMyAdmin"**
3. Select your database from the left sidebar

### Step 5: Import Database Schema

1. In phpMyAdmin, select your database (`car_detailing_studio`)
2. Click on the **"Import"** tab
3. Click **"Choose File"** and select `database_setup_safe.sql`
4. Click **"Go"** at the bottom
5. Wait for the import to complete (should show "Import has been successfully finished")

### Step 6: Import Sample Data

1. Still in phpMyAdmin, with your database selected
2. Click on the **"Import"** tab again
3. Click **"Choose File"** and select `sample_data.sql`
4. Click **"Go"**
5. Wait for the import to complete

**Verify Import:**
- Check that tables are created (you should see tables like `users`, `customers`, `bookings`, etc.)
- Check that admin user exists (username: `admin`, password: `admin123`)

## 🔒 Part 2: Configure Database Security

### Step 1: Allow Remote Connections (Important!)

By default, Hostinger MySQL might only allow connections from `localhost`. You need to allow connections from Render's servers.

**Option A: Using Hostinger hPanel (Recommended)**

1. In hPanel, go to **"Databases"** → **"Remote MySQL"** or **"Access Hosts"**
2. Add Render's IP addresses (see below) or use `%` to allow all IPs (less secure but easier)

**Option B: Contact Hostinger Support**

If you can't find Remote MySQL settings:
1. Contact Hostinger support
2. Ask them to whitelist Render's IP addresses for your database
3. Provide them with Render's IP ranges (see below)

### Step 2: Render IP Addresses (If Required)

Render uses dynamic IPs, but you can:
- Use `%` to allow all IPs (less secure, but works)
- Or contact Hostinger support to whitelist Render's IP ranges

**Note:** Some Hostinger plans don't allow remote MySQL connections. In that case:
- You may need to upgrade your plan
- Or use a different database provider (PlanetScale, Railway, etc.)

### Step 3: Verify Remote Access

You can test if remote access works using a MySQL client:

```bash
mysql -h your-hostinger-host -u your-db-user -p your-db-name
```

If this works, remote access is configured correctly.

## 🌐 Part 3: Configure Render to Use Hostinger MySQL

### Step 1: Get Your Render Service URL

1. Go to your Render dashboard
2. Create or select your web service
3. Note your service URL (e.g., `https://car-detailing-studio.onrender.com`)

### Step 2: Set Environment Variables in Render

1. In Render dashboard, go to your **Web Service**
2. Click on **"Environment"** tab
3. Add the following environment variables:

#### Required Database Variables

```env
# Database Configuration
DB_HOST=your-hostinger-mysql-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=car_detailing_studio
DB_PORT=3306
```

**Example:**
```env
DB_HOST=mysql.hostinger.com
DB_USER=car_studio_user
DB_PASSWORD=MySecurePassword123!
DB_NAME=car_detailing_studio
DB_PORT=3306
```

#### Other Required Variables

```env
NODE_ENV=production
PORT=10000

# JWT Configuration (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

#### Optional Variables (Email/SMS)

```env
# Email Configuration (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password

# SMS Configuration (Twilio) - Optional
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### Step 3: Generate JWT Secret

Generate a secure JWT secret (minimum 32 characters):

**On Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**On Linux/Mac:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET` value.

### Step 4: Save Environment Variables

1. Click **"Save Changes"** after adding all variables
2. Render will automatically restart your service with new environment variables

## 🧪 Part 4: Test the Connection

### Step 1: Check Render Logs

1. In Render dashboard, go to your service
2. Click on **"Logs"** tab
3. Look for database connection messages:
   - ✅ `✅ Database connected successfully` - Connection successful!
   - ❌ `❌ Database connection failed` - Check your credentials

### Step 2: Test Health Endpoint

1. Visit your Render service URL: `https://your-app.onrender.com/health`
2. You should see:
   ```json
   {
     "status": "OK",
     "timestamp": "2025-11-15T...",
     "environment": "production"
   }
   ```

### Step 3: Test Login

1. Visit your Render service URL
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`

If login works, your database connection is successful! 🎉

## 🐛 Troubleshooting

### Issue 1: "Database connection failed"

**Possible Causes:**
- Incorrect database credentials
- Remote access not enabled
- Wrong database host
- Firewall blocking connection

**Solutions:**
1. **Verify Credentials:**
   - Double-check all database credentials in Render environment variables
   - Make sure there are no extra spaces or special characters

2. **Check Database Host:**
   - Verify the exact hostname in Hostinger hPanel
   - Some plans use `localhost`, others use `mysql.hostinger.com`
   - Check your Hostinger database details page

3. **Enable Remote Access:**
   - Go to Hostinger hPanel → Remote MySQL
   - Add `%` to allow all IPs (or specific Render IPs)
   - Contact Hostinger support if option not available

4. **Test Connection Locally:**
   ```bash
   mysql -h your-hostinger-host -u your-db-user -p your-db-name
   ```
   If this doesn't work, remote access is not enabled.

### Issue 2: "Access denied for user"

**Solutions:**
- Verify username and password are correct
- Check if user has proper permissions
- Make sure user is allowed to connect from remote IPs

### Issue 3: "Can't connect to MySQL server"

**Solutions:**
- Verify database host is correct
- Check if port 3306 is open
- Verify remote MySQL access is enabled in Hostinger
- Some Hostinger plans don't support remote MySQL - check your plan features

### Issue 4: "Unknown database"

**Solutions:**
- Verify database name is correct (case-sensitive)
- Make sure database was created successfully
- Check if database exists in phpMyAdmin

### Issue 5: Hostinger Plan Doesn't Support Remote MySQL

**Solutions:**
1. **Upgrade Plan:** Upgrade to a plan that supports remote MySQL
2. **Use Different Provider:**
   - PlanetScale (free tier available)
   - Railway (free tier available)
   - Aiven (free tier available)
3. **Use SSH Tunnel:** Set up SSH tunnel (advanced, not recommended)

## 🔐 Security Best Practices

1. **Strong Passwords:**
   - Use a strong, unique password for your database user
   - Don't use default or weak passwords

2. **Limit Remote Access:**
   - If possible, whitelist only Render's IP addresses
   - Avoid using `%` (all IPs) if possible

3. **Secure JWT Secret:**
   - Use a long, random string (minimum 32 characters)
   - Never commit secrets to Git

4. **Regular Backups:**
   - Set up automated database backups in Hostinger
   - Keep backups in a secure location

5. **Monitor Access:**
   - Regularly check database access logs
   - Monitor for suspicious activity

## 📝 Quick Reference: Environment Variables Checklist

Before deploying, make sure you have:

- [ ] `DB_HOST` - Your Hostinger MySQL host
- [ ] `DB_USER` - Your database username
- [ ] `DB_PASSWORD` - Your database password
- [ ] `DB_NAME` - Your database name
- [ ] `DB_PORT` - Usually `3306`
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set to `10000` (Render requirement)
- [ ] `JWT_SECRET` - Secure random string (32+ chars)
- [ ] `JWT_EXPIRES_IN` - Usually `7d`

## 🎯 Summary

**Steps Recap:**
1. ✅ Create MySQL database in Hostinger hPanel
2. ✅ Import database schema (`database_setup_safe.sql`)
3. ✅ Import sample data (`sample_data.sql`)
4. ✅ Enable remote MySQL access in Hostinger
5. ✅ Get database connection details
6. ✅ Add environment variables in Render
7. ✅ Deploy and test connection

**Your Database Connection String:**
```
mysql://DB_USER:DB_PASSWORD@DB_HOST:DB_PORT/DB_NAME
```

**Example:**
```
mysql://car_studio_user:MyPassword123!@mysql.hostinger.com:3306/car_detailing_studio
```

---

**Need Help?**
- Check Render logs for detailed error messages
- Verify all credentials in Hostinger hPanel
- Contact Hostinger support for remote MySQL access issues
- Check Render documentation for environment variable setup

**Your database is now ready to use with Render! 🚀**

