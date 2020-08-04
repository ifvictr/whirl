import { App, BlockButtonAction } from '@slack/bolt'
import { User } from '../models'
import pool from '../pool'

export default (app: App) => {
  app.action('chat_start', async ({ ack, action, body, client }) => {
    await ack()

    // Ensure the action is a BlockButtonAction.
    if (action.type !== 'button') {
      return
    }
    body = body as BlockButtonAction

    const user = await User.get(body.user.id)
    if (!user) {
      return
    }

    // User can't join the pool again if they're in it
    if (await user.isInPool()) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: 'You’re already in :beach_with_umbrella: *The Waiting Pool*.'
      })
      return
    }

    // User can't join another chat while they're in one
    if (await user.isInChat()) {
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: 'You can’t join another chat while you’re in one.'
      })
      return
    }

    // Delete the prompt if the action originated from a message.
    if ('message' in body) {
      await client.chat.delete({
        channel: body.user.id,
        ts: body.message!.ts
      })
    }

    // Attempt to create a chat. If that fails, add the user to the pool.
    const newChat = await pool.attemptToCreateChat(body.user.id)
    if (!newChat) {
      await pool.add(body.user.id)
      await client.chat.postMessage({
        channel: body.user.id,
        text:
          'You’ve been added to :beach_with_umbrella: *The Waiting Pool*! A chat will start as soon as more people join.'
      })
      return
    }

    await newChat.sendIntroMessages(client)
  })
}
