import * as React from 'react'

// Onze eigen upload hook — gebruikt /api/documents/upload → Supabase Storage.
// Vervangt Plate's default UploadThing-gebaseerde versie.

export interface UploadedFile {
  key: string
  name: string
  size: number
  type: string
  url: string
}

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (error: unknown) => void
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>()
  const [uploadingFile, setUploadingFile] = React.useState<File>()
  const [progress, setProgress] = React.useState<number>(0)
  const [isUploading, setIsUploading] = React.useState(false)

  async function uploadFile(file: File) {
    setIsUploading(true)
    setUploadingFile(file)
    setProgress(10)

    try {
      const body = new FormData()
      body.append('file', file)

      setProgress(30)
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body,
      })

      setProgress(80)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Upload mislukt')
      }

      const uploaded: UploadedFile = {
        key: data.path as string,
        name: file.name,
        size: file.size,
        type: file.type,
        url: data.url as string,
      }

      setProgress(100)
      setUploadedFile(uploaded)
      onUploadComplete?.(uploaded)

      return uploaded
    } catch (error) {
      onUploadError?.(error)
      throw error
    } finally {
      setTimeout(() => {
        setProgress(0)
        setIsUploading(false)
        setUploadingFile(undefined)
      }, 300)
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  }
}

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return 'Er ging iets mis, probeer opnieuw.'
}
