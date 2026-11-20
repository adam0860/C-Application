import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-address-translation',
  title: 'Address Translation and the TLB',
  summary:
    'What the hardware does with every virtual address: the MMU, the 4-level x86-64 page walk, the TLB that makes it fast, huge pages, and why random access over gigabytes of data is so slow.',
  minutes: 22,
  objectives: [
    'Explain, from the hardware\'s side, how the MMU turns virtual addresses into physical ones page by page',
    'Split an x86-64 virtual address into four table indices and a page offset, and trace a 4-level page walk',
    'Describe the TLB, compute TLB reach, and estimate the cost of a TLB miss',
    'Explain how L1 caches overlap their lookup with translation, and why that limits L1 size',
    'Describe 2 MiB and 1 GiB huge pages and when they help',
    'Explain why random access over very large data is slow, in terms of caches, TLBs and page walks',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Virtual and physical addresses',
      blocks: [
        {
          type: 'p',
          text: 'Every address your C++ program can see is a **[[virtual-address]]**: `&health`, `this`, the value inside a `std::unique_ptr`, the stack pointer. The DRAM chips and the caches behind L1 work with **physical addresses**. Between the two sits the **[[mmu|memory management unit (MMU)]]**, hardware inside each core that translates *every* load, store and instruction fetch.',
        },
        {
          type: 'p',
          text: 'Translation works on fixed-size **pages**, 4 KiB by default on x86-64. The low 12 bits of an address, the **page offset**, pass through untouched; only the **virtual page number** above them is translated into a **physical frame number**. Why the operating system wants this (isolation between processes, every process having the same tidy address layout, loading pages lazily, sharing libraries) is the subject of the Operating Systems course. Here we stay on the hardware side: how is the translation found, and what does it cost?',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 170" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="34" width="78" height="42" rx="3" class="f-gray" fill-opacity="0.16"/><rect x="14" y="34" width="78" height="42" rx="3" fill="none" class="s-gray" stroke-width="1.6"/><text x="53" y="53" font-size="13" text-anchor="middle" font-weight="700">sign ext.</text><text x="53" y="69" font-size="11" text-anchor="middle">16 bits</text><text x="53" y="26" font-size="11" text-anchor="middle" class="t-gray">63–48</text><rect x="92" y="34" width="76" height="42" rx="3" class="f-purple" fill-opacity="0.16"/><rect x="92" y="34" width="76" height="42" rx="3" fill="none" class="s-purple" stroke-width="1.6"/><text x="130" y="53" font-size="13" text-anchor="middle" class="t-purple" font-weight="700">PML4</text><text x="130" y="69" font-size="11" text-anchor="middle">9 bits</text><text x="130" y="26" font-size="11" text-anchor="middle" class="t-gray">47–39</text><rect x="168" y="34" width="76" height="42" rx="3" class="f-blue" fill-opacity="0.16"/><rect x="168" y="34" width="76" height="42" rx="3" fill="none" class="s-blue" stroke-width="1.6"/><text x="206" y="53" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">PDPT</text><text x="206" y="69" font-size="11" text-anchor="middle">9 bits</text><text x="206" y="26" font-size="11" text-anchor="middle" class="t-gray">38–30</text><rect x="244" y="34" width="76" height="42" rx="3" class="f-teal" fill-opacity="0.16"/><rect x="244" y="34" width="76" height="42" rx="3" fill="none" class="s-teal" stroke-width="1.6"/><text x="282" y="53" font-size="13" text-anchor="middle" class="t-teal" font-weight="700">PD</text><text x="282" y="69" font-size="11" text-anchor="middle">9 bits</text><text x="282" y="26" font-size="11" text-anchor="middle" class="t-gray">29–21</text><rect x="320" y="34" width="76" height="42" rx="3" class="f-green" fill-opacity="0.16"/><rect x="320" y="34" width="76" height="42" rx="3" fill="none" class="s-green" stroke-width="1.6"/><text x="358" y="53" font-size="13" text-anchor="middle" class="t-green" font-weight="700">PT</text><text x="358" y="69" font-size="11" text-anchor="middle">9 bits</text><text x="358" y="26" font-size="11" text-anchor="middle" class="t-gray">20–12</text><rect x="396" y="34" width="110" height="42" rx="3" class="f-orange" fill-opacity="0.16"/><rect x="396" y="34" width="110" height="42" rx="3" fill="none" class="s-orange" stroke-width="1.6"/><text x="451" y="53" font-size="13" text-anchor="middle" class="t-orange" font-weight="700">offset</text><text x="451" y="69" font-size="11" text-anchor="middle">12 bits</text><text x="451" y="26" font-size="11" text-anchor="middle" class="t-gray">11–0</text><line x1="92" y1="92" x2="396" y2="92" class="s-blue" stroke-width="1.4"/><line x1="92" y1="86" x2="92" y2="92" class="s-blue" stroke-width="1.4"/><line x1="396" y1="86" x2="396" y2="92" class="s-blue" stroke-width="1.4"/><text x="244" y="110" font-size="12" text-anchor="middle" class="t-blue">virtual page number (36 bits): 4 table indices, 0–511 each</text><line x1="396" y1="92" x2="506" y2="92" class="s-orange" stroke-width="1.4"/><line x1="506" y1="86" x2="506" y2="92" class="s-orange" stroke-width="1.4"/><text x="451" y="128" font-size="11.5" text-anchor="middle" class="t-orange">copied unchanged</text><text x="451" y="143" font-size="11.5" text-anchor="middle" class="t-orange">into the physical</text><text x="451" y="158" font-size="11.5" text-anchor="middle" class="t-orange">address</text><text x="53" y="128" font-size="11.5" text-anchor="middle" class="t-gray">must equal</text><text x="53" y="143" font-size="11.5" text-anchor="middle" class="t-gray">bit 47</text><text x="53" y="158" font-size="11.5" text-anchor="middle" class="t-gray">("canonical")</text><text x="244" y="140" font-size="11.5" text-anchor="middle">each index selects one of the 512 eight-byte</text><text x="244" y="155" font-size="11.5" text-anchor="middle">entries in a 4 KiB table at that level</text></svg>`,
          alt: 'A 64-bit virtual address: bits 63 to 48 are a sign extension, then four 9-bit indices for the PML4, PDPT, PD and PT tables, then a 12-bit page offset.',
          caption: 'An x86-64 virtual address with 4-level paging. Only 48 bits are meaningful.',
        },
        {
          type: 'p',
          text: 'x86-64 pointers are 64 bits wide, but with **4-level paging** only the low 48 bits are translated, giving a 256 TiB virtual address space. Bits 63..48 must all be copies of bit 47 (a **canonical** address); anything else faults. Newer server CPUs support **5-level paging** with 57-bit virtual addresses, and `lscpu` on the Xeon VM from earlier reports exactly that: "52 bits physical, 57 bits virtual". The 36 translated bits are four 9-bit indices, one per level of the page table:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <format>
#include <iostream>

// x86-64 4-level paging: 48-bit virtual addresses split as
// 9 + 9 + 9 + 9 index bits and a 12-bit page offset.
struct VirtualAddress {
    std::uint64_t pml4, pdpt, pd, pt, offset;
};

constexpr VirtualAddress split(std::uint64_t va) {
    return {(va >> 39) & 0x1FF, (va >> 30) & 0x1FF,
            (va >> 21) & 0x1FF, (va >> 12) & 0x1FF, va & 0xFFF};
}

int main() {
    const std::uint64_t va = 0x7FFD'8ABC'3E48;  // a stack address
    const VirtualAddress v = split(va);
    std::cout << std::format("virtual address {:#x}\\n", va);
    std::cout << std::format("PML4 index {:3}  ({:#05x})\\n", v.pml4,
                             v.pml4);
    std::cout << std::format("PDPT index {:3}  ({:#05x})\\n", v.pdpt,
                             v.pdpt);
    std::cout << std::format("PD index   {:3}  ({:#05x})\\n", v.pd,
                             v.pd);
    std::cout << std::format("PT index   {:3}  ({:#05x})\\n", v.pt,
                             v.pt);
    std::cout << std::format("offset    {:4}  ({:#05x})\\n",
                             v.offset, v.offset);
    std::cout << std::format("virtual page number {:#x}\\n", va >> 12);
}`,
          output: "virtual address 0x7ffd8abc3e48\nPML4 index 255  (0x0ff)\nPDPT index 502  (0x1f6)\nPD index    85  (0x055)\nPT index   451  (0x1c3)\noffset    3656  (0xe48)\nvirtual page number 0x7ffd8abc3",
          annotations: [
            { lines: '11-14', text: 'Shift each 9-bit field down and mask it with `0x1FF` (nine 1-bits). The offset is the low 12 bits: `0xFFF`.' },
            { lines: 17, text: 'Linux places the main thread\'s stack just below 128 TiB (`0x7FFF…`), so stack addresses typically look like this. The PML4 index 255 is the last entry of the lower, user half of the address space.' },
            { lines: 30, text: 'The virtual page number is simply the address shifted right by 12: everything except the offset.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why pages, and why 4 KiB?',
          text: 'Translating every byte individually would need a table entry per byte. Translating fixed blocks means one entry per 4,096 bytes, and the offset bits need no translation at all. The size is a trade-off from the 1980s that stuck: small pages waste little memory when a region is only partly used, but need more entries, bigger tables and more TLB capacity. Larger pages flip those trade-offs, which is why huge pages exist, and why Apple\'s ARM chips use 16 KiB pages by default.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'Each x86-64 page-table entry is 8 bytes, and each table occupies exactly one 4 KiB page. How many entries does one table hold?',
      answer: 512,
      unit: 'entries',
      explanation:
        '4096 / 8 = **512 entries**, and log₂ 512 = 9, which is exactly why each level consumes **9 bits** of the virtual address. Four levels × 9 bits + 12 offset bits = 48 bits. The sizes are designed to fit together: a table is one page, so the OS can allocate page tables with the same page allocator as everything else.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'The 4-level page walk',
      blocks: [
        {
          type: 'p',
          text: 'The **[[page-table]]** is a tree with up to four levels, called PML4, PDPT, PD and PT (page map level 4, page directory pointer table, page directory, page table). A special register, **CR3**, holds the physical address of the root. Each entry holds the physical address of the next table, or at the last level of the page frame, plus permission and status bits:',
        },
        {
          type: 'table',
          headers: ['Bit(s)', 'Name', 'Meaning'],
          rows: [
            ['0', 'P (present)', 'The entry is valid. If 0, the access raises a **page fault** and the OS takes over'],
            ['1', 'R/W', 'Writes allowed'],
            ['2', 'U/S', 'Accessible from user mode (otherwise kernel only)'],
            ['5, 6', 'A, D (accessed, dirty)', 'Set by hardware when the page is used or written; the OS reads them to choose pages to evict'],
            ['7', 'PS (page size)', 'In a PD or PDPT entry: this entry maps a 2 MiB or 1 GiB huge page directly'],
            ['12–51', 'Address', 'Physical address of the next table or of the page frame'],
            ['63', 'XD / NX', 'No execute: instruction fetches from this page fault'],
          ],
        },
        {
          type: 'p',
          text: 'On a translation miss, the CPU\'s **hardware page walker** reads one entry per level, each at `table base + index × 8`:',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 430,
  "height": 205,
  "nodes": [
    {
      "id": "CR3",
      "x": 32,
      "y": 70
    },
    {
      "id": "L4",
      "x": 98,
      "y": 70
    },
    {
      "id": "L3",
      "x": 164,
      "y": 70
    },
    {
      "id": "L2",
      "x": 230,
      "y": 70
    },
    {
      "id": "L1",
      "x": 296,
      "y": 70
    },
    {
      "id": "PA",
      "x": 372,
      "y": 70
    },
    {
      "id": "TLB",
      "x": 200,
      "y": 160
    }
  ],
  "edges": [
    {
      "from": "CR3",
      "to": "L4",
      "directed": true
    },
    {
      "from": "L4",
      "to": "L3",
      "directed": true
    },
    {
      "from": "L3",
      "to": "L2",
      "directed": true
    },
    {
      "from": "L2",
      "to": "L1",
      "directed": true
    },
    {
      "from": "L1",
      "to": "PA",
      "directed": true
    },
    {
      "from": "TLB",
      "to": "PA",
      "directed": true
    }
  ],
  "interval": 1800,
  "frames": [
    {
      "note": "The core loads from virtual address `0x7FFD8ABC3E48`. The TLB has no entry for its page: a **TLB miss**, so the hardware page walker starts.",
      "nodeColors": [
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "TLB",
          "text": "miss"
        }
      ],
      "vars": [
        [
          "VA",
          "0x7FFD8ABC3E48"
        ],
        [
          "indices · offset",
          "255 · 502 · 85 · 451 · 0xE48"
        ]
      ]
    },
    {
      "note": "The **CR3** register holds the physical address of this process's top-level table, the PML4: `0x1A000`.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        }
      ],
      "vars": [
        [
          "VA",
          "0x7FFD8ABC3E48"
        ],
        [
          "indices · offset",
          "255 · 502 · 85 · 451 · 0xE48"
        ],
        [
          "memory reads",
          "0"
        ]
      ]
    },
    {
      "note": "Read **PML4[255]** at physical address `0x1A000 + 255 × 8 = 0x1A7F8`. It is present and points to the PDPT table at `0x2B000`.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "green"
        },
        {
          "id": "L4",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        },
        {
          "id": "L4",
          "text": "PML4[255]"
        }
      ],
      "edgeColors": [
        {
          "from": "CR3",
          "to": "L4",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "entry",
          "0x2B007"
        ],
        [
          "memory reads",
          "1"
        ]
      ]
    },
    {
      "note": "Read **PDPT[502]** at physical address `0x2B000 + 502 × 8 = 0x2BFB0`. It is present and points to the PD table at `0x3C000`.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "green"
        },
        {
          "id": "L4",
          "color": "green"
        },
        {
          "id": "L3",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        },
        {
          "id": "L4",
          "text": "PML4[255]"
        },
        {
          "id": "L3",
          "text": "PDPT[502]"
        }
      ],
      "edgeColors": [
        {
          "from": "L4",
          "to": "L3",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "entry",
          "0x3C007"
        ],
        [
          "memory reads",
          "2"
        ]
      ]
    },
    {
      "note": "Read **PD[85]** at physical address `0x3C000 + 85 × 8 = 0x3C2A8`. It is present and points to the PT table at `0x4D000`.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "green"
        },
        {
          "id": "L4",
          "color": "green"
        },
        {
          "id": "L3",
          "color": "green"
        },
        {
          "id": "L2",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        },
        {
          "id": "L4",
          "text": "PML4[255]"
        },
        {
          "id": "L3",
          "text": "PDPT[502]"
        },
        {
          "id": "L2",
          "text": "PD[85]"
        }
      ],
      "edgeColors": [
        {
          "from": "L3",
          "to": "L2",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "entry",
          "0x4D007"
        ],
        [
          "memory reads",
          "3"
        ]
      ]
    },
    {
      "note": "Read **PT[451]** at `0x4DE18`: present, user, writable, no-execute. It holds the physical frame `0x9F123000`.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "green"
        },
        {
          "id": "L4",
          "color": "green"
        },
        {
          "id": "L3",
          "color": "green"
        },
        {
          "id": "L2",
          "color": "green"
        },
        {
          "id": "L1",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        },
        {
          "id": "L4",
          "text": "PML4[255]"
        },
        {
          "id": "L3",
          "text": "PDPT[502]"
        },
        {
          "id": "L2",
          "text": "PD[85]"
        },
        {
          "id": "L1",
          "text": "PT[451]"
        }
      ],
      "edgeColors": [
        {
          "from": "L2",
          "to": "L1",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "entry",
          "0x800000009F123007"
        ],
        [
          "memory reads",
          "4"
        ]
      ]
    },
    {
      "note": "Physical address = frame `0x9F123000` + offset `0xE48` = `0x9F123E48`. The page offset passes through translation unchanged.",
      "nodeColors": [
        {
          "id": "CR3",
          "color": "green"
        },
        {
          "id": "L4",
          "color": "green"
        },
        {
          "id": "L3",
          "color": "green"
        },
        {
          "id": "L2",
          "color": "green"
        },
        {
          "id": "L1",
          "color": "green"
        },
        {
          "id": "PA",
          "color": "orange"
        },
        {
          "id": "TLB",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CR3",
          "text": "0x1A000"
        },
        {
          "id": "L4",
          "text": "PML4[255]"
        },
        {
          "id": "L3",
          "text": "PDPT[502]"
        },
        {
          "id": "L2",
          "text": "PD[85]"
        },
        {
          "id": "L1",
          "text": "PT[451]"
        },
        {
          "id": "PA",
          "text": "0x9F123E48"
        }
      ],
      "edgeColors": [
        {
          "from": "L1",
          "to": "PA",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "PA",
          "0x9F123E48"
        ],
        [
          "memory reads",
          "4"
        ]
      ]
    },
    {
      "note": "The translation (page `0x7FFD8ABC3` → frame `0x9F123`, plus permissions) is stored in the **TLB**. Only now can the actual load go to the cache.",
      "nodeColors": [
        {
          "id": "TLB",
          "color": "green"
        },
        {
          "id": "PA",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "TLB",
          "text": "0x7FFD8ABC3 → 0x9F123"
        }
      ],
      "edgeColors": [
        {
          "from": "TLB",
          "to": "PA",
          "color": "green"
        }
      ],
      "vars": [
        [
          "memory reads",
          "4 (plus the load itself)"
        ]
      ]
    },
    {
      "note": "The next load, `0x7FFD8ABC3F00`, is in the same page: **TLB hit**. Frame + offset gives `0x9F123F00` in about a cycle, with no walk at all.",
      "nodeColors": [
        {
          "id": "TLB",
          "color": "green"
        },
        {
          "id": "PA",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "TLB",
          "text": "hit"
        },
        {
          "id": "PA",
          "text": "0x9F123F00"
        }
      ],
      "edgeColors": [
        {
          "from": "TLB",
          "to": "PA",
          "color": "green"
        }
      ],
      "vars": [
        [
          "VA",
          "0x7FFD8ABC3F00"
        ],
        [
          "memory reads",
          "0"
        ]
      ]
    }
  ],
  "caption": "A 4-level x86-64 page walk. L4…L1 are the PML4, PDPT, PD and PT tables; the note under each shows the entry read. Orange = the step in progress, green = done."
},
        {
          type: 'p',
          text: 'The same walk in C++, with a `std::map` standing in for physical memory. It also handles a 2 MiB huge-page entry and a missing entry:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <format>
#include <iostream>
#include <map>
#include <optional>

// Toy physical memory: 8-byte words keyed by physical address.
std::map<std::uint64_t, std::uint64_t> ram;

std::uint64_t read(std::uint64_t pa) {
    const auto it = ram.find(pa);
    return it == ram.end() ? 0 : it->second;  // unused = 0
}

constexpr std::uint64_t kPresent = 1ULL << 0;
constexpr std::uint64_t kWritable = 1ULL << 1;
constexpr std::uint64_t kUser = 1ULL << 2;
constexpr std::uint64_t kHuge = 1ULL << 7;      // "PS" bit
constexpr std::uint64_t kNoExec = 1ULL << 63;
constexpr std::uint64_t kFrame = 0x000F'FFFF'FFFF'F000;

// What the hardware page walker does on a TLB miss.
std::optional<std::uint64_t> walk(std::uint64_t cr3,
                                  std::uint64_t va) {
    const char* names[] = {"PML4", "PDPT", "PD", "PT"};
    std::uint64_t table = cr3 & kFrame;
    for (int level = 0; level < 4; ++level) {
        const int shift = 39 - 9 * level;
        const std::uint64_t index = (va >> shift) & 0x1FF;
        const std::uint64_t entry = read(table + index * 8);
        std::cout << std::format("  {:<4}[{:3}] = {:#x}\\n",
                                 names[level], index, entry);
        if (!(entry & kPresent)) return std::nullopt;  // fault
        if (level == 2 && (entry & kHuge)) {           // 2 MiB
            const std::uint64_t mask = (1ULL << 21) - 1;
            return (entry & kFrame & ~mask) | (va & mask);
        }
        table = entry & kFrame;
    }
    return table | (va & 0xFFF);
}

void translate(std::uint64_t cr3, std::uint64_t va) {
    std::cout << std::format("VA {:#x}\\n", va);
    if (const auto pa = walk(cr3, va)) {
        std::cout << std::format("  -> PA {:#x}\\n", *pa);
    } else {
        std::cout << "  -> not present: page fault\\n";
    }
}

int main() {
    const std::uint64_t flags = kPresent | kWritable | kUser;
    const std::uint64_t cr3 = 0x1A000;           // PML4 table
    ram[0x1A000 + 255 * 8] = 0x2B000 | flags;    // -> PDPT
    ram[0x2B000 + 502 * 8] = 0x3C000 | flags;    // -> PD
    ram[0x3C000 + 85 * 8] = 0x4D000 | flags;     // -> PT
    ram[0x4D000 + 451 * 8] = 0x9F123000 | flags | kNoExec;
    ram[0x3C000 + 86 * 8] = 0xC0200000 | flags | kHuge;

    translate(cr3, 0x7FFD'8ABC'3E48);   // 4 KiB page
    translate(cr3, 0x7FFD'8AC1'2345);   // inside the 2 MiB page
    translate(cr3, 0x7FFD'8B00'0000);   // nothing mapped here
}`,
          output: "VA 0x7ffd8abc3e48\n  PML4[255] = 0x2b007\n  PDPT[502] = 0x3c007\n  PD  [ 85] = 0x4d007\n  PT  [451] = 0x800000009f123007\n  -> PA 0x9f123e48\nVA 0x7ffd8ac12345\n  PML4[255] = 0x2b007\n  PDPT[502] = 0x3c007\n  PD  [ 86] = 0xc0200087\n  -> PA 0xc0212345\nVA 0x7ffd8b000000\n  PML4[255] = 0x2b007\n  PDPT[502] = 0x3c007\n  PD  [ 88] = 0x0\n  -> not present: page fault",
          annotations: [
            { lines: '15-20', text: 'Flag bits from the table above. `kFrame` masks bits 12..51, the physical address held in an entry.' },
            { lines: '27-30', text: 'One iteration per level: take 9 bits of the virtual address (bits 47..39 first) and read the 8-byte entry they select. Each `read` is a real memory access in hardware.' },
            { lines: 33, text: 'A non-present entry stops the walk. The hardware raises a page fault and the OS decides what to do: map the page, or kill the program for a bad pointer.' },
            { lines: '34-37', text: 'A PD entry with the PS bit maps a whole 2 MiB page: the walk ends one level early, and the low 21 bits of the address become the offset.' },
            { lines: '55-59', text: 'The OS builds these tables; the hardware only reads them (and sets the accessed and dirty bits).' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a tree instead of one big table?',
          text: 'A flat table with one 8-byte entry per 4 KiB page of a 48-bit address space would need 2³⁶ entries: 512 GiB, per process. But programs use a tiny, clustered fraction of their address space: some code, a heap, a few stacks. A tree only allocates the tables along the paths that are actually used, and a single absent entry near the root covers 512 GiB of unused space. The price is several dependent memory reads per translation, which the TLB exists to avoid.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'Suppose x86-64 used a single flat page table: one 8-byte entry for every 4 KiB page of the 48-bit virtual address space. How large would that table be, in GiB?',
      answer: 512,
      unit: 'GiB',
      hint: '48 − 12 = 36 bits of virtual page number.',
      explanation:
        'There are 2⁴⁸ / 2¹² = 2³⁶ pages, each needing 8 = 2³ bytes: 2³⁹ bytes = **512 GiB**, for every process, even one using a few megabytes. The 4-level tree instead costs one 4 KiB table per level along each used path: a small program needs only a handful of tables, a few tens of KiB in total.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The TLB: a cache for translations',
      blocks: [
        {
          type: 'p',
          text: 'A 4-level walk is four *dependent* memory reads before the actual load can even start. Doing that on every access would make every load several times slower. So the MMU caches recent translations in the **[[tlb|translation lookaside buffer (TLB)]]**: a small, fast cache whose "tag" is a virtual page number and whose "data" is the physical frame number plus permission bits.',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1600,
  "frames": [
    {
      "note": "A tiny fully associative TLB with 4 entries and LRU replacement. Toy 16-bit addresses: the top hex digit is the virtual page number (VPN), the other three are the 4 KiB page offset. Cells show VPN→frame.",
      "array": [
        "—",
        "—",
        "—",
        "—"
      ],
      "vars": [
        [
          "hits / misses",
          "0 / 0"
        ]
      ]
    },
    {
      "note": "`0x3010`: page 3 is not in the TLB: **miss**, walk the page table (frame A). PA = `0xA010`.",
      "array": [
        "3→A",
        "—",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "0x3010"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "3 · 0x010"
        ],
        [
          "LRU → MRU",
          "3"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`0x3FF8`: page 3 is in entry 0: **hit**. PA = `0xAFF8` without touching the page table.",
      "array": [
        "3→A",
        "—",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "0x3FF8"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "3 · 0xFF8"
        ],
        [
          "LRU → MRU",
          "3"
        ],
        [
          "hits / misses",
          "1 / 1"
        ]
      ]
    },
    {
      "note": "`0x4000`: page 4 is not in the TLB: **miss**, walk the page table (frame 2). PA = `0x2000`.",
      "array": [
        "3→A",
        "4→2",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "0x4000"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "4 · 0x000"
        ],
        [
          "LRU → MRU",
          "3 4"
        ],
        [
          "hits / misses",
          "1 / 2"
        ]
      ]
    },
    {
      "note": "`0x7A20`: page 7 is not in the TLB: **miss**, walk the page table (frame C). PA = `0xCA20`.",
      "array": [
        "3→A",
        "4→2",
        "7→C",
        "—"
      ],
      "marks": [
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "0x7A20"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "7 · 0xA20"
        ],
        [
          "LRU → MRU",
          "3 4 7"
        ],
        [
          "hits / misses",
          "1 / 3"
        ]
      ]
    },
    {
      "note": "`0x3100`: page 3 is in entry 0: **hit**. PA = `0xA100` without touching the page table.",
      "array": [
        "3→A",
        "4→2",
        "7→C",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "0x3100"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "3 · 0x100"
        ],
        [
          "LRU → MRU",
          "4 7 3"
        ],
        [
          "hits / misses",
          "2 / 3"
        ]
      ]
    },
    {
      "note": "`0x9000`: page 9 is not in the TLB: **miss**, walk the page table (frame 5). PA = `0x5000`.",
      "array": [
        "3→A",
        "4→2",
        "7→C",
        "9→5"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "0x9000"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "9 · 0x000"
        ],
        [
          "LRU → MRU",
          "4 7 3 9"
        ],
        [
          "hits / misses",
          "2 / 4"
        ]
      ]
    },
    {
      "note": "`0x1234`: page 1 is not in the TLB: **miss**, walk the page table (frame E). Page 4 was least recently used, so its entry is replaced. PA = `0xE234`.",
      "array": [
        "3→A",
        "1→E",
        "7→C",
        "9→5"
      ],
      "marks": [
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "0x1234"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "1 · 0x234"
        ],
        [
          "LRU → MRU",
          "7 3 9 1"
        ],
        [
          "hits / misses",
          "2 / 5"
        ]
      ]
    },
    {
      "note": "`0x4008`: page 4 is not in the TLB: **miss**, walk the page table (frame 2). Page 7 was least recently used, so its entry is replaced. PA = `0x2008`.",
      "array": [
        "3→A",
        "1→E",
        "4→2",
        "9→5"
      ],
      "marks": [
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "0x4008"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "4 · 0x008"
        ],
        [
          "LRU → MRU",
          "3 9 1 4"
        ],
        [
          "hits / misses",
          "2 / 6"
        ]
      ]
    },
    {
      "note": "`0x3ABC`: page 3 is in entry 0: **hit**. PA = `0xAABC` without touching the page table.",
      "array": [
        "3→A",
        "1→E",
        "4→2",
        "9→5"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "0x3ABC"
        }
      ],
      "vars": [
        [
          "VPN · offset",
          "3 · 0xABC"
        ],
        [
          "LRU → MRU",
          "9 1 4 3"
        ],
        [
          "hits / misses",
          "3 / 6"
        ]
      ]
    },
    {
      "note": "**3 hits, 6 misses**. Every access within an already-translated page hits; a real program touching a few hot pages gets hit rates above 99%.",
      "vars": [
        [
          "hits / misses",
          "3 / 6"
        ]
      ]
    }
  ],
  "caption": "TLB lookups over an access sequence. Green = hit, red = miss (followed by a page walk and a refill)."
},
        {
          type: 'table',
          headers: ['Structure', 'Typical size (varies by microarchitecture)'],
          rows: [
            ['L1 data TLB', '64–96 entries for 4 KiB pages, plus a few dozen for 2 MiB pages'],
            ['L1 instruction TLB', '64–256 entries'],
            ['L2 (shared, "STLB")', '1,500–3,000+ entries, for both 4 KiB and 2 MiB pages'],
            ['Paging-structure caches', 'Cache upper-level entries (PML4, PDPT, PD), so most walks need only one or two reads'],
          ],
        },
        {
          type: 'p',
          text: 'An L1 TLB hit costs nothing extra; an L2 TLB hit adds a handful of cycles. A full miss triggers a walk, whose reads go through the ordinary data caches: from a few tens of cycles when the entries are cached, to several hundred when they come from DRAM. The amount of memory a TLB can cover without misses is its **TLB reach**: entries × page size. With 1,536 entries of 4 KiB pages, that is only 6 MiB, less than many L3 caches.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Context switches and ASIDs',
          text: 'Every process has its own page table, so the same virtual page can mean different frames in different processes. Early CPUs flushed the TLB on every switch. Modern ones tag each TLB entry with an address-space identifier (**PCID** on x86, **ASID** on ARM), so entries from several processes coexist and a switch does not throw them all away. x86 walks page tables in hardware; some architectures, such as classic MIPS, raised an exception on a TLB miss and let the OS refill the TLB in software.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'An L2 TLB has 1,536 entries, each mapping one 4 KiB page. What is its TLB reach in MiB?',
      answer: 6,
      unit: 'MiB',
      hint: 'Reach = entries × page size.',
      explanation:
        '1,536 × 4 KiB = 6,144 KiB = **6 MiB**. A game whose hot data is spread over 100 MiB will miss in the TLB constantly, even if its caches are doing well. If the same entries mapped 2 MiB pages, the reach would be 1,536 × 2 MiB = 3 GiB, which is the main argument for huge pages.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Translating and caching at the same time',
      blocks: [
        {
          type: 'p',
          text: 'If the core had to finish translating before it could even start the L1 lookup, every load would pay TLB latency plus cache latency. L1 data caches avoid that with a trick called **virtually indexed, physically tagged (VIPT)**:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Index with untranslated bits', text: 'With 64 sets of 64-byte lines, the set index and offset are address bits 11..0, which lie inside the page offset. Those bits are identical in the virtual and the physical address, so the cache can select the set immediately.' },
            { title: 'Translate in parallel', text: 'At the same time, the TLB translates the virtual page number into a physical frame number.' },
            { title: 'Compare physical tags', text: 'The tags stored in the set are physical. By the time the set\'s 8 or 12 tags have been read out, the TLB has produced the frame number, and the comparison uses it.' },
          ],
        },
        {
          type: 'p',
          text: 'This only works while index + offset bits fit within the page offset: **sets × line size ≤ page size**, so each way can hold at most one page. With 4 KiB pages, an L1 can only grow by adding ways: 32 KiB = 8 ways × 4 KiB, 48 KiB = 12 ways × 4 KiB. That is the hidden reason behind the "32 KiB 8-way" and "48 KiB 12-way" numbers from the caches lesson. Apple\'s M-series cores use 16 KiB pages, which is part of how they afford a 128 KiB L1 data cache: 8 ways of 16 KiB.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just index with virtual bits beyond the page offset?',
          text: 'Two different virtual addresses can map to the same physical page (shared memory, or the same file mapped twice). If index bits came from the translated part, those **synonyms** could land in different sets, and the cache could hold two copies of one physical line that silently disagree after a write. Keeping the index within the page offset makes synonyms impossible by construction, at the cost of tying L1 geometry to the page size.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Intel grew the L1 data cache from 32 KiB (8-way) to 48 KiB (12-way) while keeping 64-byte lines and 4 KiB pages. Why add ways rather than sets?',
      options: [
        {
          text: 'More sets would need index bits above bit 11, breaking the overlap of the L1 lookup with TLB translation',
          correct: true,
          why: '64 sets × 64 bytes uses exactly bits 11..0, the page offset. A 128-set design would need bit 12, which changes during translation.',
        },
        {
          text: 'More ways always give a faster hit time than more sets',
          why: 'The opposite tends to be true: every extra way means another tag comparison and a wider selection of the result, which costs power and time.',
        },
        {
          text: 'The number of sets must equal the number of TLB entries',
          why: 'There is no such requirement; L1 TLBs and L1 caches have different sizes and organizations.',
        },
        {
          text: 'Larger L1 caches must be fully associative',
          why: 'Large fully associative caches are impractically slow and power hungry; 12 ways is still set-associative with 64 sets.',
        },
      ],
      explanation:
        'In a VIPT L1, the set index has to come from the page-offset bits so it can be computed before translation finishes. With 4 KiB pages, that caps sets × line size at 4 KiB. The only remaining knob for capacity is associativity, which is why the 48 KiB design is 12-way: more comparators per lookup, in exchange for keeping translation off the critical path.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Huge pages',
      blocks: [
        {
          type: 'p',
          text: 'Remember the PS bit: a PD entry can map a **2 MiB** page directly, and a PDPT entry can map a **1 GiB** page (the `pdpe1gb` flag in `lscpu` means the CPU supports it). These **[[huge-pages]]** change three things at once:',
        },
        {
          type: 'list',
          items: [
            '**TLB reach**: one entry covers 512× (or 262,144×) more memory, so a few hundred entries cover gigabytes.',
            '**Shorter walks**: a 2 MiB translation ends at the PD, one memory read earlier, and the page-table tree itself gets smaller and more cacheable.',
            '**Bigger offsets**: the low 21 bits (2 MiB) or 30 bits (1 GiB) of the address pass through untranslated.',
          ],
        },
        {
          type: 'code',
          lang: 'cpp',
          title: 'Requesting huge pages',
          code: `// Linux: transparent huge pages. Allocate 2 MiB-aligned
// memory and advise the kernel to back it with huge pages.
#include <sys/mman.h>
#include <cstdlib>

void* allocHeap(std::size_t bytes) {
    void* p = std::aligned_alloc(2 << 20, bytes);
    if (p) madvise(p, bytes, MADV_HUGEPAGE);
    return p;
}

// Windows: large pages need the "Lock pages in memory"
// privilege (SeLockMemoryPrivilege) granted to the user.
// void* p = VirtualAlloc(nullptr, bytes,
//     MEM_RESERVE | MEM_COMMIT | MEM_LARGE_PAGES,
//     PAGE_READWRITE);`,
          annotations: [
            { lines: 7, text: 'Huge pages must be aligned to their size. `bytes` must also be a multiple of the alignment for `std::aligned_alloc`.' },
            { lines: 8, text: '`madvise` is a request: the kernel uses huge pages if it can find free 2 MiB physical blocks, and may assemble them in the background. Whether THP is enabled at all is a system setting.' },
            { lines: '14-16', text: 'Windows allocates large pages up front and fails if the privilege or the physically contiguous memory is missing. The size must be a multiple of `GetLargePageMinimum()`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The costs of huge pages',
          text: 'A huge page is all or nothing: touching one byte commits 2 MiB of physical memory, so sparse data wastes memory. The OS needs physically contiguous free blocks, which fragmentation makes scarce on a long-running system, and assembling them (compaction) can cause latency spikes. Huge pages pay off for large, densely used, long-lived allocations: engine heaps, asset pools, big simulation grids, database buffers.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'With 2 MiB pages, how many low address bits form the page offset (and pass through translation unchanged)?',
      answer: 21,
      unit: 'bits',
      explanation:
        '2 MiB = 2²¹ bytes, so the offset is **21 bits**: the 12 bits of a normal page plus the 9 bits that would have been the PT index. That is exactly why a 2 MiB page is mapped by a PD entry: it skips the last level of the walk. A 1 GiB page skips two levels and has a 30-bit offset.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Why random access over huge data is slow',
      blocks: [
        {
          type: 'p',
          text: 'Put the whole unit together. A load from a random address in a multi-gigabyte data set will likely miss in every cache, but it may also miss in the TLB, triggering a page walk whose own reads may miss in the caches too. One `table[hash(key)]` can cost a page walk *plus* a DRAM access: several hundred nanoseconds when it all goes wrong. A model of a 1,536-entry TLB over 256 MiB of data shows how quickly the TLB stops helping:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <list>
#include <random>
#include <unordered_map>

// A fully associative TLB with LRU replacement.
class Tlb {
public:
    explicit Tlb(std::size_t entries) : capacity_{entries} {}

    void access(std::uint64_t page) {
        if (const auto it = where_.find(page); it != where_.end()) {
            lru_.splice(lru_.begin(), lru_, it->second);  // hit
            return;
        }
        ++misses;                                // miss: walk
        if (lru_.size() == capacity_) {
            where_.erase(lru_.back());
            lru_.pop_back();
        }
        lru_.push_front(page);
        where_[page] = lru_.begin();
    }

    std::uint64_t misses = 0;

private:
    std::size_t capacity_;
    std::list<std::uint64_t> lru_;               // front = newest
    std::unordered_map<std::uint64_t,
                       std::list<std::uint64_t>::iterator> where_;
};

int main() {
    const std::uint64_t bytes = 256ULL << 20;    // 256 MiB of data
    const std::uint64_t accesses = bytes / 64;   // 4 Mi loads
    std::mt19937_64 rng{1};

    for (const std::uint64_t pageSize : {4096ULL, 2ULL << 20}) {
        Tlb seq{1536}, rnd{1536};
        for (std::uint64_t i = 0; i < accesses; ++i) {
            seq.access(i * 64 / pageSize);            // in order
            rnd.access(rng() % bytes / pageSize);     // random
        }
        std::cout << (pageSize == 4096 ? "4 KiB pages: "
                                       : "2 MiB pages: ")
                  << bytes / pageSize << " pages, TLB misses "
                  << seq.misses << " sequential, " << rnd.misses
                  << " random\\n";
    }
}`,
          output: "4 KiB pages: 65536 pages, TLB misses 65536 sequential, 4096511 random\n2 MiB pages: 128 pages, TLB misses 128 sequential, 128 random",
          annotations: [
            { lines: '13-15', text: 'A hit moves the page to the front of the LRU list. `splice` relinks the node in O(1) without copying it.' },
            { lines: '17-23', text: 'A miss means a page walk in real hardware. The least recently used translation is evicted to make room.' },
            { lines: 38, text: '`std::mt19937_64`, like `std::mt19937`, produces exactly the same sequence on every standard library, so the counts are reproducible.' },
            { lines: '43-44', text: 'Both patterns perform 4 Mi loads, one per 64-byte line of the data.' },
          ],
        },
        {
          type: 'p',
          text: 'Sequential access misses once per page, then rides the TLB for 64 lines. Random access over 65,536 pages with room for 1,536 translations misses almost every time. With 2 MiB pages, all 128 translations fit and the TLB misses vanish, though the *cache* misses remain: huge pages fix translation, not locality.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Where games hit this',
          text: 'Big hash maps and spatial hashes, open-world streaming grids, navigation meshes, BVH traversal for ray casts, and sparse lookups into large asset tables all do random access over large data. The fixes are the ones from this unit applied at page scale: keep hot data dense so it spans fewer pages, sort or bucket queries by region so consecutive lookups hit the same pages (Morton order helps for 2D and 3D grids), and back large hot heaps with huge pages. In `perf`, the `dTLB-load-misses` event tells you whether translation is a real cost.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put the steps of an x86-64 load that misses in the TLB (4 KiB page, page present) in order.',
      lines: [
        'Look up the virtual page number in the TLB: miss',
        'Read the PML4 table base from CR3',
        'Read the PML4 entry using bits 47–39, then the PDPT entry using bits 38–30',
        'Read the PD entry using bits 29–21, then the PT entry using bits 20–12',
        'Combine the frame number with the 12-bit offset and insert the translation into the TLB',
        'Finish the load through the data cache with the physical address',
      ],
      linesAreCode: false,
      explanation:
        'Each level\'s entry holds the physical address of the next table, so the reads are strictly sequential: you cannot read the PD entry before knowing the PD\'s address. The walker then caches the result in the TLB, and the load completes with the physical tag. Paging-structure caches can skip the upper levels, but the order of whatever reads remain is the same.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'truefalse',
      prompt: 'A TLB miss means the page is not in physical memory, so it always causes a page fault handled by the operating system.',
      answer: false,
      explanation:
        'A TLB miss only means the *translation* is not cached. On x86-64 the hardware page walker then reads the page table and, if the entry is present, refills the TLB without the OS ever knowing: tens to hundreds of cycles. A **page fault** happens only if the walk finds a non-present entry or a permission violation; then the OS must act, which costs microseconds, or milliseconds if the page must come from disk. Confusing the two leads to wildly wrong performance estimates.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A spatial hash for 2 million physics bodies uses a 1.5 GB table, and lookups land on effectively random buckets. Perf shows high `dTLB-load-misses` and high LLC misses. Which change attacks **both** problems?',
      options: [
        {
          text: 'Back the table with 2 MiB huge pages',
          why: 'That collapses the TLB misses, but each lookup still touches a random line in 1.5 GB, so LLC misses barely change.',
        },
        {
          text: 'Process queries sorted by cell (for example in Morton order), so consecutive lookups touch nearby buckets',
          correct: true,
          why: 'Neighbouring queries now hit the same lines and the same pages, so both the cache and the TLB see locality instead of randomness.',
        },
        {
          text: 'Add `__builtin_prefetch` for the bucket of the current query just before reading it',
          why: 'A prefetch issued right before the load is too late to hide anything, and it does not reduce the number of lines or pages touched.',
        },
        {
          text: 'Use a bigger hash so collisions become rarer',
          why: 'Fewer collisions mean fewer probes per lookup, but each lookup is still random over even more memory, which makes the TLB and cache behaviour worse.',
        },
      ],
      explanation:
        'Huge pages fix translation but not locality; prefetching hides latency but does not remove it; a bigger table spreads the data even more thinly. Reordering the *work* so consecutive accesses are near each other improves every level of the hierarchy at once. In practice you might combine it with huge pages for the remaining random accesses.',
    },
  ],
  takeaways: [
    'Every address a C++ program sees is virtual; the MMU translates each access page by page, and the page offset passes through unchanged.',
    'x86-64 4-level paging splits a 48-bit address into four 9-bit indices and a 12-bit offset; each index selects one of 512 8-byte entries in a 4 KiB table, starting from CR3.',
    'The TLB caches translations; a miss costs a hardware page walk of up to four dependent reads, which is not a page fault.',
    'TLB reach = entries × page size: only a few MiB with 4 KiB pages.',
    'VIPT L1 caches index with page-offset bits so lookup overlaps translation, which is why L1s grow by adding ways.',
    '2 MiB and 1 GiB huge pages multiply TLB reach and shorten walks, at the cost of coarser allocation.',
    'Random access over huge data pays cache misses and TLB misses together; restore locality first, then consider huge pages.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 9, "Virtual Memory", walks through address translation, TLBs and the Core i7 page tables in detail.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Section 4 covers virtual memory, TLB behaviour and the measured cost of TLB misses.',
    },
    {
      title: 'Translation lookaside buffer',
      url: 'https://en.wikipedia.org/wiki/Translation_lookaside_buffer',
      source: 'article',
      note: 'TLB organizations, miss handling in hardware and software, and address-space identifiers.',
    },
    {
      title: 'Agner Fog: Software optimization resources',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The microarchitecture manual lists TLB sizes and page-walk behaviour for many Intel and AMD cores.',
    },
  ],
};
