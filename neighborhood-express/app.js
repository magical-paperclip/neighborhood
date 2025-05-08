import createError from "http-errors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import simonSaysController from "./controllers/simonSaysController.js";

import videoRouter from "./routes/video.js";
import gameRouter from "./routes/game.js";
import { setClientsReference } from "./routes/game.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy headers from Coolify or other reverse proxies
app.set('trust proxy', true);

const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 30000,
  path: '/socket.io'
});

// Track raw socket connections at engine.io level
ioServer.engine.on('connection', (rawSocket) => {
  console.log(`[ENGINE] Raw socket connected: ${rawSocket.id}`);
  
  rawSocket.on('close', (reason) => {
    console.log(`[ENGINE] Raw socket closed: ${rawSocket.id}, reason: ${reason}`);
  });
  
  rawSocket.on('error', (err) => {
    console.log(`[ENGINE] Raw socket error: ${rawSocket.id}, error: ${err.message}`);
  });
});

// Debug players map state
function logPlayersMap() {
  console.log(`[APP] Current players (${players.size}):`);
  if (players.size > 0) {
    players.forEach((player, id) => {
      console.log(`- Player ${id}: pos=${JSON.stringify(player.position)}`);
    });
  } else {
    console.log('No players currently in the map');
  }
  
  // Log current Socket.IO connections
  console.log(`[APP] Socket.IO connected clients: ${ioServer.engine.clientsCount}`);
  
  try {
    // Get detailed sockets info
    const sockets = Array.from(ioServer.sockets.sockets);
    console.log(`[APP] Socket.IO sockets count: ${sockets.length}`);
    
    if (sockets.length > 0) {
      sockets.forEach(([id, socket]) => {
        console.log(`- Socket ${id}: connected=${socket.connected}, rooms=${Array.from(socket.rooms).join(',')}`);
      });
    } else {
      console.log('[APP] No Socket.IO sockets found in sockets map');
    }
    
    // Get raw engine clients
    const engineSockets = Object.keys(ioServer.engine.clients || {});
    console.log(`[APP] Engine sockets: ${engineSockets.length}`);
    engineSockets.forEach(id => console.log(`- Engine socket: ${id}`));
  } catch (err) {
    console.error('[APP] Error getting socket details:', err);
  }
}

// Set interval to log players state (more frequent for debugging)
const logInterval = setInterval(logPlayersMap, 10000);

// Track client versions and connection issues
const clientVersions = new Map();
const connectionIssues = new Map();

// Log middleware for all Socket.IO events
ioServer.use((socket, next) => {
  console.log(`[MIDDLEWARE] Socket middleware running for ${socket.id}`);
  
  // Log all socket events
  const onevent = socket.onevent;
  socket.onevent = function(packet) {
    const args = packet.data || [];
    console.log(`[EVENT] Socket ${socket.id} event: ${args[0]} with ${args.length-1} args`);
    onevent.call(this, packet);
  };
  
  next();
});

const players = new Map();

