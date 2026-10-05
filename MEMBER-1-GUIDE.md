# Member 1 — Auth, Profile & Project Setup

UIU Ride is split into 4 parts, one per team member. **No file appears in more than one part**, so
when everyone uploads, there are no merge conflicts and the repository ends up with the complete project.

| Member | Part | Files | Size |
|---|---|---|---|
| 1 | Auth, Profile & Project Setup | 16 | 40 KB |
| 2 | Rider Side: Find / Join Rides & Styling | 15 | 48 KB |
| 3 | Driver Side & Core Infrastructure | 15 | 109 KB |
| 4 | Community, Notifications & Database | 15 | 41 KB |

This zip contains:
- `uiu-ride/` — **your 16 files**, already in the correct folder structure
- `MEMBER-1-GUIDE.md` — this file (do **not** upload it to GitHub)

## Your files
- `.gitignore`
- `README-XAMPP.md`
- `api/auth_login.php`
- `api/auth_logout.php`
- `api/auth_me.php`
- `api/auth_register.php`
- `api/profile.php`
- `config.php`
- `includes/auth.php`
- `index.php`
- `js/auth.js`
- `js/profile.js`
- `pages/login.html`
- `pages/profile.html`
- `pages/register.html`
- `pages/settings.html`

## You are Member 1 — you create the repository (do this FIRST)

1. On GitHub: **New repository** → name it (e.g. `uiu-ride`) → leave "Add README / .gitignore" **unticked** → Create.
2. In the repo's **Settings → Collaborators**, add Members 2, 3 and 4.
3. Unzip this file, open a terminal inside the `uiu-ride` folder, and run:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: project setup, authentication and profile"
git remote add origin https://github.com/<your-username-or-org>/<repo-name>.git
git push -u origin main
```

4. Tell the others the repository URL — they can upload only after this step.

**Prefer no command line?** Open the empty repo on GitHub → **uploading an existing file** → drag everything
*inside* the `uiu-ride` folder (not the folder itself) → **Commit changes**.

## After all 4 members have uploaded
Run `git pull` and you will have the full project. To run it, follow `README-XAMPP.md` (copy to `htdocs`,
import `database/schema.sql` in phpMyAdmin). Your part alone will not run — the pages, API and database depend
on each other — it only works once all four parts are together.
