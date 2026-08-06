import { useEffect } from 'react'

function ImagePreviewModal({ imageUrl, alt, onClose }) {
  useEffect(() => {
    if (!imageUrl) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageUrl, onClose])

  if (!imageUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#201d31]/85 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="relative flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] items-center justify-center sm:max-h-[calc(100vh-4rem)] sm:max-w-[calc(100vw-4rem)]" role="dialog" aria-modal="true" aria-label={alt || 'Vista completa de imagen'}>
        <img src={imageUrl} alt={alt} className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-xl object-contain sm:max-h-[calc(100vh-4rem)] sm:max-w-[calc(100vw-4rem)]" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#201d31]/80 text-2xl font-normal leading-none text-white transition hover:bg-[#201d31] focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Cerrar imagen completa"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default ImagePreviewModal
