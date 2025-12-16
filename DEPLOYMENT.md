# CGPA Register - Deployment Guide

## Overview
Deploy your CGPA Register application globally using:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Express)

## Prerequisites
- GitHub repository with your code
- Vercel account (free)
- Render account (free tier available)
- MongoDB Atlas account (for database)

## Step 1: Deploy Backend to Render

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` directory as root
   - Use the existing `render.yaml` configuration
   - Set environment variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: Generate a secure random string
     - `CORS_ORIGIN`: Will be set after frontend deployment

3. **Wait for Deployment**
   - Render will automatically build and deploy
   - Note your backend URL: `https://your-app-name.onrender.com`

## Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from Frontend Directory**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add `VITE_API_URL`: `https://your-render-app.onrender.com`

4. **Redeploy if Needed**
   ```bash
   vercel --prod
   ```

## Step 3: Update CORS Configuration

1. **Update Backend CORS**
   - In Render dashboard, update `CORS_ORIGIN` environment variable
   - Set it to your Vercel URL: `https://your-vercel-app.vercel.app`
   - Redeploy the backend service

## Step 4: Verify Deployment

1. **Test Frontend**
   - Visit your Vercel URL
   - Check if all pages load correctly

2. **Test Backend API**
   - Visit `https://your-render-app.onrender.com/health`
   - Should return a healthy status

3. **Test Integration**
   - Try registering a user
   - Try calculating CGPA
   - Verify data persistence

## Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_URL`: Your Render backend URL

### Backend (Render)
- `NODE_ENV`: production
- `PORT`: 10000
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secure random string
- `CORS_ORIGIN`: Your Vercel frontend URL

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure CORS_ORIGIN matches your Vercel URL exactly
2. **Database Connection**: Verify MongoDB URI is correct and IP is whitelisted
3. **Build Failures**: Check logs in Vercel/Render dashboards
4. **API Not Found**: Ensure backend health endpoint is accessible

### Useful Commands
```bash
# Check backend health
curl https://your-app.onrender.com/health

# Test CORS
curl -H "Origin: https://your-vercel-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-app.onrender.com/api/endpoint
```

## Performance Optimization

### Frontend (Vercel)
- Automatic CDN distribution
- Edge caching for static assets
- Code splitting configured in vite.config.js

### Backend (Render)
- Free tier includes automatic SSL
- Consider upgrading to paid tier for better performance
- Monitor usage in Render dashboard

## Next Steps

1. **Add Custom Domain** (optional)
   - Configure custom domain in both Vercel and Render
   - Update CORS_ORIGIN accordingly

2. **Set up Monitoring**
   - Enable Render's monitoring features
   - Consider error tracking like Sentry

3. **Backup Strategy**
   - Regular MongoDB backups
   - Git repository for code versioning
