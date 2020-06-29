import { App } from '@slack/bolt'
import { ChatPrompt } from '../blocks'
import { User } from '../models'
import { capitalize, getIcon } from '../utils'

export default (app: App) => {
    app.command('/next', async ({ ack, client, command, context, respond, say }) => {
        await ack()

        const user = await User.get(command.user_id)
        if (!user) {
            await respond(`You need to visit your DM with <@${context.botUserId}> first to use this command.`)
            return
        }

        if (await user.isAvailable()) {
            await respond('You’re not in a chat.')
            return
        }

        const chat = await user.getCurrentChat()
        if (!chat) {
            return
        }

        // Broadcast leave message to current chat
        const noun = await user.getNoun() as string
        const displayName = `Anonymous ${capitalize(noun)}`
        const emoji = getIcon(noun)
        const message = `${emoji} _${displayName} has left the chat._`
        for (const memberId of await chat.getMembers()) {
            if (memberId === command.user_id) {
                continue
            }

            await client.chat.postMessage({
                channel: memberId,
                text: message
            })
        }

        // Actually leave
        await user.leave()

        // Show messsage and prompt to leaving user
        await say('_You’ve left the chat._')
        await client.chat.postMessage({
            channel: command.user_id,
            text: 'Want to start another chat?',
            blocks: ChatPrompt()
        })

        // Kick remaining members if the chat size drops below 2
        const updatedMembers = await chat.getMembers()
        if (await chat.getSize() < 2) {
            for (const memberId of updatedMembers) {
                await client.chat.postMessage({
                    channel: memberId,
                    text: '_This chat has ended._'
                })
                await client.chat.postMessage({
                    channel: memberId,
                    text: 'Want to start another chat?',
                    blocks: ChatPrompt()
                })
            }
            await chat.end()
        }
    })
}
