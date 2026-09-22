/** Which edit actions a renderer right-click can offer. */

/** Fields the shell reads from Electron's context-menu event. */
export interface EditContextRequest {
  linkURL: string
  selectionText: string
  isEditable: boolean
  canCut: boolean
  canCopy: boolean
  canPaste: boolean
  canSelectAll: boolean
}

export type EditContextAction = 'open' | 'cut' | 'copy' | 'paste' | 'selectAll'

/**
 * Allow an http(s) address through to the system browser.
 * @param value - a candidate URL.
 * @returns the normalized URL, or `undefined` when it is not http(s).
 */
export function httpUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/**
 * Choose context-menu actions for one right-click.
 * @param request - link, selection, and edit flags from the renderer.
 * @returns actions in menu order. Empty when the click has nothing to do.
 */
export function editContextActions(request: EditContextRequest): EditContextAction[] {
  const actions: EditContextAction[] = []
  if (httpUrl(request.linkURL) !== undefined) actions.push('open')
  if (request.isEditable) {
    if (request.canCut) actions.push('cut')
    if (request.canCopy) actions.push('copy')
    if (request.canPaste) actions.push('paste')
    if (request.canSelectAll) actions.push('selectAll')
  } else if (request.selectionText.trim() !== '') {
    actions.push('copy')
  }
  return actions
}
