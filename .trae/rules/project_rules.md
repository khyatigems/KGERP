# Project Rules

## Mandatory Completion Review

After completing any coding task, run this review command before final handoff:

```powershell
git diff --stat; git diff --name-status; npm run build
```

If there are failures, fix them first, then re-run the same command until clean.

