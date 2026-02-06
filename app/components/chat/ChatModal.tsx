// =====================================================
// src/app/components/chat/ChatModal.tsx
// =====================================================
'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  Chat,
  Channel,
  MessageList,
  MessageInput,
  Window,
  ChannelHeader,
  LoadingIndicator
} from 'stream-chat-react'
import { useStreamChat } from '@/hooks/useStreamChat'
import { useSession } from 'next-auth/react'
import { CustomMessage } from './CustomMessage'
import { CustomAttachment } from './CustomAttachment'
import { CustomEmojiPicker } from './EmojiPickerWrapper'
import { ChannelListWithTabs } from './ChannelListWithTabs'
import { FileUploadValidator } from './FileUploadValidator'
import { encodeToMp3 } from 'stream-chat-react/mp3-encoder'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  channelId?: string
  targetUserName?: string
  isCreatingChannel?: boolean
  error?: string | null
}

export function ChatModal({ isOpen, onClose, channelId, targetUserName, isCreatingChannel, error }: ChatModalProps) {
  const { data: session } = useSession()
  const { client, isConnecting, error: streamError } = useStreamChat()
  const [selectedChannel, setSelectedChannel] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sélectionner le channel spécifique si fourni
  useEffect(() => {
    if (client && channelId && isOpen) {
      const openSpecificChannel = async () => {
        try {
          console.log(`🔍 [CHAT] Ouverture channel spécifique: ${channelId}`)
          const channel = client.channel('messaging', channelId)
          await channel.watch()
          setSelectedChannel(channel)
        } catch (error) {
          console.error('❌ [CHAT] Erreur ouverture channel spécifique:', error)
        }
      }
      openSpecificChannel()
    } else if (!isOpen) {
      setSelectedChannel(null)
    }
  }, [client, channelId, isOpen])

  // Loading states
  if (isCreatingChannel) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-8 max-w-sm w-full text-center">
            <LoadingIndicator size={30} />
            <p className="mt-4">Ouverture du chat avec {targetUserName}...</p>
          </Dialog.Panel>
        </div>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-8 max-w-sm w-full text-center">
            <XMarkIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Erreur d'ouverture du chat
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {isConnecting || !client ? (
                  <div className="flex items-center justify-center p-8 h-96">
                    <div className="text-center">
                      <LoadingIndicator size={30} />
                      <p className="mt-4">Connexion au chat...</p>
                    </div>
                  </div>
                ) : streamError ? (
                  <div className="p-8 text-center">
                    <XMarkIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Erreur de connexion
                    </h3>
                    <p className="text-gray-500 mb-4">{streamError}</p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                ) : (
                  <div className="h-[80vh]">
                    <FileUploadValidator />
                    <Chat client={client}>
                      {isMobile ? (
                        /* Layout mobile sans redimensionnement */
                        <div className="flex h-full bg-white rounded-lg overflow-hidden">
                          <div className={`${selectedChannel ? 'hidden' : 'flex'} flex-col w-full`}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                              <h2 className="text-lg font-semibold text-gray-900">
                                {targetUserName ? `Chat avec ${targetUserName}` : 'Messages'}
                              </h2>
                              <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                              >
                                <XMarkIcon className="w-5 h-5 text-gray-600" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              {session?.user?.id && (
                                <ChannelListWithTabs
                                  userId={session.user.id}
                                  onChannelSelect={(channel: any) => setSelectedChannel(channel)}
                                />
                              )}
                            </div>
                          </div>
                          {selectedChannel && (
                            <div className="flex flex-1 flex-col">
                              <Channel channel={selectedChannel} Message={CustomMessage} Attachment={CustomAttachment} EmojiPicker={CustomEmojiPicker}>
                                <Window>
                                  <ChannelHeader />
                                  <MessageList messageActions={['edit', 'delete', 'flag', 'pin', 'markUnread', 'react']} />
                                  <MessageInput audioRecordingEnabled audioRecordingConfig={{ transcoderConfig: { encoder: encodeToMp3 } }} />
                                </Window>
                              </Channel>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Layout desktop avec panneaux redimensionnables */
                        <ResizablePanelGroup direction="horizontal" className="h-full bg-white rounded-lg overflow-hidden">
                          {/* Liste des conversations */}
                          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                            <div className="flex flex-col h-full border-r border-gray-200">
                              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900">
                                  {targetUserName ? `Chat avec ${targetUserName}` : 'Messages'}
                                </h2>
                                <button
                                  onClick={onClose}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                                </button>
                              </div>
                              <div className="flex-1 overflow-hidden">
                                {session?.user?.id && (
                                  <ChannelListWithTabs
                                    userId={session.user.id}
                                    onChannelSelect={(channel: any) => setSelectedChannel(channel)}
                                  />
                                )}
                              </div>
                            </div>
                          </ResizablePanel>

                          <ResizableHandle withHandle />

                          {/* Zone de conversation */}
                          <ResizablePanel defaultSize={70}>
                            <div className="flex flex-col h-full">
                              {selectedChannel ? (
                                <Channel channel={selectedChannel} Message={CustomMessage} Attachment={CustomAttachment} EmojiPicker={CustomEmojiPicker}>
                                  <Window>
                                    <ChannelHeader />
                                    <MessageList messageActions={['edit', 'delete', 'flag', 'pin', 'markUnread', 'react']} />
                                    <MessageInput audioRecordingEnabled audioRecordingConfig={{ transcoderConfig: { encoder: encodeToMp3 } }} />
                                  </Window>
                                </Channel>
                              ) : (
                                <div className="flex flex-1 items-center justify-center bg-gray-50">
                                  <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                      </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                      Sélectionnez une conversation
                                    </h3>
                                    <p className="text-gray-500">
                                      {targetUserName ?
                                        `Votre conversation avec ${targetUserName} va s'ouvrir` :
                                        'Choisissez une conversation dans la liste'
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      )}
                    </Chat>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}