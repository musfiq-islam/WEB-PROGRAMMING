# Member 4 — Community, Notifications & Database

UIU Ride is split into 4 parts, one per team member. **No file appears in more than one part**, so
when everyone uploads, there are no merge conflicts and the repository ends up with the complete project.

| Member | Part | Files | Size |
|---|---|---|---|
| 1 | Auth, Profile & Project Setup | 16 | 40 KB |
| 2 | Rider Side: Find / Join Rides & Styling | 15 | 48 KB |
| 3 | Driver Side & Core Infrastructure | 15 | 109 KB |
| 4 | Community, Notifications & Database | 15 | 41 KB |

This zip contains:
- `uiu-ride/` — **your 15 files**, already in the correct folder structure
- `MEMBER-4-GUIDE.md` — this file (do **not** upload it to GitHub)

## Your files
- `api/community_comment.php`
- `api/community_interest.php`
- `api/community_post.php`
- `api/community_posts.php`
- `api/notifications.php`
- `database/migration_community_proposals.sql`
- `database/migration_nid_number.sql`
- `database/migration_notifications.sql`
- `database/migration_require_driver_license.sql`
- `database/schema.sql`
- `database/seed.php`
- `includes/community_helpers.php`
- `js/community.js`
- `pages/community.html`
- `pages/post-details.html`

## Before you start
Wait until Member 1 has created the repo and pushed the first commit. You need to be added as a collaborator.

## Upload steps (command line)

```bash
git clone https://github.com/<your-username-or-org>/<repo-name>.git
cd <repo-name>
git checkout -b feature/community-and-database
```

Now copy **everything inside** this zip's `uiu-ride` folder into the cloned repo folder (merge folders if asked —
none of your files already exist there). Then:

```bash
git add .
git commit -m "Add community, notifications & database"
git push -u origin feature/community-and-database
```

On GitHub click **Compare & pull request → Create pull request → Merge**. Since no files overlap, it merges cleanly.

*(Faster option: skip the branch and push straight to `main` — run `git pull` first, then `git add .`,
`git commit`, `git push`.)*

## Upload steps (no command line)
Open the repository on GitHub → **Add file → Upload files** → drag everything *inside* the `uiu-ride` folder →
**Commit changes**. GitHub keeps the folder structure (`api/`, `js/`, `pages/` …) automatically.

## After all 4 members have uploaded
Run `git pull` and you will have the full project. To run it, follow `README-XAMPP.md` (copy to `htdocs`,
import `database/schema.sql` in phpMyAdmin). Your part alone will not run — the pages, API and database depend
on each other — it only works once all four parts are together.
