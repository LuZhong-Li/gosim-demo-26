# github: live-spec fix checklist

158 checkable assertions across 48 requirements
(filtered from the raw delta; generic scenario boilerplate removed)

## Summary

| Requirement | Assertions |
| --- | --- |
| REQ-1-1-1 Register a New GitHub Account | 7 |
| REQ-1-1-3 Recover Account Access Through a Verified Email | 7 |
| REQ-2-1-2 Create an Organization After Authentication | 6 |
| REQ-2-2-2 Manage Organization Team Members and Hierarchy | 6 |
| REQ-3-2-1 Create a Repository with Owner, Visibility, and Initialization Options | 6 |
| REQ-1-2 Sign Out and End the Current Web Session | 5 |
| REQ-2-2-3 Directly Add a User as an Organization Member | 5 |
| REQ-2-3 Grant Repository Access to People and Teams | 5 |
| REQ-4-2-3 Search Code Within a Repository | 5 |
| REQ-4-3-2 Create a Branch from an Existing Revision | 5 |
| REQ-4-3-3 Change the Repository Default Branch | 5 |
| REQ-5-2-2 Edit an Issue Title and Description | 5 |
| REQ-6-4 Request or Remove Pull Request Reviewers | 5 |
| REQ-2-2-1 Create an Organization Team | 4 |
| REQ-3-1 Search for and Locate Repositories | 4 |
| REQ-3-2-3 Copy a Repository Clone Value | 4 |
| REQ-3-4 Change Repository Visibility with Permission Checks | 4 |
| REQ-4-4 Manage Repository Files Through the Web Interface | 4 |
| REQ-5-2-1 Create a Repository Issue | 4 |
| REQ-5-3-1 Assign or Unassign Issue Participants | 4 |
| REQ-5-4 Close or Reopen an Issue | 4 |
| REQ-1-3 Change Account Password | 3 |
| REQ-2-2-4 Remove a Member from an Organization | 3 |
| REQ-3-2-2 Fork a Repository into Another Namespace | 3 |
| REQ-4-3-1 List and Switch Repository Branches | 3 |
| REQ-5-1-1 List and Filter Repository Issues | 3 |
| REQ-6-2-4 Create a Draft Pull Request | 3 |
| REQ-6-5 Merge an Eligible Pull Request | 3 |
| REQ-2-1-1 Browse Organization Repositories | 2 |
| REQ-3-3 View a Public Repository Overview | 2 |
| REQ-4 Code and Version Control | 2 |
| REQ-4-2-1 View Repository Commit History | 2 |
| REQ-5-2-3 Comment on an Issue Discussion | 2 |
| REQ-5-3-2 Apply Labels to an Issue | 2 |
| REQ-5-3-3 Assign Issues and Pull Requests to a Milestone | 2 |
| REQ-6 Change Review and Merge Control | 2 |
| REQ-6-1 Protect Branches with Review and Status-Check Requirements | 2 |
| REQ-6-2-2 Compare Branches Before Opening a Pull Request | 2 |
| REQ-6-2-3 Create a Pull Request from Comparison Results | 2 |
| REQ-6-3-1 View Pull Request Overview and Commits | 2 |
| REQ-6-3-2 Inspect Changed Files and Aggregate Diff | 2 |
| REQ-2-1 Organization Identity and Discovery | 1 |
| REQ-4-2-2 Inspect Commit and Revision Differences | 1 |
| REQ-5 Work Planning and Issue Management | 1 |
| REQ-5-1-2 View an Issue and Its Discussion | 1 |
| REQ-6-3-3 Add Review Comments to Changed Code Lines | 1 |
| REQ-6-3-4 Submit a Pull Request Review | 1 |
| REQ-6-6 Close or Reopen a Pull Request Without Merging | 1 |

## Checklist

### REQ-1-1-1 Register a New GitHub Account

