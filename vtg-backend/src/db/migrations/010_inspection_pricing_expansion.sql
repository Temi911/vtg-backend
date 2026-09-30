-- Expand VTG Product Verification pricing coverage. Values are editable by admins later.
INSERT INTO inspection_pricing_rules (country, category, service_level, min_quantity, max_quantity, buyer_fee_usd, agent_payout_usd) VALUES
('China','clothing','basic',501,NULL,55,36),
('China','bags','basic',301,NULL,60,39),
('China','electronics','standard',501,NULL,75,49),
('China','phones-tablets','standard',101,NULL,85,55),
('China','furniture','standard',51,NULL,95,62),
('China','appliances','standard',101,NULL,90,59),
('China','machinery','advanced',11,NULL,220,145),
('China','beauty','basic',1,500,40,26),
('China','auto-parts','standard',1,200,60,39),
('China','building-materials','advanced',1,100,110,72),
('South Korea','clothing','basic',501,NULL,60,39),
('South Korea','bags','basic',1,300,45,29),
('South Korea','electronics','standard',501,NULL,80,52),
('South Korea','phones-tablets','standard',1,100,75,49),
('South Korea','furniture','standard',1,50,90,59),
('South Korea','appliances','standard',1,100,85,55),
('South Korea','beauty','basic',1,500,45,29),
('South Korea','auto-parts','standard',1,200,70,46),
('South Korea','building-materials','advanced',1,100,120,78)
ON CONFLICT DO NOTHING;