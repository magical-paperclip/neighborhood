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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = new Map();

ioServer.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Send current Simon Says state to new players if a game is active
  if (simonSaysController.isGameActive()) {
    const currentCommand = simonSaysController.getCurrentCommand();
    if (currentCommand) {
      console.log('[APP] Sending active Simon Says command to new player:', socket.id);
      socket.emit('simonSaysStarted', currentCommand);
    }
  }
  
  // Send current player state immediately
  socket.emit('playersUpdate', Array.from(players.entries()));
  
  socket.on('updateTransform', (data) => {
    if (!players.has(socket.id)) {
      players.set(socket.id, {
        position: data.position,
        quaternion: data.quaternion,
        isMoving: data.isMoving
      });
    } else {
      const player = players.get(socket.id);
      player.position = data.position;
      player.quaternion = data.quaternion;
      player.isMoving = data.isMoving;
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
    players.delete(socket.id);
    socket.broadcast.emit('playersUpdate', Array.from(players.entries()));
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
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/video", videoRouter);
app.use("/game", gameRouter);

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
