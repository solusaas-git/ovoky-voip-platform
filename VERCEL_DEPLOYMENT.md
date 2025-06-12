# OVOKY - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. **Prepare Your Repository**
```bash
# Make sure your code is committed to Git
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. **Deploy to Vercel**

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
cd ovo
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: ovoky
# - Directory: ./
# - Override settings? No
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure project settings
5. Deploy

### 3. **Configure Environment Variables**

In your Vercel dashboard, go to **Settings > Environment Variables** and add:

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

### 4. **Custom Domain Setup**

1. In Vercel dashboard, go to **Settings > Domains**
2. Add your custom domain: `app.ovoky.io`
3. Configure DNS records as instructed by Vercel
4. Update environment variables with your custom domain

## 🔧 Configuration Files

### `vercel.json`
- Optimized for Next.js 15
- API routes configuration
- Function timeout settings
- Regional deployment (US East)

### `next.config.ts`
- Vercel-optimized configuration
- Standalone output for better performance
- Image optimization enabled
- CORS headers configured
- ESLint disabled during build

## 📦 Build Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "build": "next build",
    "build:vercel": "next build",
    "start": "next start",
    "dev": "next dev --turbopack"
  }
}
```

## 🌐 Domain Configuration

### DNS Records for `app.ovoky.io`
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### SSL Certificate
- Automatically provided by Vercel
- No additional configuration needed

## 🔍 Monitoring & Analytics

### Vercel Analytics
- Automatically enabled
- Real-time performance metrics
- Core Web Vitals tracking

### Error Monitoring
- Built-in error tracking
- Function logs available in dashboard
- Real-time monitoring

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# If build fails, check:
1. All environment variables are set
2. Dependencies are properly installed
3. TypeScript errors are resolved
```

#### Database Connection
```bash
# Ensure MongoDB is accessible:
1. Check MONGODB_URI format
2. Verify network access from Vercel
3. Consider MongoDB Atlas for better compatibility
```

#### API Routes
```bash
# If API routes fail:
1. Check function timeout settings
2. Verify environment variables
3. Review function logs in Vercel dashboard
```

### Performance Optimization

#### Image Optimization
- Automatic WebP/AVIF conversion
- Responsive image sizing
- CDN delivery

#### Caching
- Static assets cached automatically
- API responses can be cached with headers
- Edge caching for global performance

## 🔄 Continuous Deployment

### Automatic Deployments
- Connected to Git repository
- Deploys on every push to main branch
- Preview deployments for pull requests

### Manual Deployments
```bash
# Deploy specific branch
vercel --prod

# Deploy with custom settings
vercel --build-env NODE_ENV=production
```

## 📊 Performance Features

### Edge Functions
- API routes run at the edge
- Reduced latency globally
- Automatic scaling

### Static Generation
- Pages pre-rendered at build time
- Optimal loading performance
- SEO-friendly

### Incremental Static Regeneration
- Dynamic content with static performance
- Automatic cache invalidation
- Real-time updates

## 🔐 Security

### Environment Variables
- Encrypted at rest
- Available only to functions
- Separate environments (dev/prod)

### Headers
- Security headers automatically applied
- CORS configured for API routes
- Content Security Policy ready

## 📈 Scaling

### Automatic Scaling
- Functions scale automatically
- No server management required
- Pay-per-execution model

### Global CDN
- Assets served from edge locations
- Reduced latency worldwide
- High availability

## 🎯 Next Steps

1. **Deploy**: Follow the quick deployment steps
2. **Configure**: Set up environment variables
3. **Domain**: Add your custom domain
4. **Monitor**: Check analytics and performance
5. **Optimize**: Use Vercel's performance insights

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Community**: [vercel.com/community](https://vercel.com/community)

---

**Your OVOKY application is now ready for Vercel deployment! 🚀** 