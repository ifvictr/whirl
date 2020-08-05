import { App, subtype } from '@slack/bolt'
import { WebAPICallResult } from '@slack/web-api'
import { channelType } from '../middlewares'
import { Chat, User } from '../models'
import redis from '../redis'
import { capitalize, getEmoji, removeSpecialTags } from '../utils'
import { updateReadReceipt } from '../utils/slack'

interface ChatPostMessageResult extends WebAPICallResult {
  channel: string
  ts: string
}

export default (app: App) => {
  app.message(channelType('im'), async ({ client, context, event }) => {
    const user = await context.manager.getUser(event.user)
    if (!user) {
      return
    }

    // If the user isn't in a chat, prompt them to start one
    if (!(await user.isInChat())) {
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        text: 'You’re not in a chat right now. Run *`/next`* to join one!'
      })
      return
    }

    // Let the user know that thread replies aren't supported
    if ('thread_ts' in event) {
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        text: 'Thread replies aren’t supported. Your message will not be seen.',
        thread_ts: event.thread_ts
      })
      return
    }

    // Let the user know that file attachments aren't supported
    if ('files' in event) {
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        text:
          'Sorry, file attachments aren’t currently supported. The text portion will still be sent though.'
      })
    }

    const currentChat = (await user.getCurrentChat()) as Chat

    // Broadcast the message to other chat members
    const members = await currentChat.getMembers()
    const noun = (await user.getNoun()) as string
    const displayName = `Anonymous ${capitalize(noun)}`
    const emoji = getEmoji(noun)
    const receiptEmoji = members.length > Chat.MIN_SIZE ? noun : 'eyes'
    for (const memberId of members) {
      // Don't send the message back to the sender
      if (memberId === event.user) {
        continue
      }

      const member = (await context.manager.getUser(memberId)) as User
      const dmChannelId = (await member.getDmChannelId()) as string

      // Send message with pseudonym, then update the read receipt so it's on
      // that message.
      const { ts: newMessageId } = (await client.chat.postMessage({
        channel: dmChannelId,
        text: removeSpecialTags(event.text!),
        attachments: event.attachments,
        icon_emoji: `:${emoji}:`,
        username: displayName
      })) as ChatPostMessageResult
      await updateReadReceipt({
        client,
        sender: user,
        receiver: member,
        messageId: newMessageId,
        emoji: receiptEmoji
      })
    }

    // Increment the message counters
    await redis
      .multi()
      .hincrby(currentChat.key, 'message_count', 1)
      .incr(`counter:${currentChat.teamId}:total_messages_sent`)
      .exec()
  })

  app.message(
    channelType('im'),
    subtype('message_changed'),
    async ({ client, context, event }) => {
      const user = await context.manager.getUser(event.message.user)
      if (!user) {
        return
      }

      // Won't matter if the user isn't currently in a chat
      if (!(await user.isInChat())) {
        return
      }

      await client.chat.postEphemeral({
        channel: (await user.getDmChannelId()) as string,
        user: event.message.user,
        text:
          'Changes to your message aren’t shown to the other members of the chat.'
      })
    }
  )
}
