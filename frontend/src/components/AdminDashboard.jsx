import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack, Text, Button, useToast, HStack, useBreakpointValue } from '@chakra-ui/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Add global styles for enhanced scroll bars
const globalStyles = `
  html {
    scroll-behavior: smooth;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #4A5568 #E2E8F0;
  }
  *::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  *::-webkit-scrollbar-track {
    background: #E2E8F0;
    border-radius: 6px;
  }
  *::-webkit-scrollbar-thumb {
    background: #4A5568;
    border-radius: 6px;
    border: 2px solid #E2E8F0;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: #2D3748;
  }
  *::-webkit-scrollbar-corner {
    background: #E2E8F0;
  }
`;

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  // Inject global styles to disable body scrolling
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Responsive values
  const headingSize = useBreakpointValue({ base: 'xl', md: '2xl' });
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md' });
  const padding = useBreakpointValue({ base: 4, md: 6 });

  const handleLogout = () => {
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    navigate('/');
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students from API...');
      
      // Use environment variable for API endpoint
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/admin/students`
        : 'http://localhost:5000/api/admin/students';
      
      console.log('Using API endpoint:', apiEndpoint);
      
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      setStudents(data);
      console.log('Students set:', data.length);
      
      // Show success message for debugging
      if (data.length === 0) {
        toast({
          title: 'No Data Found',
          description: 'No student records found in the database. Try adding test data.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent
      });
      
      toast({
        title: 'Connection Error',
        description: `Failed to fetch student data: ${error.message}. Check if server is running.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalStudents = students.length;
    
    // Calculate Number of Arrear Having Students
    const arrearHavingStudents = students.filter(student => {
      if (!student?.semesters || student.semesters.length === 0) return false;
      return student.semesters.some(semester => {
        if (!semester.subjects) return false;
        return semester.subjects.some(subject => subject.gradePoint < 5);
      });
    }).length;
    
    // Calculate Highest CGPA
    const studentCGPAs = students.map(student => {
      if (!student?.semesters || student.semesters.length === 0) return 0;
      const allSubjects = student.semesters.flatMap(sem => sem.subjects || []);
      const totalCredits = allSubjects.reduce((sum, subject) => sum + subject.credits, 0);
      const weightedSum = allSubjects.reduce((sum, subject) => sum + (subject.gradePoint * subject.credits), 0);
      return totalCredits > 0 ? weightedSum / totalCredits : 0;
    }).filter(cgpa => cgpa > 0);
    
    const highestCGPA = studentCGPAs.length > 0 ? Math.max(...studentCGPAs) : 0;

    return { totalStudents, arrearHavingStudents, highestCGPA };
  };

  // Function to get the maximum number of semesters across all students
  const getMaxSemesters = () => {
    return students.reduce((max, student) => {
      const semCount = student?.semesters?.length || 0;
      return Math.max(max, semCount);
    }, 0);
  };

  // Function to process student data for semester-wise display
  const getStudentSemesterData = () => {
    const studentData = [];
    const maxSemesters = getMaxSemesters();
    
    students.filter(student => student !== null).forEach((student, index) => {
      const semesters = student?.semesters || [];
      const semesterData = {};
      
      // Calculate arrears (grades below 'C' or gradePoint < 5)
      const calculateArrears = (subjects) => {
        if (!subjects) return { count: 0, total: 0 };
        const arrears = subjects.filter(subject => subject.gradePoint < 5);
        return { count: arrears.length, total: arrears.length };
      };
      
      // Calculate totals (sum of credit × gradePoint products)
      const calculateTotal = (subjects) => {
        if (!subjects) return 0;
        return subjects.reduce((sum, subject) => sum + (subject.credits * subject.gradePoint), 0);
      };
      
      // Process each semester dynamically
      for (let semNum = 1; semNum <= maxSemesters; semNum++) {
        const semData = semesters.find(sem => sem.semesterNo === semNum) || {};
        const arrears = calculateArrears(semData.subjects);
        const total = calculateTotal(semData.subjects);
        
        semesterData[`sem${semNum}`] = {
          credit: total || 0,
          arrearsCount: arrears.count,
          arrearsTotal: arrears.total,
          total: total,
          sgpa: semData.sgpa || 0
        };
      }
      
      // Calculate overall CGPA across all semesters using credit × gradePoint products
      const allSubjects = semesters.flatMap(sem => sem.subjects || []);
      const totalCredits = allSubjects.reduce((sum, subject) => sum + subject.credits, 0);
      const weightedSum = allSubjects.reduce((sum, subject) => sum + (subject.gradePoint * subject.credits), 0);
      const overallCGPA = totalCredits > 0 ? weightedSum / totalCredits : 0;
      const overallTotal = Object.values(semesterData).reduce((sum, sem) => sum + sem.total, 0);
      const overallArrears = Object.values(semesterData).reduce((sum, sem) => sum + sem.arrearsCount, 0);
      
      studentData.push({
        sno: index + 1,
        section: student?.section || 'N/A',
        registerNo: student?.registerNo || 'N/A',
        name: student?.name || 'N/A',
        ...semesterData,
        overall: {
          cgpa: overallCGPA,
          total: overallTotal,
          totalArrears: overallArrears
        }
      });
    });
    
    return studentData;
  };

  const addTestData = async () => {
    try {
      // Use environment variable for API endpoint
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/admin/test-data`
        : 'http://localhost:5000/api/admin/test-data';
      
      console.log('Adding test data using endpoint:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test data added successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchStudents(); // Refresh the data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add test data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error adding test data:', error);
      toast({
        title: 'Error',
        description: 'Failed to add test data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const studentData = getStudentSemesterData();
  const maxSemesters = getMaxSemesters();

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      // Build dynamic headers based on actual semesters
      const headers = {
        'S.No': 'sno',
        'SECTION': 'section',
        'REG NO': 'registerNo',
        'NAME': 'name'
      };
      
      // Add semester columns dynamically
      for (let sem = 1; sem <= maxSemesters; sem++) {
        headers[`SEM ${sem} - ARREAR COUNT`] = `sem${sem}.arrearsCount`;
        headers[`SEM ${sem} - TOTAL ARREAR`] = `sem${sem}.arrearsTotal`;
        headers[`SEM ${sem} - TOT`] = `sem${sem}.total`;
        headers[`SEM ${sem} - SGPA`] = `sem${sem}.sgpa`;
      }
      
      // Add overall columns
      headers['CGPA (Overall)'] = 'overall.cgpa';
      headers['TOT (Overall)'] = 'overall.total';
      headers['Total Arrear (Overall)'] = 'overall.totalArrears';
      headers['Signature'] = 'signature';
      
      const ws = XLSX.utils.json_to_sheet(studentData.map(student => {
        const row = {
          'S.No': student.sno,
          'SECTION': student.section,
          'REG NO': student.registerNo,
          'NAME': student.name
        };
        
        // Add semester data dynamically
        for (let sem = 1; sem <= maxSemesters; sem++) {
          const semData = student[`sem${sem}`] || { arrearsCount: 0, arrearsTotal: 0, total: 0, sgpa: 0 };
          row[`SEM ${sem} - ARREAR COUNT`] = semData.arrearsCount;
          row[`SEM ${sem} - TOTAL ARREAR`] = semData.arrearsTotal;
          row[`SEM ${sem} - TOT`] = semData.total;
          row[`SEM ${sem} - SGPA`] = semData.sgpa;
        }
        
        // Add overall data
        row['CGPA (Overall)'] = student.overall.cgpa;
        row['TOT (Overall)'] = student.overall.total;
        row['Total Arrear (Overall)'] = student.overall.totalArrears;
        row['Signature'] = '';
        
        return row;
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student Records');
      XLSX.writeFile(wb, 'CGPA_Student_Records.xlsx');
      
      toast({
        title: 'Success',
        description: 'Excel file exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Failed to export Excel file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const element = document.getElementById('student-table');
      if (!element) {
        toast({
          title: 'Error',
          description: 'Table not found for export',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 280;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('CGPA_Student_Records.pdf');
      
      toast({
        title: 'Success',
        description: 'PDF file exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteStudent = async (registerNo) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete the student with Register No: ${registerNo}? This action cannot be undone.`
    );
    
    if (!isConfirmed) {
      return;
    }

    try {
      // Use environment variable for API endpoint
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/admin/students/${registerNo}`
        : 'http://localhost:5000/api/admin/students/${registerNo}';
      
      console.log('Deleting student using endpoint:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Delete response:', data);
      
      toast({
        title: 'Student Deleted',
        description: `Student with Register No: ${registerNo} has been deleted successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the data
      fetchStudents();
      
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Delete Error',
        description: `Failed to delete student: ${error.message}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box p={8}>
        <Text textAlign="center">Loading student data...</Text>
      </Box>
    );
  }

  const stats = calculateStats();

  return (
    <Box minH="100vh" bg="gray.50">
      <VStack spacing={6} p={6} align="stretch" minH="100vh">
      <HStack justify="space-between" w="100%">
        <Heading size="2xl" color="blue.600">
          Admin Dashboard
        </Heading>
        <Button 
          onClick={handleLogout}
          colorScheme="red" 
          variant="solid"
        >
          Logout
        </Button>
      </HStack>

      {/* Statistics Cards */}
      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={4} mb={6}>
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="blue.600">
            {stats.totalStudents}
          </Text>
          <Text fontSize="sm" color="gray.600">Total Students</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {stats.arrearHavingStudents}
          </Text>
          <Text fontSize="sm" color="gray.600">Arrear Having Students</Text>
        </Box>
        
        <Box p={4} borderRadius="8px" bg="white" boxShadow="0 2px 4px rgba(0,0,0,0.1)">
          <Text fontSize="lg" fontWeight="bold" color="purple.600">
            {stats.highestCGPA.toFixed(2)}
          </Text>
          <Text fontSize="sm" color="gray.600">Highest CGPA</Text>
        </Box>
      </Box>

      {/* Students Table */}
      <Box 
        bg="white" 
        borderRadius="8px" 
        p={4} 
        boxShadow="0 2px 4px rgba(0,0,0,0.1)"
      >
        <Heading size="md" mb={2} color="gray.800">
          Student Academic Records (Semester-wise)
        </Heading>
        
        {studentData.length === 0 ? (
          <Text textAlign="center" color="gray.500" py={8}>
            No student records found in the database.
          </Text>
        ) : (
          <Box 
            overflowX="auto" 
            borderWidth="1px" 
            borderRadius="md"
            borderColor="gray.200"
            boxShadow="sm"
            position="relative"
            sx={{
              '&::-webkit-scrollbar': {
                width: '16px',
                height: '16px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#E2E8F0',
                borderRadius: '8px',
                border: '2px solid #CBD5E0',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'linear-gradient(180deg, #4A5568 0%, #2D3748 100%)',
                borderRadius: '8px',
                border: '2px solid #CBD5E0',
                minHeight: '40px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'linear-gradient(180deg, #2D3748 0%, #1A202C 100%)',
              },
              '&::-webkit-scrollbar-corner': {
                background: '#E2E8F0',
              },
              scrollbarWidth: 'thin',
              scrollbarColor: '#4A5568 #E2E8F0',
            }}
          >
            <Table id="student-table" variant="simple" size="sm" width="100%" minWidth="1600px" fontSize="xs" style={{ 
              tableLayout: 'auto',
              border: '2px solid #2D3748',
              borderCollapse: 'separate',
              borderSpacing: '0'
            }}>
              <Thead position="sticky" top={0} zIndex={1} bgColor="white" style={{ border: '2px solid #2D3748' }}>
                <Tr style={{ border: '2px solid #2D3748' }}>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="50px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>S.No</Th>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>SECTION</Th>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="100px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>REG NO</Th>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="150px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>NAME</Th>
                  {/* Dynamic semester columns */}
                  {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => (
                    <Th key={semNum} colSpan={4} textAlign="center" bgColor={semNum % 2 === 0 ? "green.50" : "blue.50"} p={1} fontSize="xs" style={{ 
                      border: '2px solid #2D3748',
                      fontWeight: 'bold'
                    }}>
                      SEM {semNum}
                    </Th>
                  ))}
                  <Th colSpan={3} textAlign="center" bgColor="purple.50" p={1} fontSize="xs" style={{ 
                    border: '2px solid #2D3748',
                    fontWeight: 'bold'
                  }}>Overall</Th>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="100px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>Signature</Th>
                  <Th rowSpan={2} textAlign="center" p={2} fontSize="xs" width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>Actions</Th>
                </Tr>
                <Tr style={{ border: '2px solid #2D3748' }}>
                  {/* Dynamic semester sub-columns */}
                  {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => (
                    <React.Fragment key={`sub-${semNum}`}>
                      <Th textAlign="center" fontSize="10px" p={1} width="80px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>ARREAR COUNT</Th>
                      <Th textAlign="center" fontSize="10px" p={1} width="80px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>TOTAL ARREAR</Th>
                      <Th textAlign="center" fontSize="10px" p={1} width="60px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>TOT</Th>
                      <Th textAlign="center" fontSize="10px" p={1} width="60px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>SGPA</Th>
                    </React.Fragment>
                  ))}
                  {/* Overall sub-columns */}
                  <Th textAlign="center" fontSize="10px" p={1} width="60px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>CGPA</Th>
                  <Th textAlign="center" fontSize="10px" p={1} width="60px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>TOT</Th>
                  <Th textAlign="center" fontSize="10px" p={1} width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>Total Arrear</Th>
                </Tr>
              </Thead>
              <Tbody style={{ border: '2px solid #2D3748' }}>
                {studentData.map((student) => (
                  <Tr key={student.registerNo} style={{ border: '2px solid #2D3748' }}>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.sno}</Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.section}</Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.registerNo}</Td>
                    <Td p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.name}</Td>
                    {/* Dynamic semester data */}
                    {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => {
                      const semData = student[`sem${semNum}`] || { arrearsCount: 0, arrearsTotal: 0, total: 0, sgpa: 0 };
                      return (
                        <React.Fragment key={`data-${semNum}`}>
                          <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{semData.arrearsCount}</Td>
                          <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{semData.arrearsTotal}</Td>
                          <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{semData.total}</Td>
                          <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{semData.sgpa.toFixed(2)}</Td>
                        </React.Fragment>
                      );
                    })}
                    {/* Overall Data */}
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.overall.cgpa.toFixed(2)}</Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.overall.total}</Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>{student.overall.totalArrears}</Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}></Td>
                    <Td textAlign="center" p={1} fontSize="xs" style={{ border: '1px solid #CBD5E0' }}>
                      <Button 
                        size="xs" 
                        colorScheme="red" 
                        onClick={() => handleDeleteStudent(student.registerNo)}
                      >
                        Delete
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        </Box>

        <HStack spacing={4} mt={4}>
        
        <Button 
          onClick={exportToExcel}
          colorScheme="blue" 
          variant="solid"
        >
          Excel
        </Button>
        
        <Button 
          onClick={exportToPDF}
          colorScheme="blue" 
          variant="solid"  
            >
          PDF
        </Button>
      </HStack>
      </VStack>
    </Box>
  );
}
export default AdminDashboard;
