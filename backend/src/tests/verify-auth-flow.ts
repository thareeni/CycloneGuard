import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:5000';

async function runAuthFlowVerification() {
  console.log('================================================================');
  console.log(' CycloneGuard Authentication, Role Management & District Test');
  console.log(' Target Server:', BASE_URL);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[✅ PASS] ${testName}${details ? ' | ' + details : ''}`);
      passed++;
    } else {
      console.error(`[❌ FAIL] ${testName}${details ? ' | ' + details : ''}`);
      failed++;
    }
  }

  // ==========================================================================
  // 1. Authoritative 14 Coastal Districts Registry Check
  // ==========================================================================
  console.log('--- 1. Authoritative 14 Coastal Districts Registry ---');
  try {
    const distRes = await axios.get(`${BASE_URL}/api/districts`);
    assert(distRes.status === 200, 'Districts API returns HTTP 200');
    const districts: any[] = distRes.data.data;
    assert(districts.length === 14, `All 14 districts returned (Count: ${districts.length})`);

    const expectedDistricts: Record<number, string> = {
      1: 'Tiruvallur',
      2: 'Chennai',
      3: 'Chengalpattu',
      4: 'Villupuram',
      5: 'Cuddalore',
      6: 'Mayiladuthurai',
      7: 'Nagapattinam',
      8: 'Tiruvarur',
      9: 'Thanjavur',
      10: 'Pudukkottai',
      11: 'Ramanathapuram',
      12: 'Thoothukudi',
      13: 'Tirunelveli',
      14: 'Kanniyakumari',
    };

    let allMatched = true;
    for (const [idStr, expectedName] of Object.entries(expectedDistricts)) {
      const id = Number(idStr);
      const found = districts.find((d) => d.id === id);
      if (!found || found.name.toLowerCase() !== expectedName.toLowerCase()) {
        allMatched = false;
        console.error(`Mismatch for district ID ${id}: expected ${expectedName}, found ${found?.name}`);
      }
    }
    assert(allMatched, 'All 14 District IDs and Names match authoritative specification');

    // Check specific Chennai & Nagapattinam integrity
    const chennai = districts.find((d) => d.id === 2);
    const nagai = districts.find((d) => d.id === 7);
    assert(chennai?.name === 'Chennai', 'Chennai correctly preserved at ID 2');
    assert(nagai?.name === 'Nagapattinam', 'Nagapattinam correctly preserved at ID 7');
  } catch (err: any) {
    assert(false, 'Districts API check failed', err.message);
  }

  // ==========================================================================
  // 2. Admin — Single Authorized Account & Privilege Escalation Protection
  // ==========================================================================
  console.log('\n--- 2. Single Authorized Admin Account & Security ---');
  let adminToken = '';
  try {
    // A. Valid Admin Login
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@cycloneguard.tn.gov.in',
      password: 'Admin@Cyclone2026!',
    });
    assert(adminLoginRes.status === 200, 'Single Admin authentication succeeds (HTTP 200)');
    assert(adminLoginRes.data.user.role === 'ADMIN', 'Admin role verified in token payload');
    adminToken = adminLoginRes.data.token;

    // B. Admin Audit Logs access
    const auditRes = await axios.get(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200, 'Admin accesses statewide security audit logs');

    // C. Block public registration of Admin email
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Attacker Impersonating Admin',
        email: 'admin@cycloneguard.tn.gov.in',
        password: 'HackedPassword123!',
      });
      assert(false, 'Public Admin registration must be blocked');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Public Admin registration blocked with HTTP 403',
        `Code: ${err.response?.data?.code}`
      );
    }

    // D. Block privilege escalation (passing role: 'ADMIN' during signup)
    const testEscalationEmail = `hacker.${Date.now()}@darkweb.org`;
    const escRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Privilege Escalation Attempt',
      email: testEscalationEmail,
      password: 'StrongPassword2026!',
      role: 'ADMIN', // Maliciously requested role
    });
    assert(
      escRes.data.user.role === 'PUBLIC',
      'Privilege escalation neutralized: forced to PUBLIC role',
      `Assigned: ${escRes.data.user.role}`
    );
  } catch (err: any) {
    assert(false, 'Admin security tests encountered error', err.message);
  }

  // ==========================================================================
  // 3. Citizen — Public Registration with Personal Email
  // ==========================================================================
  console.log('\n--- 3. Citizen Public Registration & Personal Email Acceptance ---');
  let citizenToken = '';
  const personalEmail = `coastal.citizen.${Date.now()}@gmail.com`;
  try {
    // A. Register with standard personal Gmail account
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'R. K. Ramanathan',
      email: personalEmail,
      password: 'MyPersonalSecurePassword2026!',
      phone: '+91 94440 98765',
    });
    assert(regRes.status === 201, 'Citizen registration succeeds with HTTP 201');
    assert(regRes.data.user.role === 'PUBLIC', 'Citizen assigned PUBLIC role automatically');
    assert(regRes.data.user.email === personalEmail, 'Personal email correctly stored without domain restriction');
    citizenToken = regRes.data.token;

    // B. Login with the newly registered Citizen credentials
    const citLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: personalEmail,
      password: 'MyPersonalSecurePassword2026!',
    });
    assert(citLogin.status === 200, 'Newly registered citizen can immediately sign in (HTTP 200)');
    assert(citLogin.data.user.name === 'R. K. Ramanathan', 'User profile retrieved correctly');

    // C. Duplicate registration prevention
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Duplicate Citizen',
        email: personalEmail,
        password: 'AnotherPassword123!',
      });
      assert(false, 'Duplicate registration should be blocked');
    } catch (err: any) {
      assert(err.response?.status === 400, 'Duplicate registration rejected with HTTP 400');
    }

    // D. Citizen has full public access to weather, cyclone alerts, and shelters
    const weatherRes = await axios.get(`${BASE_URL}/api/weather/coastal`);
    assert(weatherRes.status === 200 && weatherRes.data.stations?.length === 14, 'Citizen reads all 14 coastal weather stations');

    const cycloneRes = await axios.get(`${BASE_URL}/api/cyclone/status`);
    assert(cycloneRes.status === 200, 'Citizen reads official cyclone tracking feeds');

    const shelterRes = await axios.get(`${BASE_URL}/api/shelters`);
    assert(shelterRes.status === 200 && shelterRes.data.data?.length >= 17, `Citizen reads operational evacuation shelters (Count: ${shelterRes.data.data?.length})`);

    // E. Citizen is strictly blocked from operational writes and admin logs
    try {
      await axios.get(`${BASE_URL}/api/audit-logs`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      assert(false, 'Citizen must be blocked from audit logs');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Citizen blocked from audit logs with HTTP 403');
    }

    try {
      await axios.post(
        `${BASE_URL}/api/mongo/inventory`,
        {
          district: 'Chennai',
          category: 'DRINKING_WATER',
          itemName: 'Unauthorized Citizen Item',
          quantity: 100,
          unit: 'liters',
        },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      assert(false, 'Citizen must be blocked from inventory mutations');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Citizen blocked from inventory mutation with HTTP 403');
    }
  } catch (err: any) {
    assert(false, 'Citizen tests encountered error', err.message);
  }

  // ==========================================================================
  // 4. District Officers Across 14 Districts & Cryptographic Jurisdiction
  // ==========================================================================
  console.log('\n--- 4. District Officers Coverage & Scoped Security ---');
  try {
    // Test Chennai Officer (ID 2)
    const chennaiRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'chennai.officer@cycloneguard.tn.gov.in',
      password: 'Chennai@Guard2026!',
    });
    assert(chennaiRes.status === 200, 'Chennai Officer logs in successfully');
    assert(chennaiRes.data.user.assignedDistrictId === 2, 'Chennai Officer assignedDistrictId is 2');
    const chennaiToken = chennaiRes.data.token;

    // Test Nagapattinam Officer (ID 7)
    const nagaiRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'nagai.officer@cycloneguard.tn.gov.in',
      password: 'Nagai@Guard2026!',
    });
    assert(nagaiRes.status === 200, 'Nagapattinam Officer logs in successfully');
    assert(nagaiRes.data.user.assignedDistrictId === 7, 'Nagapattinam Officer assignedDistrictId is 7');

    // Test Cuddalore Officer (ID 5)
    const cuddaloreRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'cuddalore.officer@cycloneguard.tn.gov.in',
      password: 'Cuddalore@Guard2026!',
    });
    assert(cuddaloreRes.status === 200, 'Cuddalore Officer (ID 5) logs in successfully');
    assert(cuddaloreRes.data.user.assignedDistrict === 'Cuddalore', 'Cuddalore Officer jurisdiction verified');

    // Test Kanniyakumari Officer (ID 14)
    const kanyakumariRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'kanniyakumari.officer@cycloneguard.tn.gov.in',
      password: 'Kanniyakumari@Guard2026!',
    });
    assert(kanyakumariRes.status === 200, 'Kanniyakumari Officer (ID 14) logs in successfully');
    assert(kanyakumariRes.data.user.assignedDistrict === 'Kanniyakumari', 'Kanniyakumari Officer jurisdiction verified');

    // Test Cross-District Block: Chennai Officer cannot mutate Nagapattinam inventory
    try {
      await axios.post(
        `${BASE_URL}/api/mongo/inventory`,
        {
          districtName: 'Nagapattinam', // Cross-district target!
          district: 'Nagapattinam',
          category: 'DRINKING_WATER',
          itemName: 'Illicit Cross-District Water Cans',
          quantity: 200,
          unit: 'liters',
        },
        { headers: { Authorization: `Bearer ${chennaiToken}` } }
      );
      assert(false, 'Chennai Officer should be blocked from Nagapattinam mutation');
    } catch (err: any) {
      assert(
        err.response?.status === 403,
        'Chennai Officer cross-district write to Nagapattinam blocked with HTTP 403',
        `Code: ${err.response?.data?.code}`
      );
    }

    // Authorized District Write: Chennai Officer CAN mutate Chennai inventory
    const authorizedWrite = await axios.post(
      `${BASE_URL}/api/mongo/inventory`,
      {
        districtName: 'Chennai',
        district: 'Chennai',
        shelterName: 'Santhome Multipurpose Cyclone Relief Center',
        category: 'DRINKING_WATER',
        itemName: 'Authorized Chennai Emergency Water',
        quantity: 500,
        unit: 'liters',
        shelterId: 1,
      },
      { headers: { Authorization: `Bearer ${chennaiToken}` } }
    );
    assert(authorizedWrite.status === 201, 'Chennai Officer authorized write in Chennai succeeds with HTTP 201');
  } catch (err: any) {
    assert(false, 'District Officer tests encountered error', err.message);
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n================================================================');
  console.log(' Authentication & Role Verification Summary');
  console.log('================================================================');
  console.log(`Total Checks:  ${passed + failed}`);
  console.log(`Passed:        ${passed} ✅`);
  console.log(`Failed:        ${failed}`);
  console.log(`Pass Rate:     ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthFlowVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
