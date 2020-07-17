import { App, subtype } from '@slack/bolt'
import { channelType } from '../middlewares'
import { Chat, User } from '../models'
import redis from '../redis'
import { capitalize, getEmoji, removeSpecialTags } from '../utils'

export default (app: App) => {
    app.message(channelType('im'), async ({ client, event }) => {
        const user = await User.get(event.user)
        if (!user) {
            return
        }

        // If the user isn't in a chat, prompt them to start one
        if (!await user.isInChat()) {
            await client.chat.postEphemeral({
                channel: event.channel,
                user: event.user,
                text: 'You’re not in a chat right now, so this won’t go anywhere. Run *`/next`* to join one!'
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
                text: 'Sorry, file attachments aren’t currently supported. The text portion will still be sent, however.'
            })
        }

        const currentChat = await user.getCurrentChat() as Chat

        // Broadcast the message to other chat members
        const noun = await user.getNoun() as string
        const displayName = `Anonymous ${capitalize(noun)}`
        const emoji = getEmoji(noun) as string
        for (const memberId of await currentChat.getMembers()) {
            // Don't send the message to the sender again
            if (memberId === event.user) {
                continue
            }

            const member = await User.get(memberId) as User

            await client.chat.postMessage({
                channel: await member.getDmChannelId() as string,
                text: removeSpecialTags(event.text!),
                attachments: event.attachments,
                // blocks: event.blocks,
                icon_emoji: `${emoji}`,
                username: displayName
            })
        }

        // Increment the message counts
        await redis.hincrby(currentChat.key, 'message_count', 1)
        await redis.incr('count:total_messages_sent')
    })

    app.message(channelType('im'), subtype('message_changed'), async ({ client, event }) => {
        const user = await User.get(event.message.user)
        if (!user) {
            return
        }

        // Won't matter if the user isn't currently in a chat
        if (!await user.isInChat()) {
            return
        }

        await client.chat.postEphemeral({
            channel: await user.getDmChannelId() as string,
            user: event.message.user,
            text: 'Changes to your message aren’t shown to the other members of the chat.'
        })
    })
}
