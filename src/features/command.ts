import { App } from '@slack/bolt'
import { ChatPrompt } from '../blocks'
import { Chat, User } from '../models'
import pool from '../pool'
import { capitalize, getEmoji } from '../utils'

export default (app: App) => {
  app.command('/end', async ({ ack, client, command, context, respond }) => {
    await ack()

    const user = await User.get(command.user_id)
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

    // Let the rest of the chat know that they left
    const displayName = `Anonymous ${capitalize(noun)}`
    const emoji = getEmoji(noun)
    const message = `:${emoji}: _${displayName} left the chat._`
    const members = await chat.getMembers()
    for (const memberId of members) {
      await client.chat.postMessage({
        channel: memberId,
        text: message
      })
    }

    // Kick remaining members if the chat size drops below the minimum
    if (members.length < Chat.MIN_SIZE) {
      for (const memberId of members) {
        await client.chat.postMessage({
          channel: memberId,
          text: '_This chat has ended._'
        })
        await client.chat.postMessage({
          channel: memberId,
          text: 'Want to join another one?',
          blocks: ChatPrompt()
        })
      }
      await chat.end()
    }
  })

  app.command('/next', async ({ ack, client, command, context, respond }) => {
    await ack()

    const user = await User.get(command.user_id)
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

      // Let the rest of the chat know that they left
      const displayName = `Anonymous ${capitalize(noun)}`
      const emoji = getEmoji(noun)
      const message = `:${emoji}: _${displayName} left the chat._`
      const members = await chat.getMembers()
      for (const memberId of members) {
        await client.chat.postMessage({
          channel: memberId,
          text: message
        })
      }

      // Kick remaining members if the chat size drops below the minimum
      if (members.length < Chat.MIN_SIZE) {
        for (const memberId of members) {
          await client.chat.postMessage({
            channel: memberId,
            text: '_This chat has ended._'
          })
          await client.chat.postMessage({
            channel: memberId,
            text: 'Want to join another one?',
            blocks: ChatPrompt()
          })
        }
        await chat.end()
      }
    }

    // Attempt to create a chat. If that fails, add the user to the pool.
    const newChat = await pool.attemptToCreateChat(command.user_id)
    if (!newChat) {
      await pool.add(command.user_id)
      await client.chat.postMessage({
        channel: command.user_id,
        text:
          'You’ve been added to :beach_with_umbrella: *The Waiting Pool*! A chat will start as soon as more people join.'
      })
      return
    }

    await newChat.introduceAllMembers(client)
  })
}
