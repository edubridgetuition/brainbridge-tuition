# Walkthrough - Secure Firestore Database (Open Database Access Closed)

We have successfully closed the **Open Database Access** security loophole by integrating **Firebase Authentication** and writing strict **Firestore Security Rules**. This was done while maintaining a seamless, automatic, and background migration path for existing users to prevent logins from breaking.

---

## 🛠️ Changes Implemented

### 1. Firestore Security Rules
We created `firestore.rules` in the project root containing strict rules:
- **No Public Access**: Blocks all anonymous unauthenticated reads and writes.
- **Multi-Tenant Isolation**: Authenticated users can only read/write documents belonging to their specific `tenantId` (Multi-tenant partition).
- **Public Inquiries**: Anyone can write (create) an inquiry document so new students can submit inquiry forms, but only authenticated tenant staff can read or modify them.
- **Restricted Guest Session**: The `guest@edubridge.com` account is allowed to read only the specific `staff_accounts` or `parent_accounts` documents needed to perform credentials verification during login. It is completely blocked from accessing student data, fees, attendance, timetable, logs, etc.

### 2. Firebase Authentication Integration
We initialized Firebase Auth in `src/database/firebase.js` and implemented transparent helper functions in `src/database/dbService.js`:
- **Virtual Email Architecture**: Programmatically maps every user to a deterministic Firebase Auth virtual email address:
  - Tuition Owners: `owner_<tenantId>@edubridge.internal`
  - Teachers/Staff: `staff_<tenantId>_<docId>@edubridge.internal`
  - Students/Parents: `student_<tenantId>_<studentId>@edubridge.internal`
- **SuperAdmin Account Setup**: Fixed the SuperAdmin login by signing in directly as `superadmin@edubridge.internal` (using password `Super123!`), resolving the issue where the SuperAdmin dashboard displayed 0 tuition centers due to authorization mismatches.
- **Transparent Login & Auto-Upgrade Migration**:
  1. When a user submits credentials, the app attempts to sign in via Firebase Auth directly.
  2. If the user doesn't have an Auth account yet (e.g. logging in for the first time), the app logs in as a restricted Guest, checks their password against the database SHA-256 hash, and automatically calls `createUserWithEmailAndPassword` to register their Auth account in the background.
  3. Once registered, the guest session is terminated, and the user is logged into their secure personal session. Subsequent logins authenticate directly and instantly.
- **Sign Out Integration**: Modified `handleLogout` in `src/App.jsx` to call `signOutUser()` so that the Firebase Auth token is revoked when users log out.

### 3. Setup & Registration Script
We created `setup_auth.cjs` in the root of the project to initialize the master `superadmin` and `guest` accounts in Firebase Authentication.

### 4. Compilation & Native Deployment
We compiled the code and ran a full native Gradle build. The fresh native binaries are ready at:
- APK: `EduBridge.apk`
- AAB: `EduBridge.aab`

---

## 🚀 Resolution of Verification Hurdles

1. **API Key Validity Issue**:
   - The original auto-created Firebase API key was restricted or ran into propagation issues with the Google Identity Toolkit API.
   - We created a new API key (`API key 2`) in the Google Cloud Console, restricted specifically to the **Cloud Firestore API** and **Identity Toolkit API**, and updated it in the project's `.env` configuration.
2. **SuperAdmin 0 Centers Issue**:
   - Previously, the SuperAdmin was logging in with a virtual email prefix which failed the strict `isSuperAdmin()` checks in the security rules.
   - We updated `verifySuperAdminLogin` in `src/database/dbService.js` to sign in using the exact `superadmin@edubridge.internal` email, restoring full global read/write access.
