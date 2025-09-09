# Repository Maintenance Guide

## 🚨 Exposed Secrets Cleanup

This repository had a security incident where secrets were exposed in the public mirror. Follow these steps to clean up:

### 1. Immediate Actions (DONE)
- ✅ **Revoke exposed Mapbox token**: Go to [Mapbox Dashboard](https://account.mapbox.com/access-tokens/) and delete the exposed token
- ✅ **Generate new token**: Create a fresh Mapbox token and store it securely in Supabase Edge Function secrets
- ✅ **Update code**: Remove hardcoded tokens from source code

### 2. Clean Git History 

The `.env` file and hardcoded Mapbox token need to be completely removed from git history in **both** repositories.

#### Option A: Using git-filter-repo (Recommended)
```bash
# Install git-filter-repo
pip install git-filter-repo

# Clone the repository fresh
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

# Remove .env file from entire history
git filter-repo --path .env --invert-paths

# Remove the specific commit that added the hardcoded token
git filter-repo --commit-callback '
if commit.message.startswith(b"Add Mapbox token"):
    commit.skip()
'

# Force push the cleaned history
git push origin --force --all
git push origin --force --tags
```

#### Option B: Using BFG Repo-Cleaner
```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env YOUR_REPO.git
java -jar bfg.jar --replace-text passwords.txt YOUR_REPO.git  # contains the exposed token

cd YOUR_REPO.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 3. Update Both Repositories

You need to clean **BOTH**:
1. **Private repository**: `tarekelali/geo-scope-pilot` 
2. **Public mirror**: `tarekelali/geo-scope-pilot-mirror`

### 4. Verify Cleanup

After cleaning:
```bash
# Search for any remaining secrets
git log --all --full-history --source --oneline -S "pk.eyJ1IjoidGFyZWtlbGFsaSIsImEiOiJjaXUzdGF2anUwMDFhMzNsMG1nZzc2OTM1In0"
git log --all --full-history --source --oneline --name-only | grep ".env"
```

Both searches should return **no results**.

### 5. Prevention

- ✅ `.env` is in `.gitignore`
- ✅ Use `.env.example` for documentation
- ✅ Store real secrets in Supabase Edge Function secrets
- ✅ Code reviews check for hardcoded credentials

## Security Best Practices

1. **Never commit secrets**: Use environment variables and secure secret management
2. **Regular audits**: Scan for exposed credentials monthly
3. **Token rotation**: Rotate API keys quarterly
4. **Access controls**: Limit repository access and use branch protection

## Mirror Workflow

The mirror is updated automatically via GitHub Actions. The workflow:
- Syncs all branches and tags from private → public
- Excludes test files and sensitive content
- Requires `MIRROR_TOKEN` with appropriate permissions

⚠️ **Important**: After cleaning git history, the next mirror sync will force-push the cleaned history to the public repository.