import { App } from '@slack/bolt'

export default (app: App) => {
    app.event('reaction_added', async ({ client, event }) => {
        await client.chat.postEphemeral({
            // @ts-ignore
            channel: event.item.channel,
            user: event.user,
            text: 'User reactions aren’t currently supported, so only you will be able to see them.'
        })
    })
}
