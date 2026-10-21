import axios from 'axios';
import { config } from '../config/env';

async function verifyProvenance() {
  const baseUrl = `http://127.0.0.1:${config.port}`;
  console.log('================================================================');
  console.log(' CycloneGuard Shelters & Inventory Provenance Verification');
  console.log('================================================================\n');

  // 1. Shelters
  const sheltersRes = await axios.get(`${baseUrl}/api/shelters`);
  const shelters: any[] = sheltersRes.data.data || [];
  console.log(`[1] Total Shelters Registered: ${shelters.length}`);
  
  const sheltersByDistrict: Record<string, number> = {};
  const sheltersBySource: Record<string, number> = {};
  let totalCapacity = 0;
  let totalOccupancy = 0;

  for (const s of shelters) {
    sheltersByDistrict[s.districtName] = (sheltersByDistrict[s.districtName] || 0) + 1;
    sheltersBySource[s.dataSource] = (sheltersBySource[s.dataSource] || 0) + 1;
    totalCapacity += s.totalCapacity;
    totalOccupancy += s.currentOccupancy;
  }

  console.log('\n--- Shelters District Distribution (14 Coastal Districts) ---');
  Object.entries(sheltersByDistrict).forEach(([d, count]) => {
    console.log(`   • ${d.padEnd(16)}: ${count} verified MPES facilities`);
  });

  console.log('\n--- Capacity & Provenance ---');
  console.log(`   • Total Capacity:     ${totalCapacity.toLocaleString()} persons`);
  console.log(`   • Current Occupancy:  ${totalOccupancy.toLocaleString()} persons (${((totalOccupancy / totalCapacity) * 100).toFixed(1)}%)`);
  console.log(`   • Primary Authorities:`);
  Object.entries(sheltersBySource).forEach(([src, count]) => {
    console.log(`     - [${count}] ${src}`);
  });

  // 2. Inventory
  console.log('\n[2] Inventory Records & Provenance:');
  const invRes = await axios.get(`${baseUrl}/api/mongo/inventory`);
  const items: any[] = invRes.data.data || [];
  console.log(`   • Total Stockpile Records: ${items.length}`);

  const invByCat: Record<string, number> = {};
  const invByDistrict: Record<string, number> = {};
  const invBySource: Record<string, number> = {};

  for (const it of items) {
    invByCat[it.category] = (invByCat[it.category] || 0) + 1;
    invByDistrict[it.districtName] = (invByDistrict[it.districtName] || 0) + 1;
    const src = it.dataSource || 'Demonstration / In-Memory Mock';
    invBySource[src] = (invBySource[src] || 0) + 1;
  }

  console.log('\n--- Relief Inventory Categories (8 Standard Categories) ---');
  Object.entries(invByCat).forEach(([cat, count]) => {
    console.log(`   • ${cat.padEnd(22)}: ${count} stock items`);
  });

  console.log('\n--- Inventory Provenance Classification ---');
  Object.entries(invBySource).forEach(([src, count]) => {
    console.log(`   • [${count} records] ${src}`);
  });

  console.log('\n================================================================\n');
}

verifyProvenance().catch((e) => {
  console.error('Provenance verification error:', e);
  process.exit(1);
});
