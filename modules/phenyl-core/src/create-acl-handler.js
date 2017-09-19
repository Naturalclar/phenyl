// @flow
import type {
  AclHandler,
  FunctionalGroup,
  RequestData,
  ClientPool,
  Session,
} from 'phenyl-interfaces'

function assertAclFunction(fn: any, name: string, methodName: string) {
  if (typeof fn !== 'string') throw new Error(`No acl function found for ${name} (methodName = ${methodName})`)
}

/**
 *
 */
export default function createAclHandler(fg: FunctionalGroup): AclHandler {
  return async function isAccessible(reqData: RequestData, session: ?Session, clients: ClientPool) :Promise<boolean> {
    return true // TODO
  }
}
