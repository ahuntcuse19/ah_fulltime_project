import { QRCodeSVG } from 'qrcode.react'

/**
 * The kiosk never asks for a transaction on the wall — the gift belongs on
 * the alum's phone. The QR encodes the deployed mobile page, tagged
 * kiosk_qr so attribution survives the surface hop.
 */
export function QrHandoff({ url, caption }: { url: string; caption: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center text-ink-900">
      <QRCodeSVG value={url} size={176} marginSize={1} className="mx-auto" />
      <p className="mt-4 text-sm font-semibold text-rust-900">{caption}</p>
      <p className="mt-1 break-all text-[10px] text-ink-300">{url}</p>
    </div>
  )
}
