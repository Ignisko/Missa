import { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { Moon, Sun } from 'lucide-react';
import './App.css';
import { generateSampleChurches, isMassActive, getLiturgicalSeason } from './utils/simulation';
import cathedralsData from './data/cathedrals.json';

const getSeasonColors = (season, isDarkMode) => {
  if (isDarkMode) {
    const inactive = 'rgba(255, 255, 255, 0.08)'; // Subtle white-transparency on dark globe
    if (season === 'Lent' || season === 'Advent') {
      return { active: '#da70d6', inactive }; // Violet
    }
    if (season === 'Easter Season' || season === 'Christmas Season') {
      return { active: '#ffec3b', inactive }; // Gold
    }
    return { active: '#00e676', inactive }; // Green (Ordinary)
  } else {
    const inactive = 'rgba(0, 0, 0, 0.08)'; // Subtle dark-transparency on light globe
    if (season === 'Lent' || season === 'Advent') {
      return { active: '#800080', inactive }; // Deep purple
    }
    if (season === 'Easter Season' || season === 'Christmas Season') {
      return { active: '#b8860b', inactive }; // Dark goldenrod for high contrast
    }
    return { active: '#1b5e20', inactive }; // Deep green
  }
};

function App() {
  const globeRef = useRef();
  
  const [churches, setChurches] = useState([]);
  const [activePoints, setActivePoints] = useState([]);
  
  // App state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [simHour, setSimHour] = useState(8); // Start at 8 AM
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' or 'catalogue'
  const [searchQuery, setSearchQuery] = useState('');

  // Derived time based on the slider (fixing the date to a Sunday for best visuals)
  const simTime = new Date(`2024-05-19T${String(simHour).padStart(2, '0')}:00:00Z`);

  // Initialize data and globe
  useEffect(() => {
    // Generate simulated churches and prepend the real cathedrals
    const sampled = generateSampleChurches(15000); 
    
    const formattedCathedrals = cathedralsData.map((c, idx) => ({
      ...c,
      id: `cathedral-${c.id}`,
      size: 'large', // Cathedrals are always large
      tzOffset: c.lng / 15 // Approximate timezone offset for simplicity
    }));

    setChurches([...formattedCathedrals, ...sampled]);
    
    // Add some initial spin to the globe
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
    
    setIsReady(true);
  }, []);

  // Update masses when the hour slider changes
  useEffect(() => {
    if (churches.length === 0) return;
    
    // Map to globe data format
    const points = churches.map(c => {
      const active = isMassActive(c, simTime);
      return {
        lat: c.lat,
        lng: c.lng,
        active,
        id: c.id,
        name: c.name
      };
    });
    setActivePoints(points);
  }, [simHour, churches]); // Re-run only when simHour changes

  // Auto-play interval effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimHour(prev => (prev + 1) % 24);
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Adjust sun position and ambient lighting
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    
    // May 19 declination is approx 19.5 degrees N
    const sunLat = 19.5; 
    const sunLng = (12 - simHour) * 15;
    
    // Position of the sun in spherical coordinates
    const r = 350; 
    const phi = (90 - sunLat) * Math.PI / 180;
    const theta = (sunLng + 180) * Math.PI / 180;
    
    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.cos(theta);
    
    // Find Three.js directional light and position it representing the Sun
    const dirLight = scene.children.find(c => c.isDirectionalLight);
    if (dirLight) {
      dirLight.position.set(x, y, z);
      dirLight.intensity = isDarkMode ? 0.85 : 0.6; // Prevent overexposure in light mode
    }

    // Set ambient light so the night side is dark but visible
    const ambientLight = scene.children.find(c => c.isAmbientLight);
    if (ambientLight) {
      ambientLight.intensity = isDarkMode ? 0.25 : 0.15; // Drop ambient light in light mode to add shading
    }
  }, [simHour, isDarkMode, isReady]);

  const handleCathedralClick = (cathedral) => {
    if (globeRef.current) {
      // Temporarily disable auto-rotation when focusing on a cathedral
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ lat: cathedral.lat, lng: cathedral.lng, altitude: 1.2 }, 2000);
    }
  };

  const filteredCathedrals = cathedralsData.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSeason = getLiturgicalSeason(simTime);

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {!isReady && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <h2>Initializing Missa</h2>
        </div>
      )}

      <div className="globe-container">
        <Globe
          ref={globeRef}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={true}
          atmosphereColor={isDarkMode ? "#ffffff" : "#cccccc"}
          showGraticules={true}
          globeImageUrl={isDarkMode 
            ? "//unpkg.com/three-globe/example/img/earth-night.jpg" 
            : "//unpkg.com/three-globe/example/img/earth-water.png"
          }
          hexBinPointsData={activePoints}
          hexBinResolution={3}
          hexMargin={0.2}
          hexTopColor={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const ratio = activeCount / d.points.length;
            const colors = getSeasonColors(currentSeason, isDarkMode);
            
            if (ratio > 0.4) return colors.active;
            if (ratio > 0.1) return colors.active + 'cc';
            return colors.inactive;
          }}
          hexSideColor={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const ratio = activeCount / d.points.length;
            const colors = getSeasonColors(currentSeason, isDarkMode);
            
            if (ratio > 0.4) return colors.active + 'cc';
            if (ratio > 0.1) return colors.active + '88';
            return colors.inactive + 'aa';
          }}
          hexAltitude={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const baseHeight = Math.sqrt(d.points.length) * 0.015;
            const activeHeight = Math.sqrt(activeCount) * 0.012;
            return Math.max(0.01, baseHeight + activeHeight);
          }}
          hexBinMerge={true}
          enablePointerInteraction={true}
          
          hexLabel={d => {
            const total = d.points.length;
            const activeCount = d.points.filter(p => p.active).length;
            const cathedralsInBin = d.points.filter(p => p.id && String(p.id).startsWith('cathedral-'));
            
            const avgLng = d.points.reduce((sum, p) => sum + p.lng, 0) / total;
            const tzOffset = avgLng / 15;
            const localTime = new Date(simTime.getTime() + tzOffset * 3600 * 1000);
            const timeStr = localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            
            return `
              <div class="globe-tooltip">
                <div class="tooltip-header">Location Cluster</div>
                <div class="tooltip-row">
                  <span>Local Time:</span>
                  <strong>${timeStr}</strong>
                </div>
                <div class="tooltip-row">
                  <span>Active Masses:</span>
                  <strong>${activeCount} / ${total}</strong>
                </div>
                ${cathedralsInBin.length > 0 ? `
                  <div class="tooltip-cathedrals">
                    <strong>Cathedrals here:</strong>
                    <ul>
                      ${cathedralsInBin.map(c => `<li>${c.name}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            `;
          }}
          
          labelsData={cathedralsData}
          labelLat={d => d.lat}
          labelLng={d => d.lng}
          labelText={d => d.name}
          labelColor={() => isDarkMode ? '#ffeb3b' : '#d4af37'}
          labelSize={0.4}
          labelDotRadius={0.3}
          labelResolution={2}
          labelLabel={d => {
            const active = isMassActive(d, simTime);
            const localTime = new Date(simTime.getTime() + d.lng / 15 * 3600 * 1000);
            const timeStr = localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            
            return `
              <div class="globe-tooltip cathedral-tooltip">
                <div class="tooltip-header">${d.name}</div>
                <div class="tooltip-row">
                  <span>Location:</span>
                  <strong>${d.city}, ${d.country}</strong>
                </div>
                <div class="tooltip-row">
                  <span>Local Time:</span>
                  <strong>${timeStr}</strong>
                </div>
                <div class="tooltip-row">
                  <span>Status:</span>
                  <span class="status-badge ${active ? 'active' : 'inactive'}">
                    ${active ? 'Mass in Progress' : 'No Active Mass'}
                  </span>
                </div>
              </div>
            `;
          }}
        />
      </div>

      <div className="ui-layer">
        <header className="header">
          <div className="title-section">
            <h1>Missa</h1>
            <p>
              The Global Eucharistic Presence |{' '}
              <a href="https://www.idiotajezusa.pl/" className="back-to-site">
                idiotajezusa.pl
              </a>
            </p>
          </div>
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        <div className="controls-panel">
          <div className="tab-bar">
            <button 
              className={`tab-button ${activeTab === 'simulation' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulation')}
            >
              Simulation
            </button>
            <button 
              className={`tab-button ${activeTab === 'catalogue' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalogue')}
            >
              Cathedrals
            </button>
          </div>

          {activeTab === 'simulation' ? (
            <>
              <div className="time-display">
                <span className="label">Simulated Time</span>
                <span className="value">
                  {simTime.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="date-value">
                  {simTime.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span className="liturgical-season">
                  {getLiturgicalSeason(simTime)}
                </span>
              </div>

              <div className="speed-control">
                <div className="slider-header">
                  <label>Time of Day (UTC)</label>
                  <button 
                    className="play-button" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                </div>
                <input 
                  type="range" 
                  className="speed-slider"
                  min="0" 
                  max="23" 
                  step="1"
                  value={simHour}
                  onChange={(e) => setSimHour(Number(e.target.value))}
                />
              </div>

              <div className="legend">
                <div className="legend-item">
                  <div 
                    className="dot" 
                    style={{ 
                      backgroundColor: getSeasonColors(currentSeason, isDarkMode).active,
                      boxShadow: `0 0 8px ${getSeasonColors(currentSeason, isDarkMode).active}`,
                      border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  ></div>
                  <span>Active Mass (Holy Eucharist)</span>
                </div>
                <div className="legend-item">
                  <div 
                    className="dot" 
                    style={{ 
                      backgroundColor: getSeasonColors(currentSeason, isDarkMode).inactive,
                      border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  ></div>
                  <span>Church Location</span>
                </div>
              </div>
            </>
          ) : (
            <div className="catalogue-section">
              <input 
                type="text" 
                placeholder="Search cathedrals..." 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="cathedral-list">
                {filteredCathedrals.map(cathedral => (
                  <div 
                    key={cathedral.id} 
                    className="cathedral-item"
                    onClick={() => handleCathedralClick(cathedral)}
                  >
                    <div className="cathedral-name">{cathedral.name}</div>
                    <div className="cathedral-meta">{cathedral.city}, {cathedral.country}</div>
                  </div>
                ))}
                {filteredCathedrals.length === 0 && (
                  <div className="no-results">No cathedrals found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
