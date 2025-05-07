import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.players = new Map();
    this.onPlayersUpdate = null;
    this.connected = false;
    this.onConnectionStatusChange = null;
    this.debug = true; // Enable debug logging
    this.onSimonSaysStarted = null;
    this.onSimonSaysStopped = null;
    this.onSimonSaysCommand = null;
    this.onSimonSaysUpdate = null;
    this.simonSaysActive = false;
  }

  log(...args) {
    if (this.debug) {
      console.log('[SocketManager]', ...args);
    }
  }

  connect() {
    if (this.socket) return;

    this.log('Connecting to server on port 3002...');
    this.socket = io('https://express.spectralo.hackclub.app/', {
      transports: ['websocket', 'polling'],
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

    this.socket.on('connect', () => {
      this.connected = true;
      this.log('Connected to server with ID:', this.socket.id);
      this.onConnectionStatusChange?.(true);
    });

    this.socket.on('playersUpdate', (players) => {
      this.players.clear(); // Clear existing players first
      players.forEach(([id, player]) => {
        if (id !== this.socket.id) {
          this.players.set(id, player);
        }
      });
      this.onPlayersUpdate?.(this.players);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.log('Disconnected from server. Reason:', reason);
      this.onConnectionStatusChange?.(false);
      this.players.clear();
      this.onPlayersUpdate?.(this.players);
      this.simonSaysActive = false;
    });
    
    // Simon Says event handlers
    this.socket.on('simonSaysStarted', (command) => {
      this.log('Received simonSaysStarted event:', command);
      this.simonSaysActive = true;
      if (this.onSimonSaysStarted) {
        this.onSimonSaysStarted(command);
      }
    });
    
    this.socket.on('simonSaysStopped', () => {
      this.log('Received simonSaysStopped event');
      this.simonSaysActive = false;
      if (this.onSimonSaysStopped) {
        this.onSimonSaysStopped();
      }
    });
    
    this.socket.on('simonSaysCommand', (command) => {
      this.log('Received simonSaysCommand event:', command);
      if (this.onSimonSaysCommand) {
        this.onSimonSaysCommand(command);
      }
    });
    
    this.socket.on('simonSaysUpdate', (data) => {
      this.log('Received simonSaysUpdate event:', data);
      if (this.onSimonSaysUpdate) {
        this.onSimonSaysUpdate(data);
      }
    });
  }

  updateTransform(position, quaternion, isMoving, moveState) {
    if (this.socket && this.connected) {
      this.socket.emit('updateTransform', {
        position,
        quaternion,
        isMoving,
        moveState
      });
    }
  }

  startSimonSays() {
    if (this.socket && this.connected) {
      this.log('Requesting to start Simon Says');
      this.socket.emit('startSimonSays');
    }
  }
  
  stopSimonSays() {
    if (this.socket && this.connected) {
      this.log('Requesting to stop Simon Says');
      this.socket.emit('stopSimonSays');
    }
  }

  disconnect() {
    if (this.socket) {
      this.log('Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
      this.players.clear();
      this.simonSaysActive = false;
    }
  }
}

export const socketManager = new SocketManager(); 