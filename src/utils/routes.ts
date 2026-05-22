export function encodeVaultPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function noteRoute(path: string, anchor?: string): string {
  const hash = anchor ? `#${encodeURIComponent(anchor)}` : ''
  return `/note/${encodeVaultPath(path)}${hash}`
}

export function assetRoute(path: string): string {
  return `/api/assets/${encodeVaultPath(path)}`
}
