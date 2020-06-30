import { App } from '@slack/bolt'
import { channelType } from '../middlewares'
import { User } from '../models'
import pool from '../pool'
import { capitalize, getIcon, removeSpecialTags } from '../utils'

export default (app: App) => {
    app.message(channelType('im'), async ({ client, event }) => {
        const user = await User.get(event.user)
        if (!user) {
            return
        }

        // If the user isn't in a chat, prompt them to start one
        if (await user.isAvailable()) {
            await client.chat.postEphemeral({
                channel: event.channel,
                user: event.user,
                text: 'You’re not in a chat right now, so this won’t be sent anywhere :stuck_out_tongue:'
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

        const currentChat = await user.getCurrentChat()
        if (!currentChat) {
            return
        }

        // Broadcast the message to other chat members
        const noun = await user.getNoun() as string
        const displayName = `Anonymous ${capitalize(noun)}`
        const emoji = getIcon(noun) as string
        for (const memberId of await currentChat.getMembers()) {
            // Don't send the message to the sender again
            if (memberId === event.user) {
                continue
            }

            const member = await User.get(memberId)

            if (!member) {
                return
            }

            await client.chat.postMessage({
                channel: await member.getDmChannelId() as string,
                text: removeSpecialTags(event.text!),
                attachments: event.attachments,
                // blocks: event.blocks,
                icon_emoji: emoji,
                username: displayName
            })
        }
    })

    app.action('chat_start', async ({ ack, body, client, say }) => {
        await ack()

        const user = await User.get(body.user.id)
        if (!user) {
            return
        }

        // User can't join the pool again if they're in it
        if (await user.isInPool()) {
            await client.chat.postEphemeral({
                channel: body.channel!.id,
                user: body.user.id,
                text: 'You’re already waiting in the pool.'
            })
            return
        }

        // User can't start another chat if they're already in one
        if (!await user.isAvailable()) {
            await client.chat.postEphemeral({
                channel: body.channel!.id,
                user: body.user.id,
                text: 'You can’t start another chat because you’re already in one.'
            })
            return
        }

        // Delete the prompt
        await client.chat.delete({
            channel: body.channel!.id,
            // @ts-ignore
            ts: body.message.ts
        })

        // Attempt to create a chat. If that fails, add the user to the pool.
        const chat = await pool.createChat(body.user.id)
        if (!chat) {
            await pool.add(body.user.id)
            await say('You’ve been added to *The Waiting Pool* :beach_with_umbrella:! A chat will start as soon as more people join.')
            return
        }

        // Introduce members to each other
        const members = await chat.getMembers()
        // Loop over all the identities of the chat members
        for (const memberId of members) {
            const member = await User.get(memberId)
            if (!member) {
                continue
            }

            const noun = await member.getNoun() as string
            const displayName = `Anonymous ${capitalize(noun)}`
            const emoji = getIcon(noun)
            // Send intro message to everyone but the member being introduced
            for (const otherMemberId of members) {
                if (otherMemberId === memberId) {
                    continue
                }
                await client.chat.postMessage({
                    channel: otherMemberId,
                    text: `You are now talking to ${emoji ? emoji + ' ' : ''}*${displayName}*. Say hi!`
                })
            }
        }
    })
}
