import { App } from '@slack/bolt'
import { User } from '../models'

export default (app: App) => {
  app.event('reaction_added', async ({ client, event }) => {
    // @ts-ignore
    const isDM = event.item.channel.startsWith('D')
    if (!isDM) {
      return
    }

    const user = await User.get(event.user)
    if (!user) {
      return
    }

    // We don't care if a user reacts and they're not in a chat
    if (!(await user.isInChat())) {
      return
    }

    await client.chat.postEphemeral({
      // @ts-ignore
      channel: event.item.channel,
      user: event.user,
      text:
        'User reactions aren’t currently supported, so only you will be able to see them.'
    })
  })
}
