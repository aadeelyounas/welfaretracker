// Test script to verify and fix authentication
const bcrypt = require('bcryptjs');

async function testAuth() {
  const plainPassword = 'password';
  const currentHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  console.log('🔐 Testing Authentication...');
  console.log('Password to test:', plainPassword);
  console.log('Current hash:', currentHash);
  
  // Test current hash
  const isValid = await bcrypt.compare(plainPassword, currentHash);
  console.log('Current hash valid:', isValid);
  
  if (!isValid) {
    console.log('\n❌ Hash mismatch! Generating new hash...');
    const newHash = await bcrypt.hash(plainPassword, 10);
    console.log('New hash for "password":', newHash);
    
    // Test new hash
    const newHashValid = await bcrypt.compare(plainPassword, newHash);
    console.log('New hash valid:', newHashValid);
  }
  
  console.log('\n📋 Login Credentials:');
  console.log('Username: admin');
  console.log('Password: password');
}

testAuth().catch(console.error);