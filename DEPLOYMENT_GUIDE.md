# Order Editing Game - Production Deployment Guide

This guide will help you deploy the Order Editing Game to your custom domain with full HubSpot integration.

## Prerequisites

1. **Domain**: Your custom domain ready for deployment
2. **HubSpot Account**: With API access and custom properties set up
3. **Firebase Project**: Already configured for authentication and Firestore
4. **Vercel Account**: (Recommended) or your preferred hosting platform

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest option as it handles both the frontend and serverless functions automatically.

#### Step 1: Prepare for Deployment

1. **Build the project locally to test:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Test the HubSpot integration locally:**
   ```bash
   # In one terminal
   npm run proxy
   
   # In another terminal  
   npm run dev
   ```

#### Step 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project in Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add these variables:
     ```
     VITE_HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
     VITE_HUBSPOT_PORTAL_ID=your_hubspot_portal_id
     VITE_FIREBASE_API_KEY=your_firebase_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
     VITE_FIREBASE_APP_ID=your_firebase_app_id
     ```

5. **Set Custom Domain:**
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Follow Vercel's DNS configuration instructions

#### Step 3: Update Firebase Configuration

1. **Add your production domain to Firebase:**
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add your custom domain (e.g., `yourdomain.com`)

2. **Update Firestore rules if needed:**
   - Ensure your production domain can access Firestore

### Option 2: Netlify

If you prefer Netlify:

1. **Create netlify.toml:**
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [functions]
     directory = "netlify/functions"

   [[redirects]]
     from = "/api/hubspot/*"
     to = "/.netlify/functions/hubspot"
     status = 200
   ```

2. **Create Netlify function:**
   ```bash
   mkdir -p netlify/functions
   cp api/hubspot.js netlify/functions/hubspot.js
   ```

3. **Deploy via Netlify CLI or Git integration**

### Option 3: Traditional VPS/Server

For more control, you can deploy to a VPS:

1. **Server Requirements:**
   - Node.js 18+
   - PM2 or similar process manager
   - Nginx for reverse proxy
   - SSL certificate (Let's Encrypt recommended)

2. **Deployment Steps:**
   ```bash
   # Build the frontend
   npm run build
   
   # Serve static files with Nginx
   # Run the HubSpot proxy with PM2
   pm2 start server/hubspot-proxy.js --name hubspot-proxy
   ```

## Environment Variables

Make sure these are set in your production environment:

### Required for HubSpot Integration:
- `VITE_HUBSPOT_ACCESS_TOKEN`: Your HubSpot private app token
- `VITE_HUBSPOT_PORTAL_ID`: Your HubSpot portal ID

### Required for Firebase:
- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID`: Your Firebase app ID

## Post-Deployment Checklist

### 1. Test Core Functionality
- [ ] Game loads and plays correctly
- [ ] User authentication works (Google sign-in)
- [ ] Leaderboard displays and updates
- [ ] Music and sound effects work
- [ ] Responsive design works on mobile

### 2. Test HubSpot Integration
- [ ] Marketing consent form submits successfully
- [ ] High scores are sent to HubSpot
- [ ] Contact creation/updates work
- [ ] Session duration tracking works
- [ ] Check HubSpot contacts for new entries

### 3. Performance Optimization
- [ ] Enable gzip compression
- [ ] Set up CDN for assets (Vercel does this automatically)
- [ ] Monitor Core Web Vitals
- [ ] Test page load speeds

### 4. SEO and Meta Tags
- [ ] Update meta tags in index.html
- [ ] Add Open Graph tags for social sharing
- [ ] Set up Google Analytics if needed
- [ ] Create sitemap.xml

### 5. Security
- [ ] Ensure HTTPS is enabled
- [ ] Verify environment variables are secure
- [ ] Check CORS settings
- [ ] Review Firebase security rules

## Monitoring and Maintenance

### Logs and Debugging
- **Vercel**: Check function logs in Vercel dashboard
- **Frontend**: Use browser developer tools
- **HubSpot**: Monitor API usage in HubSpot dashboard

### Regular Maintenance
- Monitor HubSpot API rate limits
- Check Firebase usage and billing
- Update dependencies regularly
- Monitor game performance metrics

## Troubleshooting

### Common Issues:

1. **HubSpot API Errors:**
   - Check if custom properties exist in HubSpot
   - Verify API token permissions
   - Check rate limits

2. **Authentication Issues:**
   - Verify Firebase authorized domains
   - Check Google OAuth configuration
   - Ensure environment variables are set

3. **Game Performance:**
   - Check asset loading times
   - Monitor memory usage
   - Verify WebGL support

4. **CORS Errors:**
   - Verify proxy configuration
   - Check API endpoint URLs
   - Ensure proper headers are set

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review server/function logs
3. Verify all environment variables are set
4. Test HubSpot integration with the proxy server logs

## Success Metrics

After deployment, monitor these metrics:
- Game completion rates
- High score submissions
- Marketing consent opt-in rates
- User engagement time
- HubSpot contact creation success rate

Your game should now be live on your custom domain with full HubSpot integration! 🎮🚀 