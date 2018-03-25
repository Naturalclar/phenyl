// @flow
import WebSocket from './websocket.js'
import { randomStringWithTimeStamp } from 'phenyl-utils/jsnext'

import type {
  Id,
  RequestDataOf,
  ResponseDataOf,
  RestApiHandler,
  SubscriptionRequest,
  SubscriptionResult,
  TypeMap,
  VersionDiff,
  VersionDiffListener,
  VersionDiffSubscriber,
  WebSocketServerMessage,
} from 'phenyl-interfaces'

/**
 * Universal WebSocket Client for PhenylWebSocketServer.
 */
export default class PhenylWebSocketClient<TM: TypeMap> implements RestApiHandler<TM>, VersionDiffSubscriber {
  client: WebSocket
  opened: Promise<boolean>
  versionDiffListener: ?VersionDiffListener

  constructor(url: string) {
    this.client = new WebSocket(url)

    this.opened = new Promise((resolve, reject) => {
      let timer
      const openListener = this.client.addEventListener('open', () => {
        // $FlowIssue(compatible)
        this.client.removeEventListener('open', openListener)
        clearTimeout(timer)
        resolve(true)
      })
      timer = setTimeout(() => {
        // $FlowIssue(compatible)
        this.client.removeEventListener('open', openListener)
        reject(new Error(`PhenylWebSocketClient could not connect to server "${url}" in 30sec.`))
      }, 30000)
    })

    this.client.addEventListener('message', (evt: Event) => {
      const { versionDiffListener } = this
      if (versionDiffListener == null) return
      const versionDiff = this.parseAsVersionDiff(evt.data || '')
      if (versionDiff == null) return
      versionDiffListener(versionDiff)
    })
  }

  /**
   * @public
   */
  async subscribe(entityName: string, id: Id, sessionId?: ?Id): Promise<SubscriptionResult> {
    await this.opened
    return new Promise((resolve, reject) => {
      const subscription: SubscriptionRequest = {
        method: 'subscribe',
        payload: { entityName, id },
        sessionId
      }

      const tag = randomStringWithTimeStamp()
      let timer

      this.client.send(JSON.stringify({ subscription, tag }))

      const listener = this.client.addEventListener('message', (evt: Event) => {
        try {
          const subscriptionResult = this.parseAsWaitingSubscriptionResult(evt.data || '', tag)
          if (subscriptionResult == null) return
          // $FlowIssue(compatible)
          this.client.removeEventListener('message', listener)
          clearTimeout(timer)
          return resolve(subscriptionResult)
        }
        catch (e) {
          reject(e)
        }
      })

      timer = setTimeout(() => {
        // $FlowIssue(compatible)
        this.client.removeEventListener('message', listener)
        reject(new Error(`subscribe(tag=${tag}) timed out (30sec).`))
      }, 10000)
    })
  }

  /**
   * @public
   */
  subscribeVersionDiff(versionDiffListener: VersionDiffListener) {
    this.versionDiffListener = versionDiffListener
  }

  /**
   * @public
   */
  async handleRequestData(reqData: RequestDataOf<TM>): Promise<ResponseDataOf<TM>> {
    await this.opened
    return new Promise((resolve, reject) => {
      const tag = randomStringWithTimeStamp()
      let timer

      this.client.send(JSON.stringify({ reqData, tag }))

      const listener = this.client.addEventListener('message', (evt: Event) => {
        try {
          const resData = this.parseAsWaitingResponseData(evt.data || '', tag)
          if (resData == null) return
          // $FlowIssue(compatible)
          this.client.removeEventListener('message', listener)
          clearTimeout(timer)
          return resolve(resData)
        }
        catch (e) {
          reject(e)
        }
      })

      timer = setTimeout(() => {
        // $FlowIssue(compatible)
        this.client.removeEventListener('message', listener)
        reject(new Error(`handleRequestData(tag=${tag}) timed out (30sec).`))
      }, 10000)
    })
  }

  /**
   * @private
   */
  parseAsWaitingResponseData<
    EN: string,
    QN: string,
    CN: string,
    AN: string,
  >(message: any, tag: string): ?ResponseData<TM, EN, QN, CN, AN, *> {
    try {
      // $FlowIssue(JSON.parse)
      const parsed: WebSocketServerMessage<TM, EN, QN, CN, AN> = JSON.parse(message)
      return (parsed.resData != null && parsed.tag != null && parsed.tag === tag) ? parsed.resData : null
    }
    catch (e) {
      return null
    }
  }

  /**
   * @private
   */
  parseAsWaitingSubscriptionResult<
    EN: string,
    QN: string,
    CN: string,
    AN: string,
  >(message: any, tag: string): ?SubscriptionResult {
    try {
      // $FlowIssue(JSON.parse)
      const parsed: WebSocketServerMessage<TM, EN, QN, CN, AN> = JSON.parse(message)
      return (parsed.subscriptionResult != null && parsed.tag != null && parsed.tag === tag) ? parsed.subscriptionResult : null
    }
    catch (e) {
      return null
    }
  }

  /**
   * @private
   */
  parseAsVersionDiff<
    EN: string,
    QN: string,
    CN: string,
    AN: string,
  >(message: any): ?VersionDiff {
    try {
      // $FlowIssue(JSON.parse)
      const parsed: WebSocketServerMessage<TM, EN, QN, CN, AN> = JSON.parse(message)
      return parsed.versionDiff != null ? parsed.versionDiff : null
    }
    catch (e) {
      return null
    }
  }
}
