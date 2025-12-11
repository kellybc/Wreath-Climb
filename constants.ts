export const GRAVITY = 0.6;
export const FRICTION = 0.8;
export const MOVE_SPEED = 6;
export const JUMP_FORCE = -16;
export const STUN_DURATION = 60; // Frames (approx 1 sec)
export const INVINCIBILITY_DURATION = 120; // Frames

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const TOWER_WIDTH = 400;
export const FLOOR_HEIGHT = 120; // Distance between floors
export const TOTAL_FLOORS = 16;
export const TOWER_HEIGHT = TOTAL_FLOORS * FLOOR_HEIGHT;

export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 60;
export const HEAD_RADIUS = 25; // Big head mode

// LaTech Colors
export const COLORS = {
  TECH_BLUE: '#002f8b',
  TECH_RED: '#e31b23',
  WHITE: '#ffffff',
  GREY: '#a0a0a0',
  SKY: '#87CEEB',
  NIGHT_SKY: '#0a0a2a'
};

export const OBSTACLE_TYPES = ['book', 'beaker', 'ornament'] as const;