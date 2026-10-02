---
designPrinciples:
- calm-first
- progress-visible
- practice-over-presentation
- chinese-native
- exam-aware-not-exam-heavy
name: Hanzi
platform: webapp
product: HSK Chinese Learning
status: proposed
version: 1.1
---

## Overview

Hanzi is a modern design system for a Chinese-learning webapp focused on
HSK progression.

The visual direction should sit between: - the friendliness and
motivation of game-based language apps, - the clarity of structured
course platforms, - the density and utility of serious HSK preparation
tools, - the editorial feel of graded-reading products.

Avoid stereotypical "China" visual language: no excessive red/gold,
dragons, lanterns, seals, or ornamental patterns in core UI.

### Product promise

**Know what to learn. Practice it. See progress.**

The interface should make the next action obvious within 2 seconds.

### Core UX principles

1.  **One primary action per learning screen.**
2.  **Show progress before decoration.**
3.  **Chinese content is the hero; UI chrome stays quiet.**
4.  **Feedback is specific and actionable, never just right/wrong.**
5.  **Use gamification as motivation, not as visual noise.**
6.  **Every HSK level should feel like a destination, not just a
    filter.**
7.  **Audio, tones, pinyin, hanzi and translation must have clear
    hierarchy.**

------------------------------------------------------------------------

## Brand

### Name

Hanzi

### Personality

-   focused
-   warm
-   intelligent
-   modern
-   encouraging
-   culturally respectful

### Visual metaphor

**Ink + Jade + Vermilion**

-   Ink = knowledge, typography, Chinese text
-   Jade = learning, growth, progress
-   Vermilion = attention, milestones and exam moments

------------------------------------------------------------------------

## Colors

### Core brand palette

The seven core brand colors remain fixed in v1.1. Expand them with semantic and state tokens rather than introducing more primary brand colors.

``` yaml
colors:
  ink:
    950: "#17211F"
    900: "#1F2A27"
    700: "#40504B"
    500: "#66756F"
    300: "#AAB5B1"
    200: "#CDD5D2"
    100: "#E8ECEA"

  jade:
    700: "#0F766E"
    600: "#138A80"
    500: "#19A394"
    100: "#DDF5F1"
    50: "#F0FBF9"

  vermilion:
    800: "#8F2D26"
    700: "#A9342B"
    600: "#D24B3F"
    500: "#E25B4F"
    100: "#FCE4E1"
    50: "#FFF5F3"

  paper:
    0: "#FFFFFF"
    50: "#FAFBFA"
    100: "#F4F6F5"

  amber:
    700: "#946200"
    600: "#B7791F"
    100: "#FEF3C7"

  sky:
    700: "#1D4F7A"
    600: "#2563A6"
    100: "#E4F0FA"

  purple:
    600: "#7656A6"
    100: "#EEE8F8"
```

### Semantic tokens

Brand tokens describe identity. Semantic tokens describe UI meaning. Components should consume semantic tokens whenever possible so the product can evolve without rewriting component styles.

``` yaml
semantic:
  surface:
    canvas: "#FAFBFA"
    default: "#FFFFFF"
    subtle: "#F4F6F5"
    inverse: "#1F2A27"

  text:
    primary: "#1F2A27"
    secondary: "#66756F"
    muted: "#AAB5B1"
    inverse: "#FFFFFF"
    danger: "#A9342B"
    warning: "#946200"
    info: "#1D4F7A"

  border:
    subtle: "#EEF1EF"
    default: "#E8ECEA"
    strong: "#CDD5D2"
    focus: "#0F766E"
    danger: "#A9342B"

  action:
    primary: "#0F766E"
    primaryHover: "#0B625C"
    primaryPressed: "#115E59"
    secondary: "#E8ECEA"
    secondaryHover: "#CDD5D2"
    danger: "#A9342B"

  feedback:
    success: "#0F766E"
    successSurface: "#DDF5F1"
    warning: "#946200"
    warningSurface: "#FEF3C7"
    error: "#A9342B"
    errorSurface: "#FCE4E1"
    info: "#1D4F7A"
    infoSurface: "#E4F0FA"

  learning:
    new: "#66756F"
    learning: "#2563A6"
    familiar: "#0F766E"
    mastered: "#115E59"
    due: "#946200"
    difficult: "#A9342B"

  feature:
    ai: "#7656A6"
    aiSurface: "#EEE8F8"
    streak: "#B7791F"
    streakSurface: "#FEF3C7"
```

