import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-objects-in-memory',
  title: 'Objects, Alignment and Virtual Dispatch',
  summary: 'Your classes at the byte level: layout, padding and alignas, how member functions receive this, the real machine code of a virtual call and of devirtualization, and lambdas and std::function as objects.',
  minutes: 20,
  objectives: [
    'Predict struct layout, padding and size with sizeof, alignof and offsetof, and reorder members to remove padding',
    'Use alignas for SIMD and cache-line alignment, and explain what misaligned access costs and why it is undefined behavior in C++',
    'Explain how a member function receives `this` in a register and reaches fields at fixed offsets',
    'Read the real vtable, vptr store and virtual call that GCC emits, and explain thunks for multiple inheritance',
    'Explain devirtualization (including speculative devirtualization) and the cost model of lambdas versus std::function',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The layout rules',
      blocks: [
        {
          type: 'p',
          text: 'In C++ Fundamentals you met [[sizeof]], [[memory-alignment|alignment]] and padding. Here are the exact rules that GCC, Clang and MSVC follow for an ordinary struct, all set by the platform [[abi|ABI]]:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'Members are placed in **declaration order** (the standard guarantees this for members with the same access).',
            'Each member starts at the next offset that is a multiple of its own `alignof`.',
            'The struct\'s alignment is the largest alignment of its members.',
            'The struct\'s size is rounded up to a multiple of its alignment, so that in an array every element, and every member of every element, is aligned.',
          ],
        },
        {
          type: 'code',
          title: 'layout.cpp',
          runnable: true,
          code: `#include <cstddef>
#include <cstdint>
#include <cstdio>

struct Particle {           // declared "naturally"
    bool alive;             // 1 byte
    double x, y;            // 8 bytes each
    std::uint16_t frame;    // 2 bytes
    float life;             // 4 bytes
    std::uint8_t color;     // 1 byte
};

struct PackedParticle {     // same members, largest first
    double x, y;
    float life;
    std::uint16_t frame;
    std::uint8_t color;
    bool alive;
};

#define SHOW(T, m) std::printf("  %-6s offset %2zu  size %zu\\n", \\
    #m, offsetof(T, m), sizeof(T::m))

int main() {
    std::printf("Particle: sizeof %zu, alignof %zu\\n",
                sizeof(Particle), alignof(Particle));
    SHOW(Particle, alive); SHOW(Particle, x); SHOW(Particle, y);
    SHOW(Particle, frame); SHOW(Particle, life);
    SHOW(Particle, color);
    std::printf("PackedParticle: sizeof %zu, alignof %zu\\n",
                sizeof(PackedParticle), alignof(PackedParticle));
    SHOW(PackedParticle, x); SHOW(PackedParticle, y);
    SHOW(PackedParticle, life); SHOW(PackedParticle, frame);
    SHOW(PackedParticle, color); SHOW(PackedParticle, alive);
}`,
          output: 'Particle: sizeof 40, alignof 8\n  alive  offset  0  size 1\n  x      offset  8  size 8\n  y      offset 16  size 8\n  frame  offset 24  size 2\n  life   offset 28  size 4\n  color  offset 32  size 1\nPackedParticle: sizeof 24, alignof 8\n  x      offset  0  size 8\n  y      offset  8  size 8\n  life   offset 16  size 4\n  frame  offset 20  size 2\n  color  offset 22  size 1\n  alive  offset 23  size 1',
          annotations: [
            { lines: '6-7', text: '`alive` takes offset 0; `x` needs a multiple of 8, so offsets 1–7 become padding.' },
            { lines: '8-9', text: '`frame` fits at 24, but `life` needs a multiple of 4: two more padding bytes at 26–27.' },
            { lines: 10, text: '`color` at 32 ends the data at 33; the size is rounded up to 40 (a multiple of 8). Seven bytes of tail padding.' },
            { lines: '13-19', text: 'Sorted by alignment, the members pack with no gaps at all: 8 + 8 + 4 + 2 + 1 + 1 = 24.' },
            { lines: '21-22', text: '`offsetof` gives a member\'s byte offset. It is only guaranteed for standard-layout types, which these are.' },
          ],
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg"><text x="20" y="18" font-size="13" font-weight="600">Particle: 40 bytes, 16 of them padding</text><text x="20" y="38" text-anchor="middle" font-size="9" class="t-gray">0</text><text x="116" y="38" text-anchor="middle" font-size="9" class="t-gray">8</text><text x="212" y="38" text-anchor="middle" font-size="9" class="t-gray">16</text><text x="308" y="38" text-anchor="middle" font-size="9" class="t-gray">24</text><text x="404" y="38" text-anchor="middle" font-size="9" class="t-gray">32</text><text x="500" y="38" text-anchor="middle" font-size="9" class="t-gray">40</text><rect x="20" y="44" width="12" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="26.0" y="67" text-anchor="middle" font-size="11" class="t-orange">a</text><rect x="32" y="44" width="84" height="36" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" class="s-gray f-gray"/><text x="74.0" y="67" text-anchor="middle" font-size="10" class="t-gray">pad</text><rect x="116" y="44" width="96" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="164.0" y="67" text-anchor="middle" font-size="11" class="t-blue">x</text><rect x="212" y="44" width="96" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="260.0" y="67" text-anchor="middle" font-size="11" class="t-blue">y</text><rect x="308" y="44" width="24" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="320.0" y="67" text-anchor="middle" font-size="11" class="t-green">fr</text><rect x="332" y="44" width="24" height="36" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" class="s-gray f-gray"/><rect x="356" y="44" width="48" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="380.0" y="67" text-anchor="middle" font-size="11" class="t-purple">life</text><rect x="404" y="44" width="12" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-teal"/><text x="410.0" y="67" text-anchor="middle" font-size="11" class="t-teal">c</text><rect x="416" y="44" width="84" height="36" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" class="s-gray f-gray"/><text x="458.0" y="67" text-anchor="middle" font-size="10" class="t-gray">pad</text><text x="20" y="114" font-size="13" font-weight="600">PackedParticle: 24 bytes, no padding</text><text x="20" y="134" text-anchor="middle" font-size="9" class="t-gray">0</text><text x="116" y="134" text-anchor="middle" font-size="9" class="t-gray">8</text><text x="212" y="134" text-anchor="middle" font-size="9" class="t-gray">16</text><text x="308" y="134" text-anchor="middle" font-size="9" class="t-gray">24</text><text x="404" y="134" text-anchor="middle" font-size="9" class="t-gray">32</text><text x="500" y="134" text-anchor="middle" font-size="9" class="t-gray">40</text><rect x="20" y="140" width="96" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="68.0" y="163" text-anchor="middle" font-size="11" class="t-blue">x</text><rect x="116" y="140" width="96" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="164.0" y="163" text-anchor="middle" font-size="11" class="t-blue">y</text><rect x="212" y="140" width="48" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="236.0" y="163" text-anchor="middle" font-size="11" class="t-purple">life</text><rect x="260" y="140" width="24" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="272.0" y="163" text-anchor="middle" font-size="11" class="t-green">fr</text><rect x="284" y="140" width="12" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-teal"/><text x="290.0" y="163" text-anchor="middle" font-size="11" class="t-teal">c</text><rect x="296" y="140" width="12" height="36" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="302.0" y="163" text-anchor="middle" font-size="11" class="t-orange">a</text><text x="20" y="206" font-size="11" class="t-gray">a = alive (bool), fr = frame (uint16_t), c = color (uint8_t). Numbers are byte offsets.</text></svg>',
          alt: 'Two byte strips. Particle: alive at byte 0, padding 1 to 7, x at 8, y at 16, frame at 24, padding 26 to 27, life at 28, color at 32, padding 33 to 39, 40 bytes total. PackedParticle: x at 0, y at 8, life at 16, frame at 20, color at 22, alive at 23, 24 bytes total.',
          caption: 'Same six members, two orders. Dashed boxes are padding the compiler must insert to keep each member aligned.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why doesn\'t the compiler reorder members for you?',
          text: 'Because the layout is part of the ABI and of the language\'s promises. Code compiled separately (another `.cpp`, a DLL, a plugin) must agree on where `x` is; C APIs, file formats, network packets and GPU buffers depend on declaration order; and the standard guarantees that members with the same access appear in order. So the compiler pads, and leaving the padding is your choice.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'On x86-64 Linux, what is `sizeof(Bullet)`?',
      code: `struct Bullet {
    char type;
    double x;
    int dmg;
    char team;
};`,
      answer: 24,
      unit: 'bytes',
      hint: 'Place each member at the next multiple of its alignment, then round the total up to a multiple of the largest alignment.',
      explanation:
        '`type` at 0; `x` needs a multiple of 8, so 7 padding bytes and `x` at 8–15; `dmg` at 16–19; `team` at 20. The data ends at 21, and the struct\'s alignment is 8 (from `double`), so the size rounds up to **24**: 10 of the 24 bytes are padding. Ordered `double`, `int`, `char`, `char`, the same members need only 16.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Padding costs cache, not just memory',
      blocks: [
        {
          type: 'p',
          text: 'GCC and Clang will point out every gap if you ask with `-Wpadded`. On `layout.cpp`:',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ -std=c++20 -c -Wpadded layout.cpp',
          code: `layout.cpp:7:12: warning: padding struct to align 'Particle::x' [-Wpadded]
layout.cpp:9:11: warning: padding struct to align 'Particle::life' [-Wpadded]
layout.cpp:5:8: warning: padding struct size to alignment boundary with 7 bytes [-Wpadded]`,
          annotations: [
            { lines: '1-3', text: 'One warning per gap. The flag is too noisy to leave on for a whole engine, but it is excellent for auditing hot structs.' },
          ],
        },
        {
          type: 'p',
          text: 'Why care about 16 bytes? Multiply by the number of objects you touch per frame. One million particles take 40 MB as `Particle` and 24 MB as `PackedParticle`. A 64-byte cache line holds 1.6 of the first and 2.67 of the second, so an update loop over all particles streams **40% less memory** through the caches after the reorder, for free.',
        },
        {
          type: 'table',
          headers: ['Technique', 'What it does'],
          rows: [
            ['Sort members by alignment (largest first)', 'removes most padding, as above'],
            ['Use the smallest type that fits', '`std::uint8_t` for a color index, `std::uint16_t` for an animation frame'],
            ['Bit-fields or flag bytes', 'pack `bool`s into bits (Unreal\'s `uint8 bIsActive : 1;`)'],
            ['Hot/cold splitting', 'move rarely used fields (debug names, spawn info) into a separate struct, so loops touch only hot data'],
            ['Structure of arrays (SoA)', 'one array per field, so a loop reading only `x` and `y` loads nothing else (the Memory Hierarchy unit measures this)'],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Struct size is a performance budget',
          text: 'Data-oriented engines treat the size of hot components the way they treat milliseconds: as a budget. A transform or particle that grows past 64 bytes straddles two cache lines; one that shrinks from 40 to 24 bytes makes every system that iterates it faster without changing a line of logic. Check with `static_assert(sizeof(Particle) == 24);` so a teammate\'s new `bool` does not silently undo it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'alignas, and why misaligned access is a bug',
      blocks: [
        {
          type: 'p',
          text: '`alignas(N)` raises a type\'s or variable\'s alignment to N bytes (a power of two). Two values matter in game code: **16** for SSE vectors and **64** for cache lines:',
        },
        {
          type: 'code',
          title: 'align.cpp',
          runnable: true,
          code: `#include <cstdio>

struct alignas(16) Vec4 { float x, y, z, w; };
struct alignas(64) Counter { long value; };
struct Transform { Vec4 pos; Vec4 rot; float scale; };

int main() {
    std::printf("Vec4      size %2zu align %2zu\\n", sizeof(Vec4), alignof(Vec4));
    std::printf("Counter   size %2zu align %2zu\\n", sizeof(Counter), alignof(Counter));
    std::printf("Transform size %2zu align %2zu\\n", sizeof(Transform), alignof(Transform));
    Counter counters[4];
    std::printf("counters  size %zu\\n", sizeof(counters));
}`,
          output: 'Vec4      size 16 align 16\nCounter   size 64 align 64\nTransform size 48 align 16\ncounters  size 256',
          annotations: [
            { lines: 3, text: 'Aligned to 16 so SIMD code can load it with one aligned 16-byte instruction. This is what `XMFLOAT4A` in DirectXMath and aligned types in glm provide.' },
            { lines: 4, text: 'An 8-byte value padded to a whole 64-byte cache line. Per-thread counters laid out like this never share a line, which avoids *false sharing* (the Multicore unit). C++17 names the number `std::hardware_destructive_interference_size`.' },
            { lines: 5, text: 'Alignment is contagious: `Transform` inherits 16-byte alignment from `Vec4`, so `32 + 4` bytes of data round up to 48.' },
            { lines: 11, text: '4 × 64 = 256 bytes for four `long`s: alignment trades memory for isolation.' },
          ],
        },
        {
          type: 'p',
          text: 'What if data is **not** aligned? x86-64 hardware tolerates it for ordinary loads: `mov` from an odd address works, at full speed unless the access crosses a 64-byte cache line or a 4 KiB page. But aligned SSE instructions such as `movaps` fault on a misaligned address, some older ARM cores fault on any misaligned access, and atomic operations that cross a cache line are slow or not atomic at all.',
        },
        {
          type: 'p',
          text: 'In C++, the rule is simpler and stricter: accessing an object through a pointer that is not suitably aligned for its type is [[undefined-behavior]], whatever the CPU would do. The compiler is entitled to assume alignment, for example by vectorizing with aligned instructions. The portable way to read a value from arbitrary bytes is `std::memcpy` (or C++20 `std::bit_cast` for whole objects), and it costs nothing:',
        },
        {
          type: 'code',
          title: 'read.cpp, and g++ 13 -O2 output',
          code: `std::uint32_t readU32(const unsigned char* buf) {
    std::uint32_t v;
    std::memcpy(&v, buf, sizeof v);
    return v;
}
// _Z7readU32PKh:
//     mov     eax, DWORD PTR [rdi]
//     ret`,
          annotations: [
            { lines: 3, text: '`memcpy` of a small fixed size is not a library call. The compiler knows its meaning and emits the best load the target allows.' },
            { lines: '6-8', text: 'On x86-64 that is one plain `mov`, which tolerates any alignment. On a target that faults on misaligned loads, it would emit byte loads instead. Either way the code is correct.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'This network code parses a packet: a 1-byte message type followed by a 4-byte player id. It "works on PC" but is undefined behavior and crashes on some platforms. Tap the faulty line.',
      code: `#include <cstdint>
#include <cstring>

struct Packet {
    std::uint8_t type;
    std::uint32_t playerId;
};

Packet parse(const unsigned char* bytes) {
    Packet p;
    p.type = bytes[0];
    p.playerId = *reinterpret_cast<const std::uint32_t*>(bytes + 1);
    return p;
}`,
      bugLines: [12],
      explanation:
        '`bytes + 1` is almost certainly not 4-byte aligned, and reading a `uint32_t` through it is undefined behavior twice over: misaligned access, and a strict-aliasing violation (the bytes were not created as a `uint32_t`). x86-64 hardware happens to tolerate the load, but the compiler may assume alignment and vectorize or combine it into instructions that fault, and other CPUs may trap. Fix: `std::memcpy(&p.playerId, bytes + 1, sizeof p.playerId);`, which compiles to the same single `mov` on x86-64. Note also that the wire format must fix the byte order; `memcpy` reads it in the host\'s order.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'How a member function gets this',
      blocks: [
        {
          type: 'p',
          text: 'At the machine level there are no member functions, only functions. A non-static member function is an ordinary function with one extra, hidden first parameter: the object\'s address, which you know as the [[this-pointer|this]] pointer. Under System V it arrives in `rdi`, so the visible parameters shift over by one register:',
        },
        {
          type: 'code',
          title: 'enemy.cpp',
          code: `struct Enemy {
    int hp;       // offset 0
    int armor;    // offset 4
    int takeDamage(int dmg);
    static int maxHp();
};
int Enemy::takeDamage(int dmg) {
    int dealt = dmg - armor;
    if (dealt > 0) hp -= dealt;
    return hp;
}
int Enemy::maxHp() { return 999; }`,
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_ZN5Enemy10takeDamageEi:
    sub     esi, DWORD PTR 4[rdi]
    mov     eax, DWORD PTR [rdi]
    test    esi, esi
    jle     .L1
    sub     eax, esi
    mov     DWORD PTR [rdi], eax
.L1:
    ret
_ZN5Enemy5maxHpEv:
    mov     eax, 999
    ret`,
          annotations: [
            { lines: 1, text: 'The mangled name encodes the class: `_ZN5Enemy10takeDamageEi` is `Enemy::takeDamage(int)`.' },
            { lines: 2, text: '`this` is in `rdi` and `dmg` in `esi` (the **second** argument register). `armor` is `this->armor`, the 4 bytes at offset 4: `4[rdi]`.' },
            { lines: 3, text: '`hp` is `this->hp` at offset 0.' },
            { lines: 7, text: 'Writing `hp` stores through `this`. Fields are just fixed offsets from one register.' },
            { lines: '10-12', text: 'A **static** member function has no `this`: it is a plain function scoped inside the class name.' },
          ],
        },
        {
          type: 'p',
          text: 'So `goblin.takeDamage(40)` compiles to exactly what `Enemy_takeDamage(&goblin, 40)` would in C. On Windows x64, `this` arrives in `rcx` and `dmg` in `edx`. (32-bit MSVC used a separate `thiscall` convention with `this` in `ecx`; on x64 member functions use the ordinary convention.) And because the body is visible, the call is usually inlined: a caller `hitGoblin(Enemy& g) { return g.takeDamage(40); }` compiles to the same arithmetic with the constant 40 folded in, and no call at all.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why member access through this can be slower than locals',
          text: 'Fields live in memory behind a pointer, so the compiler must assume a store through some other pointer might change them (aliasing, from the previous lesson). In a long loop that updates `hp` and calls other functions, it may reload and re-store the field each time. Copying a hot field into a local, working on the local and writing it back once is a classic micro-optimization; check the assembly to see whether your compiler already did it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'On Linux x86-64, `player.heal(25, 1.5f)` calls `void Player::heal(int amount, float multiplier)`, a non-static member function that is not inlined. Where are its three inputs at the first instruction of `heal`?',
      options: [
        { text: '`amount` in `edi`, `multiplier` in `xmm0`, and `this` nowhere: the callee finds the object some other way', why: 'Without `this` the function could not know which player to heal. The object\'s address is always passed explicitly.' },
        { text: '`this` in `rdi`, `amount` in `esi`, `multiplier` in `xmm0`', correct: true, why: '`this` is the hidden first integer argument, so `amount` moves to the second integer register. Floating-point arguments have their own sequence, starting at `xmm0`.' },
        { text: '`this` in `rdi`, `amount` in `esi`, `multiplier` in `xmm2`', why: 'System V counts floating-point arguments separately from integer ones, so the first float is in `xmm0` regardless of how many integer arguments precede it.' },
        { text: '`this` in `rcx`, `amount` in `edx`, `multiplier` in `xmm2`', why: 'That is the Microsoft x64 assignment (by position). On Linux the System V rules apply.' },
      ],
      explanation:
        'A member function call is a plain call with `this` prepended to the argument list. The calling convention then assigns registers as usual: on System V, integer/pointer arguments take `rdi, rsi, rdx, …` and floating-point ones `xmm0, xmm1, …`, independently. On Windows the same call would use `rcx` for `this`, `edx` for `amount` and `xmm2` for `multiplier` (positions 1, 2 and 3).',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'The vtable and vptr in real machine code',
      blocks: [
        {
          type: 'p',
          text: 'The C++ Fundamentals lesson "Under the Hood: How Virtual Calls Work" introduced the [[vptr]] in each object and the [[vtable]] per class. Now look at the real thing, compiled by GCC 13 at `-O2`:',
        },
        {
          type: 'code',
          title: 'shapes.cpp',
          code: `struct Shape {
    virtual ~Shape() = default;
    virtual float area() const = 0;
    virtual const char* name() const { return "shape"; }
};
struct Circle : Shape {
    float r = 1.0f;
    float area() const override { return 3.14159f * r * r; }
};

Shape* makeCircle() { return new Circle; }
float doubledArea(const Shape& s) { return s.area() * 2.0f; }`,
          annotations: [
            { lines: 2, text: 'A virtual destructor, so `delete` through a `Shape*` works. It occupies two vtable slots, as you will see.' },
            { lines: 12, text: 'The listing below shows this function compiled in a file that sees only `Shape`, so the dynamic type of `s` is unknown. In this same file, where `Circle::area` is visible, GCC would add a speculative guess for `Circle` (see devirtualization below).' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel (excerpts)',
          code: `_ZTV6Circle:                 # vtable for Circle (48 bytes)
    .quad   0
    .quad   _ZTI6Circle
    .quad   _ZN6CircleD1Ev
    .quad   _ZN6CircleD0Ev
    .quad   _ZNK6Circle4areaEv
    .quad   _ZNK5Shape4nameEv

_Z10makeCirclev:
    sub     rsp, 8
    mov     edi, 16
    call    _Znwm@PLT
    lea     rdx, _ZTV6Circle[rip+16]
    mov     QWORD PTR [rax], rdx
    mov     DWORD PTR 8[rax], 0x3f800000
    add     rsp, 8
    ret

_Z11doubledAreaRK5Shape:
    sub     rsp, 8
    mov     rax, QWORD PTR [rdi]
    call    [QWORD PTR 16[rax]]
    add     rsp, 8
    addss   xmm0, xmm0
    ret`,
          annotations: [
            { lines: 2, text: '"Offset to top": 0 here; non-zero for secondary bases in multiple inheritance.' },
            { lines: 3, text: 'A pointer to the class\'s `type_info`, used by `dynamic_cast` and `typeid`.' },
            { lines: '4-5', text: 'Two destructor slots: D1 destroys the object; D0 destroys it **and** frees its memory (`delete p`).' },
            { lines: '6-7', text: 'The overrides: `Circle::area`, and the inherited `Shape::name`.' },
            { lines: 11, text: '`operator new(16)`: a `Circle` is 8 bytes of vptr + 4 bytes of `r` + 4 bytes of tail padding.' },
            { lines: '13-14', text: 'The constructor, fully inlined, stores the vptr: the address of the vtable **plus 16**, skipping the two header entries so that slot 0 is the first function.' },
            { lines: 15, text: '`r = 1.0f` (`0x3f800000` is 1.0 in IEEE 754).' },
            { lines: 21, text: 'Load the vptr from the first 8 bytes of the object.' },
            { lines: 22, text: 'Call through slot 2 (`area`): vptr + 16. One indirect call; the callee gets `this` in `rdi`, which still holds `&s`.' },
          ],
        },
        {
          type: 'figure',
          svg: '<svg viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg"><text x="20" y="40" font-size="13" font-weight="600">Circle object (16 B)</text><rect x="20" y="50" width="140" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-orange"/><text x="28" y="71" font-size="12" class="t-orange">vptr</text><text x="154" y="71" text-anchor="end" font-size="10" class="t-gray">8 B</text><rect x="20" y="82" width="140" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-blue"/><text x="28" y="103" font-size="12" class="t-blue">r = 1.0f</text><text x="154" y="103" text-anchor="end" font-size="10" class="t-gray">4 B</text><rect x="20" y="114" width="140" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="28" y="135" font-size="12" class="t-gray">padding</text><text x="154" y="135" text-anchor="end" font-size="10" class="t-gray">4 B</text><text x="20" y="170" font-size="11" class="t-gray">this (in rdi) points here</text><text x="240" y="18" font-size="13" font-weight="600">vtable for Circle (48 B, read-only)</text><rect x="240" y="28" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="248" y="49" font-size="10" font-family="monospace" class="t-gray">+0</text><text x="280" y="49" font-size="12" class="t-gray">offset to top = 0</text><rect x="240" y="60" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-gray"/><text x="248" y="81" font-size="10" font-family="monospace" class="t-gray">+8</text><text x="280" y="81" font-size="12" class="t-gray">&amp;typeinfo for Circle</text><rect x="240" y="92" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="248" y="113" font-size="10" font-family="monospace" class="t-gray">+16</text><text x="280" y="113" font-size="12" class="t-green">~Circle()</text><text x="494" y="113" text-anchor="end" font-size="10" font-family="monospace" class="t-gray">vptr+0</text><rect x="240" y="124" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-green"/><text x="248" y="145" font-size="10" font-family="monospace" class="t-gray">+24</text><text x="280" y="145" font-size="12" class="t-green">~Circle() + delete</text><text x="494" y="145" text-anchor="end" font-size="10" font-family="monospace" class="t-gray">vptr+8</text><rect x="240" y="156" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-purple"/><text x="248" y="177" font-size="10" font-family="monospace" class="t-gray">+32</text><text x="280" y="177" font-size="12" class="t-purple">Circle::area</text><text x="494" y="177" text-anchor="end" font-size="10" font-family="monospace" class="t-gray">vptr+16</text><rect x="240" y="188" width="260" height="32" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-width="1.5" class="s-teal"/><text x="248" y="209" font-size="10" font-family="monospace" class="t-gray">+40</text><text x="280" y="209" font-size="12" class="t-teal">Shape::name</text><text x="494" y="209" text-anchor="end" font-size="10" font-family="monospace" class="t-gray">vptr+24</text><path d="M160,66 C200,66 190,108 230,108" fill="none" stroke="currentColor" stroke-width="2" class="s-orange"/><path d="M230,103 L240,108 L230,113 Z" class="f-orange"/><text x="20" y="222" font-size="12" font-weight="600">s.area() compiles to (g++ -O2):</text><text x="20" y="244" font-size="12" font-family="monospace">mov  rax, QWORD PTR [rdi]</text><text x="250" y="244" font-size="12" class="t-gray">; load the vptr</text><text x="20" y="264" font-size="12" font-family="monospace">call [QWORD PTR 16[rax]]</text><text x="250" y="264" font-size="12" class="t-gray">; call the slot at vptr+16</text><text x="20" y="290" font-size="11" class="t-gray">Itanium C++ ABI layout, used by GCC and Clang on Linux, macOS and Android. MSVC differs.</text></svg>',
          alt: 'A 16-byte Circle object holding a vptr, the float r and 4 bytes of padding. Its vptr points 16 bytes into the 48-byte vtable for Circle, whose entries are offset to top, typeinfo, the two destructors, Circle::area and Shape::name. A virtual call loads the vptr and calls the entry at vptr plus 16.',
          caption: 'The vptr points **into** the vtable, past its two header entries. Slot numbers are fixed by `Shape`, so the same `16[rax]` reaches `area` for every class derived from it.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'MSVC\'s layout',
          text: 'MSVC also puts the vptr first and uses one table per class, but it stores RTTI differently (a pointer just *before* the first slot) and uses a single "scalar deleting destructor" slot that takes a flag, instead of two destructor slots. The ideas transfer; the exact offsets do not, which is one reason C++ classes cannot cross a compiler boundary.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'With GCC on Linux, a class declares, in this order, `virtual ~Unit()`, `virtual void move()`, `virtual void attack()` and `virtual void die()`. A call `u->die()` loads the vptr into `rax`. At what byte offset from `rax` is the slot it calls (`call [QWORD PTR N[rax]]`)?',
      answer: 32,
      unit: 'bytes',
      hint: 'Slots are 8 bytes each, in declaration order, and the virtual destructor takes two of them.',
      explanation:
        'Under the Itanium ABI the slots are: complete destructor (0), deleting destructor (8), `move` (16), `attack` (24), `die` (**32**). The offset-to-top and typeinfo entries sit *before* the address the vptr holds, so they do not count. MSVC, with a single destructor slot, would use 24 for the same call.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Devirtualization: when the vtable disappears',
      blocks: [
        {
          type: 'p',
          text: 'An indirect call is cheap when predicted, but it blocks [[function-inlining|inlining]], which is usually the real cost. So compilers try hard to prove which function will run: [[devirtualization]]. Three real cases from GCC 13 at `-O2`:',
        },
        {
          type: 'code',
          title: 'devirt.cpp',
          code: `struct Circle final : Shape {      // final: no subclasses
    float r = 1.0f;
    float area() const override { return 3.14159f * r * r; }
};
float circleArea(const Circle& c) { return c.area(); }
float areaOf(const Shape& s) { return s.area(); }`,
          annotations: [
            { lines: 1, text: '`final` promises that nothing derives from `Circle`.' },
            { lines: 5, text: 'Through a `Circle&`, the dynamic type can only be `Circle`.' },
            { lines: 6, text: 'Through a `Shape&`, it could be anything, but in this translation unit `Circle` is the only class GCC can see that overrides `area`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel',
          code: `_Z10circleAreaRK6Circle:
    movss   xmm1, DWORD PTR 8[rdi]
    movss   xmm0, DWORD PTR .LC1[rip]
    mulss   xmm0, xmm1
    mulss   xmm0, xmm1
    ret
_Z6areaOfRK5Shape:
    mov     rax, QWORD PTR [rdi]
    lea     rdx, _ZNK6Circle4areaEv[rip]
    mov     rax, QWORD PTR 16[rax]
    cmp     rax, rdx
    jne     .L9
    movss   xmm1, DWORD PTR 8[rdi]
    movss   xmm0, DWORD PTR .LC1[rip]
    mulss   xmm0, xmm1
    mulss   xmm0, xmm1
    ret
.L9:
    jmp     rax`,
          annotations: [
            { lines: '2-5', text: '`final` made the call direct, and then it was inlined: `3.14159f * r * r` computed right here, no vtable in sight.' },
            { lines: '8-11', text: '**Speculative devirtualization**: load the slot\'s function pointer and compare it with `Circle::area`\'s address…' },
            { lines: '13-17', text: '…if they match, run an inlined copy of `Circle::area`;' },
            { lines: '18-19', text: '…otherwise fall back to a real indirect call (as a tail jump).' },
          ],
        },
        {
          type: 'p',
          text: 'The third case is the plain virtual call in `doubledArea` above, compiled where GCC saw no implementation of `area` at all: two instructions, `mov` then `call [QWORD PTR 16[rax]]`, and nothing can be inlined. Which of the three you get depends on what the compiler can see, which is why `final`, LTO and keeping concrete types visible matter.',
        },
        {
          type: 'deepdive',
          title: 'Multiple inheritance: two vptrs and a thunk',
          blocks: [
            {
              type: 'p',
              text: 'With `struct Player : Drawable, Updatable { int hp = 100; … }`, where both bases have virtual functions, a `Player` holds **two** vptrs: one for the `Drawable` part at offset 0, one for the `Updatable` part at offset 8, then `hp` at 16 (24 bytes in all). Converting a `Player*` to `Updatable*` adds 8. So when `update()` is called through an `Updatable*`, `this` points 8 bytes into the object, and the override, which expects the start of a `Player`, cannot use it directly.',
            },
            {
              type: 'code',
              lang: 'text',
              title: 'g++ 13 -O2: the real override and its thunk',
              code: `_ZN6Player6updateEv:
    sub     DWORD PTR 16[rdi], 1
    ret
_ZThn8_N6Player6updateEv:
    sub     DWORD PTR 8[rdi], 1
    ret`,
              annotations: [
                { lines: 2, text: '`hp -= 1` with `this` at the start of the `Player`: `hp` is at offset 16.' },
                { lines: 4, text: 'A **[[this-adjusting-thunk|this-adjusting thunk]]**: "non-virtual thunk, adjust `this` by −8, then `Player::update`". Its address is what the `Updatable` vtable holds.' },
                { lines: 5, text: 'Normally a thunk is `sub rdi, 8` followed by a jump to the real function. Here GCC folded the adjustment into the body: `this − 8 + 16` = `this + 8`.' },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'truefalse',
      prompt: 'GCC can inline the body of a virtual function at a call through a base-class reference even when it cannot prove the object\'s dynamic type.',
      answer: true,
      explanation:
        'That is speculative devirtualization, which GCC enables at `-O2` (`-fdevirtualize-speculatively`). In `areaOf`, it compares the vtable slot with the address of the one override it knows about, runs an inlined copy on a match, and falls back to the real indirect call otherwise. The guess is checked at run time, so it is always correct; it pays off when the guessed type is the common one. Profile-guided optimization makes such guesses from measured data.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Lambdas and std::function are objects too',
      blocks: [
        {
          type: 'p',
          text: 'A [[lambda]] is an object of an unnamed class whose data members are its captures and whose `operator()` is the body (C++ Fundamentals\' closure class). So it has a `sizeof` like any struct. [[std-function]] is a different kind of object: a fixed-size wrapper that can hold *any* callable with the right signature, using [[type-erasure]]. Both are measurable:',
        },
        {
          type: 'code',
          title: 'callables.cpp',
          runnable: true,
          code: `#include <array>
#include <cstdio>
#include <cstdlib>
#include <functional>
#include <new>

static int gAllocs = 0;
void* operator new(std::size_t n) {
    ++gAllocs;
    if (void* p = std::malloc(n)) return p;
    throw std::bad_alloc{};
}
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }

int main() {
    int bonus = 5;
    double scale = 1.5;
    std::array<int, 8> table{};

    auto none  = [](int x) { return x + 1; };
    auto byVal = [bonus](int x) { return x + bonus; };
    auto two   = [bonus, scale](int x) { return int(x * scale) + bonus; };
    auto byRef = [&table](int i) { return table[i]; };
    auto big   = [table, bonus](int i) { return table[i] + bonus; };

    std::printf("sizeof none  = %zu\\n", sizeof(none));
    std::printf("sizeof byVal = %zu\\n", sizeof(byVal));
    std::printf("sizeof two   = %zu\\n", sizeof(two));
    std::printf("sizeof byRef = %zu\\n", sizeof(byRef));
    std::printf("sizeof big   = %zu\\n", sizeof(big));
    std::printf("sizeof std::function<int(int)> = %zu\\n",
                sizeof(std::function<int(int)>));

    gAllocs = 0;
    std::function<int(int)> f1 = two;
    std::printf("store two: %d heap allocation(s)\\n", gAllocs);
    gAllocs = 0;
    std::function<int(int)> f2 = big;
    std::printf("store big: %d heap allocation(s)\\n", gAllocs);
    std::printf("f1(10) = %d, f2(0) = %d\\n", f1(10), f2(0));
}`,
          output: 'sizeof none  = 1\nsizeof byVal = 4\nsizeof two   = 16\nsizeof byRef = 8\nsizeof big   = 36\nsizeof std::function<int(int)> = 32\nstore two: 0 heap allocation(s)\nstore big: 1 heap allocation(s)\nf1(10) = 20, f2(0) = 5',
          annotations: [
            { lines: '7-14', text: 'Replacing the global `operator new` (allowed by the standard) lets us count heap allocations deterministically.' },
            { lines: 21, text: 'No captures: an empty class, size 1 (every object needs a distinct address).' },
            { lines: 23, text: 'An `int` and a `double`: laid out like a struct, 4 + 4 padding + 8 = 16.' },
            { lines: 24, text: 'Capture by reference stores a pointer: 8 bytes, whatever the size of `table`.' },
            { lines: 25, text: 'A copy of the 32-byte array plus the `int`: 36 bytes.' },
            { lines: 33, text: 'libstdc++\'s `std::function` is 32 bytes: 16 bytes of inline storage plus two function pointers. MSVC\'s and libc++\'s differ.' },
            { lines: '36-37', text: 'A 16-byte callable fits the inline buffer (the *small buffer optimization*), so no allocation.' },
            { lines: '39-40', text: 'A 36-byte callable does not, so `std::function` allocates it on the heap. In a per-frame callback, that is an allocation every time you assign one.' },
          ],
        },
        {
          type: 'p',
          text: 'Calling them is just as different. Passed as a template parameter, the lambda\'s type is known and its body inlines; through `std::function`, the call goes through a stored function pointer:',
        },
        {
          type: 'compare',
          left: {
            title: 'template parameter (g++ -O2)',
            tone: 'good',
            lang: 'text',
            code: `// template <typename F> int callT(F f)
//     { return f(7); }
// useTemplate(int bonus): callT with
//     [bonus](int x) { return x + bonus; }
_Z11useTemplatei:
    lea     eax, 7[rdi]
    ret`,
          },
          right: {
            title: 'std::function (g++ -O2, excerpt)',
            tone: 'neutral',
            lang: 'text',
            code: `// int callIt(const std::function<int(int)>& f)
//     { return f(7); }
    cmp     QWORD PTR 16[rdi], 0
    mov     DWORD PTR 4[rsp], 7
    je      .L9
    lea     rsi, 4[rsp]
    call    [QWORD PTR 24[rdi]]
    ...
.L9:
    call    _ZSt25__throw_bad_function_callv@PLT`,
          },
        },
        {
          type: 'list',
          items: [
            'Left: the whole call, capture and all, collapsed to `bonus + 7` in one `lea`.',
            'Right: check that the `std::function` is not empty (its manager pointer at offset 16 is non-null), else throw `std::bad_function_call`. Then make an **indirect call** through the invoker pointer at offset 24, passing the argument by pointer to a stack slot. The omitted lines are the stack canary from the calling-conventions lesson, triggered because a local\'s address is taken.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Choosing in engine code',
          text: 'Use templates (or `auto` parameters) for callables in hot, generic code such as algorithms and per-element callbacks: zero overhead, full inlining. Use `std::function` (or an engine\'s delegate type) where you must **store** callbacks of different types: event systems, UI handlers, timers. There, keep captures small to stay in the inline buffer, and avoid rebuilding them every frame. Unreal\'s `TFunction` and delegates make the same trade.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'On x86-64 with GCC, what is `sizeof(f)` for `auto f = [hp, &world, speed](float dt) { /* ... */ };` where `hp` is an `int`, `world` a `World`, and `speed` a `float`?',
      options: [
        { text: '`1`', why: 'Only a lambda with no captures is an empty class of size 1. This one has three captured members.' },
        { text: '`12`', why: 'That counts the reference as 4 bytes. A reference capture is stored as a pointer, 8 bytes on x86-64, and it needs 8-byte alignment.' },
        { text: '`24`', correct: true, why: 'A closure behaves like a struct whose members are its captures: `int` (4), 4 bytes of padding, a pointer for `&world` (8), `float` (4), then 4 bytes of tail padding to keep the size a multiple of 8.' },
        { text: '`sizeof(World) + 8`', why: '`world` is captured by reference, so the closure holds only its address, not a copy of the `World`.' },
      ],
      explanation:
        'Treat a lambda as the struct it is. Captures become members (by value: the object; by reference: in practice a pointer), and the usual alignment and padding rules apply. GCC lays them out in capture order here: `int` at 0, pointer at 8, `float` at 16, size rounded to 24. The standard leaves the closure layout unspecified, so this is what compilers do rather than a guarantee, but it explains why reordering captures, or capturing a pointer to a big object instead of a copy, changes the closure\'s size and whether a `std::function` must allocate.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'fill',
      prompt: 'Complete the summary of what a virtual call `p->update()` costs at the machine level.',
      templateIsCode: false,
      template: 'The object\'s first 8 bytes hold the ___, which points into the class\'s read-only vtable. The call loads it, then makes an ___ call through a fixed slot offset, passing the object\'s address in `rdi` as ___. If the compiler can prove the type, for example because the class is marked ___, it emits a direct call and can inline it.',
      blanks: [{ answers: ['vptr'] }, { answers: ['indirect'] }, { answers: ['this'] }, { answers: ['final'] }],
      wordBank: ['vptr', 'indirect', 'this', 'final', 'typeinfo', 'direct', 'static', 'inline'],
      explanation:
        'The vptr (first 8 bytes) leads to the vtable; the slot offset is fixed by the base class, so a virtual call is two dependent loads and an indirect `call`. `this` travels like any first argument. `final` on the class (or on the function) lets the compiler skip the table entirely, and once the call is direct it can be inlined, which is where the real savings are.',
    },
  ],
  takeaways: [
    'Members are laid out in declaration order, each at a multiple of its alignment; the struct size rounds up to its largest alignment. Sorting members by alignment removes most padding.',
    'Padding is wasted cache: shrinking a hot struct from 40 to 24 bytes cuts memory traffic for every loop over it by 40%. `-Wpadded` and `static_assert(sizeof(...))` keep it honest.',
    '`alignas(16)` serves SIMD types and `alignas(64)` isolates per-thread data on its own cache line. Reading through a misaligned pointer is UB in C++; `std::memcpy` is the free, portable alternative.',
    'A member function is an ordinary function with `this` as a hidden first argument (`rdi` on System V, `rcx` on Windows); fields are fixed offsets from it.',
    'GCC\'s vtable holds offset-to-top, typeinfo, two destructor slots and the virtual functions; the constructor stores vtable+16 in the vptr, and a virtual call is `mov rax, [rdi]` then `call [rax + slot*8]`.',
    'Devirtualization (`final`, visible types, speculative guards) turns virtual calls into direct, inlinable ones; multiple inheritance adds extra vptrs and this-adjusting thunks.',
    'Lambdas are structs of their captures and inline when passed as templates; `std::function` (32 bytes in libstdc++) calls through a function pointer and heap-allocates captures that exceed its small buffer.',
  ],
  reading: [
    {
      title: 'Object layout and alignment (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/language/object',
      source: 'cppreference',
      note: 'The sections on alignment and object representation state the rules this lesson applies.',
    },
    {
      title: 'std::hardware_destructive_interference_size (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
      source: 'cppreference',
      note: 'The standard name for the cache-line size used with alignas to prevent false sharing.',
    },
    {
      title: 'Game Programming Patterns: Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Why packing hot data tightly matters for game loops, including hot/cold splitting.',
    },
    {
      title: 'Virtual method table (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Virtual_method_table',
      source: 'article',
      note: 'Vtable layouts across compilers, including multiple inheritance and thunks.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Add and remove `final`, or move the derived class to another file, and watch the virtual call change.',
    },
  ],
};
