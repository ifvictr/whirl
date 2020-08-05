import { Chat, User } from './models'
import Pool from './pool'

class Manager {
  readonly teamId: string

  constructor(teamId: string) {
    this.teamId = teamId
  }

  getPool() {
    return new Pool(this.teamId)
  }

  getChat(id: string) {
    return Chat.get(id, this.teamId)
  }

  getUser(id: string) {
    return User.get(id, this.teamId)
  }
}

export default Manager
