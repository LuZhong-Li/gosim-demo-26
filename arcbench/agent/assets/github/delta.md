# github: live task page vs local snapshot

- live requirements parsed: 64
- local snapshot requirements: 64
- live-only sentences: 1048

Only sentences that exist on the live page but not in the local snapshot are listed.

## REQ-1-1-1 Register a New GitHub Account

- Register a New GitHub Account Register a New GitHub Account The registration page is the form opened by the unique link named “Create an account” from the sign-in page.
- The form contains exactly one textbox labeled “Username”, one textbox labeled “Email”, one password input labeled “Password”, one password input labeled “Confirm password”, one initially unchecked checkbox named “Agree to the terms”, and one enabled button named “Create account”.
- The username and email identify the account, while passwords must not be echoed on the page.
- The corresponding visible field message contains “Username already exists”, “Username format is invalid”, “Email format is invalid”, “Password requirements are not satisfied”, or “Agree to terms is required”, as applicable.
- Submitting several invalid fields together must show the username, email, password, and missing-terms messages together, rather than revealing only one error per submission; the submit button remains actionable so these messages can be read.
- For example, a username beginning with a hyphen, email “not-an-email”, password “short”, confirmation “different”, and unchecked terms produce these field errors and preserve the attempted username.
- A duplicate username paired with a different unused email displays “Username already exists” and retains both attempted values.
- A successful registration accepts a unique username such as “pw-user-<unique suffix>”, its “@example.test” email, and password “Valid-password-123!”; the sign-in form is immediately available, accepts that email, and the resulting signed-in username remains visible after reload. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the register a new github account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the register a new github account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the register a new github account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the register a new github account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.

## REQ-1-1-2 Sign In with an Existing Account

- REQ-1-1-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the sign in with an existing account workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.

## REQ-1-1-3 Recover Account Access Through a Verified Email

- Recover Account Access Through a Verified Email Recover Account Access Through a Verified Email The password-recovery page is opened by the link “Forgot password” on the sign-in page; the fixed code is displayed as a distinct visible text value exactly “123456”, not only embedded inside a longer instruction.
- “Email”, “Verification code”, “New password”, and “Confirm password” are associated field labels;
- “Send reset link” and “Reset password” are buttons.
- The recovery scenario uses a newly registered account, an unknown email, a compliant replacement such as “Replacement-password-456!”, and invalid code “000000”; failure leaves the registered account able to sign in with its old email/password.
- In this flow, the local system does not send email, generate a copyable reset link, or call an external verification-code service.
- If the verification code is wrong, the email is unknown, the password is noncompliant, or the confirmation does not match, the page explains the reason beside the corresponding field and does not modify any account; an incorrect verification code displays “Verification code is invalid”.
- After successful submission, the page directly displays “Password updated” and does not produce any email or link.
- REQ-1-1-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the recover account access through a verified email workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the recover account access through a verified email workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the recover account access through a verified email workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the recover account access through a verified email workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.

## REQ-1-2 Sign Out and End the Current Web Session

- The page contains exactly one button named “Account menu”; its menu contains exactly one link named “Sign out”.
- Activating it displays a dialog named “Sign out” with buttons named “Confirm sign out” and “Cancel”.
- The dialog explains that sign-out affects only the current browser session.
- Only “Confirm sign out” invalidates the session, while “Cancel” or closing the dialog retains the current session and page.
- After confirming, refresh, browser back navigation, or directly reopening a previously accessible protected account, repository, or organization page restores an unauthenticated state and displays the “Sign in” link. image FILE Type:
- REQ-1-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the sign out and end the current web session workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the sign out and end the current web session workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.

## REQ-1-3 Change Account Password

- The security form has uniquely labeled password inputs “Current password”, “New password”, and “Confirm password”, and a button “Update password”; submitting an empty current-password field must display the visible application message “Current password is required”.
- A failure with an incorrect current password and confirmation “does-not-match” must display the corresponding current-password or confirmation error and leave the old credentials usable.
- Each password-change scenario starts with its own verified account in the stated credential state and a different compliant candidate password.
- If the current password is incorrect, the new password is noncompliant, the confirmation does not match, or any field is missing, the system displays the reason in the corresponding field and does not modify the credentials; the applicable visible message is “Current password is incorrect”, “Password confirmation does not match”, or “Current password is required”.
- The old password remains valid and the new password must not work for sign-in.
- Seed password-change values are New-password-456! for the successful update and Required-password-789! for the missing-current-password scenario. image FILE Type:
- REQ-1-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the change account password workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the change account password workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the change account password workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- The page displays the required headings, controls, values, and status for the change account password workflow.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: account alice-dev, email alice.dev@example.test, password Valid-password-123!.

## REQ-2-1 Organization Identity and Discovery

- Organization Identity and Discovery Organization Identity and Discovery The organization overview page uses the organization name as a heading; its “Repositories”, “People”, and “Teams” navigation entries have link roles even when visually styled as tabs.
- The Repositories tab lists repositories owned by the organization, the People tab lists members and their Member/Owner roles, and the Teams tab lists teams.

