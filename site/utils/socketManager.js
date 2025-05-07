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

    this.log('Connecting to server...');
    
    // Use the Hack Club selfhosted URL
    const socketUrl = 'https://vgso8kg840ss8cok4s4cwwgk.a.selfhosted.hackclub.com';
    
    this.log(`Using socket URL: ${socketUrl}`);
    
    // Simpler configuration focused on compatibility
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true
    });

    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!this.connected) {
        this.log('Connection timed out, trying to reconnect...');
        // Try again with polling only if websocket failed
        if (this.socket) {
          this.socket.disconnect();
          this.socket = io(socketUrl, {
            transports: ['polling'],
            reconnection: true,
            timeout: 10000
          });
          this.setupEventHandlers();
        }
      }
    }, 5000);

    // Clear the timeout if we connect successfully
    this.socket.on('connect', () => {
      clearTimeout(connectionTimeout);
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
    });

    this.socket.on('playersUpdate', (players) => {
      this.log(`Received playersUpdate event with ${players.length} players`);
      this.players.clear(); // Clear existing players first
      players.forEach(([id, player]) => {
        if (id !== this.socket.id) {
          this.players.set(id, player);
        }
      });
      this.onPlayersUpdate?.(this.players);
      this.log(`Updated players map: ${this.players.size} players`);
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