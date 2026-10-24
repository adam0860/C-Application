import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'shipping-build',
    term: 'Shipping Build',
    aliases: ['Shipping configuration', 'Shipping'],
    course: 'unreal',
    category: 'Build',
    short:
      'The build configuration you release to players: fully optimized, with `check()`, `ensure()` reporting, debug drawing, the console and most logging compiled out by default.',
    long:
      'Unreal\'s main configurations are **Debug**, **DebugGame**, **Development** (what the editor normally runs), **Test** and **Shipping**. Development keeps every safety net; Shipping removes them for speed and size. Anything you rely on only through an assertion or a debug helper therefore disappears from the game players run, which is why expressions with side effects must never live inside `check()`.\n\nA project can opt back into checks in Shipping with `bUseChecksInShipping = true;` in its `Target.cs`.',
    see: ['check-macro', 'ensure-macro', 'verify-macro', 'target-cs'],
  },
  {
    id: 'console-variable',
    term: 'Console Variable (CVar)',
    aliases: ['CVar', 'cvar', 'TAutoConsoleVariable', 'FAutoConsoleVariableRef'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'A named engine setting such as `r.ScreenPercentage` or `MyGame.DrawAIDebug` that can be read by code and changed at run time from the console, config files or the command line.',
    long:
      'Declare your own with a file-scope `static TAutoConsoleVariable<T>` in a `.cpp` file and read it with `GetValueOnGameThread()`, or bind one to an existing variable with `FAutoConsoleVariableRef`. Flags such as `ECVF_Cheat` keep debug-only variables out of Shipping builds. Never declare one in a header: every file that includes it would try to register the same name.',
    example: `static TAutoConsoleVariable<int32> CVarDrawAIDebug(
    TEXT("MyGame.DrawAIDebug"), 0,
    TEXT("1 = draw AI debug shapes"), ECVF_Cheat);`,
    see: ['console-command', 'exec-function'],
  },
  {
    id: 'exec-function',
    term: 'Exec Function',
    aliases: ['UFUNCTION(Exec)', 'exec command'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'A `UFUNCTION(Exec)` that you can call by typing its name (and arguments) into the in-game console.',
    long:
      'The console only searches a fixed set of objects for exec functions: the local PlayerController, its possessed Pawn, its HUD, its CheatManager, the GameMode, the GameInstance and PlayerInput. Marking a function `Exec` on an arbitrary actor or component compiles but is never found. Exec functions run on the local machine only; affecting the server needs an RPC.',
    see: ['cheat-manager', 'console-command', 'ufunction'],
  },
  {
    id: 'cheat-manager',
    term: 'Cheat Manager',
    aliases: ['UCheatManager', 'CheatClass'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'A `UCheatManager` object owned by the PlayerController that hosts debug commands (`God`, `Fly`, `Slomo`…) and your own `Exec` cheats. It is created automatically in development builds and is unavailable in Shipping by default.',
    long:
      'Subclass `UCheatManager`, add `UFUNCTION(Exec)` functions, and set `CheatClass = UMyCheatManager::StaticClass();` in your PlayerController\'s constructor. Keeping cheats here, instead of scattered across gameplay classes, means they are compiled out of the shipped game together.',
    see: ['exec-function', 'player-controller', 'console-command'],
  },
  {
    id: 'gameplay-debugger',
    term: 'Gameplay Debugger',
    aliases: ['GDT', 'Gameplay Debugger Tool'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'An in-game overlay, toggled with the apostrophe key during play, that shows live debug data (AI, behavior trees, perception, navigation, abilities…) for the actor you are looking at.',
    long:
      'Each page of information is a *category* that can be toggled with the numpad keys. You can add your own category by subclassing `FGameplayDebuggerCategory` in a module that depends on the `GameplayDebugger` module. The activation key is configurable in Project Settings.',
    see: ['visual-logger', 'draw-debug'],
  },
  {
    id: 'editor-debug-symbols',
    term: 'Editor Debug Symbols',
    aliases: ['Editor symbols for debugging', 'PDB', 'debug symbols'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'The `.pdb` files that map the engine\'s machine code back to function names and source lines. Without them, engine frames in a crash call stack are unreadable.',
    long:
      'Your own module\'s symbols are produced every time you build it. For a launcher-installed engine, the engine\'s symbols are a separate, large optional download: in the Epic Games Launcher open **Library**, click the arrow next to **Launch** for your engine version, choose **Options** and tick **Editor symbols for debugging**. Source-built engines already have them.',
    see: ['call-stack', 'debugger'],
  },
  {
    id: 'access-violation',
    term: 'Access Violation',
    aliases: ['EXCEPTION_ACCESS_VIOLATION', 'segmentation fault', 'segfault'],
    course: 'unreal',
    category: 'Debugging',
    short:
      'The operating system stopping your program because it read or wrote memory it does not own, most often by dereferencing a null or dangling pointer. Unreal\'s crash reporter shows it as `EXCEPTION_ACCESS_VIOLATION`.',
    long:
      'The address in the message is a clue. A small address such as `0x0000000000000058` means "null pointer plus a member offset": you accessed a member through a pointer that was `nullptr`. A large, random-looking address usually means a dangling or uninitialized pointer, for example a raw pointer to an object the garbage collector already destroyed.',
    see: ['null-pointer', 'dangling-pointer', 'call-stack'],
  },
  {
    id: 'include-what-you-use',
    term: 'Include What You Use (IWYU)',
    aliases: ['IWYU'],
    course: 'unreal',
    category: 'Build',
    short:
      'The rule that every file includes exactly the headers it needs itself, no more, instead of relying on a giant shared header to pull everything in.',
    long:
      'Unreal\'s own code follows IWYU, and new projects are set up for it. Combined with [[forward-declaration|forward declarations]] in headers, it keeps each header\'s dependency chain short, so a change to one header recompiles only the files that really depend on it.',
    see: ['forward-declaration', 'header-file', 'include-directive'],
  },
];
