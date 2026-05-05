'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { getPool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'rtms_secret_key';
const PORT = process.env.PORT || 3001;


// =========================
// ROOT ROUTE
// =========================

app.get('/', (req, res) => {
  res.send('Backend RTMS Running ✅');
});


// =========================
// USERS (hardcoded for now — replace with DB later)
// =========================

const users = [
  { username: 'admin',  password: '1234', companies: ['ALL'] },
  { username: 'itdept', password: '1234', companies: ['ALL'] },
  { username: 'timo',   password: '0000', companies: ['PT Seven Offshore Indonesia'] },
];


// =========================
// COMPANIES (in-memory cache, refreshed from DB via /companies)
// =========================

let companies = [
  'PT Dutaraya Tataperkasa',
  'PT Seven Offshore Indonesia',
  'PT Sumatra Wahana Perkasa',
  'PT Tujuh Cahaya Abadi',
  'PT Lautan Energy',
];


// =========================
// GET COMPANIES (from database, fallback to cache)
// =========================

app.get('/companies', async (req, res) => {
  try {
    const pool = await getPool('dblist');
    const result = await pool.request().query(`SELECT company FROM dbo.koneksi`);
    const dbCompanies = result.recordset.map((row) => row.company);

    // Update in-memory cache so /login stays in sync
    if (dbCompanies.length > 0) {
      companies = dbCompanies;
    }

    res.json({ companies });
  } catch (err) {
    console.error('DB ERROR (GET /companies):', err.message);
    // Fallback to cached list
    res.json({ companies });
  }
});


// =========================
// LOGIN
// =========================

app.post('/login', (req, res) => {
  const { username, password, company } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'You must enter your Username and Password' });
  }

  if (!company) {
    return res.status(400).json({ message: 'Please select a company' });
  }

  if (!companies.includes(company)) {
    return res.status(400).json({ message: 'Invalid company selected' });
  }

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Failed to Login' });
  }

  const hasAccess =
    user.companies.includes('ALL') || user.companies.includes(company);

  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have access to this company' });
  }

  const token = jwt.sign(
    { username: user.username, company, companies: user.companies },
    SECRET,
    { expiresIn: '1h' }
  );

  res.json({ message: 'Successful Login', token });
});


// =========================
// GET PROFILE (token-protected)
// =========================

app.get('/profile', (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Token not found' });
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    const allowedCompanies = decoded.companies.includes('ALL')
      ? companies
      : companies.filter((c) => decoded.companies.includes(c));

    res.json({ username: decoded.username, companies: allowedCompanies });
  } catch {
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
});


// =========================
// GET USER-SPECIFIC COMPANIES
// =========================

app.get('/user-companies', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.json({ companies: [] });
  }

  const allowed = user.companies.includes('ALL')
    ? companies
    : companies.filter((c) => user.companies.includes(c));

  res.json({ companies: allowed });
});


// =========================
// TEST ROUTES
// =========================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// =========================
// START SERVER
// =========================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
