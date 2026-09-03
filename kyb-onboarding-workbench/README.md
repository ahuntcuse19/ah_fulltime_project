# KYB Onboarding Workbench

## What this is

A thinking artifact about the information model behind KYB onboarding. Not a proposal, not a redesign, and built without having seen the real product. Two seeded cases carry the argument by contrast: Acme Fabrication (one owner, one entity) and Northwind Digital (four owners in three countries, four entities, a money services business).

## The argument

The bottleneck is people rather than documents: a linear form asks one respondent for twenty things they cannot personally supply. Requirements should attach to subjects (the organisation, each legal entity, each person) and fan out as parcels to the people who can actually satisfy them. The re-request from a downstream party is a first-class object with an origin and a reason, not an error state.

## What is fake

Everything. No backend, no auth, no verification, no compliance logic. A file input records a filename and nothing else. State lives in one reducer and a refresh resets it to seed. Emails are lines in an event log. The requirement catalog contains only what Stable Sea described; requirements tagged "assumed" in the operator view are the ones most likely to be wrong.

## What I would want to know

See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). The first question is the strongest objection to this whole model.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # type-check + static build to dist/
npm run smoke    # headless Chromium against the acceptance criteria
```

The smoke script needs a Playwright Chromium. Point `CHROMIUM_PATH` at a Chrome binary, or let `PLAYWRIGHT_BROWSERS_PATH` resolve one.

Deploy: import the repository in Vercel and set **Root Directory** to `kyb-onboarding-workbench`. `vercel.json` supplies the build command and output directory.
