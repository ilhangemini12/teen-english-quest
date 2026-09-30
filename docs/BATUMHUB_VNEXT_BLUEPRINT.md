# BatumHub vNext — Component Map, Wireframes, React/Tailwind Target Architecture

> Branch target: `vnext-v5.7-focus`
>
> Production safety rule: `main` stays on the last fully verified stable release until all vNext gates pass.
>
> Product rule: **Do not delete working features to simplify the UI. Move them to the correct layer.**
>
> Focus/audio rule: **Do not integrate Spotify into BatumHub.** Keep the Focus Player distraction-free: locally generated focus sounds are the default; user-selected local audio is optional, session-local, and never uploaded. No music feeds, recommendations, social discovery, ad bypass, or streaming-account coupling.

---

## 1. Product Shell

### Primary navigation

Mobile and desktop use the same four product destinations:

1. **Home** — daily action, streak, XP, continue
2. **Explore** — content discovery and learning categories
3. **AI Tutor** — guided AI learning intents
4. **League** — friends league, achievements, profile entry points

Global, non-primary actions remain outside the four-item navigation:

- Messages
- Account/Profile
- Install/PWA status
- Small weather indicator
- Settings / personalization

### Target component map

```text
<App>
  <AppProviders>
    <AppShell>
      <TopBar>
        <Brand />
        <WeatherMini />
        <MessageToggle />
        <AccountButton />
      </TopBar>

      <RouteOutlet>
        /              -> <HomePage />
        /explore       -> <ExplorePage />
        /content/:id   -> <ContentPage />
        /tutor         -> <AiTutorPage />
        /league        -> <LeaguePage />
        /profile       -> <ProfilePage />
        /settings      -> <SettingsPage />
      </RouteOutlet>

      <BottomNavigation />
      <MessageDrawer />
      <DictionaryPopover />
      <ToastHost />
      <PwaUpdateToast />
      <OfflineBanner />
    </AppShell>
  </AppProviders>
</App>
```

---

## 2. Home Page

### UX goal

The Home screen answers one question only:

**What should I do now?**

It must not become a directory of every feature.

### Wireframe — mobile

```text
┌─────────────────────────────────┐
│ BATUMHUB             ☁ 18° 💬 👤 │
├─────────────────────────────────┤
│                                 │
│       🔥 12 day streak          │
│             2,480 XP            │
│       ━━━━━━━━━━━━━━━           │
│                                 │
│         TODAY'S QUEST           │
│                                 │
│      Speak for 8 minutes        │
│      One focused challenge      │
│                                 │
│      ┌───────────────────┐      │
│      │   START QUEST ▶   │      │
│      └───────────────────┘      │
│                                 │
│      Continue last activity →   │
│                                 │
├─────────────────────────────────┤
│  🏠 Home  🧭 Explore  ✨ Tutor 🏆 │
└─────────────────────────────────┘
```

### Home component tree

```text
<HomePage>
  <DailyProgressHeader />
  <DailyQuestHero />
  <ContinueCard />
  <OptionalPinnedWidgets max={2} />
</HomePage>
```

### Hard constraints

- Only one primary CTA above the fold.
- Maximum two user-pinned optional widgets.
- TED, VOA, Games, SAT, Future, Movies, Sports and similar modules do not render directly on Home.
- Home must remain useful even if one content provider fails.
- Existing XP, streak and profile data must be reused; do not create duplicate progress stores.

---

## 3. Explore Page

### Wireframe — mobile

```text
┌─────────────────────────────────┐
│ Explore                         │
│ [ Search English content... ]   │
│                                 │
│ For You  Learn  SAT  Future     │
│ Watch    Listen Play  More      │
│                                 │
│ ┌────────────┐ ┌────────────┐   │
│ │ 🗞 Fresh   │ │ 💡 TED     │   │
│ └────────────┘ └────────────┘   │
│ ┌────────────┐ ┌────────────┐   │
│ │ 🎧 Audio   │ │ 🎮 Games   │   │
│ └────────────┘ └────────────┘   │
│                                 │
│ Recommended for you             │
│ [ large content card ]          │
│ [ large content card ]          │
├─────────────────────────────────┤
│  🏠 Home  🧭 Explore  ✨ Tutor 🏆 │
└─────────────────────────────────┘
```

