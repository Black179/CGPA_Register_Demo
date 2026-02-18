import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Select, Table, Thead, Tbody, Tr, Th, Td,
  VStack, Heading, useToast, HStack, Text, Badge
} from '@chakra-ui/react';
import { SEMESTER_SUBJECTS, GRADES } from '../constants/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const SemesterGrades = () => {
  const [currentSemester, setCurrentSemester] = useState(1);
  const [grades, setGrades] = useState({});
  const [userData, setUserData] = useState(null);
  const [lockedSemesters, setLockedSemesters] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (!savedData) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(savedData));
    fetchLockedSemesters();
  }, [navigate]);

  const fetchLockedSemesters = async () => {
    try {
      const apiEndpoint = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/settings`
        : '/api/settings';
      const response = await fetch(apiEndpoint);
      if (response.ok) {
        const data = await response.json();
        setLockedSemesters(data.lockedSemesters || []);
      }
    } catch (error) {
      console.error('Error fetching locked semesters:', error);
    }
  };

  const calculateSemesterProgress = (semester) => {
    const semSubjects = SEMESTER_SUBJECTS[semester] || [];
    const totalSubjects = semSubjects.length;
    const completedSubjects = semSubjects.filter(subj => grades[`${semester}-${subj.code}`]).length;
    return (completedSubjects / totalSubjects) * 100;
  };

  const handleGradeChange = (semester, subjectCode, grade) => {
    setGrades(prev => ({
      ...prev,
      [`${semester}-${subjectCode}`]: grade
    }));
  };

  const downloadPDF = async () => {
    try {
      // Check if current semester grades are complete
      const semSubjects = SEMESTER_SUBJECTS[currentSemester] || [];
      const isCurrentSemComplete = semSubjects.every(subj => grades[`${currentSemester}-${subj.code}`]);

      if (!isCurrentSemComplete) {
        toast({
          title: 'Incomplete Grades',
          description: `Please complete all grades for Semester ${currentSemester} before downloading PDF`,
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Create a temporary table element for PDF
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.backgroundColor = 'white';

      // Add header
      const header = document.createElement('h2');
      header.textContent = `Grade Report - Semester ${currentSemester}`;
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      element.appendChild(header);

      // Add student info
      const studentInfo = document.createElement('div');
      studentInfo.innerHTML = `
        <p><strong>Name:</strong> ${userData?.name || 'N/A'}</p>
        <p><strong>Register No:</strong> ${userData?.registerNo || 'N/A'}</p>
        <p><strong>Section:</strong> ${userData?.section || 'N/A'}</p>
        <p><strong>Semester:</strong> ${currentSemester}</p>
        <hr style="margin: 20px 0;">
      `;
      element.appendChild(studentInfo);

      // Create table
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginBottom = '20px';

      // Add table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['Subject Code', 'Subject Name', 'Credits', 'Grade'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #ddd';
        th.style.padding = '8px';
        th.style.backgroundColor = '#f2f2f2';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Add table body
      const tbody = document.createElement('tbody');
      semSubjects.forEach(subject => {
        const grade = grades[`${currentSemester}-${subject.code}`] || 'N/A';
        const row = document.createElement('tr');

        const cells = [subject.code, subject.name, subject.credits, grade];
        cells.forEach(text => {
          const td = document.createElement('td');
          td.textContent = text;
          td.style.border = '1px solid #ddd';
          td.style.padding = '8px';
          td.style.textAlign = 'center';
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      element.appendChild(table);

      // Calculate and add SGPA
      const subjects = semSubjects.map(subj => {
        const grade = grades[`${currentSemester}-${subj.code}`] || 'U';
        const gradeObj = GRADES.find(g => g.value === grade) || GRADES[GRADES.length - 1];
        return {
          credits: subj.credits,
          gradePoint: gradeObj.points
        };
      });

      const totalCredits = subjects.reduce((sum, subj) => sum + subj.credits, 0);
      const totalPoints = subjects.reduce((sum, subj) => sum + (subj.credits * subj.gradePoint), 0);
      const sgpa = parseFloat((totalPoints / totalCredits).toFixed(2));

      const sgpaInfo = document.createElement('div');
      sgpaInfo.innerHTML = `
        <p><strong>SGPA for Semester ${currentSemester}:</strong> ${sgpa}</p>
        <p><strong>Total Credits:</strong> ${totalCredits}</p>
        <p style="margin-top: 30px; text-align: center; font-style: italic;">Generated on ${new Date().toLocaleDateString()}</p>
      `;
      element.appendChild(sgpaInfo);

      // Temporarily add to body
      document.body.appendChild(element);

      // Generate PDF
      const canvas = await html2canvas(element);
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

      pdf.save(`Semester_${currentSemester}_Grades.pdf`);

      // Remove temporary element
      document.body.removeChild(element);

      toast({
        title: 'PDF Downloaded',
        description: `Semester ${currentSemester} grades PDF downloaded successfully!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async () => {
    const allGradesSelected = Array.from({ length: userData.totalSemesters }, (_, i) => i + 1)
      .every(sem => {
        const semSubjects = SEMESTER_SUBJECTS[sem] || [];
        return semSubjects.every(subj => grades[`${sem}-${subj.code}`]);
      });

    if (!allGradesSelected) {
      toast({
        title: 'Incomplete Grades',
        description: 'Please select grades for all subjects in all semesters',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const semestersData = Array.from({ length: userData.totalSemesters }, (_, i) => {
      const sem = i + 1;
      const semSubjects = SEMESTER_SUBJECTS[sem] || [];

      const subjects = semSubjects.map(subj => {
        const grade = grades[`${sem}-${subj.code}`] || 'U';
        const gradeObj = GRADES.find(g => g.value === grade) || GRADES[GRADES.length - 1];

        return {
          code: subj.code,
          name: subj.name,
          credits: subj.credits,
          grade: grade,
          gradePoint: gradeObj.points
        };
      });

      const totalCredits = subjects.reduce((sum, subj) => sum + subj.credits, 0);
      const totalPoints = subjects.reduce((sum, subj) => sum + (subj.credits * subj.gradePoint), 0);
      const sgpa = parseFloat((totalPoints / totalCredits).toFixed(2));

      return {
        semesterNo: sem,
        subjects,
        sgpa
      };
    });

    const completeData = {
      ...userData,
      semesters: semestersData
    };

    try {
      // Save to backend database
      // Use empty string as fallback for relative path (ngrok/production)
      const apiEndpoint = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(`${apiEndpoint}/api/user`, completeData);

      if (response.status === 201 || response.status === 200) {
        // Also save to localStorage for offline access
        localStorage.setItem('userData', JSON.stringify(completeData));

        toast({
          title: 'Data Saved Successfully',
          description: 'Your grades have been saved to the database!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        navigate('/result');
      }
    } catch (error) {
      console.error('Error saving data to database:', error);

      // Fallback to localStorage if backend fails
      localStorage.setItem('userData', JSON.stringify(completeData));

      toast({
        title: 'Backend Error',
        description: 'Saved locally only. Database connection failed.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });

      navigate('/result');
    }
  };

  if (!userData) return null;

  return (
    <VStack spacing={4} align='stretch'>
      <Heading size='lg' textAlign='center'>
        Enter Grades for Semester {currentSemester}
        {lockedSemesters.includes(currentSemester) && (
          <Text fontSize="md" color="red.500" mt={2}>(Locked)</Text>
        )}
      </Heading>

      {/* Simple semester selection */}
      <HStack spacing={3} justify='center' wrap='wrap'>
        {Array.from({ length: userData.totalSemesters }, (_, i) => i + 1).map(sem => {
          const progress = calculateSemesterProgress(sem);
          const isCompleted = progress === 100;

          return (
            <VStack key={sem} spacing={1}>
              <Button
                colorScheme={currentSemester === sem ? 'blue' : lockedSemesters.includes(sem) ? 'red' : isCompleted ? 'green' : 'gray'}
                onClick={() => setCurrentSemester(sem)}
                leftIcon={lockedSemesters.includes(sem) ? <span style={{ fontSize: '12px' }}>🔒</span> : null}
              >
                Semester {sem}
                {isCompleted && !lockedSemesters.includes(sem) && ' ✓'}
                {lockedSemesters.includes(sem) && ' (Locked)'}
              </Button>
              <Text fontSize='xs' color='gray.600'>
                {Math.round(progress)}%
              </Text>
            </VStack>
          );
        })}
      </HStack>

      {/* Enhanced subject table with scroll bars */}
      <Box
        overflowX='auto'
        borderWidth='1px'
        borderRadius='md'
        borderColor='gray.200'
        boxShadow='sm'
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
        <Table variant='simple' size='sm'
          sx={{
            '@media (max-width: 768px)': {
              minWidth: '600px', // Ensure table maintains width for horizontal scroll
            }
          }}
        >
          <Thead position='sticky' top={0} zIndex={1} bgColor='white'>
            <Tr>
              <Th>Subject Code</Th>
              <Th>Subject Name</Th>
              <Th>Credits</Th>
              <Th>Grade</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(SEMESTER_SUBJECTS[currentSemester] || []).map(subject => {
              const grade = grades[`${currentSemester}-${subject.code}`];
              const isCompleted = !!grade;

              return (
                <Tr key={subject.code}>
                  <Td>{subject.code}</Td>
                  <Td>{subject.name}</Td>
                  <Td>{subject.credits}</Td>
                  <Td>
                    <Select
                      value={grade || ''}
                      onChange={(e) => handleGradeChange(currentSemester, subject.code, e.target.value)}
                      placeholder='Select grade'
                      size='sm'
                      isDisabled={lockedSemesters.includes(currentSemester)}
                    >
                      {GRADES.map(grade => (
                        <option key={grade.value} value={grade.value}>
                          {grade.label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    {isCompleted ? (
                      <Badge colorScheme='green'>Done</Badge>
                    ) : (
                      <Badge colorScheme='gray'>Pending</Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      <VStack
        spacing={4}
        mt={6}
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        justify={{ base: 'center', md: 'space-between' }}
        width={{ base: 'full', md: 'auto' }}
      >
        <Button
          onClick={() => navigate('/')}
          width={{ base: 'full', md: 'auto' }}
          size={{ base: 'md', md: 'md' }}
          py={{ base: 6, md: 4 }}
        >
          Back
        </Button>
        <Button
          colorScheme='blue'
          onClick={handleSubmit}
          isDisabled={
            !(SEMESTER_SUBJECTS[currentSemester] || []).every(
              subj => grades[`${currentSemester}-${subj.code}`]
            ) || lockedSemesters.includes(currentSemester)
          }
          width={{ base: 'full', md: 'auto' }}
          size={{ base: 'md', md: 'md' }}
          py={{ base: 6, md: 4 }}
        >
          Calculate Results
        </Button>
      </VStack>
    </VStack>
  );
};

export default SemesterGrades;
