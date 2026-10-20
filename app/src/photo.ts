// Shrinks a camera photo and burns in the stamp (school, room, date, serial),
// so the record holds even if the file is later copied out of J2.

const MAX_SIDE = 1600
const QUALITY = 0.72

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the photo'))
    }
    img.src = url
  })
}

export async function stampPhoto(file: File, lines: [string, string]): Promise<string> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not stamp the photo')
  ctx.drawImage(img, 0, 0, w, h)

  // Same look as the design: navy box along the bottom, monospace text.
  const font = Math.max(14, Math.round(w / 42))
  const pad = Math.round(font * 0.7)
  const lineH = Math.round(font * 1.45)
  const boxH = pad * 2 + lineH * 2
  const inset = Math.round(font * 0.8)
  ctx.fillStyle = 'rgba(11,44,71,0.88)'
  ctx.beginPath()
  ctx.roundRect(inset, h - inset - boxH, w - inset * 2, boxH, Math.round(font * 0.5))
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `${font}px ui-monospace, Menlo, monospace`
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => ctx.fillText(line, inset + pad, h - inset - boxH + pad + i * lineH, w - inset * 2 - pad * 2))

  return canvas.toDataURL('image/jpeg', QUALITY)
}
