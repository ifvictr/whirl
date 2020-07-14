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

        // Read receipts are only shown to a user if they're in a chat
        if (!await user.isInChat()) {
            return
        }

        const chat = await user.getCurrentChat() as Chat

        // Update read receipt for all members of the chat
        const members = await chat.getMembers()
        const noun = await user.getNoun() as string
        const emoji = members.length > 2 ? getEmoji(noun) as string : 'eyes'
        for (const memberId of members) {
            // Don't show a read receipt to the viewing user
            if (memberId === event.user) {
                continue
            }

            const member = await User.get(memberId) as User
            const dmChannelId = await member.getDmChannelId() as string
            try {
                const lastReadMessageId = await user.getLastReadMessageId(memberId) as string
                const { messages } = await client.conversations.history({
                    channel: dmChannelId,
                    limit: 1
                }) as any

                // Check the timestamp of the last message. If it matches the
                // previously saved ID, we know that there haven't been any new messages
                // sent in the chat and immediately stop sending read receipts to anyone.
                const latestReadMessageId = messages[0].ts
                if (lastReadMessageId === latestReadMessageId) {
                    break
                }

                // Remove the eyes reaction from the old latest message if it exists
                if (lastReadMessageId) {
                    await client.reactions.remove({
                        channel: dmChannelId,
                        name: emoji,
                        timestamp: lastReadMessageId
                    })
                }

                // Add the eyes reaction to the new latest message
                await client.reactions.add({
                    channel: dmChannelId,
                    name: emoji,
                    timestamp: latestReadMessageId
                })

                // Save the ID of the latest message somewhere so we can remove the react later
                await user.setLastReadMessageId(memberId, latestReadMessageId)
            } catch (e) {
                console.log(e)
            }
        }
    })
}
