# Open questions

Every point where the prototype had to guess at something only Stable Sea would know. Each entry says what the prototype assumed, so the answer can be checked against something concrete.

## Lead with this one

1. **Does per-person collection create a compliance problem, in that the attesting party is no longer a single authorized signer?** The prototype lets a Singapore UBO upload her own passport and confirm her own ownership percentage. If the regulator or the banking partner expects one officer to attest to the whole package, the fan-out has to end in a single sign-off step that the prototype does not have. This is the strongest objection to the model and the reason to raise it first.

## From the spec

2. Does the current flow branch on entity complexity at intake, or does every customer receive the same requirement set? The prototype branches on four triage questions and shows the count before anything is collected.
3. Do you know completion rates separately by complexity tier, or only in aggregate? The metrics strip splits by tier because the argument only holds if simple cases already complete and complex ones do not.
4. Are stalls concentrated at the initial submission or at the downstream re-request? The prototype counts a case as stalled at re-request if any outstanding item sits in a re-request parcel.
5. When a downstream partner comes back, is it the same request repeatedly? Which partner generates the most rework? The prototype attributes every re-request to one of three parties and keeps the reason verbatim.
6. Is the pre-warning about which documents to collate a consistent artifact today, or does it depend on who runs the onboarding call? The triage count screen is the prototype's version of that artifact.
7. Who is the admin in practice? The person who signs, the person who holds the documents, or someone else entirely? The prototype routes every organisation- and entity-level item to whoever started the case.
8. What is the real median from signed yes to first funded transaction, by tier? The prototype shows n/a until a case is funded in the session.

## Surfaced while building

9. **Eleven requirement keys are assumed, not named by Stable Sea**: legal name, EIN, registered address, business description, expected volumes, source of funds, ownership chart, local registration number, entity registered address, certificate of good standing, signing authority confirmation. Any of these can be cut without changing the model.
10. **The spec's "11 of 20 items pre-populated for a simple case" does not follow from the catalog**, which flags only 5 keys as derivable from an EIN lookup. Acme prefills 5 of 16. What does the EIN lookup actually return today?
11. **What does an EIN lookup return for non-US entities?** The prototype prefills entity registration numbers and addresses only for US entities. Northwind's Singapore, Mexico and Brazil entities start empty.
12. **Can the admin also be a beneficial owner?** The spec gives a person one role. Acme's owner is both admin and UBO so that a single-owner company gets a single parcel. If those must be different people, every simple case has two parcels.
13. **Triage never asks about officers.** A free-form triage generates owners but no officer, so `officer_authorization` is never instantiated unless the case is seeded. Should intake ask "who signs for the business?"
14. **Does a re-request supersede or duplicate an existing item?** The prototype moves an item flagged "needs more info" into the re-request parcel, keeping its history, and creates fresh items only for genuinely new asks. A bank partner asking for a certified copy of something already accepted has no clean home in either.
15. **Are parcels sent at triage confirm, or does an operator press send?** The prototype sends immediately and logs one fake email per parcel.
16. **Who gets nudged when the blocker is a downstream party?** blockedOn only lists customer-side people. A case waiting on the bank partner shows as blocked on nobody.
17. **The Singapore paper articles.** One seeded item cannot be resolved by software: the 2004 articles exist only on paper. How often does this happen, and does anyone at Stable Sea own the phone call, or does the customer?
18. **Does "operating jurisdictions" or "entity jurisdictions" drive tier?** The prototype unions both. A company operating in three countries through one entity is complex; is that right?

## Surfaced by v2 (collaborators)

19. **Does a document holder who uploads on the company's behalf need to be identified themselves?** The prototype gives an accountant or local director no items of their own. If anyone who touches the package must be KYC'd, every delegate adds three sensitive items and the fan-out gets more expensive, not less.
20. **Should the customer name delegates, or should the operator?** The prototype allows both. If only the operator may, the admin's page loses its most useful control.
21. **What happens to items already provided when a person is removed or replaced?** The prototype has no removal at all. Ownership changes mid-onboarding are real; the model needs a rule before it needs a button.
22. **Can a re-request go to a delegate?** The prototype defaults the recipient to the entity's document holder when every item in the re-request is about that entity. Whether the banking partner accepts documents from a non-officer is question 1 again in a different coat.
