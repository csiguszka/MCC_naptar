export type WebSocketClient = {
  socket: { send: (data: string) => void };
  gameId?: number;
  playerId?: number;
};

const clients = new Set<WebSocketClient>();

export function initializeClients(initialClients: Set<WebSocketClient>) {
  for (const client of initialClients) {
    clients.add(client);
  }
}

export function broadcastToGame(gameId: number, payload: Record<string, unknown>) {
  for (const client of clients) {
    if (client.gameId === gameId) {
      client.socket.send(JSON.stringify(payload));
    }
  }
}