### Color rules

- Jade is the default primary action, progress and mastery color.
- Vermilion is reserved for attention, errors, milestones and exam moments. It is not the default streak color.
- Amber is the default streak / persistence color.
- Never use vermilion as the main page background.
- Do not encode meaning by color alone; pair color with labels, icons, shape or position.
- `#D24B3F` is a brand accent, not the default small-text error color. Use `vermilion.700` / `#A9342B` for small error text.
- Use `slate.500` for normal secondary text; use darker text for small captions when contrast requires it.
- Borders have three levels: subtle, default and strong. Do not use one border color for every component.
- HSK level colors are metadata only and should not become a rainbow navigation system.
- Core brand colors remain stable; new UI meaning should be expressed through semantic tokens.

### Contrast guidance

- `ink.900` on paper/white is the default high-contrast text pairing.
- `jade.700` on paper/white is suitable for primary text and primary actions.
- `vermilion.600` should not be used as small normal-sized text where WCAG AA contrast is required; use `vermilion.700`.
- Disabled text and decorative borders are exempt from normal text contrast requirements, but disabled controls must still be distinguishable through opacity, structure or state.

------------------------------------------------------------------------

## Token Architecture

Use three layers:

``` text
Primitive tokens
    ↓
Semantic tokens
    ↓
Component tokens
```

### Primitive

Examples: `jade.700`, `ink.900`, `line.default`.

### Semantic

Examples: `text.primary`, `surface.default`, `feedback.error`.

### Component

Examples: `button.primary.background`, `answer.selected.border`, `wordCard.surface`.

Components should consume semantic or component tokens rather than hard-coding primitive hex values. This keeps the brand palette stable while allowing states and themes to evolve.

### Theme readiness

Dark mode is not required for MVP, but all component tokens should be semantic enough to support it later. Do not hard-code assumptions such as `#FFFFFF` directly into components when `surface.default` is available.

------------------------------------------------------------------------

## HSK Level Colors

Use HSK colors as restrained metadata only. Do not use a unique saturated color for every level.

``` yaml
hsk:
  HSK1: "#DDF5F1"
  HSK2: "#CFEFE9"
  HSK3: "#BFE6DF"
  HSK4: "#DCEAF7"
  HSK5: "#E8DFF4"
  HSK6: "#F3E2C9"
  HSK7-9: "#E6E7E8"
```

For badges, pair the background with `ink.900`. Keep the badge visually quiet.

For progress: - current level = jade - completed level = ink.300 - locked level = ink.200 - exam target = vermilion.

Do not use HSK colors for primary navigation, page backgrounds or large dashboard sections. HSK is a content attribute, not a brand color system.

------------------------------------------------------------------------

## Typography

### Font stack

``` yaml
typography:
  ui:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  chinese:
    fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"

  chineseEditorial:
    fontFamily: "'Noto Serif SC', 'Songti SC', serif"

  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
```

Use Inter for Latin UI copy and Noto Sans SC/PingFang SC for Chinese learning content. Use a serif Chinese face only for long-form editorial reading or cultural content. Do not rely on Inter as the primary renderer for Chinese glyphs.

### Type scale

``` yaml
typeScale:
  display:
    size: "40px"
    lineHeight: "48px"
    weight: 700

  h1:
    size: "32px"
    lineHeight: "40px"
    weight: 700

  h2:
    size: "24px"
    lineHeight: "32px"
    weight: 700

  h3:
    size: "20px"
    lineHeight: "28px"
    weight: 650

  bodyLarge:
    size: "18px"
    lineHeight: "28px"
    weight: 400

  body:
    size: "16px"
    lineHeight: "24px"
    weight: 400

  bodySmall:
    size: "14px"
    lineHeight: "20px"
    weight: 400

  caption:
    size: "12px"
    lineHeight: "16px"
    weight: 500

  hanziHero:
    size: "64px"
    lineHeight: "1.15"
    weight: 500

  hanziLarge:
    size: "40px"
    lineHeight: "1.2"
    weight: 500
```

### Chinese learning hierarchy

