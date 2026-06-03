// Minimal declarations for the `qrcode` package (no @types published for the
// version in use). Only the surface actually consumed by the app is typed.
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    margin?: number
    scale?: number
    width?: number
    color?: { dark?: string; light?: string }
  }

  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  function toString(text: string, options?: { type?: string } & QRCodeToDataURLOptions): Promise<string>

  const QRCode: { toDataURL: typeof toDataURL; toString: typeof toString }
  export default QRCode
  export { toDataURL, toString }
}
