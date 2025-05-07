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
    this._sentFirstUpdate = false;
  }

  log(...args) {
    if (this.debug) {
      console.log('[SocketManager]', ...args);
    }
  }

  connect() {
    if (this.socket) return;

    this.log('Connecting to server...');
    
    // Use the Hack Club selfhosted URL
    const socketUrl = 'https://vgso8kg840ss8cok4s4cwwgk.a.selfhosted.hackclub.com';
    
    this.log(`Using socket URL: ${socketUrl}`);
    
    // Force polling transport only to avoid WebSocket issues
    this.socket = io(socketUrl, {
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for connection errors and reconnection attempts
    this.socket.on('connect_error', (err) => {
      this.log('Connection error:', err.message);
      console.error('[SocketManager] Connection error details:', err);
      this.onConnectionStatusChange?.(false);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.log(`Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      this.log('Failed to reconnect after all attempts');
      this.onConnectionStatusChange?.(false);
    });

    this.socket.on('error', (error) => {
      this.log('Socket error:', error);
      console.error('[SocketManager] Socket error:', error);
    });

    this.socket.io.on('error', (error) => {
      this.log('Transport error:', error);
      console.error('[SocketManager] Transport error:', error);
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.log('Connected to server with ID:', this.socket.id);
      this.onConnectionStatusChange?.(true);
      
      // Request initial players data - important fix for player sync
      this.socket.emit('requestPlayers');
      
      // Send initial transform to register ourselves on the server
      if (typeof window !== 'undefined') {
        this.log('Sending initial transform to register on server');
        this.socket.emit('updateTransform', {
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
          isMoving: false,
          moveState: { w: false, a: false, s: false, d: false, space: false }
        });
      }
    });
    
    // Add explicit heartbeat to ensure connection stays alive
    setInterval(() => {
      if (this.socket && this.connected) {
        this.log('Sending heartbeat ping');
        this.socket.emit('heartbeat');
      }
    }, 10000);

    this.socket.on('playersUpdate', (players) => {
      this.log(`Received playersUpdate event with ${players.length} players`);
      
      try {
        this.players.clear(); // Clear existing players first
        
        if (Array.isArray(players)) {
          players.forEach(([id, player]) => {
            if (id !== this.socket.id) {
              this.players.set(id, player);
            }
          });
        } else {
          this.log('Warning: players is not an array:', players);
        }
        
        this.onPlayersUpdate?.(this.players);
        this.log(`Updated players map: ${this.players.size} players`);
      } catch (err) {
        this.log('Error processing players update:', err);
        console.error('[SocketManager] Error processing players:', err);
      }
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
      // Log the first update for debugging
      if (!this._sentFirstUpdate) {
        this.log('Sending first transform update:', {
          position,
          isMoving,
          moveState
        });
        this._sentFirstUpdate = true;
      }

      this.socket.emit('updateTransform', {
        position,
        quaternion,
        isMoving,
        moveState: moveState || { w: false, a: false, s: false, d: false, space: false }
      });
    } else {
      this.log('Cannot update transform - socket not connected');
      
      // If socket exists but not connected, try reconnecting
      if (this.socket && !this.connected) {
        this.log('Attempting to reconnect...');
        this.socket.connect();
      }
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