- [ ] Register a New GitHub Account Register a New GitHub Account The registration page is the form opened by the unique link named “Create an account” from the sign-in page.
- [ ] The form contains exactly one textbox labeled “Username”, one textbox labeled “Email”, one password input labeled “Password”, one password input labeled “Confirm password”, one initially unchecked checkbox named “Agree to the terms”, and one enabled button named “Create account”.
- [ ] The corresponding visible field message contains “Username already exists”, “Username format is invalid”, “Email format is invalid”, “Password requirements are not satisfied”, or “Agree to terms is required”, as applicable.
- [ ] Submitting several invalid fields together must show the username, email, password, and missing-terms messages together, rather than revealing only one error per submission; the submit button remains actionable so these messages can be read.
- [ ] For example, a username beginning with a hyphen, email “not-an-email”, password “short”, confirmation “different”, and unchecked terms produce these field errors and preserve the attempted username.
- [ ] A duplicate username paired with a different unused email displays “Username already exists” and retains both attempted values.
- [ ] A successful registration accepts a unique username such as “pw-user-<unique suffix>”, its “@example.test” email, and password “Valid-password-123!”; the sign-in form is immediately available, accepts that email, and the resulting signed-in username remains visible after reload. image FILE Type:

### REQ-1-1-3 Recover Account Access Through a Verified Email

- [ ] Recover Account Access Through a Verified Email Recover Account Access Through a Verified Email The password-recovery page is opened by the link “Forgot password” on the sign-in page; the fixed code is displayed as a distinct visible text value exactly “123456”, not only embedded inside a longer instruction.
- [ ] “Email”, “Verification code”, “New password”, and “Confirm password” are associated field labels;
- [ ] “Send reset link” and “Reset password” are buttons.
- [ ] The recovery scenario uses a newly registered account, an unknown email, a compliant replacement such as “Replacement-password-456!”, and invalid code “000000”; failure leaves the registered account able to sign in with its old email/password.
- [ ] In this flow, the local system does not send email, generate a copyable reset link, or call an external verification-code service.
- [ ] If the verification code is wrong, the email is unknown, the password is noncompliant, or the confirmation does not match, the page explains the reason beside the corresponding field and does not modify any account; an incorrect verification code displays “Verification code is invalid”.
- [ ] After successful submission, the page directly displays “Password updated” and does not produce any email or link.

### REQ-2-1-2 Create an Organization After Authentication

- [ ] Create an Organization After Authentication Create an Organization After Authentication The account-menu link “Your organizations” opens a page with the link “New organization”.
- [ ] Its form has fields labeled “Organization name” and “Display name” and a button “Create organization”.
- [ ] Submitting an existing identifier must show “Organization name already exists” even when the display name is also missing; it must not navigate to a heading for the existing organization.
- [ ] The malformed identifier “-invalid-organization” and a whitespace-only display name are rejected with the applicable field error.
- [ ] The applicable visible message is “Organization name already exists”, “Organization name format is invalid”, or “Display name is required”.
- [ ] The user enters organization identifier mobile-guild, a display name Mobile Guild, and clicks “Create organization”.

### REQ-2-2-2 Manage Organization Team Members and Hierarchy

- [ ] The team page has links “Members” and “Settings”.
- [ ] On Members, the button “Add member” opens a textbox labeled “Username” and the submit button “Add member”; only the current step's Add member button is exposed as an actionable match.
- [ ] After adding, the member's complete username is visible once in the member list, alongside a button named “Remove <username>”.
- [ ] Activating this removal button immediately removes that member without a second confirmation step, and reload keeps the username absent.
- [ ] Settings contains a native select with combobox role labeled “Parent team”, whose option labels are team names, and a button “Save”.
- [ ] A rejected cycle displays “Cyclic team hierarchy is not allowed”.

### REQ-3-2-1 Create a Repository with Owner, Visibility, and Initialization Options

