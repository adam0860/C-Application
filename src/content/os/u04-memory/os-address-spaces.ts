import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-address-spaces',
  title: 'Address Spaces',
  summary:
    'The OS\'s great memory illusion: every process gets a private address space with the same layout of code, data, heap, mappings and stack. See it from C++, with fork and /proc/self/maps, and meet the first two ways to implement it: base and bounds, and segmentation.',
  minutes: 18,
  objectives: [
    'Explain what an address space is and the three goals of memory virtualisation: transparency, efficiency and protection',
    'Name the regions of a typical x86-64 process address space and say where each kind of C++ object lives',
    'Explain why two processes can use the same virtual address for different data, and demonstrate it with `fork`',
    'Read a `/proc/self/maps` listing and explain what ASLR changes from run to run',
    'Translate addresses with base and bounds, and explain what segmentation adds and why both were abandoned for paging',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The illusion of private memory',
      blocks: [
        {
          type: 'p',
          text: 'The first computers ran one program at a time, and it could use physical memory directly: address 0x1000 meant the 4097th byte of RAM. Once several programs had to share the machine (and the Scheduling unit showed why they must), direct physical addresses became a disaster. Each program would have to be compiled for a different region, and any of them could scribble over the others or over the OS.',
        },
        {
          type: 'p',
          text: 'The OS\'s answer is the **[[address-space]]**: each [[process]] gets its own private view of memory, starting at address 0 and stretching far beyond the RAM installed. Every pointer you have ever printed in C++ is a [[virtual-address|virtual address]] in such a space. The CPU\'s [[mmu|MMU]] translates each one, on every load, store and instruction fetch, into a physical address using tables that only the kernel can change.',
        },
        {
          type: 'list',
          items: [
            '**Transparency:** programs are written as if they owned all of memory; they never see physical addresses.',
            '**Efficiency:** translation must cost almost nothing in time (hardware does it, with the TLB caching results) and little in space (the tables).',
            '**Protection:** a process cannot read or write anything outside its own address space: not other processes, not the kernel.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why bother with the indirection?',
          text: 'Because one level of indirection buys everything else in this unit. The OS can place a process anywhere in RAM, move it, give it memory lazily, share read-only pages between processes, back memory with files or disk, and kill a process that touches an address it does not own instead of letting it corrupt something. In the Computer Architecture course you saw *how* the hardware translates; this unit is about what the OS builds on top of it.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Address space ≠ memory used',
          text: 'A 64-bit Linux process has 128 TiB of user address space and might use 200 MiB of it. Almost all of the space is simply unmapped. "Address space" is about which addresses are *valid*, not how much RAM is consumed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'Your game prints `&player` and gets `0x7ffd3a2c1e40`. Which statement is true?',
      options: [
        {
          text: 'It is a virtual address; the MMU translates it to some physical address the program never sees',
          correct: true,
          why: 'Every address user code handles is virtual. The physical location can even change while the program runs, for example if the page is swapped out and back in.',
        },
        {
          text: 'It is the physical location of `player` in RAM, which is why it changes between runs',
          why: 'It changes between runs because of ASLR, which randomises virtual layouts. User code never sees physical addresses.',
        },
        {
          text: 'The machine must have more than 128 TiB of RAM for this address to exist',
          why: 'Virtual addresses are independent of installed RAM. This one is simply in the stack region near the top of the user half.',
        },
        {
          text: 'Another process printing the same value would be looking at the same `player` object',
          why: 'Each process has its own address space, so the same virtual address in two processes normally maps to different physical memory.',
        },
      ],
      explanation:
        'Virtual addresses are names in a private namespace. The address space, not the RAM, decides which names are valid, and the OS decides where each valid page physically lives.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'What lives where',
      blocks: [
        {
          type: 'p',
          text: 'Every process on a given OS gets the same general layout. Here is x86-64 Linux, with real addresses from one run of a small C++ program:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 348" xmlns="http://www.w3.org/2000/svg"><rect x="140" y="12" width="214" height="34" rx="2" class="f-gray" fill-opacity="0.2"/><rect x="140" y="12" width="214" height="34" rx="2" fill="none" class="s-gray" stroke-width="1.5"/><text x="247" y="27" font-size="12.5" text-anchor="middle" class="t-gray" font-weight="700">kernel</text><text x="247" y="41" font-size="9.5" text-anchor="middle">in every process, kernel mode only</text><text x="364" y="26" font-size="10.5" text-anchor="start" class="t-gray">0xffff8000 00000000+</text><rect x="140" y="70" width="214" height="34" rx="2" class="f-blue" fill-opacity="0.2"/><rect x="140" y="70" width="214" height="34" rx="2" fill="none" class="s-blue" stroke-width="1.5"/><text x="247" y="85" font-size="12.5" text-anchor="middle" class="t-blue" font-weight="700">stack</text><text x="247" y="99" font-size="9.5" text-anchor="middle">main thread; grows down</text><text x="364" y="84" font-size="10.5" text-anchor="start" class="t-gray">0x7ffc 7a6179ac</text><rect x="140" y="132" width="214" height="46" rx="2" class="f-purple" fill-opacity="0.2"/><rect x="140" y="132" width="214" height="46" rx="2" fill="none" class="s-purple" stroke-width="1.5"/><text x="247" y="153" font-size="12.5" text-anchor="middle" class="t-purple" font-weight="700">memory mappings</text><text x="247" y="167" font-size="9.5" text-anchor="middle">libraries, big mallocs, thread stacks, files</text><text x="364" y="146" font-size="10.5" text-anchor="start" class="t-gray">0x7fb9 cd600000</text><rect x="140" y="214" width="214" height="34" rx="2" class="f-orange" fill-opacity="0.2"/><rect x="140" y="214" width="214" height="34" rx="2" fill="none" class="s-orange" stroke-width="1.5"/><text x="247" y="229" font-size="12.5" text-anchor="middle" class="t-orange" font-weight="700">heap</text><text x="247" y="243" font-size="9.5" text-anchor="middle">malloc / new; grows up</text><text x="364" y="228" font-size="10.5" text-anchor="start" class="t-gray">0x5629 12367000</text><rect x="140" y="252" width="214" height="20" rx="2" class="f-teal" fill-opacity="0.2"/><rect x="140" y="252" width="214" height="20" rx="2" fill="none" class="s-teal" stroke-width="1.5"/><text x="148" y="266" font-size="11.5" text-anchor="start" class="t-teal" font-weight="700">.bss</text><text x="348" y="266" font-size="9.5" text-anchor="end">zero-initialised globals</text><rect x="140" y="272" width="214" height="20" rx="2" class="f-teal" fill-opacity="0.2"/><rect x="140" y="272" width="214" height="20" rx="2" fill="none" class="s-teal" stroke-width="1.5"/><text x="148" y="286" font-size="11.5" text-anchor="start" class="t-teal" font-weight="700">.data</text><text x="348" y="286" font-size="9.5" text-anchor="end">initialised globals</text><text x="364" y="286" font-size="10.5" text-anchor="start" class="t-gray">0x5628 f8c7b010</text><rect x="140" y="292" width="214" height="26" rx="2" class="f-green" fill-opacity="0.2"/><rect x="140" y="292" width="214" height="26" rx="2" fill="none" class="s-green" stroke-width="1.5"/><text x="148" y="309" font-size="11.5" text-anchor="start" class="t-green" font-weight="700">.text</text><text x="348" y="309" font-size="9.5" text-anchor="end">machine code (read + execute)</text><text x="364" y="306" font-size="10.5" text-anchor="start" class="t-gray">0x5628 f8c77309</text><rect x="140" y="46" width="214" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><text x="247" y="62" font-size="10" text-anchor="middle" class="t-gray" font-style="italic">non-canonical hole (faults)</text><rect x="140" y="104" width="214" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><rect x="140" y="178" width="214" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><text x="247" y="200" font-size="10" text-anchor="middle" class="t-gray" font-style="italic">unmapped</text><rect x="140" y="318" width="214" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/><text x="247" y="331" font-size="10" text-anchor="middle" class="t-red" font-style="italic">page 0 unmapped: catches nullptr</text><line x1="126" y1="82" x2="126" y2="114" class="s-blue" stroke-width="1.6"/><path d="M126.0,120.0 L129.2,113.0 L122.8,113.0 Z" class="f-blue"/><line x1="126" y1="244" x2="126" y2="202" class="s-orange" stroke-width="1.6"/><path d="M126.0,196.0 L122.8,203.0 L129.2,203.0 Z" class="f-orange"/><text x="106" y="22" font-size="11" text-anchor="end" class="t-gray">high</text><text x="106" y="36" font-size="11" text-anchor="end" class="t-gray">addresses</text><text x="106" y="318" font-size="11" text-anchor="end" class="t-gray">low</text><text x="106" y="332" font-size="11" text-anchor="end" class="t-gray">addresses</text><line x1="80" y1="44" x2="80" y2="304" class="s-gray" stroke-width="1"/><path d="M80.0,40.0 L76.8,47.0 L83.2,47.0 Z" class="f-gray"/><text x="364" y="340" font-size="9.5" text-anchor="start" class="t-gray" font-style="italic">example addresses from a real run</text></svg>`,
          alt: 'A vertical address-space diagram. From high to low addresses: kernel space, a non-canonical hole, the stack growing down, an unmapped gap, memory mappings for libraries and large allocations, another gap, the heap growing up, then .bss, .data and .text, with page 0 unmapped at the bottom.',
          caption: 'The x86-64 Linux layout. Gaps are unmapped: touching them is a segmentation fault. Stack and heap grow toward each other through the space between.',
        },
        {
          type: 'table',
          headers: ['Region', 'Holds', 'C++ examples'],
          rows: [
            ['`.text`', 'Machine code, read and execute only', 'Every function, including lambdas and template instantiations'],
            ['`.rodata`, `.data`, `.bss`', 'Constants; initialised globals; zero-initialised globals', 'String literals, `int g_score = 0;`, `static` locals'],
            ['Heap', 'Small dynamic allocations, grown with `brk`', '`new Enemy`, a small `std::string` that outgrew its SSO buffer'],
            ['Memory mappings', 'Shared libraries, large allocations, mapped files, extra thread stacks', '`libstdc++.so`, a 4 MiB `std::vector` buffer, each `std::thread`\'s stack'],
            ['Stack', 'The main thread\'s frames, growing down', 'Local variables and parameters of `main` and everything it calls'],
            ['Kernel', 'The kernel itself, mapped in every process', 'Nothing of yours: any user-mode access faults'],
          ],
        },
        {
          type: 'p',
          text: 'You can check the order from C++. Comparing addresses of unrelated objects is not something portable C++ promises anything about, so we convert to `std::uintptr_t` and ask the OS-specific question explicitly:',
        },
        {
          type: 'code',
          title: 'layout.cpp',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <memory>

int g_initialized = 42;   // .data: initialised globals
int g_zeroed;             // .bss: zero-initialised globals

std::uintptr_t addr(const void* p) {
    return reinterpret_cast<std::uintptr_t>(p);
}

void below(const char* lo, const void* a, const char* hi,
           const void* b) {
    std::cout << lo << " is below " << hi << ": "
              << (addr(a) < addr(b) ? "yes" : "no") << '\\n';
}

int main() {
    int local = 0;                                 // stack
    auto small = std::make_unique<int>(7);         // heap
    auto big = std::make_unique<char[]>(1 << 20);  // own mapping
    // POSIX guarantees a function pointer converts to void*.
    const void* code = reinterpret_cast<void*>(&addr);

    below("code", code, "data", &g_initialized);
    below("data", &g_initialized, "bss", &g_zeroed);
    below("bss", &g_zeroed, "heap", small.get());
    below("heap", small.get(), "1 MiB block", big.get());
    below("1 MiB block", big.get(), "stack", &local);
}`,
          output: "code is below data: yes\ndata is below bss: yes\nbss is below heap: yes\nheap is below 1 MiB block: yes\n1 MiB block is below stack: yes",
          annotations: [
            { lines: '5-6', text: 'Both globals are in the executable image. The linker places `.data` (with initial values stored in the file) before `.bss` (only a size in the file; the loader zero-fills it).' },
            { lines: '8-10', text: 'Converting to `std::uintptr_t` turns "compare two pointers" into "compare two numbers", which is well defined. Comparing unrelated pointers with `<` directly gives an unspecified result.' },
            { lines: '20-21', text: 'With glibc, small requests come from the heap. A request of 1 MiB is normally served by its own `mmap` (glibc\'s threshold starts at 128 KiB), which lands in the mappings region. Either way it is below the stack.' },
            { lines: '22-23', text: 'A function\'s address is in `.text`. Turning a function pointer into `void*` is only "conditionally supported" in ISO C++, but POSIX requires it (that is how `dlsym` works).' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Windows looks different in detail, same in spirit',
          text: 'A 64-bit Windows process also has 128 TiB of user space, but no `brk` heap and no fixed stack-at-the-top: the executable, DLLs, heaps (built on `VirtualAlloc`) and each thread\'s stack are all just regions placed in the space, at randomised addresses. Sysinternals **VMMap** shows the map of any running process, a great way to see where a game\'s memory goes.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'A game on x86-64 Linux allocates `std::vector<float> heights(4\'000\'000);` inside `loadTerrain()`. Where are the vector object and its 16 MB of floats?',
      options: [
        {
          text: 'The vector object (three pointers) is on the stack; the floats are in their own anonymous mapping in the mappings region',
          correct: true,
          why: 'The local `std::vector` is a small object in `loadTerrain`\'s frame. Its buffer comes from `operator new`, and glibc serves a 16 MB request with a dedicated `mmap` rather than from the `brk` heap.',
        },
        {
          text: 'Both are on the stack, because `heights` is a local variable',
          why: 'Only the vector\'s bookkeeping is local. A 16 MB array on a default 8 MiB stack would overflow it immediately.',
        },
        {
          text: 'Both are in `.bss`, because the floats are zero-initialised',
          why: '`.bss` holds zero-initialised *globals and statics*. Dynamic allocations are zeroed by `std::vector` (or by fresh pages from the kernel), not placed in `.bss`.',
        },
        {
          text: 'The floats are in `.data`, because they are initialised',
          why: '`.data` contents come from the executable file at load time; it cannot grow at run time.',
        },
      ],
      explanation:
        'Separate the object from what it owns. Containers, strings and smart pointers are small handles that live wherever the variable is declared, while their contents live wherever the allocator put them, and for big blocks that is a fresh mapping straight from the kernel.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Same address, different memory',
      blocks: [
        {
          type: 'p',
          text: 'Because each process has its own translation tables, the same virtual address in two processes usually means two different physical locations. `fork` makes this visible: the child starts with an exact copy of the parent\'s address space, so every variable is at the same virtual address in both. Then they diverge:',
        },
        {
          type: 'code',
          title: 'fork_addresses.cpp',
          runnable: true,
          code: `#include <sys/wait.h>
#include <unistd.h>
#include <cstdint>
#include <cstdio>
#include <iostream>

int g_score = 100;

std::uintptr_t addr(const int* p) {
    return reinterpret_cast<std::uintptr_t>(p);
}

int main() {
    const std::uintptr_t where = addr(&g_score);
    std::cout << std::flush;          // don't duplicate the buffer
    const pid_t pid = fork();
    if (pid == -1) {
        std::perror("fork");
        return 1;
    }
    if (pid == 0) {                   // child
        g_score = 9999;
        std::cout << "child:  score = " << g_score
                  << ", same address: "
                  << (addr(&g_score) == where ? "yes" : "no")
                  << std::endl;           // flush before _exit
        _exit(0);
    }
    waitpid(pid, nullptr, 0);         // child prints first
    std::cout << "parent: score = " << g_score
              << ", same address: "
              << (addr(&g_score) == where ? "yes" : "no") << '\\n';
}`,
          output: "child:  score = 9999, same address: yes\nparent: score = 100, same address: yes",
          annotations: [
            { lines: '15', text: 'Flush before forking. Otherwise anything sitting in `std::cout`\'s buffer is copied into the child too and printed twice.' },
            { lines: '16', text: '`fork` duplicates the address space ([[fork-syscall]]). The copy is lazy: pages are shared read-only and copied only when one side writes, which is [[copy-on-write]].' },
            { lines: '22', text: 'This write triggers a copy-on-write fault in the child. The kernel copies the page, and from now on the child\'s `g_score` lives in a different physical frame.' },
            { lines: '26-27', text: '`_exit` skips `std::cout`\'s destructor-time flushing, so flush explicitly with `std::endl`. Using `_exit` in a forked child avoids running the parent\'s atexit handlers twice.' },
            { lines: '29', text: 'The parent waits, so the output order is deterministic and the child does not become a zombie.' },
          ],
        },
        {
          type: 'p',
          text: 'Both processes see `g_score` at the identical address, yet they hold 9999 and 100. The address is just a name; the page tables decide what it names.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Pointers do not travel between processes',
          text: 'Writing a pointer into a pipe, a socket, a save file or shared memory and reading it in another process (or the same program next week) gives you a number that means nothing there, made worse by ASLR. Serialise *data*, or offsets relative to a shared base, never raw addresses. Shared memory regions can even be mapped at different addresses in each process.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'This tool forks a child to compute a level\'s best score, then saves it from the parent. The saved score is always 0. Tap the line whose assumption is wrong.',
      code: `int g_best = 0;

int main() {
    const pid_t pid = fork();
    if (pid == 0) {
        g_best = computeBestScore();
        _exit(0);
    }
    waitpid(pid, nullptr, 0);
    saveHighScore(g_best);
}`,
      bugLines: [6],
      explanation:
        'Line 6 writes to the **child\'s** copy of `g_best`. After `fork` the two processes have separate address spaces: the write causes a copy-on-write fault and changes only the child\'s page, so the parent still sees 0 when it saves at line 10. To return a result, use real inter-process communication (the child\'s exit status for a small number, a pipe, or a shared `mmap`), or just use a thread, which shares the address space.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'ASLR and the real map',
      blocks: [
        {
          type: 'p',
          text: 'Linux lets you read any process\'s current map from `/proc/<pid>/maps`; a process can read its own as `/proc/self/maps`. Here is a trimmed listing from the same program as above (offset, device and inode columns removed, some library lines dropped):',
        },
        {
          type: 'code',
          lang: 'text',
          title: '/proc/self/maps (real run, trimmed)',
          code: `56089cf85000-56089cf87000 r--p /home/adam/game
56089cf87000-56089cf89000 r-xp /home/adam/game
56089cf89000-56089cf8a000 r--p /home/adam/game
56089cf8a000-56089cf8b000 r--p /home/adam/game
56089cf8b000-56089cf8c000 rw-p /home/adam/game
5608d31e5000-5608d3206000 rw-p [heap]
7f21eb800000-7f21eb828000 r--p .../libc.so.6
7f21eb828000-7f21eb9b1000 r-xp .../libc.so.6
7f21eb9b1000-7f21eba00000 r--p .../libc.so.6
7f21eba04000-7f21eba06000 rw-p .../libc.so.6
7f21eba16000-7f21ebb17000 rw-p
7f21ebc9d000-7f21ebde5000 r-xp .../libstdc++.so.6.0.33
7f21ebf5e000-7f21ebf62000 r--p [vvar]
7f21ebf64000-7f21ebf66000 r-xp [vdso]
7f21ebf67000-7f21ebf92000 r-xp .../ld-linux-x86-64.so.2
7ffffbcb9000-7ffffbce2000 rw-p [stack]
ffffffffff600000-ffffffffff601000 --xp [vsyscall]`,
        },
        {
          type: 'list',
          items: [
            'The executable appears five times: separate mappings for headers, code (`r-xp`), read-only data and writable data. Permissions are per mapping, enforced by the page tables, so code is never writable and data is never executable.',
            '`[heap]` sits a random distance above the executable. The anonymous `rw-p` mapping of `0x101000` bytes (1 MiB plus a header page) is the big `make_unique<char[]>` block.',
            '`[vdso]` and `[vvar]` are kernel-provided pages that make calls like `clock_gettime` fast without a real [[system-call]].',
            '`[stack]` is near the top of the 47-bit user half. `[vsyscall]` is a legacy fixed page in the kernel half.',
          ],
        },
        {
          type: 'p',
          text: 'Run it again and every high-order address changes. That is **[[aslr]]**: the kernel randomises where the executable (when built as position-independent, the default today), the heap, the libraries and the stack go. An attacker who finds a memory-corruption bug can no longer hard-code the address of useful code or data. Windows randomises executables and DLLs once per boot (shared DLLs keep the same base in every process until reboot) and stacks and heaps per process.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why crash dumps need symbol files',
          text: 'ASLR is why a crash address like `0x5628f8c77a1c` means nothing on its own. Debuggers and crash reporters record each module\'s load address and subtract it to get an offset into the binary, then look that up in the debug symbols (PDB or DWARF) of the *exact* build that crashed.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'With 4-level paging, x86-64 Linux gives user space the lower half of a 48-bit virtual address space, that is 2⁴⁷ bytes. How many TiB is that? (1 TiB = 2⁴⁰ bytes.)',
      answer: 128,
      unit: 'TiB',
      explanation:
        '2⁴⁷ / 2⁴⁰ = 2⁷ = **128 TiB**, user addresses `0x0000000000000000` to `0x00007fffffffffff`. The kernel gets the upper half, and everything between is non-canonical and faults. CPUs with 5-level paging extend this to 57 bits (64 PiB of user space), but Linux only hands out addresses above 128 TiB to programs that ask for them, because some software stores flags in the "unused" top bits of pointers.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Building it: base and bounds',
      blocks: [
        {
          type: 'p',
          text: 'How could an OS implement address spaces? The simplest hardware scheme, from the 1960s, is **[[base-and-bounds]]** (also called dynamic relocation). The CPU has two registers per running process. On every memory access:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Check', text: 'If the virtual address ≥ **bounds**, raise an exception: the process touched memory outside its space.' },
            { title: 'Relocate', text: 'Physical address = virtual address + **base**.' },
          ],
        },
        {
          type: 'p',
          text: 'The OS places each process\'s whole address space in one contiguous chunk of physical memory, saves and restores base and bounds on every [[context-switch]], and only lets kernel mode change them. A process can now be loaded anywhere, and it cannot escape its chunk. That achieves all three goals in one add and one compare.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The waste in the middle',
          text: 'The space between heap and stack is unused but still has to be physically allocated, because base and bounds can only map one contiguous block. A process with a 16 KiB address space using 5 KiB still consumes 16 KiB of RAM. With modern address spaces of terabytes, the idea is hopeless.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A process runs with base = `0x8000` and bounds = `0x4000`. It loads from virtual address `0x1A00`. What physical address is accessed? Answer in hex.',
      answer: '0x9A00',
      alsoAccept: [39424],
      label: 'physical address =',
      explanation:
        '`0x1A00` is below the bounds `0x4000`, so the access is legal, and physical = `0x1A00 + 0x8000` = **`0x9A00`**. A load from `0x4200` would fail the bounds check and raise an exception before any memory was touched; the kernel would then typically kill the process with a segmentation fault.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Segmentation, and why it lost',
      blocks: [
        {
          type: 'p',
          text: '**[[segmentation|Segmentation]]** generalises base and bounds: one pair per logical **segment** (code, heap, stack), chosen by the top bits of the virtual address or by a segment register. Each segment is placed independently, so the unused middle costs nothing, and the stack segment can be marked as growing downward:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg"><text x="100" y="18" font-size="12" text-anchor="middle" font-weight="700">virtual (16 KiB)</text><rect x="40" y="30" width="120" height="256" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="40" y="254" width="120" height="32" rx="1" class="f-green" fill-opacity="0.22"/><rect x="40" y="254" width="120" height="32" rx="1" fill="none" class="s-green" stroke-width="1.5"/><text x="100" y="274" font-size="12" text-anchor="middle" class="t-green" font-weight="700">code</text><rect x="40" y="174" width="120" height="48" rx="1" class="f-orange" fill-opacity="0.22"/><rect x="40" y="174" width="120" height="48" rx="1" fill="none" class="s-orange" stroke-width="1.5"/><text x="100" y="202" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">heap</text><rect x="40" y="30" width="120" height="32" rx="1" class="f-blue" fill-opacity="0.22"/><rect x="40" y="30" width="120" height="32" rx="1" fill="none" class="s-blue" stroke-width="1.5"/><text x="100" y="50" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">stack</text><text x="100" y="122" font-size="10.5" text-anchor="middle" class="t-gray" font-style="italic">unused: no memory</text><text x="34" y="290" font-size="10" text-anchor="end" class="t-gray">0K</text><text x="34" y="258" font-size="10" text-anchor="end" class="t-gray">2K</text><text x="34" y="226" font-size="10" text-anchor="end" class="t-gray">4K</text><text x="34" y="178" font-size="10" text-anchor="end" class="t-gray">7K</text><text x="34" y="66" font-size="10" text-anchor="end" class="t-gray">14K</text><text x="34" y="34" font-size="10" text-anchor="end" class="t-gray">16K</text><text x="420" y="18" font-size="12" text-anchor="middle" font-weight="700">physical</text><rect x="360" y="30" width="120" height="256" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="360" y="126" width="120" height="32" rx="1" class="f-green" fill-opacity="0.22"/><rect x="360" y="126" width="120" height="32" rx="1" fill="none" class="s-green" stroke-width="1.5"/><text x="420" y="146" font-size="12" text-anchor="middle" class="t-green" font-weight="700">code</text><path d="M162,270 L350.992,145.304" fill="none" class="s-green" stroke-width="1.3" stroke-dasharray="4 3"/><path d="M356.0,142.0 L348.4,143.2 L351.9,148.5 Z" class="f-green"/><rect x="360" y="78" width="120" height="48" rx="1" class="f-orange" fill-opacity="0.22"/><rect x="360" y="78" width="120" height="48" rx="1" fill="none" class="s-orange" stroke-width="1.5"/><text x="420" y="106" font-size="12" text-anchor="middle" class="t-orange" font-weight="700">heap</text><path d="M162,198 L350.622,104.661" fill="none" class="s-orange" stroke-width="1.3" stroke-dasharray="4 3"/><path d="M356.0,102.0 L348.3,102.3 L351.1,107.9 Z" class="f-orange"/><rect x="360" y="190" width="120" height="32" rx="1" class="f-blue" fill-opacity="0.22"/><rect x="360" y="190" width="120" height="32" rx="1" fill="none" class="s-blue" stroke-width="1.5"/><text x="420" y="210" font-size="12" text-anchor="middle" class="t-blue" font-weight="700">stack</text><path d="M162,46 L351.371,202.182" fill="none" class="s-blue" stroke-width="1.3" stroke-dasharray="4 3"/><path d="M356.0,206.0 L352.6,199.1 L348.6,204.0 Z" class="f-blue"/><text x="486" y="290" font-size="10" text-anchor="start" class="t-gray">24K</text><text x="486" y="226" font-size="10" text-anchor="start" class="t-gray">28K</text><text x="486" y="194" font-size="10" text-anchor="start" class="t-gray">30K</text><text x="486" y="162" font-size="10" text-anchor="start" class="t-gray">32K</text><text x="486" y="130" font-size="10" text-anchor="start" class="t-gray">34K</text><text x="486" y="82" font-size="10" text-anchor="start" class="t-gray">37K</text><text x="486" y="34" font-size="10" text-anchor="start" class="t-gray">40K</text><text x="420" y="266" font-size="10.5" text-anchor="middle" class="t-gray" font-style="italic">other processes</text><text x="420" y="56.4" font-size="10.5" text-anchor="middle" class="t-gray" font-style="italic">free hole</text><text x="150" y="306" font-size="11.5" text-anchor="start" font-weight="700">segment</text><text x="220" y="306" font-size="11.5" text-anchor="start" font-weight="700">base</text><text x="270" y="306" font-size="11.5" text-anchor="start" font-weight="700">size</text><text x="318" y="306" font-size="11.5" text-anchor="start" font-weight="700">grows</text><text x="150" y="322" font-size="11.5" text-anchor="start" class="t-green" font-weight="700">code</text><text x="220" y="322" font-size="11.5" text-anchor="start">32K</text><text x="270" y="322" font-size="11.5" text-anchor="start">2K</text><text x="318" y="322" font-size="11.5" text-anchor="start">up</text><text x="150" y="338" font-size="11.5" text-anchor="start" class="t-orange" font-weight="700">heap</text><text x="220" y="338" font-size="11.5" text-anchor="start">34K</text><text x="270" y="338" font-size="11.5" text-anchor="start">3K</text><text x="318" y="338" font-size="11.5" text-anchor="start">up</text><text x="150" y="354" font-size="11.5" text-anchor="start" class="t-blue" font-weight="700">stack</text><text x="220" y="354" font-size="11.5" text-anchor="start">28K</text><text x="270" y="354" font-size="11.5" text-anchor="start">2K</text><text x="318" y="354" font-size="11.5" text-anchor="start">down</text></svg>`,
          alt: 'A 16 KiB virtual address space with code at 0 to 2K, heap at 4K to 7K and stack at 14K to 16K, mapped by dashed arrows to separate places in physical memory: stack at 28K, code at 32K, heap at 34K. A table lists base, size and growth direction per segment.',
          caption: 'Three segments, three base-and-bounds pairs. The 7 KiB of unused virtual space between heap and stack needs no physical memory.',
        },
        {
          type: 'p',
          text: 'Segments can also carry protection bits (code read-only and executable) and be **shared**: two processes running the same program can map one code segment. But segmentation has two deep problems. Segments have **different sizes**, so physical memory fills with oddly sized holes, and a new segment may not fit anywhere even when plenty of memory is free in total: **external [[memory-fragmentation|fragmentation]]**. And a sparsely used heap still needs one big contiguous segment.',
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Fossils in your toolchain',
          text: 'x86 had segment registers from the 8086 onward, and 32-bit protected mode supported full segmentation. In 64-bit mode it is essentially switched off: CS, DS, ES and SS have base 0 and no limit. Two survivors remain: the **FS** and **GS** bases, which Linux and Windows use to point at the current thread\'s data, so every `thread_local` variable in your C++ is reached through FS or GS. And the name of the most famous crash, the **[[segmentation-fault]]**, though today it is raised by paging.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'True or false: on x86-64 Linux, segmentation is what prevents your program\'s heap from overwriting its code.',
      answer: false,
      explanation:
        'False. In 64-bit mode the code and data segments are flat (base 0, no limit), so segmentation protects nothing. Code is protected by **paging**: the pages of `.text` are mapped read-only and executable, data pages are writable and non-executable, and a write to a read-only page raises a page fault that becomes `SIGSEGV`.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Toward paging',
      blocks: [
        {
          type: 'table',
          headers: ['Scheme', 'Unit of translation', 'Strength', 'Weakness'],
          rows: [
            ['Base and bounds', 'Whole address space', 'One add and one compare', 'Wastes the unused middle; needs one contiguous block'],
            ['Segmentation', 'A few variable-size segments', 'Sparse spaces, sharing, per-segment protection', 'External fragmentation; segments must still be contiguous'],
            ['Paging (next lesson)', 'Many fixed-size pages', 'No external fragmentation, any page anywhere', 'Large tables, so translation must be cached (TLB)'],
          ],
        },
        {
          type: 'p',
          text: 'The pattern to notice: both problems come from **variable-sized** chunks of memory. Chop the address space into small **fixed-size** pages instead, and any free physical frame can hold any page, so external fragmentation disappears. The price is a lot more translation state. The next lesson is about paying it.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Parking a convoy',
          text: 'Base and bounds is parking a whole convoy nose to tail: you need one gap long enough for all of it. Segmentation lets the trucks, cars and trailers park in separate gaps, but each group still needs a gap of its size. Paging is splitting everything into identical cars that can use any free bay in the lot.',
        },
      ],
    },
  ],
  takeaways: [
    'An **address space** is a process\'s private view of memory: every C++ pointer is a virtual address, translated by the MMU using tables only the kernel controls.',
    'The goals are **transparency**, **efficiency** and **protection**: programs act as if they own memory, at almost no cost, without touching each other or the kernel.',
    'x86-64 Linux layout: code, data and bss low; the heap above them; libraries and big allocations in the mappings region; the stack near 128 TiB; the kernel in the upper half.',
    'The same virtual address in two processes names different memory (`fork` plus copy-on-write shows it), so pointers never travel between processes.',
    '**ASLR** randomises the layout each run; `/proc/self/maps` (Linux) and VMMap (Windows) show the real map.',
    '**Base and bounds** and **segmentation** translate whole regions and suffer from waste and external fragmentation, which is why every modern system uses **paging**.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 13: The Abstraction: Address Spaces',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf',
      source: 'book',
      note: 'Short and motivating: why the OS virtualises memory and its three goals.',
    },
    {
      title: 'OSTEP chapter 15: Mechanism: Address Translation',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf',
      source: 'book',
      note: 'Base and bounds in detail, including what the OS must do at boot, process creation and context switch.',
    },
    {
      title: 'OSTEP chapter 16: Segmentation',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-segmentation.pdf',
      source: 'book',
      note: 'Segment selection, the backwards-growing stack, sharing and external fragmentation.',
    },
    {
      title: 'proc(5) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man5/proc.5.html',
      source: 'other',
      note: 'Search for /proc/pid/maps: what every column means, including the special [heap], [stack] and [vdso] entries.',
    },
  ],
};