## REQ-2-1-1 Browse Organization Repositories

- Browse Organization Repositories Browse Organization Repositories The organization page presents “Repositories” as a navigation link, visually usable as a tab, and a textbox labeled “Find a repository”.
- Filtering updates the visible results as the user types, without a separate submit action.
- Each result has a link named exactly with the repository name, and opens a heading displaying “organization name/repository name”.
- Returning with browser Back keeps the public result available; filtering by the exact private repository name never exposes its link to a visitor.
- The seed organization has a public repository and a distinct private repository inaccessible to visitors.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data includes the existing organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After returning to the organization page or refreshing it, the filtered results still do not reveal unauthorized repositories; if the visitor opens the private repository from the visible repository list, the system requires sign-in or displays that access is not permitted.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the browse organization repositories workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The page displays the required headings, controls, values, and status for the browse organization repositories workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-1-2 Create an Organization After Authentication

- Create an Organization After Authentication Create an Organization After Authentication The account-menu link “Your organizations” opens a page with the link “New organization”.
- Its form has fields labeled “Organization name” and “Display name” and a button “Create organization”.
- The new overview uses a heading containing the organization identifier, which remains after reload.
- Submitting an existing identifier must show “Organization name already exists” even when the display name is also missing; it must not navigate to a heading for the existing organization.
- The malformed identifier “-invalid-organization” and a whitespace-only display name are rejected with the applicable field error.
- Seed data supplies a verified creator and an existing organization identifier for the duplicate case.
- The applicable visible message is “Organization name already exists”, “Organization name format is invalid”, or “Display name is required”.
- REQ-1-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user enters organization identifier mobile-guild, a display name Mobile Guild, and clicks “Create organization”.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create an organization after authentication workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The page displays the required headings, controls, values, and status for the create an organization after authentication workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create an organization after authentication workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The page displays the required headings, controls, values, and status for the create an organization after authentication workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-2-1 Create an Organization Team

- Create an Organization Team Create an Organization Team The organization overview has a “Teams” link; that page has a “New team” link opening the field “Team name” and button “Create team”.
- A unique compliant name can be submitted without a description or parent.
- The resulting team heading contains its name and remains visible after reload.
- Seed data supplies an organization and an account with Owner permission.
- A team page is the detail page for a grouping of accounts within an organization, titled “organization name/team name”; the Members tab displays the team's direct members, and Settings is used to change the parent team.
- The system stores the team identifier, owning organization, name, optional description, optional parent team, creator, and timestamp; if the team name is missing, malformed, duplicated, the parent team does not belong to the current organization, or creation fails, no team is generated.
- A malformed team name displays “Team name format is invalid”.
- REQ-2-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create an organization team workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The page displays the required headings, controls, values, and status for the create an organization team workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-2-2 Manage Organization Team Members and Hierarchy

- The team maintainer in these scenarios is an organization Owner.
- The team page has links “Members” and “Settings”.
- On Members, the button “Add member” opens a textbox labeled “Username” and the submit button “Add member”; only the current step's Add member button is exposed as an actionable match.
- After adding, the member's complete username is visible once in the member list, alongside a button named “Remove <username>”.
- Activating this removal button immediately removes that member without a second confirmation step, and reload keeps the username absent.
- Settings contains a native select with combobox role labeled “Parent team”, whose option labels are team names, and a button “Save”.
- The original parent remains selected after a rejected change and reload.
- The cycle scenario supplies a team with an existing parent and a descendant selectable by name; submitting that descendant shows the cycle error rather than saving it.
- The seed record's original-parent value identifies the stored selection, which may differ from its display label.
- The membership scenario supplies a current organization member not yet in this team.
- A rejected cycle displays “Cyclic team hierarchy is not allowed”.
- REQ-2-2-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The member is bob-reviewer and the team is frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-2-3 Directly Add a User as an Organization Member

- Directly Add a User as an Organization Member Directly Add a User as an Organization Member The organization overview opens “People” through a link.
- Its button “Add member” opens the labeled field “Username or email”, a combobox “Role” defaulting to Member, and a submission button “Add member”.
- Opening Role exposes clickable options “Member” and “Owner”.
- If the opening button remains present, the form submission button follows it in page order.
- The successful People list displays the full target username and Member role, with no Pending or Awaiting state; reload preserves the row.
- On duplicate or unknown-account failure, keep the form open so the username can be corrected and resubmitted; the existing member's complete username appears only once in the People list.
- A separately signed-in new member sees the organization identifier as complete visible text in Your organizations, while an ungranted private repository shows “Access denied”.
- The scenarios provide an Owner, a registered nonmember, a different existing member, an unknown username, and a private organization repository with no direct or team grant to the new member.
- For an existing member, unknown account, unsupported role, or persistence failure, the system displays the reason and does not change the membership relationship; an existing member displays “Account is already a member”, and the unknown username unknown-reviewer displays “Account not found”.
- REQ-2-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the directly add a user as an organization member workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The page displays the required headings, controls, values, and status for the directly add a user as an organization member workflow.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-2-4 Remove a Member from an Organization

