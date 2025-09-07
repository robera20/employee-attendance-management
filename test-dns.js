const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

async function testDNS() {
  try {
    console.log('🔍 Testing DNS resolution for sql.freedb.tech...');
    const result = await dnsLookup('sql.freedb.tech');
    console.log('✅ DNS Resolution Result:');
    console.log('  Address:', result.address);
    console.log('  Family:', result.family);
    
    // Test if this matches the IP we're seeing in errors
    if (result.address === '130.162.54.212') {
      console.log('⚠️  This matches the IP in connection errors');
    } else {
      console.log('✅ This is different from the error IP');
    }
  } catch (error) {
    console.error('❌ DNS lookup failed:', error.message);
  }
}

testDNS();
