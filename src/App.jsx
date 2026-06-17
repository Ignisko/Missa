import { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { Play, Pause, FastForward } from 'lucide-react';
import './App.css';
import { generateSampleChurches, isMassActive, getLiturgicalSeason } from './utils/simulation';

// Helper to format date
const formatSimTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(date) + ' (UTC)';
};

function App() {
  const globeRef = useRef();
  
  const [churches, setChurches] = useState([]);
  const [activePoints, setActivePoints] = useState([]);
  
  // Time simulation state
  const [simTime, setSimTime] = useState(new Date('2024-05-19T08:00:00Z')); // Start on a Sunday morning UTC
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(3600); // 1 real second = 1 simulated hour
  const [isReady, setIsReady] = useState(false);

  // Initialize data and globe
  useEffect(() => {
    // Generate data once
    const data = generateSampleChurches(25000); // 25k points for smooth performance
    setChurches(data);
    
    // Set initial active points
    updateActiveMasses(data, simTime);
    
    // Add some initial spin to the globe
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
    
    setIsReady(true);
  }, []);

  // Time progression loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animationFrameId;

    const loop = (time) => {
      const deltaMs = time - lastTime;
      lastTime = time;

      // Calculate how much simulated time has passed
      const simDeltaMs = deltaMs * speedMultiplier;
      
      setSimTime(prevTime => {
        const nextTime = new Date(prevTime.getTime() + simDeltaMs);
        // Only update the active masses if an hour has crossed to save performance, 
        // or just update it frequently for a "twinkling" effect. 
        // We'll update it based on the new time.
        return nextTime;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speedMultiplier]);

  // Update active masses when simTime changes significantly (e.g. every simulated 10 minutes)
  // To avoid React re-rendering 60fps, we throttle the active points calculation
  const lastUpdateRef = useRef(0);
  useEffect(() => {
    if (simTime.getTime() - lastUpdateRef.current > 10 * 60 * 1000) { // 10 sim mins
      updateActiveMasses(churches, simTime);
      lastUpdateRef.current = simTime.getTime();
    }
  }, [simTime, churches]);

  const updateActiveMasses = (data, time) => {
    const points = data.map(c => {
      const active = isMassActive(c, time);
      return {
        lat: c.lat,
        lng: c.lng,
        active
      };
    });
    setActivePoints(points);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="app-container">
      {!isReady && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <h2>Initializing Missa</h2>
          <p>Generating global church data...</p>
        </div>
      )}

      <div className="globe-container">
        <Globe
          ref={globeRef}
          backgroundColor="#f5f7fa"
          showAtmosphere={true}
          atmosphereColor="#ffffff"
          showGraticules={true}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
          hexBinPointsData={activePoints}
          hexBinResolution={3}
          hexMargin={0.2}
          hexTopColor={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const ratio = activeCount / d.points.length;
            if (ratio > 0.4) return '#ff1493'; // Deep pink for active
            if (ratio > 0.1) return '#c71585'; // Medium violet red
            return '#4b0082'; // Indigo for inactive population
          }}
          hexSideColor={d => {
            const activeCount = d.points.filter(p => p.active).length;
            const ratio = activeCount / d.points.length;
            if (ratio > 0.4) return 'rgba(255, 20, 147, 0.8)';
            if (ratio > 0.1) return 'rgba(199, 21, 133, 0.8)';
            return 'rgba(75, 0, 130, 0.8)';
          }}
          hexAltitude={d => Math.max(0.01, d.sumWeight * 0.002)}
          hexBinMerge={true}
          enablePointerInteraction={true}
        />
      </div>

      <div className="ui-layer">
        <header className="header">
          <div className="title-section">
            <h1>Missa</h1>
            <p>The Global Eucharistic Presence</p>
          </div>
        </header>

        <div className="controls-panel">
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

          <div className="playback-controls">
            <button className={`icon-btn primary`} onClick={handlePlayPause}>
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
          </div>

          <div className="speed-control">
            <label>Simulation Speed</label>
            <input 
              type="range" 
              className="speed-slider"
              min="100" 
              max="10000" 
              step="100"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
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
        </div>
      </div>
    </div>
  );
}

export default App;
