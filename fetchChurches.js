import fs from 'fs';
import path from 'path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const QUERY = `
[out:json][timeout:300];
(
  node["amenity"="place_of_worship"]["denomination"="catholic"];
  way["amenity"="place_of_worship"]["denomination"="catholic"];
);
out center;
`;

const outputFile = path.resolve('public', 'churches.json');

console.log('Fetching Catholic churches from OpenStreetMap...');

async function fetchChurches() {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CatholicMassApp/1.0'
      },
      body: 'data=' + encodeURIComponent(QUERY)
    });
    
    if (!res.ok) {
      console.error('Error fetching data. Status code:', res.status);
      console.error(await res.text());
      return;
    }
    
    const parsed = await res.json();
    console.log(`Received ${parsed.elements.length} elements.`);
    
    const points = parsed.elements.map(el => {
      return {
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        active: true
      };
    }).filter(p => p.lat && p.lng);
    
    fs.writeFileSync(outputFile, JSON.stringify(points));
    console.log(`Saved ${points.length} locations to ${outputFile}`);
  } catch (e) {
    console.error('Error:', e);
  }
}

fetchChurches();
