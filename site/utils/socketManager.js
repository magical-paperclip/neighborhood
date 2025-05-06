import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.players = new Map();
    this.onPlayersUpdate = null;
    this.connected = false;
    this.onConnectionStatusChange = null;
    this.debug = true; // Enable debug logging
  }

  log(...args) {
    if (this.debug) {
      console.log('[SocketManager]', ...args);
    }
  }

  connect() {
    if (this.socket) return;

    this.log('Connecting to server on port 3001...');
    this.socket = io('https://express.spectralo.hackclub.app', {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // allow polling then upgrade
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for connection errors and reconnection attempts
    this.socket.on('connect_error', (err) => {
      this.log('Connection error:', err.message);
    });
    this.socket.on('reconnect_attempt', (attempt) => {
      this.log('Reconnection attempt:', attempt);
    });
    this.socket.on('reconnect_failed', () => {
      this.log('Reconnection failed');
    });
    this.socket.on('reconnect', (attempt) => {
      this.log('Reconnected after attempts:', attempt);
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.log('Connected to server with ID:', this.socket.id);
      this.onConnectionStatusChange?.(true);
    });

    this.socket.on('players', (players) => {
      this.players.clear(); // Clear existing players first
      players.forEach(player => {
        if (player.id !== this.socket.id) {
          this.players.set(player.id, player);
        }
      });
      this.onPlayersUpdate?.(this.players);
    });

    this.socket.on('playerJoined', (player) => {
      if (player.id !== this.socket.id) {
        this.players.set(player.id, player);
        this.onPlayersUpdate?.(this.players);
      }
    });

    this.socket.on('playerLeft', (playerId) => {
      this.players.delete(playerId);
      this.onPlayersUpdate?.(this.players);
    });

    this.socket.on('playerMoved', (data) => {
      if (data.id !== this.socket.id) {
        this.players.set(data.id, data);
        this.onPlayersUpdate?.(this.players);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.log('Disconnected from server. Reason:', reason);
      this.onConnectionStatusChange?.(false);
      this.players.clear();
      this.onPlayersUpdate?.(this.players);
    });
  }

  updateTransform(position, quaternion, isMoving = false) {
    if (this.socket && this.connected) {
      this.socket.emit('updateTransform', { position, quaternion, isMoving });
    }
  }

  disconnect() {
    if (this.socket) {
      this.log('Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
      this.players.clear();
    }
  }
}

export const socketManager = new SocketManager(); 