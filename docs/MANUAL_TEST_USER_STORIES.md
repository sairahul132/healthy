# Healthy Manual Test User Stories

Use this document for manual UI and acceptance testing of the deployed Healthy application.
Update the `Status`, `Tester`, and `Notes` fields after each run.

## Test Environment

- Frontend URL: `https://healthytapp.netlify.app`
- API URL: `https://healthy-0zgp.onrender.com`
- Browser:
- Tester:
- Date:
- Git commit/deployment:

## Test Accounts

| Purpose | Identifier | OTP |
|---|---|---|
| Login account 1 | `9876543210` | `123456` |
| Login account 2 | `1234567890` | `123456` |
| Share recipient 1 | `9999988888` | `098765` |
| Share recipient 2 | `4444455555` | `098765` |

## Status Values

Use one of:

- `Not run`
- `Pass`
- `Fail`
- `Blocked`

---

## US-001: Sign In With A Test Account

**As a** registered Healthy user, **I want** to sign in with my test number and static OTP, **so that** I can access my health vault.

- Status: `Not run`
- Priority: Critical
- Preconditions: The API and frontend are deployed and reachable.
- Test data: `9876543210`, OTP `123456`

### Acceptance Criteria

- [ ] Given I am on the login page, when I enter `9876543210`, then the app accepts the identifier.
- [ ] When I submit the login form, then the app displays the OTP verification step.
- [ ] When I enter `123456`, then verification succeeds.
- [ ] After verification, then I am taken to the authenticated dashboard.
- [ ] The dashboard displays a Healthy ID and does not show an authentication error.

### Manual Steps

1. Open the frontend URL.
2. Select **Login**.
3. Enter `9876543210`.
4. Submit the form.
5. Enter `123456`.
6. Submit the OTP.

- Notes:

---

## US-002: Keep The User Signed In During Navigation

**As a** signed-in user, **I want** my session to remain active while I use the app, **so that** I do not have to log in again on every page.

- Status: `Not run`
- Priority: Critical
- Preconditions: US-001 passed.

### Acceptance Criteria

- [ ] Given I am signed in, when I open Dashboard, Profile, Health, Reports, Timeline, Search, and Medicines, then the pages load without redirecting to Login.
- [ ] When I refresh an authenticated page, then the session remains active.
- [ ] When the access token expires but the refresh token is valid, then the app refreshes the session without showing a login screen.
- [ ] The browser receives and retains the `hfy_access` and `hfy_refresh` cookies after verification.
- [ ] No page displays `Not authenticated` during normal navigation.

### Manual Steps

1. Sign in with US-001.
2. Open each authenticated navigation item.
3. Refresh at least two authenticated pages.
4. Confirm the user remains signed in.

- Notes:

---

## US-003: View And Update The Health Profile

**As a** signed-in user, **I want** to view and update my profile, **so that** my health information is saved in my vault.

- Status: `Not run`
- Priority: High
- Preconditions: US-001 passed.

### Acceptance Criteria

- [ ] Given I open Profile, then the existing profile loads without an error.
- [ ] When I update name, blood group, allergies, or emergency contact, then the form accepts valid values.
- [ ] When I save the profile, then a success state is shown.
- [ ] After refreshing the page, then the saved values are still present.
- [ ] Invalid values show a useful validation message without losing existing data.

### Manual Steps

1. Open **Profile**.
2. Enter a name and blood group.
3. Add one allergy.
4. Save.
5. Refresh the page.
6. Confirm the values remain.

- Notes:

---

## US-004: Create And Use A Share Link

**As a** patient, **I want** to share selected health categories with a recipient, **so that** another person can view only the information I approve.

- Status: `Not run`
- Priority: Critical
- Preconditions: US-001 passed and the patient has at least one health category available.
- Test data: Recipient `9999988888`, OTP `098765`

### Acceptance Criteria

