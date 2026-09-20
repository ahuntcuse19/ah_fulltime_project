import { createServerClient } from "@/lib/supabase";
import { loadOrganizations } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { IntakeForm } from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const orgs = await loadOrganizations(createServerClient());
  return (
    <div>
      <PageTitle>Intake</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Paste a request from a coach or program lead. The intake agent turns it into a session request with status
        requested; it never allocates. Fill any highlighted field before saving, then generate the week.
      </p>
      <IntakeForm organizations={orgs.map((o) => ({ id: o.id, name: o.name, default_skill_tier: o.default_skill_tier }))} />
    </div>
  );
}
