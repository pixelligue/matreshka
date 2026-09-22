import type { BenchModelId, BenchRowId } from './benchmarks'

/** Visitor-visible landing copy. Keys are shared across Russian and English. */
export interface LandingCopy {
  title: string
  pitch: string
  downloadWindows: string
  navProduct: string
  navPlugins: string
  langEn: string
  langRu: string
  heroWindowAlt: string
  workTitle: string
  workBody: string
  workAlt: string
  pluginsTitle: string
  pluginsBody: string
  pluginsAlt: string
  teamTitle: string
  teamBody: string
  teamAlt: string
  everywhereTitle: string
  everywhereBody: string
  cardDesktopTitle: string
  cardDesktopBody: string
  cardPluginsTitle: string
  cardPluginsBody: string
  cardMatrenaTitle: string
  cardMatrenaBody: string
  footer: string
  markAlt: string
  navMatrena: string
  bannerTitle: string
  bannerLead: string
  bannerMore: string
  pageTitle: string
  pageLede: string
  pageMetaTitle: string
  pageMetaDescription: string
  compareTitle: string
  compareLead: string
  tableCaption: string
  noteSweTitle: string
  noteSweBody: string
  noteTbTitle: string
  noteTbBody: string
  noteToolsTitle: string
  noteToolsBody: string
  noteOsTitle: string
  noteOsBody: string
  noteGpqaTitle: string
  noteGpqaBody: string
  emptyNote: string
  footnote: string
  backHome: string
  navSignIn: string
  authLoginTitle: string
  authRegisterTitle: string
  authEmail: string
  authPassword: string
  authSubmitLogin: string
  authSubmitRegister: string
  authSubmitting: string
  authInvalid: string
  authNetwork: string
  authExists: string
  authSwitchToRegister: string
  authSwitchToLogin: string
  authHandoff: string
  authSignedIn: string
  authSignOut: string
  authOpenDesktop: string
  models: Record<BenchModelId, string>
  rows: Record<BenchRowId, string>
}