- [ ] Given I open Share, when I select a category and recipient `9999988888`, then the share form accepts the data.
- [ ] When I create the share, then a share link is generated.
- [ ] When I open the share link in an incognito window, then the recipient verification screen appears.
- [ ] When I enter `9999988888` and OTP `098765`, then recipient verification succeeds.
- [ ] The recipient can view only the categories granted in the share.
- [ ] The recipient cannot view ungranted categories.
- [ ] Using a different recipient number is rejected.
- [ ] Revoking the share removes recipient access on the next request.

### Manual Steps

1. Sign in as the patient.
2. Open **Share**.
3. Select one category.
4. Enter `9999988888`.
5. Create the share link.
6. Copy the link.
7. Open it in an incognito window.
8. Enter `9999988888`.
9. Enter `098765`.
10. Confirm the granted category is available.
11. Return to the patient window and revoke the share.
12. Refresh the recipient window and confirm access is removed.

- Notes:

---

## US-005: Upload And View A Health Report

**As a** signed-in user, **I want** to upload a supported health report, **so that** I can view extracted results in the app.

- Status: `Not run`
- Priority: High
- Preconditions: US-001 passed. Use a text-based PDF, TXT, or CSV file.

### Acceptance Criteria

- [ ] Given I open Reports, then the report list loads without an internal error.
- [ ] When I upload a supported file, then the upload starts successfully.
- [ ] The report progresses through its processing states.
- [ ] A completed report displays extracted results and categories.
- [ ] The report appears in Health and Timeline after processing.
- [ ] An unsupported or unreadable file fails with a clear user-facing message.

### Manual Steps

1. Open **Reports**.
2. Upload a text-based PDF, TXT, or CSV report.
3. Wait for processing to complete.
4. Open the report details.
5. Check Health and Timeline.

- Notes:

---

## US-006: Search Health Data

**As a** signed-in user, **I want** to search my reports and results, **so that** I can find health information quickly.

- Status: `Not run`
- Priority: Medium
- Preconditions: US-005 passed with at least one processed report.

### Acceptance Criteria

- [ ] Given I open Search, then the page loads without an internal error.
- [ ] When I search for a known test name, then matching results appear.
- [ ] Searching for an unknown term shows an empty state rather than an error.
- [ ] Results belong only to the signed-in user.

### Manual Steps

1. Open **Search**.
2. Search for a test name from the uploaded report.
3. Confirm the matching result.
4. Search for an unknown term.
5. Confirm the empty state.

- Notes:

---

## US-007: Log Out And Block Protected Pages

**As a** signed-in user, **I want** to log out, **so that** another person using my device cannot access my vault.

- Status: `Not run`
- Priority: Critical
- Preconditions: US-001 passed.

### Acceptance Criteria

- [ ] When I select Logout, then the session ends.
- [ ] After logout, then the app returns to the login page or public landing page.
- [ ] Opening a protected page after logout does not reveal user data.
- [ ] The API returns `401` for protected requests without a session.
- [ ] Logging in again restores access only after successful verification.

### Manual Steps

1. Sign in.
2. Select **Logout**.
3. Open Dashboard directly.
4. Confirm the protected content is unavailable.
5. Sign in again and confirm access is restored.

- Notes:

---

## Reusable Story Template

## US-XXX: [Short Story Name]

**As a** [user type], **I want** [capability], **so that** [benefit].

- Status: `Not run`
- Priority: [Critical/High/Medium/Low]
- Preconditions:
- Test data:

### Acceptance Criteria

- [ ] Given [context], when [action], then [expected result].
- [ ] Given [context], when [action], then [expected result].
- [ ] Error case: when [invalid action], then [safe and useful error].
- [ ] Security case: [unauthorized user cannot access protected data].

### Manual Steps

1. 
2. 
3. 

- Notes:

## Defect Record Template

### BUG-XXX: [Short Defect Name]

- Found in story:
- Status: `Open`
- Severity: `Blocker/Critical/Major/Minor`
- Environment:
- Request ID:
- Steps to reproduce:
  1. 
  2. 
  3. 
- Expected:
- Actual:
- Render log excerpt:
- Screenshot or recording:
- Suspected component:
- Retest result:
