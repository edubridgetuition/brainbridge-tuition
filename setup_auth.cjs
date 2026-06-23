const fs = require('fs');

// 1. Parse .env file
const envPath = '.env';
if (!fs.existsSync(envPath)) {
  console.error('.env file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim().replace(/\r/g, '');
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  }
});

const apiKey = env['VITE_FIREBASE_API_KEY'];
if (!apiKey) {
  console.error('VITE_FIREBASE_API_KEY is not defined in .env!');
  process.exit(1);
}

// 2. Helper to register a user via Firebase Auth REST API
async function registerUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Referer': 'http://localhost:5173/',
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true
    })
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`Successfully registered user: ${email}`);
    return data;
  } else {
    if (data.error && data.error.message === 'EMAIL_EXISTS') {
      console.log(`User already exists: ${email}`);
      return null;
    }
    console.error(`Failed to register user: ${email}`, data.error);
    throw new Error(data.error ? data.error.message : 'Unknown error');
  }
}

// 3. Execute registration
async function run() {
  console.log('Firebase Configuration loaded.');
  console.log('API Key:', apiKey);
  console.log('----------------------------------------');
  console.log('Starting authentication setup...');

  try {
    console.log('Registering SuperAdmin...');
    await registerUser('superadmin@edubridge.internal', 'Super123!');

    console.log('Registering Guest lookup account...');
    await registerUser('guest@edubridge.com', 'guestPassword123!');

    console.log('----------------------------------------');
    console.log('Auth accounts setup completed successfully!');
  } catch (err) {
    console.error('----------------------------------------');
    console.error('Setup failed:', err.message);
    console.error('\nNOTE: If you got an INVALID_ARGUMENT or API key not valid error, it means Firebase Authentication has not been enabled in your Firebase Console yet.');
    console.error('Please go to Firebase Console > Build > Authentication, click "Get Started", and enable the "Email/Password" sign-in provider, then run this script again.');
    process.exit(1);
  }
}

run();
