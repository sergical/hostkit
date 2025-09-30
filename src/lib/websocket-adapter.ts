import { json } from '@tanstack/react-start'
import { getEvent, type ServerRouteMethodsRecord } from '@tanstack/react-start/server'
import createNodeAdapter, { type NodeOptions as NodeAdapterOptions } from 'crossws/adapters/node'

/**
 * Adapter for TanStack Start and `crossws`.
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/server-routes
 * @see https://nitro.build/guide/websocket
 */
export function createWebSocketHandler(options: NodeAdapterOptions): ServerRouteMethodsRecord<any, any, any> {
  const nodeAdapter = createNodeAdapter(options)

  const handler = async () => {
    try {
      console.log('[WS ADAPTER] Handler called')
      const event = getEvent()
      console.log('[WS ADAPTER] Event:', event)
      console.log('[WS ADAPTER] Headers:', event.node.req.headers)

      if (event.node.req.headers.upgrade === 'websocket') {
        console.log('[WS ADAPTER] WebSocket upgrade detected')
        const { req } = event.node
        const { socket } = req
        console.log('[WS ADAPTER] Socket available:', !!socket)

        if (socket) {
          console.log('[WS ADAPTER] Handling upgrade...')
          await nodeAdapter.handleUpgrade(req, socket, Buffer.from([]))
          console.log('[WS ADAPTER] Upgrade complete')
          return
        } else {
          console.error('[WS ADAPTER] No socket available')
        }
      } else {
        console.log('[WS ADAPTER] Not a websocket upgrade request')
      }

      return json({ message: 'This is a WebSocket endpoint.' }, { status: 400, statusText: 'Bad Request' })
    } catch (error: any) {
      console.error('[WS ADAPTER] Error:', error)
      const message = error.message ?? 'An unknown error occurred.'
      return json({ message }, { status: 500, statusText: 'Internal Server Error' })
    }
  }

  return {
    GET: handler,
    POST: handler
  }
}