- Remove a Member from an Organization Remove a Member from an Organization Open the organization's “People” link to read member usernames.
- Each removable member has a button named “Member menu <username>”; it opens the menuitem “Remove from organization”, followed by the confirmation button “Remove”.
- Successful removal makes the complete username absent from People immediately and after reload.
- A non-Owner viewing the same member has no member-menu button and no Remove from organization menuitem, rather than merely a disabled control.
- Each independent scenario starts with that member present; the non-Owner is an ordinary organization member.
- REQ-2-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The attempted descendant is frontend-child and the original parent is platform-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-2-3 Grant Repository Access to People and Teams

- Grant Repository Access to People and Teams Grant Repository Access to People and Teams From the repository's “Settings” link, open the “Manage access” link and activate “Add people or teams”.
- The picker presents a textbox “Search”, a matching selectable team option whose name contains the team name, a combobox “Role” with clickable role options including “Write”, and an “Add” button.
- While the picker is active, hide the opening Add people or teams button from the active view so the submit action is unambiguous.
- After saving, the authorization list visibly shows the exact team name and Write role and retains the team after reload.
- Existing grants appear as rows whose accessible names include the subject name; each row contains a native select labeled “Role” and a “Save” button.
- Selecting the option labeled “Read” and saving replaces Write; after reload exactly one row for the team remains and contains Read.
- The creation scenario supplies a repository Admin and an organization team not yet granted access; the replacement scenario supplies a separate repository/team with an existing Write grant.
- In the access-subject picker, matching member or team options update as the administrator types; pressing Enter or activating a separate search button is not required before selecting an option.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.
- Seed values: organization Acme Demo, repository acme-docs, member bob-reviewer, team frontend-team.

## REQ-3-1 Search for and Locate Repositories

- Search for and Locate Repositories Search for and Locate Repositories The top global search control has searchbox role and accessible name “Search”; entering a repository name and pressing Enter displays repository results directly, without requiring an additional type-filter click.
- Each repository result has a link whose accessible name is exactly its repository name, while the result also displays its owner/name metadata.
- Clicking it opens a heading containing the repository name; reloading preserves that overview.
- A query with no matching repository displays “No results”, including when the visitor returns home and repeats the same query.
- Seed data provides a named public repository and a private repository inaccessible to visitors; searching the private name exposes no result link for it.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the search for and locate repositories workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-3-2-1 Create a Repository with Owner, Visibility, and Initialization Options

- The signed-in workspace provides a “New repository” link.
- The form labels are “Owner”, “Repository name”, and “Description”; the signed-in user's personal namespace is selected by default, so it is possible to submit without changing the owner.
- Visibility choices are radio controls “Public” and “Private”; initialization is a checkbox “Add a README file”; submission uses the button “Create repository”.
- Other defaults must allow duplicate-name and empty-name validation without further input.
- A successful initialized private repository shows a heading containing the new name, a visible Private marker, and a README file link; the overview persists after reload.
- The optional description “Repository created by Playwright” is saved when entered.
- An existing repository in this same default personal namespace is supplied for duplicate validation, which stays on the form and does not open the existing repository heading.
- REQ-1-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create a repository with owner, visibility, and initialization options workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the create a repository with owner, visibility, and initialization options workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create a repository with owner, visibility, and initialization options workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the create a repository with owner, visibility, and initialization options workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-3-2-2 Fork a Repository into Another Namespace

- Fork a Repository into Another Namespace Fork a Repository into Another Namespace The source overview has a button “Fork”.
- The fork form contains a field labeled “Repository name” and button “Create fork”; it defaults to the signed-in user's personal namespace and an allowed visibility, permitting submission after editing only the name.
- Seed data supplies a readable source, a user allowed to create personal repositories, and an existing fork name in that namespace for the conflict case.
- Success opens a heading containing the new fork name and visible text “Forked from <source repository name>” with a source link; the heading and source relationship survive reload.
- The fork conflict seed uses the existing name acme-docs-fork in the target personal namespace. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the fork a repository into another namespace workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the fork a repository into another namespace workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-3-2-3 Copy a Repository Clone Value

- Copy a Repository Clone Value Copy a Repository Clone Value The clone popover is opened by a button “Code”, separate from the repository navigation link of the same name.
- Protocol controls are tabs “HTTPS” and “SSH”, and the selected clone value has a button “Copy clone value”.
- The HTTPS clone value uses the HTTPS protocol; the SSH clone value uses the selected SSH format, including the colon and .git suffix.
- Both must identify the current repository.
- With browser clipboard permission, copying writes the selected complete value, displays “Copied”, and leaves the repository heading visible.
- Seed data provides a visitor-readable public repository; clipboard permission is a browser precondition.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays brief “Copied” feedback for the selected protocol, keeps the repository heading visible, and leaves repository files, commit history, and visibility unchanged.
- The scenario does not inspect any page entry value.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the copy a repository clone value workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the copy a repository clone value workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-3-3 View a Public Repository Overview

