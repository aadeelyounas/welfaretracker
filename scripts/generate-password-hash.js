// Generate bcrypt hash for the new password
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Ashridge@2025!';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('🔐 Password Hash Generated:');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n📋 User Credentials:');
  console.log('Username: ashridge');
  console.log('Password: Ashridge@2025!');
}

generateHash().catch(console.error);