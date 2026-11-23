# Submission screenshots

Run `npx playwright install chromium` once, then `npm run screenshots` from the project root. The browser check writes:

- `dashboard-desktop.png`
- `register-form.png`
- `asset-detail.png`
- `dashboard-mobile.png`

The isolated demonstration uses bundled illustrations and does not modify the warehouse's real data. Screenshot generation requires permission to run Chromium and a local FastAPI listener; those operations were blocked in the development environment.

## Capture through GitHub Actions

The repository includes `.github/workflows/verify.yml`. Push the source to GitHub, open **Actions → Verify app and capture screenshots**, and download the **zeelinks-screenshots** artifact from a successful run. This route captures the app on GitHub's hosted runner. No local browser installation is needed.
