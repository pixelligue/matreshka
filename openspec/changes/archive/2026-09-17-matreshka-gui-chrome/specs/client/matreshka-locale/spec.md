## Purpose

Shows Matreshka product chrome in Russian and English so operators can use the GUI in those two languages.

## ADDED Requirements

### Requirement: Product languages are Russian and English

All product-visible GUI copy MUST have Russian and English locale strings. The GUI MUST default to Russian when the OS locale is Russian, otherwise English. The operator MUST be able to switch between Russian and English.

#### Scenario: Russian OS

- **WHEN** the GUI starts with a Russian OS locale and no saved language override
- **THEN** chrome copy is Russian

#### Scenario: English fallback

- **WHEN** the GUI starts with a non-Russian OS locale and no saved language override
- **THEN** chrome copy is English

#### Scenario: Language switch

- **WHEN** the operator selects English or Russian in settings
- **THEN** chrome copy follows that language without a restart
