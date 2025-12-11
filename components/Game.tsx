import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Player, Platform, Obstacle, GameState, HighScore, Particle 
} from '../types';
import { 
  GRAVITY, FRICTION, MOVE_SPEED, JUMP_FORCE, 
  CANVAS_WIDTH, CANVAS_HEIGHT, TOWER_WIDTH, FLOOR_HEIGHT, 
  TOTAL_FLOORS, TOWER_HEIGHT, COLORS, PLAYER_WIDTH, PLAYER_HEIGHT, 
  HEAD_RADIUS, STUN_DURATION, INVINCIBILITY_DURATION 
} from '../constants';
import { Trophy, Timer, Heart, RotateCcw, ArrowUp, ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    floor: 0,
    timeElapsed: 0,
    score: 0,
  });
  
  // Game Objects Refs
  const playerRef = useRef<Player>({
    pos: { x: CANVAS_WIDTH / 2, y: -50 },
    vel: { x: 0, y: 0 },
    dims: { width: PLAYER_WIDTH, height: PLAYER_HEIGHT },
    isGrounded: false,
    isJumping: false,
    isStunned: false,
    facingRight: true,
    stunTimer: 0,
    invincibleTimer: 0,
    lives: 3
  });

  const cameraY = useRef(0);
  const platformsRef = useRef<Platform[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Head Image Ref
  const headImageRef = useRef<HTMLImageElement | null>(null);
  // State to force re-render when image loads
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Load Head Image
  useEffect(() => {
    const img = new Image();
    // Try explicit relative path
    img.src = './henderson.png';
    img.onload = () => {
      console.log("Henderson image loaded successfully");
      headImageRef.current = img;
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = (e) => {
      console.error("Henderson Image Error. Check that 'henderson.png' is in the root directory and filename case matches.", e);
      setImageError(true);
    };
  }, []);

  const playSound = (type: 'jump' | 'hit' | 'win' | 'bgm') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1); // C#
      osc.frequency.setValueAtTime(659, now + 0.2); // E
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && gameState.status === 'START') {
        startGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status]);

  const initLevel = () => {
    platformsRef.current = [];
    obstaclesRef.current = [];
    particlesRef.current = [];
    
    // Ground (Y = 0)
    platformsRef.current.push({
      x: -2000,
      y: 0,
      width: 4000, // Infinite ground
      height: 100,
      floor: 0
    });

    // Generate Wyly Tower Floors (Negative Y goes UP)
    for (let i = 1; i <= TOTAL_FLOORS; i++) {
      const yPos = -i * FLOOR_HEIGHT;
      const gapX = (Math.random() * (TOWER_WIDTH - 120)) - (TOWER_WIDTH / 2) + (CANVAS_WIDTH / 2);
      const gapWidth = 90;

      // Left segment
      platformsRef.current.push({
        x: (CANVAS_WIDTH - TOWER_WIDTH) / 2,
        y: yPos,
        width: (gapX - (CANVAS_WIDTH - TOWER_WIDTH) / 2),
        height: 20,
        floor: i
      });

      // Right segment
      platformsRef.current.push({
        x: gapX + gapWidth,
        y: yPos,
        width: ((CANVAS_WIDTH + TOWER_WIDTH) / 2) - (gapX + gapWidth),
        height: 20,
        floor: i
      });
    }
  };

  const startGame = () => {
    initLevel();
    playerRef.current = {
      pos: { x: CANVAS_WIDTH / 2, y: -PLAYER_HEIGHT }, // Start just above ground
      vel: { x: 0, y: 0 },
      dims: { width: PLAYER_WIDTH, height: PLAYER_HEIGHT },
      isGrounded: true,
      isJumping: false,
      isStunned: false,
      facingRight: true,
      stunTimer: 0,
      invincibleTimer: 0,
      lives: 3
    };
    cameraY.current = 0;
    shakeRef.current = 0;
    startTimeRef.current = Date.now();
    setGameState({
      status: 'PLAYING',
      floor: 0,
      timeElapsed: 0,
      score: 0,
    });
  };

  const updatePhysics = () => {
    const player = playerRef.current;
    
    // Stun logic
    if (player.isStunned) {
      player.stunTimer--;
      if (player.stunTimer <= 0) {
        player.isStunned = false;
        player.invincibleTimer = INVINCIBILITY_DURATION;
      }
    }
    
    if (player.invincibleTimer > 0) {
      player.invincibleTimer--;
    }

    // Movement
    if (!player.isStunned) {
      if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
        player.vel.x = -MOVE_SPEED;
        player.facingRight = false;
      } else if (keys.current['ArrowRight'] || keys.current['KeyD']) {
        player.vel.x = MOVE_SPEED;
        player.facingRight = true;
      } else {
        player.vel.x *= FRICTION;
      }

      if ((keys.current['Space'] || keys.current['ArrowUp'] || keys.current['KeyW']) && player.isGrounded) {
        player.vel.y = JUMP_FORCE;
        player.isGrounded = false;
        player.isJumping = true;
        playSound('jump');
      }
    } else {
       player.vel.x *= FRICTION;
    }

    // Gravity
    player.vel.y += GRAVITY;
    
    // Apply Velocity
    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    // Boundaries
    const towerLeft = (CANVAS_WIDTH - TOWER_WIDTH) / 2;
    const towerRight = (CANVAS_WIDTH + TOWER_WIDTH) / 2;
    
    // Allow walking on ground outside tower, but confine to tower when climbing
    if (player.pos.y < -50) {
      if (player.pos.x < towerLeft) player.pos.x = towerLeft;
      if (player.pos.x + player.dims.width > towerRight) player.pos.x = towerRight - player.dims.width;
    } else {
       // Ground bounds (screen edges)
       if (player.pos.x < 0) player.pos.x = 0;
       if (player.pos.x + player.dims.width > CANVAS_WIDTH) player.pos.x = CANVAS_WIDTH - player.dims.width;
    }

    // Platform Collision (One-way platforms)
    player.isGrounded = false;
    
    platformsRef.current.forEach(plat => {
       const platTop = plat.y; 
       const platLeft = plat.x;
       const platRight = plat.x + plat.width;
       
       const playerBottom = player.pos.y + player.dims.height;
       const playerPrevBottom = (player.pos.y - player.vel.y) + player.dims.height;
       
       // Standard AABB check + falling check + was above check
       if (
         player.pos.x + player.dims.width > platLeft + 5 && // +5 tolerance for edges
         player.pos.x < platRight - 5 &&
         player.vel.y >= 0 && // Falling or flat
         playerPrevBottom <= platTop + 15 && // Was above or just barely inside
         playerBottom >= platTop
       ) {
         player.pos.y = platTop - player.dims.height;
         player.vel.y = 0;
         player.isGrounded = true;
         player.isJumping = false;
         
         if (plat.floor > gameState.floor) {
             setGameState(prev => ({ ...prev, floor: plat.floor }));
         }
       }
    });

    // Camera follow (Keep player in lower 40% of screen)
    // We shift the world DOWN (positive translate) as player goes UP (negative Y)
    const targetCamY = (CANVAS_HEIGHT * 0.6) - player.pos.y;
    
    const minCamY = CANVAS_HEIGHT - 50; // Show a bit of ground buffer
    // Lerp
    cameraY.current += (targetCamY - cameraY.current) * 0.1;
    
    // Obstacle Spawning
    // Increased base spawn chance slightly
    if (Math.random() < 0.03 + (gameState.floor * 0.003)) {
       const type = ['book', 'beaker', 'ornament'][Math.floor(Math.random() * 3)] as Obstacle['type'];
       // Spawn above the visible screen area
       // Visible top in WorldY is roughly: -cameraY.current
       const spawnY = -cameraY.current - 100;
       
       let spawnX;
       
       // 70% chance to target player position specifically to force movement
       if (Math.random() < 0.7) {
           // Target player X with some randomness (+/- 60px)
           spawnX = playerRef.current.pos.x + (Math.random() * 120 - 60);
       } else {
           // Random position across tower width
           spawnX = (Math.random() * (TOWER_WIDTH - 40)) + towerLeft;
       }
       
       // Clamp to tower bounds
       if (spawnX < towerLeft) spawnX = towerLeft;
       if (spawnX + 30 > towerRight) spawnX = towerRight - 30;
       
       obstaclesRef.current.push({
         x: spawnX,
         y: spawnY,
         width: 30,
         height: 30,
         speed: 5 + Math.random() * 4 + (gameState.floor * 0.2), // Slightly faster
         rotation: 0,
         type
       });
    }

    // Update Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.y += obs.speed; // Fall down (increase Y)
        obs.rotation += 0.1;

        // Collision
        if (
            !player.isStunned &&
            player.invincibleTimer <= 0 &&
            player.pos.x < obs.x + obs.width &&
            player.pos.x + player.dims.width > obs.x &&
            player.pos.y < obs.y + obs.height &&
            player.pos.y + player.dims.height > obs.y
        ) {
            player.lives--;
            player.isStunned = true;
            player.stunTimer = STUN_DURATION;
            player.vel.y = 0; // Stop momentum
            shakeRef.current = 20;
            playSound('hit');
            
            for(let p=0; p<8; p++) {
                particlesRef.current.push({
                    x: obs.x, y: obs.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 30,
                    color: COLORS.TECH_RED
                });
            }
            obstaclesRef.current.splice(i, 1);
            continue;
        }

        // Remove if far below player/screen
        if (obs.y > player.pos.y + CANVAS_HEIGHT + 200) {
             obstaclesRef.current.splice(i, 1);
        }
    }
    
    if (player.lives <= 0 && gameState.status === 'PLAYING') {
        setGameState(prev => ({ ...prev, status: 'GAMEOVER' }));
    }
    
    // Victory (Top of tower is at y = -TOWER_HEIGHT)
    if (player.pos.y <= -(TOWER_HEIGHT - 100) && gameState.status === 'PLAYING') {
         playSound('win');
         setGameState(prev => ({ ...prev, status: 'VICTORY', timeElapsed: (Date.now() - startTimeRef.current) / 1000 }));
    }
    
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy + GRAVITY;
        p.life--;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    if (shakeRef.current > 0) shakeRef.current *= 0.9;
    if (shakeRef.current < 0.5) shakeRef.current = 0;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const shakeX = (Math.random() - 0.5) * shakeRef.current;
    const shakeY = (Math.random() - 0.5) * shakeRef.current;

    ctx.save();
    
    // Draw Sky (Fixed relative to camera, but shakes)
    ctx.translate(shakeX, shakeY);
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, COLORS.NIGHT_SKY);
    gradient.addColorStop(1, COLORS.SKY);
    ctx.fillStyle = gradient;
    ctx.fillRect(-50, -50, CANVAS_WIDTH+100, CANVAS_HEIGHT+100);
    
    // World Transform
    ctx.translate(0, cameraY.current);

    // Draw Tower Body (from Y=0 upwards to -HEIGHT)
    const towerX = (CANVAS_WIDTH - TOWER_WIDTH) / 2;
    
    // Extend tower height down into ground to prevent gaps
    const towerExtension = 100;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(towerX, -TOWER_HEIGHT, TOWER_WIDTH, TOWER_HEIGHT + towerExtension);
    // Border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 4;
    ctx.strokeRect(towerX, -TOWER_HEIGHT, TOWER_WIDTH, TOWER_HEIGHT + towerExtension);
    
    // Decorative Windows
    ctx.fillStyle = '#87CEEB';
    for (let i = 0; i < TOTAL_FLOORS; i++) {
        const wy = -(i * FLOOR_HEIGHT) - 60;
        ctx.fillRect(towerX + 50, wy, 40, 60);
        ctx.fillRect(towerX + TOWER_WIDTH - 90, wy, 40, 60);
        ctx.fillRect(towerX + TOWER_WIDTH/2 - 20, wy, 40, 60);
    }
    
    // Draw Platforms
    platformsRef.current.forEach(p => {
        if (p.floor === 0) {
            // Ground
            ctx.fillStyle = '#1a472a'; // Grass/Dark Green
            ctx.fillRect(-2000, 0, 4000, 200);
            // Snow on ground
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-2000, 0, 4000, 15);
        } else {
            // Ledges
            ctx.fillStyle = COLORS.GREY;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            // Snow topper
            ctx.fillStyle = '#fff';
            ctx.fillRect(p.x, p.y, p.width, 6);
            // Icicles (simple triangles)
            ctx.beginPath();
            ctx.moveTo(p.x + 10, p.y + p.height);
            ctx.lineTo(p.x + 15, p.y + p.height + 10);
            ctx.lineTo(p.x + 20, p.y + p.height);
            ctx.fill();
        }
    });

    // Draw Player
    const p = playerRef.current;
    ctx.save();
    // Translate to center of player hitbox for drawing
    ctx.translate(Math.floor(p.pos.x + p.dims.width / 2), Math.floor(p.pos.y + p.dims.height / 2));
    
    if (p.isStunned) ctx.rotate(Math.sin(Date.now() / 50) * 0.5);
    if (!p.facingRight) ctx.scale(-1, 1);

    // Wreath on Back (Draw first so it's behind)
    ctx.beginPath();
    ctx.arc(-8, -10, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0f5f0f'; // Dark green
    ctx.fill();
    ctx.strokeStyle = '#2f8f2f'; 
    ctx.lineWidth = 4;
    ctx.stroke();
    // Wreath berries
    ctx.fillStyle = 'red';
    ctx.beginPath(); ctx.arc(-15, -15, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-5, -25, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -5, 3, 0, Math.PI*2); ctx.fill();

    // Body (Blue Suit) - Small cartoon body
    ctx.fillStyle = COLORS.TECH_BLUE;
    // Tapered body
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(14, -10);
    ctx.lineTo(10, 25);
    ctx.lineTo(-10, 25);
    ctx.fill();
    
    // Tie
    ctx.fillStyle = COLORS.TECH_RED;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 20);
    ctx.lineTo(-4, 5);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#001f5b'; // Darker blue pants
    if (p.isJumping) {
        // Jumping pose
        ctx.fillRect(-12, 20, 8, 15);
        ctx.fillRect(4, 15, 8, 15);
    } else if (Math.abs(p.vel.x) > 0.1) {
        // Run cycle
        const cycle = Math.sin(Date.now() / 60);
        ctx.fillRect(-12, 20 + cycle * 5, 8, 15);
        ctx.fillRect(4, 20 - cycle * 5, 8, 15);
    } else {
        // Stand
        ctx.fillRect(-12, 20, 8, 15);
        ctx.fillRect(4, 20, 8, 15);
    }

    // Arms
    ctx.strokeStyle = COLORS.TECH_BLUE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    if (p.isJumping) {
        ctx.moveTo(-12, -5); ctx.lineTo(-20, -25); // Arms up
        ctx.moveTo(12, -5); ctx.lineTo(20, -25);
    } else {
         const armSway = Math.sin(Date.now() / 60) * 10;
         ctx.moveTo(-12, -5); ctx.lineTo(-20, 10 + armSway);
         ctx.moveTo(12, -5); ctx.lineTo(20, 10 - armSway);
    }
    ctx.stroke();
    // Hands
    ctx.fillStyle = '#fce0d1';
    ctx.beginPath(); ctx.arc(p.isJumping ? -20 : -20, p.isJumping ? -25 : 10, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.isJumping ? 20 : 20, p.isJumping ? -25 : 10, 5, 0, Math.PI*2); ctx.fill();

    // HEAD - Image or Fallback
    if (headImageRef.current) {
         ctx.save();
         ctx.translate(0, -35); // Position head above body
         // Draw Image directly without clipping to allow custom shapes/transparency
         // Draw centered
         ctx.drawImage(headImageRef.current, -35, -35, 70, 70);
         ctx.restore();
    } else {
        // Fallback Head (Big Caricature)
        ctx.fillStyle = '#fce0d1'; // Skin
        ctx.beginPath();
        ctx.arc(0, -28, 26, 0, Math.PI * 2); 
        ctx.fill();

        // Hair - Short & Flat (No Puffs)
        ctx.fillStyle = '#dddddd';
        ctx.beginPath();
        // Simple flat top, tight to the head
        ctx.ellipse(0, -49, 20, 5, 0, 0, Math.PI * 2); 
        ctx.fill();

        // Glasses
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-8, -28, 8, 0, Math.PI*2); // Left lens
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(8, -28, 8, 0, Math.PI*2); // Right lens
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        
        ctx.beginPath(); // Bridge
        ctx.moveTo(-1, -28); ctx.lineTo(1, -28);
        ctx.stroke();

        // Smile
        ctx.strokeStyle = '#a67c52';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }

    // Stun Stars
    if (p.isStunned) {
        ctx.fillStyle = '#ffff00';
        for(let i=0; i<3; i++) {
            const angle = (Date.now() / 200) + (i * (Math.PI*2/3));
            const sx = Math.cos(angle) * 35;
            const sy = Math.sin(angle) * 10 - 45;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }

    ctx.restore();

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
        ctx.save();
        ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
        ctx.rotate(obs.rotation);
        
        if (obs.type === 'book') {
            ctx.fillStyle = '#8B4513'; // Leather cover
            ctx.fillRect(-15, -20, 30, 40);
            ctx.fillStyle = '#f5f5dc'; // Pages
            ctx.fillRect(-12, -18, 24, 36);
            ctx.fillStyle = 'gold'; // Title
            ctx.fillRect(-5, -10, 10, 5);
        } else if (obs.type === 'beaker') {
            // Glass shape
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.moveTo(-10, -15);
            ctx.lineTo(10, -15);
            ctx.lineTo(15, 15);
            ctx.lineTo(-15, 15);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            // Liquid
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(-12, 0);
            ctx.lineTo(12, 0);
            ctx.lineTo(14, 14);
            ctx.lineTo(-14, 14);
            ctx.fill();
            // Bubbles
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, -5, 2, 0, Math.PI*2); ctx.fill();
        } else {
            // Ornament
            ctx.fillStyle = COLORS.TECH_RED;
            ctx.beginPath();
            ctx.arc(0, 2, 14, 0, Math.PI*2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(-5, -3, 4, 0, Math.PI*2); ctx.fill();
            // Cap
            ctx.fillStyle = 'gold';
            ctx.fillRect(-5, -16, 10, 6);
        }
        ctx.restore();
    });

    // Particles
    particlesRef.current.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, 3, 0, Math.PI*2);
        ctx.fill();
    });

    ctx.restore(); // End World Transform
  };

  const loop = useCallback(() => {
    if (gameState.status === 'PLAYING') {
      updatePhysics();
    }
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState.status]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  const formattedTime = () => {
      const t = (gameState.status === 'PLAYING') 
        ? (Date.now() - startTimeRef.current) / 1000 
        : gameState.timeElapsed;
      return t.toFixed(2);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-white shadow-2xl rounded-lg bg-gray-800"
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-bold text-xl drop-shadow-md select-none">
        <div className="flex items-center gap-2">
            <Heart className="text-red-500 fill-red-500" />
            <span>x {playerRef.current.lives}</span>
        </div>
        
        {/* Debug indicator for missing image */}
        {imageError && (
            <div className="flex items-center gap-2 text-red-400 text-sm mt-2 bg-black/50 p-1 rounded">
                <ImageOff size={16} />
                <span>Img Error</span>
            </div>
        )}
      </div>
      
      <div className="absolute top-4 right-4 text-white font-bold text-xl drop-shadow-md select-none">
        <div className="flex items-center gap-2">
            <Timer className="text-yellow-400" />
            <span>{formattedTime()}s</span>
        </div>
        <div className="text-sm text-right text-gray-300">Floor: {gameState.floor} / {TOTAL_FLOORS}</div>
      </div>

      {gameState.status === 'START' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm">
          <h1 className="text-6xl font-extrabold text-[#002f8b] bg-white px-6 py-2 rounded-lg mb-4 transform -rotate-2 border-4 border-[#e31b23]">
            Henderson's Climb
          </h1>
          <p className="text-lg mb-8 max-w-md">
            Help Dr. Henderson scale Wyly Tower!
            <br/> Avoid the falling lab equipment.
            <br/><br/>
            <span className="text-yellow-400">Controls:</span><br/>
            Arrows/WASD to Move & Jump
          </p>
          <button 
            onClick={startGame}
            className="px-8 py-4 bg-[#e31b23] text-white text-2xl font-bold rounded-full hover:bg-red-600 transition-transform transform hover:scale-110 active:scale-95 shadow-lg flex items-center gap-2"
          >
            <ArrowUp size={32} /> START CLIMBING
          </button>
        </div>
      )}

      {gameState.status === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8 text-center">
          <h2 className="text-5xl font-bold text-red-500 mb-4">OUCH!</h2>
          <p className="text-xl mb-6">Dr. Henderson got bonked!</p>
          <div className="mb-6 text-2xl">
            Reached Floor: <span className="text-yellow-400">{gameState.floor}</span>
          </div>
          <button 
            onClick={startGame}
            className="px-6 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-500 flex items-center gap-2"
          >
            <RotateCcw /> Try Again
          </button>
        </div>
      )}

      {gameState.status === 'VICTORY' && (
        <div className="absolute inset-0 bg-[#002f8b]/95 flex flex-col items-center justify-center text-white p-8 text-center">
          <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
          <h2 className="text-5xl font-bold mb-2">VICTORY!</h2>
          <p className="text-lg mb-6">The Wreath is placed!</p>
          
          <div className="bg-white/10 p-6 rounded-xl mb-8 border border-white/20">
            <div className="text-sm uppercase tracking-widest text-gray-300">Final Time</div>
            <div className="text-5xl font-mono font-bold text-yellow-300">{gameState.timeElapsed.toFixed(2)}s</div>
          </div>
          
          <button 
            onClick={startGame}
            className="px-6 py-3 bg-[#e31b23] rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw /> Climb Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;