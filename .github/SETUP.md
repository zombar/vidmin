# GitHub Repository Setup

This document describes the required GitHub repository settings for the automated release system to work properly.

## Required Repository Settings

### 1. Allow GitHub Actions to Create Pull Requests

The release-please workflow needs permission to create pull requests automatically.

**Steps:**
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll down to **Workflow permissions**
4. Select **"Read and write permissions"**
5. Check **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

### 2. Branch Protection (Optional but Recommended)

To ensure quality releases, consider enabling branch protection on `main`:

**Steps:**
1. Go to **Settings** → **Branches**
2. Click **Add rule** or edit the existing rule for `main`
3. Configure the following:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required status checks: `lint-and-test`
   - ✅ Require linear history (optional)
   - ✅ Include administrators (optional)

### 3. Secrets Configuration (Optional)

If you plan to sign releases or need additional authentication:

**For Code Signing:**
- `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate for macOS
- `APPLE_CERTIFICATE_PASSWORD` - Password for the certificate
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password from Apple

**For Windows Code Signing:**
- `WINDOWS_CERTIFICATE` - Base64 encoded certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

## How the Release System Works

### 1. Conventional Commits → Version Bump

When you commit to `main` with conventional commit messages:
- `feat:` → Minor version bump (0.1.0 → 0.2.0)
- `fix:` → Patch version bump (0.1.0 → 0.1.1)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (0.1.0 → 1.0.0)

### 2. Automatic Release PR

The `release-please` workflow will:
- Create/update a release PR with version bump
- Generate/update `CHANGELOG.md`
- Update `package.json` version

### 3. Merge → Release

When you merge the release PR:
- A GitHub release is created with the new version tag
- The `build-and-release` workflow triggers
- Builds are created for Windows, macOS, and Linux
- Built artifacts are uploaded to the release

## Troubleshooting

### "GitHub Actions is not permitted to create or approve pull requests"

This means step 1 above hasn't been completed. Enable the setting and re-run the workflow.

### Release builds fail

Check that:
- All tests pass (`npm test` and `npm run build`)
- Platform-specific dependencies are available
- GitHub Actions runners have necessary permissions

### No release PR created

Ensure:
- Commits use conventional commit format
- Commits are pushed to `main` branch
- Workflow permissions are correctly configured
