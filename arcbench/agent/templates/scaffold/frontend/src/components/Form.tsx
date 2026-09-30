// Generic, task-agnostic form primitives.
//
// Generated pages MUST compose these instead of hand-writing <input>/<label>:
// every control then keeps the exact accessible name the requirement quotes
// (getByLabel / getByRole), and a failed validation renders exactly one inline
// error element with role="alert" instead of a per-field error plus a summary.
// These primitives contain no task-specific UI - they are the same components
// any form in any product would use.

import { ReactNode, useId } from 'react';

export type OptionInput = string | { value: string; label: string };

function optionParts(option: OptionInput): { value: string; label: string } {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

function useFieldId(name?: string): string {
  const generated = useId();
  if (!name) return `f${generated.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return `f-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error" role="alert">{message}</p>;
}

export function Field({
  label, name, value, onChange, type = 'text', error, autoComplete, placeholder,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email';
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = useFieldId(name);
  const inputType = type === 'password' ? 'password' : type === 'email' ? 'email' : 'text';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <ErrorLine message={error} />
    </div>
  );
}

export function TextArea({
  label, name, value, onChange, error, rows = 4,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
}) {
  const id = useFieldId(name);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} name={name} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      <ErrorLine message={error} />
    </div>
  );
}

export function SelectField({
  label, name, value, onChange, options, error,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionInput[];
  error?: string;
}) {
  const id = useFieldId(name);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const { value: optionValue, label: optionLabel } = optionParts(option);
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
      <ErrorLine message={error} />
    </div>
  );
}

export function CheckboxField({
  label, name, checked, onChange, error,
}: {
  label: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const id = useFieldId(name);
  return (
    <div className="field">
      <label htmlFor={id}>
        <input id={id} name={name} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        {label}
      </label>
      <ErrorLine message={error} />
    </div>
  );
}

export function RadioGroup({
  label, name, value, onChange, options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionInput[];
}) {
  const group = useFieldId(name);
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      {options.map((option) => {
        const { value: optionValue, label: optionLabel } = optionParts(option);
        const id = `${group}-${optionValue}`;
        return (
          <label key={optionValue} htmlFor={id}>
            <input
              id={id}
              name={group}
              type="radio"
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            {optionLabel}
          </label>
        );
      })}
    </fieldset>
  );
}

// A single page-level error (only render this OR the field errors, never both).
export function FormError({ message }: { message?: string }) {
  return <ErrorLine message={message} />;
}

export function Button({
  children, onClick, type = 'button', disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
