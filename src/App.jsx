import { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { Moon, Sun } from 'lucide-react';
import './App.css';
import { generateSampleChurches, isMassActive, getLiturgicalSeason } from './utils/simulation';
import cathedralsData from './data/cathedrals.json';

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
        active
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
            
            if (isDarkMode) {
              if (ratio > 0.4) return '#ff1493'; // Deep pink for active
              if (ratio > 0.1) return '#c71585'; 
              return '#4b0082'; // Indigo
            } else {
              if (ratio > 0.4) return '#ffffff'; // White for highly active
              if (ratio > 0.1) return '#d4af37'; // Gold
              return '#e8e4d9'; // Light beige for inactive
            }
          }}
          hexSideColor={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const ratio = activeCount / d.points.length;
            
            if (isDarkMode) {
              if (ratio > 0.4) return 'rgba(255, 20, 147, 0.8)';
              if (ratio > 0.1) return 'rgba(199, 21, 133, 0.8)';
              return 'rgba(75, 0, 130, 0.8)';
            } else {
              if (ratio > 0.4) return 'rgba(255, 255, 255, 0.9)';
              if (ratio > 0.1) return 'rgba(212, 175, 55, 0.8)';
              return 'rgba(232, 228, 217, 0.6)';
            }
          }}
          hexAltitude={d => {
            const activeCount = d.points.filter(p => p.active).length;
            return Math.max(0.01, (d.points.length * 0.0018) + (activeCount * 0.012));
          }}
          hexBinMerge={true}
          enablePointerInteraction={true}
          
          labelsData={cathedralsData}
          labelLat={d => d.lat}
          labelLng={d => d.lng}
          labelText={d => d.name}
          labelColor={() => isDarkMode ? '#ffeb3b' : '#d4af37'}
          labelSize={0.4}
          labelDotRadius={0.3}
          labelResolution={2}
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
                  <div className="dot active"></div>
                  <span>Active Mass (Holy Eucharist)</span>
                </div>
                <div className="legend-item">
                  <div className="dot inactive"></div>
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
