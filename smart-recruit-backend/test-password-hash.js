const bcrypt = require('bcrypt');

async function testPasswordHash() {
  const password = 'Yohannes1234';
  const hash = '$2b$10$IHIQJ3rGX2J.YGZjxtbn5..uRt21gPeU/jCJUjil7x7xwSxxv1HVS';
  
  console.log('=== PASSWORD HASH TEST ===');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('Password length:', password.length);
  console.log('Hash length:', hash.length);
  
  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password comparison result:', isValid);
    
    if (isValid) {
      console.log('✅ Password is correct!');
    } else {
      console.log('❌ Password is incorrect!');
      
      // Test some variations
      const variations = [
        'Yoh@nnes1234',
        'yohannes1234',
        'Yohannes123',
        'Yohannes12345',
        'Yohannes1234 ',
        ' Yohannes1234'
      ];
      
      console.log('\n=== TESTING VARIATIONS ===');
      for (const variation of variations) {
        const result = await bcrypt.compare(variation, hash);
        console.log(`"${variation}" -> ${result}`);
      }
    }
  } catch (error) {
    console.error('Error testing password:', error);
  }
}

testPasswordHash().catch(console.error); 

const temporaryPassword = 'SR' + Math.random().toString(36).slice(-8); 