# MongoDB Atlas Migration Guide

## Setup Instructions

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier is sufficient)

### 2. Get Connection String
1. In Atlas, go to your cluster
2. Click "Connect" → "Connect your application"
3. Copy the connection string

### 3. Create .env file
Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
```

### 4. Install Dependencies
```bash
npm install mongoose dotenv
```

### 5. Start MongoDB Server
```bash
npm run dev-mongo
```

## MongoDB Schema

### Student Model
```javascript
{
  name: String,
  registerNo: String (unique),
  section: String,
  totalSemesters: Number,
  semesters: [
    {
      semesterNo: Number,
      sgpa: Number,
      subjects: [
        {
          code: String,
          name: String,
          credits: Number,
          grade: String,
          gradePoint: Number
        }
      ]
    }
  ],
  timestamps: true
}
```

## API Endpoints (MongoDB)

All endpoints remain the same:
- `POST /api/user` - Create/Update student
- `GET /api/user/:registerNo` - Get student by register number
- `GET /api/admin/students` - Get all students
- `POST /api/admin/test-data` - Insert test data
- `DELETE /api/admin/students/:registerNo` - Delete student

## Migration Benefits

- **Scalability**: MongoDB handles large datasets better
- **Cloud-based**: No local database setup required
- **Flexibility**: Document structure matches our data model
- **Performance**: Better for complex nested data
- **Backup**: Automatic backups with Atlas

## Notes

- Original SQLite server (`server.js`) is still available
- Use `npm run dev` for SQLite, `npm run dev-mongo` for MongoDB
- Frontend code remains unchanged - only backend database changes
