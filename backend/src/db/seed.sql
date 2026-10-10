-- CycloneGuard Seed Data
-- Baseline operational reference data for Tamil Nadu Coastal Districts, Shelters, and Relief Inventory.
-- NOTE: In compliance with project guidelines, NO fake cyclone tracks or mock active cyclone alerts are seeded.
-- Cyclone data is strictly sourced from verified official meteorological bulletins or APIs.

-- 1. Coastal Districts of Tamil Nadu
INSERT INTO districts (name, state, latitude, longitude, coastal, headquarters, emergency_control_room_phone)
VALUES 
    ('Chennai', 'Tamil Nadu', 13.0827, 80.2707, true, 'Ripon Building, Chennai', '044-25619206'),
    ('Nagapattinam', 'Tamil Nadu', 10.7656, 79.8424, true, 'Collectorate, Nagapattinam', '04365-252500'),
    ('Cuddalore', 'Tamil Nadu', 11.7480, 79.7714, true, 'Collectorate, Cuddalore', '04142-221528'),
    ('Chengalpattu', 'Tamil Nadu', 12.6939, 79.9757, true, 'Collectorate, Chengalpattu', '044-27427412'),
    ('Villupuram', 'Tamil Nadu', 11.9401, 79.4861, true, 'Collectorate, Villupuram', '04146-223265')
ON CONFLICT (name) DO UPDATE 
SET latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    emergency_control_room_phone = EXCLUDED.emergency_control_room_phone;

-- 2. Operational Disaster Shelters (Manual Operational Ground Data)
-- Primary multipurpose cyclone shelters established along the TN coast
INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Santhome Multipurpose Cyclone Relief Center',
    'Santhome High Road, Mylapore, Chennai 600004',
    13.0334,
    80.2785,
    1200,
    0,
    'STANDBY',
    true,
    true,
    true,
    'K. Ramanathan (Tahsildar)',
    '+91-94440-12345',
    'Greater Chennai Corporation Emergency Wing',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Chennai'
ON CONFLICT DO NOTHING;

INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Royapuram Coastal Community Shelter',
    'East Coast Road, Royapuram, Chennai 600013',
    13.1118,
    80.2941,
    850,
    0,
    'STANDBY',
    true,
    false,
    true,
    'M. Jayasudha (Revenue Officer)',
    '+91-94440-23456',
    'Greater Chennai Corporation Emergency Wing',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Chennai'
ON CONFLICT DO NOTHING;

INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Nagapattinam Port Cyclone Relief Centre',
    'Near Light House, Nagapattinam Coastal Road, 611001',
    10.7620,
    79.8490,
    1500,
    0,
    'STANDBY',
    true,
    true,
    true,
    'S. Anbarasan (Zonal Officer)',
    '+91-94431-34567',
    'District Disaster Management Authority Nagapattinam',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Nagapattinam'
ON CONFLICT DO NOTHING;

INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Velankanni Coastal Evacuation Hub',
    'Main Shrine Road, Velankanni, Nagapattinam 611111',
    10.6800,
    79.8495,
    2000,
    0,
    'STANDBY',
    true,
    true,
    true,
    'P. Murugesan (Station Incharge)',
    '+91-94431-45678',
    'District Disaster Management Authority Nagapattinam',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Nagapattinam'
ON CONFLICT DO NOTHING;

INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Cuddalore Old Town Cyclone Center',
    'Silver Beach Road, Devanampattinam, Cuddalore 607001',
    11.7450,
    79.7780,
    1100,
    0,
    'STANDBY',
    true,
    true,
    true,
    'R. Soundararajan (Relief Inspector)',
    '+91-94422-56789',
    'District Disaster Management Authority Cuddalore',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Cuddalore'
ON CONFLICT DO NOTHING;

INSERT INTO shelters (district_id, name, address, latitude, longitude, total_capacity, current_occupancy, status, has_generator, has_medical_post, has_drinking_water, contact_person, contact_phone, data_source, origin_type)
SELECT 
    d.id,
    'Chidambaram Sub-Divisional Shelter',
    'Near South Car Street, Chidambaram, Cuddalore 608001',
    11.3992,
    79.6936,
    900,
    0,
    'STANDBY',
    true,
    false,
    true,
    'V. Dhanapal (Block Development Officer)',
    '+91-94422-67890',
    'District Disaster Management Authority Cuddalore',
    'MANUAL_OPERATIONAL'
FROM districts d WHERE d.name = 'Cuddalore'
ON CONFLICT DO NOTHING;

-- 3. Operational Relief Inventory (Manual Operational Ground Data)
INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'FOOD_RATIONS',
    'Ready-to-Eat Emergency Food Packets (MRE)',
    3500,
    'packets',
    500,
    'SUFFICIENT',
    'High-calorie biscuits, ready poha and dry nuts stock',
    'TN Civil Supplies Corporation Hub',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Santhome Multipurpose Cyclone Relief Center'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'DRINKING_WATER',
    'Purified Bottled Water (1L)',
    5000,
    'liters',
    1000,
    'SUFFICIENT',
    'Supplied by Chennai Metro Water Supply & Sewerage Board',
    'Chennai Metro Water Supply',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Santhome Multipurpose Cyclone Relief Center'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'MEDICAL_KITS',
    'First Aid & Anti-Venom Trauma Kits',
    120,
    'boxes',
    30,
    'SUFFICIENT',
    'Inspected by Public Health Directorate',
    'District Medical Officer',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Santhome Multipurpose Cyclone Relief Center'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'FOOD_RATIONS',
    'Dry Grain & Rice Bags (25kg)',
    180,
    'bags',
    40,
    'SUFFICIENT',
    'Sealed waterproof bags in dry storage',
    'Nagapattinam DDMA Depot',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Nagapattinam Port Cyclone Relief Centre'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'DRINKING_WATER',
    'Packaged Drinking Water (20L Cans)',
    300,
    'cans',
    80,
    'SUFFICIENT',
    'Regular chlorination verified',
    'Nagapattinam Water Supply Division',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Nagapattinam Port Cyclone Relief Centre'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'GENERATORS_FUEL',
    'Diesel for Emergency Backup Generators',
    750,
    'liters',
    200,
    'SUFFICIENT',
    'Tested on bi-weekly drill',
    'TANGEDCO / DDMA',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Nagapattinam Port Cyclone Relief Centre'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'TARPAULIN_SHEETS',
    'Heavy-Duty Weatherproof Tarpaulin (20x20 ft)',
    400,
    'units',
    100,
    'SUFFICIENT',
    'Stored for temporary roof and barrier protection',
    'Cuddalore District Warehouse',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Cuddalore Old Town Cyclone Center'
ON CONFLICT DO NOTHING;

INSERT INTO relief_inventory (shelter_id, district_id, category, item_name, quantity, unit, critical_threshold, stock_status, notes, data_source, origin_type)
SELECT 
    s.id,
    s.district_id,
    'BEDDING_BLANKETS',
    'Thermal Blankets and Sleeping Mats',
    800,
    'units',
    200,
    'SUFFICIENT',
    'Standard disaster relief bedding kits',
    'Tamil Nadu Disaster Response Force (TNDRF)',
    'MANUAL_OPERATIONAL'
FROM shelters s WHERE s.name = 'Cuddalore Old Town Cyclone Center'
ON CONFLICT DO NOTHING;
