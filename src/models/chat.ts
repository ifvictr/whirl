import { WebClient } from '@slack/web-api'
import { ChatPrompt } from '../blocks'
import config from '../config'
import { User } from '../models'
import redis from '../redis'
import { capitalize, getEmoji } from '../utils'
import { ChatMetadata, IChatMetadata } from './'

class Chat {
  static readonly MIN_SIZE = 2

  readonly id: string
  readonly teamId: string
  readonly key: string

  constructor(id: string, teamId: string) {
    this.id = id
    this.teamId = teamId
    this.key = `chat:${this.teamId}_${this.id}`
  }

  async delete() {
    return redis
      .multi()
      .del(this.key)
      .del(`${this.key}:members`)
      .decr('counter:active_chats')
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
      await ChatMetadata.deleteOne({ _id: this.id, teamId: this.teamId })
    }

    // Delete from Redis' memory
    await this.delete()
  }

  async getMembers() {
    return redis.smembers(`${this.key}:members`)
  }

  async hasEnoughMembers() {
    const currentSize = await this.getSize()
    return currentSize >= Chat.MIN_SIZE
  }

  async addMember(userId: string, noun: string) {
    const userKey = `user:${this.teamId}_${userId}`
    return redis
      .multi()
      .sadd(`${this.key}:members`, userId)
      .hset(userKey, 'chat_id', this.id)
      .hset(userKey, 'noun', noun)
      .incr('counter:active_users')
      .exec()
  }

  async removeMember(userId: string) {
    const userKey = `user:${this.teamId}_${userId}`
    let commands = redis
      .multi()
      .srem(`${this.key}:members`, userId)
      .hdel(userKey, 'chat_id')
      .hdel(userKey, 'noun')
      .del(`${userKey}:last_read_message_ids`)
      .decr('counter:active_users')

    // Remove the user from the other members' last read message IDs
    for (const memberId of await this.getMembers()) {
      if (memberId === userId) {
        continue
      }

      const memberKey = `user:${this.teamId}_${memberId}`
      commands = commands.hdel(`${memberKey}:last_read_message_ids`, userId)
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

  async sendIntroMessages(client: WebClient) {
    const members = await this.getMembers()
    for (const memberId of members) {
      const member = (await User.get(memberId, this.teamId)) as User

      // Send intro message to everyone but the member being introduced
      const noun = (await member.getNoun()) as string
      const displayName = `Anonymous ${capitalize(noun)}`
      const emoji = getEmoji(noun)
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
  }

  async sendLeaveMessages(client: WebClient, noun: string) {
    const displayName = `Anonymous ${capitalize(noun)}`
    const emoji = getEmoji(noun)

    const hasEnoughMembers = await this.hasEnoughMembers()
    const message = `:${emoji}: _${displayName} left${
      !hasEnoughMembers ? ', ending' : ''
    } the chat._`

    for (const memberId of await this.getMembers()) {
      await client.chat.postMessage({
        channel: memberId,
        text: message
      })

      if (!hasEnoughMembers) {
        await client.chat.postMessage({
          channel: memberId,
          text: 'Want to join another one?',
          blocks: ChatPrompt()
        })
      }
    }
  }

  private async saveMetadata() {
    const chatMetadata = (await ChatMetadata.findOne({
      _id: this.id,
      teamId: this.teamId
    })) as IChatMetadata
    chatMetadata.endedAt = new Date(Date.now())
    chatMetadata.messageCount = await this.getMessageCount()
    await chatMetadata.save()
  }

  static async exists(chatId: string, teamId: string) {
    return !!(await redis.exists(`chat:${teamId}_${chatId}`))
  }

  static async get(chatId: string, teamId: string) {
    if (!(await Chat.exists(chatId, teamId))) {
      return null
    }

    return new Chat(chatId, teamId)
  }
}

export default Chat
