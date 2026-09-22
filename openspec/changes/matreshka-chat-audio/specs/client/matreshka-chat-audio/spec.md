## Purpose

Lets an operator play attached audio in chat and see which files Matrena can read.

## ADDED Requirements

### Requirement: Composer readable-files hint

The composer MUST show one locale-owned line under the input stating that Matrena reads UTF-8 text and source files, and that mp3, wav, ogg, m4a, aac, and webm can be played in the message.

#### Scenario: Hint under the composer

- **WHEN** the composer is available for a session
- **THEN** the line is visible under the input

### Requirement: Draft audio player

A draft whose name or browser media type is mp3, wav, ogg, oga, m4a, aac, or webm MUST show a native audio control before the message is sent. Other drafts stay file cards.

#### Scenario: Play a draft recording

- **WHEN** the operator adds `note.mp3`
- **THEN** the composer shows an audio control for that file

### Requirement: Sent-message audio player

A sent user message whose file name has a playable audio extension MUST show a native audio control. In the same browser session the control uses the picked file. After reload it uses the session-authorized audio read when that read succeeds.

#### Scenario: Play a sent recording

- **WHEN** a user message contains `note.wav`
- **THEN** the message shows an audio control for that file

#### Scenario: Other files stay cards

- **WHEN** a user message contains `notes.txt`
- **THEN** the message shows the file name and size and no audio control
