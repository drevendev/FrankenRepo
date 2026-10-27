# Deployment preparation — nothing deployed

The local production command is npm run build followed by npm start.
Node 24 serves the UI and API together. /healthz checks the process only;
/readyz reports model configuration as unknown until a real call proves it.

## Human handoff for an authorized Render Free trial

1. Owner explicitly authorizes a remote repository/push and deployment, then
   confirms Render account access without a required card or paid upgrade.
2. Create/push the independent repository through the owner's chosen workflow.
   No remote URL is currently configured or guaranteed available.
3. Create a Node Web Service manually using npm ci && npm run build as build
   command and npm start as start command. Set NODE_ENV=production,
   HOST=0.0.0.0, Node 24 and the public site's exact API_ALLOWED_ORIGINS.
   PORT is supplied by Render.
4. Enable only an authorized and independently confirmed free Gemma endpoint.
   Keep its token server-side. Ollama loopback does not provide hosted inference
   unless an actual model service exists in that environment.
5. Review the conservative proxy-IP quota limitation in THREAT_MODEL.md before
   opening guest traffic. Keep a single instance. Confirm provider hard budget.
6. Test health, readiness, two arbitrary public donors, all three modes, quotas,
   cancellation, export and cold-start errors at the actual URL.
7. Record screenshots/response timestamps and sanitized model/deploy proof.
   Only then update partner statuses and DEV draft.

No service configuration, domain, account signup, remote publication or deployment
was performed. Render Static Site plus a separate API is an alternative future
deployment; this implementation does not yet package a Cloudflare Worker API.
Do not label the prepared adapter as a deployed Worker.

Provider API references used in implementation:
[Hono Node](https://hono.dev/docs/getting-started/nodejs),
[GitHub repository contents](https://docs.github.com/en/rest/repos/contents),
[Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs),
[Cloudflare model run](https://developers.cloudflare.com/api/resources/ai/methods/run/).
Specific account/model eligibility and live pricing remain to be checked before activation.
