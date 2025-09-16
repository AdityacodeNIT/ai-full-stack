# Deployment Guide

This guide covers deploying the AI Ticketing System with Frontend on Vercel and Backend on Render.

## Backend Deployment (Render)

### 1. Prepare Backend for Production

1. **Environment Variables on Render:**
   ```
   NODE_ENV=production
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=http://localhost:5173
   FRONTEND_URL=https://your-app-name.vercel.app
   OPENAI_API_KEY=your-openai-api-key
   ASSEMBLYAI_API_KEY=your-assemblyai-api-key
   INNGEST_EVENT_KEY=your-inngest-event-key
   INNGEST_SIGNING_KEY=your-inngest-signing-key
   PORT=10000
   ```

2. **Build Command:** `npm install`
3. **Start Command:** `npm start`

### 2. Update package.json (Backend)

Add to `ai-ticket-assistant/package.json`:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

## Frontend Deployment (Vercel)

### 1. Environment Variables on Vercel

```
VITE_API_URL=https://your-backend-app.onrender.com
VITE_WS_URL=wss://your-backend-app.onrender.com
```

### 2. Build Settings

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3. Vercel Configuration

Create `ai-ticketing/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Authentication Configuration

The system now uses a hybrid authentication approach:

### Development (localhost)
- Uses HTTP-only cookies
- Automatic cookie management
- No manual token handling needed

### Production (cross-domain)
- Uses JWT tokens in localStorage
- Tokens sent via Authorization headers
- Automatic token refresh on API calls

## CORS Configuration

The backend automatically configures CORS based on environment:

- **Development:** Uses `CORS_ORIGIN` (localhost)
- **Production:** Uses both `CORS_ORIGIN` and `FRONTEND_URL`

## Security Features

### Production Security
- JWT tokens with expiration (7 days)
- Automatic token cleanup on logout
- CORS protection
- Secure headers

### Development Security
- HTTP-only cookies
- SameSite protection
- Secure flag in production

## Deployment Steps

### Backend (Render)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy from `ai-ticket-assistant` folder
4. Note the deployed URL

### Frontend (Vercel)
1. Connect your GitHub repository
2. Set `VITE_API_URL` to your Render backend URL
3. Set `VITE_WS_URL` to your Render WebSocket URL
4. Deploy from `ai-ticketing` folder

## Testing Deployment

1. **Backend Health Check:**
   ```bash
   curl https://your-backend.onrender.com/api/auth/me
   ```

2. **Frontend Access:**
   - Visit your Vercel URL
   - Test login/signup functionality
   - Verify API calls work

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure `FRONTEND_URL` is set correctly on Render
   - Check that Vercel URL matches the CORS configuration

2. **Authentication Issues:**
   - Verify JWT_SECRET is set on Render
   - Check that tokens are being sent in requests

3. **WebSocket Issues:**
   - Ensure WebSocket URL uses `wss://` for HTTPS
   - Check that WebSocket token generation works

### Debug Mode

Add to backend environment variables for debugging:
```
DEBUG=true
```

This will enable additional logging for troubleshooting.