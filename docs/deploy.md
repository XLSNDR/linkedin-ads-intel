# Deploy workflow (Git + Vercel)

## Best practices

- **Secrets:** Never commit `.env`. It is in `.gitignore`. Use Vercel Environment Variables for production.
- **Commits:** Use clear, logical commits (e.g. `feat(explore): ...`, `fix: ...`). One logical change per commit when possible.
- **Branch:** This project deploys from the `main` branch to [linkedin-ads-intel-alpha.vercel.app](https://linkedin-ads-intel-alpha.vercel.app).

## Deploy to Vercel (alpha)

1. Commit your changes locally (if any).
2. Push to GitHub:
   ```bash
   git push origin main
   ```
3. Vercel will build and deploy automatically. The alpha site updates in a few minutes.

## Repo

- **GitHub:** [github.com/XLSNDR/linkedin-ads-intel](https://github.com/XLSNDR/linkedin-ads-intel)
- **Remote:** `origin` should point at the repo above. Check with `git remote -v`.