- [ ] The signed-in workspace provides a “New repository” link.
- [ ] The form labels are “Owner”, “Repository name”, and “Description”; the signed-in user's personal namespace is selected by default, so it is possible to submit without changing the owner.
- [ ] Visibility choices are radio controls “Public” and “Private”; initialization is a checkbox “Add a README file”; submission uses the button “Create repository”.
- [ ] A successful initialized private repository shows a heading containing the new name, a visible Private marker, and a README file link; the overview persists after reload.
- [ ] The optional description “Repository created by Playwright” is saved when entered.
- [ ] An existing repository in this same default personal namespace is supplied for duplicate validation, which stays on the form and does not open the existing repository heading.

### REQ-1-2 Sign Out and End the Current Web Session

- [ ] The page contains exactly one button named “Account menu”; its menu contains exactly one link named “Sign out”.
- [ ] Activating it displays a dialog named “Sign out” with buttons named “Confirm sign out” and “Cancel”.
- [ ] The dialog explains that sign-out affects only the current browser session.
- [ ] Only “Confirm sign out” invalidates the session, while “Cancel” or closing the dialog retains the current session and page.
- [ ] After confirming, refresh, browser back navigation, or directly reopening a previously accessible protected account, repository, or organization page restores an unauthenticated state and displays the “Sign in” link. image FILE Type:

### REQ-2-2-3 Directly Add a User as an Organization Member

- [ ] Directly Add a User as an Organization Member Directly Add a User as an Organization Member The organization overview opens “People” through a link.
- [ ] Its button “Add member” opens the labeled field “Username or email”, a combobox “Role” defaulting to Member, and a submission button “Add member”.
- [ ] Opening Role exposes clickable options “Member” and “Owner”.
- [ ] A separately signed-in new member sees the organization identifier as complete visible text in Your organizations, while an ungranted private repository shows “Access denied”.
- [ ] For an existing member, unknown account, unsupported role, or persistence failure, the system displays the reason and does not change the membership relationship; an existing member displays “Account is already a member”, and the unknown username unknown-reviewer displays “Account not found”.

### REQ-2-3 Grant Repository Access to People and Teams

- [ ] Grant Repository Access to People and Teams Grant Repository Access to People and Teams From the repository's “Settings” link, open the “Manage access” link and activate “Add people or teams”.
- [ ] The picker presents a textbox “Search”, a matching selectable team option whose name contains the team name, a combobox “Role” with clickable role options including “Write”, and an “Add” button.
- [ ] Existing grants appear as rows whose accessible names include the subject name; each row contains a native select labeled “Role” and a “Save” button.
- [ ] Selecting the option labeled “Read” and saving replaces Write; after reload exactly one row for the team remains and contains Read.
- [ ] In the access-subject picker, matching member or team options update as the administrator types; pressing Enter or activating a separate search button is not required before selecting an option.

### REQ-4-2-3 Search Code Within a Repository

- [ ] The repository page and search results expose one searchbox named “Search”; after Enter, a unique link named “Code” selects code results.
- [ ] This results-type link must remain distinguishable from repository navigation so the active search page has only one Code link.
- [ ] Path and language filters are optional, and an unfiltered search can immediately open a result link whose exact accessible name is the matching file name.
- [ ] Opening the matching file shows that text; refreshing preserves the file context, text, and a link named exactly after the file.
- [ ] For the absent query, show “No code results” and retain the exact query in Search.

### REQ-4-3-2 Create a Branch from an Existing Revision

- [ ] As the user types, a valid unused name displays the “Create branch: <name>” option without requiring Enter or a separate search action, while an invalid name immediately displays “Invalid branch”.
- [ ] The selector and “Find branch” textbox use REQ-4-3-1's roles.
- [ ] For a valid unused name, the creation entry has role option and accessible name “Create branch: <name>”.
- [ ] Its displayed base defaults to the current branch head; selecting this option performs creation and switches branches without a second mandatory confirmation.
- [ ] In particular, entering invalid..branch immediately shows “Invalid branch” and cannot create a reference; generated valid names such as pw-branch-<unique suffix> follow the same rules. image FILE Type:

### REQ-4-3-3 Change the Repository Default Branch

