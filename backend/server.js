const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('./models/Student');

const app = express();

// Middleware
// Add detailed logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} Origin:${req.headers.origin} Host:${req.headers.host}`);
  next();
});

app.use(cors({
  origin: true, // Allow any origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'cache-control', 'pragma']
}));

// Mobile-friendly middleware
app.use((req, res, next) => {
  // Log mobile requests for debugging
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  if (isMobile) {
    console.log(`Mobile request: ${req.method} ${req.path} from ${userAgent.substring(0, 50)}...`);
  }

  // Set mobile-friendly headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('ERROR: MONGODB_URI environment variable is not set!');
  console.error('Please set MONGODB_URI in your Render environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    console.error('Failed to connect to MongoDB Atlas');
    process.exit(1);
  });

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'CGPA Register Backend - MongoDB'
  });
});

// Routes
app.post('/api/user', async (req, res) => {
  try {
    const userData = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({ registerNo: userData.registerNo });

    if (existingStudent) {
      // Update existing student
      const updatedStudent = await Student.findOneAndUpdate(
        { registerNo: userData.registerNo },
        {
          name: userData.name,
          section: userData.section,
          totalSemesters: userData.totalSemesters,
          semesters: userData.semesters
        },
        { new: true, upsert: true }
      );

      console.log('Student data updated:', userData);
      res.status(200).json({
        message: 'Student data updated successfully',
        data: updatedStudent
      });
    } else {
      // Insert new student data
      const newStudent = new Student(userData);
      const savedStudent = await newStudent.save();

      console.log('Student data saved:', userData);
      res.status(201).json({
        message: 'Student data saved successfully',
        data: savedStudent
      });
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

app.get('/api/user/:registerNo', async (req, res) => {
  try {
    const { registerNo } = req.params;

    const student = await Student.findOne({ registerNo });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// API endpoint to fetch all students with their data
app.get('/api/admin/students', async (req, res) => {
  try {
    console.log('Fetching all students...');

    const students = await Student.find().sort({ createdAt: -1 });

    console.log('Students found:', students.length);
    res.json(students);
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({ error: 'Failed to fetch students data' });
  }
});

// Add test data endpoint
app.post('/api/admin/test-data', async (req, res) => {
  try {
    console.log('Test data endpoint called');

    const testStudent = {
      name: 'John Doe',
      registerNo: 'REG2024001',
      section: 'A',
      totalSemesters: 2,
      semesters: [
        {
          semesterNo: 1,
          sgpa: 8.5,
          subjects: [
            { code: 'MA8151', name: 'Engineering Mathematics I', credits: 4, grade: 'A', gradePoint: 8 },
            { code: 'PH8151', name: 'Engineering Physics', credits: 3, grade: 'B+', gradePoint: 7 },
            { code: 'CY8151', name: 'Engineering Chemistry', credits: 3, grade: 'A', gradePoint: 8 },
            { code: 'GE8151', name: 'Problem Solving and Python Programming', credits: 3, grade: 'A+', gradePoint: 9 },
            { code: 'GE8152', name: 'Engineering Graphics', credits: 4, grade: 'B', gradePoint: 6 }
          ]
        },
        {
          semesterNo: 2,
          sgpa: 9.0,
          subjects: [
            { code: 'MA8251', name: 'Engineering Mathematics II', credits: 4, grade: 'A+', gradePoint: 9 },
            { code: 'PH8251', name: 'Applied Physics', credits: 3, grade: 'A', gradePoint: 8 },
            { code: 'CY8251', name: 'Engineering Chemistry II', credits: 3, grade: 'A+', gradePoint: 9 },
            { code: 'EE8251', name: 'Electric Circuit Analysis', credits: 4, grade: 'A', gradePoint: 8 },
            { code: 'ME8251', name: 'Engineering Mechanics', credits: 3, grade: 'B+', gradePoint: 7 }
          ]
        }
      ]
    };

    const newStudent = new Student(testStudent);
    const savedStudent = await newStudent.save();

    console.log('Test data inserted successfully');
    res.status(201).json({ message: 'Test data inserted successfully', data: savedStudent });
  } catch (error) {
    console.error('Error in test data endpoint:', error);
    res.status(500).json({ error: 'Failed to insert test data: ' + error.message });
  }
});

// Delete student by register number
app.delete('/api/admin/students/:registerNo', async (req, res) => {
  try {
    const { registerNo } = req.params;
    console.log('Attempting to delete student with registerNo:', registerNo);

    const student = await Student.findOneAndDelete({ registerNo });

    if (!student) {
      console.log('Student not found:', registerNo);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('Student deleted successfully:', registerNo);
    res.json({ message: 'Student deleted successfully', student });
  } catch (error) {
    console.error('Error in delete endpoint:', error);
    res.status(500).json({ error: 'Failed to delete student: ' + error.message });
  }
});

// Serve static files from the React frontend app
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Anything that doesn't match the above routes, send back index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('CGPA Calculator API with MongoDB Atlas is ready!');
});
