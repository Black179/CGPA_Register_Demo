import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Button, HStack,
  useToast, Card, CardBody, Divider
} from '@chakra-ui/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ResultSummary = () => {
  const [userData, setUserData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (!savedData) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(savedData));
  }, [navigate]);

  const calculateCGPA = () => {
    if (!userData?.semesters?.length) return 0;

    let totalCredits = 0;
    let weightedSum = 0;

    userData.semesters.forEach(semester => {
      semester.subjects.forEach(subject => {
        totalCredits += subject.credits;
        weightedSum += (subject.gradePoint * subject.credits);
      });
    });

    return parseFloat((weightedSum / totalCredits).toFixed(2));
  };

  // Extract data from UI-rendered table only
  const extractTableData = () => {
    const tableData = [];
    userData.semesters.forEach(semester => {
      semester.subjects.forEach(subject => {
        tableData.push({
          'Subject Code': subject.code,
          'Subject Name': subject.name,
          'Credits': subject.credits,
          'Grade': subject.grade,
          'Points': subject.gradePoint,
          'Semester': semester.semesterNo,
          'SGPA': semester.sgpa
        });
      });
    });
    return tableData;
  };

  // Export to Excel using UI data only
  const exportToExcel = () => {
    try {
      const tableData = extractTableData();

      // Create worksheet with exact table structure
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CGPA Results');

      // Add student info as first rows
      const studentInfo = [
        ['Student Name', userData.name],
        ['Register Number', userData.registerNo],
        ['Section', userData.section],
        ['Overall CGPA', cgpa],
        []
      ];

      // Combine student info with table data
      const finalData = [...studentInfo, ...Object.values(tableData).map(Object.values)];
      XLSX.utils.sheet_add_aoa(ws, finalData);

      XLSX.writeFile(wb, `CGPA_Results_${userData.registerNo}.xlsx`);

      toast({
        title: 'Excel Downloaded',
        description: 'Results exported to Excel successfully!',
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

  // Export to PDF using DOM capture
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to backend database
      // Use empty string as fallback for relative path (ngrok/production)
      const apiEndpoint = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${apiEndpoint}/api/user`, userData);

      if (response.status === 201) {
        toast({
          title: 'Results Saved Successfully',
          description: 'Your results have been saved to the database!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving results to database:', error);

      toast({
        title: 'Database Error',
        description: 'Failed to save results to database. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportToPDF = async () => {
    try {
      const element = document.getElementById('result-table-container');
      if (!element) {
        toast({
          title: 'Error',
          description: 'Results table not found',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Create a temporary container with optimized styles for single page PDF
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        width: 210mm;
        padding: 10px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        line-height: 1.4;
        letter-spacing: 0.3px;
        page-break-inside: avoid;
        overflow: hidden;
        white-space: normal;
        word-break: break-word;
        transform: scale(0.9);
        transform-origin: top left;
      `;

      // Clone the content with optimized styles
      const clonedElement = element.cloneNode(true);

      // Apply system-safe fonts to all text elements
      const textElements = clonedElement.querySelectorAll('*');
      textElements.forEach(el => {
        if (el.style.fontFamily) {
          el.style.fontFamily = 'Arial, Helvetica, sans-serif';
        }
        if (el.style.lineHeight) {
          el.style.lineHeight = '1.4';
        }
        if (el.style.letterSpacing) {
          el.style.letterSpacing = '0.3px';
        }
        el.style.whiteSpace = 'normal';
        el.style.wordBreak = 'break-word';
      });

      // Apply compact styles to tables
      const tables = clonedElement.querySelectorAll('table');
      tables.forEach(table => {
        table.style.cssText = `
          width: 100%;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 1.4;
          letter-spacing: 0.3px;
          page-break-inside: avoid;
          margin: 0;
          border-collapse: collapse;
          table-layout: fixed;
          white-space: normal;
          word-break: break-word;
        `;
      });

      // Apply styles to table headers
      const headers = clonedElement.querySelectorAll('th');
      headers.forEach(header => {
        header.style.cssText = `
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          letter-spacing: 0.3px;
          padding: 8px 6px;
          vertical-align: middle;
          white-space: normal;
          word-break: break-word;
          text-align: center;
          font-weight: bold;
        `;
      });

      // Apply styles to table cells
      const cells = clonedElement.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.cssText = `
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 1.4;
          letter-spacing: 0.3px;
          padding: 6px 8px;
          vertical-align: middle;
          white-space: normal;
          word-break: break-word;
          page-break-inside: avoid;
          border: 1px solid #e2e8f0;
        `;
      });

      // Apply styles to headings
      const headings = clonedElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const fontSize = heading.tagName.toLowerCase() === 'h1' ? '14px' : '12px';
        heading.style.cssText = `
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${fontSize};
          line-height: 1.6;
          letter-spacing: 0.3px;
          margin: 10px 0 5px 0;
          white-space: normal;
          word-break: break-word;
        `;
      });

      // Apply mobile-specific styles - removed to ensure high quality PDF
      // We want the PDF to look crisp like desktop even on mobile

      // Remove unnecessary elements
      const buttons = clonedElement.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());

      // Remove excessive spacing
      const verticalStacks = clonedElement.querySelectorAll('.chakra-stack');
      verticalStacks.forEach(stack => {
        if (stack.style.marginTop && parseInt(stack.style.marginTop) > 10) {
          stack.style.marginTop = '5px';
        }
        if (stack.style.marginBottom && parseInt(stack.style.marginBottom) > 10) {
          stack.style.marginBottom = '5px';
        }
      });

      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      // Use fixed dimensions for high quality render
      const canvasWidth = 800;
      const canvasHeight = 1150;

      const canvas = await html2canvas(tempContainer, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        width: canvasWidth, // Force desktop width
        height: canvasHeight,
        windowWidth: 1200, // Simulate desktop view
        scrollX: 0,
        scrollY: 0,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Add image to PDF with minimal margins
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margins

      // Calculate image dimensions to fit A4
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

      // Clean up temporary elements
      document.body.removeChild(tempContainer);

      pdf.save(`CGPA_Results_${userData.registerNo}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: isMobile ? 'Mobile-optimized single-page PDF exported!' : 'Results exported to single-page PDF successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (!userData) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="100vh"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Text fontSize="lg" fontWeight="bold">Loading your results...</Text>
          <Text color="gray.600">Please wait while we fetch your data</Text>
        </VStack>
      </Box>
    );
  }

  const cgpa = calculateCGPA();

  return (
    <Box minH='100vh' bg='white' p={4}>
      <VStack spacing={6} align='stretch' maxW='1200px' mx='auto'>
        {/* PDF Content Container */}
        <Box id="result-table-container">
          {/* College Header */}
          <Card bg='white' boxShadow='md' border='1px solid' borderColor='gray.300'>
            <CardBody p={6}>
              <VStack spacing={2} align='center'>
                <Text fontSize='lg' fontWeight='bold' textAlign='center'>
                  PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL–624622
                </Text>
                <Text fontSize='sm' textAlign='center' color='gray.600'>
                  (An Autonomous Institution, Affiliated to Anna University, Chennai)
                </Text>
                <Text fontSize='sm' textAlign='center' color='gray.600'>
                  Department of Electronics Engineering (VLSI Design and Technology)
                </Text>
                <Divider my={2} />
                <Text fontSize='sm' textAlign='center' fontStyle='italic' color='gray.700'>
                  CGPA Calculated Based on Number of Semesters for Which Papers Were Taken
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Heading size='lg' textAlign='center'>Your Academic Summary</Heading>

          {/* Student Details Card with Download Button */}
          <Card bg='white' boxShadow='md'>
            <CardBody>
              <VStack align='stretch' spacing={4}>
                <Text fontSize='lg' fontWeight='bold'>Student Details</Text>
                <HStack spacing={8}>
                  <Box>
                    <Text><strong>Name:</strong> {userData.name}</Text>
                    <Text><strong>Register Number:</strong> {userData.registerNo}</Text>
                    <Text><strong>Section:</strong> {userData.section}</Text>
                  </Box>
                  <VStack spacing={2}>
                    <Stat>
                      <StatLabel>Your CGPA</StatLabel>
                      <StatNumber fontSize='3xl'>{cgpa}</StatNumber>
                      <StatHelpText>
                        <StatArrow type={cgpa >= 7.5 ? 'increase' : 'decrease'} />
                        {cgpa >= 7.5 ? 'Excellent!' : 'Keep improving!'}
                      </StatHelpText>
                    </Stat>
                    <Button
                      colorScheme='red'
                      onClick={exportToPDF}
                      size='sm'
                    >
                      Download PDF
                    </Button>
                  </VStack>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Semester-wise Performance with Fixed Height and Scroll */}
          <Card bg='white' boxShadow='md'>
            <CardBody p={0}>
              <Box p={4}>
                <Text fontSize='lg' fontWeight='bold'>Semester-wise Performance</Text>
              </Box>
              <Box
                maxH='60vh'
                overflowY='auto'
                sx={{
                  '@media (max-width: 768px)': {
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '60vh',
                    width: '100%'
                  },
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
                {userData.semesters.map(semester => (
                  <Box key={semester.semesterNo} borderBottom='1px solid #E2E8F0'>
                    <Box p={4} bg='gray.50' borderBottom='2px solid #CBD5E0'>
                      <Text fontWeight='bold' fontSize='md'>
                        Semester {semester.semesterNo} - SGPA: {semester.sgpa}
                      </Text>
                    </Box>
                    <Table variant='simple' size='sm'
                      sx={{
                        '@media (max-width: 768px)': {
                          minWidth: '700px', // Ensure table maintains width for horizontal scroll
                        }
                      }}
                    >
                      <Thead position='sticky' top={0} zIndex={1} bgColor='white' boxShadow='sm'>
                        <Tr>
                          <Th borderWidth='1px' borderColor='gray.300'>Code</Th>
                          <Th borderWidth='1px' borderColor='gray.300'>Subject</Th>
                          <Th isNumeric borderWidth='1px' borderColor='gray.300'>Credits</Th>
                          <Th borderWidth='1px' borderColor='gray.300'>Grade</Th>
                          <Th isNumeric borderWidth='1px' borderColor='gray.300'>Points</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {semester.subjects.map(subject => (
                          <Tr key={subject.code} _hover={{ bg: 'gray.50' }}>
                            <Td borderWidth='1px' borderColor='gray.200'>{subject.code}</Td>
                            <Td borderWidth='1px' borderColor='gray.200'>{subject.name}</Td>
                            <Td isNumeric borderWidth='1px' borderColor='gray.200'>{subject.credits}</Td>
                            <Td borderWidth='1px' borderColor='gray.200'>{subject.grade}</Td>
                            <Td isNumeric borderWidth='1px' borderColor='gray.200'>{subject.gradePoint}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                ))}
              </Box>
            </CardBody>
          </Card>
        </Box>

        {/* Action Buttons */}
        <VStack
          spacing={4}
          mt={6}
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'stretch', md: 'center' }}
          justify={{ base: 'center', md: 'space-between' }}
          width={{ base: 'full', md: 'auto' }}
        >
          <Button
            onClick={() => navigate('/semester-grades')}
            width={{ base: 'full', md: 'auto' }}
            size={{ base: 'md', md: 'md' }}
            py={{ base: 6, md: 4 }}
          >
            Back to Grades
          </Button>
          <Button
            colorScheme='blue'
            onClick={handleSave}
            isLoading={isSaving}
            loadingText='Saving...'
            width={{ base: 'full', md: 'auto' }}
            size={{ base: 'md', md: 'md' }}
            py={{ base: 6, md: 4 }}
          >
            Save Results
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default ResultSummary;
