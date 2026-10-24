import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'cpp-overloading-defaults',
  title: 'Overloading and Default Arguments',
  summary: 'Giving several functions one name, how the compiler chooses between them, and the secret names it uses to tell them apart.',
  minutes: 17,
  objectives: [
    'Write overloaded functions that differ by parameter types or count',
    'Predict which overload a call selects, and recognize ambiguous calls',
    'Explain why the return type is not part of a function\'s signature',
    'Use default arguments correctly: trailing only, specified once in the declaration',
    'Explain name mangling and why it makes overloading possible',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'One name, many versions',
      blocks: [
        {
          type: 'p',
          text: 'Imagine a debug logger for your game. In C, which has no overloading, you would need `logInt`, `logDouble`, `logText`: the type ends up baked into every name. C++ lets several functions share one name as long as their **parameter lists differ**. This is [[function-overloading|function overloading]], and the compiler picks the right version from the arguments you pass.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

void logValue(int value) {
    std::cout << "int: " << value << '\\n';
}

void logValue(double value) {
    std::cout << "double: " << value << '\\n';
}

void logValue(std::string_view text) {
    std::cout << "text: " << text << '\\n';
}

void logValue(std::string_view label, int value) {
    std::cout << label << " = " << value << '\\n';
}

int main() {
    logValue(42);
    logValue(3.75);
    logValue("Boss defeated");
    logValue("Score", 9001);
}`,
          output: 'int: 42\ndouble: 3.75\ntext: Boss defeated\nScore = 9001',
          annotations: [
            { lines: [4, 8, 12], text: 'Three overloads with **one** parameter each, differing only in its type.' },
            { lines: 16, text: 'A fourth overload differs in the **number** of parameters.' },
            { lines: '21-24', text: 'Each call is matched at compile time by looking at the argument types. There is no run-time cost for choosing.' },
            { lines: 23, text: 'A string literal is not an `int` or `double`, and can be converted to `std::string_view`, so only the text overload is viable.' },
          ],
        },
        {
          type: 'p',
          text: 'What distinguishes overloads is the [[function-signature|signature]]: the function\'s name plus the number, types and order of its parameters. Two functions with the same name must differ in at least one of those. Parameter *names* do not count, because they are not part of a function\'s type.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why have overloading at all?',
          text: 'Names should describe *intent*, not types. The compiler already knows the type of every argument, so making you repeat it in the name adds noise and invites mistakes (calling `logInt` with a `double`). Overloading is also what makes `std::cout << x` work for every type: the standard library provides a separate `operator<<` overload for `int`, `double`, `const char*` and many more. Later, templates (a whole unit) build on the same machinery.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Overloads should do the same thing',
          text: 'Readers assume that every function in an overload set means the same thing for different inputs. `logValue(int)` and `logValue(double)` both log; do not make `logValue(bool)` delete a save file. If the behaviour differs, the name should too.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'What does this program print?',
      code: `#include <iostream>

void show(int x)    { std::cout << "int:" << x << ' '; }
void show(double x) { std::cout << "double:" << x << ' '; }

int main() {
    show(7);
    show(7.0);
    show('A');
    show(2.5f);
}`,
      options: [
        { text: 'int:7 double:7.0 int:A double:2.5', why: '`std::cout` prints the `double` 7.0 as `7`, and inside `show(int)` the `char` has become the integer 65, so it prints as a number.' },
        { text: 'int:7 double:7 int:65 double:2.5', correct: true, why: '`\'A\'` promotes to `int` (65) and `2.5f` promotes to `double`. Promotions beat ordinary conversions, so both choices are unambiguous.' },
        { text: 'int:7 double:7 int:65 int:2', why: 'A `float` argument prefers `double`: float to double is a *promotion*, while float to int is a lossy *conversion*, which ranks lower.' },
        { text: 'It does not compile: `show(\'A\')` is ambiguous', why: 'A `char` could convert to either, but char to int is a promotion and char to double is a conversion. Different ranks, so there is a clear winner.' },
      ],
      explanation:
        'Overload resolution ranks how each argument would have to be converted. `char` to `int` and `float` to `double` are *promotions*, which rank above other numeric conversions. That is why `show(\'A\')` picks the `int` version and prints the character code 65, and `show(2.5f)` keeps its fractional part.',
    },
    {
      kind: 'concept',
      title: 'How the compiler picks: overload resolution',
      blocks: [
        {
          type: 'p',
          text: 'When you call an overloaded name, the compiler runs [[overload-resolution|overload resolution]], a precise, deterministic procedure performed entirely at [[compile-time|compile time]]:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Collect candidates', text: 'Find every function with that name that is visible at the call.' },
            { title: 'Filter to viable functions', text: 'Keep those that accept this many arguments and where every argument can be converted to its parameter type.' },
            { title: 'Rank the conversions', text: 'For each viable function, grade how each argument has to be converted (table below).' },
            { title: 'Pick the single best, or fail', text: 'The winner must be at least as good for every argument and strictly better for at least one. If no function wins outright, the call is **ambiguous** and does not compile.' },
          ],
        },
        {
          type: 'table',
          headers: ['Rank', 'Conversion', 'Examples'],
          rows: [
            ['1 (best)', 'Exact match', '`int` to `int`, adding `const`, passing a variable to a `const&`'],
            ['2', 'Promotion', '`char`, `short`, `bool` to `int`; `float` to `double`'],
            ['3', 'Standard conversion', '`int` to `double`, `double` to `int`, `int` to `long`, `double` to `float`, numbers or pointers to `bool`'],
            ['4', 'User-defined conversion', 'string literal to `std::string` or `std::string_view` (performed by a class\'s constructor)'],
          ],
        },
        {
          type: 'code',
          code: `void spawn(long count);
void spawn(double count);

spawn(3L);    // OK: exact match for long
spawn(3.0);   // OK: exact match for double
spawn(3);     // error: ambiguous`,
          annotations: [
            { lines: 6, text: '`int` to `long` and `int` to `double` are both rank-3 standard conversions. Neither is better, so the compiler refuses to guess: *call of overloaded spawn(int) is ambiguous*.' },
            { lines: 4, text: 'The `L` suffix makes the literal a `long`, an exact match.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why refuse instead of guessing?',
          text: 'A silent "best guess" would mean that adding an unrelated overload somewhere could quietly change which function an existing call runs. By making equal-rank choices a compile error, C++ forces you to say what you mean (with a cast, a literal suffix, or a clearer overload set). The rules are complicated in full, but the goal is simple: every call has one obvious answer, decided before the program ever runs.',
        },
        {
          type: 'deepdive',
          title: 'The string literal that chose bool',
          blocks: [
            {
              type: 'p',
              text: 'This is a famous trap. A string literal is an array of `char`, which decays to a pointer, and *any pointer* can convert to `bool` with a standard conversion (rank 3). Converting it to `std::string` is a user-defined conversion (rank 4). So `bool` wins:',
            },
            {
              type: 'code',
              runnable: true,
              code: `#include <iostream>
#include <string>

void say(bool flag) {
    std::cout << "bool overload: " << flag << '\\n';
}

void say(const std::string& text) {
    std::cout << "string overload: " << text << '\\n';
}

int main() {
    say("Hello");
    say(std::string{"Hello"});
}`,
              output: 'bool overload: 1\nstring overload: Hello',
              annotations: [
                { lines: 13, text: 'Surprise: the pointer-to-bool conversion outranks constructing a `std::string`. A non-null pointer converts to `true`, printed as `1`.' },
                { lines: 14, text: 'With an actual `std::string` argument, the string overload is an exact match.' },
              ],
            },
            {
              type: 'p',
              text: 'The fix is to avoid mixing `bool` with string-like overloads, or to add a `const char*` overload (an exact match for literals) that forwards to the string version.',
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Given only these two overloads, what happens with `setVolume(0.5)`?',
      code: `void setVolume(float level);
void setVolume(long level);

setVolume(0.5);`,
      options: [
        { text: 'It calls `setVolume(float)`, because `0.5` is a fraction', why: '`0.5` is a `double` literal, not a `float`. Converting double to float is a standard conversion, the same rank as double to long.' },
        { text: 'It calls `setVolume(long)`, which truncates to 0', why: 'Double to long is a standard conversion, but so is double to float, so neither wins.' },
        { text: 'It fails to compile because the call is ambiguous', correct: true, why: 'Both candidates need a rank-3 standard conversion. With no strictly better match, the compiler reports an ambiguous call.' },
        { text: 'It calls whichever overload was declared first', why: 'Declaration order never decides overload resolution. Only conversion ranks do.' },
      ],
      explanation:
        'Many people expect `float` to win because it "looks closer" to `0.5`. But the language does not measure closeness of values, only conversion categories: double to float is a conversion, not a promotion (only float to double is a promotion). Writing `setVolume(0.5f)` gives an exact match for `float` and fixes it.',
    },
    {
      kind: 'concept',
      title: 'The return type is not part of the signature',
      blocks: [
        {
          type: 'p',
          text: 'You cannot overload two functions that differ *only* in their return type:',
        },
        {
          type: 'code',
          code: `int    loadSetting(std::string_view key);
double loadSetting(std::string_view key);  // error

loadSetting("volume");          // which one?
auto v = loadSetting("volume"); // which one?`,
          annotations: [
            { lines: 2, text: 'Error: *ambiguating new declaration*. Same name, same parameter list: as far as overloading is concerned, it is the same function declared with a conflicting return type.' },
            { lines: '4-5', text: 'At these calls there is nothing to choose with. The result is discarded, or deduced by `auto` from the very call being resolved.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why C++ ignores the return type',
          text: 'C++ works out the type of an expression from the inside out: the arguments determine which function is called, and that function\'s return type then becomes the type of the call. If the return type took part, the compiler would need to look outward at the surrounding context, and many contexts (a discarded result, `auto`, an argument to another overloaded function) give no answer at all. Keeping resolution purely argument-driven keeps it predictable.',
        },
        {
          type: 'p',
          text: 'If you need different result types, use different names (`loadIntSetting`, `loadFloatSetting`), or later in the course, a function template where the caller states the type explicitly.',
        },
        {
          type: 'deepdive',
          title: 'What else does not count: top-level const',
          blocks: [
            {
              type: 'p',
              text: 'For by-value parameters, `const` on the parameter itself is ignored in the signature, because it only affects the function\'s own copy and makes no difference to the caller. So `void hit(int dmg)` and `void hit(const int dmg)` declare the **same** function. But `const` that is part of what a reference refers to *does* count: `void hit(int& dmg)` and `void hit(const int& dmg)` are distinct overloads, and a call with a non-const variable prefers the first, while a literal can only go to the second.',
            },
          ],
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Two functions may differ only in their return type, as long as every call site stores the result in a variable of the matching type.',
      answer: false,
      explanation:
        'Overload resolution looks only at the arguments, never at what you do with the result. Two functions with the same name and the same parameter list are the *same* function to the compiler, so declaring them with different return types is an error, regardless of how they are called.',
    },
    {
      kind: 'concept',
      title: 'Default arguments',
      blocks: [
        {
          type: 'p',
          text: 'Often you want one function where most callers are happy with typical values but some need to override them. A [[default-argument|default argument]] supplies a value for a parameter when the caller leaves it out:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <iostream>
#include <string_view>

void spawnEnemy(std::string_view type, int level = 1,
                bool elite = false);

int main() {
    spawnEnemy("Goblin");
    spawnEnemy("Orc", 5);
    spawnEnemy("Troll", 12, true);
}

void spawnEnemy(std::string_view type, int level, bool elite) {
    std::cout << (elite ? "Elite " : "") << type
              << " (level " << level << ")\\n";
}`,
          output: 'Goblin (level 1)\nOrc (level 5)\nElite Troll (level 12)',
          annotations: [
            { lines: '4-5', text: 'The defaults live in the **declaration**. `type` has no default, so every call must supply it.' },
            { lines: 8, text: 'The compiler rewrites this call as `spawnEnemy("Goblin", 1, false)`.' },
            { lines: 9, text: 'Arguments still fill parameters left to right, so `5` goes to `level` and only `elite` takes its default.' },
            { lines: 13, text: 'The definition repeats the parameters **without** the defaults. Writing `= 1` here again would be an error.' },
          ],
        },
        {
          type: 'heading',
          text: 'The rules, and the reason behind each',
        },
        {
          type: 'list',
          items: [
            '**Defaults must be trailing.** Once a parameter has a default, every parameter after it needs one too. Arguments are matched by position, and there is no syntax to skip one (`spawnEnemy("Orc", , true)` is not C++), so a default in the middle could never be used.',
            '**Specify each default once, normally in the declaration.** Callers only see the declaration (usually in a header), and that is where the compiler needs the value. Repeating it in the definition is an error, even if the value is identical.',
            '**Defaults are filled in at each call site.** The function itself always receives every argument. A default is just the compiler typing the missing values for you.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Defaults plus overloads can collide',
          text: 'With `void heal(int amount = 10);` and `void heal();` both declared, the call `heal()` matches both equally well and fails as ambiguous. When a default argument and an overload cover the same call, pick one approach.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Default arguments in Unreal',
          text: 'Engine APIs use defaults heavily. `AActor::SetActorLocation(const FVector& NewLocation, bool bSweep = false, FHitResult* OutSweepHitResult = nullptr, ETeleportType Teleport = ETeleportType::None)` is usually called as just `SetActorLocation(NewLocation)`. Defaults on a Blueprint-callable `UFUNCTION` also show up as pre-filled values on the Blueprint node\'s input pins.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'This program fails to compile. Tap the line that causes the error.',
      code: `#include <iostream>
#include <string_view>

void playSound(std::string_view name, int volume = 80);

int main() {
    playSound("explosion");
}

void playSound(std::string_view name, int volume = 80) {
    std::cout << name << " at " << volume << "%\\n";
}`,
      bugLines: [10],
      hint: 'How many times may a default argument be specified?',
      explanation:
        'The default for `volume` was already given in the declaration on line 4. Line 10 specifies it again, and GCC reports *default argument given for parameter 2*. The rule holds even when the values match, because two places that *could* disagree is a maintenance hazard. Write `int volume` in the definition; many teams add a comment such as `int volume /* = 80 */` as a reminder.',
    },
    {
      kind: 'mcq',
      prompt: 'Which declaration is valid?',
      codeOptions: true,
      options: [
        { text: 'void attack(int damage = 10, bool crit);', why: '`damage` has a default but `crit` after it does not. Defaults must be trailing.' },
        { text: 'void attack(int damage, bool crit = false, float mult);', why: '`mult` follows a defaulted parameter without having a default of its own.' },
        { text: 'void attack(int damage = 10, bool crit, float mult = 1.0f);', why: 'A gap: `crit` has no default but sits between two defaulted parameters, so the default on `damage` could never be used.' },
        { text: 'void attack(int damage, bool crit = false, float mult = 1.0f);', correct: true, why: 'All defaults are at the end. Callers may pass 1, 2 or 3 arguments.' },
      ],
      explanation:
        'Because arguments fill parameters strictly left to right, only a *suffix* of the parameter list can be optional. Any default followed by a non-defaulted parameter is unreachable, so the language makes it an error.',
    },
    {
      kind: 'concept',
      title: 'Under the hood: name mangling',
      blocks: [
        {
          type: 'p',
          text: 'Here is a puzzle. Each `.cpp` file compiles into an [[object-file|object file]] in which every function is identified by a symbol *name*, and the [[linker|linker]] connects calls to definitions purely by matching those names. The object file format and the linker predate C++ and know nothing about parameter types. So how can two functions both called `print` coexist?',
        },
        {
          type: 'p',
          text: 'The answer is [[name-mangling|name mangling]]: the compiler encodes the parameter types into the symbol name. On Linux and macOS, GCC and Clang follow the *Itanium C++ ABI*:',
        },
        {
          type: 'table',
          headers: ['Declaration', 'GCC / Clang symbol'],
          rows: [
            ['`void print(int)`', '`_Z5printi`'],
            ['`void print(double)`', '`_Z5printd`'],
            ['`void respawn()`', '`_Z7respawnv`'],
            ['`int applyDamage(int, int)`', '`_Z11applyDamageii`'],
            ['`void game::print(int)`', '`_ZN4game5printEi`'],
          ],
        },
        {
          type: 'p',
          text: 'Read `_Z5printi` as: `_Z` (this is a mangled C++ name), `5` (the name is five characters long), `print`, then one code per parameter: `i` for `int`. Other common codes are `d` for `double`, `f` for `float`, `b` for `bool`, `c` for `char`, `l` for `long`, and `v` for an empty parameter list. Namespaces are wrapped in `N ... E`.',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `g++ -c combat.cpp -o combat.o
nm combat.o            # list symbols in the object file
nm -C combat.o         # same, demangled to readable form
echo _Z6attackif | c++filt`,
          annotations: [
            { lines: 2, text: '`nm` prints the raw symbols, such as `_Z5printi`.' },
            { lines: 3, text: '`-C` demangles them back into `print(int)`.' },
            { lines: 4, text: '`c++filt` demangles any name you paste in. This one prints `attack(int, float)`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Why mangling instead of a smarter linker?',
          text: 'The first C++ compiler, Stroustrup\'s *Cfront* (1983), translated C++ into C and then used the ordinary C compiler and linker. Every C++ name had to become a valid C identifier, so overloads were given encoded names. Mangling let C++ reuse decades of existing tooling unchanged, and it is still how every major toolchain works today.',
        },
        {
          type: 'deepdive',
          title: 'Mangling across compilers, and extern "C"',
          blocks: [
            {
              type: 'p',
              text: 'The C++ standard does not specify mangling, so each ABI has its own. MSVC (and therefore Unreal on Windows) mangles `void print(int)` as `?print@@YAXH@Z`, where `X` encodes the `void` return type and `H` the `int` parameter. Itanium omits the return type for ordinary functions, while MSVC includes it. Because the schemes differ, object files from GCC and MSVC cannot be linked together.',
            },
            {
              type: 'p',
              text: 'Writing `extern "C"` before a declaration turns mangling off, so the symbol is plain `print`. That is how C++ exposes functions to C, to other languages, and to plugin systems that look functions up by name. The price: two `extern "C"` functions cannot share a name, so they cannot be overloaded.',
            },
            {
              type: 'p',
              text: 'You will meet mangled names again in linker errors. *undefined reference to print(double)* means the linker looked for `_Z5printd` and nobody defined it. Building and linking multi-file programs has its own lesson later in the course.',
            },
          ],
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'GCC mangled this function\'s name as `_Z6attackif`. Fill in its parameter types.',
      template: `void attack(___ damage, ___ multiplier);`,
      blanks: [{ answers: ['int'] }, { answers: ['float'] }],
      wordBank: ['int', 'float', 'double', 'long', 'char', 'bool'],
      explanation:
        'After `_Z6attack` (a six-character name) come the parameter codes in order: `i` is `int` and `f` is `float`. Changing either type would change the symbol, which is exactly how `attack(int, float)` and `attack(int, double)` (`_Z6attackid`) can live side by side in one program.',
    },
    {
      kind: 'mcq',
      prompt: 'Why does C++ need name mangling at all?',
      options: [
        { text: 'To hide function names from people reading the compiled program', why: 'Mangled names are trivially reversible with tools like `c++filt`. Obfuscation is not the goal.' },
        { text: 'So that overloads, which share a source name, get distinct symbol names the linker can tell apart', correct: true, why: 'The linker matches by symbol name only. Encoding parameter types (and namespaces) in the name gives every overload a unique symbol.' },
        { text: 'To make function calls faster at run time', why: 'Mangling affects only names in object files. The machine code of a call is the same either way.' },
        { text: 'Because the C++ standard requires a specific mangling scheme', why: 'The standard does not specify mangling at all. Each ABI (Itanium, MSVC) defines its own scheme.' },
      ],
      explanation:
        'Overloading is a source-level feature, but object files and linkers work with plain names. Mangling bridges that gap by folding the signature into the symbol: `print(int)` and `print(double)` become `_Z5printi` and `_Z5printd`. It also encodes namespaces and classes, which is why the same function name in two namespaces never clashes at link time.',
    },
    {
      kind: 'concept',
      title: 'Overloads or defaults? Choosing well',
      blocks: [
        {
          type: 'p',
          text: 'Both features let one name serve several kinds of call, so which should you reach for? Ask whether the *behaviour* changes or only a *value* does.',
        },
        {
          type: 'table',
          headers: ['Use', 'When', 'Example'],
          rows: [
            ['Default argument', 'Same algorithm; one input usually has a typical value', '`spawnEnemy(type, level = 1)`'],
            ['Overloads', 'Different input types need different handling', '`logValue(int)`, `logValue(std::string_view)`'],
            ['Different names', 'The operations really do different things', '`loadGame()` vs `loadSettings()`'],
          ],
        },
        {
          type: 'list',
          items: [
            'Avoid overload sets where a common argument type converts equally well to several overloads (`long` vs `double`); callers will hit ambiguity errors.',
            'Be wary of `bool` parameters in overload sets and of long runs of `bool` defaults: `spawnEnemy("Orc", 5, true, false)` is unreadable at the call site.',
            'Remember that defaults are compiled into every caller. Changing a default in a header means every file that calls the function must be recompiled to see the new value.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'UFUNCTIONs cannot be overloaded',
          text: 'Plain C++ member functions in Unreal classes can be overloaded as usual. But functions marked `UFUNCTION()` cannot share a name within a class: Unreal\'s [[reflection|reflection]] system and Blueprints look functions up by name alone, so UnrealHeaderTool rejects overloads. That is why you see engine names like `SetActorLocation` and `SetActorLocationAndRotation` instead of one overloaded `SetLocation`.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Default argument values are stored inside the compiled function, so changing a default in a header only requires recompiling the `.cpp` file that defines the function.',
      answer: false,
      explanation:
        'Defaults are substituted at each **call site** at compile time: `spawnEnemy("Goblin")` is compiled as `spawnEnemy("Goblin", 1, false)` inside the *caller\'s* object file. The function itself always receives every argument. So after changing a default, every file that calls the function must be recompiled, which build systems handle automatically because those files include the header.',
    },
  ],
  takeaways: [
    'Overloaded functions share a name but differ in the number, types or order of parameters (the signature). Parameter names and return types do not count.',
    'Overload resolution happens at compile time: exact match beats promotion, which beats standard conversion, which beats user-defined conversion.',
    'If no overload is strictly best, the call is ambiguous and does not compile. Fix it with a literal suffix, a cast, or a better overload set.',
    'Default arguments must be trailing and are specified once, in the declaration. The compiler fills them in at each call site.',
    'Name mangling encodes parameter types into symbol names (`_Z5printi`), letting the linker tell overloads apart; `extern "C"` turns it off.',
    'Use defaults when only a value varies, overloads when the input type changes the handling, and different names when the behaviour differs.',
  ],
  reading: [
    {
      title: 'Overload resolution',
      url: 'https://en.cppreference.com/w/cpp/language/overload_resolution',
      source: 'cppreference',
      note: 'The full ranking rules, including the tie-breakers this lesson summarised.',
    },
    {
      title: 'Default arguments',
      url: 'https://en.cppreference.com/w/cpp/language/default_arguments',
      source: 'cppreference',
      note: 'Every rule about where defaults may appear and how they are evaluated.',
    },
    {
      title: 'Introduction to function overloading',
      url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-function-overloading/',
      source: 'learncpp',
      note: 'A friendly introduction, followed by chapters on overload differentiation and resolution.',
    },
    {
      title: 'Itanium C++ ABI: mangling',
      url: 'https://itanium-cxx-abi.github.io/cxx-abi/abi.html#mangling',
      source: 'other',
      note: 'The specification GCC and Clang follow; skim the builtin type codes table to decode names yourself.',
    },
  ],
};
