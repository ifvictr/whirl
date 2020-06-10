import { App } from '@slack/bolt'
import config from './config'

const init = async () => {
    console.log('Starting Whirl…')

    // Initialize Slack app
    const app = new App({
        signingSecret: config.signingSecret,
        token: config.botToken
    })

    // Start receiving events
    await app.start(config.port)
    console.log(`Listening on port ${config.port}`)
}

init()
