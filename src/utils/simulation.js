import sampleCities from '../data/cities_sample.json';

/**
 * Generates random coordinates that roughly correspond to populated areas.
 */
export const generateSampleChurches = (count = 15000) => {
  const churches = [];
  const maxCities = sampleCities.length;
  const actualCount = Math.min(count, maxCities);
  
  for (let i = 0; i < actualCount; i++) {
    const city = sampleCities[i];
    const lat = city.lat;
    const lng = city.lng;
    
    // Approximate timezone offset based on longitude
    const tzOffset = lng / 15;
    
    churches.push({
      lat,
      lng,
      tzOffset,
      id: i,
      // Randomly assign a 'size' or 'prominence' to the church
      size: Math.random() > 0.9 ? 'large' : 'small'
    });
  }
  return churches;
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Checks if a mass is likely happening at a given church based on simulated UTC time.
 */
export const isMassActive = (church, simulatedTimeUtc) => {
  // Convert UTC time to local time for the church
  const localTime = new Date(simulatedTimeUtc.getTime() + church.tzOffset * 3600 * 1000);
  
  const dayOfWeek = localTime.getUTCDay(); // 0 is Sunday
  const hour = localTime.getUTCHours();
  
  // Parse numeric seed from church.id (handles both "cathedral-X" and raw numbers)
  const numericId = typeof church.id === 'string' ? parseInt(church.id.replace(/\D/g, '')) || 0 : church.id;
  const seed = numericId * 73 + dayOfWeek * 24 + hour;
  const randVal = seededRandom(seed);
  
  // Sundays: High probability of mass between 7am and 12pm, and 5pm to 7pm
  if (dayOfWeek === 0) {
    if ((hour >= 7 && hour <= 12) || (hour >= 17 && hour <= 19)) {
      // 80% chance if it's a large church, 30% if small
      return randVal < (church.size === 'large' ? 0.8 : 0.3);
    }
  } else {
    // Weekdays: Mass usually around 7am-8am or 12pm or 6pm
    if (hour === 7 || hour === 8 || hour === 12 || hour === 18) {
      return randVal < (church.size === 'large' ? 0.4 : 0.1);
    }
  }
  
  return false;
};

export const getLiturgicalSeason = (date) => {
  // Very rough approximation for visual prototype
  const month = date.getUTCMonth(); // 0-11
  if (month === 11 || month === 0) return 'Christmas Season';
  if (month >= 2 && month <= 3) return 'Lent';
  if (month >= 3 && month <= 4) return 'Easter Season';
  return 'Ordinary Time';
};