``` yaml
learningText:
  hanzi:
    role: primary
    size: "32-64px"

  pinyin:
    role: secondary
    size: "14-18px"

  translation:
    role: tertiary
    size: "14-16px"

  grammarNote:
    role: explanation
    size: "14-16px"
```

Never make pinyin visually compete with hanzi.

### Typography usage rules

``` yaml
typographyUsage:
  englishUi: "Inter"
  chineseUi: "Noto Sans SC / PingFang SC"
  chineseEditorial: "Noto Serif SC"
  hanziHero: "32-64px"
  pinyin: "14-18px"
  translation: "14-16px"
  metadata: "12-14px"
```

- Hanzi is the primary visual object.
- Pinyin is secondary and should never equal hanzi in size or weight.
- Translation is tertiary and should remain quieter than pinyin.
- Metadata can use smaller type, but must retain sufficient contrast.
- Avoid decorative display fonts for lesson content.

------------------------------------------------------------------------

## Spacing

Base unit: **4px**

``` yaml
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
  20: "80px"
  24: "96px"
```

Default page padding: - desktop: 32px - tablet: 24px - mobile: 16px

Learning content max width: - lesson: 760px - reading: 820px -
dashboard: 1200px - admin/data-heavy: 1280px

------------------------------------------------------------------------

## Grid

``` yaml
grid:
  desktop:
    columns: 12
    gutter: 24px
    maxWidth: 1200px

  tablet:
    columns: 8
    gutter: 20px

  mobile:
    columns: 4
    gutter: 16px
```

Prefer generous whitespace around learning content.

------------------------------------------------------------------------

## Radius

``` yaml
radius:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
```

Rules: - inputs/buttons: md - cards: lg - learning answer choices: lg -
avatars/badges: pill or circle - avoid excessive rounded cards around
every element

------------------------------------------------------------------------

## Elevation

Keep shadows soft.

``` yaml
shadow:
  xs: "0 1px 2px rgba(31,42,39,.05)"
  sm: "0 2px 8px rgba(31,42,39,.07)"
  md: "0 8px 24px rgba(31,42,39,.09)"
  lg: "0 16px 40px rgba(31,42,39,.12)"
```

Use borders before shadows. Shadows are for floating surfaces, dialogs
and important interactive cards.

------------------------------------------------------------------------

## Motion

``` yaml
motion:
  fast: "120ms"
  normal: "180ms"
  slow: "280ms"
  easing: "cubic-bezier(.2,.8,.2,1)"
```

Learning feedback: - correct answer: 180--280ms confirmation - incorrect
answer: subtle shake, max 2 cycles - level completion: 400--600ms
celebration - never block the learner with animation

------------------------------------------------------------------------

## Iconography

Use a single stroke-based icon family.

Recommended: - Lucide - 20px default - 1.75--2px stroke - rounded caps

Icon rules: - icons support text; they do not replace essential labels -
audio = Volume2 - pronunciation = Mic - listening = Headphones - reading
= BookOpen - writing = PenLine - vocabulary = Library - grammar = Braces
/ BookMarked - progress = TrendingUp - streak = Flame - HSK = Award -
review = RotateCcw

------------------------------------------------------------------------

## Navigation

### Desktop

``` text
Logo
Learn
Review
Read
Practice
HSK
----------------
Progress
Settings
Profile
```

Primary navigation should stay visible.

### Mobile

Use:

``` text
Home | Learn | Review | Read | Profile
```

HSK exam tools live under Learn or Practice, not as a separate
overwhelming destination.

------------------------------------------------------------------------

## Dashboard

The dashboard should answer four questions immediately:

1.  What should I do next?
2.  How much progress have I made?
3.  What am I weak at?
4.  What is my HSK target?

### Recommended hierarchy

``` text
Good evening, Mei
HSK 3 · 42% complete

[ Continue lesson ]
Lesson 4 · 在餐厅点菜
8 min

Today's review
[ 24 words ] [ 8 grammar ] [ 5 characters ]

Your skills
Listening  ███████░░
Reading    ████████░
Speaking   █████░░░░
Writing    ██████░░░

Weak areas
把 sentence pattern
2nd tone
Characters: 选择 / 经验

Weekly consistency
Mon Tue Wed Thu Fri Sat Sun
●  ●   ●   ●   ○   ●   ○
```

Do not lead with streaks. Lead with learning progress.

------------------------------------------------------------------------

