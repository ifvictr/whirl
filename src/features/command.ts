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
            await respond(`You need to visit your DM with <@${context.botUserId}> first to use this command.`)
            return
        }

        // User can't start another chat if they're already in one
        if (!await user.isInChat()) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: 'You’re not in a chat right now.'
            })
            return
        }

        const chat = await user.getCurrentChat() as Chat

        // Broadcast leave message to current chat
        const noun = await user.getNoun() as string
        const displayName = `Anonymous ${capitalize(noun)}`
        const emoji = getEmoji(noun) as string
        const message = `:${emoji}: _${displayName} left the chat._`
        for (const memberId of await chat.getMembers()) {
            if (memberId === command.user_id) {
                continue
            }

            await client.chat.postMessage({
                channel: memberId,
                text: message
            })
        }

        await user.leave()
        await client.chat.postMessage({
            channel: command.user_id,
            text: 'You left the chat. Want to join another one?',
            blocks: ChatPrompt()
        })

        // Kick remaining members if the chat size drops below the minimum
        const updatedMembers = await chat.getMembers()
        if (updatedMembers.length < Chat.MIN_SIZE) {
            for (const memberId of updatedMembers) {
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
            await respond(`You need to visit your DM with <@${context.botUserId}> first to use this command.`)
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
            const chat = await user.getCurrentChat() as Chat

            // Broadcast leave message to current chat
            const noun = await user.getNoun() as string
            const displayName = `Anonymous ${capitalize(noun)}`
            const emoji = getEmoji(noun) as string
            const message = `:${emoji}: _${displayName} left the chat._`
            for (const memberId of await chat.getMembers()) {
                if (memberId === command.user_id) {
                    continue
                }

                await client.chat.postMessage({
                    channel: memberId,
                    text: message
                })
            }

            await user.leave()

            // Kick remaining members if the chat size drops below the minimum
            const updatedMembers = await chat.getMembers()
            if (updatedMembers.length < Chat.MIN_SIZE) {
                for (const memberId of updatedMembers) {
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
                text: 'You left the chat and moved to :beach_with_umbrella: *The Waiting Pool*! A chat will start as soon as there are more people.'
            })
            return
        }

        // Introduce members to each other
        const members = await newChat.getMembers()
        // Loop over all the identities of the chat members
        for (const memberId of members) {
            const member = await User.get(memberId) as User

            const noun = await member.getNoun() as string
            const displayName = `Anonymous ${capitalize(noun)}`
            const emoji = getEmoji(noun) as string
            // Send intro message to everyone but the member being introduced
            for (const otherMemberId of members) {
                if (otherMemberId === memberId) {
                    continue
                }
                await client.chat.postMessage({
                    channel: otherMemberId,
                    text: `You are now talking to :${emoji}: *${displayName}*. Say hi! To end this chat at any time, run *\`/next\`*.`
                })
            }
        }
    })
}
