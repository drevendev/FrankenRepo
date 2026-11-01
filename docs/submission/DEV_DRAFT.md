---
title: I Gave Two GitHub Repositories a Terrible Idea. Then I Gave It Life.
published: true
tags: devchallenge, hf26challenge, opensource, ai
cover_image: https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/m3wx4ot9o30ws7j9t2td.png
---

_This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)._

The monster had a complaint:

> Stop trying to feed me those foreign files, I can't steer my legs properly while chewing!

One parent was a tool that digests repositories. The other was a simulated fly. Gemma had given their imaginary child a problem neither parent could have alone: eating code made it difficult to walk.

That was the moment FrankenRepo started to feel alive.

## What I Built

**FrankenRepo is a gothic laboratory where two public GitHub repositories become one very questionable monster.**

Choose a brain. Choose a body. Inspect their observable DNA. Select Useful, Cursed, or Chaotic, then pull the lever. Gemma invents a name, personality, inherited traits, a curse, first words, and a speculative useful mutation. The lab turns them into a downloadable Monster Birth Certificate.

I wanted repository discovery to feel like opening a cabinet of strange specimens. A web framework and a JSON processor become a specter suffering through nested brackets. A repository-eating crab meets a fly with simulated motor behavior. Familiar tools suddenly have a family resemblance.

The monster is fictional. The parents and their source links are real.

