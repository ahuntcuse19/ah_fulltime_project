insert into organization (id, name, type, priority_tier, default_skill_tier, annual_fee_cents) values
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'organization:Harbor Rowing Club'), 'Harbor Rowing Club', 'club', 2, 'intermediate', 1800000),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'organization:Riverside University Crew'), 'Riverside University Crew', 'college', 1, 'competitive', 3600000),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'organization:Eastside Community Rowing'), 'Eastside Community Rowing', 'community_program', 3, 'novice', 600000);
