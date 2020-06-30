import iconsJson from '../data/icons.json'
import nounsJson from '../data/nouns.json'

const icons = iconsJson as { [noun: string]: string }
const nouns = nounsJson as string[]

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export const isDM = (channel: string) => channel.startsWith('D')

export const getIcon = (noun: string) => nouns.includes(noun)
    ? `:${icons[noun] ? icons[noun] : noun}:`
    : null

// Inserts zero-width non-joiner to prevent special tags like "@everyone" and "<!channel|channel>" from working
export const removeSpecialTags = (str: string): string => str
    .replace(/@(channel|everyone|here)/ig, '@\u200c$1')
    .replace(/\<\!(channel|everyone|here)\|(.*?)\>/ig, '<\u200c!$1|$2>')
