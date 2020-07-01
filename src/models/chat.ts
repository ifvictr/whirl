// @ts-ignore
import randomatic from 'randomatic'
import redis from '../redis'

class Chat {
    readonly id: string
    readonly key: string

    constructor(id: string) {
        this.id = id
        this.key = `chat:${this.id}`
    }

    async delete() {
        return redis.multi()
            .del(this.key)
            .del(`${this.key}:members`)
            .exec()
    }

    async end() {
        // Remove all members from the chat
        for (const memberId of await this.getMembers()) {
            await this.removeMember(memberId)
        }

        await this.delete()
    }

    async getMembers() {
        return redis.smembers(`${this.key}:members`)
    }

    async addMember(userId: string, noun: string) {
        return redis.multi()
            .sadd(`${this.key}:members`, userId)
            .hset(`user:${userId}`, 'chat_id', this.id)
            .hset(`user:${userId}`, 'noun', noun)
            .exec()
    }

    async removeMember(userId: string) {
        return redis.multi()
            .srem(`${this.key}:members`, userId)
            .hset(`user:${userId}`, 'chat_id', '')
            .hset(`user:${userId}`, 'noun', '')
            .exec()
    }

    async getCreatedAt() {
        return redis.hget(this.key, 'created_at')
    }

    async getSize() {
        return redis.scard(`${this.key}:members`)
    }

    static async create() {
        const newChat = new Chat(randomatic('A0', 10))

        await redis.hset(newChat.key, 'created_at', Math.floor(Date.now() / 1000)) // UNIX timestamp

        return newChat
    }

    static async exists(chatId: string) {
        return !!await redis.exists(`chat:${chatId}`)
    }

    static async get(chatId: string) {
        if (!await Chat.exists(chatId)) {
            return null
        }

        return new Chat(chatId)
    }
}

export default Chat
