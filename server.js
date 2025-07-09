import express from 'express';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'client', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

let clients = [];
let gameState = {
  players: {},
  ai: { hp: 100 }
};

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

wss.on('connection', (ws) => {
  const id = Date.now().toString() + Math.floor(Math.random() * 1000);
  clients.push(ws);
  gameState.players[id] = { x: 0, y: 0, hp: 100 };

  ws.send(JSON.stringify({ type: 'init', id, gameState }));
  broadcast({ type: 'update', gameState });

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (!gameState.players[id]) return;

    if (data.type === 'move') {
      let newX = gameState.players[id].x + data.dx;
      let newY = gameState.players[id].y + data.dy;
      if (newX >= 0 && newX <= 10) gameState.players[id].x = newX;
      if (newY >= 0 && newY <= 10) gameState.players[id].y = newY;
    } else if (data.type === 'attack') {
      gameState.ai.hp -= 10;
      if (gameState.ai.hp < 0) gameState.ai.hp = 0;
    }

    broadcast({ type: 'update', gameState });
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    delete gameState.players[id];
    broadcast({ type: 'update', gameState });
  });
});
