import { App } from '@slack/bolt'
import { ChatPrompt } from '../blocks'
import { User } from '../models'

export default (app: App) => {
  app.event('app_home_opened', async ({ body, event, say }) => {
    // Only show the intro message if the user doesn't exist in the DB yet
    if (await User.exists(event.user, body.team_id)) {
      return
    }

    await User.create(event.user, body.team_id, event.channel)
    await say({
      blocks: ChatPrompt({ isExistingUser: false }),
      text:
        'Welcome to Whirl, where you can have fun, completely anonymous chats with other members of your Slack. Check your DMs to get started.'
    })
  })
}
