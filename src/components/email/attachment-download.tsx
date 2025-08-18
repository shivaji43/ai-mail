"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmailAttachment } from '@/types/types'
import { Download, Loader2 } from 'lucide-react'

interface AttachmentDownloadProps {
  emailId: string
  attachment: EmailAttachment
  variant?: 'badge' | 'button'
}

export function AttachmentDownload({ emailId, attachment, variant = 'badge' }: AttachmentDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️'
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
    return '📎'
  }

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    try {
      const downloadUrl = `/api/emails/${emailId}/attachments/${attachment.attachmentId}?filename=${encodeURIComponent(attachment.filename)}&mimeType=${encodeURIComponent(attachment.mimeType)}`
      
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error('Failed to download attachment')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download attachment. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
        className="h-8 px-3"
      >
        {isDownloading ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Download className="h-3 w-3 mr-1" />
        )}
        <span className="truncate max-w-32">{attachment.filename}</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({formatFileSize(attachment.size)})
        </span>
      </Button>
    )
  }

  return (
    <Badge 
      variant="secondary" 
      className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors group relative"
      onClick={handleDownload}
    >
      <span className="mr-1">{getFileIcon(attachment.mimeType)}</span>
      <span className="truncate max-w-32">{attachment.filename}</span>
      <span className="text-xs text-muted-foreground ml-1">
        ({formatFileSize(attachment.size)})
      </span>
      {isDownloading ? (
        <Loader2 className="h-3 w-3 animate-spin ml-1" />
      ) : (
        <Download className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Badge>
  )
}
