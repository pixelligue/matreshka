(() => {
  'use strict'

  const byId = (id) => document.getElementById(id)
  const loginPanel = byId('login-panel')
  const loginForm = byId('login-form')
  const loginError = byId('login-error')
  const report = byId('report')
  const reportError = byId('report-error')
  const signOut = byId('sign-out')
  const days = byId('days')
  const number = new Intl.NumberFormat('ru-RU')
  const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 9 })
  let token = ''

  function text(tag, value, className) {
    const element = document.createElement(tag)
    element.textContent = value
    if (className) element.className = className
    return element
  }

  function amount(nanos, currency) {
    if (nanos === null) return '—'
    return `${money.format(nanos / 1_000_000_000)} ${currency === 'RUB' ? '₽' : '$'}`
  }

  function sourceName(source) {
    if (source === 'reported') return 'Списано'
    if (source === 'rate_estimate') return 'Оценка'
    return 'Неизвестно'
  }

  function operationName(operation) {
    return ({ chat: 'Матрёшка', consult: 'Консультант', select_tool: 'Выбор инструмента', web_search: 'Веб поиск' })[operation] || operation
  }

  function totals(rows) {
    const result = { RUB: { reported: null, rate_estimate: null }, USD: { reported: null, rate_estimate: null }, unknown: 0 }
    for (const row of rows) {
      if (row.amount_nanos === null || !result[row.currency] || !Object.hasOwn(result[row.currency], row.amount_source)) {
        result.unknown += row.requests
        continue
      }
      result[row.currency][row.amount_source] = (result[row.currency][row.amount_source] ?? 0) + row.amount_nanos
    }
    return result
  }

  function renderSummary(rows) {
    const values = totals(rows)
    const target = byId('summary')
    target.replaceChildren()
    for (const [currency, source, label] of [
      ['RUB', 'reported', 'Подтверждено · RUB'],
      ['RUB', 'rate_estimate', 'Оценка · RUB'],
      ['USD', 'reported', 'Подтверждено · USD'],
      ['USD', 'rate_estimate', 'Оценка · USD'],
    ]) {
      const card = text('div', '', `metric ${source === 'rate_estimate' ? 'estimate' : ''}`)
      card.append(text('span', label, 'unit'), text('strong', amount(values[currency][source], currency)))
      target.append(card)
    }
    const unknown = text('div', '', 'metric')
    unknown.append(text('span', 'Без цены', 'unit'), text('strong', number.format(values.unknown)), text('span', 'вызовов'))
    target.append(unknown)
  }

  function renderDaily(rows) {
    const target = byId('daily')
    target.replaceChildren()
    for (const currency of ['RUB', 'USD']) {
      const panel = text('div', '', 'currency-panel')
      panel.append(text('h4', currency === 'RUB' ? 'Рубли' : 'Доллары'))
      const byDay = new Map()
      for (const row of rows) {
        if (row.currency !== currency || row.amount_nanos === null) continue
        const entry = byDay.get(row.day) || { reported: null, rate_estimate: null }
        if (row.amount_source === 'reported' || row.amount_source === 'rate_estimate') {
          entry[row.amount_source] = (entry[row.amount_source] ?? 0) + row.amount_nanos
          byDay.set(row.day, entry)
        }
      }
      if (byDay.size === 0) panel.append(text('p', 'Пока нет расходов с известной суммой.', 'empty'))
      const entries = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      const maximum = Math.max(1, ...entries.flatMap(([, item]) => [item.reported ?? 0, item.rate_estimate ?? 0]))
      for (const [day, item] of entries) {
        for (const source of ['reported', 'rate_estimate']) {
          const value = item[source]
          if (value === null) continue
          const line = text('div', '', 'day-row')
          const dateLabel = text('time', `${day.slice(5)} · ${sourceName(source)}`)
          dateLabel.dateTime = day
          const bar = text('div', '', 'day-bar')
          const fill = text('span', '', source === 'reported' ? 'bar-reported' : 'bar-estimate')
          fill.style.width = `${100 * value / maximum}%`
          bar.append(fill)
          line.append(dateLabel, bar, text('span', amount(value, currency), 'day-amount'))
          panel.append(line)
        }
      }
      target.append(panel)
    }
  }

  function renderOperations(rows) {
    const target = byId('operations')
    target.replaceChildren()
    const grouped = new Map()
    for (const row of rows) {
      const key = [row.operation, row.provider, row.model, row.currency, row.amount_source].join('|')
      const item = grouped.get(key) || { ...row, requests: 0, input_tokens: 0, output_tokens: 0, amount_nanos: row.amount_nanos === null ? null : 0 }
      item.requests += row.requests
      item.input_tokens += row.input_tokens
      item.output_tokens += row.output_tokens
      if (item.amount_nanos !== null && row.amount_nanos !== null) item.amount_nanos += row.amount_nanos
      grouped.set(key, item)
    }
    const items = [...grouped.values()].sort((a, b) =>
      String(a.currency || 'ZZZ').localeCompare(String(b.currency || 'ZZZ'))
      || (b.amount_nanos ?? -1) - (a.amount_nanos ?? -1))
    if (items.length === 0) {
      const cell = text('td', 'Новых обращений за этот период пока нет.', 'empty')
      cell.colSpan = 5
      const line = document.createElement('tr')
      line.append(cell)
      target.append(line)
      return
    }
    for (const item of items) {
      const line = document.createElement('tr')
      const first = document.createElement('td')
      first.append(text('span', operationName(item.operation), 'operation-name'), text('span', `${item.provider}${item.model ? ` · ${item.model}` : ''}`, 'secondary'))
      const source = document.createElement('td')
      source.append(text('span', sourceName(item.amount_source), `source ${item.amount_source === 'rate_estimate' ? 'estimate' : item.amount_source ? '' : 'unknown'}`))
      line.append(first, source, text('td', number.format(item.requests), 'numeric'), text('td', number.format(item.input_tokens + item.output_tokens), 'numeric'), text('td', amount(item.amount_nanos, item.currency), 'numeric'))
      target.append(line)
    }
  }

  async function loadReport() {
    reportError.hidden = true
    byId('refresh').disabled = true
    try {
      const response = await fetch(`/v1/usage/report?days=${encodeURIComponent(days.value)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (response.status === 401) {
        token = ''
        report.hidden = true
        signOut.hidden = true
        loginPanel.hidden = false
        loginError.textContent = 'Сессия закончилась. Войдите снова.'
        loginError.hidden = false
        return
      }
      if (!response.ok) throw new Error('report unavailable')
      const data = await response.json()
      byId('period-label').textContent = `${data.from_day} — ${data.through_day} · UTC`
      renderSummary(data.rows)
      renderDaily(data.rows)
      renderOperations(data.rows)
    } catch {
      reportError.textContent = 'Не удалось загрузить расходы. Проверьте, что API и база данных работают, затем обновите отчёт.'
      reportError.hidden = false
    } finally {
      byId('refresh').disabled = false
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    loginError.hidden = true
    const button = loginForm.querySelector('button')
    button.disabled = true
    try {
      const response = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: byId('email').value, password: byId('password').value }),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('login failed')
      const data = await response.json()
      token = data.token
      byId('password').value = ''
      loginPanel.hidden = true
      report.hidden = false
      signOut.hidden = false
      await loadReport()
    } catch {
      loginError.textContent = 'Не удалось войти. Проверьте почту, пароль и доступность API.'
      loginError.hidden = false
    } finally {
      button.disabled = false
    }
  })

  signOut.addEventListener('click', () => {
    const oldToken = token
    token = ''
    void fetch('/v1/auth/logout', {
      method: 'POST', headers: { Authorization: `Bearer ${oldToken}` }, cache: 'no-store',
    }).catch(() => {})
    report.hidden = true
    signOut.hidden = true
    loginPanel.hidden = false
    byId('summary').replaceChildren()
    byId('daily').replaceChildren()
    byId('operations').replaceChildren()
  })
  days.addEventListener('change', () => { if (token) void loadReport() })
  byId('refresh').addEventListener('click', () => { if (token) void loadReport() })
})()
