import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import HomePage from '../src/pages/HomePage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  createPersonalRepo: vi.fn(),
  discover: vi.fn(),
  listOrgs: vi.fn(),
}));

const user = { username: 'alice-dev', email: 'alice.dev@example.test', emailVerified: true };

function mockHome() {
  vi.mocked(api.discover).mockResolvedValue({ orgs: [], repos: [] });
  vi.mocked(api.listOrgs).mockResolvedValue([{ name: 'acme-demo', displayName: 'Acme Demo' }]);
  vi.mocked(api.createPersonalRepo).mockResolvedValue({
    owner: 'alice-dev',
    name: 'demo-repo',
    visibility: 'private',
    description: '',
  });
}

function renderHome(url = '/') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/:owner/:name" element={<p>repository page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('new repository flow', () => {
  it('opens the creation form from the New repository link with the official controls', async () => {
    mockHome();
    const user1 = userEvent.setup();
    renderHome('/');

    await user1.click(await screen.findByRole('link', { name: 'New repository' }));

    expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Repository name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Public' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Private' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Add a README file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create repository' })).toBeInTheDocument();
  });

  it('creates a private repository owned by an organization with a README', async () => {
    mockHome();
    const user1 = userEvent.setup();
    renderHome('/?new=1');

    await user1.selectOptions(await screen.findByLabelText('Owner'), 'acme-demo');
    await user1.type(screen.getByLabelText('Repository name'), 'demo-repo');
    await user1.type(screen.getByLabelText('Description'), 'Demo repository');
    await user1.click(screen.getByRole('radio', { name: 'Private' }));
    await user1.click(screen.getByRole('checkbox', { name: 'Add a README file' }));
    await user1.click(screen.getByRole('button', { name: 'Create repository' }));

    await waitFor(() =>
      expect(api.createPersonalRepo).toHaveBeenCalledWith({
        owner: 'acme-demo',
        name: 'demo-repo',
        visibility: 'private',
        description: 'Demo repository',
        readme: true,
      }),
    );
    expect(await screen.findByText('repository page')).toBeInTheDocument();
  });
});
