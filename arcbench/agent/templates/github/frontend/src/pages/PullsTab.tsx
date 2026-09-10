import { useCallback, useEffect, useState } from 'react';
import type { PullDetail, PullRequest } from '../api';
import * as api from '../api';

export default function PullsTab({ owner, name }: { owner: string; name: string }) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullDetail | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  const [requiredChecks, setRequiredChecks] = useState('test');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      setPulls(await api.listPulls(owner, name));
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [owner, name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setError('');
    setInfo('');
    try {
      await action();
      setInfo(successMessage);
      await refresh();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function openPull(number: number) {
    try {
      setSelected(await api.getPull(owner, name, number));
      setReviewBody('');
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <>
      <h2>Pull requests ({pulls.length})</h2>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      {pulls.length === 0 ? (
        <p>No pull requests yet.</p>
      ) : (
        <ul className="repo-list">
          {pulls.map((pull) => (
            <li key={pull.number}>
              <button className="link-button" type="button" onClick={() => openPull(pull.number)}>
                #{pull.number} {pull.title}
              </button>
              <span className="muted">
                {' '}
                · {pull.state} · {pull.headBranch} → {pull.baseBranch} · by {pull.author}
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="issue-detail">
          <h3>
            #{selected.pull.number} {selected.pull.title}
          </h3>
          <p className="muted">
            {selected.pull.state} · {selected.pull.headBranch} → {selected.pull.baseBranch} · by{' '}
            {selected.pull.author} · approvals {selected.approvals}/
            {selected.protection.requiredApprovals}
          </p>
          {selected.pull.body && <p>{selected.pull.body}</p>}
          <p className="muted">
            Checks:{' '}
            {(selected.pull.checks || []).length
              ? selected.pull.checks?.map((check) => `${check.name}: ${check.state}`).join(', ')
              : 'none'}
          </p>
          <h4>Reviews</h4>
          {(selected.pull.reviews || []).length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <ul className="repo-list">
              {(selected.pull.reviews || []).map((review) => (
                <li key={review.id}>
                  <strong>
                    {review.author} · {review.state}
                  </strong>
                  {review.body && <p>{review.body}</p>}
                </li>
              ))}
            </ul>
          )}
          {/* REQ-6-2-4: a draft must be marked ready before it can be reviewed or merged */}
          {selected.pull.state === 'draft' && (
            <button
              type="button"
              onClick={() =>
                run(
                  () => api.markPullReady(owner, name, selected.pull.number),
                  'Draft marked ready for review.',
                ).then(() => openPull(selected.pull.number))
              }
            >
              Ready for review
            </button>
          )}
          {selected.pull.state === 'open' && (
            <>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(
                    () => api.addPullReview(owner, name, selected.pull.number, { state: 'APPROVED', body: reviewBody }),
                    'Review submitted.',
                  ).then(() => openPull(selected.pull.number));
                  setReviewBody('');
                }}
              >
                <input
                  aria-label="Review body"
                  type="text"
                  value={reviewBody}
                  placeholder="Review comment (optional)"
                  onChange={(event) => setReviewBody(event.target.value)}
                />
                <button type="submit">Approve</button>
              </form>
              <button
                type="button"
                onClick={() =>
                  run(
                    () =>
                      api.addPullReview(owner, name, selected.pull.number, {
                        state: 'CHANGES_REQUESTED',
                        body: reviewBody,
                      }),
                    'Changes requested.',
                  ).then(() => openPull(selected.pull.number))
                }
              >
                Request changes
              </button>
              <button
                type="button"
                onClick={() =>
                  run(() => api.addPullCheck(owner, name, selected.pull.number, 'test'), 'Check passed.')
                }
              >
                Run required check (test)
              </button>
              <button
                type="button"
                onClick={() =>
                  run(() => api.mergePull(owner, name, selected.pull.number), 'Pull request merged.')
                }
              >
                Merge pull request
              </button>
            </>
          )}
          <p>
            Branch protection on {selected.protection.branch}: {selected.protection.requiredApprovals}{' '}
            approval(s), checks {selected.protection.requiredChecks.join(', ') || 'none'}.
          </p>
        </div>
      )}

      <h2>New pull request</h2>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => api.createPull(owner, name, { title, body, baseBranch, headBranch }),
            'Pull request created.',
          );
          setTitle('');
          setBody('');
          setHeadBranch('');
        }}
      >
        <div className="field">
          <label htmlFor="pull-title">Title</label>
          <input
            id="pull-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pull-base">Base branch</label>
          <input
            id="pull-base"
            type="text"
            value={baseBranch}
            onChange={(event) => setBaseBranch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pull-head">Head branch</label>
          <input
            id="pull-head"
            type="text"
            value={headBranch}
            placeholder="feature-branch"
            onChange={(event) => setHeadBranch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pull-body">Body (optional)</label>
          <textarea
            id="pull-body"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <button type="submit">Create pull request</button>
        <button
          type="button"
          onClick={() => {
            run(
              () =>
                api.createPull(owner, name, {
                  title,
                  body,
                  baseBranch,
                  headBranch,
                  draft: true,
                }),
              'Draft pull request created.',
            );
            setTitle('');
            setBody('');
            setHeadBranch('');
          }}
        >
          Create draft pull request
        </button>
      </form>

      <h2>Branch protection</h2>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              api.setBranchProtection(owner, name, baseBranch, {
                requiredApprovals,
                requiredChecks: requiredChecks
                  .split(',')
                  .map((check) => check.trim())
                  .filter(Boolean),
              }),
            'Branch protection updated.',
          );
        }}
      >
        <div className="field">
          <label htmlFor="protect-approvals">Required approvals</label>
          <input
            id="protect-approvals"
            type="number"
            min={0}
            value={requiredApprovals}
            onChange={(event) => setRequiredApprovals(Number(event.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="protect-checks">Required checks (comma separated)</label>
          <input
            id="protect-checks"
            type="text"
            value={requiredChecks}
            onChange={(event) => setRequiredChecks(event.target.value)}
          />
        </div>
        <button type="submit">Save protection</button>
      </form>
    </>
  );
}
