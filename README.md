# C++ Forge

**Learn C++, then Unreal Engine C++, with deep, interactive lessons.** C++ Forge is a
Windows and Android app in the spirit of Sololearn and Duolingo, with more depth: every
lesson explains *why* the language or engine works the way it does, shows what happens
under the hood, and checks your understanding with questions whose feedback teaches.

- **Two complete courses**
  - **C++ Fundamentals:** 17 units and 66 lessons, from how the compiler sees your code
    through memory, classes, templates, the STL, error handling, building real
    programs and concurrency.
  - **Unreal Engine C++:** 16 units and 56 lessons covering reflection and the UObject
    system, actors and components, Blueprint exposure, the gameplay framework, Enhanced
    Input, delegates, collision, timers, memory, interfaces, data-driven design,
    networking and debugging. It ends with three capstone features.
- **Rich lessons:** annotated code (tap a line to see why it is there), memory diagrams
  with pointer arrows, do/don't comparisons, step-by-step processes, collapsible deep
  dives, "Why?" boxes, and "In Unreal Engine" notes that connect the two courses.
- **Five question types:** multiple choice (every option explains why it is right or
  wrong), true/false, fill in the blank (tap a word bank or type), put the lines in
  order, and find the bug. Questions you miss come back at the end of the lesson and
  later in spaced-repetition review.
- **Real code:** every runnable C++ example is compiled and run with GCC, and its output
  is checked, before each build. A **Run** button opens any example in Compiler Explorer.
- **Library:** a searchable glossary of 640+ terms (tap any underlined term in a lesson
  for an instant definition), 23 cheat sheets, bookmarks, and a "read as notes" view of
  every lesson.
- **Motivation:** XP, levels, a daily goal, streaks, an activity heatmap, achievements,
  confetti, and synthesized sound effects with haptics. Sound and haptics can each be
  turned off.
- **Make it yours:** System, Light, Dark and Midnight (OLED) themes, five accent
  colours, adjustable text and code size, an "always dark" code theme, reduced motion,
  and "unlock all lessons" for experienced learners.
- **Private and offline:** no account and no network needed. Progress stays on your
  device, and you can export or import it to move between your PC and phone.

## Getting the apps

The GitHub Actions workflow in `.github/workflows/build.yml` builds both apps on every push:

| Artifact | Contains | Use it for |
|---|---|---|
| `windows-installer-x64` | `CppForge-Setup-<version>-x64.exe` | Most Windows 10/11 PCs |
| `windows-installer-arm64` | `CppForge-Setup-<version>-arm64.exe` | Windows on ARM (e.g. Snapdragon laptops) |
| `windows-portable-x64` | `CppForge-Portable-<version>.exe` | Running without installing |
| `android` | `CppForge-debug.apk` | Android 7.0+; sideload with "Install unknown apps" turned on |

To download them, open the repository's **Actions** tab, pick the latest **Build apps**
run, and download the artifact you need (GitHub delivers it as a .zip containing the file).
Windows SmartScreen may warn about an unsigned app the first time; choose
**More info → Run anyway**. Pushing a tag such as `v1.0.0` also attaches every file to a
GitHub **Release**.

### Signed Android release builds (optional)

To produce a signed `CppForge-release.apk` and a Play Store `.aab`, add these repository
secrets:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | your keystore file, base64-encoded (`base64 -w0 release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

Create a keystore with
`keytool -genkey -v -keystore release.keystore -alias cppforge -keyalg RSA -keysize 2048 -validity 10000`.

## Building locally

Requirements: Node.js 22+, plus g++ 13+ for the example checks.

```bash
npm install
npm run dev              # web version with hot reload at http://localhost:5173
npm run check            # type-check + validate all lesson content
npm run compile-examples # compile and run every C++ example with g++
```

**Windows app** (run on Windows):

```bash
npm run electron:dev     # build and launch the desktop app
npm run dist:win         # create the installer and portable .exe in release/
```

**Android app** (requires Android Studio, or the Android SDK and JDK 21):

```bash
npm run android:sync     # build the web app and copy it into android/
npm run android:open     # open the project in Android Studio, then press Run
# or, from the command line:
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

## How it's built

A single React + TypeScript codebase (built with Vite) runs everywhere:

- **Windows:** [Electron](https://www.electronjs.org/) (`electron/`) loads the built app
  from a sandboxed `app://` scheme. It uses a native title-bar overlay that follows the
  app theme, and opens external links in your browser.
- **Android:** [Capacitor](https://capacitorjs.com/) (`android/`) wraps the same build. It
  draws edge-to-edge with safe-area insets and themed system bars, uses the hardware
  back button, and gives haptic feedback.

```
src/
  content/            all course content as typed data (see docs/CONTENT_GUIDE.md)
    types.ts          the content model: lessons, blocks, questions, glossary, cheat sheets
    cpp/<unit>/       one file per lesson + unit glossary
    unreal/<unit>/
    glossary/ cheatsheets/
  components/         code blocks + syntax highlighter, rich text, diagrams, modals…
  questions/          the five interactive question types
  screens/            home, course map, lesson player, practice, library, profile, settings
  lib/                state & persistence, spaced repetition, sound, haptics, routing…
  styles/             design tokens (themes/accents) and component styles
scripts/
  validate-content.ts structural checks for every lesson, question and glossary link
  compile-examples.ts builds and runs every runnable example with g++
  curriculum.json     the course outline
electron/             Windows desktop shell
android/              Android project (Capacitor)
```

### Adding or editing lessons

Lessons are plain TypeScript data, so the type checker and `npm run validate` catch
mistakes before they ship. Read **[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)** for the
format, the quality bar, and the checks every lesson must pass.

---

Unreal Engine is a trademark of Epic Games, Inc. C++ Forge is an independent learning
resource and is not affiliated with or endorsed by Epic Games.
