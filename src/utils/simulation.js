/**
 * Generates random coordinates that roughly correspond to populated areas.
 * In a real application, this would be replaced by parsing OSM data.
 */
export const generateSampleChurches = (count = 10000) => {
  const churches = [];
  for (let i = 0; i < count; i++) {
    // Bias towards Europe, Americas, Philippines, Africa
    // We'll just do a very crude distribution for the visual prototype
    const lat = (Math.random() - 0.5) * 140; // Avoid extreme poles
    const lng = (Math.random() - 0.5) * 360;
    
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

/**
 * Checks if a mass is likely happening at a given church based on simulated UTC time.
 */
export const isMassActive = (church, simulatedTimeUtc) => {
  // Convert UTC time to local time for the church
  const localTime = new Date(simulatedTimeUtc.getTime() + church.tzOffset * 3600 * 1000);
  
  const dayOfWeek = localTime.getUTCDay(); // 0 is Sunday
  const hour = localTime.getUTCHours();
  
  // Sundays: High probability of mass between 7am and 12pm, and 5pm to 7pm
  if (dayOfWeek === 0) {
    if ((hour >= 7 && hour <= 12) || (hour >= 17 && hour <= 19)) {
      // 80% chance if it's a large church, 30% if small
      return Math.random() < (church.size === 'large' ? 0.8 : 0.3);
    }
  } else {
    // Weekdays: Mass usually around 7am-8am or 12pm or 6pm
    if (hour === 7 || hour === 8 || hour === 12 || hour === 18) {
      return Math.random() < (church.size === 'large' ? 0.4 : 0.1);
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
