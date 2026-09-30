import { useState } from 'react';

// REQ-5-3-3: the settings icon is a button named "Milestone"; selectable items
// have role option with the exact milestone name, plus "None" to clear it.
export default function MilestonePicker({
  current,
  milestones,
  canEdit,
  onSelect,
}: {
  current: string | null;
  milestones: string[];
  canEdit: boolean;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="milestone-picker">
      <span className="muted">{`Milestone: ${current || 'none'}`}</span>
      {canEdit && (
        <button type="button" aria-label="Milestone" onClick={() => setOpen((value) => !value)}>
          ⚙
        </button>
      )}
      {canEdit && open && (
        <div role="listbox" aria-label="Milestone" className="milestone-options">
          {milestones.map((milestone) => (
            <button
              key={milestone}
              type="button"
              role="option"
              aria-selected={current === milestone}
              onClick={() => {
                setOpen(false);
                onSelect(milestone);
              }}
            >
              {milestone}
            </button>
          ))}
          <button
            type="button"
            role="option"
            aria-selected={!current}
            onClick={() => {
              setOpen(false);
              onSelect('');
            }}
          >
            None
          </button>
        </div>
      )}
    </div>
  );
}
