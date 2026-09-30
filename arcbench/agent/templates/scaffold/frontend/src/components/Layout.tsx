// Generic, task-agnostic page chrome. Contains no task-specific markup.

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Page({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <main className="page">
      {title ? <h1>{title}</h1> : null}
      {children}
    </main>
  );
}

// A tab strip whose entries are real links (role=link), which is what the
// requirements ask for: "Open"/"Closed", "Code"/"Issues"/..., etc. must be
// navigation links even when they look like tabs.
export function TabLinks({
  items, current,
}: {
  items: Array<{ label: string; to: string }>;
  current?: string;
}) {
  return (
    <nav className="tabs">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={item.label === current ? 'tab active' : 'tab'}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// A labelled section with a stable heading (issue/PR detail panes, sidebars).
export function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
