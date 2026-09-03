# KYB Onboarding Workbench

## What this is

A thinking artifact about the information model behind KYB onboarding. Not a proposal, not a redesign, built without having seen the real product. Two seeded cases carry the argument: Acme Fabrication (one owner, one entity) and Northwind Digital (four owners in three countries, four entities, an MSB).

## The argument

The bottleneck is people rather than documents: a linear form asks one respondent for twenty things they cannot personally supply. Requirements should attach to subjects (the organisation, each legal entity, each person) and fan out as parcels to the people who can actually satisfy them. The re-request from a downstream party is a first-class object with an origin and a reason, not an error state. v2 lets the admin choose the fan-out: name the owners, and hand entity paperwork to the accountant who holds it.

## What is fake

Everything. No backend, no auth, no verification, no compliance logic. A file input records a filename. One reducer holds state; refresh resets it. Emails are event-log lines. The requirement catalog contains only what Stable Sea described; requirements tagged "assumed" in the operator view are the ones most likely to be wrong. Type and colour follow Stable Sea Terminal by request; no name, logo, shell or artwork is reproduced.

## What I would want to know

See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md); question one is the strongest objection to the model. [MODEL.md](MODEL.md) states the model without code; [DEMO_SCRIPT.md](DEMO_SCRIPT.md) is the ten-minute walkthrough.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # type-check + static build to dist/
npm run smoke    # headless Chromium against the acceptance criteria
```

The smoke script needs a Playwright Chromium (`CHROMIUM_PATH` or `PLAYWRIGHT_BROWSERS_PATH`).

Deploy: import the repo in Vercel with **Root Directory** `kyb-onboarding-workbench`; `vercel.json` supplies the rest.
