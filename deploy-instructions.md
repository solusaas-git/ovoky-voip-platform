# 🚀 OVOKY Deployment Instructions

## Step 1: Connect to GitHub Repository

After creating your GitHub repository, connect it:

```bash
# Add the remote repository (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/ovoky-voip-platform.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Vercel CLI (Quick)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option B: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `ovoky-voip-platform`
4. Configure settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `.next` (default)
5. Click "Deploy"

## Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Database
MONGODB_URI=mongodb://176.9.26.121:27017/sippy

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# Sippy API
SIPPY_API_URL=https://sip2.ovoky.io/xmlapi/xmlapi
SIPPY_API_USERNAME=your-sippy-username
SIPPY_API_PASSWORD=your-sippy-password

# Stripe
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@gmail.com

# Application
APP_NAME=OVOKY
APP_URL=https://your-app.vercel.app
ADMIN_EMAIL=admin@ovoky.io
NODE_ENV=production
```

## Step 4: Custom Domain Setup

1. In Vercel Dashboard → Settings → Domains
2. Add domain: `app.ovoky.io`
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` and `APP_URL` environment variables

## Step 5: Test Deployment

1. Visit your Vercel URL
2. Test key functionality:
   - User registration/login
   - Dashboard loading
   - API endpoints
   - Database connectivity

## 🎯 Quick Commands Summary

```bash
# 1. Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/ovoky-voip-platform.git
git push -u origin main

# 2. Deploy with Vercel CLI
npm i -g vercel
vercel login
vercel --prod

# 3. Or use automated script
./deploy-to-vercel.sh
```

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **GitHub Docs**: [docs.github.com](https://docs.github.com)
- **Project README**: See `README.md` for detailed information

---

**Your OVOKY platform will be live in minutes! 🚀** 