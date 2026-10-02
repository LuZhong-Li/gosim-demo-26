import { useState } from 'react';

// REQ-4-3-1 / REQ-4-3-2: the unique "Branch <name>" button opens a "Find branch"
// textbox whose options are the exact branch names, plus a create entry.
export default function BranchSelector({
  current,
  branches,
  canCreate,
  onSelect,
  onCreate,
}: {
  current: string;
  branches: string[];
  canCreate: boolean;
  onSelect: (branch: string) => void;
  onCreate: (branch: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const matches = branches.filter((branch) =>
    branch.toLowerCase().includes(trimmed.toLowerCase()),
  );
  // REQ-4-3-2: names containing ".." are invalid even though the characters are allowed.
  const valid = /^[A-Za-z0-9_.-]{1,200}$/.test(trimmed) && !trimmed.includes('..');
  const invalid = Boolean(trimmed) && !valid;
  const showCreate = Boolean(trimmed) && valid && !branches.includes(trimmed) && canCreate;
  const noMatch = Boolean(trimmed) && !invalid && matches.length === 0 && !showCreate;

  return (
    <div className="branch-selector">
      <button
        type="button"
        aria-label={`Branch ${current}`}
        onClick={() => {
          setOpen((value) => !value);
          setQuery('');
        }}
      >
        {`Branch ${current}`}
      </button>
      {open && (
        <div role="dialog" aria-label="Branch selector" className="branch-popover">
          <input
            aria-label="Find branch"
            type="text"
            value={query}
            placeholder="Find branch"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
          />
          {invalid && <p className="error">Invalid branch</p>}
          <div role="listbox" aria-label="Branches">
            {matches.map((branch) => (
              <button
                key={branch}
                type="button"
                role="option"
                aria-selected={branch === current}
                onClick={() => {
                  setOpen(false);
                  onSelect(branch);
                }}
              >
                {branch}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                role="option"
                onClick={() => {
                  setOpen(false);
                  onCreate(trimmed);
                }}
              >
                {`Create branch: ${trimmed}`}
              </button>
            )}
          </div>
          {noMatch && <p className="muted">No matching branch</p>}
        </div>
      )}
    </div>
  );
}
