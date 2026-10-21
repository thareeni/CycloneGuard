import axios from 'axios';
import { config } from '../config/env';

interface RoleTestOutcome {
  role: string;
  testCase: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes: string;
}

const outcomes: RoleTestOutcome[] = [];

function recordTest(role: string, testCase: string, expectedStatus: number, actualStatus: number, notes: string) {
  const passed = expectedStatus === actualStatus;
  outcomes.push({ role, testCase, expectedStatus, actualStatus, passed, notes });
  const sym = passed ? '✅' : '❌';
  console.log(`${sym} [${role}] ${testCase} -> HTTP ${actualStatus} (Expected ${expectedStatus}) | ${notes}`);
}

async function verifyAllRoles() {
  const baseUrl = `http://127.0.0.1:${config.port}`;
  console.log('================================================================');
  console.log(' CycloneGuard Role-Based Access Control (RBAC) Verification');
  console.log(` Target Server: ${baseUrl}`);
  console.log('================================================================\n');

  // ==========================================
  // 1. ADMIN (Statewide Control)
  // ==========================================
  console.log('--- 1. Testing ADMIN (Statewide Scope) ---');
  let adminToken = '';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'admin@cycloneguard.tn.gov.in',
      password: 'Admin@Cyclone2026!',
    });
    adminToken = res.data.token;
    recordTest('ADMIN', 'Authentication with PBKDF2/SHA-512', 200, res.status, `Signed token generated for ${res.data.user.email}`);
  } catch (e: any) {
    recordTest('ADMIN', 'Authentication', 200, e.response?.status || 500, e.message);
  }

  // Admin access audit logs
  try {
    const res = await axios.get(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('ADMIN', 'Access Audit Logs (/api/audit-logs)', 200, res.status, `Retrieved ${res.data.data?.length} security audit entries`);
  } catch (e: any) {
    recordTest('ADMIN', 'Access Audit Logs', 200, e.response?.status || 500, e.message);
  }

  // Admin statewide write (e.g. create item in Nagapattinam)
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Admin Emergency Rations Test',
        shelterName: 'Nagapattinam Port Cyclone Relief Centre',
        districtName: 'Nagapattinam',
        category: 'FOOD_RATIONS',
        quantity: 500,
        unit: 'packets',
        criticalThreshold: 100,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    recordTest('ADMIN', 'Statewide Inventory Write in Any District', 201, res.status, `Created item ${res.data.data?._id}`);
  } catch (e: any) {
    recordTest('ADMIN', 'Statewide Inventory Write', 201, e.response?.status || 500, e.message);
  }

  // ==========================================
  // 2. CHENNAI OFFICER (District 2 Scoped)
  // ==========================================
  console.log('\n--- 2. Testing CHENNAI OFFICER (Chennai District Scoped) ---');
  let chennaiToken = '';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'chennai.officer@cycloneguard.tn.gov.in',
      password: 'Chennai@Guard2026!',
    });
    chennaiToken = res.data.token;
    recordTest('CHENNAI_OFFICER', 'Authentication', 200, res.status, `Role: ${res.data.user.role}, Assigned: ${res.data.user.assignedDistrict}`);
  } catch (e: any) {
    recordTest('CHENNAI_OFFICER', 'Authentication', 200, e.response?.status || 500, e.message);
  }

  // Blocked from audit logs
  try {
    const res = await axios.get(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${chennaiToken}` },
    });
    recordTest('CHENNAI_OFFICER', 'Access Audit Logs (Must be Blocked)', 403, res.status, 'Allowed forbidden role!');
  } catch (e: any) {
    recordTest('CHENNAI_OFFICER', 'Access Audit Logs (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}`);
  }

  // Permitted in assigned district (Chennai)
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Chennai Municipal Relief Packets',
        shelterName: 'Santhome Multipurpose Cyclone Relief Center',
        districtName: 'Chennai',
        category: 'FOOD_RATIONS',
        quantity: 250,
        unit: 'packets',
        criticalThreshold: 50,
      },
      { headers: { Authorization: `Bearer ${chennaiToken}` } }
    );
    recordTest('CHENNAI_OFFICER', 'Write in Assigned District (Chennai)', 201, res.status, `Created item in Chennai`);
  } catch (e: any) {
    recordTest('CHENNAI_OFFICER', 'Write in Assigned District', 201, e.response?.status || 500, e.message);
  }

  // Cross-district violation attempt (Nagapattinam)
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Unauthorized Cross-District Packets',
        shelterName: 'Nagapattinam Port Cyclone Relief Centre',
        districtName: 'Nagapattinam', // Mismatch!
        category: 'FOOD_RATIONS',
        quantity: 250,
        unit: 'packets',
        criticalThreshold: 50,
      },
      { headers: { Authorization: `Bearer ${chennaiToken}` } }
    );
    recordTest('CHENNAI_OFFICER', 'Cross-District Mutation in Nagapattinam (Must be Blocked)', 403, res.status, 'Allowed cross-district write!');
  } catch (e: any) {
    recordTest('CHENNAI_OFFICER', 'Cross-District Mutation in Nagapattinam (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}: ${e.response?.data?.message}`);
  }

  // ==========================================
  // 3. NAGAPATTINAM OFFICER (District 7 Scoped)
  // ==========================================
  console.log('\n--- 3. Testing NAGAPATTINAM OFFICER (Nagapattinam District Scoped) ---');
  let nagaiToken = '';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'nagai.officer@cycloneguard.tn.gov.in',
      password: 'Nagai@Guard2026!',
    });
    nagaiToken = res.data.token;
    recordTest('NAGAI_OFFICER', 'Authentication', 200, res.status, `Role: ${res.data.user.role}, Assigned: ${res.data.user.assignedDistrict}`);
  } catch (e: any) {
    recordTest('NAGAI_OFFICER', 'Authentication', 200, e.response?.status || 500, e.message);
  }

  // Blocked from audit logs
  try {
    const res = await axios.get(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${nagaiToken}` },
    });
    recordTest('NAGAI_OFFICER', 'Access Audit Logs (Must be Blocked)', 403, res.status, 'Allowed forbidden role!');
  } catch (e: any) {
    recordTest('NAGAI_OFFICER', 'Access Audit Logs (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}`);
  }

  // Permitted in assigned district (Nagapattinam)
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Nagapattinam Coastal Water Jerricans',
        shelterName: 'Nagapattinam Port Cyclone Relief Centre',
        districtName: 'Nagapattinam',
        category: 'DRINKING_WATER',
        quantity: 1200,
        unit: 'liters',
        criticalThreshold: 200,
      },
      { headers: { Authorization: `Bearer ${nagaiToken}` } }
    );
    recordTest('NAGAI_OFFICER', 'Write in Assigned District (Nagapattinam)', 201, res.status, `Created item in Nagapattinam`);
  } catch (e: any) {
    recordTest('NAGAI_OFFICER', 'Write in Assigned District', 201, e.response?.status || 500, e.message);
  }

  // Cross-district violation attempt (Chennai)
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Unauthorized Cross-District Water',
        shelterName: 'Santhome Multipurpose Cyclone Relief Center',
        districtName: 'Chennai', // Mismatch!
        category: 'DRINKING_WATER',
        quantity: 500,
        unit: 'liters',
        criticalThreshold: 100,
      },
      { headers: { Authorization: `Bearer ${nagaiToken}` } }
    );
    recordTest('NAGAI_OFFICER', 'Cross-District Mutation in Chennai (Must be Blocked)', 403, res.status, 'Allowed cross-district write!');
  } catch (e: any) {
    recordTest('NAGAI_OFFICER', 'Cross-District Mutation in Chennai (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}: ${e.response?.data?.message}`);
  }

  // ==========================================
  // 4. PUBLIC CITIZEN (Read-Only Safety Portal)
  // ==========================================
  console.log('\n--- 4. Testing PUBLIC CITIZEN (Read-Only Mode) ---');
  let publicToken = '';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'citizen@tn.gov.in',
      password: 'Public@View2026!',
    });
    publicToken = res.data.token;
    recordTest('PUBLIC_CITIZEN', 'Authentication', 200, res.status, `Role: ${res.data.user.role}`);
  } catch (e: any) {
    recordTest('PUBLIC_CITIZEN', 'Authentication', 200, e.response?.status || 500, e.message);
  }

  // Public reading weather & shelters (Allowed)
  try {
    const res = await axios.get(`${baseUrl}/api/weather/coastal`);
    recordTest('PUBLIC_CITIZEN', 'Read Public Weather (Statewide)', 200, res.status, `Read ${res.data.stations?.length} stations`);
  } catch (e: any) {
    recordTest('PUBLIC_CITIZEN', 'Read Public Weather', 200, e.response?.status || 500, e.message);
  }

  // Blocked from audit logs
  try {
    const res = await axios.get(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${publicToken}` },
    });
    recordTest('PUBLIC_CITIZEN', 'Access Audit Logs (Must be Blocked)', 403, res.status, 'Allowed forbidden role!');
  } catch (e: any) {
    recordTest('PUBLIC_CITIZEN', 'Access Audit Logs (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}`);
  }

  // Blocked from creating inventory items
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/inventory`,
      {
        itemName: 'Public Fake Item',
        shelterName: 'Santhome Multipurpose Cyclone Relief Center',
        districtName: 'Chennai',
        category: 'FOOD_RATIONS',
        quantity: 10,
        unit: 'packets',
        criticalThreshold: 5,
      },
      { headers: { Authorization: `Bearer ${publicToken}` } }
    );
    recordTest('PUBLIC_CITIZEN', 'Mutation Prohibited (Must be Blocked)', 403, res.status, 'Allowed public user mutation!');
  } catch (e: any) {
    recordTest('PUBLIC_CITIZEN', 'Mutation Prohibited (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}: ${e.response?.data?.message}`);
  }

  // Blocked from initiating transfers
  try {
    const res = await axios.post(
      `${baseUrl}/api/mongo/transfers`,
      {
        sourceWarehouse: 'Chennai Depot',
        destinationShelterName: 'Santhome Multipurpose Cyclone Relief Center',
        destinationDistrict: 'Chennai',
        itemName: 'Public Transfer',
        category: 'FOOD_RATIONS',
        quantity: 50,
        unit: 'packets',
        requestedBy: 'Public User',
      },
      { headers: { Authorization: `Bearer ${publicToken}` } }
    );
    recordTest('PUBLIC_CITIZEN', 'Transfer Initiation Prohibited (Must be Blocked)', 403, res.status, 'Allowed public user transfer!');
  } catch (e: any) {
    recordTest('PUBLIC_CITIZEN', 'Transfer Initiation Prohibited (Must be Blocked)', 403, e.response?.status || 500, `Blocked with ${e.response?.data?.code}: ${e.response?.data?.message}`);
  }

  // Summary
  console.log('\n================================================================');
  console.log(' RBAC Role Verification Summary');
  console.log('================================================================');
  const total = outcomes.length;
  const passed = outcomes.filter((o) => o.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios Tested: ${total}`);
  console.log(`Passed:                ${passed} ✅`);
  console.log(`Failed:                ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Pass Rate:              ${Math.round((passed / total) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

verifyAllRoles().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