### Component tree

```text
<ExplorePage>
  <ExploreSearch />
  <ExploreCategoryTabs />
  <ExploreCategoryGrid />
  <PersonalizedFeed />
  <ExploreCustomizer />
</ExplorePage>
```

### Explore categories

Initial visible categories: maximum 5–6.

Candidate categories:

- For You
- Learn
- SAT
- Future
- Watch
- Listen
- Games
- Movies & TV
- Gaming
- Sports
- Life & Style
- TED
- VOA / Fresh English

Less-used categories move under **More**.

---

## 4. AI Tutor

### Wireframe

```text
┌─────────────────────────────────┐
│ AI Tutor                        │
│                                 │
│ What do you want to do?         │
│                                 │
│ 🗣 Practice speaking            │
│ ✍ Check my writing              │
│ 📖 Explain something            │
│ 🎯 SAT practice                 │
│ 🎬 Talk about what I watched    │
│                                 │
│ Recent conversation             │
├─────────────────────────────────┤
│  🏠 Home  🧭 Explore  ✨ Tutor 🏆 │
└─────────────────────────────────┘
```

### Component tree

```text
<AiTutorPage>
  <TutorIntentGrid />
  <TutorConversation />
  <TutorComposer />
  <TutorSafetyNotice />
</AiTutorPage>
```

The AI area is **intent-first**, not an empty generic chat box.

---

## 5. League / Social Layer

### Wireframe

```text
┌─────────────────────────────────┐
│ Friends League                  │
│ 3 days left                     │
│                                 │
│ 🥇 Elif              1840 XP    │
│ 🥈 Alex              1720 XP    │
│ 🥉 Mert              1540 XP    │
│                                 │
│ Achievements                    │
│ 🔥 7-day streak   🎯 Boss clear │
│                                 │
│ Friends activity                │
│ Elif completed a Boss Challenge │
├─────────────────────────────────┤
│  🏠 Home  🧭 Explore  ✨ Tutor 🏆 │
└─────────────────────────────────┘
```

### Social rules

Allowed activity language:

- “Elif completed a Boss Challenge.”
- “Mert reached a 7-day streak.”
- “Alex earned 120 XP.”

Avoid pressure language such as:

- “You are falling behind.”
- “Everyone is beating you.”
- “Come back now or lose your status.”

Toast queue:

- one toast visible at a time
- 4–5 second duration
- session cap
- reduced-motion support

---

## 6. Messages

Messages remain a global feature and must not disappear during simplification.

### Desktop

Right-side `MessageDrawer`.

### Mobile

Fullscreen sheet / route-like panel.

### Toggle behavior

```text
closed -> tap message icon -> open
open   -> tap message icon -> close
ESC    -> close
backdrop -> close
```

One global UI state only:

```ts
type UiState = {
  messagePanelOpen: boolean;
  contentViewerId: string | null;
  theme: 'system' | 'light' | 'dark';
};
```

Do not mount multiple copies of the same message UI.

---

## 7. Dictionary

### Desktop

Hover/focus delay: approximately 700–1000 ms.

### Mobile

Tap / long-press.

### Component

```text
<DictionaryPopover>
  <Word />
  <PartOfSpeech />
  <SimpleDefinition />
  <ExampleSentence />
  <ListenButton />
  <SaveWordButton />
</DictionaryPopover>
```

Do not require a full-page navigation for a word lookup.

---

## 8. Content Viewer / Retention Layer

Do not force every external provider into an iframe.

### Resolution strategy

```text
Content request
     |
     v
<ContentResolver>
     |
     +-- Native player
     +-- Official provider embed
     +-- Internal article/study view
     +-- External fallback
```

### Component contract