## Lesson Shell

``` yaml
lesson:
  topBar:
    progress: true
    exit: true
    audio: optional

  main:
    maxWidth: "760px"

  bottomBar:
    primaryAction: right
    secondaryAction: left
```

### Lesson header

``` text
HSK 3 · Unit 04
Ordering food

Learn 8 words
```

### Lesson content card

Use one dominant learning object.

``` text
        选择
      xuǎnzé
      choose

   🔊 Listen
```

Then one task:

``` text
Choose the sentence using 选择 correctly.

[ A ]
[ B ]
[ C ]
[ D ]
```

------------------------------------------------------------------------

## Learning States

Learning state is a first-class design-system concept. The UI should communicate where a learner is in the learning loop without relying on color alone.

### Vocabulary states

``` yaml
vocabularyState:
  new:
    label: "New"
    token: "learning.new"
  learning:
    label: "Learning"
    token: "learning.learning"
  familiar:
    label: "Familiar"
    token: "learning.familiar"
  mastered:
    label: "Mastered"
    token: "learning.mastered"
  due:
    label: "Due for review"
    token: "learning.due"
  difficult:
    label: "Needs practice"
    token: "learning.difficult"
```

State presentation should combine a label, icon or progress indicator, and color where useful. Never communicate mastery only through green.

### Exercise states

``` yaml
exerciseState:
  default: "neutral surface + default border"
  selected: "jade border + jade surface"
  submitted: "locked interaction + feedback pending"
  correct: "success feedback + explanation"
  incorrect: "error feedback + explanation + retry path"
  disabled: "muted interaction + preserved structure"
  skipped: "neutral state + explicit skipped label"
```

### Audio states

``` yaml
audioState:
  idle: "play control"
  loading: "progress indicator"
  playing: "pause control + progress"
  paused: "resume control + preserved position"
  completed: "replay affordance"
  error: "text explanation + retry"
```

### Speaking states

``` yaml
speakingState:
  idle: "record affordance"
  recording: "live duration + stop"
  processing: "Analyzing your pronunciation…"
  scored: "score + specific feedback"
  retry: "focused retry action"
```

------------------------------------------------------------------------

## Component States

Every interactive component should define at least: default, hover, focus-visible, pressed, selected, disabled and error where applicable. Learning components additionally define correct, incorrect, loading and retry states.

### Buttons

``` yaml
buttonStates:
  default: true
  hover: true
  focusVisible: true
  pressed: true
  disabled: true
  loading: true
  destructive: true
```

Loading buttons preserve width and replace the label with a compact progress indicator rather than causing layout shift.

### Answer choices

``` yaml
answerState:
  default: "white surface + default border"
  hover: "strong border"
  focusVisible: "jade focus ring"
  selected: "jade border + pale jade surface"
  correct: "success border + explanation"
  incorrect: "vermilion border + explanation"
  disabled: "reduced contrast, not hidden"
```

### Inputs

``` yaml
inputState:
  default: "strong border"
  hover: "stronger border"
  focusVisible: "jade ring"
  filled: "default"
  error: "vermilion.700 border + error message"
  disabled: "muted surface + muted text"
```

Focus must always be visible for keyboard users.

------------------------------------------------------------------------

## Exercise Components

### Multiple Choice

-   2-column desktop
-   1-column mobile
-   large hit area: min 52px
-   selected state uses border + background
-   correct/incorrect feedback appears after submission

### Listening

``` text
[ ◀  00:08 ━━━━━━━  ]
```

Provide: - replay - speed: 0.75x / 1x / 1.25x - transcript reveal -
optional pinyin reveal

### Speaking

``` text
          🎙

     Say this sentence

      我想喝咖啡。

     [ Hold to speak ]

     Tone accuracy
     ━━━━━━━━░░ 82%
```

Use color plus text feedback:

``` text
Tone 2: good
Tone 3: needs practice
```

### Writing

Canvas: - 320 × 320 minimum on desktop - 280 × 280 mobile - visible
stroke order - undo - clear - show correct character - show
decomposition when requested

### Fill in the blank

Use inline blanks, not giant form fields.

``` text
我 ___ 学生。
```

### Sentence building

``` text
我
今天
学校
去
```

Tokens should be draggable/clickable and keyboard accessible.

------------------------------------------------------------------------

## Chinese Word Card

