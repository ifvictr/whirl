import { App } from '@slack/bolt'
import { MessageAttachment, WebAPICallResult } from '@slack/web-api'
import { Chat, User } from '../models'
import { getEmoji } from '../utils'
import { updateReadReceipt } from '../utils/slack'

interface ConversationsHistoryResult extends WebAPICallResult {
  messages: MessageAttachment[]
}

export default (app: App) => {
  app.event('app_home_opened', async ({ client, event }) => {
    if (event.tab !== 'messages') {
      return
    }

    const user = await User.get(event.user)
    if (!user) {
      return
    }

    // Only chatting users receive read receipts
    if (!(await user.isInChat())) {
      return
    }

    const chat = (await user.getCurrentChat()) as Chat

    // Send a read receipt reaction to everyone else in the chat
    const members = await chat.getMembers()
    const noun = (await user.getNoun()) as string
    const receiptEmoji =
      members.length > Chat.MIN_SIZE ? getEmoji(noun) : 'eyes'
    for (const memberId of members) {
      // Don't send a receipt to the reading user
      if (memberId === event.user) {
        continue
      }

      const member = (await User.get(memberId)) as User
      const dmChannelId = (await member.getDmChannelId()) as string

      // Update the read receipt so it's on the latest message in the channel
      const { messages } = (await client.conversations.history({
        channel: dmChannelId,
        limit: 1
      })) as ConversationsHistoryResult
      const latestMessageId = messages[0].ts as string
      await updateReadReceipt({
        client,
        sender: user,
        receiver: member,
        messageId: latestMessageId,
        emoji: receiptEmoji
      })
    }
  })
}
