import type { ReactNode } from 'react'
import {
  BANNER_ROW_IDS,
  BENCH_MODEL_IDS,
  BENCH_ROWS,
  benchRow,
  formatScore,
  rowLeaders,
  type BenchModelId,
} from './benchmarks'
import type { LandingCopy } from './locales'
import { homeHref, type LandingLocale } from './paths'
import { DownloadControl, SiteChrome } from './SiteChrome'

export interface MatrenaPageProps {
  copy: LandingCopy
  downloadUrl: string
  locale: LandingLocale
}

/**
 * Editorial Matrena evaluation page: public scores, then the comparison table.
 * @param props - locale copy, optional installer URL, active locale
 * @returns the Matrena marketing document
 */
export function MatrenaPage({ copy, downloadUrl, locale }: MatrenaPageProps): ReactNode {
  const notes: ReadonlyArray<{ title: string; body: string }> = [
    { title: copy.noteSweTitle, body: copy.noteSweBody },
    { title: copy.noteTbTitle, body: copy.noteTbBody },
    { title: copy.noteToolsTitle, body: copy.noteToolsBody },
    { title: copy.noteOsTitle, body: copy.noteOsBody },
    { title: copy.noteGpqaTitle, body: copy.noteGpqaBody },
  ]

  return (
    <SiteChrome copy={copy} locale={locale} document="matrena">
      <article>
        <header className="relative overflow-hidden px-4 pb-16 pt-16 md:pt-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_-20%,#d5def5_0%,#eef1f8_48%,#f6f7fb_74%)]"
          />
          <div className="relative mx-auto max-w-3xl">
            <img
              src="/matreshka-logo.png"
              alt=""
              width={56}
              height={56}
              className="mb-8 h-14 w-14 object-contain"
            />
            <h1 className="text-5xl font-medium tracking-tight md:text-7xl">{copy.pageTitle}</h1>
            <p className="mt-6 max-w-[40rem] text-lg leading-relaxed text-[#3d4450]">{copy.pageLede}</p>
          </div>
        </header>

        <section className="mx-auto max-w-6xl border-y border-black/[0.06] px-4 py-14">
          <dl className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {BANNER_ROW_IDS.map(id => (
              <div key={id}>
                <dt className="text-sm text-[#5c6370]">{copy.rows[id]}</dt>
                <dd className="mt-2 text-5xl font-medium tracking-tight md:text-6xl">
                  {formatScore(benchRow(id).scores.matrena)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-3xl text-3xl font-medium tracking-tight md:text-5xl">{copy.compareTitle}</h2>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-[#3d4450]">{copy.compareLead}</p>
          <BenchTable copy={copy} />
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-8">
          {notes.map(note => (
            <div key={note.title} className="border-t border-black/[0.06] py-10">
              <h3 className="text-xl font-medium tracking-tight">{note.title}</h3>
              <p className="mt-3 max-w-[40rem] text-base leading-relaxed text-[#3d4450]">{note.body}</p>
            </div>
          ))}
          <p className="border-t border-black/[0.06] py-10 text-base leading-relaxed text-[#3d4450]">{copy.emptyNote}</p>
          <p className="text-sm leading-relaxed text-[#5c6370]">{copy.footnote}</p>
        </section>

        <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-24 pt-8 sm:flex-row sm:items-center">
          <DownloadControl copy={copy} downloadUrl={downloadUrl} />
          <a
            href={homeHref(locale)}
            className="text-[15px] font-medium text-[#17181c] underline decoration-black/25 underline-offset-4 hover:decoration-black/60"
          >
            {copy.backHome}
          </a>
        </section>
      </article>
    </SiteChrome>
  )
}

function BenchTable(props: { copy: LandingCopy }): ReactNode {
  return (
    <div className="mt-12 overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-left text-[13px] md:text-sm">
        <caption className="sr-only">{props.copy.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className="pb-4 pr-4 font-medium text-[#5c6370]" />
            {BENCH_MODEL_IDS.map(id => (
              <th
                key={id}
                scope="col"
                className={`pb-4 pr-4 font-medium ${id === 'matrena' ? 'text-[#12141a]' : 'text-[#5c6370]'}`}
              >
                {props.copy.models[id]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BENCH_ROWS.map((row) => {
            const leaders = rowLeaders(row)
            return (
              <tr key={row.id} className="border-t border-black/[0.06]">
                <th scope="row" className="py-4 pr-4 font-medium text-[#12141a]">
                  {props.copy.rows[row.id]}
                </th>
                {BENCH_MODEL_IDS.map(id => (
                  <ScoreCell
                    key={id}
                    model={id}
                    value={formatScore(row.scores[id])}
                    lead={leaders.includes(id)}
                  />
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ScoreCell(props: { model: BenchModelId; value: string; lead: boolean }): ReactNode {
  const matrena = props.model === 'matrena'
  const color = props.value === '-'
    ? 'text-[#8b919c]'
    : props.lead
      ? 'text-[#12141a]'
      : 'text-[#3d4450]'
  return (
    <td className={`whitespace-nowrap py-4 pr-4 ${matrena ? 'bg-[#fbf4ee]' : ''} ${color}`}>
      <span className={props.lead ? 'font-semibold' : undefined}>{props.value}</span>
    </td>
  )
}
