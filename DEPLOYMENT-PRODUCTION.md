# Production Deployment Guide

## Architecture
- **Frontend**: Vercel (React App)
- **Backend**: Render (Node.js + MongoDB Atlas)
- **Database**: MongoDB Atlas

## Frontend Deployment (Vercel)

### Configuration Files
- `vercel.json` - Vercel deployment configuration
- `.env.example` - Environment variables template

### Environment Variables
Set in Vercel Dashboard:
```
VITE_API_URL=https://your-backend.onrender.com
```

### Deployment Steps
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

## Backend Deployment (Render)

### Configuration Files
- `render.yaml` - Render deployment specification
- `server-mongodb.js` - MongoDB-enabled server
- `models/Student.js` - MongoDB schema

### Environment Variables (Set in Render Dashboard)
```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://your-vercel-app.vercel.app
MONGODB_URI=mongodb+srv://babutmuthumari_db_user:lgAaFavmi8vQB4ji@cluster0.6vhgf3m.mongodb.net/?appName=Cluster0
```

### Deployment Steps
1. Push code to GitHub
2. Connect repository to Render
3. Render reads `render.yaml` automatically
4. Service builds and deploys

## Database Configuration

### MongoDB Atlas
- Cluster: Already configured
- Connection string: Set in environment variables
- Data persistence: Automatic

## CORS Configuration

### Backend CORS Origins
```javascript
origin: [
  'http://localhost:5173', // Local development
  process.env.CORS_ORIGIN,  // Production Vercel URL
  'https://cgpa-register-demo.vercel.app' // Backup URL
]
```

## API Endpoints

### Production URLs
- **Backend**: `https://your-app.onrender.com`
- **Frontend**: `https://your-app.vercel.app`

### Available Endpoints
- `GET /health` - Health check
- `POST /api/user` - Save/update student data
- `GET /api/user/:registerNo` - Get student by register number
- `GET /api/admin/students` - Get all students
- `POST /api/admin/test-data` - Insert test data
- `DELETE /api/admin/students/:registerNo` - Delete student

## Testing Production Deployment

### Health Check
```bash
curl https://your-app.onrender.com/health
```

### API Test
```bash
curl -X POST https://your-app.onrender.com/api/admin/test-data
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check CORS_ORIGIN environment variable
2. **Database Connection**: Verify MONGODB_URI is correct
3. **Build Failures**: Check package.json scripts
4. **Environment Variables**: Ensure all required variables are set

### Debugging
- Check Render logs for backend errors
- Check Vercel logs for frontend issues
- Use browser DevTools for API call debugging

## Performance Considerations

### Frontend (Vercel)
- Automatic CDN distribution
- Edge caching for static assets
- Build optimization enabled

### Backend (Render)
- Free tier may have cold starts
- Consider upgrading for production traffic
- MongoDB Atlas handles scaling automatically

## Security Notes

### Environment Variables
- Never commit sensitive data to Git
- Use Render/Vercel environment variable management
- MongoDB credentials are secure in environment variables

### CORS
- Restrict to specific domains in production
- Remove localhost URLs in production build

## Monitoring

### Render Dashboard
- Service health metrics
- Request logs
- Error tracking

### Vercel Dashboard
- Build status
- Performance metrics
- Edge function logs

## Next Steps

1. Update URLs in configuration files with your actual deployment URLs
2. Test all functionality in production environment
3. Monitor performance and error logs
4. Set up alerts for critical issues