export const ru: LandingCopy = {
  title: 'Matreshka',
  pitch: 'Скажите, что нужно сделать. Matrena разберётся.',
  downloadWindows: 'Скачать для Windows',
  navProduct: 'Возможности',
  navPlugins: 'Плагины',
  langEn: 'EN',
  langRu: 'RU',
  heroWindowAlt: 'Окно Matreshka с ответом Matrena',
  workTitle: 'Пишет, ищет, доводит до результата',
  workBody: 'Попросите составить письмо, подобрать формулировку или найти информацию. Matrena отвечает по делу и не бросает задачу на середине.',
  workAlt: 'Чат с готовым текстом от Matrena',
  pluginsTitle: 'Подключает сервисы, когда они нужны',
  pluginsBody: 'Нужная программа включается в боковой панели. Доступы хранятся у нас, не на вашем компьютере.',
  pluginsAlt: 'Панель плагинов Matreshka',
  teamTitle: 'Несколько разговоров, один помощник',
  teamBody: 'Можно вести разные темы параллельно, возвращаться к ним и продолжать с того места, где остановились.',
  teamAlt: 'Список разговоров в Matreshka',
  everywhereTitle: 'На компьютере, под рукой',
  everywhereBody: 'Matreshka ставится как обычная программа для Windows. Открыли, написали, получили ответ.',
  cardDesktopTitle: 'Для Windows',
  cardDesktopBody: 'Приложение на рабочем столе. Без браузера и без лишних вкладок.',
  cardPluginsTitle: 'Плагины',
  cardPluginsBody: 'Подключайте нужные сервисы в боковой панели.',
  cardMatrenaTitle: 'Matrena',
  cardMatrenaBody: 'Отвечает в чате и помогает закончить начатое.',
  footer: 'Matreshka',
  markAlt: 'Matreshka',
  navMatrena: 'Matrena',
  bannerTitle: 'Matrena',
  bannerLead: 'Цифры с открытых досок. Рядом Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Алиса и GPT-5.6.',
  bannerMore: 'Смотреть сравнение',
  pageTitle: 'Matrena',
  pageLede: 'Matrena отвечает в Matreshka. Ниже её цифры на открытых досках рядом с Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Алисой и GPT-5.6.',
  pageMetaTitle: 'Matrena',
  pageMetaDescription: 'Публичные цифры Matrena рядом с Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Алисой и GPT-5.6.',
  compareTitle: 'Рядом с другими моделями',
  compareLead: 'В каждой строке выделен лучший результат. Matrena не первая везде: Opus 5 выше в SWE-bench Verified и OSWorld, Gemini 3.8 Flash выше в GPQA Diamond.',
  tableCaption: 'Сравнение Matrena с Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Алисой и GPT-5.6',
  noteSweTitle: 'SWE-bench Verified',
  noteSweBody: 'Задача из описания до готового изменения. У Matrena 79.0%. Рядом Gemini 3.8 Flash с 80.0%. Opus 5 здесь 96.0%.',
  noteTbTitle: 'Terminal-bench',
  noteTbBody: 'Работа в командной строке. 89.0% на версии 2.0 и 91.4% на 2.1. GPT-5.6 на 2.0 чуть выше: 91.9%.',
  noteToolsTitle: 'Инструменты',
  noteToolsBody: 'τ2 Telecom 95.0%. Из этого ряда вторую цифру публикует GigaChat 3.5: 68.7%. MCP Atlas 72.0% есть только у Matrena.',
  noteOsTitle: 'OSWorld',
  noteOsBody: 'Работа за компьютером. 61.0% у Matrena. Это выше Gemini 3.8 Flash (59.0%) и ниже Opus 5 (75.4%).',
  noteGpqaTitle: 'GPQA Diamond',
  noteGpqaBody: 'Сложные вопросы. 88.1% у Matrena. Здесь впереди Gemini 3.8 Flash (95.3%) и GPT-5.6 (94.6%).',
  emptyNote: 'По ARC-AGI-2, MMMU и MMMLU в этой таблице нет публикаций ни у одной сравниваемой модели.',
  footnote: 'Цифры Matrena: наши прогоны. Чужие цифры: последние публичные отчёты этих моделей. Дефис значит, что публикации нет.',
  backHome: 'На главную',
  navSignIn: 'Войти',
  authLoginTitle: 'Вход в Matreshka',
  authRegisterTitle: 'Регистрация в Matreshka',
  authEmail: 'Эл. почта',
  authPassword: 'Пароль',
  authSubmitLogin: 'Войти',
  authSubmitRegister: 'Создать аккаунт',
  authSubmitting: 'Подождите…',
  authInvalid: 'Неверная почта или пароль.',
  authNetwork: 'Не удалось связаться с Matreshka. Проверьте, что API запущен.',
  authExists: 'Этот адрес уже зарегистрирован. Войдите.',
  authSwitchToRegister: 'Нет аккаунта? Зарегистрироваться',
  authSwitchToLogin: 'Уже есть аккаунт? Войти',
  authHandoff: 'Открываем Matreshka…',
  authSignedIn: 'Вы вошли. Можно открыть приложение Matreshka.',
  authSignOut: 'Выйти',
  authOpenDesktop: 'Открыть приложение',
  models: {
    matrena: 'Matrena',
    gemini: 'Gemini 3.8 Flash',
    opus: 'Opus 5',
    gigachat: 'GigaChat 3.5',
    alice: 'Алиса',
    gpt: 'GPT-5.6',
  },
  rows: {
    swe: 'SWE-bench Verified',
    tb20: 'Terminal-bench 2.0',
    tb21: 'Terminal-bench 2.1',
    tau2: 'τ2 Telecom',
    mcp: 'MCP Atlas',
    osworld: 'OSWorld',
    gpqa: 'GPQA Diamond',
  },
}

