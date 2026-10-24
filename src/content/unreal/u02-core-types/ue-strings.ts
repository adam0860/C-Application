import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-strings',
  title: 'FString, FName and FText',
  summary:
    'Unreal\'s three string types and the job each one does, the TEXT() macro and TCHAR, converting between them, and bridging to std::string.',
  minutes: 18,
  objectives: [
    'Explain what `TEXT()` does and why Unreal string literals need it',
    'Build and manipulate text with `FString`, including `Printf`, `Append` and the `*` operator',
    'Explain how `FName` achieves fast comparisons and where the engine uses it',
    'Create localizable text with `LOCTEXT`, `NSLOCTEXT` and `FText::Format`',
    'Convert between `FString`, `FName`, `FText` and `std::string` without losing data or creating dangling pointers',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Three string types, three jobs',
      blocks: [
        {
          type: 'p',
          text: 'Standard C++ gave you one main string type, [[std-string]], plus [[string-view]] for viewing text. Unreal has three owning string types, because a game uses text in three very different ways: text you **manipulate**, names you **compare**, and words the **player reads** in their own language.',
        },
        {
          type: 'table',
          headers: ['Type', 'Mutable?', 'Optimised for', 'Typical uses'],
          rows: [
            ['[[fstring]]', 'Yes', 'Building and editing text', 'Debug messages, file paths, parsing, save-slot names'],
            ['[[fname]]', 'No', 'Very fast comparison and small size', 'Bone and socket names, tags, asset and property names'],
            ['[[ftext]]', 'No', 'Localization and culture-aware formatting', 'Anything shown to the player: UI labels, dialogue, item descriptions'],
          ],
        },
        {
          type: 'code',
          title: 'All three in one function',
          code: `void ATreasureChest::Open(APlayerCharacter* Player) {
    const FName LidSocket(TEXT("Lid"));
    const FVector LidPos = Mesh->GetSocketLocation(LidSocket);

    const FString Debug = FString::Printf(
        TEXT("%s opened %s"), *Player->GetName(), *GetName());

    const FText Toast = NSLOCTEXT("Loot", "ChestOpened",
        "You found a treasure chest!");
    Player->ShowToast(Toast);
}`,
          annotations: [
            { lines: '2-3', text: 'An `FName` identifies a socket on the mesh. The engine compares socket names many times, so cheap comparison matters.' },
            { lines: '5-6', text: 'An `FString` built with `Printf` for the log — programmer-facing text that never needs translating.' },
            { lines: '8-9', text: 'An `FText` for the player. The localization tools can find this literal and translate it into every supported language.' },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Notepad, name badge, translated sign',
          text: '`FString` is a notepad: scribble, erase, append. `FName` is a numbered name badge: checking whether two people have the same badge number is instant, but you can\'t rewrite a badge. `FText` is an airport sign: it shows the same message in whatever language the traveller reads.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'TEXT() and TCHAR',
      blocks: [
        {
          type: 'p',
          text: 'Before looking at the types, you need the macro that appears around almost every string literal in Unreal: [[text-macro|TEXT()]]. Unreal strings store characters of type [[tchar|TCHAR]], the engine\'s own character type. On Windows `TCHAR` is `wchar_t` (16 bits, UTF-16); other platforms use an equivalent wide type. A plain literal like `"Hello"` is an array of narrow `char`, which is the wrong type.',
        },
        {
          type: 'p',
          text: '`TEXT("Hello")` expands to the literal form that matches `TCHAR` on the current platform — on Windows, `L"Hello"`, the wide-character literal you met in the C++ course. One macro, correct everywhere.',
        },
        {
          type: 'compare',
          left: {
            title: 'Narrow literal',
            tone: 'bad',
            code: `FString Name = "Knight";
UE_LOG(LogTemp, Display, "Hi");`,
            text: 'The first line compiles but converts from narrow characters at run time (and non-ASCII characters can be mangled). The second fails to compile: logging requires a `TCHAR` format string.',
          },
          right: {
            title: 'TEXT() literal',
            tone: 'good',
            code: `FString Name = TEXT("Knight");
UE_LOG(LogTemp, Display, TEXT("Hi"));`,
            text: 'The literal already has the type `FString` stores, so no conversion happens, and printf-style APIs accept it.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use char and UTF-8 everywhere?',
          text: 'Unreal\'s string design dates from a time when Windows — its main platform — used UTF-16 for all text APIs, so a wide character type was the efficient choice there. Different platforms define their wide characters differently, so Epic hid the decision behind `TCHAR` and `TEXT()`. The engine has been adding UTF-8 string types in UE5, but `TCHAR` remains the standard for `FString` and nearly all engine APIs.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'When TEXT() is not needed',
          text: 'The [[loctext]] macros take plain literals (they apply the right conversion themselves), and so does `UE_LOGFMT`, which you will meet in the logging lesson. Everywhere else — `FString`, `FName`, `UE_LOG`, `Printf` — use `TEXT()`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'What does wrapping a literal in `TEXT()` achieve?',
      options: [
        {
          text: 'It marks the string for translation by the localization tools',
          why: 'That is the job of `LOCTEXT`/`NSLOCTEXT`, which create `FText`. `TEXT()` only changes the character type of the literal.',
        },
        {
          text: 'It makes the literal a `TCHAR` string, matching what `FString` stores and what printf-style APIs require on every platform',
          correct: true,
          why: 'On Windows it becomes `L"..."`; on other platforms, the matching wide literal. No run-time conversion is needed.',
        },
        {
          text: 'It turns the literal into an `FName` stored in the name table',
          why: 'An `FName` is only created when you construct one, for example `FName(TEXT("Lid"))`.',
        },
        {
          text: 'It allocates an `FString` at compile time',
          why: '`TEXT()` produces a plain string literal — an array of characters in the executable. No `FString` is created until you construct one.',
        },
      ],
      explanation:
        '`TEXT()` is a tiny preprocessor macro that adds the right literal prefix for the platform\'s `TCHAR`. It exists because Unreal strings are not `char`-based, and it keeps the same source code correct on Windows, consoles, mobile and Linux.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'FString: the everyday string',
      blocks: [
        {
          type: 'p',
          text: '`FString` is the closest thing to `std::string`: it owns a growable, null-terminated buffer of `TCHAR`s, and you can change it freely. Pass it by `const FString&`, just as you passed `std::string` by const reference in the C++ course.',
        },
        {
          type: 'code',
          title: 'Working with FString',
          code: `FString Title = TEXT("Sir ");
Title.Append(PlayerName);
Title += TEXT(" the Brave");

const FString Status = FString::Printf(
    TEXT("%s: %d/%d HP (%.1f%%)"),
    *Title, Health, MaxHealth, Percent);

const int32 Length = Title.Len();
const bool bIsKnight = Title.Contains(TEXT("sir"));
const FString Shout = Title.ToUpper();

const FString Count = FString::FromInt(42);
const int32 Parsed = FCString::Atoi(*Count);`,
          annotations: [
            { lines: '1-3', text: '`Append` and `+=` modify the string in place; `+` creates a new one. Each may reallocate the buffer, as with `std::string`.' },
            { lines: '5-7', text: '`Printf` builds a string from a format, like C\'s `printf`: `%s` for strings, `%d` for integers, `%.1f` for one decimal, `%%` for a literal percent sign.' },
            { lines: 7, text: '**The `*` operator.** `%s` needs a `const TCHAR*`, not an `FString` object. `*Title` returns a pointer to the string\'s characters — the equivalent of `std::string::c_str()`.' },
            { lines: 9, text: '`Len()` returns the number of characters as `int32`, excluding the null terminator.' },
            { lines: 10, text: '`Contains` ignores case by default, so this finds "Sir". Pass `ESearchCase::CaseSensitive` to be strict.' },
            { lines: 11, text: '`ToUpper()` returns a new string; `ToUpperInline()` modifies this one. Many FString functions come in both flavours.' },
            { lines: '13-14', text: 'Number to text and back. `FCString` holds C-string helpers such as `Atoi` and `Atof` that operate on `TCHAR*`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '== ignores case',
          text: 'Unlike `std::string`, `FString`\'s `==` is **case-insensitive**: `FString(TEXT("Boss")) == TEXT("BOSS")` is `true`. That is usually what you want for things like file names, but when case matters, write `A.Equals(B, ESearchCase::CaseSensitive)`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'FString costs like std::string',
          text: 'Every `FString` owns heap memory, so copying it allocates and copies characters. Don\'t build strings every frame unless you need them, pass by `const FString&`, and use `FStringView` — Unreal\'s `std::string_view` — for read-only parameters when you want to accept literals without allocating.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: '`FString(TEXT("Dragon")) == FString(TEXT("dragon"))` evaluates to `false`, just like comparing two `std::string`s.',
      answer: false,
      explanation:
        '`FString::operator==` performs a **case-insensitive** comparison, so this is `true`. It is a frequent surprise for programmers coming from `std::string`. Use `Equals(Other, ESearchCase::CaseSensitive)` when the exact case matters, for example for passwords or case-sensitive IDs.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'FName: fast, immutable identifiers',
      blocks: [
        {
          type: 'p',
          text: 'An `FName` doesn\'t store characters at all. When you create one, the engine looks the string up in a global **name table** (adding it the first time it is seen) and the `FName` keeps only a small index into that table. Two `FName`s with the same text hold the same index, so comparing them is a single integer comparison — no matter how long the names are.',
        },
        {
          type: 'memory',
          caption: 'Many FNames, one copy of each string',
          regions: [
            {
              label: 'Your objects',
              kind: 'stack',
              cells: [
                { name: 'SocketA', type: 'FName', value: 'index 812', pointsTo: 'hand' },
                { name: 'SocketB', type: 'FName', value: 'index 812', pointsTo: 'hand' },
                { name: 'Tag', type: 'FName', value: 'index 4071', pointsTo: 'boss' },
              ],
            },
            {
              label: 'Global name table (lives for the whole program)',
              kind: 'static',
              cells: [
                { id: 'hand', address: '812', value: '"hand_r"' },
                { id: 'boss', address: '4071', value: '"Boss"' },
              ],
            },
          ],
        },
        {
          type: 'code',
          title: 'FName in gameplay code',
          code: `static const FName MuzzleSocket(TEXT("Muzzle"));
const FVector Muzzle =
    WeaponMesh->GetSocketLocation(MuzzleSocket);

if (OtherActor->ActorHasTag(TEXT("Boss"))) {
    DamageMultiplier = 0.5f;
}

if (CurrentWeaponId == NAME_None) {
    EquipDefaultWeapon();
}`,
          annotations: [
            { lines: 1, text: 'Creating an `FName` from text costs a hash-table lookup. A `static const` local does it **once**, then every call reuses the result.' },
            { lines: 3, text: 'Sockets and bones on meshes are identified by `FName` throughout the engine.' },
            { lines: 5, text: 'Actor tags are a `TArray<FName>`. This line builds a temporary `FName` from the literal on every call — fine for occasional checks, but cache it in hot code.' },
            { lines: 9, text: '`NAME_None` is the "empty" name, the `FName` equivalent of an empty string. `CurrentWeaponId.IsNone()` does the same check.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Immutable:** there is no way to append to or edit an `FName`; you make a new one.',
            '**Case-insensitive:** `FName(TEXT("Boss")) == FName(TEXT("BOSS"))` is `true`.',
            '**Small:** usually 8 bytes in a packaged game (slightly more in the editor), cheap to copy and store in large arrays.',
            '**Used everywhere the engine identifies things:** bone and socket names, tags, asset and object names, property names, collision profile names.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The name table never shrinks',
          text: 'Entries are never removed while the program runs. Making `FName`s from unbounded data — chat messages, player-typed text, random numbers — slowly leaks memory. Use `FName` for a known, limited vocabulary of identifiers and `FString` for arbitrary text.',
        },
        {
          type: 'deepdive',
          title: 'Why "Enemy_42" doesn\'t create a new table entry',
          blocks: [
            {
              type: 'p',
              text: 'Objects are often named with numeric suffixes: `Enemy_0`, `Enemy_1`… `Enemy_9999`. If each were a separate table entry, the table would bloat. So `FName` splits a trailing `_number` off and stores it separately: `Enemy_42` is the table entry `"Enemy"` plus the number 42 inside the `FName` itself. Ten thousand enemies share one entry. (Suffixes with leading zeros, such as `_042`, are kept as part of the string, because the number alone couldn\'t reproduce the text.)',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'Your animation code checks a bone name against 40 known bone names every frame for every character. Which type should the bone names be, and why?',
      options: [
        {
          text: '`FString`, because it supports case-insensitive comparison',
          why: 'Comparing `FString`s walks the characters one by one, and storing 40 of them means 40 heap buffers. Case-insensitivity isn\'t unique to `FString` either.',
        },
        {
          text: '`FText`, because bone names might need translating',
          why: 'Bone names are internal identifiers, never shown to players. `FText` is the heaviest of the three and isn\'t meant for comparisons.',
        },
        {
          text: '`FName`, because each comparison is a single integer compare and the engine identifies bones by `FName` anyway',
          correct: true,
          why: 'All the string work happens once when the names are created; after that, comparisons are as cheap as comparing two integers.',
        },
        {
          text: '`const char*`, because raw pointers are the fastest',
          why: 'Comparing C strings by content still means `strcmp` over characters, and comparing the pointers compares addresses, not names. Engine APIs expect `FName` anyway.',
        },
      ],
      explanation:
        '`FName` trades a one-time lookup at creation for constant-time comparison afterwards. That makes it ideal for a limited vocabulary of identifiers that are compared often: bones, sockets, tags, asset names. Create them once (`static const` locals or members) rather than constructing them from literals in hot loops.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'FText: text the player reads',
      blocks: [
        {
          type: 'p',
          text: 'Any text a player sees should be an `FText`. It carries not just characters but a **localization identity** — a namespace and a key — so the engine can display the right translation for the player\'s language. The localization tools gather these entries straight from your source code and assets.',
        },
        {
          type: 'code',
          title: 'InventoryWidget.cpp',
          code: `#define LOCTEXT_NAMESPACE "Inventory"

FText UInventoryWidget::GetPickupMessage(
    const FText& ItemName, int32 Count) const {
    FFormatNamedArguments Args;
    Args.Add(TEXT("Count"), FText::AsNumber(Count));
    Args.Add(TEXT("Item"), ItemName);
    return FText::Format(
        LOCTEXT("PickupMessage", "You picked up {Count} {Item}"),
        Args);
}

FText UInventoryWidget::GetEmptyMessage() const {
    return LOCTEXT("EmptyBag", "Your bag is empty.");
}

#undef LOCTEXT_NAMESPACE`,
          annotations: [
            { lines: 1, text: '`LOCTEXT` needs a namespace for its entries. Define it at the top of a `.cpp` file…' },
            { lines: 6, text: '`FText::AsNumber` formats for the player\'s culture: 12,500 in English, 12.500 in German.' },
            { lines: '8-10', text: '`FText::Format` fills named placeholders. Translators receive the *whole* pattern, `"You picked up {Count} {Item}"`, and may reorder the placeholders as their grammar requires.' },
            { lines: 9, text: '`LOCTEXT(Key, SourceText)`: the key must be unique within the namespace; the source text is the original-language string. Plain literal — no `TEXT()`.' },
            { lines: 17, text: '…and undefine it at the end, so it doesn\'t leak into other files when unity builds glue `.cpp` files together.' },
          ],
        },
        {
          type: 'p',
          text: 'In a header, or anywhere you don\'t want to define a namespace, use `NSLOCTEXT("Inventory", "EmptyBag", "Your bag is empty.")`, which takes the namespace explicitly. For text that must **not** be translated — a player\'s chosen name, a server address — use `FText::FromString(Str)`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not build UI text by concatenating FStrings?',
          text: '`TEXT("You picked up ") + Count + TEXT(" ") + Item` hard-codes English word order. Other languages put the number after the noun, change the noun\'s form with the count, or need different grammar entirely. Translators can only fix that if they get the whole sentence as one pattern with placeholders — which is what `FText::Format` provides. Concatenated text is impossible to translate correctly.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'FText is immutable and has no ==',
          text: 'You never edit an `FText`; you create a new one. It also deliberately has no `==` operator, because "equal" is ambiguous for localized text. Use `A.EqualTo(B)` when you must compare, and `IsEmpty()` to test for empty text — but if you find yourself comparing display text, an `FName` or enum is usually the better tool.',
        },
        {
          type: 'deepdive',
          title: 'Plurals inside the pattern',
          blocks: [
            {
              type: 'p',
              text: '`FText::Format` supports argument modifiers, such as plural forms chosen by the count: `"{Count} {Count}|plural(one=arrow,other=arrows)"` renders "1 arrow" and "5 arrows". Translators can supply the plural categories their own language uses, which a hard-coded `Count == 1 ? "arrow" : "arrows"` could never handle.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'fill',
      prompt: 'Complete this localizable score message.',
      template: `#define ___ "HUD"

FText AMyHUD::MakeScoreText(int32 Score) const {
    return FText::___(
        ___("ScoreLine", "Score: {0}"),
        FText::AsNumber(Score));
}

#undef LOCTEXT_NAMESPACE`,
      blanks: [{ answers: ['LOCTEXT_NAMESPACE'] }, { answers: ['Format'] }, { answers: ['LOCTEXT'] }],
      wordBank: ['LOCTEXT_NAMESPACE', 'Format', 'LOCTEXT', 'TEXT', 'Printf', 'FromString', 'NAMESPACE'],
      explanation:
        '`LOCTEXT` reads the `LOCTEXT_NAMESPACE` macro, so it must be defined first (and undefined at the end of the file). `FText::Format` fills the `{0}` placeholder with an already-localized number. `TEXT` would give a plain literal with no localization identity, `FromString` would produce text that is never translated, and `Printf` builds an `FString`, which is not meant for UI.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Converting between the three — and choosing',
      blocks: [
        {
          type: 'p',
          text: 'Conversions are explicit, so each one is a visible decision. Some are cheap; some lose information:',
        },
        {
          type: 'table',
          headers: ['From → To', 'Code', 'Watch out for'],
          rows: [
            ['`FString` → `FName`', '`FName(*Str)`', 'Adds an entry to the name table permanently'],
            ['`FName` → `FString`', '`Name.ToString()`', 'Allocates a new string every call'],
            ['`FString` → `FText`', '`FText::FromString(Str)`', 'The result is not localizable'],
            ['`FText` → `FString`', '`Text.ToString()`', 'A snapshot in the *current* language; the localization identity is lost'],
            ['`FName` → `FText`', '`FText::FromName(Name)`', 'Not localizable either'],
            ['Number → text', '`FString::FromInt(N)`, `FText::AsNumber(N)`', 'Only `AsNumber` is culture-aware'],
          ],
        },
        {
          type: 'code',
          title: 'Typical conversions',
          code: `const FName ItemId(TEXT("HealthPotion"));
const FString IdAsString = ItemId.ToString();
const FName SameId(*IdAsString);

const FText Display = FText::FromString(PlayerName);
const FString ForLog = SomeText.ToString();

UE_LOG(LogTemp, Display, TEXT("Item %s"),
    *ItemId.ToString());`,
          annotations: [
            { lines: '2-3', text: 'Round trip: `FName` → `FString` → `FName`. `SameId == ItemId` is `true`, and comparing them is an integer compare.' },
            { lines: 5, text: 'A player-chosen name is shown in the UI but must not be translated, so `FromString` is the right choice here.' },
            { lines: 6, text: 'Fine for logs and debugging. Never convert UI text to `FString`, edit it, and convert back: the result can no longer be translated.' },
            { lines: '8-9', text: 'An `FName` can\'t go straight into `%s`. Convert it with `ToString()`, then use `*` to get the `TCHAR*`.' },
          ],
        },
        {
          type: 'table',
          headers: ['If the text is…', 'Use'],
          rows: [
            ['Built, edited, parsed, logged, or a file path', '`FString`'],
            ['An identifier from a limited set, compared often (bones, sockets, tags, IDs)', '`FName`'],
            ['Shown to the player', '`FText`'],
            ['Read-only input to a function, no ownership needed', '`FStringView` (or `const FString&`)'],
          ],
          caption: 'Which string type to use',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: 'A quest title appears in the quest journal UI, and the game ships in 12 languages. Which type should the title be?',
      options: [
        {
          text: '`FString`',
          why: 'It would display, but the localization tools can\'t find or translate it, so every player would see the original language.',
        },
        {
          text: '`FName`',
          why: '`FName` is for identifiers that are compared, not for display. It is case-insensitive, has no localization data, and arbitrary titles would bloat the name table.',
        },
        {
          text: '`FText`, created with `LOCTEXT`/`NSLOCTEXT` (or stored in an asset as `FText`)',
          correct: true,
          why: 'Player-facing text needs a localization identity so the engine can show the right translation.',
        },
        {
          text: '`std::string`, converted to an `FString` when displayed',
          why: '`std::string` can\'t be a `UPROPERTY`, isn\'t localizable, and needs conversions to reach any engine API.',
        },
      ],
      explanation:
        'The rule is simple: if a player reads it, it is `FText`. The quest might still have an `FName` **ID** (such as `Quest_RescueTheSmith`) for code to compare and look up — identifiers and display text are separate concerns, and Unreal gives each its own type.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The bridge to std::string',
      blocks: [
        {
          type: 'p',
          text: 'Third-party libraries — networking SDKs, JSON parsers, platform services — usually speak `std::string` or `const char*` in UTF-8. Unreal provides conversion macros for crossing that border:',
        },
        {
          type: 'code',
          title: 'Converting to and from UTF-8',
          code: `#include <string>

// Library -> Unreal
const std::string StdName = ChatSdk::GetDisplayName();
const FString Name = UTF8_TO_TCHAR(StdName.c_str());

// Unreal -> library
const std::string Message = TCHAR_TO_UTF8(*ChatText);
ChatSdk::Send(Message);`,
          annotations: [
            { lines: 5, text: '`UTF8_TO_TCHAR` converts UTF-8 bytes to `TCHAR`s; the `FString` copies them, so the result is safe to keep. Accented letters and emoji survive.' },
            { lines: 8, text: '`TCHAR_TO_UTF8` produces a temporary UTF-8 buffer. Copying it into a `std::string` within the same statement is safe.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The conversion result is a temporary',
          text: 'These macros create a hidden converter object that lives only until the end of the **full expression** — the semicolon. A `const char*` saved from `TCHAR_TO_UTF8(...)` points into memory that is gone by the next line: a [[dangling-pointer]], exactly like keeping `.c_str()` of a temporary `std::string`. Copy the result into a `std::string`, or keep a named converter object alive with `FTCHARToUTF8 Utf8(*Text);` and use `Utf8.Get()` and `Utf8.Length()`.',
        },
        {
          type: 'table',
          headers: ['Standard C++', 'Closest Unreal type', 'Key difference'],
          rows: [
            ['`std::string`', '`FString`', '`TCHAR` instead of `char`; `==` is case-insensitive; can be a `UPROPERTY`'],
            ['`std::string_view`', '`FStringView`', 'Same idea: a non-owning view'],
            ['(interned strings / symbols)', '`FName`', 'No standard equivalent; a global table of unique strings'],
            ['(nothing)', '`FText`', 'Localization is outside the scope of the C++ standard library'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep std types at the edges',
          text: 'Convert at the boundary with the library, and use Unreal types everywhere else. That way reflection, the editor, Blueprints and serialization all work, and the `std::string` code stays confined to one small wrapper class.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'This wrapper around a third-party chat SDK crashes or sends garbage — but only sometimes. Tap the line that causes it.',
      code: `void UChatBridge::Send(const FString& Message) {
    const char* Utf8 = TCHAR_TO_UTF8(*Message);
    ChatSdk::Queue(Utf8);
    ChatSdk::Flush();
}`,
      bugLines: [2],
      hint: 'How long does the result of `TCHAR_TO_UTF8` live?',
      explanation:
        '`TCHAR_TO_UTF8` creates a temporary converter whose buffer is destroyed at the end of line 2. `Utf8` then dangles, and reading it on line 3 is [[undefined-behavior]]: it may appear to work (the memory hasn\'t been reused yet), print garbage, or crash — hence "only sometimes". Fix it by keeping the converted data alive: `const std::string Utf8 = TCHAR_TO_UTF8(*Message);` and pass `Utf8.c_str()`, or use a named `FTCHARToUTF8 Utf8(*Message);` and pass `Utf8.Get()`.',
    },
  ],
  takeaways: [
    'Unreal has three owning string types: `FString` for text you manipulate, `FName` for identifiers you compare, and `FText` for anything the player reads.',
    'Wrap literals in `TEXT()` so they match `TCHAR`, the engine\'s character type; `LOCTEXT`, `NSLOCTEXT` and `UE_LOGFMT` take plain literals.',
    '`FString` is like `std::string` but its `==` ignores case; use `*Str` to get the `const TCHAR*` that `%s` expects.',
    '`FName` stores an index into a global name table, so comparisons are integer compares; the table never shrinks, so keep `FName`s to a limited vocabulary.',
    '`FText` carries localization data; build it with `LOCTEXT`/`NSLOCTEXT` and `FText::Format` patterns rather than concatenation.',
    'Conversions are explicit; `FText::ToString()` loses localization and `FText::FromString()` produces untranslatable text.',
    'Cross to `std::string` with `UTF8_TO_TCHAR` and `TCHAR_TO_UTF8`, and never keep a pointer to the temporary result.',
  ],
  reading: [
    {
      title: 'String Handling in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/string-handling-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Overview of `FString`, `FName` and `FText`, with conversion tables.',
    },
    {
      title: 'FText in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/ftext-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Creating, formatting and comparing localized text, including argument modifiers such as plurals.',
    },
    {
      title: 'std::basic_string',
      url: 'https://en.cppreference.com/w/cpp/string/basic_string',
      source: 'cppreference',
      note: 'The standard string you are bridging from — compare its interface with `FString`\'s.',
    },
  ],
};
