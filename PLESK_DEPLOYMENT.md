# Plesk Deployment Guide for OVOKY App

## 🚀 Deployment Steps

### 1. **Plesk Panel Setup**

1. **Create Domain/Subdomain:**
   - Go to Plesk Panel → Websites & Domains
   - Add domain: `app.ovoky.io`
   - Set document root to: `/var/www/vhosts/app.ovoky.io/httpdocs`

2. **Enable Node.js:**
   - Go to Websites & Domains → app.ovoky.io → Node.js
   - Enable Node.js support
   - Set Node.js version: 18.x or higher
   - Set Application mode: Production
   - Set Application root: `/var/www/vhosts/app.ovoky.io/httpdocs`
   - Set Application startup file: `server.js`

### 2. **File Upload**

Upload your project files to: `/var/www/vhosts/app.ovoky.io/httpdocs/`

**Required files:**
```
├── .env.production
├── .htaccess
├── ecosystem.config.js
├── server.js
├── package.json
├── next.config.ts
├── src/
├── public/
└── ... (all other project files)
```

### 3. **Environment Variables Setup**

1. **In Plesk Panel:**
   - Go to Node.js settings
   - Add environment variables from `.env.production`

2. **Or via SSH:**
   ```bash
   cd /var/www/vhosts/app.ovoky.io/httpdocs
   cp .env.production .env.local
   ```

### 4. **Install Dependencies & Build**

**Via SSH:**
```bash
cd /var/www/vhosts/app.ovoky.io/httpdocs

# Option A: Full deployment (install + build)
npm run deploy:full

# Option B: Step by step
npm run deploy:install  # Install with --legacy-peer-deps
npm run deploy:build    # Build with --no-lint

# Create logs directory
mkdir -p logs
```

### 5. **SSL Certificate**

1. **In Plesk Panel:**
   - Go to SSL/TLS Certificates
   - Install Let's Encrypt certificate for `app.ovoky.io`
   - Enable "Redirect from HTTP to HTTPS"

### 6. **Start Application**

**Option A: Via Plesk Panel**
- Go to Node.js settings
- Click "Enable Node.js" and "Restart App"

**Option B: Via PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### 7. **Apache Configuration**

The `.htaccess` file should handle the proxy configuration automatically. If you need manual configuration:

**In Plesk Panel → Apache & nginx Settings:**

**Apache directives:**
```apache
ProxyPreserveHost On
ProxyPass /api/ http://localhost:3020/api/
ProxyPassReverse /api/ http://localhost:3020/api/
ProxyPass / http://localhost:3020/
ProxyPassReverse / http://localhost:3020/
```

### 8. **Database Configuration**

Ensure your MongoDB connection string in `.env.production` is correct:
```
MONGODB_URI=mongodb://sippy:owTWo84Nf2JL5q5z@176.9.26.121:27017/sippy
```

### 9. **Verification**

1. **Check application status:**
   ```bash
   pm2 status
   pm2 logs ovoky-app
   ```

2. **Test the application:**
   - Visit: https://app.ovoky.io
   - Check API endpoints: https://app.ovoky.io/api/auth/me

### 10. **Monitoring & Maintenance**

**PM2 Commands:**
```bash
# View logs
pm2 logs ovoky-app

# Restart application
pm2 restart ovoky-app

# Stop application
pm2 stop ovoky-app

# Monitor resources
pm2 monit
```

**Update Deployment:**
```bash
cd /var/www/vhosts/app.ovoky.io/httpdocs

# Pull latest changes
git pull origin main

# Full deployment (install + build)
npm run deploy:full

# Restart application
pm2 restart ovoky-app
```

## 📜 Available Scripts

### **Installation Scripts:**
```bash
npm run install:legacy      # npm install --legacy-peer-deps
npm run install:ci-legacy   # npm ci --legacy-peer-deps
npm run deploy:install      # Same as install:ci-legacy
```

### **Build Scripts:**
```bash
npm run build              # Standard Next.js build
npm run build:no-lint      # Build with --no-lint flag
npm run build:prod         # Production build with --no-lint
npm run deploy:build       # Same as build:prod
```

### **Deployment Scripts:**
```bash
npm run deploy:full        # Install + Build (complete deployment)
npm run deploy:start       # Start production server on port 3020
```

### **Development Scripts:**
```bash
npm run dev                # Development server with Turbopack
npm run start              # Standard production server
npm run start:prod         # Production server on port 3020
npm run lint               # Run ESLint
```

## 🔧 Troubleshooting

### Common Issues:

1. **Port 3020 already in use:**
   ```bash
   lsof -ti:3020 | xargs kill -9
   pm2 restart ovoky-app
   ```

2. **Permission issues:**
   ```bash
   chown -R www-data:www-data /var/www/vhosts/app.ovoky.io/httpdocs
   chmod -R 755 /var/www/vhosts/app.ovoky.io/httpdocs
   ```

3. **Memory issues:**
   - Increase memory limit in `ecosystem.config.js`
   - Monitor with `pm2 monit`

4. **SSL issues:**
   - Ensure certificate is properly installed
   - Check HTTPS redirect settings

### Log Locations:
- PM2 logs: `./logs/`
- Apache logs: `/var/www/vhosts/app.ovoky.io/logs/`
- Plesk logs: `/var/log/plesk/`

## 📋 Checklist

- [ ] Domain configured in Plesk
- [ ] Node.js enabled
- [ ] Files uploaded
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Application built
- [ ] SSL certificate installed
- [ ] Application started
- [ ] Proxy configuration working
- [ ] Database connection tested
- [ ] Application accessible via HTTPS

## 🔐 Security Notes

- Keep `.env.production` secure
- Use strong JWT secrets
- Enable HTTPS only
- Configure proper CORS settings
- Regular security updates 