``` text
┌──────────────────────────────┐
│  经验                         │
│  jīngyàn                     │
│  experience                  │
│                              │
│  我有很多工作经验。            │
│  Wǒ yǒu hěn duō gōngzuò jīngyàn. │
│                              │
│  noun · HSK 4                │
│                              │
│  🔊     ☆ Save               │
└──────────────────────────────┘
```

Interaction: - tap/click hanzi → character detail - tap pinyin →
tone/audio - tap word → dictionary - save → review queue

------------------------------------------------------------------------

## Hanzi Detail

``` text
学

xué

to study / learn

Radical
子

Stroke count
8

Stroke order
[animation]

Examples
学习
学生
学校
```

Keep decomposition optional so beginners are not overloaded.

------------------------------------------------------------------------

## Tone Visualization

Use shape + label, not color alone.

``` text
1st  ━━━━━  high
2nd  ╱      rising
3rd  ─╲╱─   dipping
4th  ╲      falling
neutral ·    light
```

For pronunciation feedback: - show target tone - show detected tone -
explain the correction in words

------------------------------------------------------------------------

## Reading Mode

Inspired by graded-reader products, but keep the UI cleaner.

``` text
HSK 3 · 6 min read

北京的春天

春天来了，北京的天气开始变暖。
...

[Tap any word]
```

On tap:

``` text
开始
kāishǐ
to begin

HSK 2
🔊
Save
```

Controls: - Simplified / Traditional - Pinyin: Off / On / First
occurrence - Translation: Off / Sentence / Full - Audio: normal / slow -
font size

Reading mode should use `chineseSerif` for long-form text if it improves
legibility.

------------------------------------------------------------------------

## Review System

### Review card

``` text
Due now
24 words

[ Start review ]

Recommended:
8 new
12 learning
4 difficult
```

### SRS actions

Use semantic labels rather than only colors:

``` text
Again
Hard
Good
Easy
```

Keyboard: - 1 = Again - 2 = Hard - 3 = Good - 4 = Easy

------------------------------------------------------------------------

## Progress

### Skill model

Track at least:

``` yaml
skills:
  - vocabulary
  - grammar
  - listening
  - speaking
  - reading
  - writing
  - characters
```

Do not collapse all skills into a single score.

### HSK progress

``` text
HSK 3

Vocabulary     68%
Grammar        54%
Listening      72%
Reading        61%
Speaking       48%
Writing        57%

Overall readiness
64%
```

"Readiness" should be clearly labeled as an internal estimate, not an
official HSK score.

------------------------------------------------------------------------

## HSK Exam Mode

Exam mode is intentionally more restrained than the normal learning UI.

``` yaml
examMode:
  background: "#F4F6F5"
  chrome: minimal
  timer: visible
  questionCounter: visible
  progress: visible
  feedback: hiddenUntilEnd
```

Use: - one question per screen - large timer - clear section label -
keyboard shortcuts - review flagged questions - final result by skill

Do not use celebratory gamification during a mock exam.

------------------------------------------------------------------------

## Feedback

### Success

``` text
✓ Correct

你选择了正确的答案。
```

### Almost correct

``` text
Almost

Your answer is understandable, but the word order
needs adjustment.
```

### Incorrect

``` text
Not quite

Correct answer:
我昨天去了北京。

Why:
“昨天” usually comes before the verb phrase here.
```

The explanation is more valuable than the red/green state.

------------------------------------------------------------------------

## Gamification

Borrow the motivation mechanics common in language-learning apps, but
keep them secondary.

### XP

Earn XP for: - completing lessons - finishing reviews - speaking
practice - reading - maintaining accuracy

Avoid XP for simply opening the app.

### Streak

Show:

``` text
5 day learning streak
```

Do not make streak recovery emotionally punitive.

### Achievements

Examples: - First 100 words - 7 days consistent - 100 characters
written - First HSK mock - 1,000 minutes listening

------------------------------------------------------------------------

## Cards

Default:

``` yaml
card:
  background: "#FFFFFF"
  border: "1px solid #E8ECEA"
  radius: "14px"
  padding: "24px"
```

Use cards for: - learning objects - progress summaries -
recommendations - content previews

Do not put every sentence in a card.

------------------------------------------------------------------------

## Buttons

### Primary

