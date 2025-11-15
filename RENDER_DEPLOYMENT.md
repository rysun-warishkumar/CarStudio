# 🚀 Deploying to Render - Step by Step Guide

This guide will help you deploy your Car Detailing Studio Management System to Render (free tier).

## 📋 Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Database** - Render provides free MySQL databases

## 🗄️ Step 1: Create MySQL Database on Render

1. Log in to your Render dashboard
2. Click **"New +"** → **"PostgreSQL"** (Wait, we need MySQL!)
   - Actually, Render's free tier only offers PostgreSQL
   - **OR** use an external MySQL service like:
     - [PlanetScale](https://planetscale.com) (Free tier available)
     - [Aiven](https://aiven.io) (Free tier available)
     - [Railway](https://railway.app) (Free tier available)
     - Or keep using your Hostinger MySQL database

### Option A: Use External MySQL (Recommended for now)

If you're using Hostinger or another MySQL provider:
- Note down your database credentials (host, user, password, database name, port)

### Option B: Convert to PostgreSQL (Future Enhancement)

If you want to use Render's free PostgreSQL, you'll need to modify the database connection code (not covered in this guide).

## 🌐 Step 2: Create Web Service on Render

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect GitHub"** if not already connected
   - Select your repository: `CarStudio` (or your repo name)
   - Click **"Connect"**

3. Configure the service:
   - **Name**: `car-detailing-studio` (or any name you prefer)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repo)
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or upgrade if needed)

## ⚙️ Step 3: Configure Environment Variables

In the Render dashboard, go to your web service → **"Environment"** tab, and add these variables:

### Required Variables

```env
NODE_ENV=production
PORT=10000

# Database Configuration (Update with your MySQL credentials)
DB_HOST=your-database-host.com
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=car_detailing_studio
DB_PORT=3306

# JWT Configuration (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

### Optional Variables (Email/SMS)

```env
# Email Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### Important Notes:

- **JWT_SECRET**: Generate a secure random string (minimum 32 characters). You can use:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **DB_HOST**: If using external MySQL, use the full hostname (e.g., `mysql.hostinger.com`)
- **DB_PORT**: Usually `3306` for MySQL

## 📦 Step 4: Database Setup

After your service is deployed, you need to import your database:

### Option A: Using phpMyAdmin (if using Hostinger)

1. Log in to your Hostinger cPanel
2. Open phpMyAdmin
3. Select your database
4. Import `database_setup_safe.sql` first
5. Then import `sample_data.sql`

### Option B: Using MySQL Command Line

```bash
mysql -h your-db-host -u your-db-user -p your-db-name < database_setup_safe.sql
mysql -h your-db-host -u your-db-user -p your-db-name < sample_data.sql
```

### Option C: Using Render Shell (if database is on Render)

1. In Render dashboard, go to your database service
2. Click **"Connect"** → **"Shell"**
3. Run the SQL commands manually or use a MySQL client

## 🚀 Step 5: Deploy

1. Click **"Create Web Service"** in Render
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install` in root, server, and client)
   - Build the React app (`npm run build`)
   - Start the server (`npm start`)

3. Wait for the build to complete (usually 5-10 minutes for first build)

## 🔍 Step 6: Verify Deployment

1. Once deployed, Render will provide a URL like: `https://car-detailing-studio.onrender.com`
2. Visit the URL to see your application
3. Test the health endpoint: `https://your-app.onrender.com/health`
4. Try logging in with default credentials:
   - Username: `admin`
   - Password: `admin123`

## 🐛 Troubleshooting

### Build Fails

**Error**: `npm run build:all` fails
- **Solution**: Check the build logs in Render dashboard
- Make sure all dependencies are listed in `package.json`
- Check if `client/build` directory is being created

### Database Connection Error

**Error**: `Database connection failed`
- **Solution**: 
  - Verify database credentials in environment variables
  - Check if your database host allows connections from Render's IPs
  - For Hostinger, you may need to whitelist Render's IP addresses
  - Check database firewall settings

### 404 Errors on Routes

**Error**: Routes return 404 after refresh
- **Solution**: This should be fixed with the updated `server/index.js` that serves React app for all non-API routes

### CORS Errors

**Error**: CORS policy errors
- **Solution**: The CORS configuration has been updated to work with Render. If you still see errors, add your Render URL to `ALLOWED_ORIGINS` environment variable

### File Uploads Not Working

**Note**: Render's free tier has **ephemeral file system**, meaning uploaded files will be **deleted when the service restarts**.

**Solutions**:
1. **Use Cloud Storage** (Recommended):
   - AWS S3
   - Cloudinary
   - Google Cloud Storage
   - Azure Blob Storage

2. **Upgrade to Paid Plan**: Render's paid plans have persistent storage

3. **Use External Storage**: Store files on a separate service

### Service Goes to Sleep (Free Tier)

**Issue**: Render free tier services "spin down" after 15 minutes of inactivity and take ~30 seconds to wake up.

**Solutions**:
1. Upgrade to paid plan (no spin-down)
2. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your service every 5 minutes
3. Accept the wake-up delay (it's free!)

## 📝 Additional Configuration

### Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Custom Domains"**
3. Add your domain
4. Update DNS records as instructed by Render

### Environment-Specific Settings

You can use different environment variables for different branches:
- `main` branch → Production
- `staging` branch → Staging environment

## 🔐 Security Checklist

- [ ] Change default admin password after first login
- [ ] Use strong JWT_SECRET (minimum 32 characters)
- [ ] Enable HTTPS (automatic on Render)
- [ ] Restrict database access to Render IPs only
- [ ] Use environment variables for all secrets
- [ ] Regularly update dependencies

## 📊 Monitoring

Render provides:
- **Logs**: View real-time logs in the dashboard
- **Metrics**: CPU, Memory usage
- **Alerts**: Set up email alerts for service issues

## 🆘 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Your Project Issues**: Check GitHub issues

## ✅ Post-Deployment Checklist

- [ ] Database imported successfully
- [ ] Can access the application URL
- [ ] Health endpoint returns OK
- [ ] Can login with admin credentials
- [ ] Can create a booking
- [ ] File uploads work (if using cloud storage)
- [ ] Email notifications work (if configured)
- [ ] Custom domain configured (if applicable)

---

**Congratulations! 🎉 Your application should now be live on Render!**

For any issues, check the Render logs and verify all environment variables are set correctly.

