import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, FormControl, FormLabel, Input, Select, VStack, useToast, Heading, Text, Box } from '@chakra-ui/react';

const PersonalDetails = () => {
  const [formData, setFormData] = useState({
    name: '',
    registerNo: '',
    section: '',
    totalSemesters: 1
  });
  const [lockedSemesters, setLockedSemesters] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchLockedSemesters();
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.registerNo || !formData.section) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    localStorage.setItem('userData', JSON.stringify(formData));
    navigate('/semester-grades');
  };

  return (
    <VStack spacing={6}>
      <Box textAlign='center' mb={4}>
        <Heading size='lg' mb={2} color='gray.800'>Welcome to CGPA Calculator</Heading>
        <Text color='gray.600'>Enter your academic information to get started</Text>
      </Box>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Full Name</FormLabel>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='Enter your full name'
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Register Number</FormLabel>
            <Input
              value={formData.registerNo}
              onChange={(e) => setFormData({ ...formData, registerNo: e.target.value.toUpperCase() })}
              placeholder='Enter register number'
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Section</FormLabel>
            <Select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder='Select section'
            >
              <option value='A'>Section A</option>
              <option value='B'>Section B</option>
              <option value='C'>Section C</option>
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Number of Semesters Completed</FormLabel>
            <Select
              value={formData.totalSemesters}
              onChange={(e) => setFormData({ ...formData, totalSemesters: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num} disabled={lockedSemesters.includes(num)}>
                  Semester {num} {lockedSemesters.includes(num) ? '(Locked)' : ''}
                </option>
              ))}
            </Select>
          </FormControl>

          <Button type='submit' colorScheme='blue' width='full' mt={4}>
            Continue to Grade Entry
          </Button>
        </VStack>
      </form>
    </VStack>
  );
};

export default PersonalDetails;