- View a Public Repository Overview View a Public Repository Overview The repository overview identifies the repository in a heading containing “owner/repository name”, displays a visible “Public” marker for a public repository, and provides a navigation link “Code”.
- This link is distinct from the clone-menu Code button.
- A seeded public repository with its matching name and stable address is readable without sign-in and retains the same heading after reload.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-3-4 Change Repository Visibility with Permission Checks

- Open the repository's “Settings” link and then its “General” link to reach Danger Zone.
- The visibility action is a button “Change visibility”; the confirmation flow provides a “Public” radio and a button “Confirm visibility”.
- Selecting Public and activating Confirm visibility completes the change without requiring the repository name to be retyped or any additional mandatory field.
- A non-Admin collaborator must not see the Change visibility button, including when a Settings link is available.
- Seed data supplies an Admin, a distinct non-Admin collaborator, and a currently private repository containing public-ready content.
- After successful confirmation, a visible Public marker appears, and an unauthenticated visitor reopening the same address sees its repository heading.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is public repository acme-docs, private repository secret-research, owner alice-dev.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the change repository visibility with permission checks workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- The page displays the required headings, controls, values, and status for the change repository visibility with permission checks workflow.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: public repository acme-docs, private repository secret-research, owner alice-dev.

## REQ-4 Code and Version Control

- Seed data for read-only scenarios consists of public repositories and directly openable repository, file, and commit pages; visitors need not sign in to browse files, history, diffs, code search, or existing branches.
- Write scenarios provide separate existing contributor accounts with Write or higher permission on their target repositories and an unprotected writable branch; default-branch scenarios provide an Admin and a separate readable non-Admin account.
- These accounts sign in through the home-page “Sign in” link, the “Username or email” and “Password” fields, and the “Sign in” button; the signed-in username is visible before opening the target repository entry.
- Unless a narrower scope is explicitly given below, each named control is unique on the active page, and field and option names refer to accessible names.

## REQ-4-1 Browse Repository Files and Directories

- Seed data includes a known directory on the default branch, a known text file immediately inside it, and its expected content.
- The directory and file entries are links whose exact accessible names are their respective directory and file names.
- Clicking them in order opens the saved text, with the expected content visible as a complete text value; reloading that file page retains the same branch, path, and content. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-2-1 View Repository Commit History

- The repository and file pages each expose one history link named “Commits” (a commit count may accompany the visible label without introducing another matching link).
- Seed history includes a known commit message and author, displayed in full as distinct readable text values, and a relative timestamp containing “ago”.
- Opening the branch history directly from the repository must show these values without first selecting a file-specific scope. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-2-2 Inspect Commit and Revision Differences

- A seeded commit has an accessible commit entry, a known changed-file path src/search.ts, and a readable parent revision.
- Opening that commit entry as a visitor displays the changed-file path as an exact text value, the “Changed files” summary, and the numeric additions/deletions summary described below, without requiring previous navigation through history. image FILE Type:
- REQ-4-2-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-2-3 Search Code Within a Repository

- The repository page and search results expose one searchbox named “Search”; after Enter, a unique link named “Code” selects code results.
- This results-type link must remain distinguishable from repository navigation so the active search page has only one Code link.
- Path and language filters are optional, and an unfiltered search can immediately open a result link whose exact accessible name is the matching file name.
- Seed data provides the known query search flow, a matching file README.md with that query visible as a complete text value, and the absent query no-such-token, which does not occur in searchable code.
- Opening the matching file shows that text; refreshing preserves the file context, text, and a link named exactly after the file.
- For the absent query, show “No code results” and retain the exact query in Search.
- Returning to the repository and repeating the same search produces the same empty state without stale matches. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the search code within a repository workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The page displays the required headings, controls, values, and status for the search code within a repository workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the search code within a repository workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The page displays the required headings, controls, values, and status for the search code within a repository workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-3-1 List and Switch Repository Branches

- Matching branch options or the “No matching branch” state update as the user types in the branch textbox; pressing Enter or activating a separate search button is not required.
- The selector is a unique button named “Branch <current branch name>”; it opens a textbox named “Find branch” and selectable items with role option whose exact accessible names are the branch names.
- Seed data includes active branch main, target branch feature-search containing the file main-only.md absent from main, and an unknown search term matching no branch.
- Selecting the target immediately updates the button's branch name and shows a link with the exact target-only file name.
- Escape closes the selector; for an unmatched search it preserves the original active branch before and after reload. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The page, branch selector, and file list all switch to feature-search, and the known file displays the content from that branch; the selector can list both main and the target branch and marks the current branch.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-3-2 Create a Branch from an Existing Revision

- As the user types, a valid unused name displays the “Create branch: <name>” option without requiring Enter or a separate search action, while an invalid name immediately displays “Invalid branch”.
- The selector and “Find branch” textbox use REQ-4-3-1's roles.
- For a valid unused name, the creation entry has role option and accessible name “Create branch: <name>”.
- Its displayed base defaults to the current branch head; selecting this option performs creation and switches branches without a second mandatory confirmation.
- Reloading the resulting page entry keeps the newly created branch selected.
- In particular, entering invalid..branch immediately shows “Invalid branch” and cannot create a reference; generated valid names such as pw-branch-<unique suffix> follow the same rules. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create a branch from an existing revision workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The page displays the required headings, controls, values, and status for the create a branch from an existing revision workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-3-3 Change the Repository Default Branch

