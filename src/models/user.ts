import redis from '../redis'
import { Chat } from './'

class User {
    readonly id: string
    readonly key: string

    constructor(id: string) {
        this.id = id
        this.key = `user:${id}`
    }

    async getCurrentChat() {
        const chatId = await this.getCurrentChatId()
        if (!chatId) {
            return null
        }

        return Chat.get(chatId)
    }

    async getCurrentChatId() {
        return redis.hget(this.key, 'chat_id')
    }

    async getDmChannelId() {
        return redis.hget(this.key, 'dm_channel_id')
    }

    async getNoun() {
        return redis.hget(this.key, 'noun')
    }

    async isAvailable() {
        return !await redis.hexists(this.key, 'chat_id')
    }

    async isInPool() {
        return redis.sismember('user_pool', this.id)
    }

    async leave() {
        const currentChat = await this.getCurrentChat()
        if (!currentChat) {
            return
        }

        // Remove from chat
        await currentChat.removeMember(this.id)
    }

    static async create(userId: string, dmChannelId: string) {
        const newUser = new User(userId)
        await redis.hset(newUser.key, 'dm_channel_id', dmChannelId)

        return newUser
    }

    static async exists(userId: string) {
        return !!await redis.exists(`user:${userId}`)
    }

    static async get(userId: string) {
        if (!await User.exists(userId)) {
            return null
        }

        return new User(userId)
    }
}

export default User