- [ ] “Settings” and “Branches” are unique links on their respective pages;
- [ ] “Default branch” is a native HTML select element exposing the combobox role, with options labeled by exact existing branch names; selecting an option must use the native selection behavior.
- [ ] The administrator selects a different seeded branch, activates the “Update” button, and then the “Confirm” button in the confirmation dialog.
- [ ] Opening the repository page entry without a branch then shows “Branch <new default branch name>”; opening that selector still offers an option named exactly after the old default branch.
- [ ] A non-Admin may have Settings or Branches links hidden or may open a read-only settings page, but no “Default branch” combobox or default-branch update button is rendered for that user; a merely disabled editable selector is insufficient. image FILE Type:

### REQ-5-2-2 Edit an Issue Title and Description

- [ ] Edit an Issue Title and Description Edit an Issue Title and Description Only a signed-in user with Write, Maintain, or Admin may use the unique buttons named “Edit issue title” and “Edit issue description” on an issue detail page.
- [ ] “Edit issue title” opens a form with a textbox labeled “Issue title” and a button named “Save issue title”;
- [ ] “Edit issue description” opens a form with a textbox labeled “Issue description” and a button named “Save issue description”.
- [ ] Saving title and description are separate actions; after both saves and reload, the title heading has exactly the new title as its accessible name and the exact new description is visible.
- [ ] The invalid-edit seed is a separate issue with the original title Original issue title; replacing its title with three spaces and activating “Save issue title” shows “Title is required”, and reloading restores the original title heading.

### REQ-6-4 Request or Remove Pull Request Reviewers

- [ ] Request or Remove Pull Request Reviewers Request or Remove Pull Request Reviewers The Reviewers button opens a picker with a textbox named Search.
- [ ] Typing an eligible username immediately reveals an option with that exact accessible name.
- [ ] Selecting the option saves the request immediately without a separate Save action, closes the picker, and displays the username in the reviewer area; it remains after reload.
- [ ] Each requested reviewer has a button named Remove followed by a space and the username; clicking it immediately removes the request and the username from that area, without a confirmation step.
- [ ] Matching reviewer options update as the user types in the search textbox; pressing Enter or activating a separate search button is not required before selecting an option.

### REQ-2-2-1 Create an Organization Team

- [ ] Create an Organization Team Create an Organization Team The organization overview has a “Teams” link; that page has a “New team” link opening the field “Team name” and button “Create team”.
- [ ] The resulting team heading contains its name and remains visible after reload.
- [ ] A team page is the detail page for a grouping of accounts within an organization, titled “organization name/team name”; the Members tab displays the team's direct members, and Settings is used to change the parent team.
- [ ] A malformed team name displays “Team name format is invalid”.

### REQ-3-1 Search for and Locate Repositories

- [ ] Search for and Locate Repositories Search for and Locate Repositories The top global search control has searchbox role and accessible name “Search”; entering a repository name and pressing Enter displays repository results directly, without requiring an additional type-filter click.
- [ ] Each repository result has a link whose accessible name is exactly its repository name, while the result also displays its owner/name metadata.
- [ ] A query with no matching repository displays “No results”, including when the visitor returns home and repeats the same query.
- [ ] Seed data provides a named public repository and a private repository inaccessible to visitors; searching the private name exposes no result link for it.

### REQ-3-2-3 Copy a Repository Clone Value

- [ ] Copy a Repository Clone Value Copy a Repository Clone Value The clone popover is opened by a button “Code”, separate from the repository navigation link of the same name.
- [ ] Protocol controls are tabs “HTTPS” and “SSH”, and the selected clone value has a button “Copy clone value”.
- [ ] With browser clipboard permission, copying writes the selected complete value, displays “Copied”, and leaves the repository heading visible.
- [ ] The page displays brief “Copied” feedback for the selected protocol, keeps the repository heading visible, and leaves repository files, commit history, and visibility unchanged.

### REQ-3-4 Change Repository Visibility with Permission Checks