- “Settings” and “Branches” are unique links on their respective pages;
- “Default branch” is a native HTML select element exposing the combobox role, with options labeled by exact existing branch names; selecting an option must use the native selection behavior.
- The administrator selects a different seeded branch, activates the “Update” button, and then the “Confirm” button in the confirmation dialog.
- Opening the repository page entry without a branch then shows “Branch <new default branch name>”; opening that selector still offers an option named exactly after the old default branch.
- A non-Admin may have Settings or Branches links hidden or may open a read-only settings page, but no “Default branch” combobox or default-branch update button is rendered for that user; a merely disabled editable selector is insufficient. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and release, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and release, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and release, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-4-4 Manage Repository Files Through the Web Interface

- An invalid path displays “Invalid file path”, and an empty commit message displays “Commit message is required”.
- From the writable Code page, the unique “Add file” button opens the “Create new file” menuitem.
- The editor has a field labeled “File name”, a textbox named “File contents”, an initially empty field labeled “Commit message”, and a “Commit changes” button.
- Creating a unique file such as pw-file-<unique suffix>.md with nonempty text and a message such as Add <file name> immediately opens a view displaying the exact saved content.
- Its “Commits” link opens history displaying the exact submitted message.
- Submitting ../invalid.md with content must not be saved and no commit message reports the invalid path and/or required message and changes neither files nor history.
- The example content is ordinary text, not a forbidden content value by itself; rejection follows from the invalid path or missing message. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the manage repository files through the web interface workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- The page displays the required headings, controls, values, and status for the manage repository files through the web interface workflow.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, branches main and feature-search, file README.md, commit Document search flow.

## REQ-5 Work Planning and Issue Management

- For issue operations, the explicit role lists in this module define eligibility per operation rather than an implicit cumulative grant from a role's name;
- Write can create, edit, and comment but cannot assign, label, set milestones, or change status.
- Organization Owners act with Admin permission.
- Read-only seed scenarios provide a public repository's visible Issues entry, distinct Open and Closed issues with known titles, and an issue entry with known title, description, metadata, and discussion.
- Mutation scenarios provide isolated issues for successful editing, invalid-title editing with a known original title, commenting, comment validation, assignment, labels, milestone, and closing; their initial states must not be changed by another scenario.
- The author and commenter accounts have Write or higher permission; the editor used for both content and metadata operations has Maintain or Admin permission.
- A separate viewer has Read permission on a protected issue.
- All authenticated scenarios use the home-page “Sign in” link, fields labeled “Username or email” and “Password”, and the “Sign in” button, after which the signed-in username is visible.
- Named controls below are unique on the active page unless a narrower scope is stated; detail pages and reloads must work independently of earlier list navigation.

## REQ-5-1-1 List and Filter Repository Issues

- Users can filter by Open/Closed, title or body keywords, and labels; when the user types in the issue search box, the matching issue rows update without requiring Enter or a separate search button.
- Filtering does not create or modify work items.
- “Open” and “Closed” are links, not buttons or tabs.
- A unique searchbox named “Search issues” filters as the user types, including when the entire seeded title is entered.
- Each result title is a link whose exact accessible name is the title.
- Open plus the known open title shows that issue and continues to show it after reload;
- Closed plus the known closed title shows the closed issue and excludes the open issue.
- State and keyword filters combine, and refreshing retains the chosen filter context and matching results.
- The seeded closed issue title is Legacy welcome text. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-1-2 View an Issue and Its Discussion

- View an Issue and Its Discussion View an Issue and Its Discussion An issue detail page is the read view for a uniquely numbered work item within a repository — the top displays the number, a heading whose exact accessible name is the complete title without the issue number, and visible status text “Open” or “Closed”; the body displays the complete saved description as readable text; the right side displays assignees, labels, and milestone; and the bottom displays sections or records containing “Comment” or “Activity” text over time.
- The seeded open issue title is Improve onboarding and its description is Describe the onboarding improvement.
- REQ-5-1-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the view an issue and its discussion workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The page displays the required headings, controls, values, and status for the view an issue and its discussion workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the view an issue and its discussion workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The page displays the required headings, controls, values, and status for the view an issue and its discussion workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-2-1 Create a Repository Issue

- “New issue” is a link on the Issues page.
- The creation form has fields labeled “Title” and “Description” and a “Submit new issue” button.
- A successful submission displays a heading named exactly after the entered title and the exact saved description; reopening the Issues page entry shows a title link with the same exact name.
- A title containing only three spaces is treated as blank; clicking Submit new issue displays “Title is required” and creates no issue, even if the optional description is empty. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create a repository issue workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The page displays the required headings, controls, values, and status for the create a repository issue workflow.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-2-2 Edit an Issue Title and Description

