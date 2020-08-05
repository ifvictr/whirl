import { App } from '@slack/bolt'

export default (app: App) => {
  app.event('reaction_added', async ({ client, context, event }) => {
    // Ensure the event contains a ReactionMessageItem.
    if (!('channel' in event.item)) {
      return
    }

    const isDM = event.item.channel.startsWith('D')
    if (!isDM) {
      return
    }

    const user = await context.manager.getUser(event.user)
    if (!user) {
      return
    }

    // We don't care if a user reacts and they're not in a chat
    if (!(await user.isInChat())) {
      return
    }

    await client.chat.postEphemeral({
      channel: event.item.channel,
      user: event.user,
      text:
        'User reactions aren’t currently supported, so only you will be able to see them.'
    })
  })
}