ioServer.on('connection', (socket) => {
  console.log(`[APP] Player socket connected: ${socket.id} (Total: ${ioServer.engine.clientsCount})`);
  console.log(`[APP] Socket details: transport=${socket.conn?.transport?.name}, readyState=${socket.conn?.readyState}`);
  
  // Debug handshake
  try {
    console.log(`[APP] Socket handshake: address=${socket.handshake.address}, headers=${JSON.stringify(socket.handshake.headers['user-agent'])}`);
    console.log(`[APP] Socket query params:`, socket.handshake.query);
  } catch (err) {
    console.log(`[APP] Error logging handshake: ${err.message}`);
  }
  
  // Log immediate socket.io manager state
  console.log(`[APP] Current socket.io state: engine clients=${ioServer.engine.clientsCount}, namespace clients=${ioServer.sockets.sockets.size}`);
  
  // Force socket into a room to track them
  socket.join(`player:${socket.id}`);
  console.log(`[APP] Added socket ${socket.id} to room player:${socket.id}`);
  
  // Handle client logs
  socket.on('clientLog', (data) => {
    console.log(`[CLIENT:${socket.id}] ${data.message}`);
  });
  
  // Create a placeholder entry for the player
  // This ensures they're in the players map even if they haven't moved yet
  if (!players.has(socket.id)) {
    console.log(`[APP] Creating placeholder entry for new player: ${socket.id}`);
    // Check if socket exists and is connected 
    console.log(`[APP] Socket ${socket.id} connected status: ${socket.connected}`);
    
    players.set(socket.id, {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isMoving: false,
      lastUpdate: Date.now()
    });
    
    // Log players map immediately after adding a player
    console.log(`[APP] Players map now has ${players.size} players after adding ${socket.id}`);
    for (const playerId of players.keys()) {
      console.log(`[APP] - Player in map: ${playerId}`);
    }
    
    // Double-check socket is in the server's socket list
    const socketStillExists = ioServer.sockets.sockets.has(socket.id);
    console.log(`[APP] Double-check: socket ${socket.id} exists in sockets map: ${socketStillExists}`);
    
    // Broadcast to all clients that a new player joined
    ioServer.emit('playersUpdate', Array.from(players.entries()));
  }
  
  // Track connection issues
  connectionIssues.set(socket.id, {
    connectTime: Date.now(),
    lastActivity: Date.now(),
    updateCount: 0,
    heartbeatCount: 0
  });
  
  // Debug emit
  socket.emit('debug', { message: 'Server received your connection' });
  
  // Log all disconnection events
  socket.on('disconnecting', (reason) => {
    console.log(`[APP] Socket ${socket.id} disconnecting. Reason: ${reason}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`[APP] Socket ${socket.id} disconnected. Reason: ${reason}`);
    
    // Check if the player was in the map before removing
    const wasInMap = players.has(socket.id);
    
    if (wasInMap) {
      console.log(`[APP] Removing player ${socket.id} from players map`);
      players.delete(socket.id);
      
      // Broadcast to all remaining clients
      console.log(`[APP] Broadcasting player removal. Remaining players: ${players.size}`);
      ioServer.emit('playersUpdate', Array.from(players.entries()));
    } else {
      console.log(`[APP] Player ${socket.id} was not in players map, nothing to remove`);
    }
    
    // Cleanup connection issues
    connectionIssues.delete(socket.id);
  });
  
  // Send current Simon Says state to new players if a game is active
  if (simonSaysController.isGameActive()) {
    const currentCommand = simonSaysController.getCurrentCommand();
    if (currentCommand) {
      console.log('[APP] Sending active Simon Says command to new player:', socket.id);
      socket.emit('simonSaysStarted', currentCommand);
    }
  }
  
  // Handle heartbeat to keep connection alive
  socket.on('heartbeat', () => {
    const issues = connectionIssues.get(socket.id) || { 
      heartbeatCount: 0, 
      lastActivity: 0 
    };
    
    issues.lastActivity = Date.now();
    issues.heartbeatCount++;
    connectionIssues.set(socket.id, issues);
    
    // If this is the first heartbeat or every 10th heartbeat, log it
    if (issues.heartbeatCount === 1 || issues.heartbeatCount % 10 === 0) {
      console.log(`[APP] Heartbeat #${issues.heartbeatCount} received from player: ${socket.id}`);
    }
    
    // Respond with current player count
    socket.emit('heartbeatAck', { 
      playerCount: players.size,
      playerIds: Array.from(players.keys())
    });
  });
  
  // Send current player state immediately and log it
  console.log(`[APP] Sending playersUpdate to new player ${socket.id}. Current players: ${players.size}`);
  socket.emit('playersUpdate', Array.from(players.entries()));
  
  // Handle explicit player data requests
  socket.on('requestPlayers', () => {
    console.log(`[APP] Player ${socket.id} explicitly requested players data. Current players: ${players.size}`);
    
    // Update last activity time
    const issues = connectionIssues.get(socket.id);
    if (issues) {
      issues.lastActivity = Date.now();
      connectionIssues.set(socket.id, issues);
    }
    
    socket.emit('playersUpdate', Array.from(players.entries()));
  });
  
  socket.on('updateTransform', (data) => {
    const wasNewPlayer = !players.has(socket.id);
    
    // Update connection issues tracking
    const issues = connectionIssues.get(socket.id) || { 
      updateCount: 0, 
      lastActivity: 0 
    };
    issues.lastActivity = Date.now();
    issues.updateCount++;
    connectionIssues.set(socket.id, issues);
    
    if (wasNewPlayer) {
      console.log(`[APP] Adding new player to map: ${socket.id}`);
      players.set(socket.id, {
        position: data.position,
        quaternion: data.quaternion,
        isMoving: data.isMoving,
        lastUpdate: Date.now()
      });
    } else {
      const player = players.get(socket.id);
      player.position = data.position;
      player.quaternion = data.quaternion;
      player.isMoving = data.isMoving;
      player.lastUpdate = Date.now();
    }
    
    // Log the first transform update or every 100th update for a player
    if (issues.updateCount === 1 || issues.updateCount % 100 === 0) {
      console.log(`[APP] Transform update #${issues.updateCount} from player ${socket.id}:`, 
        JSON.stringify({
          pos: data.position,
          isMoving: data.isMoving
        })
      );
    }
    
    // Log players map when player count changes
    if (wasNewPlayer) {
      logPlayersMap();
    }
    
    // Handle Simon Says if active
    if (simonSaysController.isGameActive()) {
      const moveState = data.moveState;
      
      // Debug information
      if (moveState && (moveState.w || moveState.a || moveState.s || moveState.d || moveState.space)) {
        console.log('Player input:', { 
          playerId: socket.id,
          moveState: {
            w: moveState.w,
            a: moveState.a,
            s: moveState.s,
            d: moveState.d,
            space: moveState.space
          },
          command: simonSaysController.getCurrentCommand().text
        });
      }
      
      const result = simonSaysController.validatePlayerMove(socket.id, moveState);
      
      // Only emit if there's a change in the player's status (success or failure)
      if (result !== null) {
        console.log('Simon Says result:', { playerId: socket.id, result });
        ioServer.emit('simonSaysUpdate', {
          command: simonSaysController.getCurrentCommand(),
          playerId: socket.id,
          success: result
        });
      }
    }
    
    // Broadcast to all clients except sender
    socket.broadcast.emit('playersUpdate', Array.from(players.entries()));
    
    // Every 5th update (or so), also send a full sync to all clients including sender
    // This helps ensure that clients that missed updates get in sync
    if (Math.random() < 0.2) { // ~20% chance to do a full sync
      ioServer.emit('playersUpdate', Array.from(players.entries()));
    }
  });

  socket.on('startSimonSays', () => {
    console.log('Starting Simon Says game');
    const firstCommand = simonSaysController.startGame();
    if (firstCommand) {
      ioServer.emit('simonSaysStarted', firstCommand);
    }
  });

  socket.on('stopSimonSays', () => {
    console.log('Stopping Simon Says game');
    simonSaysController.stopGame();
    ioServer.emit('simonSaysStopped');
  });
});

