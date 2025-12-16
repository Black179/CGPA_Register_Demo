const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database Setup
const db = new sqlite3.Database('./cgpa_calculator.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Create tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      registerNo TEXT UNIQUE NOT NULL,
      section TEXT NOT NULL,
      totalSemesters INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER,
      semesterNo INTEGER NOT NULL,
      sgpa REAL NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semesterId INTEGER,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      grade TEXT NOT NULL,
      gradePoint REAL NOT NULL,
      FOREIGN KEY (semesterId) REFERENCES semesters (id)
    )`);
  }
});

// Routes
app.post('/api/user', (req, res) => {
  try {
    const userData = req.body;
    
    // Insert student data
    db.run(`INSERT INTO students (name, registerNo, section, totalSemesters) VALUES (?, ?, ?, ?)`,
      [userData.name, userData.registerNo, userData.section, userData.totalSemesters],
      function(err) {
        if (err) {
          console.error('Error inserting student:', err.message);
          return res.status(500).json({ error: 'Failed to save student data' });
        }
        
        const studentId = this.lastID;
        
        // Insert semester data
        if (userData.semesters && userData.semesters.length > 0) {
          userData.semesters.forEach((semester, index) => {
            db.run(`INSERT INTO semesters (studentId, semesterNo, sgpa) VALUES (?, ?, ?)`,
              [studentId, semester.semesterNo, semester.sgpa],
              function(err) {
                if (err) {
                  console.error('Error inserting semester:', err.message);
                  return;
                }
                
                const semesterId = this.lastID;
                
                // Insert subject data
                if (semester.subjects && semester.subjects.length > 0) {
                  semester.subjects.forEach(subject => {
                    db.run(`INSERT INTO subjects (semesterId, code, name, credits, grade, gradePoint) VALUES (?, ?, ?, ?, ?, ?)`,
                      [semesterId, subject.code, subject.name, subject.credits, subject.grade, subject.gradePoint],
                      (err) => {
                        if (err) {
                          console.error('Error inserting subject:', err.message);
                        }
                      }
                    );
                  });
                }
              }
            );
          });
        }
        
        console.log('Student data saved:', userData);
        res.status(201).json({ message: 'Student data saved successfully', data: { ...userData, id: studentId } });
      }
    );
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

app.get('/api/user/:registerNo', (req, res) => {
  try {
    const { registerNo } = req.params;
    
    db.get(`SELECT * FROM students WHERE registerNo = ?`, [registerNo], (err, student) => {
      if (err) {
        console.error('Error fetching student:', err.message);
        return res.status(500).json({ error: 'Failed to fetch student data' });
      }
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Fetch semesters for this student
      db.all(`SELECT * FROM semesters WHERE studentId = ? ORDER BY semesterNo`, [student.id], (err, semesters) => {
        if (err) {
          console.error('Error fetching semesters:', err.message);
          return res.status(500).json({ error: 'Failed to fetch semester data' });
        }
        
        // Fetch subjects for each semester
        let completedSemesters = 0;
        const semesterData = semesters.map(semester => {
          const subjects = [];
          
          db.all(`SELECT * FROM subjects WHERE semesterId = ?`, [semester.id], (err, subjectRows) => {
            if (err) {
              console.error('Error fetching subjects:', err.message);
              return;
            }
            
            subjects.push(...subjectRows);
            completedSemesters++;
            
            if (completedSemesters === semesters.length) {
              const result = {
                ...student,
                semesters: semesters.map((sem, index) => ({
                  ...sem,
                  subjects: subjectRows.filter(subject => subject.semesterId === sem.id)
                }))
              };
              
              res.json(result);
            }
          });
        });
        
        if (semesters.length === 0) {
          res.json({ ...student, semesters: [] });
        }
      });
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// API endpoint to fetch all students with their data
app.get('/api/admin/students', (req, res) => {
  try {
    console.log('Fetching all students...');
    db.all(`SELECT * FROM students ORDER BY createdAt DESC`, (err, students) => {
      if (err) {
        console.error('Error fetching students:', err.message);
        return res.status(500).json({ error: 'Failed to fetch students data' });
      }
      
      console.log('Students found:', students.length);
      
      if (students.length === 0) {
        return res.json([]);
      }
      
      // Filter out null students
      const validStudents = students.filter(student => student !== null && student !== undefined);
      console.log('Valid students:', validStudents.length);
      
      if (validStudents.length === 0) {
        return res.json([]);
      }
      
      // For each student, fetch their semesters and subjects
      let completedStudents = 0;
      const studentsWithDetails = [];
      
      validStudents.forEach((student, studentIndex) => {
        db.all(`SELECT * FROM semesters WHERE studentId = ? ORDER BY semesterNo`, [student.id], (err, semesters) => {
          if (err) {
            console.error('Error fetching semesters:', err.message);
            return;
          }
          
          console.log('Semesters for student', student.name, ':', semesters.length);
          student.semesters = semesters || [];
          
          // For each semester, fetch subjects
          let completedSemesters = 0;
          const totalSemesters = semesters.length;
          
          if (totalSemesters === 0) {
            studentsWithDetails.push(student);
            completedStudents++;
            if (completedStudents === validStudents.length) {
              console.log('Returning students data:', studentsWithDetails.length);
              res.json(studentsWithDetails);
            }
            return;
          }
          
          semesters.forEach((semester, semesterIndex) => {
            db.all(`SELECT * FROM subjects WHERE semesterId = ?`, [semester.id], (err, subjects) => {
              if (err) {
                console.error('Error fetching subjects:', err.message);
                return;
              }
              
              console.log('Subjects for semester', semester.semesterNo, ':', subjects.length);
              semester.subjects = subjects || [];
              completedSemesters++;
              
              if (completedSemesters === totalSemesters) {
                studentsWithDetails.push(student);
                completedStudents++;
                
                if (completedStudents === validStudents.length) {
                  console.log('Returning students data:', studentsWithDetails.length);
                  res.json(studentsWithDetails);
                }
              }
            });
          });
        });
      });
      
      if (validStudents.length === 0) {
        res.json([]);
      }
    });
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({ error: 'Failed to fetch students data' });
  }
});

// Add test data endpoint
app.post('/api/admin/test-data', (req, res) => {
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

    // Insert test student data
    db.run(`INSERT INTO students (name, registerNo, section, totalSemesters) VALUES (?, ?, ?, ?)`,
      [testStudent.name, testStudent.registerNo, testStudent.section, testStudent.totalSemesters],
      function(err) {
        if (err) {
          console.error('Error inserting test student:', err.message);
          return res.status(500).json({ error: 'Failed to insert test data: ' + err.message });
        }
        
        const studentId = this.lastID;
        console.log('Student inserted with ID:', studentId);
        
        let completedSemesters = 0;
        const totalSemesters = testStudent.semesters.length;
        
        // Insert semester data
        testStudent.semesters.forEach((semester, index) => {
          db.run(`INSERT INTO semesters (studentId, semesterNo, sgpa) VALUES (?, ?, ?)`,
            [studentId, semester.semesterNo, semester.sgpa],
            function(err) {
              if (err) {
                console.error('Error inserting test semester:', err.message);
                return;
              }
              
              const semesterId = this.lastID;
              console.log('Semester inserted with ID:', semesterId);
              
              let completedSubjects = 0;
              const totalSubjects = semester.subjects.length;
              
              // Insert subject data
              semester.subjects.forEach(subject => {
                db.run(`INSERT INTO subjects (semesterId, code, name, credits, grade, gradePoint) VALUES (?, ?, ?, ?, ?, ?)`,
                  [semesterId, subject.code, subject.name, subject.credits, subject.grade, subject.gradePoint],
                  (err) => {
                    if (err) {
                      console.error('Error inserting test subject:', err.message);
                    } else {
                      console.log('Subject inserted:', subject.code);
                    }
                    
                    completedSubjects++;
                    if (completedSubjects === totalSubjects) {
                      completedSemesters++;
                      if (completedSemesters === totalSemesters) {
                        console.log('Test data inserted successfully');
                        res.status(201).json({ message: 'Test data inserted successfully', data: { ...testStudent, id: studentId } });
                      }
                    }
                  }
                );
              });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error('Error in test data endpoint:', error);
    res.status(500).json({ error: 'Failed to insert test data: ' + error.message });
  }
});

// Delete student by register number
app.delete('/api/admin/students/:registerNo', (req, res) => {
  try {
    const { registerNo } = req.params;
    console.log('Attempting to delete student with registerNo:', registerNo);
    
    // First check if student exists
    db.get(`SELECT * FROM students WHERE registerNo = ?`, [registerNo], (err, student) => {
      if (err) {
        console.error('Error checking student existence:', err.message);
        return res.status(500).json({ error: 'Failed to check student existence' });
      }
      
      if (!student) {
        console.log('Student not found:', registerNo);
        return res.status(404).json({ error: 'Student not found' });
      }
      
      console.log('Found student to delete:', student);
      
      // Delete subjects for this student (cascade through semesters)
      db.all(`SELECT id FROM semesters WHERE studentId = ?`, [student.id], (err, semesters) => {
        if (err) {
          console.error('Error fetching semesters for deletion:', err.message);
          return res.status(500).json({ error: 'Failed to fetch semesters for deletion' });
        }
        
        let deletedSemesters = 0;
        const totalSemesters = semesters.length;
        
        if (totalSemesters === 0) {
          // No semesters to delete, just delete the student
          db.run(`DELETE FROM students WHERE registerNo = ?`, [registerNo], (err) => {
            if (err) {
              console.error('Error deleting student:', err.message);
              return res.status(500).json({ error: 'Failed to delete student' });
            }
            
            console.log('Student deleted successfully:', registerNo);
            res.json({ message: 'Student deleted successfully', student });
          });
          return;
        }
        
        // Delete subjects for each semester
        semesters.forEach((semester) => {
          db.run(`DELETE FROM subjects WHERE semesterId = ?`, [semester.id], (err) => {
            if (err) {
              console.error('Error deleting subjects for semester:', semester.id, err.message);
              return;
            }
            
            // Delete the semester
            db.run(`DELETE FROM semesters WHERE id = ?`, [semester.id], (err) => {
              if (err) {
                console.error('Error deleting semester:', semester.id, err.message);
                return;
              }
              
              deletedSemesters++;
              
              if (deletedSemesters === totalSemesters) {
                // All semesters and subjects deleted, now delete the student
                db.run(`DELETE FROM students WHERE registerNo = ?`, [registerNo], (err) => {
                  if (err) {
                    console.error('Error deleting student:', err.message);
                    return res.status(500).json({ error: 'Failed to delete student' });
                  }
                  
                  console.log('Student and all related data deleted successfully:', registerNo);
                  res.json({ message: 'Student deleted successfully', student });
                });
              }
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in delete endpoint:', error);
    res.status(500).json({ error: 'Failed to delete student: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('CGPA Calculator API with SQLite is ready!');
});
