# Kahaniapp (Old App) — Feature, Style & Color Reference

> Distilled from the legacy **React Native / Expo** app in `kahaniapp/` so the design and
> feature set can be re-applied to the new Next.js web app (`web/`). The old app was a
> mobile-first (iOS/Android/web) Expo app backed by AWS Amplify + DynamoDB + GraphQL.
> The new app uses Next.js + Neon Postgres, so port the **concepts, IA, styling, and
> interactions** — not the implementation.

---

## 1. Product Concept

**Kahaniverse** is a collaborative, branching-story platform. The content hierarchy is:

```
Universe  (≈ a Series / shared world)
  └─ Story    (≈ an Episode within a universe)
        └─ Page    (≈ a Scene — pages form a TREE of branching/alternate scenes)
Character (belongs to one or more universes, appears in stories)
Author / Profile (the creator of any of the above)
```

Canonical naming (from `core/ScreenDefaults.ts`):
- `appName: "Kahaniverse"`
- topLevel = **Universe** / Universes
- midLevel = **Story** / Stories
- includesLevel = **Character** / Characters
- lastLevel = **Page** / Pages

### Core idea — branching collaborative narrative
- A **Story** has a root page; any reader can **extend** the story (add a *Next* page) or
  **fork** it (add an *Alternate* page to the same parent). Pages therefore form a tree.
- Authors of accepted pages become **contributors** to a story.
- Universes/Stories carry metadata: `era` ("Any time"), `world` ("Any place"), `genres[]`.

### Data model (legacy GraphQL → maps to new Postgres schema)
- **Universe**: `name`, `concept`, `coverImage`, `era`, `world`, `genres[]`, `createdBy`
- **Story**: `title`, `synopsis`, `coverImage`, `genreTags[]`, `contributors[]`, `universeId`, `createdBy`
- **Page**: `content`, `illustration`, `parentId`, `storyId`, `disallowNext`, `disallowAlternate`, `createdBy` — branches via `parentId`/`byParent`
- **Character**: `name`, `image`, `universeId[]` (multi-universe), appears in stories via `StoryCharacter` join
- **Comment**: `content`, `pageId`, `createdBy`
- **Profile/Author**: `name`, `dob`, `images[]`, plus authored universes/stories/pages/characters
- **Reactions**: enum `VIEW | LOVE | FOLLOW`, idempotent per `(postId, type, profileId)`, with a count aggregate row

---

## 2. Feature Set (screen by screen)

### Navigation shell
- **Bottom tab bar** with 3 tabs (semi-transparent dark, `rgba(0,0,0,0.7)`, absolutely positioned, no labels — icons only):
  - **Home** (`home` icon)
  - **Post** (center, the app **Logo** as the icon) → create flow; requires auth
  - **People** (authors) → requires auth
- Tapping **Post** or **People** while logged out redirects to an **Authorize/Login** flow.
- Stack navigators per tab: `HomeStack`, `PostsStack` (create forms), `PeopleStack` (authors).
- A **Drawer** (`DrawerComponent`) and per-section drawers (`AuthorsDrawer`, `ProfileDrawer`, `AssistDrawer`).

### Home screen
A vertically scrolling **composite screen** built from horizontal/vertical sections:
1. **Hero carousel** of Universes — auto-playing parallax "tinder"-layout carousel (`HeroSlider`), 80% of viewport height, with pagination dots.
2. **Authors** row — horizontal strip of **SquareCard** avatars.
3. **Latest Stories** — vertical list of **StoryCard**s.
- A persistent "**Infinity / create your own universe**" hero card prompts creation.

### Universe / Universes screens
- Hero carousel of universes; long-press a universe → create a Story in it.
- A universe detail shows its hero + its **Latest Stories** list.

### Story screen
- Hero (cover + synopsis, title hidden in hero), then **"Alternate Beginnings"** — list of
  root pages (branches) as **PageCard**s.
- **FAB** (single floating button) → "Add Page" form for that story.
- Author of the story can **edit inline** (tap-to-edit title/synopsis, long-press to change cover).

