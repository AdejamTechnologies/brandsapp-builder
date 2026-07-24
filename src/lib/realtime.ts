import { useEffect, useRef } from "react"

/**
 * Connect to a page's DocRoom Durable Object and relay edit messages. The scaffold
 * broadcasts opaque strings (the full doc for now); the Polaris editor code will
 * swap in a real patch/CRDT protocol over this same channel.
 */
export function useDocRoom(room: string, onMessage: (data: string) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  useEffect(() => {
    if (!room) return
    const proto = location.protocol === "https:" ? "wss" : "ws"
    const ws = new WebSocket(`${proto}://${location.host}/parties/doc/${encodeURIComponent(room)}`)
    ws.onmessage = (e) => cbRef.current(typeof e.data === "string" ? e.data : "")
    wsRef.current = ws
    return () => ws.close()
  }, [room])

  return {
    send(data: string) {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data)
    },
  }
}
