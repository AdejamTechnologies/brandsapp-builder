import { DurableObject } from "cloudflare:workers"

/**
 * DocRoom — one Durable Object per page being edited. A hibernatable WebSocket
 * relay: editors connect, send edit patches (opaque JSON), and the room fans them
 * out to every other connected editor. Realtime foundation for collaborative
 * editing; the concrete patch/CRDT format arrives with the Polaris editor code.
 */
export class DocRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 })
    }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    // Hibernation API: the runtime can evict the DO between messages and rewake it.
    this.ctx.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(sender: WebSocket, message: string | ArrayBuffer): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender) {
        try {
          ws.send(message)
        } catch {
          // peer gone; ignore
        }
      }
    }
  }

  webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code)
    } catch {
      // already closed
    }
  }

  webSocketError(ws: WebSocket): void {
    try {
      ws.close(1011)
    } catch {
      // already closed
    }
  }
}
