function emptyState() {
  return { users: [], sessions: {}, bookings: [] };
}

// Single-process in-memory store. The platform keeps one server per run and
// page reloads reuse the same process, so disk persistence is unnecessary and
// only adds latency that can race the agent/test navigation.
const state = emptyState();

function randomToken() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function findUserByUsername(username) {
  return state.users.find(
    (user) => String(user.username).toLowerCase() === String(username).toLowerCase(),
  );
}

function findUserByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  return state.users.find((user) => String(user.email).toLowerCase() === normalized);
}

function findUserByIdentifier(identifier) {
  const trimmed = String(identifier).trim();
  return (
    findUserByUsername(trimmed) ||
    state.users.find(
      (user) => String(user.email).toLowerCase() === trimmed.toLowerCase(),
    )
  );
}

function createUser(fields) {
  const user = {
    id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ...fields,
    createdAt: new Date().toISOString(),
  };
  state.users.push(user);
  return user;
}

function createSession(username) {
  const token = randomToken();
  state.sessions[token] = username;
  return token;
}

function userByToken(token) {
  if (!token) return null;
  const username = state.sessions[String(token)];
  if (!username) return null;
  return findUserByUsername(username) || null;
}

function destroySession(token) {
  if (token) {
    delete state.sessions[String(token)];
  }
}

function findBooking(username, bookingNumber) {
  const target = String(bookingNumber || '').toLowerCase();
  return state.bookings.find(
    (booking) =>
      booking.username === username &&
      (String(booking.number).toLowerCase() === target ||
        String(booking.dedupeKey || '').toLowerCase() === target),
  );
}

function addBooking(booking) {
  state.bookings.push(booking);
  return booking;
}

module.exports = {
  addBooking,
  createSession,
  createUser,
  destroySession,
  findBooking,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  userByToken,
};
