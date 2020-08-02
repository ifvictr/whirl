import { App } from '@slack/bolt'
import { ChatPrompt } from '../blocks'
import { User } from '../models'

export default (app: App) => {
  app.event('app_home_opened', async ({ event, say }) => {
    // Show intro message if this is the user's first time in a DM with Whirl
    if (!(await User.exists(event.user))) {
      await User.create(event.user, event.channel)
      await say({
        blocks: ChatPrompt({ isExistingUser: false }),
        text:
          'Welcome to Whirl, where you can have fun, completely anonymous chats with other members of your Slack. Check your DMs to get started.'
      })
    }
  })
}
