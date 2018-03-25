// @flow
import type { EntityMap } from 'phenyl-interfaces'
import { PhenylEntityClient } from 'phenyl-central-state/jsnext'
import { PhenylMongoDbClient } from './mongodb-client.js'
import type { MongoDbConnection } from './connection.js'
import type { PhenylEntityClientOptions } from 'phenyl-central-state/jsnext'

export function createEntityClient<M: EntityMap>(conn: MongoDbConnection, options: PhenylEntityClientOptions<M> = {}) {
  const client: PhenylMongoDbEntityClient<M> = new PhenylMongoDbEntityClient(conn, options)
  return client
}

export class PhenylMongoDbEntityClient<M: EntityMap> extends PhenylEntityClient<M> {

  constructor(conn: MongoDbConnection, options: PhenylEntityClientOptions<M> = {}) {
    const dbClient = new PhenylMongoDbClient(conn)
    super(dbClient, options)
  }
}
