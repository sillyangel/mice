#!/bin/bash
# Script to rewrite commits to conventional commit format
# WARNING: This rewrites git history. Only use on branches that haven't been shared or after coordinating with team.

# This script uses git filter-branch to rewrite commit messages
# Run from repository root: bash docs/rewrite-commits.sh

echo "⚠️  WARNING: This will rewrite git history!"
echo "This should only be done on the offline-support branch before merging to main."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Backup current branch
git branch backup-$(date +%Y%m%d-%H%M%S)

# Set up commit message mapping
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch -f --msg-filter '
    msg=$(cat)
    
    # Skip if already has conventional commit prefix
    if echo "$msg" | grep -qE "^(feat|fix|chore|docs|style|refactor|perf|test|build|ci):"; then
        echo "$msg"
    # Convert specific commit messages
    elif echo "$msg" | grep -q "Use git commit SHA for versioning"; then
        echo "fix: use git commit SHA for versioning, fix audio playback resume, remove all streak localStorage code"
    elif echo "$msg" | grep -q "Fix menubar, add lazy loading"; then
        echo "feat: fix menubar, add lazy loading, improve image quality, limit search results, filter browse artists"
    elif echo "$msg" | grep -q "Add pagination to library/songs"; then
        echo "feat: add pagination to library/songs and remove listening streaks"
    elif echo "$msg" | grep -q "Organize documentation"; then
        echo "chore: organize documentation - move markdown files to docs/ folder"
    elif echo "$msg" | grep -q "Simplify service worker"; then
        echo "refactor: simplify service worker by removing offline download functionality"
    elif echo "$msg" | grep -q "Remove all offline download"; then
        echo "refactor: remove all offline download and caching functionality"
    elif echo "$msg" | grep -q "Update pnpm-lock.yaml"; then
        echo "chore: update pnpm-lock.yaml to match new overrides configuration"
    elif echo "$msg" | grep -q "Remove PostHog analytics"; then
        echo "chore: remove PostHog analytics and update dependencies to latest minor versions"
    elif echo "$msg" | grep -q "Merge pull request"; then
        echo "chore: $(echo "$msg" | sed "s/^Merge/merge/")"
    # Default: add chore: prefix to any other commit
    else
        first_char=$(echo "$msg" | cut -c1 | tr "[:upper:]" "[:lower:]")
        rest=$(echo "$msg" | cut -c2-)
        echo "chore: ${first_char}${rest}"
    fi
' 2025.07.31..HEAD

echo ""
echo "✅ Commits have been rewritten!"
echo "⚠️  To update the remote branch, you'll need to force push:"
echo "    git push origin offline-support --force-with-lease"
echo ""
echo "If something went wrong, restore from backup:"
echo "    git reset --hard backup-TIMESTAMP"
