// @flow

import deepEqual from 'fast-deep-equal'

import type {
  BSONTypeNumber,
  BSONTypeString,
  RestorableEntity,
  DotNotationString,
  WhereConditions,
  QueryCondition,
} from 'phenyl-interfaces'

import {
  normalizeQueryCondition,
  getNestedValue,
} from 'phenyl-utils/jsnext'

type Classified = {
  ok: Array<RestorableEntity>,
  ng: Array<RestorableEntity>,
}
/**
 *
 */
export default class PowerFilter {
  static filter(values: Array<RestorableEntity>, where: WhereConditions): Array<RestorableEntity> {
    return this.classify(values, where).ok
  }

  /**
   * @private
   * Classify values into match or unmatch groups
   */
  static classify(values: Array<RestorableEntity>, where: WhereConditions): Classified {
    if (where.$and != null) {
      // TODO: confirm spec when $and is []
      return where.$and.reduce((vals, conds) => {
        const { ok, ng } = this.classify(vals.ok, conds)
        return { ok, ng: vals.ng.concat(ng) }
      }, { ok: values, ng: [] })
    }

    if (where.$nor != null) {
      // TODO: confirm spec when $nor is []
      return where.$nor.reduce((vals, conds) => {
        const { ok, ng } = this.classify(vals.ok, conds)
        return { ok: ng, ng: vals.ng.concat(ok) }
      }, { ok: values, ng: [] })
    }

    if (where.$or != null) {
      // TODO: confirm spec when $or is []
      return where.$or.reduce((vals, conds) => {
        const { ok, ng } = this.classify(vals.ng, conds)
        return { ok: vals.ok.concat(ok), ng }
      }, { ok: [], ng: values })
    }

    // No query condition
    const dotNotations = Object.keys(where)
    return values.reduce((classified, value) => {
      const isOk = dotNotations.every(dotNotation =>

        this.checkCondition(getNestedValue(value, dotNotation), normalizeQueryCondition(where[dotNotation] || {}))
      )
      classified[isOk ? 'ok': 'ng'].push(value)
      return classified
    }, { ok: [], ng: [] })
  }

  /**
   * @private
   * Check if leftOperand matches the condition
   */
  static checkCondition(leftOperand: any, condition: QueryCondition): boolean {
    const operators = Object.keys(condition)
    return operators.every(operator => {
      switch (operator) {
        case '$eq':
          return deepEqual(leftOperand, condition.$eq)

        case '$gt':
          return leftOperand > condition.$gt

        case '$gte':
          return leftOperand >= condition.$gte

        case '$in':
          return condition.$in && condition.$in.some(val => deepEqual(leftOperand, val))

        case '$lt':
          return leftOperand < condition.$lt

        case '$lte':
          return leftOperand <= condition.$lte

        case '$ne':
          return deepEqual(leftOperand, condition.$ne) === false

        case '$nin':
          // TODO: confirm spec when condition.$nin is []
          return condition.$nin && condition.$nin.every(val => deepEqual(leftOperand, val) === false)

        case '$not':
          if (condition.$not == null) throw new Error('$not is not found') // for flow
          return this.checkCondition(leftOperand, condition.$not) === false

        case '$exists':
          return (leftOperand != null) === condition.$exists

        case '$type':
          return (typeof condition.$type === 'number')
            ? getBSONTypeNumber(leftOperand) === condition.$type
            : getBSONTypeString(leftOperand) === condition.$type

        case '$mod':
          if (condition.$mod == null) throw new Error('$mod is not found') // for flow
          const [divisor, remainder] = condition.$mod
          return leftOperand % divisor === remainder

        case '$regex':
          if (condition.$regex == null) throw new Error('$regex is not found') // for flow
          return condition.$regex.test(leftOperand)

        case '$text':
        case '$where':
        case '$geoIntersects':
        case '$geoWithin':
        case '$near':
        case '$nearSphere':
          throw new Error(`Operator "${operator}" is currently unimplemented in power-filter.`)
        case '$all':
          if (condition.$all == null) throw new Error('$all is not found') // for flow
          if (!Array.isArray(leftOperand)) return false
          return condition.$all.every(val =>
            leftOperand.some(elem => deepEqual(elem))
          )

        case '$elemMatch':
          if (condition.$elemMatch == null) throw new Error('$elemMatch is not found') // for flow
          if (!Array.isArray(leftOperand)) return false
          return leftOperand.every(elem =>
            // $FlowIssue(condition-$elemMatch-is-not-null)
            this.checkCondition(elem, condition.$elemMatch)
          )

        case '$size':
          if (!Array.isArray(leftOperand)) return false
          return leftOperand.length === condition.$size

        case '$bitsAllClear':
        case '$bitsAllSet':
        case '$bitsAnyClear':
        case '$bitsAnySet':
          throw new Error(`Operator "${operator}" is currently unimplemented in power-filter.`)

        default:
          throw new Error(`Unknown operator: "${operator}".`)
      }
    })
  }
}

/**
 * Filter the given values
 */
export function filter(values: Array<RestorableEntity>, where: WhereConditions): Array<RestorableEntity> {
  return PowerFilter.filter(values, where)
}

/**
 * get BSON Type of the given value as a string
 * @see https://docs.mongodb.com/manual/reference/operator/query/type/
 */
function getBSONTypeString(val: any): BSONTypeString {
  switch (typeof val) {
    case 'number':
      return (parseInt(val, 10) === val) ? 'int' : 'double'

    case 'string':
      return 'string'

    case 'boolean':
      return 'bool'

    case 'undefined':
      return 'undefined'

    case 'function':
      return 'javascript'

    case 'object':
    default:
      if (val instanceof Date) return 'date'
      if (val instanceof RegExp) return 'regex'
      if (Array.isArray(val)) return 'array'
      return val ? 'object' : 'null'

    // TODO: confirm spec
  }
}

/**
 * get BSON Type of the given value as a number
 * @see https://docs.mongodb.com/manual/reference/operator/query/type/
 */
function getBSONTypeNumber(val: any): BSONTypeNumber {
  const map = {
    double: 1,
    string: 2,
    object: 3,
    array: 4,
    binData: 5,
    undefined: 6,
    objectId: 7,
    bool: 8,
    date: 9,
    null: 10,
    regex: 11,
    dbPointer: 12,
    javascript: 13,
    symbol: 14,
    javascriptWithScope: 15,
    int: 16,
    timestamp: 17,
    long: 18,
    decimal: 19,
    minKey: -1,
    maxKey: 127,
  }
  return map[getBSONTypeString(val)]
}
