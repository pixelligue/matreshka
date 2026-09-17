## Purpose

Shows Matreshka product chrome in Russian and English so operators can use the GUI in those two languages, with Russian wording rather than English clones.

## ADDED Requirements

### Requirement: Russian product copy is Russian wording

When the active product locale is Russian, every product-visible GUI string MUST be Russian wording. A registered `ru` dictionary MUST NOT reuse the English source string for product copy. User, workspace, and session names, model names, tool names, paths, URLs, and protocol tokens remain verbatim.

#### Scenario: Empty session chrome

- **WHEN** the GUI shows an empty session with the active locale Russian
- **THEN** the workspaces section heading, the per-workspace new-session control, the hero headline, the preview badge, the composer placeholder, the Standard mode chip, and the Workspace Write chip are Russian and are not their English source strings

#### Scenario: Settings and sidebar chrome stay Russian

- **WHEN** the GUI shows the sidebar new-session control and the settings trigger with the active locale Russian
- **THEN** those controls remain Russian (they already ship Russian wording)

### Requirement: Language-neutral tokens stay verbatim

Brand names Matreshka and Matrena, tool names, units, file-type labels, and other language-neutral tokens MUST stay identical across Russian and English. Interpolation placeholders such as `{name}` MUST match the English dictionary for the same key.

#### Scenario: Brand and tool tokens

- **WHEN** the active locale is Russian
- **THEN** Matreshka, Matrena, and language-neutral tokens such as HTTP, px, PTC, and tool names still appear as those tokens

#### Scenario: Placeholders preserved

- **WHEN** a Russian dictionary entry interpolates a value
- **THEN** its `{placeholder}` names match the English entry for that key

### Requirement: Desktop shell copy follows Russian

The Desktop Electron shell MUST ship a complete Russian dictionary with the same keys as English. When the OS locale is Russian and no override applies, Desktop menus, startup, recovery, and plugin-manager copy MUST be Russian.

#### Scenario: Russian OS Desktop menu

- **WHEN** Desktop starts with a Russian OS locale and no saved language override
- **THEN** the application menu label is Russian and is not `Application`

#### Scenario: Non-Russian Desktop fallback

- **WHEN** Desktop starts with a non-Russian, non-Chinese OS locale and no saved language override
- **THEN** Desktop shell copy remains English

### Requirement: English-clone Russian dictionaries fail verification

Verification MUST fail when a shipped `ru` dictionary is missing, has a different key set from English, or copies an English product-copy value that is not on the language-neutral allowlist.

#### Scenario: English clone is rejected

- **WHEN** a `ru` dictionary reuses an English product-copy string such as `Workspaces` or `Into the Unknown`
- **THEN** verification fails

#### Scenario: Language-neutral clone is allowed

- **WHEN** a `ru` dictionary value equals English and that value is a language-neutral token
- **THEN** verification passes for that key
