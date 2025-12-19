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
  const [sortBy, setSortBy] = useState('registerNo'); // New state for sorting
  const [sortOrder, setSortOrder] = useState('asc'); // New state for sort order
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

  // Responsive values for both laptop and mobile
  const headingSize = useBreakpointValue({ base: 'xl', md: '2xl', lg: '3xl' });
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md', lg: 'md' });
  const padding = useBreakpointValue({ base: 4, md: 6, lg: 8 });
  const containerPadding = useBreakpointValue({ base: 2, md: 4, lg: 6 });

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
    let isMounted = true;
    let intervalId = null;
    
    const fetchWithMountCheck = async (isBackground = false) => {
      if (isMounted) {
        await fetchStudents(isBackground);
      }
    };
    
    // Initial fetch
    fetchWithMountCheck(false);
    
    // Add real-time data refresh for mobile (reduced frequency to prevent issues)
    intervalId = setInterval(() => {
      fetchWithMountCheck(true); // Background refresh
    }, 60000); // Increased to 60 seconds to reduce server load
    
    // Add visibility change listener for mobile
    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        fetchWithMountCheck(true); // Background refresh when app becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Add focus listener for mobile
    const handleFocus = () => {
      if (isMounted) {
        fetchWithMountCheck(true); // Background refresh when app gains focus
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchStudents = async (isBackgroundRefresh = false) => {
    // Create a new AbortController for each request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      // Don't show loading for background refreshes to avoid mobile UI flicker
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      
      console.log('Fetching students from API...');
      
      // Use environment variable for API endpoint
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/admin/students`
        : 'http://localhost:5000/api/admin/students';
      
      console.log('Using API endpoint:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        signal: controller.signal,
        method: 'GET',
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      setStudents(data);
      console.log('Students set:', data.length);
      
      // Show success message only for manual refreshes, not background ones
      if (!isBackgroundRefresh && data.length === 0) {
        toast({
          title: 'No Data Found',
          description: 'No student records found in the database. Try adding test data.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
      return data; // Return data for use in export functions
    } catch (error) {
      // Clear timeout if it exists
      clearTimeout(timeoutId);
      
      console.error('Error fetching students:', error);
      
      // Don't show error toast for background refreshes, abort errors, or timeout errors
      if (error.name !== 'AbortError' && !isBackgroundRefresh) {
        // Check if it's a timeout error
        const isTimeout = error.message.includes('timeout') || error.name === 'AbortError';
        
        toast({
          title: isTimeout ? 'Connection Timeout' : 'Connection Error',
          description: isTimeout 
            ? 'Server connection timed out. Please check your internet connection and try again.'
            : `Failed to fetch student data: ${error.message}. Check if server is running.`,
          status: 'error',
          duration: isTimeout ? 4000 : 5000,
          isClosable: true,
        });
      }
      return []; // Return empty array on error
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  // Refresh data function specifically for exports
  const refreshDataForExport = async () => {
    const freshData = await fetchStudents(false);
    return freshData;
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
    
    // Calculate Average CGPA
    const studentCGPAs = students.map(student => {
      if (!student?.semesters || student.semesters.length === 0) return 0;
      const allSubjects = student.semesters.flatMap(sem => sem.subjects || []);
      const totalCredits = allSubjects.reduce((sum, subject) => sum + subject.credits, 0);
      const weightedSum = allSubjects.reduce((sum, subject) => sum + (subject.gradePoint * subject.credits), 0);
      return totalCredits > 0 ? weightedSum / totalCredits : 0;
    }).filter(cgpa => cgpa > 0);
    
    const averageCGPA = studentCGPAs.length > 0 ? studentCGPAs.reduce((sum, cgpa) => sum + cgpa, 0) / studentCGPAs.length : 0;

    return { totalStudents, arrearHavingStudents, averageCGPA };
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
    let studentData = [];
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
    
    // Sort student data by register number
    studentData.sort((a, b) => {
      const regA = a.registerNo.toString();
      const regB = b.registerNo.toString();
      
      if (sortBy === 'registerNo') {
        if (sortOrder === 'asc') {
          return regA.localeCompare(regB, undefined, { numeric: true });
        } else {
          return regB.localeCompare(regA, undefined, { numeric: true });
        }
      }
      return 0;
    });
    
    // Update serial numbers after sorting
    studentData.forEach((student, index) => {
      student.sno = index + 1;
    });
    
    return studentData;
  };

  // Function to handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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
      // Show loading toast for mobile feedback
      toast({
        title: 'Preparing Excel',
        description: 'Fetching latest data and generating Excel file...',
        status: 'info',
        duration: 1000,
        isClosable: true,
      });

      // Refresh data to ensure we have all records
      const freshStudents = await refreshDataForExport();
      if (freshStudents.length === 0) {
        toast({
          title: 'No Data',
          description: 'No student data available to export',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log(`Exporting ${freshStudents.length} student records to Excel...`);
      
      // Process fresh data for export
      const freshStudentData = getStudentSemesterData();

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
      
      // Create enhanced heading data with proper formatting for mobile and desktop
      const isMobile = window.innerWidth <= 768;
      const headingData = [
        ['PSNA College of Engineering & Technology, Dindigul – 624622'],
        ['(An Autonomous Institution, Affiliated to Anna University, Chennai)'],
        ['Department of Electronics Engineering (VLSI Design and Technology)'],
        ['I YEAR II SEM RESULT ANALYSIS (2024–2028 BATCH)'],
        ['CGPA Calculation Upto II Semester'],
        [`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`],
        [], // Empty row for spacing
        ['Device: ' + (isMobile ? 'Mobile Optimized' : 'Desktop Optimized')],
        [], // Empty row before headers
        []  // Empty row for headers
      ];
      
      // Create student data rows with fresh data
      const studentRows = freshStudentData.map(student => {
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
      });
      
      // Create worksheet with heading and data
      const ws = XLSX.utils.aoa_to_sheet(headingData);
      
      // Add headers as a separate row
      const headerRow = Object.keys(headers);
      XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: -1 });
      
      // Add student data
      XLSX.utils.sheet_add_json(ws, studentRows, { origin: -1, skipHeader: true });
      
      // Set responsive column widths for better mobile and desktop viewing
      const baseColumnWidths = isMobile ? [
        { wch: 6 },  // S.No - smaller for mobile
        { wch: 8 },  // SECTION - smaller for mobile
        { wch: 12 }, // REG NO - adjusted for mobile
        { wch: 20 }, // NAME - adjusted for mobile
      ] : [
        { wch: 8 },  // S.No - desktop size
        { wch: 12 }, // SECTION - desktop size
        { wch: 15 }, // REG NO - desktop size
        { wch: 25 }, // NAME - desktop size
      ];
      
      // Add dynamic column widths for semesters (responsive)
      const semesterWidth = isMobile ? 12 : 15;
      const smallWidth = isMobile ? 8 : 10;
      
      for (let sem = 1; sem <= maxSemesters; sem++) {
        baseColumnWidths.push({ wch: semesterWidth }); // ARREAR COUNT
        baseColumnWidths.push({ wch: semesterWidth }); // TOTAL ARREAR
        baseColumnWidths.push({ wch: smallWidth });   // TOT
        baseColumnWidths.push({ wch: smallWidth });   // SGPA
      }
      
      // Add overall column widths
      baseColumnWidths.push({ wch: smallWidth });     // CGPA
      baseColumnWidths.push({ wch: smallWidth });     // TOT
      baseColumnWidths.push({ wch: semesterWidth }); // Total Arrear
      baseColumnWidths.push({ wch: semesterWidth }); // Signature
      
      ws['!cols'] = baseColumnWidths;

      // Create workbook with responsive sheet name
      const wb = XLSX.utils.book_new();
      const sheetName = isMobile ? 'Mobile_View_Records' : 'Student_Records';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate filename with device indicator and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const deviceTag = isMobile ? 'Mobile' : 'Desktop';
      const filename = `CGPA_Records_${deviceTag}_${timestamp}.xlsx`;
      
      // Enhanced mobile and desktop compatible download
      try {
        if (navigator.userAgent.match(/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
          // Mobile-optimized export with smaller file size
          const opts = { compression: true, type: 'binary' };
          XLSX.writeFile(wb, filename, opts);
        } else {
          // Desktop export with full features
          XLSX.writeFile(wb, filename);
        }
        
        toast({
          title: 'Excel Generated Successfully',
          description: `Excel file has been ${isMobile ? 'optimized for mobile view' : 'generated for desktop view'} and downloaded`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (downloadError) {
        // Fallback method for problematic mobile browsers
        console.warn('Standard download failed, trying fallback method:', downloadError);
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Excel Downloaded (Fallback)',
          description: 'File downloaded using alternative method for better compatibility',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export Excel file: ' + error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      // Show loading toast for mobile feedback
      toast({
        title: 'Preparing PDF',
        description: 'Fetching latest data and generating PDF...',
        status: 'info',
        duration: 1000,
        isClosable: true,
      });

      // Refresh data to ensure we have all records
      const freshStudents = await refreshDataForExport();
      if (freshStudents.length === 0) {
        toast({
          title: 'No Data',
          description: 'No student data available to export',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log(`Exporting ${freshStudents.length} student records to PDF...`);
      
      // Process fresh data for export
      const freshStudentData = getStudentSemesterData();

      // Create a temporary container with heading and dynamically generated table
      const tempContainer = document.createElement('div');
      
      // Responsive design for both laptop and mobile
      const isMobile = window.innerWidth <= 768;
      tempContainer.style.padding = isMobile ? '10px' : '20px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.width = '100%';
      tempContainer.style.overflow = 'hidden';
      tempContainer.style.fontSize = isMobile ? '12px' : '14px';
      
      // Add college heading with responsive sizing
      const heading = document.createElement('div');
      heading.innerHTML = `
        <div style="text-align: center; margin-bottom: ${isMobile ? '15px' : '20px'};">
          <h2 style="margin: ${isMobile ? '3px' : '5px'} 0; font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold; line-height: 1.2;">
            PSNA College of Engineering & Technology, Dindigul – 624622
          </h2>
          <p style="margin: ${isMobile ? '2px' : '3px'} 0; font-size: ${isMobile ? '11px' : '14px'}; font-style: italic; line-height: 1.1;">
            (An Autonomous Institution, Affiliated to Anna University, Chennai)
          </p>
          <p style="margin: ${isMobile ? '2px' : '3px'} 0; font-size: ${isMobile ? '11px' : '14px'}; line-height: 1.1;">
            Department of Electronics Engineering (VLSI Design and Technology)
          </p>
          <h3 style="margin: ${isMobile ? '5px' : '8px'} 0; font-size: ${isMobile ? '13px' : '15px'}; font-weight: bold; line-height: 1.2;">
            I YEAR II SEM RESULT ANALYSIS (2024–2028 BATCH)
          </h3>
          <p style="margin: ${isMobile ? '2px' : '3px'} 0; font-size: ${isMobile ? '11px' : '14px'}; font-weight: bold; line-height: 1.1;">
            CGPA Calculation Upto II Semester
          </p>
          <p style="margin: ${isMobile ? '8px' : '10px'} 0 0 0; font-size: ${isMobile ? '10px' : '12px'}; color: #666;">
            Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      `;
      tempContainer.appendChild(heading);
      
      // Generate complete table dynamically with all data
      const tableHtml = `
        <table style="width: 100%; font-size: 12px; border-collapse: collapse; border: 2px solid #2D3748;">
          <thead style="position: static; background-color: white; border: 2px solid #2D3748;">
            <tr style="border: 2px solid #2D3748;">
              <th rowspan="2" style="border: 2px solid #2D3748; background-color: #EDF2F7; font-weight: bold; text-align: center; padding: 8px; width: 50px;">S.No</th>
              <th rowspan="2" style="border: 2px solid #2D3748; background-color: #EDF2F7; font-weight: bold; text-align: center; padding: 8px; width: 80px;">SECTION</th>
              <th rowspan="2" style="border: 2px solid #2D3748; background-color: #EDF2F7; font-weight: bold; text-align: center; padding: 8px; width: 100px;">REG NO</th>
              <th rowspan="2" style="border: 2px solid #2D3748; background-color: #EDF2F7; font-weight: bold; text-align: center; padding: 8px; width: 150px;">NAME</th>
              ${Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => 
                `<th colspan="4" style="border: 2px solid #2D3748; background-color: ${semNum % 2 === 0 ? '#f0fff4' : '#ebf8ff'}; font-weight: bold; text-align: center; padding: 4px;">SEM ${semNum}</th>`
              ).join('')}
              <th colspan="3" style="border: 2px solid #2D3748; background-color: '#faf5ff'; font-weight: bold; text-align: center; padding: 4px;">Overall</th>
              <th rowspan="2" style="border: 2px solid #2D3748; background-color: #EDF2F7; font-weight: bold; text-align: center; padding: 8px; width: 100px;">Signature</th>
            </tr>
            <tr style="border: 2px solid #2D3748;">
              ${Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => 
                `<th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 80px;">ARREAR COUNT</th>
                <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 80px;">TOTAL ARREAR</th>
                <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 60px;">TOT</th>
                <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 60px;">SGPA</th>`
              ).join('')}
              <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 60px;">CGPA</th>
              <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 60px;">TOT</th>
              <th style="border: 2px solid #2D3748; background-color: #F7FAFC; font-weight: bold; text-align: center; padding: 4px; width: 80px;">Total Arrear</th>
            </tr>
          </thead>
          <tbody style="border: 2px solid #2D3748;">
            ${freshStudentData.map(student => `
              <tr style="border: 2px solid #2D3748;">
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.sno}</td>
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.section}</td>
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.registerNo}</td>
                <td style="border: 1px solid #CBD5E0; padding: 4px; font-size: 10px;">${student.name}</td>
                ${Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => {
                  const semData = student[`sem${semNum}`] || { arrearsCount: 0, arrearsTotal: 0, total: 0, sgpa: 0 };
                  return `
                    <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${semData.arrearsCount}</td>
                    <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${semData.arrearsTotal}</td>
                    <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${semData.total}</td>
                    <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${semData.sgpa.toFixed(2)}</td>
                  `;
                }).join('')}
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.overall.cgpa.toFixed(2)}</td>
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.overall.total}</td>
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;">${student.overall.totalArrears}</td>
                <td style="border: 1px solid #CBD5E0; text-align: center; padding: 4px; font-size: 10px;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      tempContainer.innerHTML += tableHtml;
      
      // Temporarily add to body for rendering
      document.body.appendChild(tempContainer);

      // Mobile-optimized canvas settings
      const canvas = await html2canvas(tempContainer, {
        scale: 1.5, // Reduced scale for mobile performance
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        logging: false, // Disable logging for mobile performance
        removeContainer: true // Clean up automatically
      });
      
      // Remove temporary container
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }

      const imgData = canvas.toDataURL('image/png', 0.8); // Reduced quality for mobile
      
      // Create PDF with mobile-friendly settings
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true // Compress for mobile
      });
      
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

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `CGPA_Student_Records_${timestamp}.pdf`;
      
      // Mobile-compatible PDF download
      if (navigator.userAgent.match(/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
        // For mobile devices, use blob URL
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        // Desktop download
        pdf.save(filename);
      }
      
      toast({
        title: 'Success',
        description: 'PDF file downloaded successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export PDF file: ' + error.message,
        status: 'error',
        duration: 5000,
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
      <VStack spacing={6} p={containerPadding} align="stretch" minH="100vh">
      <HStack 
        justify="space-between" 
        w="100%" 
        direction={{ base: "column", sm: "row" }}
        spacing={{ base: 4, sm: 0 }}
        align={{ base: "flex-start", sm: "center" }}
      >
        <VStack align="start" spacing={2} flex={1}>
          <Heading size={headingSize} color="blue.600" textAlign={{ base: "left", sm: "left" }}>
            Admin Dashboard
          </Heading>
          <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" textAlign={{ base: "left", sm: "left" }}>
            CGPA Student Records Management System
          </Text>
        </VStack>
        <Button 
          onClick={handleLogout}
          colorScheme="red" 
          variant="solid"
          size={buttonSize}
          width={{ base: "full", sm: "auto" }}
          alignSelf={{ base: "stretch", sm: "auto" }}
        >
          Logout
        </Button>
      </HStack>

      {/* Statistics Cards */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ 
          base: "1fr", 
          sm: "repeat(2, 1fr)", 
          lg: "repeat(3, 1fr)" 
        }} 
        gap={{ base: 3, md: 4, lg: 6 }} 
        mb={6}
      >
        <Box 
          p={{ base: 3, md: 4, lg: 5 }} 
          borderRadius="8px" 
          bg="white" 
          boxShadow="0 2px 4px rgba(0,0,0,0.1)"
          transition="all 0.3s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }}
        >
          <Text fontSize={{ base: "lg", md: "xl", lg: "2xl" }} fontWeight="bold" color="blue.600">
            {stats.totalStudents}
          </Text>
          <Text fontSize={{ base: "xs", md: "sm", lg: "md" }} color="gray.600">Total Students</Text>
        </Box>
        
        <Box 
          p={{ base: 3, md: 4, lg: 5 }} 
          borderRadius="8px" 
          bg="white" 
          boxShadow="0 2px 4px rgba(0,0,0,0.1)"
          transition="all 0.3s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }}
        >
          <Text fontSize={{ base: "lg", md: "xl", lg: "2xl" }} fontWeight="bold" color="green.600">
            {stats.arrearHavingStudents}
          </Text>
          <Text fontSize={{ base: "xs", md: "sm", lg: "md" }} color="gray.600">Arrear Having Students</Text>
        </Box>
        
        <Box 
          p={{ base: 3, md: 4, lg: 5 }} 
          borderRadius="8px" 
          bg="white" 
          boxShadow="0 2px 4px rgba(0,0,0,0.1)"
          transition="all 0.3s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }}
        >
          <Text fontSize={{ base: "lg", md: "xl", lg: "2xl" }} fontWeight="bold" color="orange.600">
            {stats.averageCGPA.toFixed(2)}
          </Text>
          <Text fontSize={{ base: "xs", md: "sm", lg: "md" }} color="gray.600">Average CGPA</Text>
        </Box>
      </Box>

      {/* Students Table */}
      <Box 
        bg="white" 
        borderRadius="8px" 
        p={{ base: 2, sm: 3, md: 4, lg: 5 }} 
        boxShadow="0 2px 4px rgba(0,0,0,0.1)"
        overflow="hidden"
      >
        <Heading size={{ base: "sm", md: "md", lg: "lg" }} mb={{ base: 3, md: 4 }} color="gray.800">
          Student Academic Records (Semester-wise)
        </Heading>
        
        {studentData.length === 0 ? (
          <Text textAlign="center" color="gray.500" py={{ base: 6, md: 8 }}>
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
                width: { base: '12px', md: '16px' },
                height: { base: '12px', md: '16px' },
              },
              '&::-webkit-scrollbar-track': {
                background: '#E2E8F0',
                borderRadius: { base: '6px', md: '8px' },
                border: '2px solid #CBD5E0',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'linear-gradient(180deg, #4A5568 0%, #2D3748 100%)',
                borderRadius: { base: '6px', md: '8px' },
                border: '2px solid #CBD5E0',
                minHeight: { base: '30px', md: '40px' },
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
            <Table 
              id="student-table" 
              variant="simple" 
              size={{ base: "xs", sm: "sm", md: "sm", lg: "md" }} 
              width="100%" 
              minWidth={{ base: "1200px", md: "1400px", lg: "1600px" }} 
              fontSize={{ base: "10px", sm: "11px", md: "xs", lg: "sm" }} 
              style={{ 
                tableLayout: 'auto',
                border: '2px solid #2D3748',
                borderCollapse: 'separate',
                borderSpacing: '0'
              }}
            >
              <Thead position="sticky" top={0} zIndex={1} bgColor="white" style={{ border: '2px solid #2D3748' }}>
                <Tr style={{ border: '2px solid #2D3748' }}>
                  <Th rowSpan={2} textAlign="center" p={{ base: 1, md: 2 }} fontSize={{ base: "8px", md: "xs" }} width="50px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>S.No</Th>
                  <Th rowSpan={2} textAlign="center" p={{ base: 1, md: 2 }} fontSize={{ base: "8px", md: "xs" }} width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>SECTION</Th>
                  <Th 
                    rowSpan={2} 
                    textAlign="center" 
                    p={{ base: 1, md: 2 }} 
                    fontSize={{ base: "8px", md: "xs" }} 
                    width="100px" 
                    style={{ 
                      border: '2px solid #2D3748',
                      backgroundColor: sortBy === 'registerNo' ? '#E2E8F0' : '#EDF2F7',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => handleSort('registerNo')}
                    onMouseEnter={(e) => {
                      if (sortBy !== 'registerNo') {
                        e.target.style.backgroundColor = '#E2E8F0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortBy !== 'registerNo') {
                        e.target.style.backgroundColor = '#EDF2F7';
                      }
                    }}
                  >
                    REG NO 
                    {sortBy === 'registerNo' && (
                      <span style={{ marginLeft: '5px' }}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Th>
                  <Th rowSpan={2} textAlign="center" p={{ base: 1, md: 2 }} fontSize={{ base: "8px", md: "xs" }} width="150px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>NAME</Th>
                  {/* Dynamic semester columns */}
                  {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => (
                    <Th key={semNum} colSpan={4} textAlign="center" bgColor={semNum % 2 === 0 ? "green.50" : "blue.50"} p={1} fontSize={{ base: "8px", md: "xs" }} style={{ 
                      border: '2px solid #2D3748',
                      fontWeight: 'bold'
                    }}>
                      SEM {semNum}
                    </Th>
                  ))}
                  <Th colSpan={3} textAlign="center" bgColor="purple.50" p={1} fontSize={{ base: "8px", md: "xs" }} style={{ 
                    border: '2px solid #2D3748',
                    fontWeight: 'bold'
                  }}>Overall</Th>
                  <Th rowSpan={2} textAlign="center" p={{ base: 1, md: 2 }} fontSize={{ base: "8px", md: "xs" }} width="100px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>Signature</Th>
                  <Th rowSpan={2} textAlign="center" p={{ base: 1, md: 2 }} fontSize={{ base: "8px", md: "xs" }} width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#EDF2F7',
                    fontWeight: 'bold'
                  }}>Actions</Th>
                </Tr>
                <Tr style={{ border: '2px solid #2D3748' }}>
                  {/* Dynamic semester sub-columns */}
                  {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => (
                    <React.Fragment key={`sub-${semNum}`}>
                      <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="80px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>ARREAR COUNT</Th>
                      <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="80px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>TOTAL ARREAR</Th>
                      <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="60px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>TOT</Th>
                      <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="60px" style={{ 
                        border: '2px solid #2D3748',
                        backgroundColor: '#F7FAFC',
                        fontWeight: 'bold'
                      }}>SGPA</Th>
                    </React.Fragment>
                  ))}
                  {/* Overall sub-columns */}
                  <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="60px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>CGPA</Th>
                  <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="60px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>TOT</Th>
                  <Th textAlign="center" fontSize={{ base: "7px", md: "10px" }} p={1} width="80px" style={{ 
                    border: '2px solid #2D3748',
                    backgroundColor: '#F7FAFC',
                    fontWeight: 'bold'
                  }}>Total Arrear</Th>
                </Tr>
              </Thead>
              <Tbody style={{ border: '2px solid #2D3748' }}>
                {studentData.map((student) => (
                  <Tr key={student.registerNo} style={{ border: '2px solid #2D3748' }}>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.sno}</Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.section}</Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.registerNo}</Td>
                    <Td p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.name}</Td>
                    {/* Dynamic semester data */}
                    {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(semNum => {
                      const semData = student[`sem${semNum}`] || { arrearsCount: 0, arrearsTotal: 0, total: 0, sgpa: 0 };
                      return (
                        <React.Fragment key={`data-${semNum}`}>
                          <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{semData.arrearsCount}</Td>
                          <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{semData.arrearsTotal}</Td>
                          <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{semData.total}</Td>
                          <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{semData.sgpa.toFixed(2)}</Td>
                        </React.Fragment>
                      );
                    })}
                    {/* Overall Data */}
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.overall.cgpa.toFixed(2)}</Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.overall.total}</Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>{student.overall.totalArrears}</Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}></Td>
                    <Td textAlign="center" p={{ base: 0.5, md: 1 }} fontSize={{ base: "8px", md: "xs" }} style={{ border: '1px solid #CBD5E0' }}>
                      <Button 
                        size={{ base: "xs", md: "xs" }} 
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

        <HStack spacing={{ base: 2, md: 4 }} mt={4} direction={{ base: "column", md: "row" }}>
        
        <Button 
          onClick={exportToExcel}
          colorScheme="blue" 
          variant="solid"
          size={{ base: "sm", md: "md" }}
          width={{ base: "full", md: "auto" }}
        >
          Excel
        </Button>
        
        <Button 
          onClick={exportToPDF}
          colorScheme="blue" 
          variant="solid"  
          size={{ base: "sm", md: "md" }}
          width={{ base: "full", md: "auto" }}
        >
          PDF
        </Button>
      </HStack>
      </VStack>
    </Box>
  );
}
export default AdminDashboard;
