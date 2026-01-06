import { init, compare } from './testHelper.js' // eslint-disable-line

import * as Y from '../src/index.js'
import * as t from 'lib0/testing'

/**
 * @param {t.TestCase} tc
 */
export const testBasicPNCounterIncrement = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(5)
  t.assert(pncounter0.value === 5, 'counter 0 incremented to 5')

  testConnector.flushAllMessages()

  t.assert(pncounter1.value === 5, 'counter 1 received the increment')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testBasicPNCounterDecrement = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.decrement(3)
  t.assert(pncounter0.value === -3, 'counter 0 decremented to -3')

  testConnector.flushAllMessages()

  t.assert(pncounter1.value === -3, 'counter 1 received the decrement')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterIncrementAndDecrement = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(10)
  pncounter0.decrement(3)
  t.assert(pncounter0.value === 7, 'counter 0 value is 10 - 3 = 7')

  testConnector.flushAllMessages()

  t.assert(pncounter1.value === 7, 'counter 1 value matches counter 0')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterConcurrentIncrements = tc => {
  const { testConnector, users, pncounter0, pncounter1, pncounter2 } = init(tc, { users: 3 })

  pncounter0.increment(5)
  pncounter1.increment(3)
  pncounter2.increment(2)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 10, 'counter 0 converged to 10')
  t.assert(pncounter1.value === 10, 'counter 1 converged to 10')
  t.assert(pncounter2.value === 10, 'counter 2 converged to 10')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterConcurrentDecrements = tc => {
  const { testConnector, users, pncounter0, pncounter1, pncounter2 } = init(tc, { users: 3 })

  pncounter0.decrement(5)
  pncounter1.decrement(3)
  pncounter2.decrement(2)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === -10, 'counter 0 converged to -10')
  t.assert(pncounter1.value === -10, 'counter 1 converged to -10')
  t.assert(pncounter2.value === -10, 'counter 2 converged to -10')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterConcurrentMixedOperations = tc => {
  const { testConnector, users, pncounter0, pncounter1, pncounter2 } = init(tc, { users: 3 })

  pncounter0.increment(10)
  pncounter1.decrement(3)
  pncounter2.increment(5)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 12, 'counter 0 converged to 12')
  t.assert(pncounter1.value === 12, 'counter 1 converged to 12')
  t.assert(pncounter2.value === 12, 'counter 2 converged to 12')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterReset = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(10)
  pncounter0.decrement(3)

  testConnector.flushAllMessages()

  t.assert(pncounter1.value === 7, 'counter 1 value is 7')

  pncounter0.reset()

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 0, 'counter 0 reset to 0')
  t.assert(pncounter1.value === 0, 'counter 1 reset to 0')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterDefaultIncrementDecrement = tc => {
  const { pncounter0 } = init(tc, { users: 1 })

  pncounter0.increment()
  t.assert(pncounter0.value === 1, 'default increment is 1')

  pncounter0.decrement()
  t.assert(pncounter0.value === 0, 'default decrement is 1')
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterNegativeAmountErrors = tc => {
  const { pncounter0 } = init(tc, { users: 1 })

  t.fails(() => {
    pncounter0.increment(-5)
  })

  t.fails(() => {
    pncounter0.decrement(-5)
  })
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterToJSON = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(10)
  pncounter0.decrement(3)

  testConnector.flushAllMessages()

  const json0 = pncounter0.toJSON()
  t.assert(json0.value === 7, 'JSON value is correct')
  t.assert(typeof json0.p === 'object', 'JSON has positive counters')
  t.assert(typeof json0.n === 'object', 'JSON has negative counters')

  const json1 = pncounter1.toJSON()
  t.assert(json1.value === 7, 'JSON value matches on other client')
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterMultipleIncrementsFromSameClient = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(1)
  pncounter0.increment(2)
  pncounter0.increment(3)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 6, 'counter 0 has total 6')
  t.assert(pncounter1.value === 6, 'counter 1 converged to 6')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterDisconnectedSync = tc => {
  const { testConnector, users, pncounter0, pncounter1, pncounter2 } = init(tc, { users: 3 })

  users[2].disconnect()

  pncounter0.increment(5)
  pncounter1.increment(3)
  pncounter2.increment(7)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 8, 'counter 0 is 8 (without disconnected user)')
  t.assert(pncounter1.value === 8, 'counter 1 is 8 (without disconnected user)')

  users[2].connect()
  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 15, 'counter 0 converged to 15 after reconnect')
  t.assert(pncounter1.value === 15, 'counter 1 converged to 15 after reconnect')
  t.assert(pncounter2.value === 15, 'counter 2 converged to 15 after reconnect')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterClone = tc => {
  const ydoc = new Y.Doc()
  const counter = ydoc.getPNCounter('counter')

  counter.increment(10)
  counter.decrement(3)

  const clone = counter.clone()
  
  // Clone should have same value
  t.assert(clone.value === 7, 'cloned counter has same value')

  // Changes to original shouldn't affect clone (until integrated)
  counter.increment(5)
  t.assert(counter.value === 12, 'original counter updated')
  t.assert(clone.value === 7, 'clone value unchanged')
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterLargeNumbers = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(1000000)
  pncounter0.decrement(250000)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 750000, 'counter 0 handles large numbers')
  t.assert(pncounter1.value === 750000, 'counter 1 handles large numbers')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterZeroOperations = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  pncounter0.increment(0)
  pncounter0.decrement(0)

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 0, 'counter 0 remains at 0')
  t.assert(pncounter1.value === 0, 'counter 1 remains at 0')
  compare(users)
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterObserver = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  let eventCount = 0
  pncounter1.observe(() => {
    eventCount++
  })

  pncounter0.increment(5)
  testConnector.flushAllMessages()

  t.assert(eventCount === 1, 'observer fired once')

  pncounter0.decrement(2)
  testConnector.flushAllMessages()

  t.assert(eventCount === 2, 'observer fired twice')
}

/**
 * @param {t.TestCase} tc
 */
export const testPNCounterSequentialOperations = tc => {
  const { testConnector, users, pncounter0, pncounter1 } = init(tc, { users: 2 })

  for (let i = 0; i < 10; i++) {
    pncounter0.increment(1)
  }

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 10, 'counter 0 is 10 after sequential increments')
  t.assert(pncounter1.value === 10, 'counter 1 is 10 after sequential increments')

  for (let i = 0; i < 5; i++) {
    pncounter1.decrement(1)
  }

  testConnector.flushAllMessages()

  t.assert(pncounter0.value === 5, 'counter 0 is 5 after sequential decrements')
  t.assert(pncounter1.value === 5, 'counter 1 is 5 after sequential decrements')
  compare(users)
}
