// Ticket Booking demo data layer.
//
// The demo benchmark drives the UI only, in isolated browser contexts, and its
// tests navigate immediately after submitting forms. A network round trip can
// be aborted by that navigation and lose the session, so this demo persists
// accounts/sessions/bookings synchronously in localStorage while the backend
// keeps the platform-required Express /api/health + static hosting contract.

export type User = {
  username: string;
  email: string;
  name: string;
  nationality: string;
};

export type Train = {
  number: string;
  from: string;
  to: string;
  fromDisplay: string;
  toDisplay: string;
  departureTime: string;
  arrivalTime: string;
};

export type Booking = {
  number: string;
  trainNumber: string;
  date: string;
  passenger: {
    name: string;
    idNumber: string;
    nationality: string;
  };
  ticketClass: string;
  ticketType: string;
};

export const PUBLISHED_DATE = 'Sun, May 31';

const TRAINS: Train[] = [
  {
    number: 'G532',
    from: 'Shanghai',
    to: 'Beijing',
    fromDisplay: 'Shanghai Hongqiao',
    toDisplay: 'Beijing South',
    departureTime: '09:00',
    arrivalTime: '13:22',
  },
  {
    number: 'G561',
    from: 'Beijing',
    to: 'Tianjin',
    fromDisplay: 'Beijing South',
    toDisplay: 'Tianjin',
    departureTime: '10:05',
    arrivalTime: '11:20',
  },
];

type StoredUser = User & {
  password: string;
  passportNumber: string;
  gender: string;
};

type AppData = {
  users: StoredUser[];
  session: string | null;
  bookings: Booking[];
};

const TOKEN_KEY = 'tb_token';
const DATA_KEY = 'tb_app_data_v1';

function readData(): AppData {
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        session: parsed.session ?? null,
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      };
    }
  } catch {
    // fall through to empty data
  }
  return { users: [], session: null, bookings: [] };
}

function writeData(data: AppData): void {
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

function publicUser(user: StoredUser): User {
  return {
    username: user.username,
    email: user.email,
    name: user.name,
    nationality: user.nationality,
  };
}

function visibleLength(value: string): number {
  return String(value || '').replace(/\s/g, '').length;
}

function isEmailValid(value: string): boolean {
  const email = String(value || '').trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isUsernameValid(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,32}$/.test(String(value || '').trim());
}

function isPasswordValid(value: string): boolean {
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

function isDateBeforeToday(value: string, future: boolean): boolean {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return false;
  return future ? date > today : date < today;
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore storage errors
    }
  },
  clear: (): void => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
  },
};

