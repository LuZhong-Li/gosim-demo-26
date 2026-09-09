const express = require('express');
const fs = require('fs');
const path = require('path');

const store = require('./store');
const trains = require('./trains');

const app = express();
app.use(express.json());

// ---------- helpers ----------

function visibleLength(value) {
  return String(value || '').replace(/\s/g, '').length;
}

function isEmailValid(value) {
  const email = String(value || '').trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isUsernameValid(value) {
  return /^[A-Za-z0-9_-]{3,32}$/.test(String(value || '').trim());
}

function isPasswordValid(value) {
  const password = String(value || '');
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function isPassportValid(value) {
  return /^[A-Za-z0-9-]{6,30}$/.test(String(value || '').trim());
}

function isDateBeforeToday(value, future) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return false;
  return future ? date > today : date < today;
}

function validateRegistration(body) {
  const errors = [];
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');
  const name = String(body.name || '').trim();
  const passportNumber = String(body.passportNumber || '').trim();

  if (visibleLength(name) < 2 || visibleLength(name) > 100) {
    errors.push('Name must contain 2-100 non-whitespace characters.');
  }
  if (!isUsernameValid(username)) {
    errors.push(
      'Invalid username. Username must be 3-32 characters using letters, digits, hyphens, or underscores.',
    );
  }
  if (!isEmailValid(email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!isPasswordValid(password)) {
    errors.push(
      'Password must be 12-128 characters and include uppercase, lowercase, digit, and special character.',
    );
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }
  if (!isPassportValid(passportNumber)) {
    errors.push('Please provide a valid passport number (6-30 letters, digits, or hyphens).');
  }
  if (!isDateBeforeToday(body.passportExpirationDate, true)) {
    errors.push('Passport expiration date must be in the future.');
  }
  if (!isDateBeforeToday(body.dateOfBirth, false)) {
    errors.push('Date of birth must be in the past.');
  }
  if (!['Male', 'Female'].includes(String(body.gender || '').trim())) {
    errors.push('Please choose a gender.');
  }
  if (body.terms !== true) {
    errors.push('You must accept the Terms of Service and Privacy Policy.');
  }
  if (store.findUserByUsername(username)) {
    errors.push('That username already exists.');
  }
  if (store.findUserByEmail(email)) {
    errors.push('An account with that email already exists.');
  }
  return errors;
}

function validateBookingInput(body) {
  const errors = [];
  const name = String(body.name || '').trim();
  const idNumber = String(body.idNumber || '').trim();
  const nationality = String(body.nationality || '').trim();

  if (!name) {
    errors.push('Please enter the passenger name.');
  } else if (visibleLength(name) < 2 || visibleLength(name) > 100) {
    errors.push('Passenger name must be at least 2 characters.');
  }
  if (!idNumber) {
    errors.push('Please enter the ID number.');
  } else if (!/^[A-Za-z0-9-]{6,30}$/.test(idNumber)) {
    errors.push('ID number must be at least 6 characters using letters, digits, or hyphens.');
  }
  if (!nationality) {
    errors.push('Nationality is required.');
  } else if (visibleLength(nationality) < 2 || visibleLength(nationality) > 60) {
    errors.push('Nationality must contain 2-60 visible characters.');
  }
  if (body.terms !== true) {
    errors.push('You must accept the Terms of Service.');
  }
  return errors;
}

function publicUser(user) {
  return {
    username: user.username,
    email: user.email,
    name: user.name,
    nationality: user.nationality,
  };
}

function authToken(req) {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function requireUser(req, res, next) {
  const token = authToken(req);
  const user = store.userByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  req.user = user;
  return next();
}

// ---------- auth routes ----------

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'Backend Ready' });
});

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const errors = validateRegistration(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }
  const user = store.createUser({
    username: String(body.username).trim(),
    email: String(body.email).trim(),
    password: String(body.password),
    name: String(body.name).trim(),
    nationality: String(body.nationality).trim(),
    passportNumber: String(body.passportNumber).trim(),
    passportExpirationDate: body.passportExpirationDate,
    dateOfBirth: body.dateOfBirth,
    gender: String(body.gender).trim(),
  });
  const token = store.createSession(user.username);
  return res.status(201).json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const identifier = String((req.body || {}).identifier || '').trim();
  const password = String((req.body || {}).password || '');
  const user = store.findUserByIdentifier(identifier);
  const genericError = { error: 'Invalid credentials. Please try again.' };
  if (!user || user.password !== password) {
    return res.status(401).json(genericError);
  }
  const token = store.createSession(user.username);
  return res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/logout', (req, res) => {
  store.destroySession(authToken(req));
  res.json({ ok: true });
});

// ---------- train routes ----------

app.get('/api/trains', (req, res) => {
  const result = trains.search(req.query.from, req.query.to, req.query.date);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.json(result);
});

app.get('/api/trains/:number', (req, res) => {
  const train = trains.findByNumber(req.params.number);
  if (!train) {
    return res.status(404).json({ error: 'Train not found.' });
  }
  res.json({ train: { ...train }, date: trains.PUBLISHED_DATE });
});

// ---------- booking routes ----------

app.post('/api/bookings', requireUser, (req, res) => {
  const body = req.body || {};
  const errors = validateBookingInput(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }
  const train = trains.findByNumber(body.trainNumber);
  if (!train) {
    return res.status(400).json({ error: 'Train not found.' });
  }
  if (
    String(body.date || '').trim().toLowerCase() !== trains.PUBLISHED_DATE.toLowerCase()
  ) {
    return res.status(400).json({ error: 'Please select a published date.' });
  }

  const idNumber = String(body.idNumber).trim();
  const dedupeKey = `${train.number}-${idNumber}`;
  const existing = store.findBooking(req.user.username, dedupeKey);
  if (existing) {
    return res.status(201).json({ booking: existing });
  }

  const number = `TB-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 6)}`;
  const booking = store.addBooking({
    number,
    dedupeKey,
    username: req.user.username,
    trainNumber: train.number,
    date: trains.PUBLISHED_DATE,
    passenger: {
      name: String(body.name).trim(),
      idNumber,
      nationality: String(body.nationality).trim(),
    },
    ticketClass: String(body.ticketClass || '').trim(),
    ticketType: String(body.ticketType || '').trim(),
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ booking });
});

app.get('/api/bookings/:number', requireUser, (req, res) => {
  const booking = store.findBooking(req.user.username, req.params.number);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  res.json({ booking });
});

// ---------- static frontend hosting ----------

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res
      .status(503)
      .type('html')
      .send('<!doctype html><html><body><h1>Frontend build missing</h1></body></html>');
  });
}

module.exports = app;
