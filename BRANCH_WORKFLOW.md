# Branch Workflow Quick Reference

## 🌳 Branch Structure
```
main                     ← Production (stable releases only)
  └── develop           ← Daily development (integration)
      ├── new-feature   ← New features
      └── pre-release-testing ← QA and bug fixes before production
```

---

## 🔄 Common Workflows

### Starting a New Feature
```bash
git checkout develop
git pull origin develop
git checkout new-feature
git merge develop  # Get latest changes
# Work on your feature...
git add .
git commit -m "feat: your feature description"
git push origin new-feature

# When ready, create PR: new-feature → develop
```

### Fixing a Bug in Development
```bash
git checkout develop
git pull origin develop
# Fix the bug directly in develop for small fixes, or...
# For larger fixes, use pre-release-testing branch
git checkout pre-release-testing
git merge develop  # Get latest changes
# Fix the bug...
git add .
git commit -m "fix: bug description"
git push origin pre-release-testing

# When tested, merge back to develop
git checkout develop
git merge pre-release-testing
git push origin develop
```

### Hotfix for Production (Critical Bug)
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-name
# Fix the critical bug...
git add .
git commit -m "hotfix: critical bug description"

# Merge to main (production)
git checkout main
git merge hotfix/critical-bug-name
git push origin main

# Also merge to develop to keep it in sync
git checkout develop
git merge hotfix/critical-bug-name
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-bug-name
```

### Preparing for Production Release
```bash
# 1. Merge develop into pre-release-testing
git checkout pre-release-testing
git pull origin pre-release-testing
git merge develop
git push origin pre-release-testing

# 2. Deploy to staging for QA testing
fly deploy --app spector-staging  # If you have staging

# 3. Test thoroughly
# - Install on test store
# - Test all features
# - Check webhooks
# - Verify data flow

# 4. If bugs found, fix them in bug-fix branch
git checkout bug-fix
git pull origin develop
# Fix bugs...
git add .
git commit -m "fix: pre-release bug"
git push origin bug-fix
# Merge to develop, then merge develop to pre-release-testing again

# 5. When stable, merge to main (production)
git checkout main
git pull origin main
git merge pre-release-testing
git push origin main

# 6. Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 7. Deploy to production
fly deploy --app spector

# 8. Merge main back to develop to keep in sync
git checkout develop
git merge main
git push origin develop
```

---

## 📝 Commit Message Convention

Use semantic commit messages:

```bash
feat: Add new feature
fix: Fix a bug
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
test: Add or update tests
chore: Maintenance tasks

# Examples:
git commit -m "feat: Add multi-currency support to dashboard"
git commit -m "fix: Resolve variant selection race condition"
git commit -m "docs: Update deployment guide"
```

---

## 🔖 Tagging Releases

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial production release"

# Push tag to remote
git push origin v1.0.0

# List all tags
git tag

# View tag details
git show v1.0.0

# Delete a tag (if needed)
git tag -d v1.0.0
git push origin --delete v1.0.0
```

### Version Numbering (Semantic Versioning)
- **Major**: `v1.0.0` → `v2.0.0` (breaking changes)
- **Minor**: `v1.0.0` → `v1.1.0` (new features, backward compatible)
- **Patch**: `v1.0.0` → `v1.0.1` (bug fixes)

---

## 🚨 Emergency Procedures

### Rollback Production
```bash
# Find the last stable tag
git tag

# Reset main to that tag
git checkout main
git reset --hard v1.0.0
git push --force origin main

# Deploy the rollback
fly deploy

# Fix the issue in develop, then go through normal release process
```

### Sync Develop with Main (if they diverged)
```bash
git checkout develop
git merge main
# Resolve conflicts if any
git push origin develop
```

---

## 📊 Viewing Branch Status

```bash
# See all branches
git branch -a

# See which branch you're on
git branch

# See branch differences
git diff develop..main

# See commits in develop not in main
git log main..develop

# See branch relationships (visual)
git log --oneline --graph --all
```

---

## 🧹 Cleanup

```bash
# Delete merged local branches
git branch -d branch-name

# Delete merged remote branches
git push origin --delete branch-name

# Prune deleted remote branches
git remote prune origin

# See merged branches
git branch --merged
```

---

## 💡 Best Practices

1. **Never commit directly to `main`** - Always merge from `pre-release-testing`
2. **Keep `develop` stable** - Don't push broken code
3. **Pull before push** - Always `git pull` before pushing
4. **Small commits** - Commit often with clear messages
5. **Test before merge** - Always test your changes
6. **Code review** - Use PRs for all merges to develop/main
7. **Tag releases** - Always tag production releases
8. **Document changes** - Update CHANGELOG.md

---

## 🔗 Useful Git Aliases

Add to your `~/.gitconfig`:

```ini
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = log --oneline --graph --all
    sync = !git checkout develop && git pull origin develop
```

Then use:
```bash
git st        # Instead of git status
git co main   # Instead of git checkout main
git visual    # See branch graph
```
