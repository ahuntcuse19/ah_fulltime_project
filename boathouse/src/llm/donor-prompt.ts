// Section 9.2 prompt. The instruction is verbatim; the addressee is computed in code.

export const DONOR_INSTRUCTION =
  "Write one paragraph of 90 to 130 words addressed to the donor named, in plain language, stating how many times the boat went out this season, which programs used it, and its condition. Do not invent race results, names, or numbers not in the input. Do not use em dashes.";

export const COMMUNITY_ADDRESSEE = "the boathouse community";

/** The boat report's identity, usage and health numbers (8.3) as the model input. */
export interface DonorInput {
  identity: {
    name: string;
    asset_class: string;
    year_built: number;
    age_years: number;
    donor_name: string | null;
    owner: string;
    quality_tier: string;
    current_status: string;
  };
  usage: {
    season: string;
    session_outs: number;
    available_sessions: number;
    utilization_pct: number | null;
    fleet_median_utilization_pct: number | null;
    session_outs_by_organization: Record<string, number>;
    session_outs_by_program: Record<string, number>;
    session_outs_by_slot: Record<string, number>;
  };
  health: {
    repair_spend_dollars: number;
    repair_ratio_pct: number;
    days_off_water_this_season: number;
    damage_events: { reported_on: string; component: string; severity: string; status: string; resolved_on: string | null }[];
  };
}

export function donorAddressee(donorName: string | null): string {
  const name = donorName?.trim();
  return name ? name : COMMUNITY_ADDRESSEE;
}

export function buildDonorSystemPrompt(): string {
  return [
    DONOR_INSTRUCTION,
    "Output plain text only: one paragraph, no heading, no greeting line, no sign-off, no markdown.",
    'The input JSON is the only source of facts. "programs" means the organizations and program groups listed under usage.',
  ].join("\n");
}

export function buildDonorUserMessage(input: DonorInput, retryNote?: string): string {
  const addressee = donorAddressee(input.identity.donor_name);
  return [
    `Address the paragraph to ${addressee}.`,
    retryNote ?? "",
    "Input:",
    JSON.stringify(input, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
}
