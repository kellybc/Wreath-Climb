export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Player {
  pos: Position;
  vel: Position;
  dims: Dimensions;
  isGrounded: boolean;
  isJumping: boolean;
  isStunned: boolean;
  facingRight: boolean;
  stunTimer: number;
  invincibleTimer: number;
  lives: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  floor: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  rotation: number;
  type: 'book' | 'beaker' | 'ornament';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameState {
  status: 'START' | 'PLAYING' | 'VICTORY' | 'GAMEOVER';
  floor: number;
  timeElapsed: number;
  score: number;
}

export interface HighScore {
  name: string;
  time: number;
  date: string;
}