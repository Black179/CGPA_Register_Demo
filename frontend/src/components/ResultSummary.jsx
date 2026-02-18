import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Button, HStack,
  useToast, Card, CardBody, Divider
} from '@chakra-ui/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ResultSummary = () => {

  const [userData, setUserData] = useState(null);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user data from local storage
  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      try {
        setUserData(JSON.parse(savedData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (userData && !hasAutoSaved) {
      handleSave(true); // true indicates auto-save
      setHasAutoSaved(true);
    }
  }, [userData, hasAutoSaved]);

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

  const cgpa = calculateCGPA();





  // Save to database
  const handleSave = async (isAuto = false) => {
    if (!userData) return;

    setIsSaving(true);
    try {
      const apiEndpoint = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${apiEndpoint}/api/user`, userData);

      if (response.status === 201 || response.status === 200) {
        if (!isAuto) {
          toast({
            title: 'Results Saved Successfully',
            description: 'Your results have been saved to the database!',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          console.log('Auto-saved user data to database');
        }
      }
    } catch (error) {
      console.error('Error saving results to database:', error);
      if (!isAuto) {
        toast({
          title: 'Database Error',
          description: 'Failed to save results to database. Please try again.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const exportToPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      if (!userData || !userData.semesters) return;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);

      // Function to create a printable element for a semester
      const createSemesterElement = (semester, isFirst) => {
        const container = document.createElement('div');
        container.style.cssText = `
          width: 210mm;
          padding: 20px; /* Increased padding */
          font-family: Arial, Helvetica, sans-serif;
          background: white;
          color: black;
        `;

        // College Header
        const headerHtml = `
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
            <h2 style="font-size: 16px; margin: 0; font-weight: bold;">PSNA COLLEGE OF ENGINEERING & TECHNOLOGY, DINDIGUL–624622</h2>
            <p style="font-size: 10px; margin: 5px 0; color: #555;">(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
            <p style="font-size: 10px; margin: 5px 0; color: #555;">Department of Electronics Engineering (VLSI Design and Technology)</p>
          </div>
        `;

        // Student Details
        const studentHtml = `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; margin-bottom: 10px; text-decoration: underline;">Student Details</h3>
            <table style="width: 100%; font-size: 11px;">
              <tr>
                <td><strong>Name:</strong> ${userData.name}</td>
                <td><strong>Register Number:</strong> ${userData.registerNo}</td>
              </tr>
              <tr>
                <td><strong>Section:</strong> ${userData.section}</td>
                <td><strong>Overall CGPA:</strong> ${cgpa}</td>
              </tr>
            </table>
          </div>
        `;

        // Semester Header
        const semesterHeader = `
           <div style="margin-bottom: 10px; background-color: #f0f0f0; padding: 5px; border-left: 4px solid #333;">
              <h3 style="margin: 0; font-size: 14px;">Semester ${semester.semesterNo}</h3>
              <p style="margin: 0; font-size: 11px;">SGPA: ${semester.sgpa}</p>
           </div>
        `;

        // Subjects Table
        let subjectsRows = '';
        semester.subjects.forEach(subject => {
          subjectsRows += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px; border: 1px solid #ddd;">${subject.code}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${subject.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subject.credits}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subject.grade}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subject.gradePoint}</td>
                </tr>
            `;
        });

        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Code</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Subject</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Credits</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Grade</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectsRows}
                </tbody>
            </table>
        `;

        container.innerHTML = headerHtml + studentHtml + semesterHeader + tableHtml;
        return container;
      };

      // Process each semester
      for (let i = 0; i < userData.semesters.length; i++) {
        const semester = userData.semesters[i];
        const element = createSemesterElement(semester);

        document.body.appendChild(element); // Append to DOM to capture

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 800 // Force reasonable width
        });

        document.body.removeChild(element); // Cleanup

        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }

      pdf.save(`Academic_Summary_${userData.registerNo}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Semester-wise detailed result summary downloaded.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGeneratingPdf(false);
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
                      isLoading={isGeneratingPdf}
                      loadingText="Generating..."
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
            onClick={() => handleSave(false)}
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
