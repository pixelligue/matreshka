/**
 * Sidebar-foot profile. Clicking it opens the account menu.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconSettingsOutline16, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ModelsOperations } from './operations.ts'
import { performSignOut, readSessionEmail, SESSION_EVENT } from './session.ts'
import css from './ProfileFooter.module.css'

/** Settings shell listens and opens its dialog. */
const OPEN_SETTINGS_EVENT = 'matreshka:open-settings'

/** Public URL of the nesting-doll mark used as the profile avatar. */
const AVATAR_SRC = '/matreshka-logo.png'

function SignOutGlyph(): ReactNode {
  return (
    <svg className={css.glyph} width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.5 3.5H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5M8 8h6m-2-2.5L14.5 8 12 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Injected session revoke dependencies. */
export interface ProfileFooterInjected {
  /** Host credential writes. */
  operations: ModelsOperations
  /** Matreshka API origin, without a trailing slash. */
  apiOrigin: string
  /** Reload after the credential is cleared. */
  reload: () => void
}

/** Slot props for the sidebar-foot profile action. */
export type ProfileFooterProps =
  PropsRuntime<'sidebar.footer.action'> & PropsLocale<'settings.models'> & ProfileFooterInjected

/**
 * Render the profile row above Settings.
 * @param props - sidebar width, locale, and session operations.
 * @returns the footer action.
 */
export function ProfileFooter(props: ProfileFooterProps): ReactNode {
  const { wide, t, operations, apiOrigin, reload } = props
  const [email, setEmail] = useState(readSessionEmail)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [box, setBox] = useState<{ left: number; bottom: number; width: number } | null>(null)
  useEffect(() => {
    const sync = (): void => { setEmail(readSessionEmail()) }
    window.addEventListener(SESSION_EVENT, sync)
    return () => { window.removeEventListener(SESSION_EVENT, sync) }
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: MouseEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-profile-menu]')) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open])
  const label = email.length > 0 ? email : t('profile')
  const placeMenu = (): void => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect === undefined) return
    setBox({ left: rect.left, bottom: window.innerHeight - rect.top + 8, width: Math.max(rect.width, 240) })
  }
  const toggle = (): void => {
    if (open) {
      setOpen(false)
      return
    }
    placeMenu()
    setOpen(true)
  }
  const closeAnd = (run: () => void): void => {
    setOpen(false)
    run()
  }
  const onSignOut = (): void => {
    if (busy) return
    setBusy(true)
    setOpen(false)
    void performSignOut({ operations, apiOrigin, reload })
  }

  const avatar = (
    <img
      className={css.avatar}
      src={AVATAR_SRC}
      width={24}
      height={24}
      alt=""
      aria-hidden="true"
    />
  )

  const menu = open && box !== null ? createPortal(
    <div
      className={css.menu}
      data-profile-menu
      role="menu"
      aria-label={t('profileMenu')}
      style={{ left: box.left, bottom: box.bottom, width: box.width }}
    >
      <button
        type="button"
        role="menuitem"
        className={css.menuItem}
        onClick={() => { closeAnd(() => { window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT)) }) }}
      >
        <IconSettingsOutline16 size={16} />
        <span>{t('profileSettings')}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className={css.menuItem}
        disabled={busy}
        onClick={onSignOut}
      >
        <SignOutGlyph />
        <span>{busy ? t('signOutBusy') : t('signOut')}</span>
      </button>
    </div>,
    document.body,
  ) : null

  const trigger = (
    <button
      ref={buttonRef}
      type="button"
      className={wide ? css.row : css.rail}
      aria-label={t('profileMenu')}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={toggle}
    >
      {avatar}
      {wide && (
        <div className={css.meta}>
          <div className={css.email} title={label}>{label}</div>
        </div>
      )}
    </button>
  )

  if (!wide) {
    return (
      <>
        <Tooltip label={label} delayMs={500}>
          {trigger}
        </Tooltip>
        {menu}
      </>
    )
  }

  return (
    <>
      {trigger}
      {menu}
    </>
  )
}
