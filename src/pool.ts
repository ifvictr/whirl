import sampleSize from 'lodash.samplesize'
import nouns from './data/nouns.json'
import { Chat } from './models'
import ChatMetadata from './models/chat_metadata'
import redis from './redis'

class Pool {
  async add(userId: string) {
    await redis.sadd('user_pool', userId)
  }

  async remove(userId: string) {
    await redis.srem('user_pool', userId)
  }

  async canCreateChat(size: number = Chat.MIN_SIZE) {
    return (await redis.scard('user_pool')) >= size
  }

  async attemptToCreateChat(
    initiatingUserId: string,
    size: number = Chat.MIN_SIZE
  ) {
    const membersNeeded = size - 1
    if (!(await this.canCreateChat(membersNeeded))) {
      return null
    }

    const newChat = await Chat.create(size)

    // Generate the nouns that will be used
    const randomNouns = sampleSize(nouns, size)

    await newChat.addMember(initiatingUserId, randomNouns[0])
    await this.remove(initiatingUserId)

    const membersMetadata = []
    for (let i = 0; i < membersNeeded; i++) {
      const randomUserId = (await redis.srandmember('user_pool')) as string

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
    // TODO: Don't use any
    const newChatMetadata = (await ChatMetadata.findById(newChat.id)) as any
    newChatMetadata.members = membersMetadata
    await newChatMetadata.save()

    return newChat
  }
}

const pool = new Pool()

export default pool