- [ ] Open the repository's “Settings” link and then its “General” link to reach Danger Zone.
- [ ] The visibility action is a button “Change visibility”; the confirmation flow provides a “Public” radio and a button “Confirm visibility”.
- [ ] A non-Admin collaborator must not see the Change visibility button, including when a Settings link is available.
- [ ] After successful confirmation, a visible Public marker appears, and an unauthenticated visitor reopening the same address sees its repository heading.

### REQ-4-4 Manage Repository Files Through the Web Interface

- [ ] An invalid path displays “Invalid file path”, and an empty commit message displays “Commit message is required”.
- [ ] From the writable Code page, the unique “Add file” button opens the “Create new file” menuitem.
- [ ] The editor has a field labeled “File name”, a textbox named “File contents”, an initially empty field labeled “Commit message”, and a “Commit changes” button.
- [ ] Its “Commits” link opens history displaying the exact submitted message.

### REQ-5-2-1 Create a Repository Issue

- [ ] “New issue” is a link on the Issues page.
- [ ] The creation form has fields labeled “Title” and “Description” and a “Submit new issue” button.
- [ ] A successful submission displays a heading named exactly after the entered title and the exact saved description; reopening the Issues page entry shows a title link with the same exact name.
- [ ] A title containing only three spaces is treated as blank; clicking Submit new issue displays “Title is required” and creates no issue, even if the optional description is empty. image FILE Type:

### REQ-5-3-1 Assign or Unassign Issue Participants

- [ ] Matching assignee options update as the user types in the search textbox; pressing Enter or activating a separate search button is not required before selecting an option.
- [ ] The settings icon is a button named “Assignees”; the open selector contains a textbox named “Search assignees” and items with role option named exactly after the member username.
- [ ] Clicking the member option immediately saves the assignment and closes the selector without a separate Save action; the exact username is visible in metadata and remains after reload.
- [ ] Reopening Assignees shows the selected member without requiring another search; clicking that option again immediately removes the assignment and closes the selector so the username is no longer displayed as an assignee.

### REQ-5-4 Close or Reopen an Issue

- [ ] The detail page offers a “Close issue” button when Open and a “Reopen issue” button when Closed; activating either immediately saves the change without an additional confirmation.
- [ ] Closing displays Closed status and a “Closed issue” activity, and reopening displays Open status.
- [ ] After reopening and reload the “Close issue” button is available again.
- [ ] On the separate protected issue, the Read viewer sees neither close nor reopen button; hiding both controls is required, in addition to rejecting unauthorized requests.

### REQ-1-3 Change Account Password

- [ ] The security form has uniquely labeled password inputs “Current password”, “New password”, and “Confirm password”, and a button “Update password”; submitting an empty current-password field must display the visible application message “Current password is required”.
- [ ] A failure with an incorrect current password and confirmation “does-not-match” must display the corresponding current-password or confirmation error and leave the old credentials usable.
- [ ] If the current password is incorrect, the new password is noncompliant, the confirmation does not match, or any field is missing, the system displays the reason in the corresponding field and does not modify the credentials; the applicable visible message is “Current password is incorrect”, “Password confirmation does not match”, or “Current password is required”.

### REQ-2-2-4 Remove a Member from an Organization

- [ ] Remove a Member from an Organization Remove a Member from an Organization Open the organization's “People” link to read member usernames.
- [ ] Each removable member has a button named “Member menu <username>”; it opens the menuitem “Remove from organization”, followed by the confirmation button “Remove”.
- [ ] A non-Owner viewing the same member has no member-menu button and no Remove from organization menuitem, rather than merely a disabled control.

### REQ-3-2-2 Fork a Repository into Another Namespace

- [ ] Fork a Repository into Another Namespace Fork a Repository into Another Namespace The source overview has a button “Fork”.
- [ ] The fork form contains a field labeled “Repository name” and button “Create fork”; it defaults to the signed-in user's personal namespace and an allowed visibility, permitting submission after editing only the name.
- [ ] Success opens a heading containing the new fork name and visible text “Forked from <source repository name>” with a source link; the heading and source relationship survive reload.

### REQ-4-3-1 List and Switch Repository Branches