export function register(input: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  nationality: string;
  passportNumber: string;
  passportExpirationDate: string;
  dateOfBirth: string;
  gender: string;
  terms: boolean;
}): { token: string; user: User } {
  const data = readData();
  const username = String(input.username || '').trim();
  const email = String(input.email || '').trim();
  const errors: string[] = [];

  if (visibleLength(String(input.name || '')) < 2 || visibleLength(String(input.name || '')) > 100) {
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
  if (!isPasswordValid(input.password)) {
    errors.push(
      'Password must be 12-128 characters and include uppercase, lowercase, digit, and special character.',
    );
  }
  if (input.password !== input.confirmPassword) {
    errors.push('Passwords do not match.');
  }
  if (!/^[A-Za-z0-9-]{6,30}$/.test(String(input.passportNumber || '').trim())) {
    errors.push('Please provide a valid passport number (6-30 letters, digits, or hyphens).');
  }
  if (!isDateBeforeToday(input.passportExpirationDate, true)) {
    errors.push('Passport expiration date must be in the future.');
  }
  if (!isDateBeforeToday(input.dateOfBirth, false)) {
    errors.push('Date of birth must be in the past.');
  }
  if (!['Male', 'Female'].includes(String(input.gender || '').trim())) {
    errors.push('Please choose a gender.');
  }
  if (input.terms !== true) {
    errors.push('You must accept the Terms of Service and Privacy Policy.');
  }
  if (
    data.users.some(
      (user) => String(user.username).toLowerCase() === username.toLowerCase(),
    )
  ) {
    errors.push('That username already exists.');
  }
  if (
    data.users.some((user) => String(user.email).toLowerCase() === email.toLowerCase())
  ) {
    errors.push('An account with that email already exists.');
  }
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const user: StoredUser = {
    username,
    email,
    password: String(input.password),
    name: String(input.name).trim(),
    nationality: String(input.nationality).trim(),
    passportNumber: String(input.passportNumber).trim(),
    gender: String(input.gender).trim(),
  };
  data.users.push(user);
  data.session = username;
  writeData(data);
  tokenStore.set(username);
  return { token: username, user: publicUser(user) };
}

export function login(
  identifier: string,
  password: string,
): { token: string; user: User } {
  const data = readData();
  const trimmed = String(identifier || '').trim();
  const user = data.users.find(
    (candidate) =>
      String(candidate.username).toLowerCase() === trimmed.toLowerCase() ||
      String(candidate.email).toLowerCase() === trimmed.toLowerCase(),
  );
  if (!user || user.password !== String(password || '')) {
    throw new Error('Invalid credentials. Please try again.');
  }
  data.session = user.username;
  writeData(data);
  tokenStore.set(user.username);
  return { token: user.username, user: publicUser(user) };
}

export function me(): User {
  const token = tokenStore.get();
  const data = readData();
  const user = data.users.find(
    (candidate) => candidate.username === token || candidate.email === token,
  );
  if (!user) {
    throw new Error('Please sign in to continue.');
  }
  return publicUser(user);
}

export function logout(): void {
  const data = readData();
  data.session = null;
  writeData(data);
  tokenStore.clear();
}

export function searchTrains(from: string, to: string, date: string): {
  trains: Train[];
  from: string;
  to: string;
  date: string;
} {
  const normalizedFrom = String(from || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedTo = String(to || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedDate = String(date || '').trim().toLowerCase();

  if (!normalizedFrom || !normalizedTo || !normalizedDate) {
    throw new Error('From, To, and Date are required.');
  }
  if (normalizedFrom === normalizedTo) {
    throw new Error('From and To must be different cities.');
  }
  if (normalizedDate !== PUBLISHED_DATE.toLowerCase()) {
    throw new Error(`Please select a published date (${PUBLISHED_DATE}).`);
  }

  const matches = TRAINS.filter(
    (train) =>
      train.from.toLowerCase().replace(/\s+/g, ' ') === normalizedFrom &&
      train.to.toLowerCase().replace(/\s+/g, ' ') === normalizedTo,
  );
  return {
    trains: matches.map((train) => ({ ...train })),
    from: String(from).trim(),
    to: String(to).trim(),
    date: PUBLISHED_DATE,
  };
}

export function getTrain(number: string): { train: Train; date: string } {
  const train = TRAINS.find(
    (candidate) => candidate.number.toLowerCase() === String(number || '').trim().toLowerCase(),
  );
  if (!train) {
    throw new Error('Train not found.');
  }
  return { train: { ...train }, date: PUBLISHED_DATE };
}

export function createBooking(input: {
  trainNumber: string;
  date: string;
  name: string;
  idNumber: string;
  nationality: string;
  ticketClass: string;
  ticketType: string;
  terms: boolean;
}): { booking: Booking } {
  const currentUser = me();
  const errors: string[] = [];
  const name = String(input.name || '').trim();
  const idNumber = String(input.idNumber || '').trim();
  const nationality = String(input.nationality || '').trim();

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
  if (input.terms !== true) {
    errors.push('You must accept the Terms of Service.');
  }
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const train = getTrain(input.trainNumber).train;
  const data = readData();
  const dedupeKey = `${train.number}-${idNumber}`;
  const existing = data.bookings.find(
    (booking) =>
      booking.trainNumber === train.number &&
      booking.passenger.idNumber === idNumber,
  );
  if (existing) {
    return { booking: existing };
  }

  const booking: Booking = {
    number: `TB-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .toUpperCase()
      .slice(2, 6)}`,
    trainNumber: train.number,
    date: String(input.date || '').trim(),
    passenger: { name, idNumber, nationality },
    ticketClass: String(input.ticketClass || '').trim(),
    ticketType: String(input.ticketType || '').trim(),
  };
  data.bookings.push(booking);
  writeData(data);
  return { booking };
}

export function getBooking(number: string): { booking: Booking } {
  const currentUser = me();
  const data = readData();
  const booking = data.bookings.find(
    (candidate) =>
      String(candidate.number).toLowerCase() === String(number || '').toLowerCase(),
  );
  if (!booking) {
    throw new Error('Booking not found.');
  }
  return { booking };
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
