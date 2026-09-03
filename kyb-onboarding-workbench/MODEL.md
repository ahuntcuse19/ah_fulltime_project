# The information model

This is the deliverable. The code is one implementation of it; an engineer at Stable Sea should be able to reimplement it from this page alone.

## Objects

| Object | What it is | Cardinality |
|---|---|---|
| Organization | The customer. Carries the EIN, MSB flag, and the jurisdictions it operates in. | 1 per case |
| LegalEntity | A registered company inside the organisation. | 1 or more |
| Person | A human with one or more roles: `ubo`, `officer`, `admin`, `advisor`. | 1 or more; exactly one holds `admin` |
| Requirement | A thing that can ever be asked for. Fixed catalog of 19. Each attaches to one subject kind and carries `autoPopulatable`, `sensitive`, and `provenance` (named by Stable Sea, or assumed). | fixed |
| Item | One Requirement bound to one subject inside one case, assigned to the one person who can satisfy it. | derived at intake |
| Parcel | A bundle of Items given to exactly one person under one magic link. | 1 per person with items, plus 1 per re-request |
| Case | The onboarding of one organisation. Owns its items and parcels. | 1 |
| EventLogEntry | Append-only timeline line with an actor. | many |

A **subject** is whatever an Item is about: the organisation, a legal entity, or a person. The whole model is "requirements attach to subjects; subjects have people who can answer for them."

## Three derivations

**1. Instantiation** (intake). Organisation-level requirements instantiate once, except `msb_license` (MSB only) and `ownership_chart` (two or more owners). Entity-level requirements instantiate once per entity. Person-level requirements instantiate once per person holding a subject role (`ubo`, `officer`, `admin`); `ownership_percent` only for owners, `officer_authorization` only for officers. An `advisor` is not a subject and gets no items of their own.

An item starts `prefilled_unconfirmed` only when its requirement is auto-populatable, the organisation has an EIN, the subject is the organisation or a US entity, and the registry lookup has a value. Everything else starts `not_started`.

**2. Assignment.** Person items go to that person, never to the admin. Organisation and entity items go to the subject's document holder if one has been named, otherwise to the admin. One parcel per person with at least one item.

**3. Blocked on.** Never stored. A case is blocked on every person with at least one assigned item not yet `accepted`. The console shows names, not counts, because the point is targeted chasing.

## Status machines

Item: `not_started | prefilled_unconfirmed | more_info_needed → provided → in_review → accepted`, with `provided | in_review → more_info_needed` when a reviewer sends it back. `accepted` is terminal.

Parcel status is derived from its items plus whether it was ever submitted: all accepted → `complete`; any outstanding → `in_progress` (or `sent` if nothing has been touched); everything provided or beyond → `submitted` once submitted, else `in_progress`.

Case status is derived while open: any item needing more info → `more_info_needed`; every parcel submitted or complete → `in_review`; otherwise `collecting`. `approved` and `funded` are explicit operator actions.

## The re-request

A downstream party (internal compliance, bank partner, asset manager) asking for more after a submission. It is an object, not an error: a new parcel with `isReRequest`, the party, and the reason verbatim, routed to whoever can satisfy it. It either moves items already flagged "needs more info" (history intact) or creates fresh ones. It never touches accepted items. The customer sees "One more thing from our banking partner", never "rejected".

## Invariants

- Accepted items are never reset by anything.
- Person-level items never go to the admin unless the admin is that person.
- A document holder is not a subject.
- Parcel and case status are recomputed after every item change; nothing stores them by hand.
- Every state change is an ordinary action. The seed is those actions replayed, so it cannot disagree with the rules.

## What v2 adds

Two optional fields, `Organization.delegatePersonId` and `LegalEntity.delegatePersonId`, and two actions. **Add collaborator** creates a person, instantiates their own items if they are a subject, adds the ownership chart when the owner count reaches two, moves the movable items of any subject they hold documents for out of the admin's parcel, and recomputes the tier. **Add entity** instantiates five items to the holder or admin. Both are previewed by running the real reducer and diffing, so the admin sees "Moves 5 items out of your list" before committing.