![FrankenRepo's gothic laboratory with donor inputs, chemistry modes, and an explicitly labelled illustrated standby specimen](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/n05lqaj122qyioi57tos.png)

_The standby creature above is original interface artwork. Model-generated certificates appear after an actual successful ritual._

## Demo

The demo follows **Flask + jq in Cursed mode** through the local browser application: inspect the donors, invoke Gemma, reveal the creature, inspect its DNA, and export a PNG. It uses the actual provider and application, with no fixture responses or replayed model result.

![Actual local Gemma ritual from donor inspection to certificate and export](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/v8xlv8tr9e6qvpkz92hr.gif)

_52-second continuous local recording, captured on 1 November before the deadline. There is no public hosted application yet._

The new creature is **The Scribe of Bracketed Sighs**. Its proposed mutation gives Flask the web server and jq the JSON-log filtering: two recognizable roles, with feasibility still left to a human.

A second real specimen, **The Scavenging Glider**, supplied the chewing complaint in the opening:

![The Scavenging Glider, a real saved Gemma result from HungryCrab and desktop-fly, with inherited traits and source IDs](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/eetb0kz0j960s6uo09i2.png)

HungryCrab supplied repository digestion; desktop-fly supplied simulated motor behavior. Gemma supplied the chewing problem. The suggested digest-to-movement integration is still speculative: a funny character can arrive before a workable adapter.

## Code

[Source and published v0.1 preview on GitHub](https://github.com/drevendev/FrankenRepo) · [Saved real-run evidence](https://github.com/drevendev/FrankenRepo/blob/main/docs/eval/REAL_RUNS.md) · [Asset credits](https://github.com/drevendev/FrankenRepo/blob/main/ASSETS_CREDITS.md)

The source is MIT licensed. Use Node 24 and npm 11:

```sh
git clone https://github.com/drevendev/FrankenRepo.git
cd FrankenRepo
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The interface opens without model credentials; generation requires an explicitly configured provider. The README explains setup. The newer persistence and orchestration work described below is a local update beyond the published v0.1 preview.

## How I Built It

The stack is TypeScript workspaces, React/Vite, Hono, and Zod. The verified model is **[Gemma 4 26B A4B IT](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)**, served through Cloudflare Workers AI as `@cf/google/gemma-4-26b-a4b-it`. Gemma writes the creature; an original deterministic SVG kit draws it. This keeps the visual style consistent and makes PNG, SVG, and alt-text exports practical.

The important design decision was giving the laboratory three distinct kinds of truth:

| Layer               | What belongs there                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Observed DNA        | Public GitHub metadata and bounded README excerpts, with source links and observed commits |
| AI interpretation   | The model's explanation of how a trait relates to those observations                       |
| Imaginary offspring | The creature's personality, curse, and proposed mutation                                   |

That separation runs through the UI and the data contract. The model can invent an anxious archivist; it cannot invent a source that proves the archivist exists.

Inspection uses fixed GitHub API endpoints, with request and response limits. FrankenRepo never clones or executes donor code. Missing observations stay unknown. README content is untrusted input, so it has no authority to change the application's tools or rules.

Gemma returns structured JSON. Zod checks its shape, and evidence validation checks that cited source IDs exist. A ritual gets at most two model calls: an initial attempt and one bounded repair, or an eligible deliberate revision. It eventually returns a result or a visible failure.

### Keeping the experiment under control

The local update adds a private MongoDB Atlas archive and durable reservations. A restart preserves consumed allowances; an unknown provider outcome keeps its reservation. Saving a card is separate from consent to publish it. Private recovery keys never belong in public URLs.

Mastra runs the donor, context, model/validation, and reveal steps. Sentry records linked agent, tool, and inference spans with model IDs, timing, and token metadata, without sending raw prompts or card text. A Browserbase research session retrieved a pinned donor paragraph that entered a real model input. These integrations have local evidence; the category entries below describe their completed scope. Public hosting remains pending.

The update passed **78 unit/contract/policy tests and 18 desktop/mobile browser tests**. Browser success fixtures test application behavior; the real Gemma receipts and recording establish provider use. They answer different questions.

### The failure that changed the project

A structurally valid creature can still make an unsupported technical claim.

One early result turned the crab-and-fly pairing into an automated bug-finding insect. The name worked. The sources supplied no mechanism for finding bugs. Source IDs existed, but the proposed connection did not follow from them.

Later, an optional Ultramarine second opinion led to a real Gemma revision using the same frozen donor snapshots. The original survived unchanged. The revised text still promised a "verified lineage report" that the evidence could not support. The plumbing worked; the idea still failed review.

That changed my acceptance criteria. I added targeted checks for the failure classes I had observed. A subsequent Useful run was rejected after its bounded repair instead of showing a substitute creature. Those checks cover specific mistakes; semantic review is still necessary.

Three Paper Instruments requests changed the observed credit balance by **$0.00108065**. Cloudflare's billed cost and Neuron consumption were not captured, so I leave them unknown. A model's opinion and a dashboard estimate both need that same discipline: say exactly what was observed.

### Seeing the ritual in Sentry

The screenshot below comes from the actual 31 October workflow: **six linked spans, a 10.92-second root, and a 7.82-second Gemma request**. Agent Activity shows the exact model, about 2K input tokens and 312 output tokens. Input and output bodies are absent by design.

![Actual Sentry Agent Activity for the 31 October FrankenRepo ritual, showing linked steps, Gemma model, tokens, latency and an empty input panel](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/7p940f2zptopdkabh05h.jpg)

_Sentry's displayed cost is an estimate, not a Cloudflare bill. The model request sits inside the Gemma/contract step, so the trace distinguishes inference time from total workflow time. A separate deliberately injected notebook timeout verified that an optional-tool failure could continue without memory; it was a diagnostic test, not an observed Backboard outage._

_Post-submission update, 1 November 2026: this screenshot and the Sentry category row were added after the challenge deadline, following permission to publish the sanitized telemetry. The underlying run was completed on 31 October. The original article and its five other category entries were published before the deadline; acceptance of this additional category is for the organizers to decide._

## Why Does Open Innovation Matter?

The open-weight model provides the central creative behavior, and the application exposes how that behavior is constrained. The prompt, schemas, provider adapters, source observations, and original artwork are inspectable. Someone can change the experiment instead of accepting an opaque personality generator.

The verified path uses hosted Gemma. An Ollama adapter also exists as a local inference option; I have not qualified it as equivalent to the hosted model. Moving inference locally would still leave live GitHub inspection dependent on the network.

Open innovation also shaped the game itself. A public project can become inspiration for something unexpected while keeping its author, purpose, and evidence visible. The imaginary child does not inherit a license grant or become a real merger of its parents' code.

## The Spirit of It

For Ghost in the Machine, I wanted the haunting to come from software's recognizable habits: a parser that cannot stop sorting, a fly that cannot stop twitching, an archivist demanding paperwork from a metaphor.

The best creature was the one whose complaint made sense once you met its parents.

So there is a large lever, a quiet music box, and a birth certificate stamped **CERTIFIED IMAGINARY**. Sound starts off; keyboard controls and reduced motion are supported.

The machine should enjoy its theatrical entrance. The evidence should survive the lights coming back on.

## Prize Categories

The following entries use completed **local** scenarios. Public application hosting is still pending.

| Category                             | What actually ran                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Best Use of Gemma**                | Source-linked creature generation and real browser exports, including the continuous demo above.                                                               |
| **Best Use of Mastra**               | The actual donor → context → Gemma/contract → reveal workflow; real run IDs, step timings, and a failed run are retained.                                      |
| **Best Use of MongoDB Atlas**        | Private save → API restart → read, wrong-key denial, consented public read → unpublish/delete, and competing durable budget reservations.                      |
| **Best Use of Browserbase**          | A real cloud browser retrieved a pinned donor README paragraph that entered a real Gemma input. This is research-context use, without a public-site E2E claim. |
| **Best Use of Ultramarine**          | Two real second opinions through the official OpenAI SDK, with recorded token usage and the credit cost reported above.                                        |
| **Best Use of Sentry Agent Tracing** | Six linked agent/tool/inference spans with model, tokens and latency; screenshot above. This category row was added after the deadline.                        |

The Browserbase context came from [HungryCrab's README at the observed commit](https://github.com/drevendev/HungryCrab/blob/9f8540b14e0059592bdf916526fdc2160390bbae/README.md), and was supplied as a separately identified browser excerpt. Ultramarine identified the missing code-to-stimulus interface in the crab/fly proposal; its own proposed fix remained an opinion. Atlas denied reads after revocation and deletion, including an attempted recreation of a deleted operation.

Public hosting, a gallery, the proposed memory corpus, and the apprentice-training experiment remain unfinished. **Render, Backboard, and Tinker are not entered.** No deployed service or trained checkpoint is claimed.

_Built with AI-assisted coding and drafting. Real model outputs are preserved as evidence; test fixtures and illustrated interface specimens are labelled separately._
