# UIU Ride — XAMPP (PHP + MySQL) Edition

This is the **PHP + MySQL** version of UIU Ride, built specifically to
run under XAMPP's Apache and MySQL/MariaDB — the actual technologies
XAMPP provides. (XAMPP stands for **A**pache, **M**ySQL, **P**HP,
**P**erl — there's no C++ runtime in it, so PHP is the real target
here, not a compiled language.)

It's a full port of the original Python version: same database
design, same role rules (students/faculty find & join rides and post
to Community; drivers offer & manage rides with vehicle info pulled
automatically from their profile; every rule enforced server-side),
same 14-page responsive frontend. Only the backend language and
database engine changed.

---

## 1. Requirements

- **XAMPP** with Apache and MySQL/MariaDB (PHP 7.4+ bundled; PHP 8.x
  recommended — that's the default in current XAMPP releases).
- That's it. No Composer, no extra PHP extensions beyond what XAMPP
  ships with by default (`pdo_mysql` and `mbstring`, both on by
  default).

## 2. Install the project into XAMPP

1. Locate your XAMPP `htdocs` folder:
   - **Windows:** `C:\xampp\htdocs`
   - **macOS:** `/Applications/XAMPP/htdocs`
   - **Linux:** `/opt/lampp/htdocs`
2. Copy the whole `uiu-ride` folder from this zip into `htdocs`, so
   you end up with `htdocs/uiu-ride/...`.

## 3. Create the database

1. Open the **XAMPP Control Panel** and click **Start** next to both
   **Apache** and **MySQL**.
2. Open **http://localhost/phpmyadmin** in your browser.
3. Click the **Import** tab.
4. Choose the file `uiu-ride/database/schema.sql` from this project
   and click **Go**.

This creates a database called `uiu_ride` with every table (`users`,
`drivers`, `rides`, `ride_requests`, `community_posts`, etc.) already
set up — no demo data, just the schema.

*(Alternative if you prefer the command line:)*
```bash
mysql -u root -p < uiu-ride/database/schema.sql
```

## 4. Check the database credentials

Open `uiu-ride/config.php`. The defaults match a fresh XAMPP install
(`root` user, empty password):

```php
return [
    'db_host'    => '127.0.0.1',
    'db_name'    => 'uiu_ride',
    'db_user'    => 'root',
    'db_pass'    => '',
    'db_charset' => 'utf8mb4',
];
```

If you set a MySQL root password in XAMPP, update `db_pass` here.

## 5. (Optional) Add test accounts

Password for all of them is `Passw0rd!`. Run once, either way:

```bash
php uiu-ride/database/seed.php
```

or visit `http://localhost/uiu-ride/database/seed.php` in your
browser after Apache/MySQL are running.

This creates:
- `test.student@uiu.ac.bd` — student
- `test.faculty@uiu.ac.bd` — faculty
- `test.driver@example.com` — driver (Car, pre-filled vehicle info)

These are clearly test-only accounts; nothing in the app depends on
them.

## 6. Open the site

With Apache and MySQL running in the XAMPP Control Panel, go to:

```
http://localhost/uiu-ride/
```

That redirects to the login page. Register a new account or log in
with a seeded test account.

## 7. How authentication works here

Unlike the Python edition (which used bearer tokens), this PHP
edition uses **native PHP sessions** — the standard, idiomatic way to
handle logins under Apache/PHP:

- `api/auth_login.php` verifies the password with `password_verify()`
  and stores `$_SESSION['user_id']`.
- The browser gets a `PHPSESSID` cookie automatically; every
  subsequent `fetch()` call sends it back (`credentials: "same-origin"`
  in `js/api.js`), so no manual token handling is needed anywhere in
  the frontend.
- `api/auth_logout.php` destroys the session server-side.
- Passwords are hashed with PHP's `password_hash()` (bcrypt) — never
  stored in plain text.

Role permissions are still enforced **in the PHP files themselves**
(`includes/auth.php`'s `require_role()`), not just hidden in the UI —
for example `api/rides.php` rejects a driver's `GET` request (find
rides) and a student's `POST` request (offer a ride) with `403`,
regardless of what the frontend shows.

## 8. Project structure

```text
uiu-ride/
├── index.php              # redirects "/" to the login page
├── config.php             # DB credentials (edit if needed)
├── includes/
│   ├── db.php              # PDO connection + query helpers
│   ├── auth.php            # session login state, role checks, password hashing
│   ├── response.php        # JSON helpers, request validation
│   ├── rides_helpers.php   # shared ride formatting logic
│   └── community_helpers.php
├── api/                    # one PHP file per REST endpoint (see below)
├── database/
│   ├── schema.sql           # full MySQL schema — import this first
│   └── seed.php             # optional test accounts
├── pages/                  # 14 HTML pages (same as the Python edition)
├── css/                    # base / layout / components / responsive
└── js/                     # api.js, auth.js, nav.js, rides.js, driver.js,
                             # community.js, profile.js, utils.js
```

### API endpoints (`api/`)

| File | Method | Purpose |
|---|---|---|
| `auth_register.php` | POST | Create account |
| `auth_login.php` | POST | Log in |
| `auth_logout.php` | POST | Log out |
| `auth_me.php` | GET | Current user (+ driver profile) |
| `profile.php` | PATCH | Update your own profile |
| `rides.php` | GET / POST | Search rides (rider) / Offer a ride (driver) |
| `ride.php?id=` | GET / PATCH | Ride details / update status |
| `rides_mine.php` | GET | Driver's own offered rides |
| `ride_requests.php?ride_id=` | POST / GET | Request a seat / list requests (owner) |
| `requests_mine.php` | GET | Rider's own requests |
| `request.php?id=` | PATCH | Accept/reject a request (owning driver) |
| `ride_rate.php?ride_id=` | POST | Rate a completed ride |
| `community_posts.php` | GET / POST | List / create community posts |
| `community_post.php?id=` | GET | Single post + comments |
| `community_interest.php?id=` | POST | Toggle "interested" |
| `community_comment.php?id=` | POST | Add a comment |

## 9. Known limitations / important honesty note

I built and reviewed this PHP code carefully, porting each rule
one-to-one from the already-tested Python/SQLite version (same
validation, same role checks, same "every ride touches UIU Campus"
rule). **However, I do not have PHP or MySQL available in the
environment I built this in, so I was not able to actually execute
this PHP code end-to-end the way I did for the Python version** (that
one I ran and tested live with real HTTP requests). I did:

- Statically check every file for balanced braces/parens and correct
  `<?php` tags.
- Re-read every endpoint against the working Python logic it was
  ported from, line by line.
- Avoid PHP 8-only syntax so it also works on PHP 7.4+.

Please treat this as **carefully-written but not yet execution-tested
code**. When you run it, if something doesn't work, the most useful
thing you can do is copy the exact error message (check XAMPP's
Apache error log at `xampp/apache/logs/error.log` on Windows or the
Terminal if you started `php -S` manually) back to me and I'll fix it
immediately — most PHP issues at this stage would be a typo or a
column-name mismatch, not a structural problem.

## 10. If something doesn't connect

- **"Could not connect to the database"** → make sure MySQL is
  started in the XAMPP Control Panel and that you imported
  `database/schema.sql`.
- **Blank page / no error shown** → in `php.ini` (via XAMPP's
  Control Panel → Apache → Config), temporarily set
  `display_errors = On` and reload to see the actual PHP error.
- **404 on an API call** → double-check the project folder is named
  `uiu-ride` inside `htdocs`, since `js/api.js` calls `../api/...`
  relative to `pages/*.html`.

---

## Update: NID, phone, suggestions

- **Existing database?** See `database/migration_nid_number.sql` (adds `drivers.nid_number`; optionally drops the old photo / NID PDF columns). Fresh installs using `schema.sql` already have it.
- Drivers must give an NID number (10/13/17 digits) when registering (no PDF upload).
- Phone numbers must be exactly 11 digits.
- Pickup/destination fields suggest places from `js/locations.js` (edit that list to add more).

## Update: community ride proposals

- Drivers can now open the community page (shown as **Proposals** in their menu). A student/faculty post that has both a pickup and a destination is a **ride proposal**.
- Every driver sees open proposals on the driver home page ("Ride proposals from riders"). Tapping **Offer this ride** opens the offer form pre-filled; the published ride is linked to the proposal.
- Riders see the rides drivers offered under **Driver offers** on their post and can open them to request a seat.
- **Existing database?** Run `database/migration_community_proposals.sql` once (adds `rides.community_post_id`). Fresh installs using `schema.sql` already have it.
- **Driver-offer notifications:** when a driver offers a ride for a rider's proposal, the rider gets a notification. The community page shows a **Driver offers** panel (how many drivers accepted, each driver's price and vehicle type, with a *View & request* button), and the Community menu link shows a red count of new offers. Run `database/migration_notifications.sql` once on an existing database; fresh installs using `schema.sql` already include it.
- **One offer per proposal:** once a driver offers a ride for a proposal, it disappears from that driver's home page and Proposals list, and the server rejects a second offer from the same driver (other drivers still see it). If the driver cancels that ride, the proposal becomes available to them again.
