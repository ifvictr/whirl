import { App } from '@slack/bolt'
import { User } from '../models'
import pool from '../pool'
import { capitalize, getEmoji } from '../utils'

export default (app: App) => {
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
        text: 'You’re already in :beach_with_umbrella: *The Waiting Pool*.'
      })
      return
    }

    // User can't join another chat if they're in one already
    if (await user.isInChat()) {
      await client.chat.postEphemeral({
        channel: body.channel!.id,
        user: body.user.id,
        text: 'You can’t join another chat because you’re in one already.'
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
    const chat = await pool.attemptToCreateChat(body.user.id)
    if (!chat) {
      await pool.add(body.user.id)
      await say(
        'You’ve been added to :beach_with_umbrella: *The Waiting Pool*! A chat will start as soon as more people join.'
      )
      return
    }

    // Introduce members to each other
    const members = await chat.getMembers()
    // Loop over all the identities of the chat members
    for (const memberId of members) {
      const member = (await User.get(memberId)) as User

      const noun = (await member.getNoun()) as string
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
