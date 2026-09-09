import next from "next";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { initializeClients, broadcastToGame } from "./app/lib/websocket-helpers";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

type Client = {
  socket: WebSocket;
  gameId?: number;
  playerId?: number;
};

const clients = new Set<Client>();

// Initialize the websocket helpers with our clients set
initializeClients(clients);

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      handle(req, res);
    });

    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket) => {
      const client: Client = { socket };
      clients.add(client);

      socket.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            gameId?: number;
            playerId?: number;
            payload?: unknown;
          };

          // 🎯 Csatlakozás játékhoz
          if (msg.type === "join-game" && msg.gameId && msg.playerId) {
            client.gameId = msg.gameId;
            client.playerId = msg.playerId;

            socket.send(
              JSON.stringify({
                type: "joined",
                gameId: msg.gameId,
              }),
            );

            return;
          }

          // 🎯 Játék esemény broadcast
          if (msg.type === "game-event" && msg.gameId) {
            broadcastToGame(msg.gameId, {
              type: "game-event",
              payload: msg.payload,
            });
          }
        } catch (err) {
          console.error("Invalid WS message:", err);
        }
      });

      socket.on("close", () => {
        clients.delete(client);
      });

      socket.on("error", (err) => {
        console.error("WebSocket error:", err);
      });
    });

    /**
     * 🔥 FONTOS RÉSZ
     * Nem dobjuk el a Next HMR upgrade requesteket.
     * Csak a /ws endpointot kezeljük mi.
     */
    server.on("upgrade", (req, socket, head) => {
      if (req.url?.startsWith("/ws")) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      }
      // ❗ Nem hívunk socket.destroy()-t
      // Így a Next saját HMR websocketje működni fog
    });

    const port = Number(process.env.PORT || 3000);

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
      console.log(
        `> WebSocket server listening on ws://localhost:${port}/ws`,
      );
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
