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

  interface QRCodeModules {
    size: number
    data: Uint8Array
  }

  function create(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): { modules: QRCodeModules }

  const QRCode: { toDataURL: typeof toDataURL; toString: typeof toString; create: typeof create }
  export default QRCode
  export { toDataURL, toString, create }
}
