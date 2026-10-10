# OIDC alternate login

When `OIDC_*` env vars are set, `mozilla_django_oidc` is added to `INSTALLED_APPS`
and `src/officehours/urls.py:33-34` skips mounting `accounts/`. `/accounts/login/`
returns 404 in that mode; use the `/admin/login/` back-door form instead.

The form is hidden behind a `<details>` disclosure — expand it first, then fill.
Labels include trailing colons; submit button reads "Log in" (two words).

```bash
agent-browser --session host open http://localhost:8003/admin/login/
agent-browser --session host find text "back door" click
agent-browser --session host find label "Username:" fill "qa_host"
agent-browser --session host find label "Password:" fill "qa_host_pw"
agent-browser --session host find role button click --name "Log in"
agent-browser --session host wait --url '**/admin/**'
agent-browser --session host open http://localhost:8003/
```

Repeat for `--session attendee` with `qa_attendee` / `qa_attendee_pw`.
