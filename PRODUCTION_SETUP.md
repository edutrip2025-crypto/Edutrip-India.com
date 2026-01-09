# Quick Production Setup Guide

## 🚀 3 Simple Steps to Go Live

### Step 1: Deploy Your Web Application

Deploy your web app from [GitHub](https://github.com/edutrip2025-crypto/Edutrip_web_app) to get a production URL:

**Recommended Hosting Options:**
- **Vercel** (easiest): https://vercel.com
- **Netlify**: https://netlify.com  
- **Your own server**: Use your existing hosting

**After deployment, you'll get a URL like:**
- `https://edutrip-webapp.vercel.app` OR
- `https://app.edutripindia.com` (if using custom domain)

### Step 2: Update 3 Places in index.html

Open `index.html` and make these changes:

#### Change 1: JavaScript Config (Line ~847)
```javascript
// BEFORE (Local):
url: 'http://192.168.174.1:8080/',

// AFTER (Production):
url: 'https://your-webapp-url.com',
```

#### Change 2: HTML Link (Line ~280)
```html
<!-- BEFORE (Local): -->
<a href="http://192.168.174.1:8080/" ...>

<!-- AFTER (Production): -->
<a href="https://your-webapp-url.com" ...>
```

#### Change 3: CSP Meta Tag (Line ~66)
```html
<!-- BEFORE: -->
content="... http://192.168.174.1:8080; ..."

<!-- AFTER: -->
content="... https://your-webapp-url.com; ..."
```

### Step 3: Deploy Your Website

**Option A: Netlify (Easiest)**
1. Go to https://app.netlify.com
2. Drag & drop your project folder
3. Done! Your site is live

**Option B: GitHub Pages**
1. Push code to GitHub
2. Settings → Pages → Select branch
3. Your site is live at `username.github.io/repo`

**Option C: Your Own Server**
1. Upload files via FTP
2. Access via your domain

## ✅ Pre-Launch Checklist

- [ ] Web app deployed and accessible
- [ ] Updated JavaScript config URL
- [ ] Updated HTML link URL  
- [ ] Updated CSP meta tag
- [ ] All URLs use HTTPS (not HTTP)
- [ ] Tested button on live site

## 🎯 Example Production URLs

If your web app is at `https://app.edutripindia.com`:

**JavaScript Config:**
```javascript
const WEB_APP_CONFIG = {
  url: 'https://app.edutripindia.com',
  openInNewTab: true
};
```

**HTML Link:**
```html
<a href="https://app.edutripindia.com" class="login-register-btn" ...>
```

**CSP:**
```html
content="... https://app.edutripindia.com; ..."
```

## 🔧 Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

