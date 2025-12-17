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
      const apiEndpoint = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`CGPA_Results_${userData.registerNo}.pdf`);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Results exported to PDF successfully!',
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
