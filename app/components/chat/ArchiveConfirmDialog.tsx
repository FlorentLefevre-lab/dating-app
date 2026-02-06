'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Archive } from 'lucide-react'

interface ArchiveConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName?: string
}

export function ArchiveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  userName
}: ArchiveConfirmDialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Archive className="w-6 h-6 text-orange-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                    Archiver la conversation
                  </Dialog.Title>
                </div>

                <p className="text-gray-600 mb-6">
                  {userName ? (
                    <>Voulez-vous archiver votre conversation avec <strong>{userName}</strong> ?</>
                  ) : (
                    <>Voulez-vous archiver cette conversation ?</>
                  )}
                  <br />
                  <span className="text-sm text-gray-500 mt-2 block">
                    La conversation sera masquée mais pas supprimée. Vous pourrez la retrouver dans l'onglet "Archivées".
                  </span>
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                    onClick={() => {
                      onConfirm()
                      onClose()
                    }}
                  >
                    Archiver
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
