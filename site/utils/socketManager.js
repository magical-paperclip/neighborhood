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
    this._connectionAttempts = 0;
    this._maxReconnectAttempts = 10;
    this._baseReconnectDelay = 1000;
  }

  log(...args) {
    if (this.debug) {
      console.log('[SocketManager]', ...args);
    }
  }

  connect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.log('Connecting to server...');
    this._connectionAttempts++;
    
    // Use the Hack Club selfhosted URL
    const socketUrl = 'https://vgso8kg840ss8cok4s4cwwgk.a.selfhosted.hackclub.com';
    
    this.log(`Using socket URL: ${socketUrl} (attempt ${this._connectionAttempts})`);
    
    // Force polling transport only to avoid WebSocket issues
    this.socket = io(socketUrl, {
      transports: ['polling'],
      reconnection: false, // We'll handle reconnection manually
      timeout: 20000,
      forceNew: true
    });

    // Set up a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!this.connected && this.socket) {
        this.log('Connection attempt timed out');
        this.socket.disconnect();
        this.tryReconnect();
      }
    }, 10000);

    this.setupEventHandlers(connectionTimeout);
    
    // Send a connection status update every 5 seconds while not connected
    if (!this._connectionStatusInterval) {
      this._connectionStatusInterval = setInterval(() => {
        if (!this.connected) {
          this.log('Still trying to connect...');
          this.onConnectionStatusChange?.(false);
        } else {
          clearInterval(this._connectionStatusInterval);
          this._connectionStatusInterval = null;
        }
      }, 5000);
    }
  }

  tryReconnect() {
    if (this._connectionAttempts >= this._maxReconnectAttempts) {
      this.log('Max reconnection attempts reached, giving up');
      this.onConnectionStatusChange?.(false);
      return;
    }

    // Use exponential backoff with jitter
    const delay = Math.min(30000, this._baseReconnectDelay * Math.pow(1.5, this._connectionAttempts)) * 
                  (0.5 + Math.random());
    
    this.log(`Scheduling reconnection attempt in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
      this.log('Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  setupEventHandlers(connectionTimeout) {
    // Clear listeners from previous connections
    this.socket.removeAllListeners();
    
    // Listen for connection errors and reconnection attempts
    this.socket.on('connect_error', (err) => {
      this.log('Connection error:', err.message);
      console.error('[SocketManager] Connection error details:', err);
      clearTimeout(connectionTimeout);
      this.onConnectionStatusChange?.(false);
      this.socket.disconnect();
      this.tryReconnect();
    });

    this.socket.on('error', (error) => {
      this.log('Socket error:', error);
      console.error('[SocketManager] Socket error:', error);
      this.onConnectionStatusChange?.(false);
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this._connectionAttempts = 0; // Reset counter on successful connection
      clearTimeout(connectionTimeout);
      this.log('Connected to server with ID:', this.socket.id);
      this.onConnectionStatusChange?.(true);
      
      // Request initial players data - important fix for player sync
      this.socket.emit('requestPlayers');
      
      // Send initial transform to register ourselves on the server
      if (typeof window !== 'undefined') {
        this.log('Sending initial transform to register on server');
        this._forceRegisterOnServer();
      }
      
      // Set up heartbeat for this connection
      this._setupHeartbeat();
    });
    
    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected from server. Reason:', reason);
      this.connected = false;
      this.onConnectionStatusChange?.(false);
      this.players.clear();
      this.onPlayersUpdate?.(this.players);
      this.simonSaysActive = false;
      
      // Try to reconnect unless it was a manual disconnect
      if (reason !== 'io client disconnect') {
        this.tryReconnect();
      }
    });

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
    
    // Handle heartbeat acknowledgement
    this.socket.on('heartbeatAck', (data) => {
      this.log(`Heartbeat acknowledged. Server has ${data.playerCount} players`);
      
      // If server reports players but our map is empty, request an update
      if (data.playerCount > 0 && this.players.size === 0) {
        this.log('Server reports players but our map is empty, requesting update');
        this.socket.emit('requestPlayers');
      }
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
  
  _setupHeartbeat() {
    // Clear any existing heartbeat
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    // Set up a new heartbeat
    this._heartbeatInterval = setInterval(() => {
      if (this.socket && this.connected) {
        this.log('Sending heartbeat ping');
        this.socket.emit('heartbeat');
        
        // Also send a position update to ensure we stay registered
        this._forceRegisterOnServer();
      } else {
        clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = null;
      }
    }, 5000);
  }
  
  _forceRegisterOnServer() {
    this.socket.emit('updateTransform', {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isMoving: false,
      moveState: { w: false, a: false, s: false, d: false, space: false }
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
        this.log('Not connected during updateTransform, attempting to reconnect...');
        this.connect();
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
      
      // Clear intervals
      if (this._heartbeatInterval) {
        clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = null;
      }
      
      if (this._connectionStatusInterval) {
        clearInterval(this._connectionStatusInterval);
        this._connectionStatusInterval = null;
      }
      
      this.socket.disconnect();
      this.socket = null;
      this.players.clear();
      this.simonSaysActive = false;
      this.connected = false;
    }
  }
}

export const socketManager = new SocketManager(); 