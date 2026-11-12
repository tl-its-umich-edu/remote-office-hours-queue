---
name: qa-browser
description: |
  Drive the locally-running Remote Office Hours Queue app at http://localhost:8003 with the
  agent-browser CLI to QA code changes. Use when the user asks to "QA the app", "smoke test",
  "test in browser", "verify the queue flow", or "drive localhost:8003". Bootstraps two test
  users (qa_host, qa_attendee) via docker compose, smoke-checks all 8 React routes, runs the
  multi-session host/attendee WebSocket flow, and tears the test users down — even on failure.
allowed-tools:
  - Bash(agent-browser:*)
  - Bash(docker compose:*)
  - Bash(docker:*)
  - Bash(curl:*)
  - Bash(mkdir:*)
  - Bash(rm:*)
  - Bash(.claude/skills/qa-browser/scripts/*)
  - Read
---

# qa-browser — local end-to-end QA for Remote Office Hours Queue

Goal: catch regressions in this Django + React + Channels-WebSocket app before they reach a PR. The high-value bugs hide in the real-time host/attendee handoff, so this skill always runs the multi-session flow, not just page-by-page smoke checks.

**Assume the app is already built and running** in its docker-compose stack with the web service responding on `http://localhost:8003`. If it isn't, stop and tell the user — don't try to start it.

For agent-browser CLI semantics (ref staleness, wait modes, snapshot syntax), defer to the version-matched reference: `agent-browser skills get core --full` and `agent-browser <cmd> --help`. This skill assumes `agent-browser` v0.27.0+ from Homebrew. If `agent-browser doctor` reports anything missing, run `agent-browser doctor --fix`. If Chrome isn't installed yet, run `agent-browser install`.

## Installation

If you don't have agent-browser CLI yet, set up via Homebrew (macOS/Linux):

```bash
brew install agent-browser
agent-browser install        # Download Chrome and dependencies
agent-browser doctor          # Verify everything is ready
```

For latest docs and platform-specific instructions, see [agent-browser.dev](https://agent-browser.dev/). Requires Node.js (auto-installed by Homebrew).

## Project-specific operating notes

1. **No `data-testid` exists in this codebase.** Prefer `find role`, `find label`, `find text`, or `@eN` refs from `snapshot -i`. CSS-selector chains depending on bootstrap class names break on theme changes.
2. **Two sessions, two browsers.** Host actions run under `--session host`, attendee actions under `--session attendee`. Isolated cookies, tabs, and refs.
3. **Real-time UI is WebSocket-driven.** Use `wait --text`, `wait --url`, or `wait @ref` — never `wait <ms>`. The point of the multi-user flow is to verify the WebSocket push reaches the other session.
4. **Snapshot before asserting on text you didn't author.** If you're unsure of an exact button label or alert string, run `snapshot -i` rather than guessing. Labels in this skill that say "discover via snapshot" are intentionally not hardcoded.
5. **Teardown runs even on failure.** Use `trap '.claude/skills/qa-browser/scripts/teardown.sh' EXIT`, or call it as your final action regardless of pass/fail.

---

## Step 1 — Preflight

`artifacts/` must be empty or nonexistent at the start of a run, so the user knows everything in it came from this session. If anything's there, stop and ask the user before deleting — it may be from another tool or a prior run they haven't reviewed.

```bash
agent-browser doctor
curl -fsS http://localhost:8003/ >/dev/null || { echo "App not reachable at :8003 — aborting"; exit 1; }
[ -d artifacts ] && [ -n "$(ls -A artifacts)" ] && { echo "artifacts/ is non-empty — confirm with user before continuing"; exit 1; }
mkdir -p artifacts/multi
```

`artifacts/` is gitignored, so screenshots from this run won't be staged accidentally.

## Step 2 — Bootstrap test users (idempotent)

```bash
export QUEUE_ID=$(.claude/skills/qa-browser/scripts/bootstrap.sh)
echo "QUEUE_ID=$QUEUE_ID"
```

The script reuses the `User`/`Queue` idiom from `src/officehours_api/management/commands/create_first_queue_for_host.py` and is safe to re-run. Both users are `is_staff = True` so they can reach `/admin/login/` if needed.

If you're driving steps across multiple Bash tool calls (each a new shell), `export QUEUE_ID=...` won't persist. Either inline `QUEUE_ID=<n>` at the top of each call, or wrap steps 1–6 in a single shell invocation with the `trap` from step 6.

## Step 3 — Log both sessions in

In local dev (no `OIDC_*` env vars), `/accounts/login/` shows username/password fields directly and redirects to `http://localhost:8003/` on success. Snapshot as of 2026-05-15:

```
- textbox "Username" [required]
- textbox "Password" [required]
- button "Login"
- link "Lost password?"
```

```bash
# Host session
agent-browser --session host open http://localhost:8003/accounts/login/
agent-browser --session host find label "Username" fill "qa_host"
agent-browser --session host find label "Password" fill "qa_host_pw"
agent-browser --session host find role button click --name "Login"
agent-browser --session host wait --url 'http://localhost:8003/'

# Attendee session (parallel browser, isolated cookies)
agent-browser --session attendee open http://localhost:8003/accounts/login/
agent-browser --session attendee find label "Username" fill "qa_attendee"
agent-browser --session attendee find label "Password" fill "qa_attendee_pw"
agent-browser --session attendee find role button click --name "Login"
agent-browser --session attendee wait --url 'http://localhost:8003/'
```

If `/accounts/login/` returns 404, OIDC is configured — see [references/oidc_login.md](references/oidc_login.md) for the `/admin/login/` back-door form.

## Step 4 — Single-page smoke recipes

Pulled from the route table in `src/assets/src/containers/app.tsx`. For each route, navigate, wait for network idle, screenshot, and check `errors --json` for JS console issues.

| Page | URL | Session | Expected on the page |
|---|---|---|---|
| Home | `/` | host | "Office Hours Queue" header / search controls |
| Add queue | `/add_queue` | host | Name + Description form fields |
| Manage list | `/manage` | host | row containing `qa_smoke_queue` |
| Manage queue | `/manage/$QUEUE_ID` | host | "Add Attendee" form, "Meetings in Progress" / "Attendees in Queue" sections |
| Queue settings | `/manage/$QUEUE_ID/settings` | host | Name field prefilled with `qa_smoke_queue` |
| Attendee queue view | `/queue/$QUEUE_ID` | attendee | "Join Queue" button |
| Search | `/search/` | attendee | search input |
| Preferences | `/preferences` | attendee | phone-number field |

Recipe template (substitute `$ROUTE`, `$SESSION`, `$NAME`). Two batch quirks to know:
- `batch` argument-mode treats each quoted string as a full command. Do **not** pass JSON arrays — that form is stdin-only.
- `screenshot --annotate <path>` doesn't tokenize correctly inside `batch`. Run screenshot as a separate call (use `--annotate` standalone if you want the legend).

```bash
agent-browser --session "$SESSION" batch --bail \
  "open http://localhost:8003$ROUTE" \
  "wait --load networkidle"
agent-browser --session "$SESSION" screenshot "artifacts/$NAME.png"
agent-browser --session "$SESSION" errors --json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); errs=d['data']['errors']; print(f'{len(errs)} error(s)'); [print(' -', e['text']) for e in errs[:3]]"
```

Caveat: the in-bundle errors counter accumulates across navigations and `errors --clear` is a no-op in current agent-browser. Treat the count as cumulative within a session, not per-page. The repeated "Failed to fetch" errors come from the external `umich.edu/apis/umconsentmanager/consentmanager.js` script in `src/assets/src/containers/app.tsx` (the `umConsentManager` block) — environment, not a regression. Real regressions show up as new error text on top of that floor.

## Step 5 — Multi-user flow (the high-value test)

This is the recipe that justifies the skill. Two sessions exchange state over Channels WebSockets at `/ws/queues/<id>/` and `/ws/users/<id>/` (see `src/assets/src/services/sockets.ts`). Run it strictly in order.

```bash
# 5a. Host opens the queue manager and waits.
agent-browser --session host open "http://localhost:8003/manage/$QUEUE_ID"
agent-browser --session host wait --load networkidle
agent-browser --session host screenshot artifacts/multi/01-host-empty.png

# 5b. Attendee opens the public queue page and joins.
# The queue defaults to "In Person" backend; no backend change needed.
agent-browser --session attendee open "http://localhost:8003/queue/$QUEUE_ID"
agent-browser --session attendee wait --load networkidle
agent-browser --session attendee find role button click --name "Join Queue"
# After joining, attendee heading becomes "You are currently in line." (not "You are at position").
agent-browser --session attendee wait --text "You are currently in line."
agent-browser --session attendee screenshot artifacts/multi/02-attendee-joined.png

# 5c. Host should see the attendee appear via WebSocket — no fixed sleep.
agent-browser --session host wait --text "qa_attendee"
agent-browser --session host screenshot artifacts/multi/03-host-sees-attendee.png

# 5d. Host starts the meeting.
# Trailing-space caveat: "Ready for Attendee" and "Remove Meeting with" buttons append
# `attendee.first_name + " " + attendee.last_name` to their aria-label. With no display
# name set (as bootstrapped), the accessible name ends in two spaces. agent-browser's
# pointer click resolves it but React's synthetic-event handler doesn't fire — use eval.
# Expect `null` as the eval return value (click() returns void); verify via 5e, not the return.
agent-browser --session host eval "document.querySelector('[aria-label*=\"Ready for Attendee\"]')?.click()"
# No reliable host-side wait — "Meetings in Progress" heading is always present. Verify via 5e.
agent-browser --session host screenshot artifacts/multi/04-host-started.png

# 5e. Attendee should see meeting-ready state pushed via WebSocket.
# Before start: "You are currently in line." / "the host isn't quite ready for you"
# After start: heading changes to "Your meeting is in progress."
agent-browser --session attendee wait --text "Your meeting is in progress."
agent-browser --session attendee screenshot artifacts/multi/05-attendee-ready.png

# 5f. Host removes the attendee (same trailing-space caveat as 5d — use eval).
agent-browser --session host eval "document.querySelector('[aria-label*=\"Remove Meeting\"]')?.click()"
# Confirmation modal: "Remove Meeting? ... Cancel OK"
agent-browser --session host wait --text "Remove Meeting?"
agent-browser --session host find role button click --name "OK"
agent-browser --session host wait --load networkidle
agent-browser --session host screenshot artifacts/multi/06-host-removed.png

# 5g. Attendee sees they're no longer in the queue.
agent-browser --session attendee wait --text "Join Queue"
agent-browser --session attendee screenshot artifacts/multi/07-attendee-left.png
```

Pass criteria: 5c and 5e fire in under ~3s (WebSocket push latency). 5g returns the attendee to the unjoined state.

If any `wait --text` times out (default 25s), snapshot both sessions, screenshot to `artifacts/multi/FAIL-<step>.png`, and report what was actually on each page — the regression is almost certainly in the WebSocket consumer or the React reducer.

## Step 6 — Teardown (mandatory, even on failure)

If you're scripting steps 1-5 in a single shell invocation:

```bash
trap '.claude/skills/qa-browser/scripts/teardown.sh' EXIT
# ... steps 1-5 here ...
```

If you're driving steps interactively across multiple Bash tool calls, run `scripts/teardown.sh` as your final action **regardless of whether earlier steps failed**. Confirm with:

```bash
docker compose exec -T web python manage.py shell -c "from django.contrib.auth.models import User; print([u.username for u in User.objects.filter(username__in=['qa_host','qa_attendee'])])"
# expect: []
```

The `artifacts/` directory is intentionally NOT removed — leave the screenshots for the user to inspect. They can `rm -rf artifacts/` themselves.

## Report at end of run

In under 12 lines, state: preflight result, `QUEUE_ID`, routes ok/total (name any with console errors), multi-user flow pass or first failing step, artifact directories (`artifacts/`, `artifacts/multi/`), and teardown confirmation. If you suspect a regression, name the component or file; if it looks like an environment issue, say so. Don't restate what each step did.

---

## Gotchas

- **Webpack rebuilds are async.** If you're QAing right after a frontend code change, `wait --load networkidle` may not be enough — the dev server's hot reload can drop the WebSocket. If the multi-user flow is flaky right after a save, do one explicit `reload` per session before step 5.
- **Backends.** Zoom requires real credentials and Twilio requires SMS verification. The recipes above stay on the in-person backend specifically to avoid these. If you must test Zoom, mock it: `agent-browser network route '**/zoom/**' --abort` per session before navigating.
- **Cross-origin iframes** (e.g. embedded video) are silently skipped from snapshots. Don't try to assert on Zoom's UI from inside this app — it's outside agent-browser's reach.
- **SPA navigation.** Inside the React app, internal links use the router; `wait --url '<glob>'` is the right wait, not `reload`.
- **Confirmation dialogs.** agent-browser auto-dismisses `alert`/`beforeunload`. For `confirm`/`prompt` from React-Bootstrap modals, treat them as ordinary DOM and click the action button by `find role button --name`.

## When to escalate beyond this skill

- The user asks for a flow this skill doesn't cover (announcements, OTP/SMS, allowed-backends matrix, multi-host queue) — read the relevant component under `src/assets/src/components/` and write a new recipe in the same shape (snapshot → act → wait --text → screenshot).
- A regression reproduces only with real Zoom/Twilio — beyond local QA scope; tell the user.
- `agent-browser doctor` keeps failing — likely a Homebrew/Node version mismatch; suggest `brew upgrade agent-browser && agent-browser install`.