- Edit an Issue Title and Description Edit an Issue Title and Description Only a signed-in user with Write, Maintain, or Admin may use the unique buttons named “Edit issue title” and “Edit issue description” on an issue detail page.
- “Edit issue title” opens a form with a textbox labeled “Issue title” and a button named “Save issue title”;
- “Edit issue description” opens a form with a textbox labeled “Issue description” and a button named “Save issue description”.
- Saving title and description are separate actions; after both saves and reload, the title heading has exactly the new title as its accessible name and the exact new description is visible.
- The invalid-edit seed is a separate issue with the original title Original issue title; replacing its title with three spaces and activating “Save issue title” shows “Title is required”, and reloading restores the original title heading.
- REQ-5-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-2-3 Comment on an Issue Discussion

- The comment editor is labeled “Comment”, and its submit button is named exactly “Comment”.
- After submission the complete comment text and author username are visible, and the saved comment remains after reload.
- Discussion and activity entries use article semantics so an invalid submission cannot add an article; existing entries remain stable across reload.
- For whitespace-only text the Comment button may either be disabled or remain enabled and display “Comment is required” when activated.
- Neither path adds a comment or activity.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-3-1 Assign or Unassign Issue Participants

- Matching assignee options update as the user types in the search textbox; pressing Enter or activating a separate search button is not required before selecting an option.
- The settings icon is a button named “Assignees”; the open selector contains a textbox named “Search assignees” and items with role option named exactly after the member username.
- Seed data provides an eligible member not initially assigned to the target issue.
- Clicking the member option immediately saves the assignment and closes the selector without a separate Save action; the exact username is visible in metadata and remains after reload.
- Reopening Assignees shows the selected member without requiring another search; clicking that option again immediately removes the assignment and closes the selector so the username is no longer displayed as an assignee.
- Historical assignment and unassignment activities remain historical records.
- REQ-5-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-3-2 Apply Labels to an Issue

- The sidebar has a button named “Labels”, opening options whose exact accessible names are the current repository's label names.
- Seed data provides an existing label not yet applied to the target issue.
- Clicking its option immediately saves the association and closes the picker, without requiring a separate Save button; the label name is visible on the detail page and remains after reload.
- Reopening and selecting the same option removes the association.
- REQ-5-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-3-3 Assign Issues and Pull Requests to a Milestone

- The settings icon is a button named “Milestone”, and selectable items have role option with the exact milestone name as their accessible name.
- Seed data provides a selectable milestone belonging to the current repository and an issue not yet associated with it.
- Clicking the option immediately saves the association and closes the picker with no separate confirmation or save action; the exact milestone name remains visible after reload.
- REQ-5-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-5-4 Close or Reopen an Issue

- The closable seed issue starts Open.
- The detail page offers a “Close issue” button when Open and a “Reopen issue” button when Closed; activating either immediately saves the change without an additional confirmation.
- Closing displays Closed status and a “Closed issue” activity, and reopening displays Open status.
- After reopening and reload the “Close issue” button is available again.
- On the separate protected issue, the Read viewer sees neither close nor reopen button; hiding both controls is required, in addition to rejecting unauthorized requests.
- REQ-5-1-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.
- Seed values: repository acme-docs, issue Improve onboarding, labels bug and documentation, milestone Q3 launch.

## REQ-6 Change Review and Merge Control

- The following REQ-6 interaction contracts use English accessible names and apply to direct navigation as well as navigation from a repository.
- Each named action, field, and navigation link is unique on its active page unless explicitly repeated per changed line or reviewer.
- PR titles are headings whose accessible name is exactly the persisted title; list titles are links with that same exact name.
- Conversation, Commits, Files changed, and Checks are navigation links, even when visually styled as tabs.
- The current PR status is visible text.
- Signed-in scenarios begin with the unique Sign in link on the home page, labeled Username or email and Password fields, a Sign in button, and the account username visible after authentication; each role account has a username, verified email, and password.
- Visitor scenarios use public repositories and require no session.
- Seed records identify the corresponding pages, not to private implementation interfaces; role accounts, branches, PRs, and mutable state must be provisioned and restored independently for each scenario, including repeated and parallel runs.
- Existing titles, usernames, paths, and branch names described below are supplied as seed values and must be displayed verbatim; generated PR titles and comments may carry a unique suffix.

## REQ-6-1 Protect Branches with Review and Status-Check Requirements

- The repository provides a Settings link followed by a Branches link.
- The rule form opens from the Add branch protection rule button and contains a field labeled Branch name pattern (an exact branch name, with no wildcard semantics), checkboxes named Require 1 approval and Require status check test, and a Create button; an existing rule uses Save changes.
- After saving and reloading, the branch name is visible verbatim with the summaries 1 approval and Require status check test.
- For a non-Admin, Add branch protection rule is absent, even if Settings or Branches remain accessible; rejecting a save alone is insufficient.
- On the PR detail page, the Checks area is available on arrival, displays test: pending initially, and offers the Admin a combobox named test status with a clickable option named success and a Save button.
- Saving displays test: success and identifies the setter and time, and reloading preserves the result for that compare commit.
- Seed data comprises a repository Admin and a readable non-Admin account, a dedicated repository and exact branch name with no existing rule before creation, and a separate Open PR targeting protected main with its current test check initially pending. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-2-1 List and Filter Repository Pull Requests

