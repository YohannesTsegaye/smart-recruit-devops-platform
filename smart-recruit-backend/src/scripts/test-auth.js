// const axios = require('axios');
// require('dotenv').config();

// const API_URL = 'http://localhost:5000';

// async function testAuthentication() {
//   try {
//     // Test user registration
//     console.log('Testing user registration...');
//     const registerResponse = await axios.post(`${API_URL}/users/register`, {
//       email: 'test@example.com',
//       password: 'Test123!',
//       role: 'admin'
//     });
//     console.log('Registration successful:', registerResponse.data);

//     // Test user login
//     console.log('\nTesting user login...');
//     const loginResponse = await axios.post(`${API_URL}/users/login`, {
//       email: 'test@example.com',
//       password: 'Test123!'
//     });
//     console.log('Login successful:', loginResponse.data);

//     const token = loginResponse.data.access_token;

//     // Test protected route
//     console.log('\nTesting protected route...');
//     const profileResponse = await axios.get(`${API_URL}/users/profile`, {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     console.log('Profile access successful:', profileResponse.data);

//     // Test job post creation
//     console.log('\nTesting job post creation...');
//     const jobPostResponse = await axios.post(
//       `${API_URL}/job-posts`,
//       {
//         title: 'Test Job',
//         description: 'This is a test job posting',
//         company: 'Test Company',
//         location: 'Test Location',
//         jobType: 'Full-time',
//         department: 'Test Department',
//         experience: '5+ years',
//         salary: 100000,
//         deadline: '2024-12-31'
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       }
//     );
//     console.log('Job post creation successful:', jobPostResponse.data);

//     console.log('\nAll tests completed successfully!');
//   } catch (error) {
//     console.error('Test failed:', error.response ? error.response.data : error.message);
//   }
// }

// testAuthentication(); 