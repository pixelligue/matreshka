import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** Public URL of the Matreshka nesting-doll PNG. */
const MATRESHKA_LOGO_SRC = '/matreshka-logo.png'

/** Product wordmark; identical in every locale. */
const PRODUCT_NAME = 'Matreshka'

/**
 * Render the Matreshka nesting-doll mark.
 * @param props - Host-supplied mark presentation.
 * @returns the Matreshka mark.
 */
export function OfficialBrandMark({ size, className }: SidebarBrandMarkOwnerProps & { className?: string | undefined }) {
  return (
    <img
      src={MATRESHKA_LOGO_SRC}
      width={size}
      height={size}
      className={className}
      alt=""
      aria-hidden="true"
      data-matreshka-logo-slot=""
    />
  )
}

/**
 * Render the Matreshka product name.
 * @returns the product name.
 */
export function OfficialBrandName() {
  return <span data-matreshka-brand-name="">{PRODUCT_NAME}</span>
}
