'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChannelList } from 'stream-chat-react'
import type { ChannelSort, ChannelOptions } from 'stream-chat'
import { MessageSquare, Archive } from 'lucide-react'
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog'
import { CustomChannelPreview } from './CustomChannelPreview'

interface ChannelListWithTabsProps {
  userId: string
  onChannelSelect?: (channel: any) => void
}

export function ChannelListWithTabs({ userId, onChannelSelect }: ChannelListWithTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [pendingArchiveChannel, setPendingArchiveChannel] = useState<any>(null)
  const [pendingArchiveUserName, setPendingArchiveUserName] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtres selon l'onglet actif - archived: false pour exclure les archivées
  const filters = useMemo(() => ({
    type: 'messaging' as const,
    members: { $in: [userId] },
    archived: activeTab === 'archived'
  }), [userId, activeTab])

  const sort: ChannelSort = activeTab === 'active'
    ? { pinned_at: -1, last_message_at: -1 }
    : { last_message_at: -1 }
  const options: ChannelOptions = { presence: true, watch: true, limit: 30 }

  // Intercepter l'archivage
  const handleArchiveClick = useCallback((channel: any, userName: string) => {
    setPendingArchiveChannel(channel)
    setPendingArchiveUserName(userName)
    setShowArchiveConfirm(true)
  }, [])

  // Confirmer l'archivage
  const confirmArchive = useCallback(async () => {
    if (pendingArchiveChannel) {
      try {
        await pendingArchiveChannel.archive()
        // Forcer le rafraîchissement de la liste
        setRefreshKey(prev => prev + 1)
      } catch (error) {
        console.error('Erreur archivage:', error)
      }
    }
    setPendingArchiveChannel(null)
    setPendingArchiveUserName('')
  }, [pendingArchiveChannel])

  // Composant vide pour les archivées
  const EmptyArchivedState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
      <Archive className="w-12 h-12 mb-3 text-gray-300" />
      <p className="text-center">Aucune conversation archivée</p>
      <p className="text-sm text-gray-400 text-center mt-1">
        Les conversations archivées apparaîtront ici
      </p>
    </div>
  )

  // Composant vide pour les conversations actives
  const EmptyActiveState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
      <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
      <p className="text-center">Aucune conversation</p>
      <p className="text-sm text-gray-400 text-center mt-1">
        Commencez à matcher pour discuter !
      </p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Onglets */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'text-pink-600 border-b-2 border-pink-500 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Conversations
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'archived'
              ? 'text-pink-600 border-b-2 border-pink-500 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Archive className="w-4 h-4" />
          Archivées
        </button>
      </div>

      {/* Liste des channels */}
      <div className="flex-1 overflow-hidden">
        <ChannelList
          key={`${activeTab}-${refreshKey}`}
          filters={filters}
          sort={sort}
          options={options}
          Preview={(props) => (
            <CustomChannelPreview
              {...props}
              onArchiveClick={handleArchiveClick}
              onUnarchive={() => setRefreshKey(prev => prev + 1)}
              isArchived={activeTab === 'archived'}
              setActiveChannel={onChannelSelect || props.setActiveChannel}
            />
          )}
          EmptyStateIndicator={activeTab === 'archived' ? EmptyArchivedState : EmptyActiveState}
        />
      </div>

      {/* Dialog de confirmation */}
      <ArchiveConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => {
          setShowArchiveConfirm(false)
          setPendingArchiveChannel(null)
          setPendingArchiveUserName('')
        }}
        onConfirm={confirmArchive}
        userName={pendingArchiveUserName}
      />
    </div>
  )
}
