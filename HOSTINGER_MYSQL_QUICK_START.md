# ⚡ Hostinger MySQL + Render - Quick Start Guide

This is a condensed version for quick reference. For detailed instructions, see [HOSTINGER_MYSQL_SETUP.md](./HOSTINGER_MYSQL_SETUP.md).

## 🚀 Quick Steps

### 1. Hostinger Database Setup (5 minutes)

1. **Login to Hostinger hPanel** → **Databases** → **MySQL Databases**
2. **Create Database:**
   - Database Name: `car_detailing_studio`
   - Create User: `car_studio_user`
   - Set Password: (save this!)
   - Note the Host: (usually `localhost` or `mysql.hostinger.com`)

3. **Open phpMyAdmin:**
   - Select your database
   - Import `database_setup_safe.sql`
   - Import `sample_data.sql`

4. **Enable Remote Access:**
   - Go to **Remote MySQL** or **Access Hosts**
   - Add `%` to allow all IPs (or contact support)

### 2. Get Database Credentials

Save these values:
```
DB_HOST = [from Hostinger, e.g., mysql.hostinger.com]
DB_USER = [your database user]
DB_PASSWORD = [your database password]
DB_NAME = car_detailing_studio
DB_PORT = 3306
```

### 3. Render Environment Variables

In Render dashboard → Your Service → Environment tab, add:

```env
NODE_ENV=production
PORT=10000

DB_HOST=[your-hostinger-host]
DB_USER=[your-db-user]
DB_PASSWORD=[your-db-password]
DB_NAME=car_detailing_studio
DB_PORT=3306

JWT_SECRET=[generate-32-char-random-string]
JWT_EXPIRES_IN=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy & Test

1. Save environment variables in Render
2. Service will auto-deploy
3. Check logs for: `✅ Database connected successfully`
4. Visit your Render URL and login with `admin` / `admin123`

## ⚠️ Common Issues

**"Database connection failed"**
- Check all credentials are correct
- Verify remote MySQL is enabled in Hostinger
- Check database host is correct

**"Access denied"**
- Verify username/password
- Check user has remote access permissions

**"Can't connect to MySQL server"**
- Remote MySQL might not be enabled
- Contact Hostinger support to enable it
- Some plans don't support remote MySQL (may need upgrade)

## 📚 Full Guide

For detailed troubleshooting and step-by-step instructions, see:
**[HOSTINGER_MYSQL_SETUP.md](./HOSTINGER_MYSQL_SETUP.md)**

