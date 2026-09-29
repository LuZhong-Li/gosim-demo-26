import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  PullDetail,
  PullFiles,
  PullRequest,
  ReviewComment,
  ReviewerRequest,
} from '../api';
import * as api from '../api';

export default function PullsTab({
  owner,
  name,
  initialPullNumber = null,
}: {
  owner: string;
  name: string;
  initialPullNumber?: number | null;
}) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullDetail | null>(null);
  const [baseBranch, setBaseBranch] = useState('main');
  const [reviewBody, setReviewBody] = useState('');
  const [files, setFiles] = useState<PullFiles | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [inlineTarget, setInlineTarget] = useState<{ path: string; line: number } | null>(null);
  const [reviewerDraft, setReviewerDraft] = useState('');
  const [reviewerPickerOpen, setReviewerPickerOpen] = useState(false);
  const [reviewers, setReviewers] = useState<ReviewerRequest[]>([]);
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  const [requiredChecks, setRequiredChecks] = useState('test');
  const [milestoneDraft, setMilestoneDraft] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [reviewState, setReviewState] = useState('APPROVED');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState(false);

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
      setFiles(null);
      setComments(await api.getPullComments(owner, name, number));
      const detail = await api.getPull(owner, name, number);
      setReviewers(detail.pull.reviewers || []);
      setMilestoneDraft(detail.pull.milestone || '');
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  useEffect(() => {
    if (!initialPullNumber) return;
    if (!pulls.some((pull) => pull.number === initialPullNumber)) return;
    void openPull(initialPullNumber);
    // The requested PR is opened only after the list confirms it exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPullNumber, pulls.length]);

  const missingApprovals = selected
    ? Math.max(0, selected.protection.requiredApprovals - selected.approvals)
    : 0;
  const missingChecks = selected
    ? selected.protection.requiredChecks.filter(
        (checkName) =>
          !(selected.pull.checks || []).some(
            (check) => check.name === checkName && check.state === 'success',
          ),
      )
    : [];
  const mergeBlocked = missingApprovals > 0 || missingChecks.length > 0;

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
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => api.updatePullMilestone(owner, name, selected.pull.number, milestoneDraft),
                'Milestone updated.',
              ).then(() => openPull(selected.pull.number));
            }}
          >
            <input
              aria-label="Milestone"
              type="text"
              value={milestoneDraft}
              placeholder="Milestone (or empty to clear)"
              onChange={(event) => setMilestoneDraft(event.target.value)}
            />
            <button type="submit">Save milestone</button>
          </form>
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
          {/* REQ-6-3-2: changed files and aggregate diff */}
          {/* REQ-6-4: requested reviewers */}
          <h4>Reviewers</h4>
          <button type="button" onClick={() => setReviewerPickerOpen(true)}>
            Reviewers
          </button>
          {reviewerPickerOpen && (
            <div role="dialog" aria-label="Reviewers" className="inline-form">
              <label>
                Search
                <input
                  aria-label="Search"
                  type="text"
                  value={reviewerDraft}
                  onChange={(event) => setReviewerDraft(event.target.value)}
                />
              </label>
              {reviewerDraft.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const username = reviewerDraft.trim();
                    api
                      .requestPullReviewer(owner, name, selected.pull.number, username)
                      .then((list) => {
                        setReviewers(list);
                        setReviewerDraft('');
                        setReviewerPickerOpen(false);
                      })
                      .catch((caught) => setError(api.errorMessage(caught)));
                  }}
                >
                  {reviewerDraft.trim()}
                </button>
              )}
            </div>
          )}
          {reviewers.length === 0 ? (
            <p className="muted">No reviewers requested.</p>
          ) : (
            <ul className="repo-list">
              {reviewers.map((reviewer) => (
                <li key={reviewer.username}>
                  {reviewer.username}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      api
                        .removePullReviewer(owner, name, selected.pull.number, reviewer.username)
                        .then((list) => setReviewers(list))
                        .catch((caught) => setError(api.errorMessage(caught)))
                    }
                  >
                    {`Remove ${reviewer.username}`}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              api
                .getPullFiles(owner, name, selected.pull.number)
                .then((result) => setFiles(result))
                .catch((caught) => setError(api.errorMessage(caught)));
            }}
          >
            Files changed
          </button>
          {files && (
            <div className="diff-view">
              <h4>Files changed ({files.stats.changedFiles})</h4>
              <p className="muted">
                +{files.stats.added} / -{files.stats.removed} · {files.headBranch} →{' '}
                {files.baseBranch}
              </p>
              {files.files.length === 0 ? (
                <p className="muted">No changed files.</p>
              ) : (
                files.files.map((file) => (
                  <div key={file.path}>
                    <p>
                      <strong>{file.path}</strong> <span className="muted">{file.status}</span>
                    </p>
                    {file.lines.map((line, lineIndex) => {
                      const lineNo = lineIndex + 1;
                      const commentable = line.type === 'added' || line.type === 'removed';
                      const editing =
                        inlineTarget && inlineTarget.path === file.path && inlineTarget.line === lineNo;
                      const draftKey = `${file.path}:${lineNo}`;
                      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
                      return (
                        <div className="diff-line" key={`${file.path}-${lineNo}`}>
                          <span className="diff-prefix">{prefix}</span>
                          <span className="diff-text">{line.text}</span>
                          {commentable && (
                            <button
                              type="button"
                              aria-label="Add comment"
                              onClick={() => setInlineTarget({ path: file.path, line: lineNo })}
                            >
                              +
                            </button>
                          )}
                          {editing && (
                            <div className="inline-comment-editor">
                              <label>
                                Comment
                                <input
                                  aria-label="Comment"
                                  type="text"
                                  value={commentDraft[draftKey] || ''}
                                  onChange={(event) =>
                                    setCommentDraft({ ...commentDraft, [draftKey]: event.target.value })
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const body = (commentDraft[draftKey] || '').trim();
                                  if (!body) return;
                                  api
                                    .addPullComment(owner, name, selected.pull.number, {
                                      path: file.path,
                                      line: lineNo,
                                      body,
                                    })
                                    .then(() => api.getPullComments(owner, name, selected.pull.number))
                                    .then((list) => {
                                      setComments(list);
                                      setCommentDraft({ ...commentDraft, [draftKey]: '' });
                                      setInlineTarget(null);
                                    })
                                    .catch((caught) => setError(api.errorMessage(caught)));
                                }}
                              >
                                Add single comment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const body = (commentDraft[draftKey] || '').trim();
                                  if (!body) return;
                                  api
                                    .addPullComment(owner, name, selected.pull.number, {
                                      path: file.path,
                                      line: lineNo,
                                      body,
                                      pending: true,
                                    })
                                    .then(() => api.getPullComments(owner, name, selected.pull.number))
                                    .then((list) => {
                                      setComments(list);
                                      setCommentDraft({ ...commentDraft, [draftKey]: '' });
                                      setInlineTarget(null);
                                    })
                                    .catch((caught) => setError(api.errorMessage(caught)));
                                }}
                              >
                                Start a review
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              {comments.length > 0 && (
                <div>
                  <h4>Review comments</h4>
                  <ul className="repo-list">
                    {comments.map((comment) => (
                      <li key={comment.id}>
                        <strong>{comment.author}</strong> on {comment.path}
                        {comment.outdated && <span className="muted"> · Outdated</span>}
                        {!comment.published && <span className="muted"> · Pending review</span>}
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
              <button
                type="button"
                onClick={() =>
                  run(
                    () => api.setPullState(owner, name, selected.pull.number, 'closed'),
                    'Pull request closed.',
                  ).then(() => openPull(selected.pull.number))
                }
              >
                Close pull request
              </button>
              {reviewOpen ? (
                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () =>
                        api.addPullReview(owner, name, selected.pull.number, {
                          state: reviewState,
                          body: reviewBody,
                        }),
                      'Review submitted.',
                    ).then(() => openPull(selected.pull.number));
                    setReviewOpen(false);
                    setReviewBody('');
                  }}
                >
                  <div className="field">
                    <label htmlFor="review-summary">Summary</label>
                    <textarea
                      id="review-summary"
                      rows={2}
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                    />
                  </div>
                  <fieldset>
                    <legend>Review decision</legend>
                    <label>
                      <input
                        type="radio"
                        name="review-decision"
                        value="COMMENTED"
                        checked={reviewState === 'COMMENTED'}
                        onChange={() => setReviewState('COMMENTED')}
                      />
                      Comment
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="review-decision"
                        value="APPROVED"
                        checked={reviewState === 'APPROVED'}
                        onChange={() => setReviewState('APPROVED')}
                      />
                      Approve
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="review-decision"
                        value="CHANGES_REQUESTED"
                        checked={reviewState === 'CHANGES_REQUESTED'}
                        onChange={() => setReviewState('CHANGES_REQUESTED')}
                      />
                      Request changes
                    </label>
                  </fieldset>
                  <button type="submit">Submit review</button>
                </form>
              ) : (
                <button type="button" onClick={() => setReviewOpen(true)}>
                  Review changes
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  run(() => api.addPullCheck(owner, name, selected.pull.number, 'test'), 'Check passed.')
                }
              >
                Run required check (test)
              </button>
              {mergeBlocked ? (
                <div className="merge-status">
                  <button type="button" disabled>
                    Merge pull request
                  </button>
                  {missingApprovals > 0 && <p>Review required by branch protection</p>}
                  {missingChecks.length > 0 && (
                    <p>{`Required status check ${missingChecks.join(', ')} has not passed`}</p>
                  )}
                </div>
              ) : mergeConfirm ? (
                <span className="inline-form">
                  <span className="muted">Confirm merge?</span>
                  <button
                    type="button"
                    onClick={() =>
                      run(() => api.mergePull(owner, name, selected.pull.number), 'Merged').then(() =>
                        openPull(selected.pull.number),
                      )
                    }
                  >
                    Confirm merge
                  </button>
                  <button type="button" onClick={() => setMergeConfirm(false)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setMergeConfirm(true)}>
                  Merge pull request
                </button>
              )}
            </>
          )}
          {selected.pull.state === 'closed' && (
            <button
              type="button"
              onClick={() =>
                run(
                  () => api.setPullState(owner, name, selected.pull.number, 'open'),
                  'Pull request reopened.',
                ).then(() => openPull(selected.pull.number))
              }
            >
              Reopen pull request
            </button>
          )}
          <p>
            Branch protection on {selected.protection.branch}: {selected.protection.requiredApprovals}{' '}
            approval(s), checks {selected.protection.requiredChecks.join(', ') || 'none'}.
          </p>
        </div>
      )}

      <p>
        <Link to={`/${owner}/${name}/compare`}>New pull request</Link>
      </p>

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
