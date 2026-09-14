---
name: mimir-deploy
description: Deploy the merged Mimir observer to Firebase Hosting and verify that the live site serves the exact built assets. Use when the user asks to deploy or republish Mimir's hosted web app.
---

# Mimir Deploy

Deploy only the merged Mimir observer from `origin/main` to Firebase Hosting.

## Required workflow

1. Work in a fresh, isolated checkout or worktree for `C:\Projects\Mimir`.
2. Run `npm run deploy:hosting` from the repository root.
3. Treat a nonzero result as a failed deployment. Do not report success based only on a successful build or push.
4. Report the deployed Firebase version, live URL, and verification result.

The script fetches `origin/main`, refuses a dirty or stale checkout, builds all workspaces, deploys only Hosting site `mimir-realm` in Firebase project `mimir-realm`, and compares the live `index.html` plus every hashed asset with the local build. This exact-asset check is the source-of-truth verification that the command deployed the checkout it built.

Do not deploy from an unmerged feature branch, the user's ordinary dirty checkout, a different Firebase project, or a manually selected stale `dist` directory. Do not include owner credentials, databases, backups, or VM operations in a Hosting deployment.

The deployment command changes external hosting state and therefore requires the user's explicit deploy request in the current conversation.
