import type { ReactNode } from 'react'
import { BANNER_ROW_IDS, benchRow, formatScore } from './benchmarks'
import type { LandingCopy } from './locales'
import { DownloadControl, SiteChrome } from './SiteChrome'
import { matrenaHref, type LandingLocale } from './paths'

export interface LandingPageProps {
  copy: LandingCopy
  downloadUrl: string
  locale: LandingLocale
}

/**
 * Codex-ordered Matreshka marketing page with a Matrena score banner.
 * @param props - locale copy, optional installer URL, active locale
 * @returns the home marketing document
 */
export function LandingPage({ copy, downloadUrl, locale }: LandingPageProps): ReactNode {
  return (
    <SiteChrome copy={copy} locale={locale} document="home">
      <section className="relative overflow-hidden px-4 pb-10 pt-16 text-center md:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,#c9d4f7_0%,#e7ebf8_42%,#f6f7fb_70%)]"
        />
        <div className="relative mx-auto max-w-3xl">
          <img
            src="/matreshka-logo.png"
            alt={copy.markAlt}
            width={88}
            height={88}
            className="hero-mark mx-auto mb-8 h-[88px] w-[88px] object-contain"
          />
          <h1 className="text-5xl font-medium tracking-tight md:text-7xl">{copy.title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#3d4450]">{copy.pitch}</p>
          <div className="mt-8">
            <DownloadControl copy={copy} downloadUrl={downloadUrl} />
          </div>
        </div>
      </section>

      <section id="matrena" className="bg-[#eef1f8]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="max-w-xl">
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{copy.bannerTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-[#3d4450]">{copy.bannerLead}</p>
          </div>
          <dl className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {BANNER_ROW_IDS.map(id => (
              <div key={id}>
                <dt className="text-sm text-[#5c6370]">{copy.rows[id]}</dt>
                <dd className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
                  {formatScore(benchRow(id).scores.matrena)}
                </dd>
              </div>
            ))}
          </dl>
          <a
            href={matrenaHref(locale)}
            className="mt-10 inline-block text-[15px] font-medium text-[#17181c] underline decoration-black/25 underline-offset-4 hover:decoration-black/60"
          >
            {copy.bannerMore}
          </a>
        </div>
      </section>

      <section id="product" className="px-4 pb-20">
        <AppShot src="/shots/hero-window.png" alt={copy.heroWindowAlt} wide />
      </section>

      <Feature
        id="work"
        title={copy.workTitle}
        body={copy.workBody}
        src="/shots/feature-work.png"
        alt={copy.workAlt}
        visual="right"
      />
      <Feature
        id="plugins"
        title={copy.pluginsTitle}
        body={copy.pluginsBody}
        src="/shots/feature-plugins.png"
        alt={copy.pluginsAlt}
        visual="left"
      />
      <Feature
        id="team"
        title={copy.teamTitle}
        body={copy.teamBody}
        src="/shots/feature-sessions.png"
        alt={copy.teamAlt}
        visual="right"
      />

      <section className="px-4 py-20 text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight md:text-5xl">{copy.everywhereTitle}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#3d4450]">{copy.everywhereBody}</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 md:grid-cols-3">
        <Card title={copy.cardDesktopTitle} body={copy.cardDesktopBody} src="/shots/hero-window.png" />
        <Card title={copy.cardPluginsTitle} body={copy.cardPluginsBody} src="/shots/feature-plugins.png" />
        <Card title={copy.cardMatrenaTitle} body={copy.cardMatrenaBody} src="/shots/feature-work.png" />
      </section>
    </SiteChrome>
  )
}

function AppShot(props: { src: string; alt: string; wide?: boolean }): ReactNode {
  return (
    <figure className={`mx-auto overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(18,20,26,0.12)] ${props.wide ? 'max-w-5xl' : ''}`}>
      <div className="flex h-10 items-center gap-2 border-b border-black/[0.06] bg-[#f3f4f8] px-4" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <img src={props.src} alt={props.alt} className="block w-full" />
    </figure>
  )
}

function Feature(props: {
  id: string
  title: string
  body: string
  src: string
  alt: string
  visual: 'left' | 'right'
}): ReactNode {
  const visual = <AppShot src={props.src} alt={props.alt} />
  const text = (
    <div className="max-w-md">
      <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{props.title}</h2>
      <p className="mt-4 text-base leading-relaxed text-[#3d4450]">{props.body}</p>
    </div>
  )
  return (
    <section id={props.id} className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
      {props.visual === 'left' ? <>{visual}{text}</> : <>{text}{visual}</>}
    </section>
  )
}

function Card(props: { title: string; body: string; src: string }): ReactNode {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(18,20,26,0.06)]">
      <div className="bg-[#eef1f8] p-3">
        <img src={props.src} alt="" className="aspect-[4/3] w-full rounded-xl object-cover object-top" />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-medium">{props.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#3d4450]">{props.body}</p>
      </div>
    </article>
  )
}
