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
  const sockets = Array.from(ioServer.sockets.sockets.keys());
  console.log(`[APP] Socket IDs: ${sockets.join(', ')}`);
}

// Set interval to log players state (more frequent for debugging)
const logInterval = setInterval(logPlayersMap, 10000);

// Track client versions and connection issues
const clientVersions = new Map();
const connectionIssues = new Map();

const players = new Map();

ioServer.on('connection', (socket) => {
  console.log(`[APP] Player connected: ${socket.id} (Total: ${ioServer.engine.clientsCount})`);
  
  // Create a placeholder entry for the player
  // This ensures they're in the players map even if they haven't moved yet
  if (!players.has(socket.id)) {
    console.log(`[APP] Creating placeholder entry for new player: ${socket.id}`);
    players.set(socket.id, {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isMoving: false,
      lastUpdate: Date.now()
    });
    
    // Log players map immediately after adding a player
    logPlayersMap();
  }
  
  // Track connection issues
  connectionIssues.set(socket.id, {
    connectTime: Date.now(),
    lastActivity: Date.now(),
    updateCount: 0,
    heartbeatCount: 0
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

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
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
