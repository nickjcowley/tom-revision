# Tom's Revision Timetable – GCSE mocks, January 2027

A phone-friendly web app that plans Tom's revision from **Sun 22 Nov 2026** to the end of his mocks (**Wed 20 Jan 2027**), around school, hockey, tutors, Liverpool games and F1.

- **Today**: what's on now, with a tick for each session and red/amber/green ratings for each topic.
- **Plan**: every day at a glance. Missed sessions show ⚠️.
- **Topics**: the full topic list for every subject, taken from the exam board specifications. Tom rates each topic red, amber or green.
- **Progress**: for parents. Hours done, what's been missed or skipped, and confidence by subject.
- **More**: calendar subscription, adding new busy times, sync status, and backup.

## How the plan works

| Phase | Dates | What happens |
|---|---|---|
| Refine & make notes | 22 Nov – 5 Dec | Each subject's topics are shared out across its sessions, in spec order |
| Memorise & recall | 6 – 19 Dec | Self-testing. Topics are chosen from Tom's ratings, so **red topics come up most** |
| Practice papers | 20 Dec – 4 Jan | One timed paper for every mock paper (19 papers, including second attempts for the earliest exams). Each paper is followed by mark & correct. Spare time goes to "fix weak topics" |
| Mocks | 5 – 20 Jan | A short review the evening before each exam |

Rules built in:
- **School nights (Mon–Thu):** at most 2½ h including about 45 min of homework, finishing by 22:00.
- **Fridays:** homework only.
- **Weekends:** 3 h a day, between 11:00 and 20:30.
- **Holiday weekdays:** up to 6 h between 10:00 and 21:00, with a 3½ h free block whose timing changes day to day.
- **One subject:** no more than 1 h a day, except practice papers.
- **Days off:** Christmas Day, Boxing Day, New Year's Eve evening and New Year's Day.
- **Mock weightings:** subjects whose mocks come in the first week (5–8 Jan) get more time.

**Missed a session?** It shows as "to reschedule". Tom taps **Move** and gets a list of free slots, each marked if it would break one of his limits. He can also **Skip it**, and parents will see it was skipped.

`node tools/check-plan.mjs` checks the whole plan against every rule.

---

## Setup

### 1. Put it on GitHub Pages
1. Create a new public repository, e.g. `tom-revision`.
2. Upload every file in this folder, including the hidden `.nojekyll`.
3. Go to **Settings → Pages**. Under Source, choose *Deploy from a branch*, then `main` / root.
4. After a minute the app is live at `https://<your-username>.github.io/tom-revision/`.

### 2. Turn on syncing between phones (Firebase, free)
Without this step, each phone keeps its own progress.

1. Go to https://console.firebase.google.com, click **Add project**, name it `tom-revision`, and switch Analytics off.
2. Go to **Build → Firestore Database → Create database**. Choose the location `europe-west2 (London)` and **production mode**.
3. On the **Rules** tab, paste this and click Publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /revision/{doc} { allow read, write: if true; }
     }
   }
   ```
4. Go to **Project settings** (cog icon) → **Your apps** → the web icon `</>`. Register an app (no hosting needed) and copy the `firebaseConfig` object.
5. Paste it into `firebase-config.js` in place of `null`, and commit.

The badge at the top right changes to **● Synced**.

*Privacy:* anyone who has the link can see and tick sessions. The data is only topic ratings and ticks, nothing personal.

### 3. Calendar on Tom's phone
Open the app → **More → Subscribe on this phone**. Every session appears in his calendar with a 5-minute reminder, and the mock exams are included too.

The subscribed calendar shows the original plan. If Tom moves sessions, use **Download my current plan (.ics)** to get a copy that includes the moves.

### 4. Home screen
In Safari, tap **Share → Add to Home Screen** and it opens like an app.

---

## Changing things
Everything lives in **`data.js`**: dates, fixtures, hockey, days off, rules, subjects and topics. After editing it:
```
node tools/check-plan.mjs   # verify every rule still holds
node tools/build-ics.mjs    # refresh the calendar feed
```
Then commit. For a one-off clash, it's easier to use **More → Busy times** in the app. Anything that overlaps the new busy time gets flagged for Tom to move.

> ⚠️ Editing `data.js` can renumber sessions on the days it changes. Ticks on those days may need redoing, so make big changes before revision starts.

## Assumptions to check
- Hockey matches have 30 min of travel added either side (60 min for Stratford and Warwick).
- Weekends during the holidays use the weekend limit (3 h), not the holiday limit (6 h).
- Mon 4 Jan is treated as a holiday day.
- There's no homework during the mock fortnight.
- Delia and Dylan only happen in term time.
- Liverpool games after 2 Jan, especially Crystal Palace on 16 Jan, may change for TV. Cup ties aren't included yet; add them as busy times.
