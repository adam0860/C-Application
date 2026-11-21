import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-paging',
  title: 'Paging and Page Tables',
  summary:
    'Fixed-size pages and frames, splitting addresses into page number and offset, what the OS keeps in each page-table entry, why linear tables are too big and multi-level tables fix it, and the TLB from the operating system\'s side: context switches, ASIDs and shootdowns.',
  minutes: 22,
  objectives: [
    'Split a virtual address into virtual page number and offset, in hex, for a given page size',
    'Translate addresses through a page table by hand and in C++, including not-present and protection faults',
    'Explain how the OS uses the present, writable, user, accessed, dirty and no-execute bits',
    'Compute the size of linear page tables and explain how multi-level tables avoid it',
    'Explain what the OS must do about the TLB on context switches and when it changes mappings (ASIDs/PCIDs, shootdowns)',
    'Compute an effective memory access time from a TLB hit rate',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Pages and frames',
      blocks: [
        {
          type: 'p',
          text: 'The last lesson ended with a lesson from base and bounds and segmentation: variable-sized chunks fragment memory. **Paging** cuts the virtual address space into fixed-size **pages** and physical memory into **[[page-frame|frames]]** of the same size (4 KiB on x86-64 and most ARM systems; Apple silicon uses 16 KiB). Any page can live in any frame, so a free frame is always usable, and there is no external fragmentation at all.',
        },
        {
          type: 'p',
          text: 'Because pages are a power of two in size and page-aligned, an address splits cleanly into two fields. The low bits are the **offset** within the page, which is never translated. The high bits are the **virtual page number (VPN)**, which the [[page-table]] maps to a **physical frame number (PFN)**:',
        },
        {
          type: 'table',
          headers: ['Page size', 'Offset bits', 'Offset mask', 'VPN of address `va`'],
          rows: [
            ['4 KiB (2¹²)', '12', '`0xFFF`', '`va >> 12`'],
            ['16 KiB (2¹⁴)', '14', '`0x3FFF`', '`va >> 14`'],
            ['2 MiB huge page (2²¹)', '21', '`0x1FFFFF`', '`va >> 21`'],
          ],
        },
        {
          type: 'p',
          text: 'In hex with 4 KiB pages, the offset is simply the **last three hex digits** and the VPN is everything before them: `0x7FFD3A2C1E40` is VPN `0x7FFD3A2C1`, offset `0xE40`. Translation replaces the VPN with a PFN and keeps the offset.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a fixed size changes everything',
          text: 'With equal-sized units, physical memory management becomes a list of free frames, and allocation is "take any one". The OS can also do everything page by page: give a page memory only when it is first touched, write one page to disk, share one page between processes, protect one page. Every memory feature in the rest of this unit works at page granularity.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'With 4 KiB pages, what is the **virtual page number** of address `0x0003A7F4`? Answer in hex.',
      answer: '0x3A',
      alsoAccept: [58],
      label: 'VPN =',
      explanation:
        'Shift right by 12 bits, which in hex means dropping the last three digits: `0x0003A7F4 >> 12` = **`0x3A`** (58), and the offset is `0x7F4`. Each hex digit is 4 bits, which is why 4 KiB pages (12 bits) line up so neatly with hex notation.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Translating an address',
      blocks: [
        {
          type: 'p',
          text: 'The simplest page table is an array of **page-table entries** (PTEs), indexed by VPN. Each entry holds a present bit, permission bits and the frame number. Translation is: index, check, glue:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 250" xmlns="http://www.w3.org/2000/svg"><text x="20" y="22" font-size="12" text-anchor="start" font-weight="700">virtual address</text><rect x="20" y="30" width="110" height="30" rx="3" class="f-blue" fill-opacity="0.2"/><rect x="20" y="30" width="110" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="75" y="50" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">VPN</text><rect x="130" y="30" width="80" height="30" rx="3" class="f-orange" fill-opacity="0.2"/><rect x="130" y="30" width="80" height="30" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="170" y="50" font-size="12.5" text-anchor="middle" class="t-orange" font-weight="700">offset</text><text x="325" y="14" font-size="10" text-anchor="start"></text><text x="325" y="24" font-size="11.5" text-anchor="middle" font-weight="700">page table (one PTE per page)</text><rect x="250" y="32" width="150" height="22" rx="0" class="f-gray" fill-opacity="0.08"/><rect x="250" y="32" width="150" height="22" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="244" y="47" font-size="11" text-anchor="end" class="t-gray">0</text><text x="325" y="47" font-size="11" text-anchor="middle">1 | r-x | 0x12</text><rect x="250" y="54" width="150" height="22" rx="0" class="f-gray" fill-opacity="0.08"/><rect x="250" y="54" width="150" height="22" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="244" y="69" font-size="11" text-anchor="end" class="t-gray">1</text><text x="325" y="69" font-size="11" text-anchor="middle">0 |  –  |  –</text><rect x="250" y="76" width="150" height="22" rx="0" class="f-gray" fill-opacity="0.08"/><rect x="250" y="76" width="150" height="22" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="244" y="91" font-size="11" text-anchor="end" class="t-gray">2</text><text x="325" y="91" font-size="11" text-anchor="middle">0 |  –  |  –</text><rect x="250" y="98" width="150" height="22" rx="0" class="f-green" fill-opacity="0.25"/><rect x="250" y="98" width="150" height="22" rx="0" fill="none" class="s-green" stroke-width="1"/><text x="244" y="113" font-size="11" text-anchor="end" class="t-gray">3</text><text x="325" y="113" font-size="11" text-anchor="middle" class="t-green">1 | rw- | 0x07</text><rect x="250" y="120" width="150" height="22" rx="0" class="f-gray" fill-opacity="0.08"/><rect x="250" y="120" width="150" height="22" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="244" y="135" font-size="11" text-anchor="end" class="t-gray">…</text><text x="325" y="135" font-size="11" text-anchor="middle"></text><rect x="250" y="142" width="150" height="22" rx="0" class="f-gray" fill-opacity="0.08"/><rect x="250" y="142" width="150" height="22" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="244" y="157" font-size="11" text-anchor="end" class="t-gray">F</text><text x="325" y="157" font-size="11" text-anchor="middle">1 | rw- | 0x2A</text><text x="325" y="180" font-size="10.5" text-anchor="middle" class="t-gray">P | perms | frame</text><path d="M75,62 L75,96 L226,96" fill="none" class="s-blue" stroke-width="1.5"/><path d="M232.0,96.0 L225.0,92.8 L225.0,99.2 Z" class="f-blue"/><text x="80" y="112" font-size="10.5" text-anchor="start" class="t-blue">index</text><text x="410" y="52" font-size="10.5" text-anchor="start" class="t-gray">table base</text><text x="410" y="65" font-size="10.5" text-anchor="start" class="t-gray">is in CR3</text><text x="20" y="202" font-size="12" text-anchor="start" font-weight="700">physical address</text><rect x="20" y="210" width="110" height="30" rx="3" class="f-green" fill-opacity="0.2"/><rect x="20" y="210" width="110" height="30" rx="3" fill="none" class="s-green" stroke-width="1.5"/><text x="75" y="230" font-size="12.5" text-anchor="middle" class="t-green" font-weight="700">frame 0x07</text><rect x="130" y="210" width="80" height="30" rx="3" class="f-orange" fill-opacity="0.2"/><rect x="130" y="210" width="80" height="30" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="170" y="230" font-size="12.5" text-anchor="middle" class="t-orange" font-weight="700">offset</text><path d="M400,109 L424,109 L424,186 L75,186 L75,202" fill="none" class="s-green" stroke-width="1.5"/><path d="M75.0,208.0 L78.2,201.0 L71.8,201.0 Z" class="f-green"/><path d="M170,62 L170,202" fill="none" class="s-orange" stroke-width="1.5" stroke-dasharray="5 3"/><path d="M170.0,208.0 L173.2,201.0 L166.8,201.0 Z" class="f-orange"/><text x="162" y="140" font-size="10.5" text-anchor="end" class="t-orange">copied</text><text x="162" y="152" font-size="10.5" text-anchor="end" class="t-orange">unchanged</text></svg>`,
          alt: 'A virtual address split into VPN and offset. The VPN indexes a page table whose rows hold present bit, permissions and frame number; row 3 holds frame 0x07. The physical address is frame 0x07 followed by the unchanged offset.',
          caption: 'A linear page table. The OS fills it in; the MMU reads it on every TLB miss.',
        },
        {
  "type": "algo",
  "view": "array",
  "code": "vpn = va >> 12;\noffset = va & 0xFFF;\npte = pageTable[vpn];\nif (!pte.present) fault();\nif (write && !pte.writable) fault();\npa = pte.frame << 12 | offset;",
  "lang": "cpp",
  "interval": 1700,
  "frames": [
    {
      "note": "The toy page table from the program: 16 entries, one per virtual page. Each cell shows the frame number (hex) or – for not present. Pages 3 and F are writable; page 0 (code) is read-only.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "lines": [],
      "vars": [
        [
          "present",
          "pages 0, 3, F"
        ]
      ]
    },
    {
      "note": "A load from `0x0040`. Split it: the top 4 bits are the VPN, the low 12 bits the offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 0,
          "label": "vpn",
          "color": "blue"
        }
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        }
      ],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "virtual",
          "0x0040"
        ],
        [
          "vpn",
          "0x0"
        ],
        [
          "offset",
          "0x040"
        ]
      ]
    },
    {
      "note": "Entry 0x0 is present: frame 0x12. Glue the frame number onto the unchanged offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 0,
          "label": "frame 12",
          "color": "green"
        }
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "lines": [
        3,
        6
      ],
      "vars": [
        [
          "virtual",
          "0x0040"
        ],
        [
          "physical",
          "0x12 << 12 | 0x040 = 0x12040"
        ]
      ]
    },
    {
      "note": "A store to `0x3a7c`. Split it: the top 4 bits are the VPN, the low 12 bits the offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 3,
          "label": "vpn",
          "color": "blue"
        }
      ],
      "marks": [
        {
          "index": 3,
          "color": "blue"
        }
      ],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "virtual",
          "0x3a7c"
        ],
        [
          "vpn",
          "0x3"
        ],
        [
          "offset",
          "0xa7c"
        ]
      ]
    },
    {
      "note": "Entry 0x3 is present and writable: frame 0x7. Glue the frame number onto the unchanged offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 3,
          "label": "frame 7",
          "color": "green"
        }
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "lines": [
        3,
        6
      ],
      "vars": [
        [
          "virtual",
          "0x3a7c"
        ],
        [
          "physical",
          "0x7 << 12 | 0xa7c = 0x07a7c"
        ]
      ]
    },
    {
      "note": "A load from `0x5004`. Split it: the top 4 bits are the VPN, the low 12 bits the offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 5,
          "label": "vpn",
          "color": "blue"
        }
      ],
      "marks": [
        {
          "index": 5,
          "color": "blue"
        }
      ],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "virtual",
          "0x5004"
        ],
        [
          "vpn",
          "0x5"
        ],
        [
          "offset",
          "0x004"
        ]
      ]
    },
    {
      "note": "Entry 0x5 is not present: the MMU raises a **page fault** and the kernel decides what to do. Here the page was never mapped, so the program gets `SIGSEGV`.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 5,
          "label": "fault",
          "color": "red"
        }
      ],
      "marks": [
        {
          "index": 5,
          "color": "red"
        }
      ],
      "lines": [
        3,
        4
      ],
      "vars": [
        [
          "virtual",
          "0x5004"
        ],
        [
          "result",
          "page fault (not present)"
        ]
      ]
    },
    {
      "note": "A store to `0x0123`. Split it: the top 4 bits are the VPN, the low 12 bits the offset.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 0,
          "label": "vpn",
          "color": "blue"
        }
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        }
      ],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "virtual",
          "0x0123"
        ],
        [
          "vpn",
          "0x0"
        ],
        [
          "offset",
          "0x123"
        ]
      ]
    },
    {
      "note": "Entry 0x0 is present (frame 0x12) but read-only, and this is a store: a **protection fault**. Writing to your own code is a crash, not a corruption.",
      "array": [
        "12",
        "–",
        "–",
        "7",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "–",
        "2A"
      ],
      "pointers": [
        {
          "index": 0,
          "label": "fault",
          "color": "red"
        }
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        }
      ],
      "lines": [
        3,
        5
      ],
      "vars": [
        [
          "virtual",
          "0x0123"
        ],
        [
          "result",
          "page fault (protection)"
        ]
      ]
    }
  ],
  "caption": "Address translation on the 16-bit toy machine: cells are page-table entries indexed by VPN 0 to F."
},
        {
          type: 'p',
          text: 'Here is the same toy machine in C++. On a real system the MMU does this in hardware, but the logic, and the two different kinds of fault, are exactly the same:',
        },
        {
          type: 'code',
          title: 'translate.cpp',
          runnable: true,
          code: `#include <unistd.h>
#include <array>
#include <cstdint>
#include <format>
#include <iostream>

// A toy machine: 16-bit virtual addresses, 4 KiB pages, so a
// 4-bit virtual page number (VPN) and a 12-bit offset.
constexpr unsigned kOffsetBits = 12;
constexpr std::uint32_t kOffsetMask = (1u << kOffsetBits) - 1;

struct Pte {
    bool present = false;
    bool writable = false;
    std::uint32_t frame = 0;     // physical frame number
};

std::array<Pte, 16> pageTable{};  // one entry per virtual page

void access(std::uint32_t va, bool write) {
    const std::uint32_t vpn = va >> kOffsetBits;
    const std::uint32_t offset = va & kOffsetMask;
    const Pte& pte = pageTable[vpn];
    std::cout << std::format("{} {:#06x}: vpn {:#x} off {:#05x} -> ",
        write ? "store" : "load ", va, vpn, offset);
    if (!pte.present) {
        std::cout << "page fault (not present)\\n";
    } else if (write && !pte.writable) {
        std::cout << "page fault (protection)\\n";
    } else {
        const std::uint32_t pa = pte.frame << kOffsetBits | offset;
        std::cout << std::format("physical {:#07x}\\n", pa);
    }
}

int main() {
    std::cout << "this machine's real page size: "
              << sysconf(_SC_PAGESIZE) << " bytes\\n";
    pageTable[0x0] = {true, false, 0x12};   // code: read-only
    pageTable[0x3] = {true, true, 0x07};    // heap
    pageTable[0xF] = {true, true, 0x2A};    // stack
    access(0x0040, false);
    access(0x3A7C, true);
    access(0xFFF8, true);
    access(0x5004, false);   // never mapped
    access(0x0123, true);    // write to code
}`,
          output: "this machine's real page size: 4096 bytes\nload  0x0040: vpn 0x0 off 0x040 -> physical 0x12040\nstore 0x3a7c: vpn 0x3 off 0xa7c -> physical 0x07a7c\nstore 0xfff8: vpn 0xf off 0xff8 -> physical 0x2aff8\nload  0x5004: vpn 0x5 off 0x004 -> page fault (not present)\nstore 0x0123: vpn 0x0 off 0x123 -> page fault (protection)",
          annotations: [
            { lines: '9-10', text: 'The offset mask is `(1 << 12) - 1` = `0xFFF`: twelve 1-bits. Deriving it from the bit count avoids the classic `0x1000` versus `0xFFF` slip.' },
            { lines: '12-16', text: 'A real PTE packs these into one 64-bit word: bit 0 present, bit 1 writable, bits 12 to 51 the frame number, and more.' },
            { lines: '21-22', text: 'Shift and mask: the whole of address splitting.' },
            { lines: '26-29', text: 'Two different faults. "Not present" might be perfectly normal (memory not touched yet, or swapped out); "protection" means the access broke the page\'s permissions. The kernel\'s handler tells them apart from the error code the CPU provides.' },
            { lines: '31', text: 'The physical address is the frame number shifted into place, OR-ed with the untouched offset.' },
            { lines: '37-38', text: '`sysconf(_SC_PAGESIZE)` asks the OS for the real page size. Never hard-code 4096 in portable code: it is 16384 on Apple silicon and some ARM Linux systems.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'A memory-tracking tool splits addresses into page number and offset for 4 KiB pages. Every reported offset is either 0 or 4096. Tap the faulty line.',
      code: `struct PageAddr {
    std::uint64_t vpn;
    std::uint64_t offset;
};

PageAddr split(std::uint64_t va) {
    const std::uint64_t vpn = va >> 12;
    const std::uint64_t offset = va & 0x1000;
    return {vpn, offset};
}`,
      bugLines: [8],
      explanation:
        '`0x1000` is the page **size**, a single 1-bit (bit 12). AND-ing with it keeps only bit 12 of the address, so the result is 0 or 4096. The offset mask is the page size minus one, `0xFFF` (bits 0 to 11). Write it as `(1ull << 12) - 1` or `pageSize - 1` so the intent is visible.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'What the OS keeps in a PTE',
      blocks: [
        {
          type: 'p',
          text: 'The Computer Architecture course listed the x86-64 PTE bits from the hardware\'s side. From the OS\'s side, each bit is a tool the kernel uses to implement a feature:',
        },
        {
          type: 'table',
          headers: ['Bit', 'Set by', 'What the OS uses it for'],
          rows: [
            ['Present', 'OS', 'Clear it for pages not in RAM yet (lazy allocation) or any more (swapped out). The next access faults and the kernel brings the page in.'],
            ['Writable', 'OS', 'Read-only code and constants, and [[copy-on-write]]: shared pages are mapped read-only so the first write faults and gets a private copy.'],
            ['User', 'OS', 'Kernel pages are mapped in every process but marked supervisor-only, so user code touching them faults.'],
            ['No-execute (NX)', 'OS', 'Data, heap and stack pages cannot run as code. With writable code also forbidden, this enforces W^X, a key exploit mitigation.'],
            ['Accessed', 'Hardware', 'Set on any use. The page-replacement algorithm reads and clears it to find pages that are not being used.'],
            ['Dirty', 'Hardware', 'Set on a write. A clean page can be evicted for free; a dirty one must be written to disk or swap first.'],
          ],
        },
        {
          type: 'p',
          text: 'When the present bit is clear, the hardware ignores every other bit, so the kernel is free to reuse them. Linux stores the page\'s **swap location** there, so a fault on a swapped-out page knows exactly where to read it from.',
        },
        {
          type: 'p',
          text: 'Page tables are not the OS\'s only record. Linux keeps a list of **VMAs** (virtual memory areas, the lines of `/proc/self/maps`) and Windows a tree of **VADs** describing which ranges are valid and what backs them. On a fault, the kernel checks the address against these: inside a valid area means "do some work and retry", outside means a [[segmentation-fault]] or access violation.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Changing permissions yourself',
          text: '`mprotect` (POSIX) and `VirtualProtect` (Windows) change these bits for your own pages. JIT compilers write code into a writable page, then flip it to read and execute. Debug allocators place each allocation just before a **guard page** with no access, so the first byte of an overrun crashes on the spot instead of corrupting memory silently.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'After `fork`, how does the kernel make sure that a write by either process gets a private copy of the page, without copying anything up front?',
      options: [
        {
          text: 'It maps the shared pages **read-only** in both processes, so the first write raises a protection fault that the kernel resolves by copying',
          correct: true,
          why: 'The kernel\'s records say the area is writable, so on the fault it knows this is copy-on-write rather than a real violation. It copies the frame, maps the copy writable and restarts the instruction.',
        },
        {
          text: 'It clears the dirty bit, and the hardware copies the page automatically when the dirty bit is set',
          why: 'Hardware sets the dirty bit but never copies pages. Copying is always the kernel\'s job, triggered by a fault.',
        },
        {
          text: 'It clears the present bit on every page of the parent',
          why: 'That would fault on reads too, making every first read expensive. Copy-on-write only needs to catch writes.',
        },
        {
          text: 'It marks the pages no-execute',
          why: 'NX controls instruction fetches, not writes.',
        },
      ],
      explanation:
        'Many OS features are "make the hardware fault at the right moment, then do the work in the handler". Copy-on-write uses the writable bit; demand paging and swapping use the present bit; guard pages use both.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Linear page tables are too big',
      blocks: [
        {
          type: 'p',
          text: 'A linear table needs one entry for **every** virtual page, used or not, because the VPN is the index. Count them for a classic 32-bit system with 4 KiB pages: a 20-bit VPN gives 2²⁰ ≈ one million entries. At 4 bytes each, that is 4 MiB of page table **per process**, even for a program using 100 KiB. With 100 processes, 400 MiB of RAM holds nothing but page tables.',
        },
        {
          type: 'p',
          text: 'For 64-bit it is absurd. A 48-bit space with 4 KiB pages has 2³⁶ pages; at 8 bytes per entry that is 512 GiB per process. Yet nearly all of those entries would be "not present", because a process uses a tiny, clustered part of its space: some code at the bottom, a heap above it, a few libraries, a stack near the top.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A phone book for every possible number',
          text: 'A linear page table is a phone book with a line for every possible phone number, almost all of them blank. What you want is an index: a short top-level list of the area codes that are in use, each pointing to a page listing only that area\'s numbers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: 'A 32-bit system uses 4 KiB pages and 4-byte page-table entries. How big is one process\'s **linear** page table, in MiB?',
      answer: 4,
      unit: 'MiB',
      explanation:
        '32 address bits − 12 offset bits = 20 VPN bits, so 2²⁰ entries × 4 bytes = 2²² bytes = **4 MiB**. It must exist in full even if the process touches only a handful of pages, because the VPN indexes it directly.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'Now a 48-bit virtual address space, 4 KiB pages and 8-byte entries. How big would a linear page table be, in GiB?',
      answer: 512,
      unit: 'GiB',
      explanation:
        '48 − 12 = 36 VPN bits: 2³⁶ entries × 2³ bytes = 2³⁹ bytes = **512 GiB** per process, more RAM than almost any machine has. Linear tables simply do not work for 64-bit address spaces.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Multi-level page tables',
      blocks: [
        {
          type: 'p',
          text: 'The fix is a **[[multi-level-page-table|multi-level page table]]**: page the page table itself. Split the VPN into pieces. The top piece indexes a **page directory**; each present directory entry points to one page-sized chunk of the linear table, and chunks covering only unused addresses are simply **not allocated**. Classic 32-bit x86 splits the address 10 + 10 + 12:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 362" xmlns="http://www.w3.org/2000/svg"><text x="20" y="20" font-size="12" text-anchor="start" font-weight="700">32-bit address:</text><rect x="124" y="6" width="100" height="24" rx="3" class="f-purple" fill-opacity="0.2"/><rect x="124" y="6" width="100" height="24" rx="3" fill="none" class="s-purple" stroke-width="1.5"/><text x="174" y="22" font-size="11.5" text-anchor="middle" class="t-purple" font-weight="700">dir (10)</text><rect x="224" y="6" width="100" height="24" rx="3" class="f-blue" fill-opacity="0.2"/><rect x="224" y="6" width="100" height="24" rx="3" fill="none" class="s-blue" stroke-width="1.5"/><text x="274" y="22" font-size="11.5" text-anchor="middle" class="t-blue" font-weight="700">table (10)</text><rect x="324" y="6" width="90" height="24" rx="3" class="f-orange" fill-opacity="0.2"/><rect x="324" y="6" width="90" height="24" rx="3" fill="none" class="s-orange" stroke-width="1.5"/><text x="369" y="22" font-size="11.5" text-anchor="middle" class="t-orange" font-weight="700">offset (12)</text><text x="92" y="56" font-size="11.5" text-anchor="middle" font-weight="700">page directory</text><rect x="40" y="64" width="104" height="20" rx="0" class="f-purple" fill-opacity="0.22"/><rect x="40" y="64" width="104" height="20" rx="0" fill="none" class="s-purple" stroke-width="1"/><text x="48" y="78" font-size="10.5" text-anchor="start" class="t-purple">0 → PT</text><rect x="40" y="84" width="104" height="20" rx="0" class="f-purple" fill-opacity="0.22"/><rect x="40" y="84" width="104" height="20" rx="0" fill="none" class="s-purple" stroke-width="1"/><text x="48" y="98" font-size="10.5" text-anchor="start" class="t-purple">1 → PT</text><rect x="40" y="104" width="104" height="20" rx="0" class="f-gray" fill-opacity="0.06"/><rect x="40" y="104" width="104" height="20" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="48" y="118" font-size="10.5" text-anchor="start" class="t-gray">2: –</text><rect x="40" y="124" width="104" height="20" rx="0" class="f-gray" fill-opacity="0.06"/><rect x="40" y="124" width="104" height="20" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="48" y="138" font-size="10.5" text-anchor="start" class="t-gray">3: –</text><rect x="40" y="144" width="104" height="20" rx="0" class="f-gray" fill-opacity="0.06"/><rect x="40" y="144" width="104" height="20" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="48" y="158" font-size="10.5" text-anchor="start" class="t-gray">⋮  –</text><rect x="40" y="164" width="104" height="20" rx="0" class="f-gray" fill-opacity="0.06"/><rect x="40" y="164" width="104" height="20" rx="0" fill="none" class="s-gray" stroke-width="1"/><text x="48" y="178" font-size="10.5" text-anchor="start" class="t-gray">1022: –</text><rect x="40" y="184" width="104" height="20" rx="0" class="f-purple" fill-opacity="0.22"/><rect x="40" y="184" width="104" height="20" rx="0" fill="none" class="s-purple" stroke-width="1"/><text x="48" y="198" font-size="10.5" text-anchor="start" class="t-purple">1023 → PT</text><text x="92" y="220" font-size="10" text-anchor="middle" class="t-gray">4 KiB, always present</text><text x="92" y="233" font-size="10" text-anchor="middle" class="t-gray">(CR3 points here)</text><rect x="230" y="56" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="56" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="69" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><rect x="230" y="74" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.06"/><rect x="230" y="74" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="87" font-size="10" text-anchor="start" class="t-gray">⋮</text><rect x="230" y="92" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="92" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="105" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><text x="348" y="87" font-size="10.5" text-anchor="start">page table: code + data</text><path d="M144,74 L184,74 L184,65 L223,65" fill="none" class="s-purple" stroke-width="1.3"/><path d="M228.0,65.0 L222.0,62.3 L222.0,67.7 Z" class="f-purple"/><line x1="342" y1="65" x2="366" y2="65" class="s-green" stroke-width="1.1"/><path d="M370.0,65.0 L365.0,62.8 L365.0,67.2 Z" class="f-green"/><line x1="342" y1="101" x2="366" y2="101" class="s-green" stroke-width="1.1"/><path d="M370.0,101.0 L365.0,98.8 L365.0,103.2 Z" class="f-green"/><rect x="372" y="56" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="56" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><rect x="372" y="92" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="92" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><rect x="230" y="150" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="150" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="163" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><rect x="230" y="168" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.06"/><rect x="230" y="168" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="181" font-size="10" text-anchor="start" class="t-gray">⋮</text><rect x="230" y="186" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="186" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="199" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><text x="348" y="181" font-size="10.5" text-anchor="start">page table: heap</text><path d="M144,94 L184,94 L184,159 L223,159" fill="none" class="s-purple" stroke-width="1.3"/><path d="M228.0,159.0 L222.0,156.3 L222.0,161.7 Z" class="f-purple"/><line x1="342" y1="159" x2="366" y2="159" class="s-green" stroke-width="1.1"/><path d="M370.0,159.0 L365.0,156.8 L365.0,161.2 Z" class="f-green"/><line x1="342" y1="195" x2="366" y2="195" class="s-green" stroke-width="1.1"/><path d="M370.0,195.0 L365.0,192.8 L365.0,197.2 Z" class="f-green"/><rect x="372" y="150" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="150" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><rect x="372" y="186" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="186" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><rect x="230" y="250" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="250" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="263" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><rect x="230" y="268" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.06"/><rect x="230" y="268" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="281" font-size="10" text-anchor="start" class="t-gray">⋮</text><rect x="230" y="286" width="110" height="18" rx="0" class="f-blue" fill-opacity="0.18"/><rect x="230" y="286" width="110" height="18" rx="0" fill="none" class="s-blue" stroke-width="1"/><text x="238" y="299" font-size="10" text-anchor="start" class="t-blue">PTE → frame</text><text x="348" y="281" font-size="10.5" text-anchor="start">page table: stack</text><path d="M144,194 L184,194 L184,259 L223,259" fill="none" class="s-purple" stroke-width="1.3"/><path d="M228.0,259.0 L222.0,256.3 L222.0,261.7 Z" class="f-purple"/><line x1="342" y1="259" x2="366" y2="259" class="s-green" stroke-width="1.1"/><path d="M370.0,259.0 L365.0,256.8 L365.0,261.2 Z" class="f-green"/><line x1="342" y1="295" x2="366" y2="295" class="s-green" stroke-width="1.1"/><path d="M370.0,295.0 L365.0,292.8 L365.0,297.2 Z" class="f-green"/><rect x="372" y="250" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="250" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><rect x="372" y="286" width="26" height="18" rx="1" class="f-green" fill-opacity="0.25"/><rect x="372" y="286" width="26" height="18" rx="1" fill="none" class="s-green" stroke-width="1"/><text x="260" y="340" font-size="10.5" text-anchor="middle">Directory entries 2 to 1022 are empty, so no page tables exist for them:</text><text x="260" y="354" font-size="10.5" text-anchor="middle" class="t-green" font-weight="700">4 tables × 4 KiB = 16 KiB instead of a 4 MiB linear table.</text></svg>`,
          alt: 'A 32-bit address split into a 10-bit directory index, 10-bit table index and 12-bit offset. A page directory has present entries 0, 1 and 1023 pointing to three page tables (code and data, heap, stack), whose entries point to frames. Entries 2 to 1022 are empty.',
          caption: 'Each page table covers 4 MiB of address space. Unused 4 MiB regions cost one empty directory entry instead of a 4 KiB table.',
        },
        {
          type: 'p',
          text: 'A TLB miss now costs one memory access per level, and the walk may even discover that a table is missing. Step through a walk, a TLB hit, and a fault that the kernel resolves:',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 430,
  "height": 230,
  "nodes": [
    {
      "id": "VA",
      "x": 40,
      "y": 60,
      "label": "VA"
    },
    {
      "id": "TLB",
      "x": 40,
      "y": 170,
      "label": "TLB"
    },
    {
      "id": "CR3",
      "x": 130,
      "y": 60,
      "label": "CR3"
    },
    {
      "id": "PD",
      "x": 220,
      "y": 60,
      "label": "PD"
    },
    {
      "id": "PT",
      "x": 310,
      "y": 60,
      "label": "PT"
    },
    {
      "id": "PG",
      "x": 390,
      "y": 60,
      "label": "page"
    },
    {
      "id": "K",
      "x": 260,
      "y": 170,
      "label": "OS"
    }
  ],
  "edges": [
    {
      "from": "VA",
      "to": "TLB",
      "directed": true
    },
    {
      "from": "VA",
      "to": "CR3",
      "directed": true
    },
    {
      "from": "CR3",
      "to": "PD",
      "directed": true
    },
    {
      "from": "PD",
      "to": "PT",
      "directed": true
    },
    {
      "from": "PT",
      "to": "PG",
      "directed": true
    },
    {
      "from": "TLB",
      "to": "PG",
      "directed": true
    },
    {
      "from": "PD",
      "to": "K",
      "directed": true
    },
    {
      "from": "K",
      "to": "PT",
      "directed": true
    }
  ],
  "interval": 2000,
  "frames": [
    {
      "note": "32-bit x86 classic paging: 10 bits of page-directory index, 10 bits of page-table index, 12 bits of offset. The program loads from `0x00403abc`.",
      "nodeColors": [
        {
          "id": "VA",
          "color": "orange"
        }
      ],
      "edgeColors": [],
      "nodeNotes": [
        {
          "id": "VA",
          "text": "0x00403abc"
        }
      ]
    },
    {
      "note": "Split it: directory index 1, table index 3, offset 0xabc. First check the TLB: no entry for virtual page 0x403, a **TLB miss**.",
      "nodeColors": [
        {
          "id": "VA",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "edgeColors": [
        {
          "from": "VA",
          "to": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "VA",
          "text": "dir 1, tbl 3"
        },
        {
          "id": "TLB",
          "text": "miss"
        }
      ]
    },
    {
      "note": "CR3 holds the physical address of this process's page directory. The OS set it at the last context switch.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "VA",
          "to": "CR3",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "PD @ 0x9000"
        }
      ]
    },
    {
      "note": "Read page-directory entry 1: present, pointing to a page table in frame 0x2B.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "gray"
        },
        {
          "id": "PD",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "CR3",
          "to": "PD",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "PD",
          "text": "PDE[1] → 0x2B"
        }
      ]
    },
    {
      "note": "Read page-table entry 3 in that table: present, frame 0x1C7, user-readable.",
      "nodeColors": [
        {
          "id": "PD",
          "color": "gray"
        },
        {
          "id": "PT",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "PD",
          "to": "PT",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "PT",
          "text": "PTE[3] → 0x1C7"
        }
      ]
    },
    {
      "note": "Physical address = frame 0x1C7 followed by offset 0xabc = 0x1c7abc. The translation is cached in the TLB on the way.",
      "nodeColors": [
        {
          "id": "PT",
          "color": "gray"
        },
        {
          "id": "PG",
          "color": "green"
        },
        {
          "id": "TLB",
          "color": "green"
        }
      ],
      "edgeColors": [
        {
          "from": "PT",
          "to": "PG",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "PG",
          "text": "0x1c7abc"
        },
        {
          "id": "TLB",
          "text": "0x403 → 0x1C7"
        }
      ]
    },
    {
      "note": "Next load, `0x00403f00`, is on the same virtual page. **TLB hit**: no memory reads for the page tables at all.",
      "nodeColors": [
        {
          "id": "VA",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "green"
        },
        {
          "id": "PG",
          "color": "green"
        }
      ],
      "edgeColors": [
        {
          "from": "VA",
          "to": "TLB",
          "color": "green"
        },
        {
          "from": "TLB",
          "to": "PG",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "VA",
          "text": "0x00403f00"
        },
        {
          "id": "TLB",
          "text": "hit"
        },
        {
          "id": "PG",
          "text": "0x1c7f00"
        }
      ]
    },
    {
      "note": "Now the program touches freshly `malloc`ed memory at `0x08001010` (directory index 32). TLB miss again, so walk from CR3.",
      "nodeColors": [
        {
          "id": "VA",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        },
        {
          "id": "CR3",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "VA",
          "to": "TLB",
          "color": "red"
        },
        {
          "from": "VA",
          "to": "CR3",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "VA",
          "text": "dir 32, tbl 1"
        },
        {
          "id": "TLB",
          "text": "miss"
        }
      ]
    },
    {
      "note": "Page-directory entry 32 is **not present**: no page table exists for this 4 MiB region yet. The hardware raises a page fault and traps to the kernel.",
      "nodeColors": [
        {
          "id": "PD",
          "color": "red"
        },
        {
          "id": "K",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "CR3",
          "to": "PD",
          "color": "blue"
        },
        {
          "from": "PD",
          "to": "K",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "PD",
          "text": "PDE[32]: not present"
        },
        {
          "id": "K",
          "text": "page fault"
        }
      ]
    },
    {
      "note": "The kernel checks its own records: the address is inside a valid heap mapping, so this is **demand paging**, not a bug. It allocates a zeroed page table and a zeroed frame and fills in both entries.",
      "nodeColors": [
        {
          "id": "K",
          "color": "orange"
        },
        {
          "id": "PT",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "K",
          "to": "PT",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "K",
          "text": "alloc PT + frame"
        },
        {
          "id": "PT",
          "text": "PTE[1] → 0x3F0"
        }
      ]
    },
    {
      "note": "Return from the fault re-executes the same load instruction. This time the walk succeeds, and the program never knew anything happened, except that this access took microseconds instead of nanoseconds.",
      "nodeColors": [
        {
          "id": "PD",
          "color": "green"
        },
        {
          "id": "PT",
          "color": "green"
        },
        {
          "id": "PG",
          "color": "green"
        },
        {
          "id": "TLB",
          "color": "green"
        }
      ],
      "edgeColors": [
        {
          "from": "CR3",
          "to": "PD",
          "color": "green"
        },
        {
          "from": "PD",
          "to": "PT",
          "color": "green"
        },
        {
          "from": "PT",
          "to": "PG",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "PG",
          "text": "0x3f0010"
        },
        {
          "id": "TLB",
          "text": "0x8001 → 0x3F0"
        }
      ]
    }
  ],
  "caption": "A two-level page walk, a TLB hit, and a page fault that the kernel resolves by demand paging. Frame numbers are made up; the index arithmetic is real."
},
        {
          type: 'p',
          text: 'x86-64 uses the same idea with four levels of 512-entry tables (9 + 9 + 9 + 9 + 12 bits), or five on CPUs and kernels that support 57-bit addresses; the hardware walk is covered in the Computer Architecture course. A typical game process needs a few hundred page-table pages, a few MiB, instead of 512 GiB.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why every level is exactly one page',
          text: 'Making each table exactly one page (1024 × 4 bytes or 512 × 8 bytes) means the kernel allocates page tables with the same frame allocator as everything else, and a table can even be swapped out like any other page. The bit split is chosen to make that true: 4096 / 8 = 512 entries = 9 index bits per level.',
        },
        {
          type: 'deepdive',
          title: 'Other designs: inverted and hashed page tables',
          blocks: [
            {
              type: 'p',
              text: 'An **inverted page table** has one entry per *physical frame* (recording which process and VPN occupy it) instead of one per virtual page, so its size depends on RAM, not on address-space size. Lookups need a hash table keyed by (process, VPN). IBM\'s PowerPC and Itanium used variants. Radix trees won on x86 and ARM because hardware can walk them simply and they make sharing and per-process tables easy.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'A 32-bit process (10 + 10 + 12 split, 4-byte entries, 4 KiB tables) uses 2 MiB of code and data starting at address 0, 1 MiB of heap starting at `0x08000000`, and 64 KiB of stack just below `0xFFFFFFFF`. How many KiB of page tables does it need, counting the directory?',
      hint: 'Which 4 MiB regions (directory entries) contain any used address?',
      answer: 16,
      unit: 'KiB',
      explanation:
        'Code and data fit in directory entry 0; the heap at `0x08000000` is entry `0x08000000 >> 22` = 32 and its 1 MiB fits inside that one 4 MiB region; the stack is in entry 1023. So: 1 directory + 3 page tables = 4 pages × 4 KiB = **16 KiB**, against 4 MiB for a linear table, a 256× saving.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The TLB from the OS\'s side',
      blocks: [
        {
          type: 'p',
          text: 'Walking four levels on every access would make memory four or five times slower, so the CPU caches recent translations in the **[[tlb|TLB]]**, which hits on the vast majority of accesses. The hardware fills the TLB on x86 and ARM, but the OS is responsible for keeping it **correct**, because the TLB is not kept coherent with the page tables automatically. Three situations matter:',
        },
        {
          type: 'list',
          items: [
            '**Context switch.** The new process\'s VPN 0x400 means something else. Loading a new page-table root (CR3 on x86) flushes the old process\'s entries, and the new process starts with a cold TLB. Pages marked *global* (kernel mappings identical in every process) survive the flush.',
            '**Tagged TLBs.** To avoid the flush, entries can carry a tag naming their address space: an **[[asid|ASID]]** on ARM and RISC-V, a 12-bit **PCID** on x86-64. Switching just changes the current tag. Linux leaned on PCIDs heavily after 2018, when the Meltdown fix (KPTI) gave each process separate user and kernel page tables and made switches between them frequent.',
            '**Changing a mapping.** After `munmap`, `mprotect` or evicting a page, the kernel must invalidate the stale entry (`invlpg` on x86). Other cores running the same process may have it cached too, so the kernel interrupts them and waits until they flush it: a **[[tlb-shootdown]]**.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What this means for your C++',
          text: 'Mapping and unmapping memory in a hot loop is expensive in a multithreaded program, because every unmap can mean inter-processor interrupts to all cores running your threads. That is one reason allocators and engines keep memory mapped and reuse it rather than returning it to the OS after every frame.',
        },
        {
          type: 'p',
          text: 'The usual way to quantify the TLB is the **effective access time** (EAT): the average cost of a memory reference including translation. If a TLB hit costs one memory access `m` and a miss costs the walk too, then `EAT = hit_rate × m + miss_rate × (m + levels × m)`, ignoring the fact that page-table entries are often in the data caches.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'numeric',
      prompt: 'Memory access takes 80 ns, the TLB lookup itself is free, and a TLB miss needs a 4-level walk with one 80 ns access per level before the actual access. With a 98% TLB hit rate, what is the effective access time? Round to one decimal place.',
      answer: 86.4,
      tolerance: 0.05,
      unit: 'ns',
      explanation:
        'Hits: 0.98 × 80 = 78.4 ns. Misses: 0.02 × (4 × 80 + 80) = 0.02 × 400 = 8.0 ns. EAT = **86.4 ns**, an 8% slowdown from just 2% misses. At a 90% hit rate it would be 0.9 × 80 + 0.1 × 400 = 112 ns. In reality page-walk caches and the data caches make misses cheaper, but the lesson stands: TLB reach matters for code that sprawls across lots of memory.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Choosing page sizes',
      blocks: [
        {
          type: 'p',
          text: 'The page size is a trade-off the OS gets to make per mapping. Bigger pages mean fewer TLB entries for the same memory (more *TLB reach*) and shallower walks; smaller pages waste less memory at the end of a region (internal fragmentation) and make copy-on-write, swapping and protection finer-grained.',
        },
        {
          type: 'p',
          text: 'x86-64 also supports [[huge-pages|2 MiB and 1 GiB pages]], mapped by stopping the walk one or two levels early. On Linux, **transparent huge pages** let the kernel back large anonymous regions with 2 MiB pages automatically when it can find aligned free memory, and `madvise(MADV_HUGEPAGE)` asks for them. Windows offers **large pages** through `VirtualAlloc(MEM_LARGE_PAGES)`, which needs the *Lock pages in memory* privilege and cannot be paged out. Engines that manage big pools of asset or GPU-visible memory often request large pages for them where the platform allows, because the TLB savings on large, densely used buffers are real.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Huge pages are not free',
          text: 'A 2 MiB page is all or nothing: touching one byte commits 2 MiB, and finding 512 physically contiguous free frames gets harder as memory fragments, so the kernel may spend time compacting memory. Measure before and after; huge pages help large, densely used buffers and can hurt sparse ones.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'order',
      prompt: 'Put the steps of translating one virtual address in order, from the CPU issuing a load to the data access.',
      lines: [
        'Split the virtual address into virtual page number and offset',
        'Look up the virtual page number in the TLB',
        'On a TLB miss, walk the page table to find the page-table entry',
        'Check the present and permission bits, raising a page fault if they forbid the access',
        'Combine the frame number with the offset and access physical memory',
      ],
      distractors: ['Ask the kernel to translate the address with a system call'],
      linesAreCode: false,
      explanation:
        'Translation is a hardware job: the kernel is involved only when the hardware raises a page fault, never on the normal path, which is why the system-call line does not belong. The TLB is checked before the walk because a hit skips the walk entirely; permissions are checked on the entry whether it came from the TLB or the walk.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Why do kernels tag TLB entries with an ASID or PCID?',
      options: [
        {
          text: 'So a context switch to another process does not have to flush the TLB, and each process\'s entries survive until it runs again',
          correct: true,
          why: 'Entries of several address spaces can coexist because a lookup only matches entries whose tag equals the current one.',
        },
        {
          text: 'So that two processes can share each other\'s translations and run faster',
          why: 'Sharing is done with global pages or by mapping the same frames; tags exist precisely to keep different spaces\' entries apart.',
        },
        {
          text: 'So that the hardware can perform TLB shootdowns without the kernel',
          why: 'Shootdowns are still done by the kernel, using inter-processor interrupts (on x86) to make other cores invalidate entries.',
        },
        {
          text: 'So the TLB can hold more entries in the same silicon',
          why: 'Tags add bits to each entry; they do not increase capacity. They make the existing capacity survive switches.',
        },
      ],
      explanation:
        'Without tags, every switch between processes empties the TLB and the incoming process pays misses until it warms up again. Tags turn that into a register write. The kernel has fewer tags than processes (4096 PCIDs), so it recycles them and flushes only when reusing one.',
    },
  ],
  takeaways: [
    'Paging splits memory into fixed-size **pages** and **frames**; any page can go in any frame, which eliminates external fragmentation.',
    'An address is **VPN + offset**. With 4 KiB pages the offset is the low 12 bits (the last three hex digits) and passes through untranslated.',
    'PTE bits are the OS\'s tools: **present** for lazy allocation and swapping, **writable** for read-only code and copy-on-write, **user** and **NX** for protection, **accessed** and **dirty** for replacement.',
    'Linear tables cost 4 MiB per 32-bit process and 512 GiB per 48-bit one; **multi-level tables** allocate only the parts covering used memory.',
    'The OS keeps the TLB correct: flush or tag (**ASID/PCID**) on context switches, invalidate on unmap, and send **shootdowns** to other cores.',
    '**Effective access time** = hit rate × hit cost + miss rate × miss cost; even a few percent of misses is visible.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 18: Paging: Introduction',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf',
      source: 'book',
      note: 'VPNs, offsets, PTE contents and why linear tables are slow and big.',
    },
    {
      title: 'OSTEP chapter 19: Paging: Faster Translations (TLBs)',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf',
      source: 'book',
      note: 'TLB contents, ASIDs, context switches and replacement, with a TLB-measuring homework.',
    },
    {
      title: 'OSTEP chapter 20: Paging: Smaller Tables',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-smalltables.pdf',
      source: 'book',
      note: 'Multi-level and inverted page tables and the time-space trade-off.',
    },
    {
      title: 'mprotect(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/mprotect.2.html',
      source: 'other',
      note: 'Changing page permissions from user code, with an example that catches the resulting SIGSEGV.',
    },
  ],
};
