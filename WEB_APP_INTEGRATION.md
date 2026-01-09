# Web App Integration Guide

## Overview
The Login/Register button is integrated with the Edutrip Web Application from GitHub:
- **Repository**: https://github.com/edutrip2025-crypto/Edutrip_web_app
- **Current URL**: `http://192.168.174.1:8080/`

## Configuration

### Update Web App URL

The web app URL is configured in `index.html` in two places:

1. **HTML Link** (Line ~280):
   ```html
   <a href="http://192.168.174.1:8080/" class="login-register-btn" ...>
   ```

2. **JavaScript Configuration** (Line ~840):
   ```javascript
   const WEB_APP_CONFIG = {
     url: 'http://192.168.174.1:8080/', // Update this for production
     openInNewTab: true
   };
   ```

### For Production Deployment

When deploying to production, update the URL in the `WEB_APP_CONFIG` object:

```javascript
const WEB_APP_CONFIG = {
  url: 'https://your-production-domain.com', // Your deployed web app URL
  openInNewTab: true
};
```

### Content Security Policy (CSP)

The CSP has been updated to allow connections to your web app. If you change the URL, also update the CSP meta tag (Line ~66):

```html
<meta http-equiv="Content-Security-Policy"
  content="... connect-src ... http://192.168.174.1:8080; frame-src ... http://192.168.174.1:8080; ...">
```

## Features

- ✅ Button opens web app in new tab (configurable)
- ✅ Responsive design for mobile and desktop
- ✅ Styled to match website theme
- ✅ Accessible with proper ARIA labels

## Testing

1. **Local Testing**: Ensure your web app is running at `http://192.168.174.1:8080/`
2. **Click the Login/Register button** in the top right corner
3. **Verify** it opens your web application correctly

## Troubleshooting

- **Button doesn't work**: Check if web app is running and accessible
- **CSP errors**: Update the CSP meta tag with your web app URL
- **Same-origin issues**: Ensure CORS is configured on your web app if needed

