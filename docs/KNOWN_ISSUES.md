# Known issues — v0.1.0

First public preview, 28 October 2026. These are confirmed implementation limits
or explicitly incomplete qualification work, not claims of defects in donor repos.
GitHub issues carry the evidence and acceptance criteria; this list is the release
snapshot, while the issue state is the current source of truth.

| Priority | Issue                                                                                                                   | Release impact                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P1       | [#1 Unsupported model capabilities despite evidence IDs](https://github.com/drevendev/FrankenRepo/issues/1)             | Review generated inheritance and useful mutations; a schema pass does not establish semantic grounding.                  |
| P1       | [#2 In-memory budgets/idempotency reset on restart](https://github.com/drevendev/FrankenRepo/issues/2)                  | Local caps do not provide a durable multi-instance spending boundary.                                                    |
| P1       | [#3 Proxy visitors share a socket-IP quota bucket](https://github.com/drevendev/FrankenRepo/issues/3)                   | Review trusted-proxy handling before opening anonymous hosted generation.                                                |
| P2       | [#4 Durable records, consent/removal, gallery and permalinks](https://github.com/drevendev/FrankenRepo/issues/4)        | Results are ephemeral; file exports work, persistent public sharing is unavailable.                                      |
| P2       | [#5 Finish v4 qualification and provider attempt/usage evidence](https://github.com/drevendev/FrankenRepo/issues/5)     | Useful v4 repeat stopped at a local budget; current Cursed v4 is not rerun. Account-wide provider usage remains unknown. |
| P2       | [#6 Descriptive README excerpt selection](https://github.com/drevendev/FrankenRepo/issues/6)                            | Leading art/status text can crowd out donor mechanisms within the bounded excerpt.                                       |
| P2       | [#7 Separate configuration, recent inference and local quota states](https://github.com/drevendev/FrankenRepo/issues/7) | Readiness remains unknown for configured adapters; budget exhaustion is reported when a ritual starts.                   |
| P2       | [#8 Hosted walkthrough and broader browser/accessibility acceptance](https://github.com/drevendev/FrankenRepo/issues/8) | Source publication is not a verified deployment or finished demonstration recording.                                     |

The first [successful Linux CI run](https://github.com/drevendev/FrankenRepo/actions/runs/40603823884)
also exposed [#9 Deprecated action runtimes](https://github.com/drevendev/FrankenRepo/issues/9)
(P2): checkout/setup-node/upload-artifact v4 target Node 20 and GitHub currently
forces them onto Node 24. The app itself uses Node 24 and all checks passed;
updating the official action releases is tracked as CI maintenance.

No paid fallback, automatic evaluation campaign, hosting signup or deployment is
enabled by this release. New live model checks consume the operator's explicitly
authorized allowance and must preserve failed results as well as successful cards.
