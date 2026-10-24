import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-assertions',
  title: 'check, verify and ensure',
  summary:
    'Unreal\'s assertion macros: which ones halt, which ones survive Shipping, and how to pick the right one.',
  minutes: 17,
  objectives: [
    'Explain what `check` and `checkf` do and why they disappear from Shipping builds',
    'Use `verify` when an expression\'s side effect must still happen in Shipping',
    'Write the `if (!ensure(Ptr)) return;` pattern and explain why `ensure` reports only once',
    'Use `checkNoEntry`, `unimplemented` and `PURE_VIRTUAL` for code that must never run',
    'Choose between an assertion and a plain `if` for a given situation, including untrusted network input',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Assumptions you can execute',
      blocks: [
        {
          type: 'p',
          text: 'Every function you write rests on assumptions: "this component was created in the constructor", "this index is in range", "this enum only has three values". An [[assertion]] turns such an assumption into code. If the assumption is ever false, the program stops loudly *at the point where it went wrong*, instead of limping on and crashing somewhere unrelated ten seconds later.',
        },
        {
          type: 'p',
          text: 'In standard C++ you met `assert` from `<cassert>`, which is compiled out when `NDEBUG` is defined. Unreal replaces it with a family of macros declared in `Misc/AssertionMacros.h` (already included through `CoreMinimal.h`). They do more than `assert`: they write the failed expression, file and line to the log, capture a [[call-stack]], break into an attached [[debugger]], and hand the crash to Unreal\'s crash reporter.',
        },
        {
          type: 'table',
          headers: ['Build configuration', '`check` / `verify` halt?', '`ensure` reports?'],
          rows: [
            ['Debug, DebugGame', 'Yes', 'Yes'],
            ['Development (incl. Development Editor)', 'Yes', 'Yes'],
            ['Test', 'No (by default)', 'No (by default)'],
            ['Shipping', 'No (by default)', 'No (by default)'],
          ],
          caption: 'Which safety nets exist in each [[build-configuration|build configuration]]. A project can re-enable them with `bUseChecksInShipping = true;` in its Target.cs.',
        },
        {
          type: 'p',
          text: 'The table is the single most important fact in this lesson. The editor and your day-to-day test builds run Development, where every assertion is active. A [[shipping-build]] — the one players run — strips them out to save time and code size. So assertions are a tool for *finding* bugs during development, not a safety net for your players.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just throw exceptions?',
          text: 'Unreal modules are compiled with C++ exceptions switched off by default (`bEnableExceptions` in a module\'s Build.cs). Exception support costs code size and some speed, several console toolchains historically discouraged it, and an engine that runs a 16 ms frame loop rarely has a sensible place to `catch` anyway. So Unreal code reports *expected* failures through return values (`bool`, `nullptr`, `TOptional`) and catches *programmer mistakes* with assertions.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A Development build crashes on `check(Weapon)` because `Weapon` is null. What happens to the same line in a default Shipping build?',
      options: [
        {
          text: 'The `check` is compiled out, so execution continues with a null `Weapon`',
          correct: true,
          why: 'Right. `DO_CHECK` is 0 in Shipping by default, so the macro expands to nothing. The bug is still there; whatever dereferences `Weapon` next will crash or misbehave, with a much less helpful report.',
        },
        {
          text: 'It still crashes with the same "Assertion failed" message',
          why: 'Only if the project opted in with `bUseChecksInShipping`. By default the macro produces no code at all in Shipping.',
        },
        {
          text: 'It logs a warning and continues',
          why: 'That describes nothing `check` ever does. In Development it halts; in Shipping it vanishes. Logging-and-continuing is closer to `ensure`.',
        },
        {
          text: 'It throws a C++ exception the engine catches',
          why: 'Unreal does not use exceptions for assertions — and modules are compiled with exceptions disabled by default.',
        },
      ],
      explanation:
        'An assertion documents and enforces an assumption during development. In Shipping it is gone, so the code after it must not *depend* on the check for safety at run time — it depends on you having found and fixed the bug before release.',
    },
    {
      kind: 'concept',
      title: 'check and checkf: stop the world',
      blocks: [
        {
          type: 'p',
          text: '[[check-macro|check(Expr)]] evaluates `Expr`; if it is false, the engine halts. Use it for conditions that can only be false if the *code itself* is broken — situations where continuing would corrupt state or crash later anyway. `checkf` adds a printf-style message so the crash report explains itself.',
        },
        {
          type: 'code',
          title: 'WeaponBase.cpp',
          code: `void AWeaponBase::Fire()
{
    // Created in our own constructor. If it is missing,
    // the class itself is broken: stop right here.
    check(MuzzleComponent);

    checkf(AmmoPerShot > 0,
        TEXT("%s: AmmoPerShot must be positive, got %d"),
        *GetNameSafe(this), AmmoPerShot);

    // Expensive invariant: only verified in Debug builds
    checkSlow(IsAmmoTableSorted());

    SpawnProjectile(MuzzleComponent->GetComponentTransform());
}`,
          annotations: [
            { lines: 5, text: 'A pointer converts to `bool`, so `check(Ptr)` means "must not be null". The failed expression text (`MuzzleComponent`) is printed in the log.' },
            { lines: '7-9', text: '`checkf` takes a `TEXT()` format string and arguments, exactly like `UE_LOG`. `GetNameSafe` returns `"None"` for a null object instead of crashing inside your crash message.' },
            { lines: 12, text: '`checkSlow` is only active when `DO_GUARD_SLOW` is set, which by default means Debug builds. Use it for checks too costly to run in every Development frame.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Output Log when the checkf fails',
          code: `Assertion failed: AmmoPerShot > 0 [File:...\\WeaponBase.cpp] [Line: 7]
BP_Rifle_C_0: AmmoPerShot must be positive, got 0`,
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A failed check takes the whole editor down',
          text: 'When you play in the editor (PIE), your game code runs *inside the editor process*. A failed `check` therefore crashes the entire editor, not just the play session — unsaved levels and assets included. That is the right outcome for "this class is fundamentally broken", and a terrible one for "a designer forgot to assign a sound". Reserve `check` for invariants your own code guarantees.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Fail fast',
          text: 'A check is a circuit breaker. When something shorts, it cuts the power *at the fault*, so you find the burnt wire immediately. Without it, the house keeps running until something three rooms away catches fire — and you spend an afternoon looking in the wrong room.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'If a `check()` fails while you are playing in the editor (PIE), only the play session stops; the editor itself keeps running.',
      answer: false,
      explanation:
        'PIE runs your game code inside the editor process, so a fatal assertion terminates the whole editor. This is exactly why recoverable problems — especially ones caused by content or designers — should use `ensure` or a plain `if` with a log message instead of `check`.',
    },
    {
      kind: 'concept',
      title: 'verify: when the expression must still run',
      blocks: [
        {
          type: 'p',
          text: 'Because `check` is compiled out of Shipping, *everything inside the parentheses disappears too*. If the expression does real work — removes an item, spends gold, registers a listener — that work silently stops happening in the build players run. This is one of the nastiest bugs in Unreal: it cannot be reproduced in the editor at all.',
        },
        {
          type: 'compare',
          left: {
            title: 'Side effect inside check',
            tone: 'bad',
            code: `// Shipping: the item is never removed!
check(Inventory.RemoveSingle(KeyItem) == 1);`,
            text: 'In Development the key is removed and the count checked. In Shipping the whole line vanishes, so the player keeps the key forever.',
          },
          right: {
            title: 'verify, or a separate statement',
            tone: 'good',
            code: `verify(Inventory.RemoveSingle(KeyItem) == 1);

// or, clearer still:
const int32 Removed = Inventory.RemoveSingle(KeyItem);
check(Removed == 1);`,
            text: '[[verify-macro|verify]] halts like `check` in Development, but in Shipping it still *evaluates* the expression and just ignores the result.',
          },
        },
        {
          type: 'p',
          text: '`verifyf` is the formatted-message version. Many teams prefer the second form on the right anyway: doing the work in its own statement and asserting on the result makes the side effect impossible to miss when reading the code.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does verify exist at all?',
          text: 'It is the escape hatch for the "check with side effect" trap. Some calls exist purely for their side effect but also return a success flag you would like to assert on. `verify` lets you keep both on one line without creating a Shipping-only bug. The general rule still stands: the expression inside `check`, `checkf` and `checkSlow` must be *pure* — reading state, never changing it.',
        },
        {
          type: 'deepdive',
          title: 'What the macros roughly expand to',
          blocks: [
            {
              type: 'p',
              text: 'The real definitions in `Misc/AssertionMacros.h` add logging, debug breaks, static-analysis hints and crash reporting, but the skeleton looks like this:',
            },
            {
              type: 'code',
              title: 'Simplified — not the real engine source',
              code: `#if DO_CHECK
    #define check(e)  { if (!(e)) { /* log, break, crash */ } }
    #define verify(e) { if (!(e)) { /* log, break, crash */ } }
#else
    #define check(e)  { }            // e is never evaluated
    #define verify(e) { (void)(e); } // e still runs
#endif

#if DO_ENSURE
    #define ensure(e) (/* report once if false */ !!(e))
#else
    #define ensure(e) (!!(e))        // value is still needed
#endif`,
              annotations: [
                { lines: 5, text: 'This is the line that bites: in Shipping, `check`\'s argument is not compiled into the program, so any work it did is gone.' },
                { lines: 6, text: '`verify` keeps the expression and casts the result to `void` — evaluated, then discarded.' },
                { lines: 12, text: '`ensure` returns a value that callers use in `if`, so even with reporting disabled the expression must still be evaluated.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Playtesters on the Shipping build report that every shop item is free. Development builds work perfectly. Tap the line responsible.',
      code: `void AShopKeeper::Purchase(UItemData* Item)
{
    check(Item);
    const int32 Price = Item->Price;

    check(Wallet->TrySpend(Price));

    Inventory->AddItem(Item);
    OnPurchased.Broadcast(Item);
}`,
      bugLines: [6],
      hint: 'What does each `check` line turn into when `DO_CHECK` is 0?',
      explanation:
        '`TrySpend` both deducts the gold *and* reports success. Wrapped in `check`, the entire call is compiled out of Shipping, so no gold is ever deducted. Line 3 is fine: `check(Item)` only reads. Fix it with `verify(Wallet->TrySpend(Price));` — or better, since running out of gold is a normal gameplay situation rather than a programmer error, `if (!Wallet->TrySpend(Price)) { return; }`.',
    },
    {
      kind: 'concept',
      title: 'ensure: report it, then keep going',
      blocks: [
        {
          type: 'p',
          text: '[[ensure-macro|ensure(Expr)]] is the non-fatal sibling. If `Expr` is false, it logs "Ensure condition failed" with the expression, file, line and full call stack, breaks into the debugger if one is attached, and sends a report through the crash reporter — but then **execution continues**. Crucially, `ensure` *returns the boolean result*, so you can recover right there:',
        },
        {
          type: 'code',
          title: 'Enemy.cpp',
          code: `void AEnemy::ApplyPoison(float DamagePerSecond)
{
    // Should always exist, but if it doesn't, a crash
    // would be worse than skipping this poison tick.
    if (!ensure(HealthComponent))
    {
        return;
    }

    if (!ensureMsgf(DamagePerSecond >= 0.f,
        TEXT("%s: negative poison %f"),
        *GetName(), DamagePerSecond))
    {
        DamagePerSecond = 0.f;
    }

    HealthComponent->StartPoison(DamagePerSecond);
}`,
          annotations: [
            { lines: 5, text: 'The idiom you will see all over Unreal code: report the surprise, then bail out gracefully.' },
            { lines: '10-12', text: '`ensureMsgf` is the formatted-message version, like `checkf`.' },
            { lines: 14, text: 'Recovery does not have to mean returning: here we clamp to a safe value and carry on.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Reports once per call site per session.** A failed `ensure` inside Tick would otherwise spam 60 call stacks a second; after the first report, that particular `ensure` stays silent (but still returns `false`).',
            '**`ensureAlways` / `ensureAlwaysMsgf`** report *every* time, for rare events where each occurrence matters.',
            '**In Shipping** the reporting is compiled out, but the expression is still evaluated and returned, so the `if (!ensure(...))` recovery path still works for players.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have a non-fatal assertion?',
          text: 'Games are long-running, content-heavy programs edited by many people at once. Plenty of "impossible" situations are survivable: a missing material, a stale reference after a level reload, a data asset with a zero in the wrong field. Crashing a 40-person playtest for that is costly; silently ignoring it means nobody ever fixes it. `ensure` is the middle ground — loud enough to get a bug filed (the reports go into crash-collection dashboards), gentle enough to keep everyone working.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'A firing ensure causes a hitch',
          text: 'Capturing and symbolizing a call stack takes noticeable time — a failed `ensure` often causes a visible frame hitch. That is acceptable for genuinely unexpected events, but it means `ensure` must never be used as ordinary control flow for situations you *expect* (the player has no target, the inventory is full). Those deserve a plain `if`.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the idiom: report an unexpected missing component once, then leave the function safely.',
      template: `void ATurret::Retarget()
{
    if (!___(Sensor))
    {
        ___;
    }
    Sensor->ScanForTargets();
}`,
      blanks: [{ answers: ['ensure', 'ensureAlways'] }, { answers: ['return'] }],
      wordBank: ['ensure', 'check', 'verify', 'return', 'break', 'checkNoEntry', 'continue'],
      explanation:
        '`ensure` returns the result of its expression, so `if (!ensure(Sensor))` both reports the problem (once) and lets you recover. `check` would halt instead and returns nothing usable, and `verify` is about keeping side effects in Shipping. `return` leaves the function before the null pointer is dereferenced; `break` and `continue` only make sense inside loops or switches.',
    },
    {
      kind: 'concept',
      title: 'Code that must never run: checkNoEntry, unimplemented, PURE_VIRTUAL',
      blocks: [
        {
          type: 'p',
          text: 'Some assertions do not test an expression — they mark a *place*. If execution ever reaches that place, an assumption about control flow was wrong.',
        },
        {
          type: 'code',
          title: 'DamageMath.cpp',
          code: `float GetArmorMultiplier(EArmorType Armor)
{
    switch (Armor)
    {
    case EArmorType::None:   return 1.0f;
    case EArmorType::Light:  return 0.8f;
    case EArmorType::Heavy:  return 0.5f;
    }

    // Someone added an enum value and forgot this switch.
    checkNoEntry();
    return 1.0f;
}`,
          annotations: [
            { lines: '3-8', text: 'No `default:` on purpose: with every enumerator listed explicitly, compilers that support it (Clang\'s `-Wswitch`, for example) can warn when someone adds a new value but forgets this switch.' },
            { lines: 11, text: '`checkNoEntry()` halts if this line is ever reached. It is a `check`, so it vanishes in Shipping…' },
            { lines: 12, text: '…which is why a sensible fallback value still follows. It also keeps the compiler happy that every path returns.' },
          ],
        },
        {
          type: 'table',
          headers: ['Macro', 'Fires when…', 'Typical use'],
          rows: [
            ['`checkNoEntry()`', 'the line is reached at all', 'Impossible `switch` cases, "can\'t get here" branches'],
            ['`checkNoReentry()`', 'the enclosing scope is entered a second time, ever', 'One-time initialization functions'],
            ['`checkNoRecursion()`', 'the function is re-entered while still running', 'Functions that would loop forever if they recursed'],
            ['`unimplemented()`', 'the function is called at all', 'Base-class functions that subclasses must override'],
            ['`PURE_VIRTUAL(Func, ...)`', 'the un-overridden function is called', 'A "pure virtual" function inside a UCLASS'],
          ],
        },
        {
          type: 'p',
          text: 'The last two exist because of a UObject rule you met with the [[cdo]]: the engine must *construct an instance of every UCLASS* to create its Class Default Object. A class with a real C++ pure virtual function (`= 0`) is abstract and cannot be instantiated, so the generated code fails to compile. Instead you give the function a body that fails loudly if it is ever called:',
        },
        {
          type: 'code',
          title: 'PickupBase.h',
          code: `UCLASS(Abstract)
class MYGAME_API APickupBase : public AActor
{
    GENERATED_BODY()

protected:
    // Subclasses must override. Calling the base version
    // is a fatal error with the function name in the log.
    virtual bool TryApplyEffect(AActor* Collector)
        PURE_VIRTUAL(APickupBase::TryApplyEffect, return false;);
};`,
          annotations: [
            { lines: 1, text: '`UCLASS(Abstract)` stops designers from placing or spawning the base class itself, while still letting the engine build its CDO.' },
            { lines: '9-10', text: '`PURE_VIRTUAL` supplies a body that raises a fatal error naming the function. The trailing `return false;` exists only so the function still compiles as returning a `bool`.' },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why can\'t a `UCLASS` simply declare `virtual bool TryApplyEffect(AActor* Collector) = 0;`?',
      options: [
        {
          text: 'UnrealHeaderTool cannot parse the `= 0` syntax',
          why: 'Plausible, but UHT is not the problem. The failure comes from the C++ compiler when the engine\'s generated code tries to create an object of the class.',
        },
        {
          text: 'The engine must instantiate every UCLASS to build its Class Default Object, and an abstract class cannot be instantiated',
          correct: true,
          why: 'Exactly. Reflection-generated code constructs the class (for the CDO and when loading), which is illegal for an abstract C++ class. `PURE_VIRTUAL` or `unimplemented()` gives you the "must override" intent without making the class abstract.',
        },
        {
          text: 'Virtual functions are not allowed in classes derived from `UObject`',
          why: 'They are allowed and used everywhere — `BeginPlay`, `Tick` and `EndPlay` are all virtual functions you override.',
        },
        {
          text: 'Blueprints cannot override C++ functions',
          why: 'Blueprints override `BlueprintNativeEvent` and `BlueprintImplementableEvent` functions all the time — and in any case this is a C++-only virtual, unrelated to Blueprint.',
        },
      ],
      explanation:
        'Every UCLASS gets a Class Default Object, built by actually running its constructor. C++ forbids creating an object of an abstract class, so a true pure virtual function breaks compilation. `UCLASS(Abstract)` handles the "don\'t place this in a level" part; `PURE_VIRTUAL` handles the "subclasses must override" part.',
    },
    {
      kind: 'concept',
      title: 'Choosing the right tool',
      blocks: [
        {
          type: 'p',
          text: 'The question to ask is not "how bad is this?" but "**whose fault would it be, and can the game sensibly continue?**" Programmer errors in code you control get assertions. Anything that comes from outside your code — designers, data files, the network, the player — is *input*, and input is validated with ordinary `if` statements that keep working in Shipping.',
        },
        {
          type: 'table',
          headers: ['Situation', 'Use', 'Why'],
          rows: [
            ['Your own invariant is broken; continuing would corrupt state', '`check` / `checkf`', 'Fail fast at the cause, during development'],
            ['Same, but the call\'s side effect must still happen in Shipping', '`verify` / `verifyf`', 'Expression survives Shipping'],
            ['Unexpected but survivable; you can bail out or fall back', '`if (!ensure(...))`', 'Reported once, game keeps running'],
            ['A line or branch that should be unreachable', '`checkNoEntry()`', 'Documents and enforces control flow'],
            ['A base function subclasses must override', '`PURE_VIRTUAL` / `unimplemented()`', 'UCLASSes cannot be abstract in C++'],
            ['A slow invariant in a hot loop', '`checkSlow`', 'Only costs time in Debug builds'],
            ['Expected situations: no target, empty ammo, asset still loading', 'plain `if` (+ `UE_LOG`)', 'Not a bug, so not an assertion'],
            ['Data from designers, save files or the network', 'plain `if` + reject/log', 'Must keep working in Shipping'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never assert on client input in an RPC',
          text: 'A `check` on a value received from a client in a Server RPC lets *any* player crash your server by sending a bad value — a denial-of-service exploit, live in development servers and test builds. Validate RPC parameters with `if` and reject or ignore bad requests. The same goes for `ensure`: a malicious client could make your server hitch on demand.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Good assertion messages save hours',
          text: 'Include *which* object and *what* value: `checkf(Index < Slots.Num(), TEXT("%s: slot %d of %d"), *GetName(), Index, Slots.Num())` tells you everything from the log alone. And for facts that are known at compile time — a struct size, an enum count — use standard C++ `static_assert`, which fails the build instead of the game.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A Server RPC receives `SlotIndex` from a client asking to equip an inventory slot. How should the server handle an out-of-range index?',
      code: `void AMyPlayerController::ServerEquipSlot_Implementation(
    int32 SlotIndex)
{
    // ??? validate SlotIndex here
    Inventory->Equip(SlotIndex);
}`,
      options: [
        {
          text: '`check(Inventory->Slots.IsValidIndex(SlotIndex));`',
          why: 'This hands every client a "crash the server" button in any build with checks enabled. Client data is input, not an invariant of your code.',
        },
        {
          text: '`if (!ensure(Inventory->Slots.IsValidIndex(SlotIndex))) return;`',
          why: 'Better than `check`, but a bad packet is not a programmer error, and a client could trigger a report-and-hitch on purpose. Ensures are for your own code\'s surprises.',
        },
        {
          text: '`verify(Inventory->Slots.IsValidIndex(SlotIndex));`',
          why: '`verify` still halts in Development and test builds, and its only extra feature — keeping a side effect in Shipping — is irrelevant here.',
        },
        {
          text: '`if (!Inventory->Slots.IsValidIndex(SlotIndex)) { return; }` — optionally logging a warning',
          correct: true,
          why: 'Untrusted input is validated with ordinary code that works identically in every configuration. The server simply refuses the bad request.',
        },
      ],
      explanation:
        'Assertions guard *your* assumptions about *your* code. Anything that crosses a trust boundary — network packets, save files, mod data, designer-entered values — must be validated with normal control flow, because it can legitimately be wrong and because Shipping builds still need the protection.',
    },
    {
      kind: 'order',
      prompt: 'Put the events in order for the *first* time this line fails in a Development build: `if (!ensure(Target)) { return; }`',
      lines: [
        '`Target` is evaluated and found to be null',
        'The engine logs "Ensure condition failed" with file, line and call stack',
        'The debugger breaks (if attached) and a report goes to the crash reporter',
        '`ensure` returns `false` and execution continues',
        'The `if` body runs and the function returns early',
      ],
      distractors: ['The process terminates and the editor closes'],
      explanation:
        '`ensure` evaluates, reports (log + call stack + crash-reporter submission, with a debugger break if you are attached), and then hands the boolean back so your code can recover. Terminating the process is what `check` does. The next time this same `ensure` fails during the session, the reporting steps are skipped — it simply returns `false`.',
    },
    {
      kind: 'truefalse',
      prompt: 'In a default Shipping build, the expression inside `ensure(...)` is not evaluated at all, just like `check(...)`.',
      answer: false,
      explanation:
        '`ensure` is used as a value (`if (!ensure(Ptr))`), so its expression must always be evaluated — in Shipping it effectively becomes `(!!(Ptr))`, with only the reporting removed. That is what makes the recovery pattern safe for players. `check` is the one whose expression disappears entirely; `verify` keeps its expression but discards the result.',
    },
  ],
  takeaways: [
    '`check`/`checkf` halt on a broken invariant in Development but are compiled out of Shipping by default — expression included.',
    'Never put side effects inside `check`; use `verify` (expression survives Shipping) or a separate statement.',
    '`ensure`/`ensureMsgf` report once per call site, return the result, and let you recover: `if (!ensure(Ptr)) { return; }`.',
    'A failed `check` during PIE crashes the whole editor, so reserve it for invariants your own code guarantees.',
    '`checkNoEntry` marks unreachable code; `PURE_VIRTUAL`/`unimplemented` stand in for pure virtuals, which UCLASSes cannot have.',
    'Expected situations and untrusted input (designers, saves, network) use plain `if` checks, never assertions.',
  ],
  reading: [
    {
      title: 'Asserts in Unreal Engine',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/asserts-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s reference for the check, verify and ensure families, including the Slow and Always variants.',
    },
    {
      title: 'assert',
      url: 'https://en.cppreference.com/w/cpp/error/assert',
      source: 'cppreference',
      note: 'The standard C++ macro Unreal\'s family replaces, and how `NDEBUG` disables it.',
    },
    {
      title: 'Epic C++ Coding Standard',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Shows how assertions fit into Epic\'s wider conventions for engine and game code.',
    },
  ],
};
