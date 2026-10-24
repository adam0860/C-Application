import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-logging',
  title: 'Logging and On-Screen Messages',
  summary:
    'UE_LOG and its verbosity levels, custom log categories, the Output Log, printf-style format specifiers (and why FStrings need a `*`), on-screen debug messages, and structured logging with UE_LOGFMT.',
  minutes: 15,
  objectives: [
    'Write `UE_LOG` calls with the right category, verbosity and format string',
    'Explain each verbosity level and how to filter or enable them at run time',
    'Declare and define a custom log category for your module',
    'Match format specifiers to argument types, and explain why an `FString` needs `*`',
    'Show on-screen debug messages with `GEngine->AddOnScreenDebugMessage` and log with `UE_LOGFMT` in UE 5.2+',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'UE_LOG: Unreal\'s std::cout',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course, `std::cout` was your window into a running program. A game has no console window to print to, so Unreal routes diagnostic text through its logging system instead. The workhorse is the [[ue-log]] macro:',
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `void AEnemy::ReceiveHit(float Damage) {
    Health -= Damage;
    UE_LOG(LogTemp, Warning,
        TEXT("%s took %.1f damage (%d HP left)"),
        *GetName(), Damage, FMath::RoundToInt(Health));
}`,
          output: 'LogTemp: Warning: BP_Grunt_C_1 took 12.5 damage (88 HP left)',
          annotations: [
            { lines: 3, text: 'Three fixed arguments come first: the [[log-category]] (`LogTemp` is a built-in general-purpose category), the [[log-verbosity|verbosity]] (`Warning`), then the format string.' },
            { lines: 4, text: 'A printf-style format string, wrapped in `TEXT()` because logging works with `TCHAR` strings.' },
            { lines: 5, text: 'The values for the placeholders, in order: a `TCHAR*` (from `*GetName()`), a `float` for `%.1f`, and an `int32` for `%d`.' },
          ],
        },
        {
          type: 'p',
          text: 'Each message is written to several places at once:',
        },
        {
          type: 'list',
          items: [
            'The **Output Log** in the editor (*Window → Output Log*), with search and filters for category and verbosity.',
            'A log file, `Saved/Logs/MyGame.log`, with a timestamp and frame number on every line — invaluable for bugs reported by testers.',
            'Your IDE\'s output window when the debugger is attached, and a console window if the game was started with `-log`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a macro instead of a function?',
          text: 'A macro can do things a function cannot: check the category\'s verbosity **before** evaluating any arguments (so a disabled message costs almost nothing), remove the whole call at compile time when a category or build configuration disables it, and capture the file and line for fatal errors. Logging every frame can still hurt performance, but logging that is switched off is nearly free.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Verbosity levels',
      blocks: [
        {
          type: 'p',
          text: 'The verbosity says how important a message is. The Output Log colours errors red and warnings yellow, and the editor collects them in its message log so they are hard to miss:',
        },
        {
          type: 'table',
          headers: ['Verbosity', 'What it means', 'Shown by default?'],
          rows: [
            ['`Fatal`', 'Logs the message, then **crashes deliberately**. Even works when logging is disabled.', 'Always'],
            ['`Error`', 'Something is broken. Collected by the editor; makes build/cook tools report failure.', 'Yes (red)'],
            ['`Warning`', 'Something is probably wrong but the game can continue.', 'Yes (yellow)'],
            ['`Display`', 'Important information, printed everywhere including console windows.', 'Yes'],
            ['`Log`', 'Normal information, written to the log file and Output Log.', 'Yes'],
            ['`Verbose`', 'Detailed tracing for one system.', 'No — enable per category'],
            ['`VeryVerbose`', 'Extremely detailed, potentially every frame.', 'No — enable per category'],
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Saved/Logs/MyGame.log',
          code: `[2025.03.14-10.21.07:412][118]LogTemp: Warning: Door has no sound
[2025.03.14-10.21.07:415][118]LogTemp: Spawned 12 enemies
[2025.03.14-10.21.09:003][213]LogTemp: Error: Wave data missing`,
          annotations: [
            { lines: 1, text: 'Timestamp, then frame number in brackets, then `Category: Verbosity: message`.' },
            { lines: 2, text: 'Messages at `Log` verbosity omit the verbosity label.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Enabling Verbose logs',
          text: 'Type `Log LogTemp Verbose` in the in-game console (the backtick key) to raise one category\'s verbosity while the game runs, or make it permanent in `Config/DefaultEngine.ini` under a `[Core.Log]` section with a line such as `LogMyGame=Verbose`. That is how you leave detailed tracing in your code without drowning everyone in it.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Logs vanish in Shipping',
          text: 'Shipping builds compile logging out by default (a target can opt back in with `bUseLoggingInShipping = true;`). Never rely on a log line for game behaviour, and never put work with side effects inside a `UE_LOG` argument — it may not run at all.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'order',
      prompt: 'Order the verbosity levels from most severe to least severe.',
      lines: ['Fatal', 'Error', 'Warning', 'Display', 'Log', 'Verbose', 'VeryVerbose'],
      explanation:
        'Severity decreases down the list, and so does visibility: `Fatal` always prints and then crashes, `Error` and `Warning` are collected and highlighted by the editor, `Display` and `Log` are routine messages, and `Verbose`/`VeryVerbose` are hidden unless you enable them for a category. A category\'s verbosity setting shows everything at that level **and above**.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Format specifiers, and why FStrings need *',
      blocks: [
        {
          type: 'p',
          text: '`UE_LOG` and `FString::Printf` use the same printf-style placeholders you may know from C. Each placeholder must match the type of its argument:',
        },
        {
          type: 'table',
          headers: ['Specifier', 'Argument type', 'Example'],
          rows: [
            ['`%d`, `%i`', '`int32` (and smaller integers)', '`TEXT("Score: %d"), Score`'],
            ['`%u`', '`uint32`', '`TEXT("Seed: %u"), Seed`'],
            ['`%lld`', '`int64`', '`TEXT("XP: %lld"), TotalXP`'],
            ['`%f`, `%.2f`', '`float` or `double`', '`TEXT("Speed: %.2f"), Speed`'],
            ['`%s`', '`const TCHAR*`', '`TEXT("Hi %s"), *Name`'],
            ['`%%`', 'A literal percent sign', '`TEXT("%d%%"), Percent`'],
          ],
        },
        {
          type: 'code',
          title: 'Logging Unreal types',
          code: `UE_LOG(LogTemp, Display, TEXT("Player: %s"), *PlayerName);
UE_LOG(LogTemp, Display, TEXT("Item: %s"),
    *ItemId.ToString());
UE_LOG(LogTemp, Display, TEXT("Title: %s"),
    *QuestTitle.ToString());
UE_LOG(LogTemp, Display, TEXT("At: %s"),
    *GetActorLocation().ToString());
UE_LOG(LogTemp, Display, TEXT("Alive: %s"),
    bIsAlive ? TEXT("true") : TEXT("false"));`,
          annotations: [
            { lines: 1, text: '`FString`: `*` returns a `const TCHAR*` to its characters.' },
            { lines: '2-3', text: '`FName`: convert with `ToString()` first, then `*`.' },
            { lines: '4-5', text: '`FText`: same pattern — `ToString()` then `*`.' },
            { lines: '6-7', text: 'Many engine types, including `FVector` and `FRotator`, have a `ToString()` for exactly this purpose.' },
            { lines: '8-9', text: 'There is no bool specifier; choose between two literals with the conditional operator.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does %s need *PlayerName and not PlayerName?',
          text: 'Printf-style functions receive their arguments through a C-style variadic parameter list (`...`), which carries **no type information**. The function trusts the format string: for `%s` it reads the next argument as a pointer to characters. An `FString` is not a pointer — it is an object containing a pointer, a length and a capacity — so passing the object itself would make the function misread its bytes. `*Str` hands over exactly what `%s` expects. UE5 adds compile-time checks that reject such arguments and catch many specifier mismatches, but they are guard rails on the same old mechanism.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Conditional logging',
          text: '`UE_CLOG(bCondition, LogTemp, Warning, TEXT("..."), ...)` logs only when the condition is true — tidier than wrapping a `UE_LOG` in an `if`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This code was copied from a UE4-era tutorial. In UE5 it fails to compile; in old engine versions it printed garbage or crashed. Tap the faulty line.',
      code: `void ATreasureChest::Open(const FString& ItemName,
                          int32 Gold) {
    UE_LOG(LogTemp, Display, TEXT("Chest opened"));
    UE_LOG(LogTemp, Display, TEXT("Found %s and %d gold"),
        ItemName, Gold);
}`,
      bugLines: [5],
      hint: 'What type does `%s` expect, and what type is `ItemName`?',
      explanation:
        '`%s` expects a `const TCHAR*`, but `ItemName` is an `FString` object. Through a C-style variadic call, the object\'s bytes would be misread as a pointer — undefined behavior that printed garbage or crashed in older engines. UE5\'s compile-time argument checks reject it outright. The fix is `*ItemName`, which returns the pointer to the string\'s characters.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Custom log categories',
      blocks: [
        {
          type: 'p',
          text: '`LogTemp` is fine for a quick experiment, but real projects give each system its own category: `LogInventory`, `LogAI`, `LogSaveGame`. A category is declared once in a header and defined once in a source file — the same declaration/definition split you learned for global variables:',
        },
        {
          type: 'code',
          title: 'MyGame.h',
          code: `#pragma once

#include "CoreMinimal.h"

DECLARE_LOG_CATEGORY_EXTERN(LogMyGame, Log, All);`,
          annotations: [
            { lines: 5, text: 'Declares the category for every file that includes this header. Arguments: the name (by convention starting with `Log`), the default **run-time** verbosity, and the **compile-time** verbosity (`All` keeps every level compiled in).' },
          ],
        },
        {
          type: 'code',
          title: 'MyGame.cpp',
          code: `#include "MyGame.h"
#include "Modules/ModuleManager.h"

DEFINE_LOG_CATEGORY(LogMyGame);

IMPLEMENT_PRIMARY_GAME_MODULE(
    FDefaultGameModuleImpl, MyGame, "MyGame");`,
          annotations: [
            { lines: 4, text: 'The single definition — exactly one `.cpp` file may contain it, or you get a duplicate-symbol linker error. The module\'s own `.cpp` is a natural home.' },
          ],
        },
        {
          type: 'code',
          title: 'Inventory.cpp',
          code: `#include "Inventory.h"
#include "MyGame.h"

DEFINE_LOG_CATEGORY_STATIC(LogInventory, Log, All);

void UInventory::AddItem(FName ItemId) {
    UE_LOG(LogMyGame, Log, TEXT("Inventory changed"));
    UE_LOG(LogInventory, Verbose, TEXT("Added %s"),
        *ItemId.ToString());
}`,
          annotations: [
            { lines: 2, text: 'Include the header that declares `LogMyGame` wherever you use it.' },
            { lines: 4, text: 'A category private to this one file: declaration and definition in one line, no header needed.' },
            { lines: '8-9', text: 'Hidden by default because it is `Verbose`. Run `Log LogInventory Verbose` in the console when you are debugging the inventory.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother with categories?',
          text: 'Categories let you **filter** the Output Log to one system, raise **one** system to `Verbose` without flooding the log with everyone else\'s detail, and **compile out** chatty levels entirely: a category declared with compile-time verbosity `Warning` removes its `Log` and `Verbose` lines from the binary. A codebase that logs everything to `LogTemp` loses all three.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Across modules',
          text: 'If other modules must log to your category, export it: `MYGAME_API DECLARE_LOG_CATEGORY_EXTERN(LogMyGame, Log, All);` — the same export macro you put on classes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Create a module-wide `LogMyGame` category and log a warning to it from another file.',
      template: `// MyGame.h
___(LogMyGame, Log, All);

// MyGame.cpp
___(LogMyGame);

// Inventory.cpp
UE_LOG(___, Warning, TEXT("Inventory is full"));`,
      blanks: [
        { answers: ['DECLARE_LOG_CATEGORY_EXTERN'] },
        { answers: ['DEFINE_LOG_CATEGORY'] },
        { answers: ['LogMyGame'] },
      ],
      wordBank: [
        'DECLARE_LOG_CATEGORY_EXTERN',
        'DEFINE_LOG_CATEGORY',
        'LogMyGame',
        'DEFINE_LOG_CATEGORY_STATIC',
        'LogTemp',
        'IMPLEMENT_MODULE',
        'Warning',
      ],
      explanation:
        'The header *declares* the category (`extern`, so every includer can see it) and exactly one `.cpp` *defines* it — the classic declaration/definition split. `DEFINE_LOG_CATEGORY_STATIC` is for a category private to one file and takes all three arguments. Logging to `LogTemp` would compile, but would throw away the filtering and per-category control you just set up.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'On-screen messages with AddOnScreenDebugMessage',
      blocks: [
        {
          type: 'p',
          text: 'Sometimes you want to see a value right in the game view while you play, without glancing at the log. The global engine object `GEngine` can draw [[on-screen-debug-message|debug text over the viewport]] — the C++ equivalent of the Blueprint **Print String** node:',
        },
        {
          type: 'code',
          title: 'PlayerCharacter.cpp',
          code: `void APlayerCharacter::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);

    if (GEngine) {
        GEngine->AddOnScreenDebugMessage(
            1, 0.5f, FColor::Green,
            FString::Printf(TEXT("Speed: %.0f"),
                GetVelocity().Size()));
    }
}

void APlayerCharacter::OnCheckpoint() {
    if (GEngine) {
        GEngine->AddOnScreenDebugMessage(
            -1, 5.f, FColor::Yellow,
            TEXT("Checkpoint reached!"));
    }
}`,
          annotations: [
            { lines: 4, text: '`GEngine` is a global pointer that can be null — for example in some tools or very early during start-up. Always check it.' },
            { lines: 6, text: 'Arguments: **key**, seconds to display, colour. Key `1` means "replace whatever message key 1 showed before", so this per-frame value updates in place instead of stacking up.' },
            { lines: '7-8', text: 'The message is an `FString`, so `Printf` builds it. `%.0f` prints the speed without decimals.' },
            { lines: 15, text: 'Key `-1` means "no key": always add a new line. Right for one-off events.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A debugging aid, not UI',
          text: 'On-screen messages are for development only. Player-facing text belongs in UMG widgets, built from `FText`. Typing `DisableAllScreenMessages` in the console hides debug messages when they get in the way.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Log and screen together',
          text: 'On-screen messages vanish after a few seconds. When you might need the information later, also write it with `UE_LOG` so it lands in the log file.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'You call `GEngine->AddOnScreenDebugMessage(-1, 2.f, FColor::Green, AmmoText);` every frame in `Tick`. The screen fills with a growing column of ammo readouts. What is the fix?',
      options: [
        {
          text: 'Use a fixed positive key such as `2`, so each call replaces the previous message',
          correct: true,
          why: 'A key identifies a message slot. With the same key every frame, the line updates in place.',
        },
        {
          text: 'Pass a display time of `0.f` but keep key `-1`',
          why: 'Changing the duration doesn\'t change that `-1` always adds a new message. Replacing in place is the job of the key.',
        },
        {
          text: 'Switch the colour to `FColor::Red`',
          why: 'Colour only affects appearance, not how many messages are queued.',
        },
        {
          text: 'Call it from `BeginPlay` instead of `Tick`',
          why: 'Then it would only show once, when play begins — not the live ammo count you wanted.',
        },
      ],
      explanation:
        'The first parameter is a key. `-1` means "always add a new message", which suits one-off events. For values you refresh every frame, use a positive key that is unique to that readout, so the engine overwrites the same line each time.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Structured logging with UE_LOGFMT (UE 5.2+)',
      blocks: [
        {
          type: 'p',
          text: 'UE 5.2 introduced [[ue-logfmt]], a modern alternative to printf-style logging. It uses named or numbered placeholders in braces, takes Unreal types directly, and checks argument types for you:',
        },
        {
          type: 'code',
          title: 'Combat.cpp',
          code: `#include "Logging/StructuredLog.h"

void UCombat::ApplyHit(const FString& Target, float Damage) {
    UE_LOGFMT(LogMyGame, Warning,
        "{Target} took {Damage} damage", Target, Damage);

    UE_LOGFMT(LogMyGame, Display,
        "Wave {0} cleared in {1} seconds", WaveIndex, Elapsed);

    UE_LOGFMT(LogMyGame, Error, "Failed to load {Asset}",
        ("Asset", AssetPath), ("Retries", RetryCount));
}`,
          annotations: [
            { lines: 1, text: 'Structured logging lives in its own header.' },
            { lines: '4-5', text: 'A plain string literal — no `TEXT()` — with named placeholders. Arguments fill them in order, and an `FString` is passed **directly**: no `*`, no specifier to get wrong.' },
            { lines: '7-8', text: 'Numbered placeholders work too.' },
            { lines: '10-11', text: 'Named fields as `("Name", Value)` pairs. Fields are stored with the message, so tools that read structured logs can search by them — even fields such as `Retries` that don\'t appear in the text.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'UE_LOG',
            tone: 'neutral',
            code: `UE_LOG(LogMyGame, Warning,
    TEXT("%s took %f damage"),
    *Target, Damage);`,
            text: 'Works in every engine version; you match specifiers to types and remember the `*`.',
          },
          right: {
            title: 'UE_LOGFMT',
            tone: 'good',
            code: `UE_LOGFMT(LogMyGame, Warning,
    "{Target} took {Damage} damage",
    Target, Damage);`,
            text: 'UE 5.2+: type-safe, readable placeholders, and the values are kept as named fields.',
          },
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Which should you use?',
          text: '`UE_LOG` is still everywhere — in the engine, in tutorials and in most existing projects — so you must be fluent in it. For new code on UE 5.2 or later, `UE_LOGFMT` is safer and easier to read. Both use the same categories and verbosity levels, and both end up in the same Output Log.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'truefalse',
      prompt: 'When logging an `FString` with `UE_LOGFMT`, you must still write `*Name` and wrap the format string in `TEXT()`.',
      answer: false,
      explanation:
        '`UE_LOGFMT` uses brace placeholders and type-aware argument handling, so you pass the `FString` itself, and the format is a plain string literal. The `*` and `TEXT()` requirements belong to printf-style APIs such as `UE_LOG` and `FString::Printf`, where the variadic arguments carry no type information.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which call correctly logs an `FName ItemId` and an `int32 Count` to your custom category?',
      codeOptions: true,
      options: [
        {
          text: 'UE_LOG(LogMyGame, Display, TEXT("%s x%d"), ItemId, Count);',
          why: 'An `FName` is not a `TCHAR*`. It must be converted with `ToString()` and then dereferenced with `*`.',
        },
        {
          text: 'UE_LOG(LogMyGame, Display, "%s x%d", *ItemId.ToString(), Count);',
          why: 'The format string is a narrow `char` literal. `UE_LOG` requires a `TCHAR` string, so it needs `TEXT()`.',
        },
        {
          text: 'UE_LOG(LogMyGame, Display, TEXT("%d x%s"), *ItemId.ToString(), Count);',
          why: 'The specifiers are in the wrong order: `%d` would receive the string pointer and `%s` the integer.',
        },
        {
          text: 'UE_LOG(LogMyGame, Display, TEXT("%s x%d"), *ItemId.ToString(), Count);',
          correct: true,
          why: '`TEXT()` format, `%s` matched with a `TCHAR*` from `*ItemId.ToString()`, `%d` matched with the `int32`.',
        },
      ],
      explanation:
        'A correct `UE_LOG` needs three things: a `TEXT()` format string, specifiers that match their arguments **in order**, and `TCHAR*` pointers for every `%s` — `*Str` for an `FString`, `*Name.ToString()` for an `FName`, `*Text.ToString()` for an `FText`. With `UE_LOGFMT` you could simply write `UE_LOGFMT(LogMyGame, Display, "{Item} x{Count}", ItemId, Count);`.',
    },
  ],
  takeaways: [
    '`UE_LOG(Category, Verbosity, TEXT("format"), args...)` writes to the Output Log, the log file in `Saved/Logs` and the debugger output.',
    'Verbosity runs from `Fatal` (logs then crashes) through `Error`, `Warning`, `Display` and `Log` to `Verbose`/`VeryVerbose`, which are hidden until enabled per category.',
    'Declare custom categories with `DECLARE_LOG_CATEGORY_EXTERN` in a header and `DEFINE_LOG_CATEGORY` in one `.cpp`, or `DEFINE_LOG_CATEGORY_STATIC` for a single file; reserve `LogTemp` for quick experiments.',
    'Printf-style specifiers must match argument types; `%s` needs a `TCHAR*`, so write `*Str`, `*Name.ToString()` or `*Text.ToString()`.',
    'Change verbosity at run time with the `Log <Category> <Verbosity>` console command or permanently in `[Core.Log]` in `DefaultEngine.ini`; logging is compiled out of Shipping by default.',
    '`GEngine->AddOnScreenDebugMessage(Key, Time, Color, Message)` draws debug text; key `-1` adds a new line, a fixed key updates one in place. Check `GEngine` for null.',
    'In UE 5.2+, `UE_LOGFMT` offers type-safe, structured logging with `{Name}` placeholders and no `*` or `TEXT()`.',
  ],
  reading: [
    {
      title: 'Logging in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/logging-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Categories, verbosity, the Output Log and the configuration options for logging.',
    },
    {
      title: 'Variadic functions',
      url: 'https://en.cppreference.com/w/cpp/utility/variadic',
      source: 'cppreference',
      note: 'How C-style `...` arguments work — and why they cannot carry type information, the root of the `*` rule.',
    },
    {
      title: 'std::printf and format specifiers',
      url: 'https://en.cppreference.com/w/cpp/io/c/fprintf',
      source: 'cppreference',
      note: 'The full specifier syntax that `UE_LOG` and `FString::Printf` inherit, including width and precision.',
    },
  ],
};
