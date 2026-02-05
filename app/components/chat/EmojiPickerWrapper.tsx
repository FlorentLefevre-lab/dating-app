'use client'

import { EmojiPicker } from 'stream-chat-react/emojis'

export function CustomEmojiPicker() {
  return (
    <EmojiPicker
      pickerProps={{
        theme: 'light',
        locale: 'fr',
        previewPosition: 'none',
        skinTonePosition: 'search',
      }}
    />
  )
}
