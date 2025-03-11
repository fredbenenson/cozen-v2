// Type definitions for boardgame.io v0.50.2
// This file adds proper type definitions for boardgame.io to help with strict TypeScript mode

declare module 'boardgame.io' {
  // Default Plugin APIs interface to match newer boardgame.io versions
  export interface DefaultPluginAPIs {
    // Add any fields required by the boardgame.io internals
    [key: string]: any;
  }

  export interface Ctx {
    numPlayers: number;
    turn: number;
    currentPlayer: string;
    playOrder: string[];
    playOrderPos: number;
    phase: string;
    activePlayers: Record<string, string>;
    random?: {
      Die: (min: number, max: number, spotValue?: number) => number;
      Number: () => number;
      Shuffle: <T>(deck: T[]) => T[];
    };
    events: {
      endGame: (result?: any) => void;
      endPhase: () => void;
      endTurn: () => void;
      setPhase: (phase: string) => void;
      setActivePlayers: (players: Record<string, string>) => void;
    };
  }

  // New interface for boardgame.io 0.50+ that uses a context object
  export type GameContext<T = any> = Record<string, unknown> & DefaultPluginAPIs & { ctx: Ctx } & T;

  // Original Game interface kept for backward compatibility
  export interface Game<GameState = any, ContextData = any, API extends any = any> {
    name?: string;
    // Support both the older ctx param and newer context object patterns
    setup: ((ctx: Ctx, setupData?: any) => GameState) | 
           ((context: GameContext<ContextData>, setupData?: any) => GameState);
    moves?: Record<string, (context: { G: GameState; ctx: Ctx }, ...args: any[]) => GameState | void | string>;
    phases?: Record<string, PhaseConfig<GameState>>;
    turn?: TurnConfig<GameState>;
    playerView?: (G: GameState, ctx: Ctx, playerID: string) => any;
    endIf?: (G: GameState, ctx: Ctx) => any;
    minPlayers?: number;
    maxPlayers?: number;
    seed?: string;
    ai?: {
      enumerate: (G: GameState, ctx: Ctx, playerID?: string) => Array<{ move: string; args: any[] }>;
    };
  }

  export interface PhaseConfig<GameState = any> {
    start?: boolean;
    next?: string;
    onBegin?: (G: GameState, ctx: Ctx) => GameState | void;
    onEnd?: (G: GameState, ctx: Ctx) => GameState | void;
    endIf?: (G: GameState, ctx: Ctx) => boolean | void;
    moves?: Record<string, (context: { G: GameState; ctx: Ctx }, ...args: any[]) => GameState | void | string>;
    turn?: TurnConfig<GameState>;
  }

  export interface TurnConfig<GameState = any> {
    activePlayers?: Record<string, string>;
    minMoves?: number;
    maxMoves?: number;
    onBegin?: (G: GameState, ctx: Ctx) => GameState | void;
    onEnd?: (G: GameState, ctx: Ctx) => GameState | void;
    endIf?: (G: GameState, ctx: Ctx) => boolean | void;
    onMove?: (G: GameState, ctx: Ctx) => GameState | void;
    stages?: Record<string, StageConfig<GameState>>;
    moveLimit?: number;
    order?: TurnOrderConfig;
  }

  export interface StageConfig<GameState = any> {
    moves?: Record<string, (context: { G: GameState; ctx: Ctx }, ...args: any[]) => GameState | void | string>;
    next?: string;
  }

  export interface TurnOrderConfig {
    first: (G: any, ctx: Ctx) => number;
    next: (G: any, ctx: Ctx) => number;
    playOrder?: (G: any, ctx: Ctx) => string[];
  }
}

declare module 'boardgame.io/core' {
  export const INVALID_MOVE: string;
}

declare module 'boardgame.io/server' {
  import { Game } from 'boardgame.io';
  import { Server } from 'http';

  export interface ServerConfig {
    games: Game[];
    port?: number;
    origins?: string[];
    apiOrigins?: string[];
    apiPort?: number;
    credentials?: any;
    db?: any;
    apiCallback?: (app: any) => void;
  }

  export function Server(config: ServerConfig): {
    run: (portOrCallback?: number | (() => void), callback?: () => void) => Server;
    app: any;
    db: any;
  };
}

declare module 'boardgame.io/react' {
  import { Game } from 'boardgame.io';
  import { Component, ComponentType } from 'react';

  export interface BoardProps<GameState = any> {
    G: GameState;
    ctx: any;
    moves: Record<string, (...args: any[]) => void>;
    events: Record<string, (...args: any[]) => void>;
    playerID: string;
    reset: () => void;
    undo: () => void;
    redo: () => void;
    step: () => void;
    log: any[];
    gameID: string;
    gameMetadata: any;
    matchID: string;
    isActive: boolean;
    isMultiplayer: boolean;
    isConnected: boolean;
    credentials: string;
  }

  export function Client<GameState = any>(config: {
    game: Game<GameState>;
    board?: ComponentType<BoardProps<GameState>>;
    numPlayers?: number;
    multiplayer?: any;
    debug?: boolean;
    ai?: any;
  }): ComponentType<any>;
}

declare module 'boardgame.io/ai' {
  export function AI(config: { enumerate: (G: any, ctx: any, playerID?: string) => any[] }): {
    strategy: (G: any, ctx: any) => { action: any; metadata: any };
    setOpts: (options: any) => void;
  };
  
  export const RandomBot: {
    strategy: (G: any, ctx: any) => { action: any; metadata: any };
    setOpts: (options: any) => void;
  };
}

declare module 'boardgame.io/multiplayer' {
  export function SocketIO(options?: { server?: string; socketOpts?: any }): any;
  export function Local(): any;
}

declare module 'boardgame.io/client' {
  // Import all types to match any version of the library
  import { Game } from 'boardgame.io';

  export function Client(config: {
    game: any;
    board?: any;
    numPlayers?: number;
    multiplayer?: any;
    debug?: boolean;
    ai?: any;
    playerID?: string;
  }): any;
}