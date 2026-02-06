import { useCallback, useEffect, useState } from 'react'
import db, { pullChanges, pushChanges, resetDB } from './db.js'

/**
 * @typedef {string | number | bigint | boolean | null} Primitive
 */

/**
 * @template T
 * @template {Error} E
 * @typedef {Object} ResultState
 * @property {'idle' | 'pending' | 'success' | 'error'} status
 * @property {T} [data]
 * @property {E} [error]
 */

/**
 * @template T
 * @template {Error} [E=Error]
 * @param {string[]} tables The tables to syncs
 * @param {string} query The query to execute
 * @param {Primitive[]} [params]
 * @param {(result: import('@electric-sql/pglite').Results<T>) => Promise<T[]>} [handleResult] Process result
 */
export const useLiveQuery = (tables, query, params, handleResult) => {
  const [result, setResult] = useState(/** @type {ResultState<T, E>} */({ status: 'pending' }))

  const reload = useCallback((/** @type {boolean} */ reset = false) => {
    liveQuery({
      tables,
      query, params,
      handleResult,
      reset,
    }).then(setResult)
  }, [tables, query, params, handleResult])

  useEffect(reload, [reload])

  return {
    loading: result.status == 'pending',
    data: result.data,
    error: result.error,
    reload,
  }
}

/**
 * @template {Error} E
 * @typedef {Object} TransactionOptions
 * @property {() => void} [onComplete]
 * @property {(error: E) => void} [onError]
 * @property {() => void} [onSuccess]
 * @property {boolean} [reset]
 */

/**
 * @template T
 * @template {Error} [E=Error]
 * @param {string[]} tables The tables to syncs
 */
export const useTransaction = tables => {
  const [result, setResult] = useState(/** @type {ResultState<T, E>} */({ status: 'idle' }))

  const transaction = useCallback(/**
   * @param {(tx: import('@electric-sql/pglite').Transaction) => Promise<void>} callback
   * @param {TransactionOptions<E>} param1
   */ (callback, { onComplete, onError, onSuccess, reset } = {}) => {
    setResult({ status: 'pending' })
    dbTransact({
      tables,
      callback,
      reset,
    }).then(result => {
      setResult(result)
      try {
        if (result.error) {
          onError?.(result.error)
        } else {
          onSuccess?.()
        }
      } finally {
        onComplete?.()
      }
    })
  }, [tables])

  return {
    idle: result.status == 'idle',
    loading: result.status == 'pending',
    success: result.status == 'success',
    error: result.error,
    transaction,
  }
}

const dbTransact = async ({ tables, callback, reset }) => {
  try {
    if (reset) await resetDB()
    const result = await db.transaction(callback)
    try {
      await syncPush(tables)
    } catch (error) {
      Promise.reject(error)
    }
    return {
      data: result,
      status: 'success',
    }
  } catch (error) {
    return { status: 'error', error }
  }
}

const liveQuery = async ({ tables, query, params, handleResult, reset }) => {
  try {
    if (reset) await resetDB()
    const pulling = syncPull(tables)
    let result
    try {
      result = await db.query(query, (params || []).map(bigint2Str))
    } catch (error) {
      await pulling
      result = await db.query(query, (params || []).map(bigint2Str))
    }
    syncPush(tables)
    return {
      data: typeof handleResult == 'function' ? await handleResult(result) : result.rows,
      status: 'success',
    }
  } catch (error) {
    return { status: 'error', error }
  }
}

const syncPull = tables => Promise.all(tables.map(pullChanges))

const syncPush = tables => Promise.all(tables.map(pushChanges))

const bigint2Str = value => (
  typeof value == 'bigint'
  ? '' + value
  : value
)
