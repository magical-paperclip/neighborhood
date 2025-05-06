import express from "express";
const router = express.Router();

// Store a reference to connected clients (will be populated when socket.io is initialized)
let clients = new Map();
export function setClientsReference(clientsMap) {
  clients = clientsMap;
}

// GET game state (for initial load or reconnection)
router.get("/state", (req, res) => {
  res.json({
    success: true,
    message: "Game state retrieved",
    players: Array.from(clients.values()),
    timestamp: Date.now()
  });
});

// GET player count 
router.get("/players/count", (req, res) => {
  res.json({
    count: clients.size,
    timestamp: Date.now()
  });
});

// GET player by ID
router.get("/players/:id", (req, res) => {
  const { id } = req.params;
  
  if (clients.has(id)) {
    res.json({
      success: true,
      player: clients.get(id)
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Player not found"
    });
  }
});

// POST to update game settings or configuration
router.post("/config", (req, res) => {
  // Update game config
  const { config } = req.body;
  
  // Process config changes...
  
  res.json({
    success: true,
    message: "Game configuration updated"
  });
});

export default router; 