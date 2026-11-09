const bcrypt = require('bcrypt');

async function testPassword() {
  const password = 'Yoh@nnes1234';
  const hashedPassword = '$2b$10$YourActualHashHere'; // Replace with actual hash from database
  
  console.log('Testing password:', password);
  console.log('Hashed password:', hashedPassword);
  
  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log('Password comparison result:', isValid);
  
  // Test creating a new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash for same password:', newHash);
  
  const isValidNew = await bcrypt.compare(password, newHash);
  console.log('New hash comparison result:', isValidNew);
}

testPassword().catch(console.error); 