- [ ] Matching branch options or the “No matching branch” state update as the user types in the branch textbox; pressing Enter or activating a separate search button is not required.
- [ ] The selector is a unique button named “Branch <current branch name>”; it opens a textbox named “Find branch” and selectable items with role option whose exact accessible names are the branch names.
- [ ] Selecting the target immediately updates the button's branch name and shows a link with the exact target-only file name.

### REQ-5-1-1 List and Filter Repository Issues

- [ ] Users can filter by Open/Closed, title or body keywords, and labels; when the user types in the issue search box, the matching issue rows update without requiring Enter or a separate search button.
- [ ] “Open” and “Closed” are links, not buttons or tabs.
- [ ] A unique searchbox named “Search issues” filters as the user types, including when the entire seeded title is entered.

### REQ-6-2-4 Create a Draft Pull Request

- [ ] Create a Draft Pull Request Create a Draft Pull Request A visible draft comparison entry offers a Create draft pull request button, which opens the form containing Title and optional Description fields and one Create draft pull request submit button.
- [ ] Successful creation visibly shows Draft and a present but disabled Merge pull request button.
- [ ] The PR author is signed in and has opened the detail page of a Draft PR they created titled Draft onboarding update, using source branch draft-feature and target branch main; the page displays the “Ready for review” button and no review has yet been submitted.

### REQ-6-5 Merge an Eligible Pull Request

- [ ] A blocked PR keeps a visible disabled Merge pull request button and explains its unmet review or protection condition before any click.
- [ ] The blocked PR targets a protected branch and lacks the required valid approval; its disabled button is accompanied by Review required by branch protection.
- [ ] If any condition is unsatisfied or persistence fails, the page explains the applicable reason and neither the target branch nor PR changes; a missing required approval displays “Review required by branch protection”.

### REQ-2-1-1 Browse Organization Repositories

- [ ] Browse Organization Repositories Browse Organization Repositories The organization page presents “Repositories” as a navigation link, visually usable as a tab, and a textbox labeled “Find a repository”.
- [ ] Each result has a link named exactly with the repository name, and opens a heading displaying “organization name/repository name”.

### REQ-3-3 View a Public Repository Overview

- [ ] View a Public Repository Overview View a Public Repository Overview The repository overview identifies the repository in a heading containing “owner/repository name”, displays a visible “Public” marker for a public repository, and provides a navigation link “Code”.
- [ ] A seeded public repository with its matching name and stable address is readable without sign-in and retains the same heading after reload.

### REQ-4 Code and Version Control

- [ ] These accounts sign in through the home-page “Sign in” link, the “Username or email” and “Password” fields, and the “Sign in” button; the signed-in username is visible before opening the target repository entry.
- [ ] Unless a narrower scope is explicitly given below, each named control is unique on the active page, and field and option names refer to accessible names.

### REQ-4-2-1 View Repository Commit History

- [ ] The repository and file pages each expose one history link named “Commits” (a commit count may accompany the visible label without introducing another matching link).
- [ ] Seed history includes a known commit message and author, displayed in full as distinct readable text values, and a relative timestamp containing “ago”.

### REQ-5-2-3 Comment on an Issue Discussion

- [ ] The comment editor is labeled “Comment”, and its submit button is named exactly “Comment”.
- [ ] For whitespace-only text the Comment button may either be disabled or remain enabled and display “Comment is required” when activated.

### REQ-5-3-2 Apply Labels to an Issue

- [ ] The sidebar has a button named “Labels”, opening options whose exact accessible names are the current repository's label names.
- [ ] Clicking its option immediately saves the association and closes the picker, without requiring a separate Save button; the label name is visible on the detail page and remains after reload.

### REQ-5-3-3 Assign Issues and Pull Requests to a Milestone

- [ ] The settings icon is a button named “Milestone”, and selectable items have role option with the exact milestone name as their accessible name.
- [ ] Clicking the option immediately saves the association and closes the picker with no separate confirmation or save action; the exact milestone name remains visible after reload.

### REQ-6 Change Review and Merge Control

