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
      setResult,
      reset,
    })
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
 * @template T
 * @template {Error} [E=Error]
 * @param {string[]} tables The tables to syncs
 */
export const useTransaction = tables => {
  const [result, setResult] = useState(/** @type {ResultState<T, E>} */({ status: 'idle' }))

  const transaction = useCallback((
    /** @type {(tx: import('@electric-sql/pglite').Transaction) => Promise<void>} */ callback,
    /** @type {boolean} */ reset = false
  ) => {
    setResult({ status: 'pending' })
    dbTransact({
      tables,
      callback,
      setResult,
      reset,
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

const dbTransact = async ({ tables, callback, setResult, reset }) => {
  try {
    if (reset) await resetDB()
    const result = await db.transaction(callback)
    try {
      await syncPush(tables)
    } catch (error) {
      Promise.reject(error)
    }
    setResult({
      data: result,
      status: 'success',
    })
  } catch (error) {
    setResult({ status: 'error', error })
  }
}

const liveQuery = async ({ tables, query, params, handleResult, setResult, reset }) => {
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
    setResult({
      data: typeof handleResult == 'function' ? await handleResult(result) : result.rows,
      status: 'success',
    })
  } catch (error) {
    setResult({ status: 'error', error })
  }
}

const syncPull = tables => Promise.all(tables.map(pullChanges))

const syncPush = tables => Promise.all(tables.map(pushChanges))

const bigint2Str = value => (
  typeof value == 'bigint'
  ? '' + value
  : value
)