``` yaml
height: "44px"
radius: "10px"
background: "#0F766E"
text: "#FFFFFF"
```

Use for: - Continue - Start lesson - Submit - Start review

### Secondary

``` yaml
background: "#E8ECEA"
text: "#1F2A27"
```

### Tertiary

Text button with no container.

### Destructive

Use vermilion only for destructive actions and serious errors.

------------------------------------------------------------------------

## Inputs

Height: 44px

States:

``` yaml
default:
  border: "#CDD5D2"

hover:
  border: "#AAB5B1"

focus:
  border: "#19A394"
  ring: "0 0 0 3px #DDF5F1"

error:
  border: "#B83A2F"
  ring: "0 0 0 3px #FCE4E1"
```

------------------------------------------------------------------------

## Tabs

Use tabs only when switching between sibling content.

Good:

``` text
Vocabulary | Grammar | Characters
```

Avoid:

``` text
Lesson | Learn | Practice | Review | Everything
```

for every screen.

------------------------------------------------------------------------

## Tables

For exam analytics and teacher/admin views:

-   compact rows
-   sticky header
-   right-align numeric data
-   never rely on color alone
-   use badges for HSK level

------------------------------------------------------------------------

## Empty States

Never say only "No data."

Example:

``` text
Your review queue is clear.

Nice work. Come back after your next lesson
and we'll schedule the next review automatically.

[ Continue learning ]
```

------------------------------------------------------------------------

## Loading

Use skeletons for content.

For audio:

``` text
Preparing audio…
```

For AI:

``` text
Analyzing your pronunciation…
```

Avoid generic spinners when the operation has a meaningful state.

------------------------------------------------------------------------

## AI Tutor

AI should feel like a study tool, not a chat app competing with the
course.

### Layout

``` text
Your sentence

我昨天去北京。

AI feedback

✓ Grammar
✓ Word choice

Try:
我昨天去了北京。

Why?
“去” can take 了 here to mark the completed action.

[ Try again ]
```

Always show: - original - correction - reason - one improved example

Avoid walls of AI-generated text.

------------------------------------------------------------------------

## Data Visualization

Progress visualization should communicate learning rather than decorate the dashboard.

### Skill progress

Use a consistent semantic mapping:

``` yaml
skillProgress:
  active: "jade"
  completed: "ink.300"
  weak: "vermilion.700"
  notStarted: "line.subtle"
```

Prefer bars, rings or simple sparklines over complex charts. Always pair a visual value with a number or label.

### Weekly activity

Use a seven-day row or compact bar chart. Do not make the streak the dominant visual. Learning minutes, completed lessons and review completion should be more prominent than streak count.

### Readiness

``` text
HSK 3 readiness
64%

Vocabulary     68%
Grammar        54%
Listening      72%
Reading        61%
Speaking       48%
Writing        57%
```

Readiness is an internal estimate and must never visually imply an official HSK score.

------------------------------------------------------------------------

## Accessibility

Minimum requirements:

-   WCAG AA contrast for normal text and interactive controls
-   keyboard navigation across the entire learning flow
-   visible `focus-visible` state
-   44px minimum touch target; 52px+ for answer choices
-   captions/transcripts for audio/video
-   do not use color as the only feedback
-   screen-reader labels for audio, recording and writing controls
-   reduced-motion support
-   pinyin and hanzi must remain selectable text
-   writing canvas must have a non-canvas alternative
-   audio feedback must have text equivalents
-   timer and progress cannot rely on animation alone
-   error messages must identify what happened and how to recover

### Focus ring

``` yaml
focus:
  color: "#0F766E"
  width: "3px"
  offset: "2px"
  surface: "#DDF5F1"
```

Never remove the browser focus indicator without replacing it with an equally visible focus treatment.

------------------------------------------------------------------------

## Responsive Rules

### Desktop ≥ 1024px

-   persistent sidebar
-   max-width content
-   two-column dashboard where useful
-   exercise cards can be wider

### Tablet 768--1023px

-   collapsible sidebar
-   preserve lesson focus
-   1--2 column layouts

### Mobile \< 768px

-   bottom navigation
-   one learning object per screen
-   sticky primary action
-   larger Chinese text
-   avoid dense analytics

------------------------------------------------------------------------

## Content Design

### Vocabulary metadata