### Page screen
- Shows the selected page (content + illustration), then **"Alternate Next Pages"** list.
- **Multi-action FAB** with two actions:
  - **Alternate** (`file-restore` icon) — fork: new page sharing this page's parent.
  - **Next** (`page-next` icon) — extend: new page whose parent is this page.

### Authors / Author screen
- **Authors** list = vertical **SlimCard** list; long-press to **Follow**.
- **Author** profile is a rich composite: Hero (avatar + follow) + horizontal carousels of
  **Universes Created**, **Characters Created** (RoundCard), **Stories Authored**, **Pages Authored**.

### Create / Forms (Post tab)
- `UniverseFormScreen`, `StoryFormScreen`, `PageFormScreen`, `CharacterFormScreen`.
- `AttestOriginalityDialog` — author must attest originality before publishing.
- Inline editing pattern: the Hero/Card itself becomes editable (TextInputs for title/synopsis,
  image picker via long-press), with **Revert** / **Create|Update** buttons.

### User
- `ProfileScreen`, `SettingsScreen`, `ReactedScreen` (things you reacted to),
  `ReactorsScreen` (who reacted to you), `ProfileDrawer`.

### Auth
- `LoginScreen`, `RegisterScreen`, `ConfirmScreen` (email/code confirm), `ForgotPasswordScreen`,
  `ChangePasswordScreen`. Username + password (case-sensitive), social icon buttons available.
- Friendly copy: header "**Welcome back.**", "Don't have an account? **Sign up**",
  "Forgot your password?". Generic error "Incorrect username or password. Both are case sensitive."
  (deliberately not revealing which field — security).

### Reactions (the engagement model)
Three reaction types surfaced as a **ReactionsStrip** of tiny icon+count buttons:
| Reaction | Icon (outline → active) | Notes |
|----------|------------------------|-------|
| **View** | `eye` | passive view count, always shown |
| **Love** | `heart-outline` → `heart` | like; disabled for the author / logged-out |
| **Follow** | `compass-outline` → `compass` | follow story/author; disabled for author |
- Optimistic toggle with local count ±1, then dispatch to store; revert on failure.
- Logged-out users tapping a reaction are routed to Login.
- Double-tap a StoryCard = toggle Love (Instagram-style).

### Gestures / interactions worth porting
- **Double-tap** to love, **long-press** to edit (if author) or open actions / image picker.
- **Tap** avatar → author profile; tap universe label → universe; tap title → detail.
- Auto-playing hero carousel (5s interval) with tappable pagination dots.
- Action sheets for Share / Comment / Follow / Report Plagiarism.

---

## 3. Visual Style

**Overall vibe:** dark, cinematic, "multiverse / streaming-app" aesthetic (think a Netflix-style
dark UI) with a **bold red brand accent** and a **mauve/purple secondary** highlight. Cards are
flat **Material Surfaces** with light "page" backgrounds floating on near-black chrome.

### Theme foundations
- **Dark theme by default** (React Native Paper *DarkTheme* merged with React Navigation *DarkTheme*).
- Material Design surfaces (`react-native-paper`): `Surface`, `Title`, `Caption`, `Avatar`, `IconButton`.
- **Paper theme overrides:** `primary = mauve (#BB86FC)`, `secondary = red (#ff0000)`.
- Icons: **MaterialCommunityIcons** vocabulary (`eye`, `heart(-outline)`, `compass(-outline)`,
  `image`, `file-restore`, `page-next`, `account-edit`, `dots-vertical`).

### Typography
- System font stack (no custom font shipped):
  - Android: `sans-serif` family (`-light`, `-medium`, `-condensed` for bold)
  - iOS: `HelveticaNeue` (`-Light`, `-Medium`, `-Bold`)
  - Web: `Helvetica Neue`
- For the web app, a clean **Helvetica Neue / system-ui sans-serif** stack matches intent.
- Headings: ~22px medium weight, light-grey (`#e6e6e6`). Hero titles: **30px bold**, letter-spacing
  0.5, with a soft text-shadow for legibility over images. Synopsis: 12px *italic*, grey.
