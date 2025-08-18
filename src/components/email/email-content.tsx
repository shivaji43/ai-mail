"use client"

import { useState, memo, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { EmailContentProps } from '@/types/types'

export const EmailContent = memo(function EmailContent({ htmlContent, textContent, emailId }: EmailContentProps) {
  const [showHtml, setShowHtml] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)


  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return ''
    
                try {
              let processedHtml = htmlContent
              if (emailId) {
                processedHtml = htmlContent.replace(/cid:([^"'\s>]+)/g, (match, contentId) => {
                  return `/api/emails/${emailId}/inline/${encodeURIComponent(contentId)}`
                })
              }
      const cleanHtml = DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'table', 'tr', 'td', 'th',
          'tbody', 'thead', 'tfoot', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
          'center', 'font', 'small', 'big', 'hr'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class',
          'id', 'target', 'rel', 'colspan', 'rowspan', 'align', 'valign', 'border',
          'cellpadding', 'cellspacing', 'color', 'face', 'size'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|data|\/):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_TAGS: [],
        ADD_ATTR: [],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false
      })

      const safeHtml = cleanHtml
        .replace(/style\s*=\s*["'][^"']*position\s*:\s*(fixed|absolute)[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*z-index\s*:\s*\d+[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*margin\s*:\s*[^;"']*[1-9]\d{2,}[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*padding\s*:\s*[^;"']*[1-9]\d{2,}[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*font-size\s*:\s*[^;"']*[2-9]\d+[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*font-family\s*:\s*[^;"']*comic\s*sans[^"']*["']/gi, '')
        .replace(/<table([^>]*)>/gi, '<table$1 class="email-table">')
                  .replace(/<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
            if (src.startsWith('cid:')) {
              const contentId = src.replace('cid:', '')
              return `<img${before}src="/api/emails/${emailId}/inline/${encodeURIComponent(contentId)}"${after} class="email-image" loading="lazy" onerror="this.style.display='none'">`
            } else if (src.startsWith('data:')) {
              return `<img${before}src="${src}"${after} class="email-image" loading="lazy">`
            } else if (src.startsWith('http')) {
              return `<img${before}src="${src}"${after} class="email-image" loading="lazy" onerror="this.style.display='none'" referrerpolicy="no-referrer">`
            }
            return match
                    })
          .replace(/<p\s*>\s*<\/p>/gi, '')
          .replace(/<div\s*>\s*<\/div>/gi, '')
          .replace(/<span\s*>\s*<\/span>/gi, '')
          .replace(/&nbsp;{3,}/g, ' ')
          .replace(/\s{3,}/g, ' ')
          .replace(/<\/p>\s*<p/gi, '</p><p class="email-paragraph"')
          .replace(/<p([^>]*)>/gi, '<p$1 class="email-paragraph">')
          .replace(/<div([^>]*?)>([^<]*?)<\/div>/gi, '<p$1 class="email-paragraph">$2</p>')
          .replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
          
        const hasImages = /(<img|\.email-image)/i.test(safeHtml)
        const hasTables = /(<table|\.email-table)/i.test(safeHtml)
        const hasComplexHtml = /<(?:div|h[1-6]|ul|ol|blockquote|span[^>]*style)/i.test(safeHtml)
        const isSimpleText = !hasImages && !hasTables && !hasComplexHtml
        
        let containerStyle = ''
        let containerClass = 'email-content-container'
        
        if (isSimpleText) {
          containerStyle = 'style="max-width: 100%; width: 100%;"'
          containerClass = 'email-content-container text-email'
        } else {
          containerStyle = 'style="max-width: 100%; width: 100%;"'
          containerClass = 'email-content-container html-email'
        }
        
        const containerizedHtml = `<div class="${containerClass}" ${containerStyle}>${safeHtml}</div>`

        return containerizedHtml
    } catch {
      setError('Failed to process HTML content')
      setShowHtml(false)
      return ''
    }
  }, [htmlContent, emailId])

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
        <p className="text-yellow-800 text-sm mb-2">⚠️ HTML content could not be displayed safely</p>
        <button 
          onClick={() => setShowHtml(false)}
          className="text-primary hover:text-primary/80 text-sm underline"
        >
          Show text version instead
        </button>
      </div>
    )
  }

        return (
    <div className="email-content-container w-full">
      {htmlContent && (
        <div className="mb-3 flex justify-center gap-2">
          <button
            onClick={() => setShowHtml(true)}
            className={`px-2 py-1 text-xs rounded ${
              showHtml 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            Rich View
          </button>
          <button
            onClick={() => setShowHtml(false)}
            className={`px-2 py-1 text-xs rounded ${
              !showHtml 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            Text View
          </button>
        </div>
      )}

      <div className="email-content-wrapper w-full overflow-hidden">
        {showHtml && htmlContent && sanitizedHtml ? (
          <div 
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="email-html-content w-full max-w-full overflow-hidden
              [&>*]:max-w-full [&>*]:w-full [&>*]:box-border
              [&_table]:w-full [&_table]:max-w-full [&_table]:table-auto
              [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto [&_img]:block
              [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
              [&_div]:text-sm [&_div]:leading-relaxed
              [&_table]:border-collapse [&_td]:p-1 [&_td]:text-sm [&_th]:p-1 [&_th]:text-sm
              [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-sm
              [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:text-xs
              [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
              [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_a]:text-sm
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3
              [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-2
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
              [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-0.5 [&_ul]:text-sm
              [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-0.5 [&_ol]:text-sm
              [&_li]:leading-relaxed [&_li]:text-sm
              text-gray-800 text-sm leading-relaxed break-words"
          />
        ) : (
          <div className="email-text-content w-full">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed break-words w-full overflow-hidden">
              {textContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
})

EmailContent.displayName = 'EmailContent' 