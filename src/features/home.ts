import { App } from '@slack/bolt'
import { HomeLayout } from '../blocks'
import { User } from '../models'
import redis from '../redis'

const COUNTER_KEYS = [
  'active_chats',
  'active_users',
  'total_chats',
  'total_messages_sent',
  'total_users'
]

export default (app: App) => {
  app.event('app_home_opened', async ({ client, event }) => {
    if (event.tab !== 'home') {
      return
    }

    // Get the user's chat status to display the appropriate button
    const user = await User.get(event.user)
    const isInChat = user !== null && (await user.isInChat())

    // Fetch the latest stats to display to the user
    const rawCounts = (await Promise.all(
      COUNTER_KEYS.map(key => redis.get(`count:${key}`))
    )) as string[]
    const [
      activeChatCount,
      activeUserCount,
      totalChatCount,
      totalMessagesSent,
      totalUserCount
    ] = rawCounts.map(count => parseInt(count) || 0)

    await client.views.publish({
      user_id: event.user,
      view: HomeLayout({
        isInChat,
        activeChatCount,
        activeUserCount,
        totalChatCount,
        totalMessagesSent,
        totalUserCount
      })
    })
  })
}