- Buttons: 16px, pill-shaped (border-radius 24), 46px tall.

### Shape & layout language
- **Pill buttons** (border-radius 24/24px) — primary = filled red, secondary = white w/ black border.
- **Cards** = flat surfaces, small radius (~5px), subtle elevation/shadow.
- **RoundCard / SquareCard**: small ~80×86px thumbnails, slight bottom-right corner radius (5px).
- **Hero**: full-bleed cover image (`cover` on web, `contain` on native), title overlaid top-left
  with shadow; alternates light/dark ("even") card backgrounds for rhythm.
- Generous spacing scale used throughout: 4 / 8 / 16 / 24 / 32 / 96 px (margins/padding helpers).
- Pagination dots: 8×8px, mauve active, red inactive (40% opacity, 0.6 scale).
- Avatars: circular, 40px in lists.

---

## 4. Color Scheme (port these tokens)

Source: `kahaniapp/src/constants/Colors.ts`.

### Brand / accents
| Token | Hex | Use |
|-------|-----|-----|
| **brandPrimary** | `#d22f27` | Primary brand red (buttons, active accents) |
| red (secondary) | `#ff0000` | Theme secondary, error/inactive dots |
| **mauve** (primary) | `#BB86FC` | Theme primary, links, handles, active dots, edit icons |
| mauve80 | `rgba(187,134,252,0.8)` | mauve at 80% |
| moreBlue | `#357af6` | occasional blue accent |
| castConnectDeviceText | `#58b1e2` | light-blue accent |

### Dark UI chrome (Netflix-style greys)
| Token | Hex | Use |
|-------|-----|-----|
| **bgGrey** | `#191919` | App/container background |
| black2 | `#121212` | Material dark surface base |
| headerBarBg | `#1b1b1b` | Header/app bar background |
| castGrey | `#303030` | Cast/secondary surface |
| searchBarBg | `#323232` | Search field background |
| searchHeadingBg | `#3a3a3a` | Search section heading bg |
| downloadsIconBg | `#404040` | Icon chip background |
| ink | `#1a1917` | Near-black text on light cards |
| black | `#000` | Pure black (splash, nav header) |

### Text greys
| Token | Hex | Use |
|-------|-----|-----|
| heading | `#e6e6e6` | Headings on dark |
| textGrey | `#b3b3b3` | Body text on dark |
| infoGrey | `#a4a4a4` | Secondary info |
| gray | `#888888` | Muted text |
| inactiveGrey | `#727272` | Inactive icon/text |
| searchIcon | `#7f7f7f` | Icon grey |

### Light surfaces & neutrals
| Token | Hex | Use |
|-------|-----|-----|
| **page** | `#f5f5f5` | Card ("page") surface background |
| white | `#fff` | Card bg, text on dark, image bg |
| grey | `#eee` | Light divider/bg |

### Status
| Token | Hex |
|-------|-----|
| errorBackground / errorText | `red` / `#fff` |
| warningBackground / warningText | `#EAEB5E` / `#666804` |
| noticeBackground / noticeText | `#2f95dc` (tint) / `#fff` |
| tintColor | `#2f95dc` |

