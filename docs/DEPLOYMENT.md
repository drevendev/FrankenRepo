# Prepared Render Free deployment — not deployed

The source integration update is published after the challenge deadline;
see the [README timing disclosure](../README.md#post-deadline-source-update--1-november-2026).
render.yaml prepares one Free Node24
service, Frankfurt, auto-deploy off, npm ci && npm run build, npm start,
HOST=0.0.0.0 and Render's PORT. No service or public URL has been created.
[Official Blueprint fields](https://render.com/docs/blueprint-spec) and
[Free limits](https://render.com/docs/free) were checked on 31 October 2026.

The existing dashboard is accessible. The owner separately authorized committing
and pushing the guarded source update on 1 November. The `v0.1.0` tag remains the
earlier preview. Source publication does not create a Render service or authorize
the remaining network/terms actions. Do not choose paid compute from credit.

For a separately authorized future deployment:

1. Select the actual reviewed source commit and record its SHA.
2. Create the prepared Free service, one instance; no card, paid upgrade, disk
   or scheduler. Required signup/terms remain human actions.
3. Set the exact service origin and keep one generated SESSION_SECRET across
   redeploys. Server credentials never use VITE_* or enter the browser bundle.
4. Read the selected service's documented outbound ranges. Obtain required
   approval before adding only those ranges to Atlas. Never add 0.0.0.0/0.
5. Check healthz/readyz with model disabled. Then explicitly enable authorized
   Gemma and validated features. Mongo reservations must succeed before inference.
   Keep corpus/training/gallery off until their respective approval gates pass.
6. Verify actual cold start, supported modes/failures, save/reload/export,
   wrong-key denial, share consent and unpublish/delete on the actual URL.
7. Run bounded Browserbase public E2E and record deployment, traces and usage.
   Only then update public-demo/category claims.

Free services may sleep; cold-start UI preserves inputs and offers manual retry.
No keep-alive automation. Global budgets are independent of cleared cookies;
forwarding headers are ignored until a trusted proxy path is separately reviewed.

Local checks use npm run verify and built npm run test:e2e on isolated 3003.
Operator live checks use a separate explicit 3002 entry point; they do not deploy.
