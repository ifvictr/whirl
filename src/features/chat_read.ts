import { App } from '@slack/bolt'
import { MessageAttachment, WebAPICallResult } from '@slack/web-api'
import { Chat, User } from '../models'
import { getEmoji } from '../utils'

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
    const emoji = members.length > Chat.MIN_SIZE ? getEmoji(noun) : 'eyes'
    for (const memberId of members) {
      // Don't send a receipt to the reading user
      if (memberId === event.user) {
        continue
      }

      const member = (await User.get(memberId)) as User

      // Get the latest message in the receiving user's DM channel
      const dmChannelId = (await member.getDmChannelId()) as string
      const lastReadMessageId = await user.getLastReadMessageId(memberId)
      const { messages } = (await client.conversations.history({
        channel: dmChannelId,
        limit: 1
      })) as ConversationsHistoryResult
      const latestMessageId = messages[0].ts as string

      // Check the ID of the latest message. If it matches the previously saved
      // ID, then we know that there hasn't been any new messages sent in
      // the chat. This also prevents unnecessary API calls from being
      // made by the read receipt getting removed and immediately re-added to the
      // same message.
      if (lastReadMessageId === latestMessageId) {
        break
      }

      // Remove the reaction from the previous latest message, if it exists.
      const reactOptions = {
        channel: dmChannelId,
        name: emoji
      }
      if (lastReadMessageId !== null) {
        try {
          await client.reactions.remove({
            ...reactOptions,
            timestamp: lastReadMessageId
          })
        } catch {
          // Ignore errors like `message_not_found` and `no_reaction`
          // because any non-existent messages associated with a read
          // receipt will be overwritten when the last read message ID
          // is set. This usually happens when a user sends a message and
          // deletes it after everyone has received it.
        }
      }

      // Save the ID of the latest message, then add the reaction to it.
      await user.setLastReadMessageId(memberId, latestMessageId)
      await client.reactions.add({
        ...reactOptions,
        timestamp: latestMessageId
      })
    }
  })
}
