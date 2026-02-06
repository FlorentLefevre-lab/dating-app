'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface FileUploadValidatorProps {
  containerSelector?: string
}

export function FileUploadValidator({ containerSelector = '.str-chat' }: FileUploadValidatorProps) {
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const lastErrorTimeRef = useRef<number>(0)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    // Fonction pour détecter les notifications d'erreur d'upload
    const checkForUploadErrors = () => {
      // Éviter les doublons (debounce de 500ms)
      const now = Date.now()
      if (now - lastErrorTimeRef.current < 500) return

      // Chercher dans tout le document
      const allElements = document.querySelectorAll('*')
      allElements.forEach((el) => {
        const text = el.textContent?.toLowerCase() || ''
        const htmlEl = el as HTMLElement

        // Détecter le message d'erreur Stream Chat
        if (
          (text.includes('bloqué') && text.includes('limite')) ||
          (text.includes('blocked') && text.includes('size')) ||
          (text.includes('téléchargement') && text.includes('bloqué'))
        ) {
          // Vérifier que c'est un élément de notification (pas un parent large)
          if (htmlEl.innerText && htmlEl.innerText.length < 200) {
            // Afficher notre propre message
            lastErrorTimeRef.current = now
            setError('Le fichier dépasse la taille maximale autorisée.')
          }
        }
      })

      // Masquer les previews d'attachment en erreur (uniquement les erreurs d'upload)
      document.querySelectorAll('.str-chat__attachment-preview-error').forEach((errorBtn) => {
        const previewContainer = errorBtn.closest('.str-chat__attachment-preview-file, .str-chat__attachment-preview-image, .str-chat__attachment-preview')
        if (previewContainer) {
          (previewContainer as HTMLElement).style.display = 'none'
        }
      })
    }

    // Observer tout le document pour les nouvelles notifications
    observerRef.current = new MutationObserver(() => {
      // Petit délai pour laisser Stream Chat afficher la notification
      setTimeout(checkForUploadErrors, 50)
    })

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  if (!error) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100001] max-w-md w-full mx-4 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-red-50 border border-red-300 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-red-800 font-semibold text-sm">
              Échec de l'envoi
            </h3>
            <p className="text-red-700 text-sm mt-1 whitespace-pre-line">
              {error}
            </p>
            <div className="text-xs mt-3 p-2 bg-red-100 rounded border border-red-200">
              <p className="text-red-700 font-medium mb-1">Limites autorisées :</p>
              <ul className="text-red-600 space-y-0.5">
                <li>• Images (jpg, png, gif...) : <strong>2 Mo max</strong></li>
                <li>• Autres fichiers (audio, vidéo, pdf...) : <strong>5 Mo max</strong></li>
              </ul>
            </div>
            <p className="text-red-400 text-xs mt-2 italic text-center">
              Cliquez sur × pour fermer
            </p>
          </div>
          <button
            onClick={clearError}
            className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
