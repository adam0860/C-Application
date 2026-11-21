import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-compilation-pipeline',
  title: 'Compiling, Assembling and Linking',
  summary: 'Open up the object file: sections, symbol tables and relocations with real objdump and nm output, static vs dynamic linking, and everything that happens between execve and main.',
  minutes: 20,
  objectives: [
    'Inspect every intermediate file of a build and explain what each stage adds',
    'Name the sections of an object file (.text, .data, .bss, .rodata) and predict where each kind of variable goes',
    'Read an `nm` symbol table and `objdump -dr` relocations, and compute how the linker patches a call',
    'Compare static and dynamic linking, including archives, link order, the PLT and the GOT',
    'Describe how the kernel and dynamic loader start a program and what runs before and after `main`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Every stage leaves a file behind',
      blocks: [
        {
          type: 'p',
          text: 'You know the four stages from C++ Fundamentals: the [[preprocessor]] pastes text, the [[compiler]] produces assembly, the assembler produces an [[object-file]], and the [[linker]] combines object files into an [[executable]]. This lesson opens each of those files. GCC keeps them all if you ask:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Terminal (g++ 13, Ubuntu 24.04)',
          code: `$ g++ -std=c++20 -O2 -save-temps -c hello.cpp
$ ls -l
-rw-r--r-- 1 root root      71 Nov 19 21:19 hello.cpp
-rw-r--r-- 1 root root 1162254 Nov 19 21:19 hello.ii
-rw-r--r-- 1 root root    1784 Nov 19 21:19 hello.o
-rw-r--r-- 1 root root     848 Nov 19 21:19 hello.s
$ wc -l hello.ii hello.s
  44409 hello.ii
     47 hello.s`,
          annotations: [
            { lines: 1, text: '`-save-temps` keeps the preprocessed `.ii`, the assembly `.s` and the object `.o`. `hello.cpp` is the classic three-line program with `#include <iostream>`.' },
            { lines: 4, text: 'The [[translation-unit]] after preprocessing: **44,409 lines** and 1.1 MB, almost all of it from `<iostream>` and the headers it includes. This is what the compiler actually parses.' },
            { lines: 6, text: 'The assembly: 47 lines, most of them directives.' },
            { lines: 5, text: 'The object file: 1.8 KB of machine code, data and bookkeeping for the linker.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why big projects compile slowly',
          text: 'The compiler re-parses those 44,000 lines for **every** `.cpp` that includes `<iostream>`. A 2,000-file engine re-reads its common headers thousands of times. That is the problem precompiled headers, unity builds (Unreal\'s default) and C++20 modules each attack in a different way.',
        },
        {
          type: 'p',
          text: 'The rest of this lesson uses a three-file mini game. `world.cpp` holds the interesting globals:',
        },
        {
          type: 'code',
          title: 'world.cpp',
          code: `int gScore = 100;              // initialized global
int gGrid[256][256];           // zero-initialized global
const int kXp[4] = {0, 100, 250, 500};
static int sWaves = 0;         // file-local

int spawnCount(int wave);      // defined in spawn.cpp

int nextWave(int wave) {
    ++sWaves;
    gScore += spawnCount(wave) + kXp[wave & 3];
    return gGrid[wave][0];
}
int wavesPlayed() {
    return sWaves;
}`,
          annotations: [
            { lines: 1, text: 'Has a non-zero initial value that must be stored somewhere.' },
            { lines: 2, text: '256 × 256 × 4 = 262,144 bytes, all zero.' },
            { lines: 3, text: 'A constant table. `const` at namespace scope also gives it internal [[linkage]].' },
            { lines: 6, text: 'Declared, not defined: the linker must find it elsewhere.' },
          ],
        },
        {
          type: 'p',
          text: '`spawn.cpp` defines `int spawnCount(int wave) { return 4 + wave * 2; }`, and `main.cpp` calls `nextWave(3)` and prints `gScore`. The build is `g++ -std=c++20 -O2 -fcf-protection=none -c world.cpp spawn.cpp main.cpp` (the course\'s usual flag, which keeps `endbr64` out of the listings), then `g++ main.o world.o spawn.o -o game`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Inside an object file: sections',
      blocks: [
        {
          type: 'p',
          text: 'On Linux an object file is an **[[elf|ELF]]** file (Windows uses PE/COFF, macOS Mach-O; the ideas are the same). Its contents are grouped into named **[[object-file-section|sections]]** by what they are and how they may be used:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'size -A -d world.o',
          code: `world.o  :
section             size   addr
.text                 71      0
.data                  4      0
.bss              262148      0
.rodata               16      0
.comment              46      0
.note.GNU-stack        0      0
.eh_frame             72      0
Total             262357`,
          annotations: [
            { lines: 3, text: '`.text`: machine code for `nextWave` and `wavesPlayed`, 71 bytes.' },
            { lines: 4, text: '`.data`: initialized, writable globals. Exactly 4 bytes: `gScore`, holding 100.' },
            { lines: 5, text: '`.bss`: zero-initialized globals, `gGrid` (262,144) plus `sWaves` (4). The file stores only this **size**, not 262 KB of zeros.' },
            { lines: 6, text: '`.rodata`: read-only data, the 16 bytes of `kXp`. String literals land here too.' },
            { lines: 9, text: '`.eh_frame`: unwind tables, used for exceptions and by debuggers and profilers to walk the stack.' },
          ],
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg"><text x="120.0" y="18" text-anchor="middle" font-size="13" font-weight="600">world.o (file on disk)</text><rect x="20" y="30" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="28" y="48.0" font-size="12" font-family="monospace" class="t-gray">ELF header</text><rect x="20" y="56" width="200" height="34" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="28" y="78.0" font-size="12" font-family="monospace" class="t-orange">.text</text><text x="214" y="78.0" text-anchor="end" font-size="10" class="t-gray">machine code</text><rect x="20" y="90" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="28" y="108.0" font-size="12" font-family="monospace" class="t-blue">.data</text><text x="214" y="108.0" text-anchor="end" font-size="10" class="t-gray">gScore = 100</text><rect x="20" y="116" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-green" stroke-dasharray="5 4"/><text x="28" y="134.0" font-size="12" font-family="monospace" class="t-green">.bss</text><text x="214" y="134.0" text-anchor="end" font-size="10" class="t-gray">size only: 262,148 B</text><rect x="20" y="142" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="28" y="160.0" font-size="12" font-family="monospace" class="t-purple">.rodata</text><text x="214" y="160.0" text-anchor="end" font-size="10" class="t-gray">kXp = {0,100,250,500}</text><rect x="20" y="168" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="28" y="186.0" font-size="12" font-family="monospace" class="t-gray">.symtab / .strtab</text><text x="214" y="186.0" text-anchor="end" font-size="10" class="t-gray">symbols</text><rect x="20" y="194" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-red"/><text x="28" y="212.0" font-size="12" font-family="monospace" class="t-red">.rela.text</text><text x="214" y="212.0" text-anchor="end" font-size="10" class="t-gray">relocations</text><rect x="20" y="220" width="200" height="26" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="28" y="238.0" font-size="12" font-family="monospace" class="t-gray">section headers</text><text x="410.0" y="18" text-anchor="middle" font-size="13" font-weight="600">running game (memory)</text><rect x="320" y="36" width="180" height="50" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="410.0" y="66.0" text-anchor="middle" font-size="12" class="t-orange">code  R-X</text><rect x="320" y="112" width="180" height="36" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="410.0" y="135.0" text-anchor="middle" font-size="12" class="t-purple">read-only  R--</text><rect x="320" y="174" width="180" height="30" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="410.0" y="194.0" text-anchor="middle" font-size="12" class="t-blue">data  RW-</text><rect x="320" y="204" width="180" height="60" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="410.0" y="239.0" text-anchor="middle" font-size="12" class="t-green">zero-filled  RW-</text><path d="M224,73.0 C270,73.0 270,61.0 310,61.0" fill="none" stroke="currentColor" stroke-width="1.6" class="s-orange"/><path d="M310,56.0 L320,61.0 L310,66.0 Z" class="f-orange"/><path d="M224,155.0 C270,155.0 270,130.0 310,130.0" fill="none" stroke="currentColor" stroke-width="1.6" class="s-purple"/><path d="M310,125.0 L320,130.0 L310,135.0 Z" class="f-purple"/><path d="M224,103.0 C270,103.0 270,189.0 310,189.0" fill="none" stroke="currentColor" stroke-width="1.6" class="s-blue"/><path d="M310,184.0 L320,189.0 L310,194.0 Z" class="f-blue"/><path d="M224,129.0 C270,129.0 270,234.0 310,234.0" fill="none" stroke="currentColor" stroke-width="1.6" class="s-green"/><path d="M310,229.0 L320,234.0 L310,239.0 Z" class="f-green"/><text x="20" y="268" font-size="12" class="t-gray">Symbols, relocations and headers guide the linker;</text><text x="20" y="284" font-size="12" class="t-gray">they never become program data.</text></svg>',
          alt: 'Left: the layout of world.o on disk, from the ELF header through .text, .data, .bss (dashed, size only), .rodata, the symbol and string tables, relocations and section headers. Right: the running game\'s memory with a read-execute code segment, a read-only segment, a read-write data segment and a zero-filled read-write segment. Arrows map .text to code, .rodata to read-only, .data to data and .bss to the zero-filled area.',
          caption: 'Sections on disk (left) become memory segments with permissions (right). In the linked `game`, `readelf -l` shows the data segment\'s file size as 0x25c bytes but its memory size as 0x40290: the difference is `.bss`, zero-filled by the loader.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate sections?',
          text: 'Two reasons. **Space**: a zero-initialized array needs no bytes in the file, only a size, so `.bss` keeps executables small. **Protection**: the loader maps code as read+execute but not writable, constants as read-only, and data as read+write but not executable. A stray write into `kXp` or into your code faults immediately instead of silently corrupting it, and injected data can never be executed as code. That is why writing to a string literal crashes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'fill',
      prompt: 'Which section does each definition (at namespace scope, compiled with GCC on Linux) end up in?',
      templateIsCode: false,
      template: '`float gGravity = 9.81f;` → ___ · `int gKills[1024];` → ___ · `const char* const kName = "Forge";` (the characters) → ___ · `int add(int a, int b) { return a + b; }` → ___',
      blanks: [{ answers: ['.data'] }, { answers: ['.bss'] }, { answers: ['.rodata'] }, { answers: ['.text'] }],
      wordBank: ['.data', '.bss', '.rodata', '.text', '.symtab', '.rela.text'],
      explanation:
        '`gGravity` has a non-zero initial value that must be stored, so it goes in `.data`. `gKills` is zero-initialized (globals without an initializer are zeroed), so it takes no file space in `.bss`. String literals are read-only data in `.rodata`. Functions are machine code in `.text`. `.symtab` and `.rela.text` hold bookkeeping for the linker, never your variables.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'The symbol table: what each file offers and needs',
      blocks: [
        {
          type: 'p',
          text: 'Each object file carries a **[[symbol-table]]**: every name it defines, where (section and offset), and every name it uses but does not define. `nm` prints it:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'nm world.o main.o spawn.o',
          code: `world.o:
                 U _Z10spawnCounti
0000000000000040 T _Z11wavesPlayedv
0000000000000000 T _Z8nextWavei
0000000000000000 r _ZL3kXp
0000000000040000 b _ZL6sWaves
0000000000000000 B gGrid
0000000000000000 D gScore

main.o:
0000000000000000 r .LC0
                 U _Z8nextWavei
                 U __printf_chk
                 U gScore
0000000000000000 T main

spawn.o:
0000000000000000 T _Z10spawnCounti`,
          annotations: [
            { lines: 2, text: '`U`: undefined here. `world.o` needs `spawnCount(int)` from somewhere.' },
            { lines: '3-4', text: '`T`: defined in `.text`. The number is the offset inside this file\'s `.text`; real addresses do not exist yet.' },
            { lines: 5, text: 'Lowercase `r`: read-only data with **local** binding. `const` at namespace scope gives internal linkage, so other files cannot see `kXp` (`_ZL` marks it as a local name).' },
            { lines: 6, text: 'Lowercase `b`: `static int sWaves` lives in `.bss`, visible only inside `world.cpp`.' },
            { lines: '7-8', text: 'Uppercase `B` and `D`: global symbols in `.bss` and `.data` that other files may use. `gScore` is not mangled because variable names need no type encoding.' },
            { lines: 11, text: '`.LC0` is GCC\'s local label for the `printf` format string in `.rodata`.' },
            { lines: '12-14', text: '`main.o` needs three symbols. `__printf_chk` is the fortified `printf` that Ubuntu\'s default `_FORTIFY_SOURCE` substitutes; it will come from the C library.' },
          ],
        },
        {
          type: 'table',
          headers: ['Letter', 'Meaning'],
          rows: [
            ['`T` / `t`', 'code in `.text` (global / file-local)'],
            ['`D` / `d`, `B` / `b`, `R` / `r`', 'data in `.data`, `.bss`, `.rodata`'],
            ['`U`', 'undefined: must be supplied by another object file or library'],
            ['`W`', 'weak: may be defined in many files, linker keeps one. Inline functions and template instantiations are emitted this way.'],
          ],
        },
        {
          type: 'p',
          text: 'The linker\'s first job, **symbol resolution**, is matching every `U` with exactly one definition. No match is the familiar "undefined reference"; two strong (non-weak) definitions are "multiple definition". This is also why an `inline` function or a template used in 50 `.cpp` files costs 50 copies in the object files but only one in the executable: each copy is `W`, and the linker keeps one.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'A level file declares `float heightmap[512][512];` at namespace scope, with no initializer. How many bytes of **memory** does it occupy when the game runs?',
      answer: 1048576,
      unit: 'bytes',
      hint: 'Count the elements, then multiply by `sizeof(float)`.',
      explanation:
        '512 × 512 = 262,144 floats × 4 bytes = **1,048,576 bytes** (1 MiB) of memory. But it adds **zero** bytes to the object file and the executable: a global without an initializer is zero-initialized, so it goes in `.bss`, which records only its size. The loader maps zero-filled pages for it at startup, and the OS typically does not even allocate physical pages until the game first touches them.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Relocations: holes the linker fills in',
      blocks: [
        {
          type: 'p',
          text: 'When the assembler encodes `call spawnCount`, it has no idea where `spawnCount` will be: it is not even in this file. So it writes **zeros** as a placeholder and records a **[[relocation]]**: "patch these 4 bytes once you know the address of `spawnCount`". `objdump -dr` shows both:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -dr -M intel world.o (excerpt)',
          code: `   d:  e8 00 00 00 00        call   12 <_Z8nextWavei+0x12>
            e: R_X86_64_PLT32    _Z10spawnCounti-0x4
  ...
  25:  01 05 00 00 00 00     add    DWORD PTR [rip+0x0],eax  # 2b <_Z8nextWavei+0x2b>
           27: R_X86_64_PC32     gScore-0x4`,
          annotations: [
            { lines: 1, text: '`e8` + a 32-bit displacement. The displacement is still 0, so the disassembler shows the call landing on the next instruction.' },
            { lines: 2, text: 'The relocation: at offset `e` (the 4 bytes right after `e8`), store the address of `spawnCount` minus 4, **relative to that spot**. `PLT32` means the target might be in a shared library.' },
            { lines: 4, text: '`gScore += …` writes memory at `[rip + displacement]`. The displacement is also a hole for now.' },
            { lines: 5, text: 'A plain PC-relative relocation for the data symbol `gScore`.' },
          ],
        },
        {
          type: 'p',
          text: 'x86-64 relocations like these are **PC-relative**: the CPU computes the target as "address of the next instruction + displacement". For a field at address P that must reach symbol S, the linker writes `S + A − P`, where the addend A = −4 accounts for the next instruction starting 4 bytes after the field. After linking:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel game (the linked executable, excerpt)',
          code: `    117d:  e8 3e 00 00 00        call   11c0 <_Z10spawnCounti>
    1182:  89 d9                 mov    ecx,ebx
    ...
    1195:  01 05 75 2e 00 00     add    DWORD PTR [rip+0x2e75],eax  # 4010 <gScore>`,
          annotations: [
            { lines: 1, text: '`nextWave` landed at `0x1170`, so the call is at `0x117d` and its field at P = `0x117e`. `spawnCount` landed at S = `0x11c0`. S + A − P = `0x11c0 − 4 − 0x117e` = `0x3e`, stored little-endian as `3e 00 00 00`.' },
            { lines: 4, text: 'P = `0x1197`, S = `gScore` at `0x4010`: `0x4010 − 4 − 0x1197` = `0x2e75`. Check: next instruction `0x119b` + `0x2e75` = `0x4010`.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Resolve symbols', text: 'Match every undefined symbol in every input to exactly one definition (or report an error).' },
            { title: 'Lay out sections', text: 'Concatenate all `.text` sections, all `.rodata`, all `.data`, all `.bss`, and give every section and therefore every symbol its final address.' },
            { title: 'Apply relocations', text: 'Walk each relocation record, compute `S + A − P` (or whatever its type demands) and write the bytes into the hole.' },
            { title: 'Write the executable', text: 'Emit the ELF file with program headers telling the loader which pieces to map where, with which permissions.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why PC-relative?',
          text: 'Because then the code does not care where it is loaded. If the whole program moves by some amount, every instruction and every target move together, and every displacement stays correct. That is **[[position-independent-code|position-independent code]]**, and it is what lets the OS load your executable at a random address each run ([[aslr|ASLR]]) without patching its code. Ubuntu\'s GCC builds position-independent executables by default (`--enable-default-pie`).',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'numeric',
      prompt: 'A `call` instruction (`e8` plus a 4-byte displacement) starts at address `0x2000`, so its displacement field is at P = `0x2001`. The target function ends up at `0x2400`. With addend A = −4, what displacement does the linker write? Answer in hex.',
      answer: '0x3FB',
      alsoAccept: [1019],
      label: 'displacement =',
      hint: 'Compute S + A − P, with S = 0x2400.',
      explanation:
        '`0x2400 + (−4) − 0x2001` = `0x3FB` (1019). Check it the way the CPU does: the instruction after the call starts at `0x2005`, and `0x2005 + 0x3FB` = `0x2400`. The addend −4 is exactly the distance from the start of the field (P) to the end of the instruction, which is where x86-64 measures relative jumps from.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Static and dynamic linking',
      blocks: [
        {
          type: 'p',
          text: 'A **[[static-library]]** (`.a`, or `.lib` on Windows) is just an archive of object files. The linker scans it and copies in **only the members that resolve a currently undefined symbol**:',
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Terminal',
          code: `$ ar rcs libgame.a spawn.o loot.o
$ g++ main.o world.o -L. -lgame -o game2
$ nm -C game2 | grep -E "spawnCount|rollLoot"
00000000000011c0 T spawnCount(int)
$ g++ -L. -lgame main.o world.o -o game3
/usr/bin/ld: world.o: in function \`nextWave(int)':
world.cpp:(.text+0xe): undefined reference to \`spawnCount(int)'
collect2: error: ld returned 1 exit status`,
          annotations: [
            { lines: 1, text: '`loot.o` defines `rollLoot`, which nobody calls.' },
            { lines: 4, text: '`spawn.o` was pulled in because `world.o` needed `spawnCount`. `loot.o` was not, so `rollLoot` is absent from the executable.' },
            { lines: 5, text: 'Same files, library listed **first**.' },
            { lines: 7, text: 'When the linker scanned `libgame.a`, nothing was undefined yet, so it took nothing. It does not go back. Note the `.text+0xe`: the very relocation you just saw.' },
          ],
        },
        {
          type: 'p',
          text: 'A **[[dynamic-library]]** (`.so`, `.dll`, `.dylib`) is linked at **load time** instead. The executable records only the library\'s name; calls go through a small stub:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'game4, linked against libspawn.so (objdump -d -M intel)',
          code: `0000000000001030 <_Z10spawnCounti@plt>:
    1030:  ff 25 92 2f 00 00     jmp    QWORD PTR [rip+0x2f92]
    1036:  68 00 00 00 00        push   0x0
    103b:  e9 e0 ff ff ff        jmp    1020 <_init+0x20>`,
          annotations: [
            { lines: 1, text: 'A **PLT** (procedure linkage table) entry. `nextWave` now calls this stub instead of `spawnCount` directly.' },
            { lines: 2, text: 'Jump to whatever address is stored in a **GOT** (global offset table) slot. The dynamic loader writes `spawnCount`\'s real address there.' },
            { lines: '3-4', text: 'Used only with lazy binding: the first call goes to the loader\'s resolver, which finds the function and fills in the GOT slot. Later calls jump straight through.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Static', 'Dynamic'],
          rows: [
            ['Size of `game` (this example)', '785,640 bytes with `-static` (all of libc copied in)', '16,216 bytes'],
            ['Call cost', 'direct `call`', 'through the [[plt-got|PLT and GOT]]: one extra indirect jump'],
            ['Optimization', 'with [[link-time-optimization|LTO]], can inline across the boundary', 'never inlined across the library boundary'],
            ['Updates and sharing', 'rebuild to update; each program has its own copy', 'update the `.so`/`.dll` alone; pages shared between processes'],
            ['Deployment', 'one self-contained file', '"DLL not found" and version mismatches are possible'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Modules in Unreal',
          text: 'In the editor, every Unreal module is a separate DLL, so Live Coding can rebuild and reload just one, and plugins can be added without relinking the engine. Shipping builds are usually **monolithic**: the whole game and engine linked into one executable, which removes the cross-DLL indirection and lets the linker drop unused code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'truefalse',
      prompt: 'Linking against a static library copies every object file in the archive into the executable.',
      answer: false,
      explanation:
        'The linker extracts only the archive members that define a symbol that is still undefined at that point (and then whatever those members need in turn). In the example, `loot.o` stayed out of the executable because nothing called `rollLoot`. That is also why link order matters for archives: list libraries **after** the objects that use them. Selecting individual functions within one object file needs `-ffunction-sections` plus `--gc-sections`, or LTO.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'From execve to main',
      blocks: [
        {
          type: 'p',
          text: 'When you run `./game`, a surprising amount happens before your first line executes. The executable\'s **program headers** tell the OS what to do:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'readelf -lW game (excerpt; PhysAddr and Align columns removed)',
          code: `Elf file type is DYN (Position-Independent Executable file)
Entry point 0x1080
  Type     Offset   VirtAddr           FileSiz  MemSiz   Flg
  INTERP   0x000318 0x0000000000000318 0x00001c 0x00001c R
      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
  LOAD     0x001000 0x0000000000001000 0x0001d5 0x0001d5 R E
  LOAD     0x002000 0x0000000000002000 0x000138 0x000138 R
  LOAD     0x002db8 0x0000000000003db8 0x00025c 0x040290 RW`,
          annotations: [
            { lines: 2, text: 'Execution starts at `0x1080`, which is not `main` (that is at `0x1050`) but `_start`.' },
            { lines: 5, text: 'The dynamic loader the kernel must start first.' },
            { lines: '6-8', text: 'The segments to map: code (read+execute), read-only data, and read+write data. Addresses are relative: as a PIE, the whole image will be placed at a random base.' },
            { lines: 8, text: 'File size 0x25c but memory size 0x40290: the extra 262 KB is `.bss`, zero-filled.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Kernel: execve', text: 'Reads the ELF header and program headers, maps the `LOAD` segments with their permissions at a randomized base, maps the interpreter `ld-linux-x86-64.so.2`, and builds the initial stack: `argc`, `argv`, the environment and an auxiliary vector.' },
            { title: 'Dynamic loader (ld.so)', text: 'Maps each needed shared library (`libc.so.6`, `libstdc++.so.6`…), applies their relocations and the executable\'s dynamic relocations, fills GOT entries (now or lazily), and runs the libraries\' initializers.' },
            { title: '_start', text: 'The executable\'s entry point, from the C runtime object `crt1.o`. It sets up arguments and calls `__libc_start_main(main, argc, argv, …)`.' },
            { title: 'Static initialization', text: 'libc runs every function listed in the executable\'s `.init_array`: the constructors of your global objects.' },
            { title: 'main', text: 'Your code finally runs.' },
            { title: 'exit', text: 'When `main` returns, libc calls `exit`, which runs `atexit` handlers and destroys static and global objects in reverse order of construction, flushes stdio and asks the kernel to end the process.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'objdump -d -M intel game: the real _start',
          code: `0000000000001080 <_start>:
    1080:  f3 0f 1e fa           endbr64
    1084:  31 ed                 xor    ebp,ebp
    1086:  49 89 d1              mov    r9,rdx
    1089:  5e                    pop    rsi
    108a:  48 89 e2              mov    rdx,rsp
    108d:  48 83 e4 f0           and    rsp,0xfffffffffffffff0
    1091:  50                    push   rax
    1092:  54                    push   rsp
    1093:  45 31 c0              xor    r8d,r8d
    1096:  31 c9                 xor    ecx,ecx
    1098:  48 8d 3d b1 ff ff ff  lea    rdi,[rip+0xffffffffffffffb1]  # 1050 <main>
    109f:  ff 15 33 2f 00 00     call   QWORD PTR [rip+0x2f33]  # 3fd8 <__libc_start_main@GLIBC_2.34>
    10a5:  f4                    hlt`,
          annotations: [
            { lines: 2, text: 'A CET landing pad: the C runtime was compiled with control-flow protection.' },
            { lines: 3, text: 'Zero `rbp`: the outermost frame. Stack walkers stop here.' },
            { lines: 5, text: 'Pop `argc` (the kernel left it on top of the stack) into `rsi`, the second argument; `rdx` then points at `argv`.' },
            { lines: 7, text: 'Force 16-byte stack alignment, as the calling convention requires.' },
            { lines: 12, text: 'The address of `main`, computed PC-relative, becomes the first argument.' },
            { lines: 13, text: 'Call through the GOT into libc. `__libc_start_main` never returns: it calls `exit` itself.' },
            { lines: 14, text: '`hlt` is privileged, so if control ever got here the process would crash immediately. It is a tripwire.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Code that runs before and after main',
      blocks: [
        {
          type: 'p',
          text: 'The constructors of global objects run before `main` and their destructors after it. The compiler arranges this by emitting a small initialization function for each translation unit and putting its address in `.init_array`:',
        },
        {
          type: 'code',
          title: 'lifetime.cpp',
          runnable: true,
          code: `#include <cstdio>

struct Logger {
    const char* name;
    explicit Logger(const char* n) : name(n) {
        std::printf("construct %s\\n", name);
    }
    ~Logger() { std::printf("destroy %s\\n", name); }
};

Logger gAudio{"audio"};      // global: built before main
Logger gRender{"render"};

int main() {
    std::printf("main starts\\n");
    static Logger sLevel{"level"};   // built on first pass
    std::printf("main returns\\n");
}`,
          output: 'construct audio\nconstruct render\nmain starts\nconstruct level\nmain returns\ndestroy level\ndestroy render\ndestroy audio',
          annotations: [
            { lines: '11-12', text: 'Within one translation unit, globals are constructed in definition order. `objdump -h` on this object file shows an 8-byte `.init_array`: one pointer to the generated initializer that builds both.' },
            { lines: 16, text: 'A function-local static is built the first time execution reaches it (thread-safely), not at startup.' },
            { lines: 18, text: 'After `main` returns, `exit` destroys everything in **reverse** order of construction, including `sLevel`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The static initialization order fiasco',
          text: 'The order **between** translation units is unspecified. If a global in `audio.cpp` uses a global from `config.cpp` during construction, it may run first and read an unconstructed object, and the order can change when you add a file or switch linkers. Engines avoid non-trivial globals for exactly this reason, preferring explicit init functions, function-local statics or `constinit`.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Startup time',
          text: 'Everything before `main` counts against your game\'s launch time: mapping dozens of shared libraries, applying their relocations, running every global constructor. Large applications measure this, and linking statically or reducing global constructors are standard fixes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put these events in the order they happen when you launch a dynamically linked C++ program on Linux.',
      linesAreCode: false,
      lines: [
        'The kernel maps the executable\'s segments and the dynamic loader',
        'The dynamic loader maps shared libraries and applies relocations',
        '`_start` calls `__libc_start_main`',
        'Constructors listed in `.init_array` build the global objects',
        '`main` runs',
        '`exit` destroys global objects in reverse order',
      ],
      distractors: ['The linker resolves undefined symbols in the object files'],
      explanation:
        'The kernel can only hand control to the loader once both are mapped; the loader must finish relocating before any code that calls into a library runs; `_start` is the executable\'s first instruction; libc runs the initializers before calling `main`, and tears down after it returns. The distractor happened long before, at **build** time: by launch, static symbol resolution is finished, and only dynamic symbols remain to be bound.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'bug',
      prompt: 'Both files include `stats.h`. The HUD shows 0 frames even after the render loop has run for minutes. Tap the line responsible.',
      code: `// ---- stats.h ----
#pragma once
static int gFrameCount = 0;

// ---- render.cpp ----
#include "stats.h"
void renderFrame() {
    ++gFrameCount;
}

// ---- hud.cpp ----
#include <cstdio>
#include "stats.h"
void drawHud() {
    std::printf("frames: %d\\n", gFrameCount);
}`,
      bugLines: [3],
      explanation:
        '`static` at namespace scope gives **internal linkage**: each translation unit that includes the header gets its **own** private `gFrameCount`. `nm` would show a local `b gFrameCount` in both `render.o` and `hud.o`, so the linker never connects them; `renderFrame` increments one copy and `drawHud` prints the other, which stays 0. No error, no warning. Fix: declare `extern int gFrameCount;` in the header and define it in exactly one `.cpp`, or (C++17) write `inline int gFrameCount = 0;`, which gives one shared object.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'The disassembly of a function in a Linux executable reads globals as `DWORD PTR [rip+0x2e75]` rather than with an absolute address. What does this buy?',
      options: [
        { text: 'Faster loads: RIP-relative addressing skips the cache', why: 'All loads go through the same caches. The addressing form only changes how the address is computed.' },
        { text: 'The code works unchanged wherever the executable is loaded, so it can be placed at a random address (ASLR) without patching instructions', correct: true, why: 'The distance between an instruction and the data it uses is fixed at link time, so a displacement from `rip` stays valid when the whole image moves.' },
        { text: 'It lets two processes share one copy of each global variable', why: 'Each process gets its own private copy of writable data. Sharing applies to read-only pages such as code, and PC-relative code makes that sharing easier, but globals are never shared.' },
        { text: 'It is required because x86-64 has no instruction form for absolute addresses', why: 'x86-64 can use 32-bit absolute addresses (and `movabs` for 64-bit ones). Compilers avoid them in position-independent code because they would need patching at load time.' },
      ],
      explanation:
        'Position-independent code reaches its code and data relative to the instruction pointer, so only the base address changes between runs. That makes ASLR cheap for executables and is mandatory for shared libraries, which may load at any address. Accesses to data in **other** libraries still need one extra indirection through the GOT, because their distance is not known at link time.',
    },
  ],
  takeaways: [
    '`-save-temps` keeps the `.ii`, `.s` and `.o` of each stage; a single `#include <iostream>` expands to about 44,000 lines that every including file re-parses.',
    'Object files group contents into sections: `.text` (code), `.data` (initialized globals), `.bss` (zero-initialized globals, size only), `.rodata` (constants). They become segments with read/write/execute permissions.',
    'The symbol table lists what a file defines (`T`, `D`, `B`, `R`, local in lowercase, weak `W`) and needs (`U`); symbol resolution matches them.',
    'Relocations are placeholders the linker patches once addresses are known; x86-64 mostly uses PC-relative ones (`S + A − P`), which also make code position-independent.',
    'Static archives contribute only the members that resolve undefined symbols (so link order matters); dynamic libraries are bound at load time through the PLT and GOT.',
    'Before `main`: kernel mapping, the dynamic loader, `_start`, `__libc_start_main` and global constructors from `.init_array`; after it, `exit` destroys globals in reverse order.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective (CS:APP)',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 7, "Linking", covers symbol resolution, relocation, static and shared libraries in exactly this depth.',
    },
    {
      title: 'Executable and Linkable Format (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Executable_and_Linkable_Format',
      source: 'article',
      note: 'The ELF header, section header and program header layouts, with diagrams.',
    },
    {
      title: 'Static initialization order fiasco (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/language/siof',
      source: 'cppreference',
      note: 'Why the order of global constructors across files is unspecified, and the standard workarounds.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Turn on "Compile to binary object" to see relocations and raw bytes next to the assembly.',
    },
  ],
};
