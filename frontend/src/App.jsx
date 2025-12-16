import { ChakraProvider, Box, Container, Heading, VStack, useColorModeValue, HStack, Button, useDisclosure } from '@chakra-ui/react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import React from 'react';
import PersonalDetails from './components/PersonalDetails';
import SemesterGrades from './components/SemesterGrades';
import ResultSummary from './components/ResultSummary';
import AdminDashboard from './components/AdminDashboard';

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

function App() {
  const bgGradient = useColorModeValue(
    'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
    'linear-gradient(135deg, #1a202c 0%, #2d3748 25%, #4a5568 50%, #718096 75%, #a0aec0 100%)'
  );
  const navigate = useNavigate();

  // Inject global styles for enhanced scroll bars
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleAdminLogin = () => {
    // Simple admin login - you can enhance this later
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
      navigate('/admin');
    } else if (password !== null) {
      alert('Invalid password!');
    }
  };

  return (
    <ChakraProvider>
      <Box 
        minH='100vh' 
        bgGradient={bgGradient} 
        py={8}
        position='relative'
      >
        {/* Admin Login Button - Upper Right Corner */}
        <Box position='absolute' top={4} right={4} zIndex={10}>
          <Button 
            colorScheme='red' 
            size='sm' 
            onClick={handleAdminLogin}
            variant='solid'
            boxShadow='md'
          >
            Admin Login
          </Button>
        </Box>
        <Container maxW='container.md' py={4}>
          <VStack spacing={6}>
            <Box
              bg='gray.50'
              borderRadius='12px'
              p={6}
              boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'
              minH='80vh'
              w='full'
            >
              <Heading 
                as='h1' 
                size='2xl' 
                mb={6} 
                textAlign='center'
                color='gray.800'
              >
                CGPA Calculator
              </Heading>
              <Routes>
                <Route path='/' element={<PersonalDetails />} />
                <Route path='/semester-grades' element={<SemesterGrades />} />
                <Route path='/result' element={<ResultSummary />} />
                <Route path='/admin' element={<AdminDashboard />} />
              </Routes>
            </Box>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
