import iconsJson from '../data/icons.json'
import nounsJson from '../data/nouns.json'

const icons = iconsJson as { [noun: string]: string }
const nouns = nounsJson as string[]

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export class EmojiNotFoundError extends Error {
  constructor(noun: string) {
    super(`${noun} does not have an emoji`)
    this.name = this.constructor.name
  }
}

export const getEmoji = (noun: string) => {
  if (!nouns.includes(noun)) {
    throw new EmojiNotFoundError(noun)
  }

  return icons[noun] ?? noun
}

// Inserts zero-width non-joiner to prevent special tags like "@everyone" and "<!channel|channel>" from working
export const removeSpecialTags = (str: string): string =>
  str
    .replace(/@(channel|everyone|here)/gi, '@\u200c$1')
    .replace(/<!(channel|everyone|here)\|(.*?)>/gi, '<\u200c!$1|$2>')
