import randomatic from 'randomatic'
import config from '../config'
import redis from '../redis'
import { ChatMetadata, IChatMetadata } from './'

class Chat {
  static readonly MIN_SIZE = 2

  readonly id: string
  readonly key: string

  constructor(id: string) {
    this.id = id
    this.key = `chat:${this.id}`
  }

  async delete() {
    return redis
      .multi()
      .del(this.key)
      .del(`${this.key}:members`)
      .decr('count:active_chats')
      .exec()
  }

  async end() {
    // Remove all members from the chat
    for (const memberId of await this.getMembers()) {
      await this.removeMember(memberId)
    }

    // Check the chat's total message count. If it's at least the minimum,
    // we'll update the metadata with the ending timestamp and the amount of
    // messages sent. But if it falls below that, it's considered insignificant
    // (e.g., a user running /next many times in a row without having sent a
    // message) and is simply discarded from the database.
    const messageCount = await this.getMessageCount()
    if (messageCount >= config.chatMetadataThreshold) {
      await this.saveMetadata()
    } else {
      await ChatMetadata.findByIdAndDelete(this.id)
    }

    // Delete from Redis' memory
    await this.delete()
  }

  async getMembers() {
    return redis.smembers(`${this.key}:members`)
  }

  async addMember(userId: string, noun: string) {
    return redis
      .multi()
      .sadd(`${this.key}:members`, userId)
      .hset(`user:${userId}`, 'chat_id', this.id)
      .hset(`user:${userId}`, 'noun', noun)
      .incr('count:active_users')
      .exec()
  }

  async removeMember(userId: string) {
    let commands = redis
      .multi()
      .srem(`${this.key}:members`, userId)
      .hdel(`user:${userId}`, 'chat_id')
      .hdel(`user:${userId}`, 'noun')
      .del(`user:${userId}:last_read_message_ids`)
      .decr('count:active_users')

    // Remove the user from the other members' last read message IDs
    for (const memberId of await this.getMembers()) {
      if (memberId === userId) {
        continue
      }

      commands = commands.hdel(`user:${memberId}:last_read_message_ids`, userId)
    }

    return commands.exec()
  }

  async getCreatedAt() {
    return redis.hget(this.key, 'created_at')
  }

  async getMessageCount() {
    const messageCount = await redis.hget(this.key, 'message_count')
    if (!messageCount) {
      return 0
    }

    return parseInt(messageCount)
  }

  async getSize() {
    return redis.scard(`${this.key}:members`)
  }

  private async saveMetadata() {
    const chatMetadata = (await ChatMetadata.findById(this.id)) as IChatMetadata
    chatMetadata.endedAt = new Date(Date.now())
    chatMetadata.messageCount = await this.getMessageCount()
    await chatMetadata.save()
  }

  static async create(size: number = Chat.MIN_SIZE) {
    // TODO: Guarantee the ID is unique within the DB and Redis cache
    const randomId = randomatic('A0', 10)
    const startedAt = Date.now()

    // Create the base chat representation in Redis
    const newChat = new Chat(randomId)
    await redis
      .multi()
      .hset(newChat.key, 'created_at', Math.floor(startedAt / 1000)) // UNIX timestamp
      .hset(newChat.key, 'message_count', 0)
      .incr('count:active_chats')
      .incr('count:total_chats')
      .exec()

    // Store the base metadata in Mongo
    await ChatMetadata.create({
      _id: randomId,
      startedAt,
      size
    })

    return newChat
  }

  static async exists(chatId: string) {
    return !!(await redis.exists(`chat:${chatId}`))
  }

  static async get(chatId: string) {
    if (!(await Chat.exists(chatId))) {
      return null
    }

    return new Chat(chatId)
  }
}

export default Chat
