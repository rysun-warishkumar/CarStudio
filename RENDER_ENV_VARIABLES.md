# 🔧 Render Environment Variables - Complete List

Use this guide to add environment variables in Render's "New Web Service" screen.

## 📝 Step-by-Step: Adding Environment Variables in Render

### In the Render Dashboard:

1. **Find the "Environment Variables" section** (you're already there!)
2. **Click "+ Add Environment Variable"** for each variable below
3. **Add them one by one** using the format: `NAME_OF_VARIABLE` = `value`

---

## ✅ Required Environment Variables

Add these **one by one** in Render:

### 1. Node Environment
```
NAME: NODE_ENV
VALUE: production
```

### 2. Port (Required for Render)
```
NAME: PORT
VALUE: 10000
```

### 3. Database Host (From Hostinger)
```
NAME: DB_HOST
VALUE: [Your Hostinger MySQL host - e.g., mysql.hostinger.com or localhost]
```
**Note:** Get this from Hostinger hPanel → Databases → Your database details

### 4. Database User (From Hostinger)
```
NAME: DB_USER
VALUE: [Your database username - e.g., car_studio_user]
```
**Note:** Get this from Hostinger hPanel → Databases

### 5. Database Password (From Hostinger)
```
NAME: DB_PASSWORD
VALUE: [Your database password]
```
**Note:** The password you set when creating the database in Hostinger

### 6. Database Name
```
NAME: DB_NAME
VALUE: car_detailing_studio
```
**Note:** Or whatever you named your database in Hostinger

### 7. Database Port
```
NAME: DB_PORT
VALUE: 3306
```

### 8. JWT Secret (Generate this!)
```
NAME: JWT_SECRET
VALUE: [Generate a random 32+ character string - see below]
```

**To Generate JWT Secret:**
Open PowerShell or Terminal and run:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as the value.

### 9. JWT Expires In
```
NAME: JWT_EXPIRES_IN
VALUE: 7d
```

### 10. Upload Path
```
NAME: UPLOAD_PATH
VALUE: ./uploads
```

### 11. Max File Size
```
NAME: MAX_FILE_SIZE
VALUE: 5242880
```

---

## 📧 Optional Environment Variables (Email/SMS)

### Email Configuration (If using Hostinger SMTP)

```
NAME: SMTP_HOST
VALUE: smtp.hostinger.com
```

```
NAME: SMTP_PORT
VALUE: 587
```

```
NAME: SMTP_USER
VALUE: [Your email address - e.g., your-email@yourdomain.com]
```

```
NAME: SMTP_PASS
VALUE: [Your email password]
```

### SMS Configuration (If using Twilio - Optional)

```
NAME: TWILIO_ACCOUNT_SID
VALUE: [Your Twilio Account SID]
```

```
NAME: TWILIO_AUTH_TOKEN
VALUE: [Your Twilio Auth Token]
```

```
NAME: TWILIO_PHONE_NUMBER
VALUE: [Your Twilio Phone Number]
```

---

## 📋 Quick Copy-Paste Checklist

Before you start, make sure you have:

- [ ] **DB_HOST** - From Hostinger (e.g., `mysql.hostinger.com`)
- [ ] **DB_USER** - From Hostinger (e.g., `car_studio_user`)
- [ ] **DB_PASSWORD** - From Hostinger (the password you set)
- [ ] **JWT_SECRET** - Generate using the command above

---

## 🎯 Example: Complete Environment Variables List

Here's what your complete list should look like (with example values):

```
NODE_ENV = production
PORT = 10000
DB_HOST = mysql.hostinger.com
DB_USER = car_studio_user
DB_PASSWORD = MySecurePassword123!
DB_NAME = car_detailing_studio
DB_PORT = 3306
JWT_SECRET = a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN = 7d
UPLOAD_PATH = ./uploads
MAX_FILE_SIZE = 5242880
```

**Optional (if using email):**
```
SMTP_HOST = smtp.hostinger.com
SMTP_PORT = 587
SMTP_USER = your-email@yourdomain.com
SMTP_PASS = your-email-password
```

---

## ⚠️ Important Notes

1. **No Spaces:** Make sure there are no spaces around the `=` sign when adding variables
2. **Case Sensitive:** Variable names are case-sensitive (use uppercase)
3. **Special Characters:** If your password has special characters, they should work fine in Render
4. **Secrets:** Never commit these values to Git - they're stored securely in Render
5. **Database Host:** Make sure you use the correct host from Hostinger (not `localhost` if it's remote)

---

## ✅ After Adding All Variables

1. **Review** all variables to make sure they're correct
2. **Click "Deploy Web Service"** at the bottom
3. **Wait** for the build to complete
4. **Check logs** to verify database connection

---

## 🐛 Common Mistakes to Avoid

❌ **Don't use `localhost` for DB_HOST** - Use the actual Hostinger hostname  
❌ **Don't forget to generate JWT_SECRET** - Use the command provided  
❌ **Don't add quotes** around values - Just the value itself  
❌ **Don't use spaces** around the `=` sign  

✅ **Do use the exact hostname** from Hostinger  
✅ **Do generate a secure JWT_SECRET** (32+ characters)  
✅ **Do double-check** all credentials before deploying  

---

**Once you've added all variables, click "Deploy Web Service" and you're done! 🚀**

