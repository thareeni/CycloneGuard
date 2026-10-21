import axios from 'axios';
import { config } from '../config/env';

async function verifyRiskConsistency() {
  const baseUrl = `http://127.0.0.1:${config.port}`;
  console.log('================================================================');
  console.log(' CycloneGuard Cross-View Meteorological Risk Consistency Audit');
  console.log(` Target Server: ${baseUrl}`);
  console.log('================================================================\n');

  // 1. Fetch Coastal Weather Observations
  const weatherRes = await axios.get(`${baseUrl}/api/weather/coastal`);
  const stations: any[] = weatherRes.data.stations || [];
  console.log(`[1] Fetched ${stations.length} coastal stations from /api/weather/coastal`);

  // 2. Fetch District Risk Summaries
  const summariesRes = await axios.get(`${baseUrl}/api/weather/assessment/districts`);
  const summaries: any[] = summariesRes.data.data || [];
  console.log(`[2] Fetched ${summaries.length} district risk summaries from /api/weather/assessment/districts`);

  let mismatches = 0;

  console.log('\n--- Comparing Observations vs District Summaries Across All 14 Districts ---');
  for (const st of stations) {
    const sum = summaries.find((s) => s.stationId.toLowerCase() === st.stationId.toLowerCase() || s.districtName.toLowerCase() === st.district.toLowerCase());
    if (!sum) {
      console.error(`❌ Missing summary for station: ${st.stationId} (${st.locationName})`);
      mismatches++;
      continue;
    }

    const scoreMatch = st.riskScore === sum.riskScore;
    const catMatch = st.riskCategory === sum.riskCategory;
    const rainMatch = Math.abs(st.rainfallMm - sum.rainfallMm) < 0.001;
    const rainDescMatch = st.rainfallDescription === sum.rainfallDescription;

    if (!scoreMatch || !catMatch || !rainMatch || !rainDescMatch) {
      console.error(`❌ Mismatch for ${st.district} (${st.stationId}):`);
      console.error(`   Obs: Score=${st.riskScore}, Cat=${st.riskCategory}, Rain=${st.rainfallMm} mm (${st.rainfallDescription})`);
      console.error(`   Sum: Score=${sum.riskScore}, Cat=${sum.riskCategory}, Rain=${sum.rainfallMm} mm (${sum.rainfallDescription})`);
      mismatches++;
    } else {
      console.log(`✅ [${st.district.padEnd(16)}] Score: ${st.riskScore}/100 (${st.riskCategory}) | Rain: ${st.rainfallMm.toFixed(1)} mm/h ("${st.rainfallDescription}") — 100% Consistent`);
    }

    // 3. Compare with single station assessment endpoint
    const singleAssessmentRes = await axios.get(`${baseUrl}/api/weather/assessment/${st.stationId}`);
    const singleData = singleAssessmentRes.data.data;
    if (singleData.overallScore !== st.riskScore || singleData.riskCategory !== st.riskCategory) {
      console.error(`❌ Single assessment mismatch for ${st.stationId}: single=${singleData.overallScore} vs obs=${st.riskScore}`);
      mismatches++;
    }
  }

  console.log('\n================================================================');
  console.log(` Cross-View Consistency Audit Result: ${mismatches === 0 ? 'PERFECT 100% MATCH ✅' : `${mismatches} MISMATCHES DETECTED ❌`}`);
  console.log('================================================================\n');

  if (mismatches > 0) process.exit(1);
}

verifyRiskConsistency().catch((e) => {
  console.error('Consistency audit error:', e);
  process.exit(1);
});
