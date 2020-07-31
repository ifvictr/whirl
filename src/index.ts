import { App } from '@slack/bolt'
import mongoose from 'mongoose'
import config from './config'
import * as features from './features'

const init = async () => {
  console.log('Starting Whirl…')

  // Set up database connection
  await mongoose.connect(config.databaseUrl, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  // Initialize Slack app
  const app = new App({
    signingSecret: config.signingSecret,
    token: config.botToken
  })

  // Load feature modules
  for (const [featureName, handler] of Object.entries(features)) {
    handler(app)
    console.log(`Loaded feature module: ${featureName}`)
  }

  const featuresCount = Object.keys(features).length
  console.log(
    `Loaded ${featuresCount} feature${featuresCount === 1 ? '' : 's'}`
  )

  // Start receiving events
  await app.start(config.port)
  console.log(`Listening on port ${config.port}`)
}

init()
