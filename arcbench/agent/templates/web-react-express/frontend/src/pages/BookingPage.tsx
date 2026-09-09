import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Booking, Train, User } from '../api';
import * as api from '../api';

type BookingState =
  | { kind: 'loading' }
  | { kind: 'signed-out'; train: Train }
  | { kind: 'form'; train: Train; date: string; user: User }
  | { kind: 'summary'; train: Train; date: string; user: User; draft: Booking }
  | { kind: 'done'; train: Train; booking: Booking }
  | { kind: 'error'; message: string };

const TICKET_CLASSES = ['standing ticket', 'Second Class', 'Business Class', 'First Class'];

export default function BookingPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const trainNumber = searchParams.get('train') || '';
  const dateParam = searchParams.get('date') || '';
  const bookingNumber = searchParams.get('booking') || '';
  const [state, setState] = useState<BookingState>({ kind: 'loading' });
  const [form, setForm] = useState({
    ticketClass: 'standing ticket',
    ticketType: 'Adult',
    name: '',
    idNumber: '',
    nationality: '',
    terms: false,
  });
  const [error, setError] = useState('');

  const loginUrl = useMemo(
    () =>
      `/login?next=${encodeURIComponent(
        `/booking?train=${encodeURIComponent(trainNumber)}&date=${encodeURIComponent(dateParam)}`,
      )}`,
    [trainNumber, dateParam],
  );

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!trainNumber) {
        setState({ kind: 'error', message: 'No train selected.' });
        return;
      }
      try {
        const { train, date: serverDate } = await api.getTrain(trainNumber);
        if (!active) return;

        if (bookingNumber) {
          try {
            const [{ booking }, user] = await Promise.all([
              api.getBooking(bookingNumber),
              api.me(),
            ]);
            if (active) {
              onAuth(user);
              setState({ kind: 'done', train, booking });
            }
          } catch {
            if (active) setState({ kind: 'signed-out', train });
          }
          return;
        }

        if (!api.tokenStore.get()) {
          setState({ kind: 'signed-out', train });
          return;
        }

        try {
          const user = await api.me();
          if (active) {
            onAuth(user);
            setState({
              kind: 'form',
              train,
              date: dateParam || serverDate,
              user,
            });
          }
        } catch {
          if (active) setState({ kind: 'signed-out', train });
        }
      } catch (caught) {
        if (active) {
          setState({ kind: 'error', message: api.errorMessage(caught) });
        }
      }
    }
    initialize();
    return () => {
      active = false;
    };
  }, [trainNumber, dateParam, bookingNumber, onAuth]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  }

  if (state.kind === 'loading') {
    return <p className="loading">Loading…</p>;
  }

  if (state.kind === 'error') {
    return (
      <section className="panel narrow">
        <h1>Booking</h1>
        <p className="error" role="alert">
          {state.message}
        </p>
      </section>
    );
  }

  if (state.kind === 'signed-out') {
    return (
      <section className="panel">
        <h1>Booking</h1>
        <TrainInformation train={state.train} date={dateParam} />
        <p className="notice">Please sign in to continue booking.</p>
        <Link to={loginUrl}>Login</Link>
      </section>
    );
  }

  if (state.kind === 'done') {
    return (
      <section className="panel narrow">
        <h1>Booking created</h1>
        <p className="success">Booking number: {state.booking.number}</p>
        <TrainInformation train={state.train} date={state.booking.date} />
        <BookingDetails booking={state.booking} />
      </section>
    );
  }

  const train = state.train;

  async function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind !== 'form') return;
    setError('');
    const draft: Booking = {
      number: '',
      trainNumber: train.number,
      date: state.date,
      passenger: {
        name: form.name.trim(),
        idNumber: form.idNumber.trim(),
        nationality: form.nationality.trim(),
      },
      ticketClass: form.ticketClass,
      ticketType: form.ticketType,
    };

    if (!draft.passenger.name) {
      setError('Please enter the passenger name.');
      return;
    }
    if (draft.passenger.name.replace(/\s/g, '').length < 2) {
      setError('Passenger name must be at least 2 characters.');
      return;
    }
    if (!draft.passenger.idNumber) {
      setError('Please enter the ID number.');
      return;
    }
    if (!/^[A-Za-z0-9-]{6,30}$/.test(draft.passenger.idNumber)) {
      setError('ID number must be at least 6 characters using letters, digits, or hyphens.');
      return;
    }
    if (!draft.passenger.nationality) {
      setError('Nationality is required.');
      return;
    }
    if (draft.passenger.nationality.replace(/\s/g, '').length < 2) {
      setError('Nationality must contain 2-60 visible characters.');
      return;
    }
    if (!form.terms) {
      setError('You must accept the Terms of Service.');
      return;
    }
    setState({
      kind: 'summary',
      train,
      date: state.date,
      user: state.user,
      draft,
    });
  }

  async function handleConfirm() {
    if (state.kind !== 'summary') return;
    setError('');
    try {
      const { booking } = await api.createBooking({
        trainNumber: state.draft.trainNumber,
        date: state.draft.date,
        name: state.draft.passenger.name,
        idNumber: state.draft.passenger.idNumber,
        nationality: state.draft.passenger.nationality,
        ticketClass: state.draft.ticketClass,
        ticketType: state.draft.ticketType,
        terms: true,
      });
      navigate(
        `/booking?train=${encodeURIComponent(booking.trainNumber)}&date=${encodeURIComponent(booking.date)}&booking=${encodeURIComponent(booking.number)}`,
      );
    } catch (caught) {
      setError(api.errorMessage(caught));
      setState({ kind: 'form', train, date: state.date, user: state.user });
    }
  }

  return (
    <section className="panel">
      <h1>Booking</h1>
      <TrainInformation train={train} date={state.date} />

      {state.kind === 'form' && (
        <>
          <h2>Passenger information</h2>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <form className="form-grid" onSubmit={handlePlaceOrder}>
            <div className="field">
              <label htmlFor="ticket-class">Ticket class</label>
              <select
                id="ticket-class"
                value={form.ticketClass}
                onChange={(event) => update('ticketClass', event.target.value)}
              >
                {TICKET_CLASSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ticket-type">Ticket type</label>
              <select
                id="ticket-type"
                value={form.ticketType}
                onChange={(event) => update('ticketType', event.target.value)}
              >
                <option value="Adult">Adult</option>
                <option value="Child">Child</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="passenger-name">Name</label>
              <input
                id="passenger-name"
                type="text"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="id-number">ID number</label>
              <input
                id="id-number"
                type="text"
                value={form.idNumber}
                onChange={(event) => update('idNumber', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nationality">Nationality</label>
              <input
                id="nationality"
                type="text"
                value={form.nationality}
                onChange={(event) => update('nationality', event.target.value)}
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(event) => update('terms', event.target.checked)}
              />
              I accept the Terms of Service
            </label>
            <button type="submit">Place order</button>
          </form>
        </>
      )}

      {state.kind === 'summary' && (
        <>
          <h2>Please confirm the following information</h2>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <BookingDetails booking={state.draft} />
          <button type="button" onClick={handleConfirm}>
            Confirm
          </button>
        </>
      )}
    </section>
  );
}

function TrainInformation({ train, date }: { train: Train; date: string }) {
  return (
    <div className="train-information">
      <h2>Train information</h2>
      <p>Train {train.number}</p>
      <p>
        {train.from} → {train.to}
      </p>
      <p>{date}</p>
      <p>
        Departure time: {train.departureTime} · Arrival time: {train.arrivalTime}
      </p>
    </div>
  );
}

function BookingDetails({ booking }: { booking: Booking }) {
  return (
    <dl className="details">
      <dt>Train</dt>
      <dd>{booking.trainNumber}</dd>
      <dt>Passenger name</dt>
      <dd>{booking.passenger.name}</dd>
      <dt>ID number</dt>
      <dd>{booking.passenger.idNumber}</dd>
      <dt>Nationality</dt>
      <dd>{booking.passenger.nationality}</dd>
      <dt>Ticket class</dt>
      <dd>{booking.ticketClass}</dd>
      <dt>Ticket type</dt>
      <dd>{booking.ticketType}</dd>
    </dl>
  );
}
