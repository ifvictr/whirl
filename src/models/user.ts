import redis from '../redis'
import { Chat } from '.'

export class User {
  readonly id: string
  readonly teamId: string
  readonly key: string

  constructor(id: string, teamId: string) {
    this.id = id
    this.teamId = teamId
    this.key = `user:${teamId}_${id}`
  }

  async getCurrentChat() {
    const chatId = await this.getCurrentChatId()
    if (!chatId) {
      return null
    }

    return Chat.get(chatId, this.teamId)
  }

  async getCurrentChatId() {
    return redis.hget(this.key, 'chat_id')
  }

  async getDmChannelId() {
    return redis.hget(this.key, 'dm_channel_id')
  }

  async getLastReadMessageId(senderId: string) {
    return redis.hget(`${this.key}:last_read_message_ids`, senderId)
  }

  async setLastReadMessageId(senderId: string, messageId: string) {
    await redis.hset(`${this.key}:last_read_message_ids`, senderId, messageId)
  }

  async getNoun() {
    return redis.hget(this.key, 'noun')
  }

  async isInChat() {
    return !!(await redis.hexists(this.key, 'chat_id'))
  }

  async isInPool() {
    return !!(await redis.sismember(`user_pool:${this.teamId}`, this.id))
  }

  async leave() {
    const currentChat = await this.getCurrentChat()
    if (!currentChat) {
      return
    }

    await currentChat.removeMember(this.id)
  }

  static async create(userId: string, teamId: string, dmChannelId: string) {
    const newUser = new User(userId, teamId)
    await redis
      .multi()
      .hset(newUser.key, 'dm_channel_id', dmChannelId)
      .incr(`counter:${teamId}:total_users`)
      .exec()

    return newUser
  }

  static async exists(userId: string, teamId: string) {
    return !!(await redis.exists(`user:${teamId}_${userId}`))
  }

  static async get(userId: string, teamId: string) {
    if (!(await User.exists(userId, teamId))) {
      return null
    }

    return new User(userId, teamId)
  }
}
