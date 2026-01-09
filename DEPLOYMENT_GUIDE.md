# Live Website Deployment Guide

## Step-by-Step Instructions for Production Deployment

### 1. Prepare Your Web Application

First, ensure your web application is deployed and accessible:

**Option A: Deploy to a hosting service**
- Deploy your web app from [GitHub](https://github.com/edutrip2025-crypto/Edutrip_web_app) to:
  - **Vercel** (recommended for React/Next.js)
  - **Netlify** (good for static sites)
  - **AWS Amplify**
  - **Heroku**
  - **Your own server**

**Option B: Use your existing domain**
- If you have a subdomain like `app.edutripindia.com`, use that

### 2. Update Web App URL in index.html

Open `index.html` and find the `WEB_APP_CONFIG` section (around line 840):

**Find this:**
```javascript
const WEB_APP_CONFIG = {
  url: 'http://192.168.174.1:8080/', // Local development URL
  // For production, update to: 'https://your-production-domain.com'
  openInNewTab: true
};
```

**Replace with your production URL:**
```javascript
const WEB_APP_CONFIG = {
  url: 'https://app.edutripindia.com', // Your production web app URL
  openInNewTab: true
};
```

**Also update the HTML link** (around line 280):
```html
<a href="https://app.edutripindia.com" class="login-register-btn" ...>
```

### 3. Update Content Security Policy (CSP)

Find the CSP meta tag (around line 66) and update it:

**Find this:**
```html
<meta http-equiv="Content-Security-Policy"
  content="... connect-src ... http://192.168.174.1:8080; frame-src ... http://192.168.174.1:8080; ...">
```

**Replace with:**
```html
<meta http-equiv="Content-Security-Policy"
  content="... connect-src ... https://app.edutripindia.com; frame-src ... https://app.edutripindia.com; ...">
```

### 4. Deploy Your Website

#### Option A: Deploy to GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select your branch (usually `main`)
4. Your site will be live at: `https://yourusername.github.io/repository-name`

#### Option B: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder, OR
3. Connect your GitHub repository
4. Your site will be live at: `https://your-site-name.netlify.app`

#### Option C: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Deploy (it auto-detects static sites)
4. Your site will be live at: `https://your-site-name.vercel.app`

#### Option D: Deploy to Your Own Server

1. Upload all files via FTP/SFTP to your web server
2. Ensure `index.html` is in the root directory
3. Access via your domain: `https://www.edutripindia.com`

### 5. Update Custom Domain (If Applicable)

If you're using a custom domain like `www.edutripindia.com`:

1. **In your hosting provider:**
   - Add your custom domain
   - Configure DNS settings (A record or CNAME)

2. **Update any hardcoded URLs:**
   - Check `index.html` for any localhost references
   - Update API endpoints if needed

### 6. Test the Integration

After deployment:

1. **Visit your live website**
2. **Click the Login/Register button** (top right corner)
3. **Verify it opens your web application**
4. **Test on mobile** to ensure responsive design works

### 7. SSL/HTTPS Requirements

**Important:** For production, always use HTTPS:

- ✅ `https://app.edutripindia.com` (Correct)
- ❌ `http://app.edutripindia.com` (Not secure)

Most hosting providers (Netlify, Vercel, etc.) provide free SSL certificates automatically.

### 8. Troubleshooting

**Button doesn't work:**
- Check browser console for errors (F12)
- Verify web app URL is correct and accessible
- Check CSP errors in console

**CORS errors:**
- Ensure your web app allows requests from your website domain
- Configure CORS headers on your web app backend

**Mixed content warnings:**
- Ensure both sites use HTTPS (not HTTP)
- Update all URLs to use `https://`

### 9. Quick Checklist

Before going live, verify:

- [ ] Web app is deployed and accessible
- [ ] Updated `WEB_APP_CONFIG.url` to production URL
- [ ] Updated HTML link `href` attribute
- [ ] Updated CSP meta tag
- [ ] All URLs use HTTPS (not HTTP)
- [ ] Tested button on desktop
- [ ] Tested button on mobile
- [ ] Website is deployed and live
- [ ] Custom domain configured (if applicable)

### 10. Example Production Configuration

Here's what your production config should look like:

**index.html - JavaScript Config:**
```javascript
const WEB_APP_CONFIG = {
  url: 'https://app.edutripindia.com', // Production URL
  openInNewTab: true
};
```

**index.html - HTML Link:**
```html
<a href="https://app.edutripindia.com" 
   class="login-register-btn" 
   id="login-register-btn" 
   aria-label="Login or Register" 
   target="_blank" 
   rel="noopener noreferrer">
```

**index.html - CSP:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://formspree.io https://api.edutripindia.com https://app.edutripindia.com; frame-src 'self' https://app.edutripindia.com; frame-ancestors 'none';">
```

## Need Help?

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify web app is accessible directly
3. Check CSP settings match your web app URL
4. Ensure both sites use HTTPS

