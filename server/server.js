/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import cookieParser from 'cookie-parser'
import Html from '../client/html'

const { readFile, writeFile, unlink /* , stat */ } = require('fs').promises

const myLogin = function header(req, res, next) {
  res.set('x-skillcrucial-user', '19a94565-0803-4231-aaad-0459443b63a5')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
}

let connections = []

const port = process.env.PORT || 3000
const server = express()

server.use(cors())
server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))
server.use(cookieParser())
server.use(myLogin)

const saveFile = async (users) => {
  const result = await writeFile(`${__dirname}/users.json`, JSON.stringify(users), {
    encoding: 'utf8'
  })
  return result
}

const fileRead = async () => {
  const read = await readFile(`${__dirname}/users.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
      await saveFile(users)
      return users
    })
  return read
}

server.get('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  res.json(users)
}) /* read */

server.post('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  const newUser = req.body
  const newUserid = users[users.length - 1].id + 1
  const addUser = [...users, newUser]
  await saveFile(addUser)
  res.json({ status: 'success', id: newUserid })
}) /* read + write */

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  const newUser = req.body
  const cangeUser = users.map((item) => (item.id === +userId ? Object.assign(item, newUser) : item))
  await saveFile(cangeUser)
  res.json({ status: 'success', id: userId })
}) /* read + write */

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  const delUser = users.filter((item) => item.id !== +userId)
  await saveFile(delUser)
  res.json({ status: 'success', id: +userId })
}) /* read + write */

server.delete('/api/v1/users', async (req, res) => {
  await unlink(`${__dirname}/users.json`)
  res.json({ status: 'success' })
}) /* write */

server.get('/api/v1/users/take/:number', async (req, res) => {
  const { number } = req.params
  const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
  res.json(users.slice(0, +number))
})

server.get('/api/v1/users/:name', (req, res) => {
  const { name } = req.params
  res.json({ name })
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => { })
  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
