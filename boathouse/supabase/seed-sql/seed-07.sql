insert into part (id, name, component, qty_in_stock, qty_on_order, unit_cost_cents, reorder_threshold) values
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Oarlock, Concept2'), 'Oarlock, Concept2', 'oarlock', 12, 0, 2800, 8),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Seat wheels'), 'Seat wheels', 'seat_slide', 20, 0, 900, 10),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Foot stretcher shoes'), 'Foot stretcher shoes', 'foot_stretcher', 3, 0, 9500, 4),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Rigger bolts'), 'Rigger bolts', 'rigger', 40, 0, 200, 20),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Skeg'), 'Skeg', 'fin_skeg', 0, 1, 14000, 1),
(uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'part:Hull repair kit'), 'Hull repair kit', 'hull', 2, 0, 18000, 1);
