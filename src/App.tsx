import { useEffect, useRef, useState } from 'react';
import { GameEngine, type GameStats } from './game/GameEngine';
import './index.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');
  const [stats, setStats] = useState<GameStats>({ score: 0, energy: 200, maxEnergy: 200, level: 1 });
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(
        canvasRef.current,
        (newStats) => setStats(newStats),
        (score) => {
          setFinalScore(score);
          setGameState('GAME_OVER');
        }
      );
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.start();
      setGameState('PLAYING');
    }
  };

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />

      {gameState === 'MENU' && (
        <div className="overlay menu-overlay">
          <h1 className="title">THERMAL HYPERNOVA</h1>
          <p className="subtitle">Absorb Energy. Survive Entropy.</p>
          <button className="btn-start" onClick={startGame}>INITIALIZE CORE</button>
          <div className="controls">
            <p>MOUSE/TOUCH to Move</p>
            <p>CLICK/DOUBLE-TAP to Hypernova (Costs 30 Energy)</p>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="hud">
          <div className="score-board">
            <div className="score">SCORE: {Math.floor(stats.score)}</div>
            <div className="level">LEVEL: {stats.level}</div>
          </div>
          <div className="energy-container">
            <div className="energy-label">CORE STABILITY</div>
            <div className="energy-bar-bg">
              <div
                className="energy-bar-fill"
                style={{ width: `${(stats.energy / stats.maxEnergy) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="overlay game-over-overlay">
          <h2 className="game-over-title">CRITICAL FAILURE</h2>
          <p className="final-score">Final Score: {Math.floor(finalScore)}</p>
          <button className="btn-restart" onClick={startGame}>REBOOT SYSTEM</button>
        </div>
      )}
    </div>
  );
}

export default App;
