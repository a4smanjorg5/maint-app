import axios from 'axios'

export const SYNC_ENDPOINT = 'sync'

const request = axios.create({
  params: { key: 'foobar' },
  baseURL: 'http://localhost/app/',
})

export default request