export const en: LandingCopy = {
  title: 'Matreshka',
  pitch: 'Say what you need done. Matrena will take it from there.',
  downloadWindows: 'Download for Windows',
  navProduct: 'Features',
  navPlugins: 'Plugins',
  langEn: 'EN',
  langRu: 'RU',
  heroWindowAlt: 'Matreshka window with a Matrena reply',
  workTitle: 'Writes, looks up, finishes the job',
  workBody: 'Ask for a letter, a clearer wording, or a fact. Matrena answers to the point and does not leave the task half-done.',
  workAlt: 'Chat with a finished note from Matrena',
  pluginsTitle: 'Connects a service when you need it',
  pluginsBody: 'Turn the tool on in the sidebar. Access stays with us, not on your computer.',
  pluginsAlt: 'Matreshka plugins pane',
  teamTitle: 'Several conversations, one helper',
  teamBody: 'Keep topics in parallel, come back later, and continue from where you left off.',
  teamAlt: 'Conversation list in Matreshka',
  everywhereTitle: 'On your computer, close at hand',
  everywhereBody: 'Matreshka installs like an ordinary Windows program. Open it, write, get an answer.',
  cardDesktopTitle: 'For Windows',
  cardDesktopBody: 'An app on the desktop. No browser, no extra tabs.',
  cardPluginsTitle: 'Plugins',
  cardPluginsBody: 'Turn on the tools you need from the sidebar.',
  cardMatrenaTitle: 'Matrena',
  cardMatrenaBody: 'Replies in chat and helps you finish what you started.',
  footer: 'Matreshka',
  markAlt: 'Matreshka',
  navMatrena: 'Matrena',
  bannerTitle: 'Matrena',
  bannerLead: 'Public board scores. Beside Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, and GPT-5.6.',
  bannerMore: 'See the comparison',
  pageTitle: 'Matrena',
  pageLede: 'Matrena replies in Matreshka. Below are its scores on public boards, beside Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, and GPT-5.6.',
  pageMetaTitle: 'Matrena',
  pageMetaDescription: 'Public Matrena scores beside Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, and GPT-5.6.',
  compareTitle: 'Beside other models',
  compareLead: 'The best score in each row is marked. Matrena is not first everywhere: Opus 5 is ahead on SWE-bench Verified and OSWorld, Gemini 3.8 Flash is ahead on GPQA Diamond.',
  tableCaption: 'Matrena compared with Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, and GPT-5.6',
  noteSweTitle: 'SWE-bench Verified',
  noteSweBody: 'A described task through to a finished change. Matrena scores 79.0%. Gemini 3.8 Flash is beside it at 80.0%. Opus 5 is at 96.0% here.',
  noteTbTitle: 'Terminal-bench',
  noteTbBody: 'Work at a command line. 89.0% on 2.0 and 91.4% on 2.1. GPT-5.6 is slightly ahead on 2.0: 91.9%.',
  noteToolsTitle: 'Tools',
  noteToolsBody: 'τ2 Telecom is 95.0%. In this row the other published score is GigaChat 3.5 at 68.7%. MCP Atlas at 72.0% is published only for Matrena.',
  noteOsTitle: 'OSWorld',
  noteOsBody: 'Work on a computer. Matrena scores 61.0%. That is above Gemini 3.8 Flash (59.0%) and below Opus 5 (75.4%).',
  noteGpqaTitle: 'GPQA Diamond',
  noteGpqaBody: 'Hard questions. Matrena scores 88.1%. Gemini 3.8 Flash (95.3%) and GPT-5.6 (94.6%) are ahead here.',
  emptyNote: 'ARC-AGI-2, MMMU, and MMMLU have no published scores for any model in this table.',
  footnote: 'Matrena figures are our runs. Other figures are those models’ latest public reports. A hyphen means there is no publication.',
  backHome: 'Back to home',
  navSignIn: 'Sign in',
  authLoginTitle: 'Sign in to Matreshka',
  authRegisterTitle: 'Create a Matreshka account',
  authEmail: 'Email',
  authPassword: 'Password',
  authSubmitLogin: 'Sign in',
  authSubmitRegister: 'Create account',
  authSubmitting: 'Please wait…',
  authInvalid: 'Invalid email or password.',
  authNetwork: 'Could not reach Matreshka. Check that the API is running.',
  authExists: 'That email is already registered. Sign in.',
  authSwitchToRegister: 'No account? Register',
  authSwitchToLogin: 'Already have an account? Sign in',
  authHandoff: 'Opening Matreshka…',
  authSignedIn: 'You are signed in. You can open the Matreshka app.',
  authSignOut: 'Sign out',
  authOpenDesktop: 'Open the app',
  models: {
    matrena: 'Matrena',
    gemini: 'Gemini 3.8 Flash',
    opus: 'Opus 5',
    gigachat: 'GigaChat 3.5',
    alice: 'Alice',
    gpt: 'GPT-5.6',
  },
  rows: {
    swe: 'SWE-bench Verified',
    tb20: 'Terminal-bench 2.0',
    tb21: 'Terminal-bench 2.1',
    tau2: 'τ2 Telecom',
    mcp: 'MCP Atlas',
    osworld: 'OSWorld',
    gpqa: 'GPQA Diamond',
  },
}
