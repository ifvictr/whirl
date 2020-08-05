import { App } from '@slack/bolt'
import mongoose from 'mongoose'
import config from './config'
import * as features from './features'
import Manager from './manager'
import { Installation, IInstallation } from './models'

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
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    stateSecret: config.stateSecret,
    scopes: [
      'chat:write',
      'chat:write.customize',
      'commands',
      'im:history',
      'reactions:read',
      'reactions:write'
    ],
    installationStore: {
      storeInstallation: async installation => {
        // Prevent duplicate installations being stored
        const installationQuery = {
          'team.id': installation.team.id
        }
        if (await Installation.exists(installationQuery)) {
          await Installation.deleteOne(installationQuery)
        }

        await Installation.create(installation)
      },
      fetchInstallation: async query => {
        const installation = (await Installation.findOne({
          'team.id': query.teamId
        })) as IInstallation
        return installation
      }
    }
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

  // TODO: move this elsewhere
  app.use(async ({ body, context, next }) => {
    // @ts-ignore
    context.manager = new Manager(body.team_id || body.team.id)
    await next!()
  })

  // Start receiving events
  await app.start(config.port)
  console.log(`Listening on port ${config.port}`)
}

init()