- The public list is directly accessible to a visitor and has an Open link for the status filter; selecting it displays the seeded Open PR as a link whose exact accessible name is its title.
- Opening that link displays the same title as a heading.
- After reloading the filtered list, that Open PR remains visible; leaving the page and reopening the list, then selecting Open again, shows the same PR.
- Seed data includes this public list and a stable, uniquely titled Open PR as well as the Closed PR and author used in the filtering scenario.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the list and filter repository pull requests workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the list and filter repository pull requests workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the list and filter repository pull requests workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the list and filter repository pull requests workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-2-2 Compare Branches Before Opening a Pull Request

- New pull request is a link.
- The comparison page has native select controls with combobox roles named base and compare; each option's visible label is its exact branch name.
- Compare changes is a button.
- For a valid selection it displays the known changed file path verbatim, a Commit summary with the comparable commit count, and an enabled Create pull request button.
- Selecting the same branch in both fields immediately displays No changes and disables the creation button, without requiring Compare changes to be clicked first.
- Clicking Compare changes retains that result.
- Seed data supplies a contributor with Write permission, a public repository PR-list page entry, a base branch, a distinct compare branch ahead by at least one commit, and a known changed file.
- Separate valid comparison page entrys open the same usable creation flow with the branches already selected; these pairs have no existing Open or Draft PR at the start of each creation scenario.
- The seeded changed-file path for comparison is src/search.ts. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-2-3 Create a Pull Request from Comparison Results

- Create a Pull Request from Comparison Results Create a Pull Request from Comparison Results The valid comparison page is directly accessible to the signed-in contributor.
- Its Create pull request button opens a form with a field labeled Title, an optional Description field, and a single Create pull request submit button; the comparison-page action is no longer a competing active button.
- Successful submission shows the entered title as the exact PR heading and visible Open status, and the title survives reload.
- A title containing only spaces is rejected with Title is required and creates no PR.
- REQ-6-2-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the create a pull request from comparison results workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the create a pull request from comparison results workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-2-4 Create a Draft Pull Request

- Create a Draft Pull Request Create a Draft Pull Request A visible draft comparison entry offers a Create draft pull request button, which opens the form containing Title and optional Description fields and one Create draft pull request submit button.
- Successful creation visibly shows Draft and a present but disabled Merge pull request button.
- A dedicated ready-for-review seed PR is separate from draft creation, belongs to the supplied author, initially has no submitted reviews, and displays its title, source branch, and target branch verbatim.
- Its Ready for review button changes the same PR to Open; if confirmation is used, it is a single Confirm button.
- Afterward the Draft status marker disappears, the title and branches are unchanged, and a Ready for review activity appears;
- Open persists on reload.
- REQ-6-2-2 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The PR author is signed in and has opened the detail page of a Draft PR they created titled Draft onboarding update, using source branch draft-feature and target branch main; the page displays the “Ready for review” button and no review has yet been submitted.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-3-1 View Pull Request Overview and Commits

- A seeded public Open PR is directly viewable without sign-in and displays its exact title in a heading.
- Commits and Files changed are links; the Commits view displays a Commit summary, and the Files changed view displays a Changed files summary.
- Reloading preserves the heading and usable navigation links; leaving and reopening the same visible page restores the same PR and allows the same navigation.
- Seed data includes its stable title, description, discussion comment, and at least one comparable commit.
- REQ-6-2-3 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the view pull request overview and commits workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the view pull request overview and commits workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the view pull request overview and commits workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the view pull request overview and commits workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-3-2 Inspect Changed Files and Aggregate Diff

- From a visible public pull request entry, a visitor activates the Files changed link and sees the known changed file path verbatim and visible aggregate text such as 3 additions, 1 deletions.
- This public PR seed contains the same known changed-file path src/search.ts supplied for branch comparison, with one added file and one modified file; it requires no sign-in.
- Each diff block displays the file path and added/deleted lines; aggregate statistics show the current PR's number of changed files and line counts in the format “<addition count> additions, <deletion count> deletions”.
- REQ-6-3-1 GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-3-3 Add Review Comments to Changed Code Lines

- The changed-line Add comment buttons are available for direct activation without a prerequisite hover; the first such button in document order targets the first commentable changed line.
- Activating one opens a single editor labeled Comment with Add single comment and Start a review buttons.
- Add single comment immediately displays the exact entered body in that diff view and retains it after reload.
- Start a review displays the body and Pending review to its author immediately, retains the pending draft after reload, and does not make it public before review submission.
- Seed data supplies a non-author Write reviewer, an Open reviewable PR with at least one changed line, and a separate Open PR for the pending-comment scenario.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-3-4 Submit a Pull Request Review