- [ ] Each named action, field, and navigation link is unique on its active page unless explicitly repeated per changed line or reviewer.
- [ ] Signed-in scenarios begin with the unique Sign in link on the home page, labeled Username or email and Password fields, a Sign in button, and the account username visible after authentication; each role account has a username, verified email, and password.

### REQ-6-1 Protect Branches with Review and Status-Check Requirements

- [ ] The rule form opens from the Add branch protection rule button and contains a field labeled Branch name pattern (an exact branch name, with no wildcard semantics), checkboxes named Require 1 approval and Require status check test, and a Create button; an existing rule uses Save changes.
- [ ] On the PR detail page, the Checks area is available on arrival, displays test: pending initially, and offers the Admin a combobox named test status with a clickable option named success and a Save button.

### REQ-6-2-2 Compare Branches Before Opening a Pull Request

- [ ] The comparison page has native select controls with combobox roles named base and compare; each option's visible label is its exact branch name.
- [ ] Selecting the same branch in both fields immediately displays No changes and disables the creation button, without requiring Compare changes to be clicked first.

### REQ-6-2-3 Create a Pull Request from Comparison Results

- [ ] Its Create pull request button opens a form with a field labeled Title, an optional Description field, and a single Create pull request submit button; the comparison-page action is no longer a competing active button.
- [ ] Successful submission shows the entered title as the exact PR heading and visible Open status, and the title survives reload.

### REQ-6-3-1 View Pull Request Overview and Commits

- [ ] A seeded public Open PR is directly viewable without sign-in and displays its exact title in a heading.
- [ ] Reloading preserves the heading and usable navigation links; leaving and reopening the same visible page restores the same PR and allows the same navigation.

### REQ-6-3-2 Inspect Changed Files and Aggregate Diff

- [ ] From a visible public pull request entry, a visitor activates the Files changed link and sees the known changed file path verbatim and visible aggregate text such as 3 additions, 1 deletions.
- [ ] Each diff block displays the file path and added/deleted lines; aggregate statistics show the current PR's number of changed files and line counts in the format “<addition count> additions, <deletion count> deletions”.

### REQ-2-1 Organization Identity and Discovery

- [ ] Organization Identity and Discovery Organization Identity and Discovery The organization overview page uses the organization name as a heading; its “Repositories”, “People”, and “Teams” navigation entries have link roles even when visually styled as tabs.

### REQ-4-2-2 Inspect Commit and Revision Differences

- [ ] Opening that commit entry as a visitor displays the changed-file path as an exact text value, the “Changed files” summary, and the numeric additions/deletions summary described below, without requiring previous navigation through history. image FILE Type:

### REQ-5 Work Planning and Issue Management

- [ ] All authenticated scenarios use the home-page “Sign in” link, fields labeled “Username or email” and “Password”, and the “Sign in” button, after which the signed-in username is visible.

### REQ-5-1-2 View an Issue and Its Discussion

- [ ] View an Issue and Its Discussion View an Issue and Its Discussion An issue detail page is the read view for a uniquely numbered work item within a repository — the top displays the number, a heading whose exact accessible name is the complete title without the issue number, and visible status text “Open” or “Closed”; the body displays the complete saved description as readable text; the right side displays assignees, labels, and milestone; and the bottom displays sections or records containing “Comment” or “Activity” text over time.

### REQ-6-3-3 Add Review Comments to Changed Code Lines

- [ ] The changed-line Add comment buttons are available for direct activation without a prerequisite hover; the first such button in document order targets the first commentable changed line.

### REQ-6-3-4 Submit a Pull Request Review

- [ ] Submit a Pull Request Review Submit a Pull Request Review From the Files changed link, the reviewer activates the Review changes button to open one review form with an optional Summary field, radio controls named Comment, Approve, and Request changes, and a Submit review button.

### REQ-6-6 Close or Reopen a Pull Request Without Merging

- [ ] Close pull request immediately sets Closed without an extra confirmation dialog, then Reopen pull request immediately restores Open.
