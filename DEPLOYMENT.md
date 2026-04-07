# Deployment Guide (Railway + Vercel)

This is the fastest setup for this project:

- Backend + MySQL: Railway
- Frontend (Vite React): Vercel

## 1) Push code to GitHub

From project root:

```bash
git add .
git commit -m "Prepare project for deployment"
git push
```

## 2) Deploy backend + MySQL on Railway

1. Create a new Railway project.
2. Add a **MySQL** service.
3. Add a new service from your GitHub repo (same repo as this project).
4. In backend service settings, set:
   - Start Command: `npm run server`
5. Add environment variables in backend service:
   - `DB_HOST=${{MySQL.MYSQLHOST}}`
   - `DB_PORT=${{MySQL.MYSQLPORT}}`
   - `DB_USER=${{MySQL.MYSQLUSER}}`
   - `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
   - `DB_NAME=${{MySQL.MYSQLDATABASE}}`
   - `CLIENT_ORIGIN=https://<your-vercel-domain>`
6. Deploy and copy Railway backend public URL.
7. Test backend health:
   - `https://<railway-backend-domain>/api/health`

## 3) Deploy frontend on Vercel

1. Import the same GitHub repo in Vercel.
2. Framework preset: Vite.
3. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add frontend environment variable:
   - `VITE_API_BASE_URL=https://<railway-backend-domain>/api`
5. Deploy.

## 4) Final CORS sync

After Vercel deploy gives final URL:

1. Go back to Railway backend env vars.
2. Set:
   - `CLIENT_ORIGIN=https://<final-vercel-domain>`
3. Redeploy backend.

## 5) Quick smoke test

1. Open frontend URL.
2. Confirm dashboard loads.
3. Confirm API works via browser/network tab.
4. Upload sample faculty/schedule files and run allocation once.

## Notes

- Schema bootstrap is already handled by backend startup (`initDatabase()`), so tables are created automatically on first run.
- Keep `.env` local only. Do not push real secrets.
