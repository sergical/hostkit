'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { cn } from '@/lib/utils'

interface QrCodeDisplayProps {
  /**
   * The path or full URL to encode in the QR code
   * If it starts with '/', it will be appended to window.location.origin
   * Otherwise, it will be used as-is (for external URLs)
   */
  to?: string
  /**
   * Size of the QR code in pixels
   * @default 256
   */
  size?: number
  /**
   * Additional CSS classes for the container
   */
  className?: string
  /**
   * Whether to show WiFi network information below the QR code
   * @default false
   */
  showNetworkInfo?: boolean
  /**
   * WiFi network name to display
   */
  networkName?: string
  /**
   * WiFi network password to display
   */
  networkPassword?: string
  /**
   * Custom loading skeleton (renders while URL is being generated)
   */
  loadingFallback?: React.ReactNode
}

export function QrCodeDisplay({
  to = '/',
  size = 256,
  className = '',
  showNetworkInfo = false,
  networkName = 'iPhone-Hotspot',
  networkPassword = 'demopass',
  loadingFallback,
}: QrCodeDisplayProps) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    // If the 'to' prop starts with '/', append it to the current origin
    // Otherwise, use it as-is (for external URLs)
    if (to.startsWith('/')) {
      const baseUrl = window.location.origin
      setUrl(`${baseUrl}${to}`)
    } else {
      setUrl(to)
    }
  }, [to])

  if (!url) {
    return (
      loadingFallback ?? (
        <div
          className="animate-pulse rounded-lg bg-white/20"
          style={{ width: size, height: size }}
        />
      )
    )
  }

  return (
    <div className={cn('rounded-lg bg-white p-4', className)}>
      <QRCode
        value={url}
        size={size}
        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
        viewBox={`0 0 ${size} ${size}`}
      />

      {showNetworkInfo && (
        <div className="mt-3 border-t border-gray-200 pt-2">
          <p className="text-center text-xs font-semibold text-black">
            Connect to Wi-Fi first:
          </p>
          <p className="text-center text-xs text-black">
            Network: {networkName}
          </p>
          <p className="text-center text-xs text-black">
            Password: {networkPassword}
          </p>
        </div>
      )}
    </div>
  )
}