```ts
type ContentProvider =
  | 'youtube'
  | 'ted'
  | 'voa'
  | 'podcast'
  | 'article'
  | 'external';

type ContentViewerProps = {
  provider: ContentProvider;
  contentId: string;
};
```

### Learning wrapper

```text
WATCH / READ / LISTEN
        ↓
VOCABULARY
        ↓
SHORT QUIZ
        ↓
XP REWARD
        ↓
NEXT ACTION
```

Provider failure must degrade to a safe fallback instead of breaking the full app.

---

## 9. Current Module -> vNext Destination Matrix

| Current DOM / module | vNext destination | Action |
|---|---|---|
| `#heroHome` | `DailyQuestHero` | Redesign |
| `#learningLaunch` | Home next-action service | Keep logic, reduce visual weight |
| `#quickControls` | Settings/Profile | Move |
| `#personalWidgets` | Optional pinned Home widgets | Limit to 2 |
| `#dashboard` | Removed as a visual directory | Route features to Explore |
| `#fresh` | Explore / For You feed | Move |
| `#exploreHub` | `ExploreCategoryGrid` | Keep + simplify |
| `#learnHub` | Explore -> Learn | Keep |
| `#elifAI` | `AiTutorPage` | Promote to primary nav |
| `#league` | `LeaguePage` | Promote to primary nav |
| `#messages` | `MessageDrawer` / mobile full panel | Keep global |
| `#settings` | `SettingsPage` | Keep |
| `#languageHub` | Explore -> Learn language | Keep |
| `#studyFlow` | `ContentPage` | Refactor |
| `#mediaDock` | `ContentViewer` | Refactor |
| Word widgets | `DictionaryPopover` + optional WOTD widget | Keep |
| Online/invisible | Presence service + messaging/league UI | Keep |
| Weather | `WeatherMini` | Compress |
| Version/update info | Settings + PWA update toast | Remove from persistent header |

---

## 10. React + Tailwind Target File Architecture

The current production app is still a large static HTML/CSS/JS application. Do not rewrite production all at once.

Target structure:

```text
src/
  app/
    App.tsx
    AppProviders.tsx
    AppShell.tsx
    router.tsx

  components/
    ui/
      Button.tsx
      IconButton.tsx
      Card.tsx
      BottomSheet.tsx
      Drawer.tsx
      Modal.tsx
      ProgressBar.tsx
      Toast.tsx
      Skeleton.tsx

  features/
    home/
      HomePage.tsx
      DailyQuestHero.tsx
      ContinueCard.tsx

    explore/
      ExplorePage.tsx
      ExploreSearch.tsx
      ExploreCategoryGrid.tsx
      PersonalizedFeed.tsx

    tutor/
      AiTutorPage.tsx
      TutorIntentGrid.tsx
      TutorConversation.tsx

    league/
      LeaguePage.tsx
      LeagueTable.tsx
      ActivityFeed.tsx

    messaging/
      MessageDrawer.tsx
      ConversationList.tsx
      ConversationPane.tsx

    dictionary/
      DictionaryPopover.tsx
      dictionary.service.ts

    content/
      ContentPage.tsx
      ContentViewer.tsx
      ContentResolver.ts
      providers/

    profile/
      ProfilePage.tsx

    settings/
      SettingsPage.tsx

    gamification/
      xp.service.ts
      streak.service.ts
      achievements.ts

  lib/
    supabase/
      client.ts
      queries.ts
      realtime.ts

    pwa/
      register.ts
      updates.ts

  stores/
    ui.store.ts
    session.store.ts

  hooks/
  utils/
  styles/
    globals.css
    tokens.css
```

---

## 11. State Ownership

### Server state — TanStack Query

Use for:

- profile
- XP/progress
- quests
- league
- messages
- content
- saved vocabulary

### Global UI state — Zustand

Use only for:

- theme
- message drawer state
- active content viewer
- install/update UI
- temporary app-shell state

### Local component state

Use for:

