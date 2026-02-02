import { PGlite } from '@electric-sql/pglite'
import request, { SYNC_ENDPOINT } from './request.js'

const PER_PAGE = 20

/**
 * @param {string} table The table name.
 */
export const pullChanges = async table => {
  await dbReady()
  const after = localStorage.getItem('last_pull_' + table)
  if (after) new Date(after).toISOString()
  const resp = await request.get(SYNC_ENDPOINT, {
    params: { table, limit: PER_PAGE, after }
  })
  const page = resp.data

  if (page.data.length > 0) {
    const fields = await getTableColumns(table)
    const values = [], params = []
  
    page.data.forEach((row, i) => {
      values.push(`(${
        fields.map((_f, j) => (
          j + 1 == fields.length
          ? "'PULL'"
          : `$${i * (fields.length - 1) + j + 1}`
        )).join(', ')
      })`)
      params.push.apply(params, row)
    })
  
    await db.query(
      `INSERT INTO ${table} (${fields.join(', ')}) VALUES ` +
      values.join(', ') +
      ' ON CONFLICT (id) DO UPDATE SET ' +
      fields.filter(name => name != 'id')
      .map(field => field + '=' + `EXCLUDED.${field}`).join(', ') +
      ` WHERE ${table}.updated_at < EXCLUDED.updated_at`,
      params
    )
  
    const lastData = page.data[page.data.length - 1]
    localStorage.setItem(
      'last_pull_' + table,
      lastData[fields.indexOf('updated_at')]
    )
    if (page.more) getTableCfg(table).pull = true
  }
}

/**
 * @param {string} table The table name.
 */
export const pushChanges = async table => {
  await dbReady()
  // const page = await db.query(`SELECT * FROM ${table}`)
  const page = await db.query(
    `SELECT * FROM ${table} WHERE sync_pp = 'PUSH'` +
    ' ORDER BY updated_at' +
    ' LIMIT ' + (PER_PAGE + 1)
  )

  if (page.rows.length > 0) {
    await db.transaction(async tx => {
      const placeholder = Array.from({ length: page.rows.length }, (_, i) => `$${i+1}`).join(', ')
      await tx.query(
        `UPDATE ${table} SET sync_pp = 'PULL' WHERE id IN (${placeholder})`,
        page.rows.map(data => data.id)
      )

      try {
        await request.post(SYNC_ENDPOINT, {
          fields: page.fields.filter(field => field.name != 'sync_pp').map(field => field.name),
          data: page.rows.map(data =>
            Object.entries(data)
            .filter(it => it[0] != 'sync_pp')
            .map(it => it[1])
          ),
        }, { params: { table } })
      } catch (error) {
        await tx.rollback()
        getTableCfg(table).push = true
        throw error
      }
    })
    if (page.rows.length > PER_PAGE) {
      getTableCfg(table).push = true
    }
  }
}

export const resetDB = () => {
  preparing = initDB(true)

  return preparing
}

const db = new PGlite('idb://hub')

export default db

const dbReady = async () => {
  if (!localStorage.getItem('db_available') && !preparing) {
    preparing = initDB(false)
  }
  await preparing
}

const getTableCfg = tableName => {
  if (!tables[tableName]) {
    tables[tableName] = {
      pull: false,
      push: false,
    }
  }

  return tables[tableName]
}

const getTableColumns = async tableName => {
  const cfg = getTableCfg(tableName)

  if (!cfg.cols) {
    const result = await db.query(`SELECT * FROM ${tableName} LIMIT 1`)

    cfg.cols = result.fields.map(field => field.name)
  }

  return cfg.cols
}

const initDB = async reset => {
  if (reset) {
    await db.exec(
      'DROP SCHEMA public CASCADE;' +
      'CREATE SCHEMA public;'
    )
  }

  try {
    const resp = await request.get(SYNC_ENDPOINT)
    await db.exec(resp.data)
    localStorage.setItem('db_available', 1)
  } catch (error) {
    preparing = null
    throw error
  }
}

var syncTable = null
var preparing = null

/**
 * @typedef {Object} TableConfig
 * @property {string[]} [cols]
 * @property {boolean} pull
 * @property {boolean} push
 */

/**
 * @type {Record<string, TableConfig>}
 */
const tables = {}

dbReady()
setInterval(() => {
  const tableNames = Object.keys(tables).filter(name => (
    tables[name].push || tables[name].pull
  ))

  if (!syncTable && tableNames.length > 0) {
    syncTable = tableNames[0]
  }
  if (syncTable) {
    const table = tables[syncTable]
    if (table.push) {
      table.push = false
      pushChanges(syncTable)
    }
    if (table.pull) {
      table.pull = false
      pullChanges(syncTable)
    }

    syncTable = tableNames.length > 1 ? tableNames[(tableNames.indexOf(syncTable) + 1) % tableNames.length] : null
  }
}, 2000)
