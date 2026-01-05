/**
 * @module YPNCounter
 */

import {
  AbstractType,
  typeMapDelete,
  typeMapSet,
  typeMapGet,
  typeMapHas,
  createMapIterator,
  transact,
  warnPrematureAccess,
  UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Item, // eslint-disable-line
  YPNCounterRefID
} from '../internals.js'

import * as delta from 'lib0/delta'

/**
 * @template PNCounterType
 * A PN-Counter (Positive-Negative Counter) is a state-based CRDT that supports
 * both increment and decrement operations by maintaining separate positive and
 * negative counters per client.
 *
 * The counter uses the internal map structure to store values with keys:
 * - 'p:clientId' for positive increments
 * - 'n:clientId' for negative decrements
 *
 * The total value is computed as sum(all p:*) - sum(all n:*)
 *
 * @extends AbstractType<delta.MapDelta<{[K in string]:number}>>
 */
export class YPNCounter extends AbstractType {
  constructor () {
    super()
    /**
     * @type {Map<string,any>?}
     * @private
     */
    this._prelimContent = null
    this._prelimContent = new Map()
  }

  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item?} item
   */
  _integrate (y, item) {
    super._integrate(y, item)
    const prelimContent = /** @type {Map<string, any>} */ (this._prelimContent)
    
    // Apply preliminary content
    prelimContent.forEach((value, key) => {
      this.set(key, value)
    })
    
    this._prelimContent = null
  }

  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {this}
   */
  clone () {
    const counter = /** @type {this} */ (this._copy())
    // Copy the internal state
    this._map.forEach((item, key) => {
      if (!item.deleted) {
        const value = item.content.getContent()[item.length - 1]
        counter.set(key, value)
      }
    })
    return counter
  }

  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Object<string,any>}
   */
  toJSON () {
    this.doc ?? warnPrematureAccess()
    /**
     * @type {Object<string,number>}
     */
    const p = {}
    /**
     * @type {Object<string,number>}
     */
    const n = {}
    
    this._map.forEach((item, key) => {
      if (!item.deleted) {
        const value = item.content.getContent()[item.length - 1]
        if (key.startsWith('p:')) {
          p[key.substring(2)] = value
        } else if (key.startsWith('n:')) {
          n[key.substring(2)] = value
        }
      }
    })
    
    return {
      value: this.value,
      p,
      n
    }
  }

  /**
   * Get the current counter value (sum of positive - sum of negative)
   *
   * @return {number}
   */
  get value () {
    if (this.doc === null) {
      let positiveSum = 0
      let negativeSum = 0
      
      const prelimContent = /** @type {Map<string, any>} */ (this._prelimContent)
      if (prelimContent) {
        prelimContent.forEach((value, key) => {
          if (key.startsWith('p:')) {
            positiveSum += value
          } else if (key.startsWith('n:')) {
            negativeSum += value
          }
        })
      }
      
      return positiveSum - negativeSum
    }
    
    let positiveSum = 0
    let negativeSum = 0
    
    this._map.forEach((item, key) => {
      if (!item.deleted) {
        const value = item.content.getContent()[item.length - 1]
        if (typeof value === 'number') {
          if (key.startsWith('p:')) {
            positiveSum += value
          } else if (key.startsWith('n:')) {
            negativeSum += value
          }
        }
      }
    })
    
    return positiveSum - negativeSum
  }

  /**
   * Increment the counter by a positive amount
   *
   * @param {number} amount The amount to increment (must be positive)
   */
  increment (amount = 1) {
    if (amount < 0) {
      throw new Error('Increment amount must be positive. Use decrement() for negative values.')
    }
    
    if (this.doc !== null) {
      const doc = this.doc
      transact(doc, transaction => {
        const clientId = doc.clientID.toString()
        const key = `p:${clientId}`
        const currentValue = /** @type {number|undefined} */ (typeMapGet(this, key)) || 0
        typeMapSet(transaction, this, key, currentValue + amount)
      })
    } else {
      const prelimContent = /** @type {Map<string, any>} */ (this._prelimContent)
      const key = 'p:prelim'
      const currentValue = prelimContent.get(key) || 0
      prelimContent.set(key, currentValue + amount)
    }
  }

  /**
   * Decrement the counter by a positive amount
   *
   * @param {number} amount The amount to decrement (must be positive)
   */
  decrement (amount = 1) {
    if (amount < 0) {
      throw new Error('Decrement amount must be positive. Use increment() for negative values.')
    }
    
    if (this.doc !== null) {
      const doc = this.doc
      transact(doc, transaction => {
        const clientId = doc.clientID.toString()
        const key = `n:${clientId}`
        const currentValue = /** @type {number|undefined} */ (typeMapGet(this, key)) || 0
        typeMapSet(transaction, this, key, currentValue + amount)
      })
    } else {
      const prelimContent = /** @type {Map<string, any>} */ (this._prelimContent)
      const key = 'n:prelim'
      const currentValue = prelimContent.get(key) || 0
      prelimContent.set(key, currentValue + amount)
    }
  }

  /**
   * Reset the counter to zero for all clients
   */
  reset () {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        this._map.forEach((item, key) => {
          if (!item.deleted) {
            typeMapDelete(transaction, this, key)
          }
        })
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimContent).clear()
    }
  }

  /**
   * Internal get method
   *
   * @param {string} key
   * @return {PNCounterType|undefined}
   */
  get (key) {
    return /** @type {any} */ (typeMapGet(this, key))
  }

  /**
   * Internal set method
   *
   * @param {string} key
   * @param {any} value
   */
  set (key, value) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapSet(transaction, this, key, value)
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimContent).set(key, value)
    }
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write (encoder) {
    encoder.writeTypeRef(YPNCounterRefID)
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
 * @return {import('../utils/types.js').YType}
 *
 * @private
 * @function
 */
export const readYPNCounter = _decoder => new YPNCounter()
