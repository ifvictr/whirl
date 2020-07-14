import { App } from '@slack/bolt'
import { Chat, User } from '../models'
import { getEmoji } from '../utils'

export default (app: App) => {
    app.event('app_home_opened', async ({ client, event }) => {
        if (event.tab !== 'messages') {
            return
        }

        const user = await User.get(event.user)
        if (!user) {
            return
        }

        // Read receipts are only applicable to users that are in a chat
        if (!await user.isInChat()) {
            return
        }

        const chat = await user.getCurrentChat() as Chat

        // Send a read receipt to everyone else in the chat
        const members = await chat.getMembers()
        const noun = await user.getNoun() as string
        const emoji = members.length > 2 ? getEmoji(noun) as string : 'eyes'
        for (const memberId of members) {
            // Don't send a receipt to self
            if (memberId === event.user) {
                continue
            }

            const member = await User.get(memberId) as User
            const dmChannelId = await member.getDmChannelId() as string
            const lastReadMessageId = await user.getLastReadMessageId(memberId) as string
            const { messages } = await client.conversations.history({
                channel: dmChannelId,
                limit: 1
            }) as any
            const latestMessageId = messages[0].ts
            try {
                // Check the ID of the latest message. If it matches the previously saved
                // ID, then we know that there haven't been any new messages sent in
                // the chat. This also prevents unnecessary API calls from being
                // made by the read receipt getting removed and immediately re-added.
                if (lastReadMessageId === latestMessageId) {
                    break
                }

                // Remove the reaction from the previous latest message if it exists
                const reactOptions = {
                    channel: dmChannelId,
                    name: emoji
                }
                if (lastReadMessageId) {
                    await client.reactions.remove({
                        ...reactOptions,
                        timestamp: lastReadMessageId
                    })
                }
                // React to the latest message
                await client.reactions.add({
                    ...reactOptions,
                    timestamp: latestMessageId
                })
            } catch (e) {
                // Ignore rejections like having already reacted, message not existing, etc.
            } finally {
                // Save the ID of the latest message so we can remove the reaction
                // from it if the receipt needs to be updated in the future.
                await user.setLastReadMessageId(memberId, latestMessageId)
            }
        }
    })
}
