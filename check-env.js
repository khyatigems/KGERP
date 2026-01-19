const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('Checking environment variables...');

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
    console.log('.env.local DATABASE_URL:', envLocal.DATABASE_URL?.substring(0, 20) + '...');
} else {
    console.log('.env.local not found');
}

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const env = dotenv.parse(fs.readFileSync(envPath));
    console.log('.env DATABASE_URL:', env.DATABASE_URL?.substring(0, 20) + '...');
} else {
    console.log('.env not found');
}

console.log('Process env DATABASE_URL:', process.env.DATABASE_URL);
