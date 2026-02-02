import db from './db.js'

export * from './hooks.js'

export { db }

/**
 * @param {Date} date
 */
export const sequence = date => {
  db.query(`SELECT`)
}

/**
 * @param {number} count How many timestamps to push
 * @param {unknown[]} arr The array to push timestamps
 */
export const withTimestamps = (count, arr) => {
  var dt = new Date().toISOString()
  dt = dt.slice(0, dt.indexOf('.')).replace('T', ' ')
  for (let i = 0; i < Math.floor(count); i++) {
    arr.push(dt)
  }
}
