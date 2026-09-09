import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Train } from '../api';
import * as api from '../api';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'results';
      from: string;
      to: string;
      date: string;
      trains: Train[];
    }
  | { kind: 'error'; message: string };

function TrainCard({ train, date }: { train: Train; date: string }) {
  const navigate = useNavigate();
  return (
    <article className="train-card">
      <div className="train-number">{train.number}</div>
      <div className="train-times">
        <span>{train.departureTime}</span> – <span>{train.arrivalTime}</span>
      </div>
      <button
        type="button"
        onClick={() =>
          navigate(
            `/booking?train=${encodeURIComponent(train.number)}&date=${encodeURIComponent(date)}`,
          )
        }
      >
        Book {train.number}
      </button>
    </article>
  );
}

export default function HomePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setState({ kind: 'loading' });
    try {
      const result = await api.searchTrains(from, to, date);
      setState({
        kind: 'results',
        from: result.from,
        to: result.to,
        date: result.date,
        trains: result.trains,
      });
    } catch (error) {
      setState({ kind: 'error', message: api.errorMessage(error) });
    }
  }

  return (
    <section className="panel">
      <h1>Find your train</h1>
      <form className="search-form" onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="from">From</label>
          <input
            id="from"
            type="text"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input
            id="to"
            type="text"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="text"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="Sun, May 31"
          />
        </div>
        <button type="submit" disabled={state.kind === 'loading'}>
          Search
        </button>
      </form>

      {state.kind === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      {state.kind === 'results' && (
        <div className="results">
          <p className="summary">
            From {state.from} to {state.to} on {state.date}
          </p>
          <p className="count">
            {state.trains.length} {state.trains.length === 1 ? 'result' : 'results'}
          </p>
          {state.trains.map((train) => (
            <TrainCard key={train.number} train={train} date={state.date} />
          ))}
        </div>
      )}
    </section>
  );
}