// Create a custom event emitter for command changes
const origIssueNewCommand = simonSaysController.issueNewCommand;
simonSaysController.issueNewCommand = function() {
  console.log('[APP] Calling original issueNewCommand...');
  const command = origIssueNewCommand.call(this);
  if (command) {
    console.log('[APP] Broadcasting new command:', command.text, 'with timestamp', command.timestamp);
    console.log('[APP] Connected clients:', ioServer.engine.clientsCount);
    ioServer.emit('simonSaysCommand', command);
  } else {
    console.log('[APP] No command returned from issueNewCommand');
  }
  return command;
};

// Add CORS middleware before other middlewares
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/video", videoRouter);
app.use("/game", gameRouter);

// Set up players map reference for the game router
setClientsReference(players);

app.get("/api/status", (req, res) => {
  res.json({
    status: "running",
    socketIO: "enabled",
    timestamp: Date.now()
  });
});

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

// Periodically check for inactive players and clean them up
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleanedUp = 0;
  
  players.forEach((player, id) => {
    // If a player hasn't updated in 30 seconds, remove them
    if (now - player.lastUpdate > 30000) {
      console.log(`[APP] Removing inactive player ${id} (last update: ${now - player.lastUpdate}ms ago)`);
      players.delete(id);
      cleanedUp++;
    }
  });
  
  if (cleanedUp > 0) {
    console.log(`[APP] Cleaned up ${cleanedUp} inactive players. Remaining: ${players.size}`);
    // Broadcast updated player list to all clients
    ioServer.emit('playersUpdate', Array.from(players.entries()));
  }
}, 15000);

// Add cleanup for when the server shuts down
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  clearInterval(logInterval);
  clearInterval(cleanupInterval);
  process.exit(0);
});

// Add monitoring for server status
setInterval(() => {
  const memory = process.memoryUsage();
  console.log(`[MONITOR] Memory: rss=${Math.round(memory.rss/1024/1024)}MB, heap=${Math.round(memory.heapUsed/1024/1024)}/${Math.round(memory.heapTotal/1024/1024)}MB`);
  console.log(`[MONITOR] Connections: socket.io=${ioServer.engine.clientsCount}, players=${players.size}`);
}, 60000);

// Add direct health check for sockets
setInterval(() => {
  console.log(`[HEALTH] Running socket health check...`);
  const socketCount = ioServer.sockets.sockets.size;
  console.log(`[HEALTH] Socket.IO sockets count: ${socketCount}`);
  
  // Check each socket's connection
  ioServer.sockets.sockets.forEach((socket, id) => {
    console.log(`[HEALTH] Socket ${id} connected: ${socket.connected}`);
    
    // If socket is connected but not in players map, add it
    if (socket.connected && !players.has(id)) {
      console.log(`[HEALTH] Found connected socket ${id} not in players map, adding it`);
      players.set(id, {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        isMoving: false,
        lastUpdate: Date.now()
      });
      
      // Broadcast updated player list
      ioServer.emit('playersUpdate', Array.from(players.entries()));
    }
    
    // Check if the socket is in a room
    const rooms = Array.from(socket.rooms);
    console.log(`[HEALTH] Socket ${id} rooms: ${rooms.join(', ')}`);
  });
  
  // Check if engine clients match socket.io sockets
  const engineClientCount = Object.keys(ioServer.engine.clients || {}).length;
  console.log(`[HEALTH] Engine clients: ${engineClientCount}, Socket.IO sockets: ${socketCount}`);
  
  // Check if the right number of players are in the map
  console.log(`[HEALTH] Players in map: ${players.size}`);
}, 15000);

httpServer.listen(3002, () => {
  console.log('Server is running on port 3002');
  console.log('Socket.IO configured with events:');
  console.log('- simonSaysStarted');
  console.log('- simonSaysStopped');
  console.log('- simonSaysCommand');
  console.log('- simonSaysUpdate');
  console.log('- playersUpdate');
});

export { app };
