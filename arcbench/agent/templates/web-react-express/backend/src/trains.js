const TRAINS = [
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

const PUBLISHED_DATE = 'Sun, May 31';

function normalizeCity(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findByNumber(number) {
  const target = String(number || '').trim().toLowerCase();
  return TRAINS.find((train) => train.number.toLowerCase() === target) || null;
}

function search(from, to, date) {
  const normalizedFrom = normalizeCity(from);
  const normalizedTo = normalizeCity(to);
  const normalizedDate = String(date || '').trim().toLowerCase();

  if (!normalizedFrom || !normalizedTo || !normalizedDate) {
    return { error: 'From, To, and Date are required.' };
  }
  if (normalizedFrom === normalizedTo) {
    return { error: 'From and To must be different cities.' };
  }
  if (normalizedDate !== PUBLISHED_DATE.toLowerCase()) {
    return { error: `Please select a published date (${PUBLISHED_DATE}).` };
  }

  const matches = TRAINS.filter(
    (train) =>
      normalizeCity(train.from) === normalizedFrom &&
      normalizeCity(train.to) === normalizedTo,
  );
  return {
    trains: matches.map((train) => ({ ...train })),
    from: String(from).trim(),
    to: String(to).trim(),
    date: PUBLISHED_DATE,
  };
}

module.exports = { PUBLISHED_DATE, findByNumber, search };
