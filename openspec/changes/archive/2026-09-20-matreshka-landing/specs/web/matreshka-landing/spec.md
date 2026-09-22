## Purpose

Public Matreshka marketing page that presents the desktop coding agent, Matrena, and CIS plugins, using the Codex landing page composition without OpenAI branding.

## ADDED Requirements

### Requirement: Public landing page

The product MUST serve a public marketing page at the landing app root. The page MUST be usable without a Matreshka session. It MUST NOT embed the Electron GUI, Cordis chrome, or the VitePress docs site.

#### Scenario: Visitor opens the site

- **WHEN** a visitor loads the landing root
- **THEN** they see a full marketing page titled Matreshka, not a sign-in form and not DeepSeek Harness docs

### Requirement: Codex-like page composition

The page MUST use this order: site header, centered hero, Matrena score banner, product window, alternating feature blocks (copy beside a product visual), then a three-card row. There MUST NOT be a “services you already use” / trusted-by logo strip. Feature blocks MUST alternate left-copy/right-visual and left-visual/right-copy. Product visuals MUST be captures of the running Matreshka Desktop GUI. The visitor MUST be able to reach the primary download control without leaving the page.

### Requirement: Matrena score banner

Directly under the hero the home page MUST show a Matrena banner with published Matrena scores and a link to the Matrena evaluation page. The banner MUST name the comparison set (Matrena, Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, GPT-5.6). The page MUST NOT show a MERA “next submit” callout.

#### Scenario: Score banner sits under the hero

- **WHEN** a visitor loads the landing
- **THEN** a Matrena banner appears before the product window, prints published Matrena scores, and links to the Matrena evaluation page

#### Scenario: First viewport matches the hero pattern

- **WHEN** a visitor loads the landing on a desktop viewport
- **THEN** the first screen shows the nesting-doll mark, the name Matreshka, a one-line pitch, and a primary control labeled as a Windows download

#### Scenario: Feature blocks alternate

- **WHEN** the visitor scrolls past the product window
- **THEN** at least two feature blocks appear, each pairing a heading and body with a product visual, and consecutive blocks flip which side holds the visual

### Requirement: Matreshka brand, not OpenAI or Harness

Visible product name MUST be Matreshka. The hero mark MUST be the nesting-doll asset. Copy MUST name Matrena as the chat agent. Copy MUST address ordinary operators and MUST NOT pitch programming, repositories, terminals, or engineering work. The page MUST NOT show OpenAI, Codex, ChatGPT, or DeepSeek Harness as the product name. The page MUST NOT show a trusted-by or “services you already use” logo row.

#### Scenario: Hero names Matreshka

- **WHEN** the hero is visible
- **THEN** the accessible page name is Matreshka and the mark is the nesting-doll graphic

#### Scenario: No services logo strip

- **WHEN** a visitor loads the landing
- **THEN** the page does not show amoCRM, Bitrix24, Tilda, or Amadeus as a trusted-by or “services you already use” row

### Requirement: Locale-owned copy

All visitor-visible sentences MUST come from locale dictionaries. Default locale is Russian. English MUST be available. Hardcoded UI sentences are forbidden.

#### Scenario: Russian is the default

- **WHEN** a visitor opens the landing root with no locale prefix
- **THEN** the hero pitch and the Windows download label are Russian

#### Scenario: English is available

- **WHEN** a visitor opens the English locale path
- **THEN** the same sections render in English and still name Matreshka and Matrena

### Requirement: Windows download control

The hero MUST include a primary control whose label is the locale string for downloading on Windows. If no installer URL is configured, the control MUST stay visible and MUST NOT pretend a file started downloading.

#### Scenario: Download is configured

- **WHEN** a Windows installer URL is configured
- **THEN** activating the hero control navigates to that URL

#### Scenario: Download is not configured

- **WHEN** no installer URL is configured
- **THEN** the control remains visible and does not start a file download

### Requirement: Matrena evaluation page

The landing app MUST serve a Matrena evaluation page at the locale Matrena path. The page MUST print a comparison table of published scores for Matrena, Gemini 3.8 Flash, Opus 5, GigaChat 3.5, Alice, and GPT-5.6. A missing publication MUST render as a hyphen. Copy MUST NOT claim Matrena leads every board.

#### Scenario: Visitor opens the evaluation page

- **WHEN** a visitor opens the Matrena path
- **THEN** they see a Matrena heading, a comparison table naming Gemini 3.8 Flash, and a note that Matrena is not first on every board

### Requirement: Reduced motion

Decorative motion on the mark or backgrounds MUST NOT run when the visitor prefers reduced motion.

#### Scenario: Reduced motion keeps the mark still

- **WHEN** the visitor has reduced motion enabled
- **THEN** the nesting-doll mark does not animate
