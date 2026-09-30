import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type {
  PullDetail,
  PullFiles,
  PullRequest,
  ReviewComment,
  ReviewerRequest,
} from '../api';
import * as api from '../api';
import MilestonePicker from '../components/MilestonePicker';
import { reviewLabel, stateLabel } from '../labels';

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
  const [reviewBody, setReviewBody] = useState('');
  const [files, setFiles] = useState<PullFiles | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [conversationDraft, setConversationDraft] = useState('');
  const [conversationError, setConversationError] = useState('');
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [inlineTarget, setInlineTarget] = useState<{ path: string; line: number } | null>(null);
  const [reviewerDraft, setReviewerDraft] = useState('');
  const [reviewerPickerOpen, setReviewerPickerOpen] = useState(false);
  const [reviewers, setReviewers] = useState<ReviewerRequest[]>([]);
  // REQ-6-4: eligible reviewers come from the repository collaborators.
  const [eligibleReviewers, setEligibleReviewers] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [reviewState, setReviewState] = useState('APPROVED');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [checkDraft, setCheckDraft] = useState('pending');
  const [commits, setCommits] = useState<
    { sha: string; message: string; author: string; timestamp: string }[]
  >([]);
  const [searchParams, setSearchParams] = useSearchParams();
  // REQ-6-3-1: the same PR number and view survive a reload or a re-opened URL.
  const requestedPull = Number(searchParams.get('pull')) || initialPullNumber || null;
  const view = searchParams.get('view') || 'conversation';
  // REQ-6-2-1: status / author / review filters live in the URL so a reload keeps them.
  const statusFilter = searchParams.get('status') || '';
  const authorFilter = searchParams.get('author') || '';
  const reviewFilter = searchParams.get('review') || '';

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

  useEffect(() => {
    // REQ-5-3-3: the picker only offers milestones of the current repository.
    void api
      .listMilestones(owner, name)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [owner, name]);

  useEffect(() => {
    // REQ-6-4: the reviewer picker offers repository collaborators.
    void api
      .listRepoMembers(owner, name)
      .then(setEligibleReviewers)
      .catch(() => setEligibleReviewers([]));
  }, [owner, name]);

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
      setCanAdmin(Boolean(detail.canAdmin));
      setCheckDraft(
        (detail.pull.checks || []).find((check) => check.name === 'test')?.state || 'pending',
      );
      try {
        const [fileList, commitList] = await Promise.all([
          api.getPullFiles(owner, name, number),
          api.listPullCommits(owner, name, number),
        ]);
        setFiles(fileList);
        setCommits(commitList.commits || []);
      } catch {
        // Diff and commit details are read-only extras; the overview still renders.
        setCommits([]);
      }
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  useEffect(() => {
    if (!requestedPull) return;
    if (!pulls.some((pull) => pull.number === requestedPull)) return;
    void openPull(requestedPull);
    // The requested PR is opened only after the list confirms it exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPull, pulls.length]);

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
  // REQ-6-6: a viewer who is not the author or a maintainer must not see close/reopen.
  const canClose = Boolean(selected?.canClose);
  const canMerge = Boolean(selected?.canMerge);
  // REQ-6-5: the pull request reports the paths that conflict between branches.
  const conflicts = selected?.conflicts || [];
  // REQ-6-4: candidates are the repository collaborators that are not the author.
  const reviewerCandidates = eligibleReviewers.filter(
    (username) =>
      username !== selected?.pull.author &&
      username.toLowerCase().includes(reviewerDraft.trim().toLowerCase()),
  );

  function requestReviewer(username: string) {
    if (!selected) return;
    api
      .requestPullReviewer(owner, name, selected.pull.number, username)
      .then((list) => {
        setReviewers(list);
        setReviewerDraft('');
        setReviewerPickerOpen(false);
      })
      .catch((caught) => setError(api.errorMessage(caught)));
  }

  const changesRequested = (selected?.pull.reviews || []).some(
    (review) => review.state === 'CHANGES_REQUESTED',
  );

  return (
    <>
      <h2>Pull requests ({pulls.length})</h2>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      {/* REQ-6-2-1: the public list offers status links plus author and review filters. */}
      <nav className="tabs" aria-label="Pull request filters">
        {['Draft', 'Open', 'Closed', 'Merged'].map((label) => (
          <Link
            key={label}
            className={statusFilter === label.toLowerCase() ? 'active' : ''}
            to={`/${owner}/${name}?tab=pulls&status=${label.toLowerCase()}`}
          >
            {label}
          </Link>
        ))}
        <Link className={statusFilter ? '' : 'active'} to={`/${owner}/${name}?tab=pulls`}>
          All
        </Link>
      </nav>
      <div className="inline-form">
        <label htmlFor="pull-author-filter">Author</label>
        <select
          id="pull-author-filter"
          aria-label="Author"
          value={authorFilter}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', 'pulls');
            if (event.target.value) next.set('author', event.target.value);
            else next.delete('author');
            setSearchParams(next, { replace: true });
          }}
        >
          <option value="">All authors</option>
          {Array.from(new Set(pulls.map((pull) => pull.author))).map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
        <label htmlFor="pull-review-filter">Review status</label>
        <select
          id="pull-review-filter"
          aria-label="Review status"
          value={reviewFilter}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', 'pulls');
            if (event.target.value) next.set('review', event.target.value);
            else next.delete('review');
            setSearchParams(next, { replace: true });
          }}
        >
          <option value="">Any review status</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes requested</option>
          <option value="review_required">Review required</option>
        </select>
      </div>
      {(() => {
        const visible = pulls.filter((pull) => {
          if (statusFilter && String(pull.state).toLowerCase() !== statusFilter) return false;
          if (authorFilter && pull.author !== authorFilter) return false;
          if (reviewFilter) {
            const reviews = pull.reviews || [];
            const latest = new Map<string, string>();
            for (const review of reviews) latest.set(review.author, review.state);
            const states = Array.from(latest.values());
            const approved = states.includes('APPROVED');
            const changes = states.includes('CHANGES_REQUESTED');
            if (reviewFilter === 'approved' && !approved) return false;
            if (reviewFilter === 'changes_requested' && !changes) return false;
            if (reviewFilter === 'review_required' && (approved || changes)) return false;
          }
          return true;
        });
        return visible.length === 0 ? (
          <p>No pull requests match this filter.</p>
        ) : (
          <ul className="repo-list">
            {visible.map((pull) => (
              <li key={pull.number}>
                {/* REQ-6-2-1: the title is the link that opens the PR detail page. */}
                <Link to={`/${owner}/${name}?tab=pulls&pull=${pull.number}`}>{pull.title}</Link>
                <span className="muted">
                  {' '}
                  # {pull.number} · {stateLabel(pull.state)} · {pull.headBranch} →{' '}
                  {pull.baseBranch} · by {pull.author}
                </span>
              </li>
            ))}
          </ul>
        );
      })()}

      {selected && (
        <div className="issue-detail">
          {/* REQ-6-3-1: the heading shows the exact PR title. */}
          <h3>{selected.pull.title}</h3>
          <p className="muted">
            #{selected.pull.number} · {stateLabel(selected.pull.state)} ·{' '}
            {selected.pull.headBranch} → {selected.pull.baseBranch} · by{' '}
            {selected.pull.author} · approvals{' '}
            {selected.approvals}/{selected.protection.requiredApprovals}
          </p>
          {/* REQ-6-3-1: Conversation / Commits / Files changed are links. */}
          <nav className="tabs" aria-label="Pull request views">
            <Link to={`/${owner}/${name}?tab=pulls&pull=${selected.pull.number}`}>
              Conversation
            </Link>
            <Link to={`/${owner}/${name}?tab=pulls&pull=${selected.pull.number}&view=commits`}>
              Commits
            </Link>
            <Link to={`/${owner}/${name}?tab=pulls&pull=${selected.pull.number}&view=files`}>
              Files changed
            </Link>
          </nav>
          {view === 'conversation' && (
            <>
              {selected.pull.body && <p>{selected.pull.body}</p>}
              <h4>Discussion</h4>
              {comments.length === 0 ? (
                <p className="muted">No comments yet.</p>
              ) : (
                <ul className="repo-list">
                  {comments.map((comment) => (
                    <li key={comment.id}>
                      <strong>{comment.author}</strong>
                      {comment.path && <span className="muted">{` · ${comment.path}`}</span>}
                      <p>{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {/* REQ-6-3-1: Conversation also carries ordinary comments and the
                  status events of the pull request. */}
              {(selected.pull.comments || []).length > 0 && (
                <ul className="repo-list">
                  {(selected.pull.comments || []).map((comment) => (
                    <li key={comment.id}>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {(selected.pull.activities || []).length > 0 && (
                <>
                  <h4>Activity</h4>
                  <ul className="repo-list">
                    {(selected.pull.activities || []).map((activity, index) => (
                      <li key={`${activity.type}-${index}`}>
                        <strong>{activity.type}</strong>
                        <span className="muted">
                          {` · ${activity.actor} · ${new Date(activity.at).toLocaleString()}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const body = conversationDraft.trim();
                  if (!body) {
                    setConversationError('Comment is required');
                    return;
                  }
                  setConversationError('');
                  run(
                    () =>
                      api.addPullConversationComment(owner, name, selected.pull.number, body),
                    'Comment added.',
                  ).then(() => openPull(selected.pull.number));
                  setConversationDraft('');
                }}
              >
                <input
                  aria-label="Comment"
                  type="text"
                  placeholder="Leave a comment"
                  value={conversationDraft}
                  onChange={(event) => setConversationDraft(event.target.value)}
                />
                <button type="submit">Comment</button>
                {conversationError && <p className="error">{conversationError}</p>}
              </form>
            </>
          )}
          {view === 'commits' && (
            <section>
              <h4>Commit summary</h4>
              <p className="muted">
                {`${commits.length} commit(s) on ${selected.pull.headBranch} relative to ${selected.pull.baseBranch}`}
              </p>
              {commits.length === 0 ? (
                <p className="muted">No commits on this comparison.</p>
              ) : (
                <ul className="repo-list">
                  {commits.map((commit) => (
                    <li key={commit.sha}>
                      <strong>{commit.message}</strong>
                      <span className="muted">
                        {` · ${commit.sha.slice(0, 7)} · ${commit.author} · ${new Date(commit.timestamp).toLocaleString()}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {/* REQ-5-3-3: the same milestone picker as the issue detail view. */}
          <MilestonePicker
            current={selected.pull.milestone || null}
            milestones={milestones}
            canEdit={Boolean(selected.canTriage)}
            onSelect={(value) =>
              void run(
                () => api.updatePullMilestone(owner, name, selected.pull.number, value),
                'Milestone updated.',
              ).then(() => openPull(selected.pull.number))
            }
          />
          {/* REQ-6-1: the Checks area is on the page on arrival and is driven by the compare commit. */}
          <h4>Checks</h4>
          {(selected.pull.checks || []).length === 0 ? (
            <p className="muted">No checks yet.</p>
          ) : (
            <ul className="repo-list">
              {(selected.pull.checks || []).map((check) => (
                <li key={check.name}>
                  {`${check.name}: ${check.state}`}
                  {check.setBy && <span className="muted">{` · ${check.setBy}`}</span>}
                  {check.setAt && (
                    <span className="muted">{` · ${new Date(check.setAt).toLocaleString()}`}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canAdmin && (
            <div className="inline-form">
              <label htmlFor="test-status">test status</label>
              <select
                id="test-status"
                aria-label="test status"
                value={checkDraft}
                onChange={(event) => setCheckDraft(event.target.value)}
              >
                <option value="pending">pending</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  run(
                    () => api.setPullCheck(owner, name, selected.pull.number, 'test', checkDraft),
                    'Check status saved.',
                  ).then(() => {
                    if (selected) void openPull(selected.pull.number);
                  })
                }
              >
                Save
              </button>
            </div>
          )}
          <h4>Reviews</h4>
          {(selected.pull.reviews || []).length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <ul className="repo-list">
              {(selected.pull.reviews || []).map((review) => (
                <li key={review.id}>
                  <strong>
                    {review.author} · {reviewLabel(review.state)}
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
              {/* REQ-6-4: typing immediately reveals an option whose accessible
                  name is the reviewer; selecting it saves with no Save step. */}
              <ul role="listbox" aria-label="Reviewers">
                {reviewerCandidates.map((username) => (
                  <li key={username}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => requestReviewer(username)}
                    >
                      {username}
                    </button>
                  </li>
                ))}
              </ul>
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
          {view === 'files' && files && (
            <div className="diff-view">
              <h4>Changed files ({files.stats.changedFiles})</h4>
              {/* REQ-6-3-2: aggregate statistics use the official additions/deletions format. */}
              <p className="muted">{`${files.stats.added} additions, ${files.stats.removed} deletions`}</p>
              <p className="muted">
                {files.headBranch} → {files.baseBranch}
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
              {canClose && (
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
              )}
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
              {/* REQ-6-5: the only supported method is a merge commit. */}
              <div className="field">
                <label htmlFor="merge-method">Merge method</label>
                <select id="merge-method" aria-label="Merge method" value="merge commit" onChange={() => {}}>
                  <option value="merge commit">Create a merge commit</option>
                </select>
              </div>
              <ul className="repo-list merge-status">
                <li>
                  {missingApprovals > 0
                    ? `Required approval not satisfied (${selected.approvals}/${selected.protection.requiredApprovals})`
                    : 'Required approvals satisfied'}
                </li>
                <li>
                  {changesRequested
                    ? 'Changes requested is not satisfied: a reviewer must re-review'
                    : 'No changes requested'}
                </li>
                <li>
                  {missingChecks.length > 0
                    ? `Required status check ${missingChecks.join(', ')} not satisfied`
                    : 'Required status checks satisfied'}
                </li>
                {/* REQ-6-5: conflicting files block the merge. */}
                <li>
                  {conflicts.length > 0
                    ? 'Conflicting changes must be resolved before merging'
                    : 'No merge conflicts'}
                </li>
              </ul>
              {conflicts.length > 0 && (
                <p className="error">
                  These branches have conflicting changes: {conflicts.join(', ')}
                </p>
              )}
              {!canMerge ? (
                <div className="merge-status">
                  <button type="button" disabled>
                    Merge pull request
                  </button>
                  <p>You do not have permission to merge this pull request</p>
                </div>
              ) : mergeBlocked || changesRequested || conflicts.length > 0 ? (
                <div className="merge-status">
                  <button type="button" disabled>
                    Merge pull request
                  </button>
                  {missingApprovals > 0 && <p>Review required by branch protection</p>}
                  {missingChecks.length > 0 && (
                    <p>{`Required status check ${missingChecks.join(', ')} has not passed`}</p>
                  )}
                  {changesRequested && <p>Changes requested by a reviewer must be resolved</p>}
                  {conflicts.length > 0 && <p>Merge conflicts must be resolved</p>}
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
          {selected.pull.state === 'closed' && canClose && (
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
          {/* REQ-6-5: a merged PR shows the merger, time and resulting commit. */}
          {selected.pull.state === 'merged' && (
            <p className="muted">
              {`Merged by ${selected.pull.mergedBy || 'unknown'}`}
              {selected.pull.mergedAt
                ? ` · ${new Date(selected.pull.mergedAt).toLocaleString()}`
                : ''}
              {selected.pull.mergeCommit ? ` · commit ${selected.pull.mergeCommit.slice(0, 7)}` : ''}
            </p>
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
    </>
  );
}
