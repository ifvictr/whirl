import { WebClient } from '@slack/web-api'
import { User } from '../models'

export interface UpdateReadReceiptArguments {
  client: WebClient
  sender: User
  receiver: User
  messageId: string
  emoji: string
}

export const updateReadReceipt = async ({
  client,
  sender,
  receiver,
  messageId,
  emoji
}: UpdateReadReceiptArguments) => {
  // Get the latest message in the receiving user's DM channel
  const dmChannelId = (await receiver.getDmChannelId()) as string
  const lastReadMessageId = await sender.getLastReadMessageId(receiver.id)

  // Check the ID of the latest message. If it matches the previously saved
  // ID, then we know that there hasn't been any new messages sent in the chat.
  //
  // This also prevents unnecessary API calls from being made by the read receipt
  // getting removed and immediately re-added to the same message.
  if (lastReadMessageId === messageId) {
    return
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
      // Ignore errors like `message_not_found` and `no_reaction` because any
      // non-existent messages associated with a read receipt will be overwritten
      // when the last read message ID is set. This usually happens when
      // a user sends a message and deletes it after everyone has received it.
    }
  }

  // Save the ID of the latest message, then add the reaction to it.
  await sender.setLastReadMessageId(receiver.id, messageId)
  try {
    await client.reactions.add({
      ...reactOptions,
      timestamp: messageId
    })
  } catch {
    // Ignore errors like `already_reacted`. This usually happens when Slack
    // sends the same payload multiple times.
  }
}
