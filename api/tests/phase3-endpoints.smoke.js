// Minimal smoke tests for Phase 3 endpoints (run with node for now)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE = process.env.API_BASE || 'http://localhost:4000';

async function main() {
  try {
    // Assets list
    let res = await fetch(`${BASE}/api/assets`);
    console.log('GET /api/assets ->', res.status);

    // Stations capacity (assumes seed created ST-001)
    res = await fetch(`${BASE}/api/stations/1/capacity`);
    console.log('GET /api/stations/1/capacity ->', res.status);

    // Maintenance list empty
    res = await fetch(`${BASE}/api/maintenance`);
    console.log('GET /api/maintenance ->', res.status);
  } catch (e) {
    console.error('Smoke tests failed:', e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
