"use client"

import { useState, memo, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { EmailContentProps } from '@/types/types'

export const EmailContent = memo(function EmailContent({ htmlContent, textContent }: EmailContentProps) {
  const [showHtml, setShowHtml] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize sanitization - expensive operation
  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return ''
    
    try {
      // Configure DOMPurify to be very strict for email content
      const cleanHtml = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: [
          'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'table', 'tr', 'td', 'th',
          'tbody', 'thead', 'tfoot', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class',
          'id', 'target', 'rel', 'colspan', 'rowspan'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_TAGS: [],
        ADD_ATTR: [],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'style'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false
      })

      // Additional safety: remove any remaining style attributes that could break layout
      const safeHtml = cleanHtml
        .replace(/style\s*=\s*["'][^"']*position\s*:\s*fixed[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*position\s*:\s*absolute[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*z-index\s*:\s*\d+[^"']*["']/gi, '')
        .replace(/style\s*=\s*["'][^"']*overflow\s*:\s*hidden[^"']*["']/gi, '')

      return safeHtml
    } catch {
      setError('Failed to process HTML content')
      setShowHtml(false)
      return ''
    }
  }, [htmlContent])

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
    <div className="email-content-container">
      {htmlContent && (
        <div className="mb-4 flex justify-center gap-2">
          <button
            onClick={() => setShowHtml(true)}
            className={`px-3 py-1 text-sm rounded ${
              showHtml 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            Rich View
          </button>
          <button
            onClick={() => setShowHtml(false)}
            className={`px-3 py-1 text-sm rounded ${
              !showHtml 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            Text View
          </button>
        </div>
      )}

      <div className="email-content-wrapper">
        {showHtml && htmlContent && sanitizedHtml ? (
          <div 
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="email-html-content"
          />
        ) : (
          <div className="email-text-content">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {textContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
})

EmailContent.displayName = 'EmailContent' 