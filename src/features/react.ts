import { App } from '@slack/bolt'

export default (app: App) => {
    app.event('reaction_added', async ({ client, event }) => {
        console.log(event)
        await client.chat.postEphemeral({
            // @ts-ignore
            channel: event.item.channel,
            user: event.user,
            text: 'Reactions aren’t currently supported, so only you are able to see them.'
        })
    })

    // app.event('reaction_removed', async ({ event }) => {
    //     console.log(event)
    // })
}