``` yaml
word:
  hanzi:
  pinyin:
  translation:
  partOfSpeech:
  hskLevel:
  frequency:
  audio:
  example:
  tags:
```

### Grammar metadata

``` yaml
grammar:
  pattern:
  meaning:
  hskLevel:
  examples:
  commonMistakes:
  relatedPatterns:
```

### Lesson metadata

``` yaml
lesson:
  level:
  unit:
  title:
  duration:
  objectives:
  vocabularyCount:
  grammarCount:
  skills:
```

------------------------------------------------------------------------

## Design Tokens Summary

``` yaml
tokens:
  brandPrimary: "#0F766E"
  brandAccent: "#D24B3F"
  textPrimary: "#1F2A27"
  textSecondary: "#66756F"
  surface: "#FFFFFF"
  background: "#FAFBFA"
  border: "#E8ECEA"
  radiusCard: "14px"
  radiusControl: "10px"
  spacingUnit: "4px"
  contentMax: "1200px"
  lessonMax: "760px"
  bodyFont: "Inter"
  chineseFont: "Noto Sans SC"
```

------------------------------------------------------------------------

## Do / Don't

### Do

-   Make the next lesson obvious.
-   Give Chinese content generous space.
-   Use native-audio controls consistently.
-   Explain mistakes.
-   Show progress by skill.
-   Keep exam mode calm.
-   Let learners reveal pinyin/translation progressively.
-   Use jade as a recognizable product signal.

### Don't

-   Don't make everything red and gold.
-   Don't turn every action into a game.
-   Don't show pinyin at the same visual weight as hanzi.
-   Don't hide important information behind hover-only interactions.
-   Don't use a single "Chinese score" as the only progress metric.
-   Don't overload beginners with grammar terminology.
-   Don't let AI responses replace structured curriculum.

------------------------------------------------------------------------

## Design System Quality Bar

Before a new component enters the system, verify:

``` yaml
qualityBar:
  visual:
    - uses semantic tokens
    - follows 4px spacing grid
    - uses established radius and border levels
  interaction:
    - has focus-visible state
    - has loading/disabled state where applicable
    - has clear pressed/selected state
  learning:
    - makes the next action obvious
    - preserves hanzi hierarchy
    - explains mistakes when feedback is shown
  accessibility:
    - does not rely on color alone
    - meets touch target requirements
    - has text alternative for non-text media
```

------------------------------------------------------------------------

## Reference Product Patterns

The system intentionally synthesizes patterns observed across:

-   HelloChinese --- game-based bite-sized curriculum, speech
    recognition, handwriting, native-speaker video, SRS.
-   SuperChinese --- structured HSK path, real-world topics, short
    lessons, speaking feedback and AI tutor.
-   ChineseSkill --- 15-minute lessons, HSK-oriented curriculum, games,
    grammar notes, quizzes and customizable learning display.
-   SuperTest / HSK Online --- exam-focused personalization, level
    diagnosis, mock tests and skill-specific HSK practice.
-   Du Chinese --- graded reading, instant lookup, grammar explanations
    and native audio.
-   The Chairman's Bao --- graded news, listening/reading exercises,
    dictionary and flashcards.
-   Mandarin Bean --- HSK-level filtering, graded reading,
    simplified/traditional display, grammar and sample tests.
-   Skritter / Hack Chinese --- character/vocabulary SRS and
    writing-focused practice.
-   LingoDeer --- structured bite-sized lessons, detailed grammar
    explanations and native audio.
-   Yoyo Chinese --- guided curriculum, video lessons, practice, quizzes
    and character courses.
-   Chinese Zero to Hero --- explicit HSK curriculum and structured
    video courses.
-   Ninchanese --- gamified HSK curriculum, SRS, sentence building and
    grammar assistance.
-   Pleco --- fast dictionary, OCR, handwriting, document reader and
    customizable flashcards.

------------------------------------------------------------------------

## Recommended MVP

If the product is being designed from zero, implement in this order:

1.  App shell + navigation
2.  HSK level dashboard
3.  Lesson shell
4.  Vocabulary card
5.  Multiple choice
6.  Listening exercise
7.  Speaking exercise
8.  Review/SRS
9.  Progress by skill
10. Reading mode
11. Mock exam mode
12. AI feedback layer

The first release should feel excellent at one loop:

**Learn → Practice → Review → See progress → Continue.**
