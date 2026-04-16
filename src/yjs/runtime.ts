import type { YjsWebSocketServer } from './server'

let currentYjsWebSocketServer: YjsWebSocketServer | null = null

export function setYjsWebSocketServer(server: YjsWebSocketServer) {
    currentYjsWebSocketServer = server
}

export function getYjsWebSocketServer() {
    return currentYjsWebSocketServer
}