### Alpha overlays (very common — for scrims over imagery)
- Black: `black20 .2`, `black40 .4`, `black50 .5`, `black70 .7`, `black90 .9` (rgba on #000)
- White: `white10 .1`, `white40 .4`, `white70 .7`, `white90 .9` (rgba on #fff)
- Tab bar uses `black70`; status bar scrim `rgba(0,0,0,0.3)`.

### Suggested CSS custom properties for the new web app
```css
:root {
  /* brand */
  --brand-primary: #d22f27;   /* red */
  --accent-mauve:   #BB86FC;  /* primary / links */
  --accent-error:   #ff0000;

  /* dark chrome */
  --bg:             #191919;
  --surface-dark:   #121212;
  --header-bg:      #1b1b1b;
  --surface-2:      #303030;
  --search-bg:      #323232;

  /* light surfaces */
  --card-bg:        #f5f5f5;  /* "page" */
  --white:          #ffffff;

  /* text */
  --text-strong:    #e6e6e6;
  --text-body:      #b3b3b3;
  --text-muted:     #888888;
  --text-inactive:  #727272;
  --ink:            #1a1917;  /* text on light cards */

  /* scrims */
  --scrim-70:       rgba(0,0,0,.7);
  --scrim-50:       rgba(0,0,0,.5);
  --scrim-30:       rgba(0,0,0,.3);

  /* shape */
  --radius-pill:    24px;
  --radius-card:    5px;
}
```

---

## 5. Component Vocabulary (old → maps cleanly to new app's component map)

| Old (RN) | Role | New app equivalent (per CLAUDE.md) |
|----------|------|------------------------------------|
| HeroCard / HeroSlider | Auto-playing cover carousel | `HeroCarousel`, `HeroCard` |
| StoryCard | Story summary w/ avatar, universe, synopsis, reactions | `StoryCard` / `StoryList` |
| PageCard | Page/scene card | `PageCard` / `PageList` |
| SquareCard | Author/thumbnail square | `SquareCard` |
| RoundCard | Character thumbnail | `RoundCard` / `RoundCarousel` |
| SlimCard | Compact author row | `SlimCard` / `SlimList` |
| ReactionsStrip / Reactions | View/Love/Follow strip | `ReactionsStrip` |
| CompositeScreen / CompositeScroller | Section-list page scaffold | `BrowsePanel` / panels |
| Single/Multiple FloatingButton (FAB) | Create actions | floating create button |
| Avatar / Logo / Header / Background | atoms | `AvatarImage` / `CoverImage` / `AuthorByline` |

### Card anatomy notes
- **StoryCard**: left column = author **Avatar** (40px, tappable → author); middle = mauve universe
  "handle" (caption), bold **Title** (ink color), synopsis (≤8 lines), optional cover image that
  alternates left/right by index parity; bottom = ReactionsStrip. Surface bg `#f5f5f5`.
- **HeroCard**: full-height image with overlaid 30px bold shadowed title; supports inline edit mode
  (TextInputs + image picker + Revert/Create buttons) when the viewer is the author.
- **Composite pattern**: every detail screen = a list of typed sections (HERO / STORY / PAGE /
  SQUARE / ROUND / SLIM card types) with per-section `press`/`longPress` actions. The new app's
  panel system can mirror this declarative section model.

---

## 6. Porting Checklist for the New Web App

- [ ] Apply the dark chrome (`#191919` bg, `#1b1b1b` header) with light **`#f5f5f5` cards** floating on it.
- [ ] Use **red `#d22f27`** as primary CTA color and **mauve `#BB86FC`** for links / active states / handles.
- [ ] Pill buttons (radius 24), small-radius cards (radius 5), circular 40px avatars.
- [ ] Hero **carousel** of featured universes on home (auto-play, pagination dots: mauve active / red inactive). (New app already wires `HeroCarousel` → `/api/universes?featured=true`.)
- [ ] Home sections: Hero universes → Authors strip → Latest Stories list.
- [ ] **Reactions strip** with View(eye) / Love(heart) / Follow(compass), outline↔filled, optimistic ±1.
- [ ] Branching page UX: per page, offer **Next** and **Alternate** create actions.
- [ ] Inline author editing (edit-in-place title/synopsis, cover image upload) for owned content.
- [ ] Author profile = stacked carousels (Universes / Characters / Stories / Pages).
- [ ] Auth copy: "Welcome back.", "Sign up", case-sensitive username/password, generic error message.
- [ ] Originality attestation step before publishing.
- [ ] Genre/era/world metadata on universes & genre tags on stories.

> Note: The new app's `CLAUDE.md` already defines a matching component map (cards/lists/panels/shell)
> and breakpoint-driven shells (Wide/Medium/Narrow). This reference fills in the **visual tokens,
> color values, copy, and interaction semantics** to make the new web app feel like the old one.
