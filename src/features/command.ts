import { App } from '@slack/bolt'
import { ChatPrompt } from '../blocks'
import { Chat } from '../models'

export default (app: App) => {
  app.command('/end', async ({ ack, client, command, context, respond }) => {
    await ack()

    const user = await context.manager.getUser(command.user_id)
    if (!user) {
      await respond(
        `You need to visit your DM with <@${context.botUserId}> first to use this command.`
      )
      return
    }

    // User can't end a chat if they're not in one
    if (!(await user.isInChat())) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'You’re not in a chat right now.'
      })
      return
    }

    const chat = (await user.getCurrentChat()) as Chat
    const noun = (await user.getNoun()) as string

    // Prompt the user to join another chat after they leave
    await user.leave()
    await client.chat.postMessage({
      channel: command.user_id,
      text: 'You left the chat. Want to join another one?',
      blocks: ChatPrompt()
    })

    await chat.sendLeaveMessages(client, noun)

    if (!(await chat.hasEnoughMembers())) {
      await chat.end()
    }
  })

  app.command('/next', async ({ ack, client, command, context, respond }) => {
    await ack()

    const user = await context.manager.getUser(command.user_id)
    if (!user) {
      await respond(
        `You need to visit your DM with <@${context.botUserId}> first to use this command.`
      )
      return
    }

    // User can't join the pool again if they're in it
    if (await user.isInPool()) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'You’re already in :beach_with_umbrella: *The Waiting Pool*.'
      })
      return
    }

    if (await user.isInChat()) {
      const chat = (await user.getCurrentChat()) as Chat
      const noun = (await user.getNoun()) as string

      await user.leave()

      await chat.sendLeaveMessages(client, noun)

      if (!(await chat.hasEnoughMembers())) {
        await chat.end()
      }
    }

    // Attempt to create a chat. If that fails, add the user to the pool.
    const newChat = await context.manager
      .getPool()
      .attemptToCreateChat(command.user_id)
    if (!newChat) {
      await context.manager.getPool().add(command.user_id)
      await client.chat.postMessage({
        channel: command.user_id,
        text:
          'You’ve been added to :beach_with_umbrella: *The Waiting Pool*! A chat will start as soon as more people join.'
      })
      return
    }

    await newChat.sendIntroMessages(client)
  })
}