- input values
- dropdown state
- temporary animation state
- local card interactions

Do not move every variable into a global store.

---

## 12. Tailwind Design Tokens

Target semantic tokens:

```ts
colors: {
  bg: '#0B1220',
  surface: '#121A2A',
  raised: '#192235',
  text: '#F7F9FC',
  muted: '#9CA9BD',
  primary: '#6366F1',
  success: '#35C66B',
  warning: '#F6C945',
  danger: '#EF5B5B'
}

borderRadius: {
  card: '20px',
  control: '14px',
  pill: '999px'
}
```

Prefer semantic classes/components over repeated arbitrary color values.

---

## 13. PWA Requirements

Mandatory:

- standalone display
- safe-area support
- maskable icons
- offline shell
- versioned service worker
- controlled update prompt
- local progress persistence
- online sync
- network-first dynamic data
- no aggressive caching of large third-party media

Update UX:

```text
BatumHub has an update
[ Update now ]
```

Do not silently reload while the learner is in a task.

---

## 14. Reliability / Circuit Breaker

Provider errors must not trigger infinite loops.

Client policy:

```text
request
  -> fail
  -> retry 1
  -> fail
  -> retry 2
  -> stop
  -> show provider fallback
```

Provider-level circuit breaker:

- repeated provider errors -> temporarily disable that integration
- rest of BatumHub remains functional

No infinite retries.

---

## 15. Migration Sequence

### Phase 0 — Stable production baseline

- Keep verified production release on `main`.
- Preserve vNext work on a dedicated branch.
- Keep rollback branch/tag.

### Phase 1 — Shell

- AppShell
- TopBar
- BottomNavigation
- Home Daily Quest
- Explore route
- Global message access

### Phase 2 — Modularize without changing behavior

Extract:

- messaging
- league
- dictionary
- content viewer
- settings
- learning modules

### Phase 3 — React/Tailwind bridge

Move feature-by-feature, not file-by-file.

Recommended order:

1. App shell
2. Home
3. Explore
4. League
5. Messages
6. Dictionary
7. Content viewer
8. AI Tutor
9. Settings
10. Remaining learning modules

### Phase 4 — Remove legacy monolith only after parity

The old `index.html` logic may be removed only when every critical flow has parity tests.

---

## 16. Release Gates

A vNext release cannot replace production until all of these pass:

### Gate A — Static

- JS/TS syntax/build pass
- no duplicate critical IDs
- no missing required environment configuration

### Gate B — UI smoke

- language switch
- Home -> Learn
- Home -> Explore
- Home -> Tutor
- Home -> League
- message open/close
- lesson open/close
- media viewer
- dictionary
- profile/settings

### Gate C — Stress

- rapid tab switching
- repeated message toggle
- offline/online transition
- provider timeout
- provider 429/5xx
- service-worker update
- mobile viewport
- desktop viewport

### Provider-error rule

A third-party `429`, blocked embed or temporary upstream failure must be recorded separately from application exceptions. It must not be allowed to hide a real app error, but it also must not automatically classify the whole UI as broken when the app falls back correctly.

---

## 17. QA Resource Rule

Do not repeatedly consume external browser automation / third-party browsing credits for checks that can be performed by:

- GitHub Actions
- local static validation
- unit/integration tests
- deterministic fixture data

External live-browser validation is reserved for cases where rendering or provider behavior cannot be verified otherwise.

---

## 18. Definition of Done

vNext is ready for production only when:

- Home has one obvious primary action.
- Bottom navigation has exactly four primary destinations.
- Existing functionality has been moved, not silently removed.
- Messages remain reachable globally.
- Explore contains discovery modules formerly shown on Home.
- AI Tutor is intent-first.
- League is visible without pressure-based social copy.
- Dictionary works on desktop and mobile interaction models.
- Provider failures degrade gracefully.
- No infinite retry loop exists.
- PWA update path is controlled.
- Mobile has no horizontal overflow.
- Reduced motion is supported.
- Production rollback is one operation away.
