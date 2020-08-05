import sampleSize from 'lodash.samplesize'
import randomatic from 'randomatic'
import nouns from '../data/nouns.json'
import redis from '../redis'
import { Chat, ChatMetadata, IChatMetadata } from '.'

class UserPool {
  readonly teamId: string
  readonly key: string

  constructor(teamId: string) {
    this.teamId = teamId
    this.key = `user_pool:${this.teamId}`
  }

  async add(userId: string) {
    await redis.sadd(this.key, userId)
  }

  async remove(userId: string) {
    await redis.srem(this.key, userId)
  }

  async canCreateChat(size: number = Chat.MIN_SIZE) {
    return (await redis.scard(this.key)) >= size
  }

  async attemptToCreateChat(
    initiatingUserId: string,
    size: number = Chat.MIN_SIZE
  ) {
    const membersNeeded = size - 1
    if (!(await this.canCreateChat(membersNeeded))) {
      return null
    }

    const newChat = await this.createChat(size)

    // Generate the nouns that will be used
    const randomNouns = sampleSize(nouns, size)

    await newChat.addMember(initiatingUserId, randomNouns[0])
    await this.remove(initiatingUserId)

    const membersMetadata = []
    for (let i = 0; i < membersNeeded; i++) {
      const randomUserId = (await redis.srandmember(this.key)) as string

      // Theoretically, it shouldn't be possible for the user who initiated
      // this to be drawn because they haven't been added to the pool.
      if (randomUserId === initiatingUserId) {
        i--
        continue
      }

      const noun = randomNouns[1 + i] // Add 1 because the initiating user already claimed the first noun
      await newChat.addMember(randomUserId, noun)
      await this.remove(randomUserId)

      membersMetadata.push({
        id: randomUserId,
        noun
      })
    }

    // Add user IDs and pseudonyms to metadata
    const newChatMetadata = (await ChatMetadata.findById(
      newChat.id
    )) as IChatMetadata
    newChatMetadata.members = membersMetadata
    await newChatMetadata.save()

    return newChat
  }

  async createChat(size: number = Chat.MIN_SIZE) {
    // TODO: Guarantee the ID is unique within the DB and Redis cache
    const randomId = randomatic('A0', 10)
    const startedAt = Date.now()

    // Create the base chat representation in Redis
    const newChat = new Chat(randomId, this.teamId)
    await redis
      .multi()
      .hset(newChat.key, 'created_at', Math.floor(startedAt / 1000)) // UNIX timestamp
      .hset(newChat.key, 'message_count', 0)
      .incr('counter:active_chats')
      .incr('counter:total_chats')
      .exec()

    // Store the base metadata in Mongo
    await ChatMetadata.create({
      _id: randomId,
      teamId: this.teamId,
      startedAt,
      size
    })

    return newChat
  }
}

export default UserPool
