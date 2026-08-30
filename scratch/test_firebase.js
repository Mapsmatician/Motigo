const https = require('https');

// Test Firestore REST API for project motigo-3505f
const url = 'https://firestore.googleapis.com/v1/projects/motigo-3505f/databases/(default)/documents/users';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Firestore Output:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw Output:', data);
    }
  });
}).on('error', (err) => {
  console.error('HTTPS Error:', err.message);
});
