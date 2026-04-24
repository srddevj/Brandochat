import { env } from './config/env.js'
import { createApp } from './app.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`API listening on http://127.0.0.1:${env.PORT}`)
})