- Submit a Pull Request Review Submit a Pull Request Review From the Files changed link, the reviewer activates the Review changes button to open one review form with an optional Summary field, radio controls named Comment, Approve, and Request changes, and a Submit review button.
- Selecting Approve and submitting without a summary is valid and displays Approved.
- Selecting Request changes with a summary displays Changes requested and that exact summary; the decision remains visible after reload.
- Seed data supplies a non-author Write reviewer and separate Open PRs for approval and request-changes submission, with no initial effective decision by that reviewer.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-4 Request or Remove Pull Request Reviewers

- Request or Remove Pull Request Reviewers Request or Remove Pull Request Reviewers The Reviewers button opens a picker with a textbox named Search.
- Typing an eligible username immediately reveals an option with that exact accessible name.
- Selecting the option saves the request immediately without a separate Save action, closes the picker, and displays the username in the reviewer area; it remains after reload.
- Each requested reviewer has a button named Remove followed by a space and the username; clicking it immediately removes the request and the username from that area, without a confirmation step.
- The seed PR is Open, belongs to the signed-in author, and initially has no request or submitted review from the eligible target reviewer; the target is a distinct non-author collaborator with Write or higher permission.
- Removing a request persists across reload.
- Matching reviewer options update as the user types in the search textbox; pressing Enter or activating a separate search button is not required before selecting an option.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-5 Merge an Eligible Pull Request

- Merge an Eligible Pull Request Merge an Eligible Pull Request On an eligible PR, Merge pull request and then Confirm merge are buttons; confirming displays Merged, and that state remains after reload.
- A blocked PR keeps a visible disabled Merge pull request button and explains its unmet review or protection condition before any click.
- Seed data supplies a Maintain account and separate Open PRs for success and refusal.
- The eligible PR targets protected main, has a current non-author approval and test: success, and has no conflicts.
- The blocked PR targets a protected branch and lacks the required valid approval; its disabled button is accompanied by Review required by branch protection.
- Each seed state is restored independently before reuse.
- Before confirmation, the system rereads the target branch head, current compare commit, merge-conflict state, and protection rules — there must be no valid Request changes; if the target is protected, each enabled rule requirement is enforced independently, requiring 1 valid non-author Approve for the current compare commit when Require 1 approval is enabled and requiring test success when Require status check test is enabled.
- An unprotected target has no additional approval-count or check-success requirement, but merging still requires no merge conflicts and no valid Request changes review.
- If any condition is unsatisfied or persistence fails, the page explains the applicable reason and neither the target branch nor PR changes; a missing required approval displays “Review required by branch protection”.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The user signs in as alice-dev with Valid-password-123! and follows the visible controls for the merge an eligible pull request workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The page displays the required headings, controls, values, and status for the merge an eligible pull request workflow.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- After refreshing or reopening the visible destination, the successful result remains persisted; a rejected action leaves the original state unchanged.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.

## REQ-6-6 Close or Reopen a Pull Request Without Merging

- Close or Reopen a Pull Request Without Merging GitHub Collaboration Platform Core Requirements This product is a simplified GitHub collaboration platform.
- Unless an atomic requirement explicitly allows more than one role, every quoted user-interface name is the exact English accessible name of the control; the role, scope, and observable-state rules stated by each atomic requirement are authoritative.
- Values described as existing accounts, organizations, teams, repositories, branches, files, commits, issues, milestones, pull requests, reviews, and permission relationships are predefined seed data.
- The application must provision those records before the corresponding scenario and supply each account through an isolated browser session; they are not extra features that a participant must expose through a private API.
- Generated names may contain a unique suffix, but their role, ownership, visibility, and relationships are exactly those stated in the atomic requirement.
- Every atomic requirement remains enabled even when seed configuration is incomplete.
- All write operations must be persisted on the server, checked against the current session and target-object permission, and completed atomically.
- Organization Owner, repository Admin, Read, Triage, Write, Maintain, and Admin permissions follow the operation-specific rules in the requirements below; these roles are not an automatic cumulative ladder.
- Real-time collaboration, Actions, Packages, Wiki, project boards, notification delivery, and external Git remote protocols are outside the scope of this product.
- Close or Reopen a Pull Request Without Merging The PR page provides Close pull request and Reopen pull request as buttons for authorized users.
- Close pull request immediately sets Closed without an extra confirmation dialog, then Reopen pull request immediately restores Open.
- After reload, Close pull request is available again.
- For a viewer who is neither author nor Maintain/Admin/Owner, both controls are absent, rather than merely disabled or rejected after activation.
- Seed data supplies the author and a separate Read viewer, an authored Open PR for the close/reopen cycle, and a separate Open PR readable by that viewer for permission validation.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The seeded data is pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Seed values: pull requests Improve onboarding and Fix search, branches main and feature-search, reviewer bob-reviewer, check test.
- Run Run history Latest saved submission Ready to run 2026/9/30 05:32:41 arc-agent-r33 Model deepseek-v4-flash Execution A run is in progress arc-agent-r14-fixed PENDING Open run details Run latest submission Create new submission
