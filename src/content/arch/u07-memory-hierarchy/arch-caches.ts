import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-caches',
  title: 'How Caches Work',
  summary:
    'Cache lines, splitting an address into tag, index and offset, direct-mapped vs set-associative designs, why misses happen, LRU replacement, write policies — and a working cache simulator in C++.',
  minutes: 22,
  objectives: [
    'Explain why caches move fixed-size lines and find the line an address falls in',
    'Split an address into tag, index and offset for any cache size, line size and associativity',
    'Compare direct-mapped, set-associative and fully associative caches and their trade-offs',
    'Classify misses as compulsory, capacity or conflict, and trace LRU replacement in a set',
    'Describe write-back vs write-through, write-allocate, and inclusive vs exclusive cache levels',
    'Read, run and modify a set-associative cache simulator written in C++',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Cache lines: the unit of transfer',
      blocks: [
        {
          type: 'p',
          text: 'A cache never holds "variables". It holds copies of fixed-size, aligned blocks of memory called **[[cache-line|cache lines]]**: 64 bytes on virtually every x86 CPU and most ARM cores. Line number *L* covers the bytes from `L × 64` to `L × 64 + 63`, so the line containing an address is simply `addr / 64`, and the byte within it is `addr % 64`.',
        },
        {
          type: 'p',
          text: 'Your objects do not care about those boundaries. Here is an array of 48-byte enemies that starts on a line boundary:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstddef>
#include <cstdint>
#include <iostream>

struct Enemy {
    float pos[3];               // bytes  0..11
    float vel[3];               // bytes 12..23
    std::int32_t health;        // bytes 24..27
    std::int32_t team;          // bytes 28..31
    double nextThink;           // bytes 32..39
    std::uint64_t flags;        // bytes 40..47
};

constexpr std::size_t kLine = 64;

int main() {
    std::cout << "sizeof(Enemy) = " << sizeof(Enemy) << '\\n';
    // An array of enemies that starts on a line boundary.
    for (std::size_t k = 0; k < 4; ++k) {
        const std::size_t first = k * sizeof(Enemy);
        const std::size_t last = first + sizeof(Enemy) - 1;
        std::cout << "enemies[" << k << "]: bytes " << first
                  << ".." << last << " -> lines " << first / kLine
                  << ".." << last / kLine << '\\n';
    }
    const std::size_t think = 1 * sizeof(Enemy)
                              + offsetof(Enemy, nextThink);
    std::cout << "enemies[1].nextThink is in line "
              << think / kLine << ", byte " << think % kLine << '\\n';
}`,
          output: "sizeof(Enemy) = 48\nenemies[0]: bytes 0..47 -> lines 0..0\nenemies[1]: bytes 48..95 -> lines 0..1\nenemies[2]: bytes 96..143 -> lines 1..2\nenemies[3]: bytes 144..191 -> lines 2..2\nenemies[1].nextThink is in line 1, byte 16",
          annotations: [
            { lines: '5-12', text: 'Six 4-byte fields, then two 8-byte ones: 48 bytes with no padding. The comments give each field\'s byte offset.' },
            { lines: 14, text: 'The line size. Standard C++17 exposes a portable hint for it in `<new>`; the multicore unit uses it.' },
            { lines: '19-24', text: 'Only offsets are used, never real addresses, so the output is deterministic. A real array is placed wherever the allocator puts it.' },
            { lines: '26-27', text: '`offsetof` gives a field\'s byte offset within its struct.' },
          ],
        },
        {
          type: 'p',
          text: 'Four enemies fill exactly three lines, but `enemies[1]` and `enemies[2]` each **straddle** two lines: touching all of `enemies[1]` costs two line fetches. Layout decisions like this are the subject of the next lesson.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why move 64 bytes when you asked for 4?',
          text: 'Three reasons. **Spatial locality**: neighbours are likely to be needed next, and fetching them now is nearly free. **Bookkeeping**: every cached block needs a tag and status bits; one tag per 64 bytes is cheap, one tag per byte would cost more than the data. **DRAM bursts**: memory delivers data in bursts once a row is open. A DDR4 channel is 64 bits wide with a burst length of 8, and a DDR5 sub-channel is 32 bits wide with a burst length of 16: both deliver exactly 64 bytes per burst. Lines that are too large waste bandwidth on bytes nobody uses and evict useful data sooner; 64 bytes is the long-standing sweet spot.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'A `float` array of 1000 elements starts exactly on a 64-byte boundary. How many distinct cache lines does a loop over the whole array touch?',
      answer: 63,
      unit: 'lines',
      hint: 'Count the bytes first, then divide by the line size and think about the last, partly used line.',
      explanation:
        '1000 floats × 4 bytes = 4000 bytes. 4000 / 64 = 62.5, so the array fills 62 lines completely and half of a 63rd: **63 lines**. If the array did *not* start on a line boundary, it could touch 64 lines, which is one reason allocators and `alignas(64)` matter for hot data.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Direct-mapped: tag, index and offset',
      blocks: [
        {
          type: 'p',
          text: 'When the core issues a load, the cache must decide **in about a nanosecond** whether it holds that line and where. It cannot search through thousands of lines, so it restricts where each line may live. The simplest scheme is a **direct-mapped** cache: every memory line has exactly one slot, chosen by its line number modulo the number of slots.',
        },
        {
          type: 'p',
          text: 'With power-of-two sizes, that modulo is just a group of address bits. The address splits into three fields:',
        },
        {
          type: 'list',
          items: [
            '**Offset** (low bits): which byte within the line. log₂(line size) bits; 6 bits for 64-byte lines.',
            '**Index** (middle bits): which slot, or **set**, to look in. log₂(number of sets) bits.',
            '**Tag** (all remaining high bits): stored next to the line, because many memory lines share each set. A hit requires the stored tag to equal the address\'s tag and the line\'s **valid** bit to be set.',
          ],
        },
        {
          type: 'p',
          text: 'Watch a tiny direct-mapped cache: 4 sets of one 16-byte line each, with 8-bit addresses. Each address is shown split as `tag index offset`:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1700,
  "frames": [
    {
      "note": "An empty direct-mapped cache: 4 sets × 1 way × 16-byte lines = 64 bytes. Addresses are 8 bits: **2 tag · 2 index · 4 offset**. Cells show the stored tag.",
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
      "note": "`0x04`: set 0, tag `00` not found → **compulsory miss** (first touch of this line). Line fetched.",
      "array": [
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x04 = 00 00 0100"
        ],
        [
          "tag · index · offset",
          "00 · 0 · 4"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`0x0C`: index 0 selects set 0; tag `00` matches → **hit**. The offset 12 picks byte 12 of the line.",
      "array": [
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x0C = 00 00 1100"
        ],
        [
          "tag · index · offset",
          "00 · 0 · 12"
        ],
        [
          "hits / misses",
          "1 / 1"
        ]
      ]
    },
    {
      "note": "`0x14`: set 1, tag `00` not found → **compulsory miss** (first touch of this line). Line fetched.",
      "array": [
        "00",
        "00",
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
          "label": "set 1"
        }
      ],
      "vars": [
        [
          "address",
          "0x14 = 00 01 0100"
        ],
        [
          "tag · index · offset",
          "00 · 1 · 4"
        ],
        [
          "hits / misses",
          "1 / 2"
        ]
      ]
    },
    {
      "note": "`0x44`: set 0, tag `01` not found → **compulsory miss** (first touch of this line). Line fetched, evicting tag `00`.",
      "array": [
        "01",
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x44 = 01 00 0100"
        ],
        [
          "tag · index · offset",
          "01 · 0 · 4"
        ],
        [
          "hits / misses",
          "1 / 3"
        ]
      ]
    },
    {
      "note": "`0x08`: set 0, tag `00` not found → **conflict miss** (this line was here before and got evicted although other sets have room). Line fetched, evicting tag `01`.",
      "array": [
        "00",
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x08 = 00 00 1000"
        ],
        [
          "tag · index · offset",
          "00 · 0 · 8"
        ],
        [
          "hits / misses",
          "1 / 4"
        ]
      ]
    },
    {
      "note": "`0x48`: set 0, tag `01` not found → **conflict miss** (this line was here before and got evicted although other sets have room). Line fetched, evicting tag `00`.",
      "array": [
        "01",
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x48 = 01 00 1000"
        ],
        [
          "tag · index · offset",
          "01 · 0 · 8"
        ],
        [
          "hits / misses",
          "1 / 5"
        ]
      ]
    },
    {
      "note": "`0x18`: index 1 selects set 1; tag `00` matches → **hit**. The offset 8 picks byte 8 of the line.",
      "array": [
        "01",
        "00",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "set 1"
        }
      ],
      "vars": [
        [
          "address",
          "0x18 = 00 01 1000"
        ],
        [
          "tag · index · offset",
          "00 · 1 · 8"
        ],
        [
          "hits / misses",
          "2 / 5"
        ]
      ]
    },
    {
      "note": "`0x0C`: set 0, tag `00` not found → **conflict miss** (this line was here before and got evicted although other sets have room). Line fetched, evicting tag `01`.",
      "array": [
        "00",
        "00",
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
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x0C = 00 00 1100"
        ],
        [
          "tag · index · offset",
          "00 · 0 · 12"
        ],
        [
          "hits / misses",
          "2 / 6"
        ]
      ]
    },
    {
      "note": "Done: **2 hits, 6 misses**. Sets 2 and 3 never held anything, yet `0x0_` and `0x4_` kept evicting each other because both map to set 0.",
      "vars": [
        [
          "hits / misses",
          "2 / 6"
        ]
      ],
      "marks": [
        {
          "index": 0,
          "color": "red"
        },
        {
          "index": 2,
          "color": "gray"
        },
        {
          "index": 3,
          "color": "gray"
        }
      ]
    }
  ],
  "caption": "A direct-mapped cache with 4 one-line sets. The access sequence is `0x04 0x0C 0x14 0x44 0x08 0x48 0x18 0x0C`. Green = hit, red = miss."
},
        {
          type: 'p',
          text: 'Addresses `0x04` and `0x44` differ only in their tag bits, so they always fight over set 0. Misses caused by that kind of collision, while other sets sit empty, are **conflict misses**, the weakness of direct mapping.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why take the index from the middle bits?',
          text: 'Because consecutive lines then map to consecutive sets: an array walked in order spreads evenly across the whole cache. If the index came from the *high* bits, an entire contiguous array would land in a single set and evict itself constantly. The offset must be the lowest bits by definition, so the index takes the bits just above it, and whatever is left over is the tag. The tag never needs to store the index: a line\'s position in the cache already tells you its index.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'A direct-mapped cache holds 64 KiB of data in 64-byte lines. How many address bits form the index?',
      answer: 10,
      unit: 'bits',
      hint: 'In a direct-mapped cache, every line is its own set.',
      explanation:
        '64 KiB / 64 B = 1024 lines. Direct-mapped means one line per set, so there are 1024 sets and the index needs log₂ 1024 = **10 bits**. The offset takes the 6 bits below it (64 = 2⁶), so the index is address bits 15..6, and everything above bit 15 is the tag.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Set-associative and fully associative caches',
      blocks: [
        {
          type: 'p',
          text: 'The fix for conflict misses is to give each set room for several lines, called **ways**. In an **N-way [[set-associative-cache]]**, the index selects a set, and the line may live in any of that set\'s N ways. The hardware reads all N tags of the set at once and compares them in parallel:',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 346" xmlns="http://www.w3.org/2000/svg"><rect x="150" y="18" width="140" height="30" rx="3" class="f-blue" fill-opacity="0.16"/><rect x="150" y="18" width="140" height="30" rx="3" fill="none" class="s-blue" stroke-width="1.6"/><text x="220" y="38" font-size="13" text-anchor="middle" class="t-blue" font-weight="700">tag</text><rect x="290" y="18" width="60" height="30" rx="3" class="f-orange" fill-opacity="0.16"/><rect x="290" y="18" width="60" height="30" rx="3" fill="none" class="s-orange" stroke-width="1.6"/><text x="320" y="38" font-size="13" text-anchor="middle" class="t-orange" font-weight="700">index</text><rect x="350" y="18" width="60" height="30" rx="3" class="f-green" fill-opacity="0.16"/><rect x="350" y="18" width="60" height="30" rx="3" fill="none" class="s-green" stroke-width="1.6"/><text x="380" y="38" font-size="13" text-anchor="middle" class="t-green" font-weight="700">offset</text><text x="140" y="38" font-size="12" text-anchor="end">address:</text><text x="162" y="84" font-size="12" text-anchor="middle" font-weight="600">way 0</text><text x="382" y="84" font-size="12" text-anchor="middle" font-weight="600">way 1</text><text x="54" y="112" font-size="11.5" text-anchor="end">set 0</text><rect x="62" y="92" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="80" y1="92" x2="80" y2="122" class="s-gray" stroke-width="0.8"/><text x="71" y="111" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="98" y1="92" x2="98" y2="122" class="s-gray" stroke-width="0.8"/><text x="89" y="111" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="152" y1="92" x2="152" y2="122" class="s-gray" stroke-width="0.8"/><text x="125" y="111" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="207" y="111" font-size="11" text-anchor="middle">data: 64 bytes</text><rect x="282" y="92" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="300" y1="92" x2="300" y2="122" class="s-gray" stroke-width="0.8"/><text x="291" y="111" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="318" y1="92" x2="318" y2="122" class="s-gray" stroke-width="0.8"/><text x="309" y="111" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="372" y1="92" x2="372" y2="122" class="s-gray" stroke-width="0.8"/><text x="345" y="111" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="427" y="111" font-size="11" text-anchor="middle">data: 64 bytes</text><text x="54" y="142" font-size="11.5" text-anchor="end">set 1</text><rect x="62" y="122" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="80" y1="122" x2="80" y2="152" class="s-gray" stroke-width="0.8"/><text x="71" y="141" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="98" y1="122" x2="98" y2="152" class="s-gray" stroke-width="0.8"/><text x="89" y="141" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="152" y1="122" x2="152" y2="152" class="s-gray" stroke-width="0.8"/><text x="125" y="141" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="207" y="141" font-size="11" text-anchor="middle">data: 64 bytes</text><rect x="282" y="122" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="300" y1="122" x2="300" y2="152" class="s-gray" stroke-width="0.8"/><text x="291" y="141" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="318" y1="122" x2="318" y2="152" class="s-gray" stroke-width="0.8"/><text x="309" y="141" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="372" y1="122" x2="372" y2="152" class="s-gray" stroke-width="0.8"/><text x="345" y="141" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="427" y="141" font-size="11" text-anchor="middle">data: 64 bytes</text><text x="54" y="172" font-size="11.5" text-anchor="end" class="t-orange">set 2</text><rect x="62" y="152" width="200" height="30" rx="0" class="f-orange" fill-opacity="0.1"/><rect x="62" y="152" width="200" height="30" rx="0" fill="none" class="s-orange" stroke-width="1.6"/><line x1="80" y1="152" x2="80" y2="182" class="s-gray" stroke-width="0.8"/><text x="71" y="171" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="98" y1="152" x2="98" y2="182" class="s-gray" stroke-width="0.8"/><text x="89" y="171" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="152" y1="152" x2="152" y2="182" class="s-gray" stroke-width="0.8"/><text x="125" y="171" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="207" y="171" font-size="11" text-anchor="middle">data: 64 bytes</text><rect x="282" y="152" width="200" height="30" rx="0" class="f-orange" fill-opacity="0.1"/><rect x="282" y="152" width="200" height="30" rx="0" fill="none" class="s-orange" stroke-width="1.6"/><line x1="300" y1="152" x2="300" y2="182" class="s-gray" stroke-width="0.8"/><text x="291" y="171" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="318" y1="152" x2="318" y2="182" class="s-gray" stroke-width="0.8"/><text x="309" y="171" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="372" y1="152" x2="372" y2="182" class="s-gray" stroke-width="0.8"/><text x="345" y="171" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="427" y="171" font-size="11" text-anchor="middle">data: 64 bytes</text><text x="54" y="202" font-size="11.5" text-anchor="end">set 3</text><rect x="62" y="182" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="80" y1="182" x2="80" y2="212" class="s-gray" stroke-width="0.8"/><text x="71" y="201" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="98" y1="182" x2="98" y2="212" class="s-gray" stroke-width="0.8"/><text x="89" y="201" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="152" y1="182" x2="152" y2="212" class="s-gray" stroke-width="0.8"/><text x="125" y="201" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="207" y="201" font-size="11" text-anchor="middle">data: 64 bytes</text><rect x="282" y="182" width="200" height="30" rx="0" fill="none" class="s-gray" stroke-width="1"/><line x1="300" y1="182" x2="300" y2="212" class="s-gray" stroke-width="0.8"/><text x="291" y="201" font-size="10.5" text-anchor="middle" class="t-gray">V</text><line x1="318" y1="182" x2="318" y2="212" class="s-gray" stroke-width="0.8"/><text x="309" y="201" font-size="10.5" text-anchor="middle" class="t-gray">D</text><line x1="372" y1="182" x2="372" y2="212" class="s-gray" stroke-width="0.8"/><text x="345" y="201" font-size="11" text-anchor="middle" class="t-blue">tag</text><text x="427" y="201" font-size="11" text-anchor="middle">data: 64 bytes</text><line x1="320" y1="48" x2="320" y2="64" class="s-orange" stroke-width="1.8"/><line x1="320" y1="64" x2="6" y2="64" class="s-orange" stroke-width="1.8"/><line x1="6" y1="64" x2="6" y2="167" class="s-orange" stroke-width="1.8"/><line x1="6" y1="167" x2="10" y2="167" class="s-orange" stroke-width="1.8"/><path d="M17 167 L10 171 L10 163 Z" class="f-orange"/><line x1="144" y1="182" x2="144" y2="241" class="s-blue" stroke-width="1.6"/><path d="M144 249 L140 241 L148 241 Z" class="f-blue"/><circle cx="144" cy="262" r="12" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="144" y="267" font-size="15" text-anchor="middle" font-weight="700">=</text><line x1="364" y1="182" x2="364" y2="241" class="s-blue" stroke-width="1.6"/><path d="M364 249 L360 241 L368 241 Z" class="f-blue"/><circle cx="364" cy="262" r="12" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="364" y="267" font-size="15" text-anchor="middle" font-weight="700">=</text><line x1="220" y1="18" x2="220" y2="8" class="s-blue" stroke-width="1.8"/><line x1="220" y1="8" x2="506" y2="8" class="s-blue" stroke-width="1.8"/><line x1="506" y1="8" x2="506" y2="292" class="s-blue" stroke-width="1.8"/><line x1="506" y1="292" x2="144" y2="292" class="s-blue" stroke-width="1.8"/><line x1="144" y1="292" x2="144" y2="281" class="s-blue" stroke-width="1.6"/><path d="M144 275 L148 281 L140 281 Z" class="f-blue"/><line x1="364" y1="292" x2="364" y2="281" class="s-blue" stroke-width="1.6"/><path d="M364 275 L368 281 L360 281 Z" class="f-blue"/><text x="162" y="266" font-size="11" text-anchor="start">match? (and V = 1)</text><text x="382" y="266" font-size="11" text-anchor="start">match? (and V = 1)</text><text x="260" y="318" font-size="12" text-anchor="middle" font-weight="600">Any match → hit: that way’s data is selected, and the offset picks the bytes.</text><text x="260" y="336" font-size="12" text-anchor="middle" class="t-gray">No match → miss: fetch the line, evict a way chosen by the replacement policy.</text></svg>`,
          alt: 'A 2-way set-associative cache with 4 sets. Each entry has valid and dirty bits, a tag and 64 bytes of data. The address index field selects set 2; the tags of both ways in that set are compared with the address tag.',
          caption: 'One lookup: the index selects a set, and one comparator per way checks its tag at the same time.',
        },
        {
          type: 'p',
          text: 'Same 64-byte toy cache and same address sequence as before, now organized as 2 sets × 2 ways:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1700,
  "frames": [
    {
      "note": "The **same 64 bytes** organized as 2 sets × 2 ways. Cells 0–1 are set 0 (way 0, way 1); cells 2–3 are set 1. Addresses split as **3 tag · 1 index · 4 offset**.",
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
      "note": "`0x04`: set 0, tag `000` not found → **compulsory miss** (first touch of this line). Line fetched into way 0.",
      "array": [
        "000",
        "—",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x04 = 000 0 0100"
        ],
        [
          "tag · index · offset",
          "000 · 0 · 4"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`0x0C`: index 0 selects set 0; tag `000` matches → **hit**. The offset 12 picks byte 12 of the line.",
      "array": [
        "000",
        "—",
        "—",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x0C = 000 0 1100"
        ],
        [
          "tag · index · offset",
          "000 · 0 · 12"
        ],
        [
          "hits / misses",
          "1 / 1"
        ]
      ]
    },
    {
      "note": "`0x14`: set 1, tag `000` not found → **compulsory miss** (first touch of this line). Line fetched into way 0.",
      "array": [
        "000",
        "—",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "set 1"
        }
      ],
      "vars": [
        [
          "address",
          "0x14 = 000 1 0100"
        ],
        [
          "tag · index · offset",
          "000 · 1 · 4"
        ],
        [
          "hits / misses",
          "1 / 2"
        ]
      ]
    },
    {
      "note": "`0x44`: set 0, tag `010` not found → **compulsory miss** (first touch of this line). Line fetched into way 1.",
      "array": [
        "000",
        "010",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x44 = 010 0 0100"
        ],
        [
          "tag · index · offset",
          "010 · 0 · 4"
        ],
        [
          "hits / misses",
          "1 / 3"
        ]
      ]
    },
    {
      "note": "`0x08`: index 0 selects set 0; tag `000` matches → **hit**. The offset 8 picks byte 8 of the line.",
      "array": [
        "000",
        "010",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x08 = 000 0 1000"
        ],
        [
          "tag · index · offset",
          "000 · 0 · 8"
        ],
        [
          "hits / misses",
          "2 / 3"
        ]
      ]
    },
    {
      "note": "`0x48`: index 0 selects set 0; tag `010` matches → **hit**. The offset 8 picks byte 8 of the line.",
      "array": [
        "000",
        "010",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x48 = 010 0 1000"
        ],
        [
          "tag · index · offset",
          "010 · 0 · 8"
        ],
        [
          "hits / misses",
          "3 / 3"
        ]
      ]
    },
    {
      "note": "`0x18`: index 1 selects set 1; tag `000` matches → **hit**. The offset 8 picks byte 8 of the line.",
      "array": [
        "000",
        "010",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "set 1"
        }
      ],
      "vars": [
        [
          "address",
          "0x18 = 000 1 1000"
        ],
        [
          "tag · index · offset",
          "000 · 1 · 8"
        ],
        [
          "hits / misses",
          "4 / 3"
        ]
      ]
    },
    {
      "note": "`0x0C`: index 0 selects set 0; tag `000` matches → **hit**. The offset 12 picks byte 12 of the line.",
      "array": [
        "000",
        "010",
        "000",
        "—"
      ],
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "set 0"
        }
      ],
      "vars": [
        [
          "address",
          "0x0C = 000 0 1100"
        ],
        [
          "tag · index · offset",
          "000 · 0 · 12"
        ],
        [
          "hits / misses",
          "5 / 3"
        ]
      ]
    },
    {
      "note": "Done: **5 hits, 3 misses**, versus 2 hits and 6 misses direct-mapped. Two ways let `0x0_` and `0x4_` live in set 0 side by side.",
      "vars": [
        [
          "hits / misses",
          "5 / 3"
        ]
      ]
    }
  ],
  "caption": "The same sequence on a 2-way set-associative cache of the same size. Blue = the other way of the selected set."
},
        {
          type: 'p',
          text: 'The two extremes are special cases. **Direct-mapped** is 1-way: one comparator, fastest and cheapest, most conflicts. **Fully associative** is a single set containing every line: any line can go anywhere, so there are no conflict misses, but every lookup compares against every tag. That is affordable only for small structures, such as TLBs with a few dozen entries.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 250" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="40" width="300" height="40" rx="4" class="f-blue" fill-opacity="0.16"/><rect x="30" y="40" width="300" height="40" rx="4" fill="none" class="s-blue" stroke-width="1.6"/><text x="180" y="58" font-size="14" text-anchor="middle" class="t-blue" font-weight="700">tag</text><text x="180" y="73" font-size="11.5" text-anchor="middle">36 bits</text><text x="180" y="32" font-size="11" text-anchor="middle" class="t-gray">bits 47–12</text><rect x="330" y="40" width="80" height="40" rx="4" class="f-orange" fill-opacity="0.16"/><rect x="330" y="40" width="80" height="40" rx="4" fill="none" class="s-orange" stroke-width="1.6"/><text x="370" y="58" font-size="14" text-anchor="middle" class="t-orange" font-weight="700">index</text><text x="370" y="73" font-size="11.5" text-anchor="middle">6 bits</text><text x="370" y="32" font-size="11" text-anchor="middle" class="t-gray">bits 11–6</text><rect x="410" y="40" width="80" height="40" rx="4" class="f-green" fill-opacity="0.16"/><rect x="410" y="40" width="80" height="40" rx="4" fill="none" class="s-green" stroke-width="1.6"/><text x="450" y="58" font-size="14" text-anchor="middle" class="t-green" font-weight="700">offset</text><text x="450" y="73" font-size="11.5" text-anchor="middle">6 bits</text><text x="450" y="32" font-size="11" text-anchor="middle" class="t-gray">bits 5–0</text><line x1="180" y1="82" x2="180" y2="122" class="s-blue" stroke-width="1.8"/><path d="M180 130 L176 122 L184 122 Z" class="f-blue"/><line x1="370" y1="82" x2="370" y2="96" class="s-orange" stroke-width="1.8"/><path d="M370 104 L366 96 L374 96 Z" class="f-orange"/><line x1="450" y1="82" x2="450" y2="152" class="s-green" stroke-width="1.8"/><path d="M450 160 L446 152 L454 152 Z" class="f-green"/><text x="395" y="118" font-size="12" text-anchor="end" class="t-orange">index → selects 1 of 64 sets</text><text x="490" y="176" font-size="12" text-anchor="end" class="t-green">offset → byte 0–63 within the line</text><text x="30" y="146" font-size="12" text-anchor="start" class="t-blue">tag → compared with the 8 tags in that set</text><line x1="30" y1="196" x2="490" y2="196" class="s-gray" stroke-width="0.8"/><text x="30" y="218" font-size="12.5" text-anchor="start">32 KiB ÷ (64 B per line × 8 ways) = 64 sets</text><text x="30" y="238" font-size="12" text-anchor="start" class="t-gray">offset = log₂ 64 = 6 bits · index = log₂ 64 = 6 bits · tag = 48 − 6 − 6 = 36 bits</text></svg>`,
          alt: 'A 48-bit address split into a 36-bit tag (bits 47 to 12), a 6-bit index (bits 11 to 6) and a 6-bit offset (bits 5 to 0), for a 32 KiB, 8-way cache with 64-byte lines.',
          caption: 'The general recipe: sets = size ÷ (line size × ways); offset = log₂ line size; index = log₂ sets; tag = everything else.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <bit>
#include <cstdint>
#include <format>
#include <iostream>

// An L1 data cache: 32 KiB, 8-way, 64-byte lines.
constexpr std::uint64_t kLine = 64;
constexpr std::uint64_t kWays = 8;
constexpr std::uint64_t kSize = 32 * 1024;
constexpr std::uint64_t kSets = kSize / (kLine * kWays);
constexpr int kOffsetBits = std::countr_zero(kLine);
constexpr int kIndexBits = std::countr_zero(kSets);

struct Split {
    std::uint64_t tag, index, offset;
};

constexpr Split split(std::uint64_t addr) {
    return {addr >> (kOffsetBits + kIndexBits),
            (addr >> kOffsetBits) & (kSets - 1),
            addr & (kLine - 1)};
}

int main() {
    std::cout << std::format("{} sets: {} offset bits, {} index bits\\n",
                             kSets, kOffsetBits, kIndexBits);
    for (std::uint64_t a : {0x7ffd'1234'5660ULL, 0x7ffd'1234'5678ULL,
                            0x7ffd'1234'5680ULL, 0x7ffd'1234'6678ULL}) {
        const auto [tag, index, offset] = split(a);
        std::cout << std::format("{:#x}: tag {:#x}, set {:2}, "
                                 "offset {:2}\\n",
                                 a, tag, index, offset);
    }
}`,
          output: "64 sets: 6 offset bits, 6 index bits\n0x7ffd12345660: tag 0x7ffd12345, set 25, offset 32\n0x7ffd12345678: tag 0x7ffd12345, set 25, offset 56\n0x7ffd12345680: tag 0x7ffd12345, set 26, offset  0\n0x7ffd12346678: tag 0x7ffd12346, set 25, offset 56",
          annotations: [
            { lines: '7-12', text: 'The geometry as compile-time constants. `std::countr_zero` from `<bit>` counts trailing zero bits, which is log₂ for a power of two: 64 → 6.' },
            { lines: '19-21', text: 'Shifts and masks, exactly what the hardware does with wires. `kSets - 1` is a mask of the low 6 bits because `kSets` is a power of two.' },
            { lines: '27-28', text: 'Two addresses in the same line, the next line, and an address exactly 4 KiB (0x1000) further on.' },
          ],
        },
        {
          type: 'p',
          text: 'The first two addresses share a line. The last one is 4096 bytes away and lands in the **same set** with a different tag: in this cache, addresses that differ by a multiple of 4 KiB always compete for the same 8 ways. Remember that; it explains a nasty performance cliff in the next lesson.',
        },
        {
          type: 'table',
          headers: ['Cache', 'Typical organization (varies by CPU)'],
          rows: [
            ['L1 data', '32 KiB 8-way or 48 KiB 12-way, 64-byte lines, 64 sets'],
            ['L2', '0.5–2 MiB, 8–16 ways'],
            ['L3 (shared)', 'Split into slices per core or cluster, 11–16+ ways each'],
            ['TLBs', 'Small ones fully associative; larger ones 4–12-way'],
          ],
        },
        {
          type: 'deepdive',
          title: 'Why so many L1s are 32 KiB × 8 or 48 KiB × 12',
          blocks: [
            {
              type: 'p',
              text: 'Both work out to 4 KiB per way, and 64 sets × 64 bytes = 4096: the index and offset together use only address bits 11..0. Those are exactly the bits that stay the same when a virtual address is translated to a physical one with 4 KiB pages. So the L1 can start selecting the set **in parallel with** address translation and only needs the translated bits for the tag compare. To grow L1 without breaking that trick, designers add ways rather than sets. The address translation lesson at the end of this unit explains the details.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'An L2 cache holds 1 MiB in 64-byte lines and is 16-way set-associative. Physical addresses are 48 bits. How many bits wide is the tag?',
      answer: 32,
      unit: 'bits',
      hint: 'First find the number of sets: size ÷ (line size × ways).',
      explanation:
        'Sets = 2²⁰ / (2⁶ × 2⁴) = 2¹⁰ = 1024, so the index is 10 bits. The offset is 6 bits (64 = 2⁶). The tag is the rest: 48 − 10 − 6 = **32 bits**. Notice that doubling the associativity (with the same size) halves the sets, removes one index bit and adds one tag bit: more ways means more and wider tags to compare.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Why misses happen, and who gets evicted',
      blocks: [
        {
          type: 'p',
          text: 'Mark Hill\'s classic classification sorts every miss into one of the **[[three-cs-misses|three Cs]]**:',
        },
        {
          type: 'table',
          headers: ['Kind', 'Cause', 'What reduces it'],
          rows: [
            ['**Compulsory** (cold)', 'First access to a line ever: it cannot already be cached', 'Larger lines, prefetching, touching less data'],
            ['**Capacity**', 'The working set is larger than the cache; lines are evicted before reuse even with perfect placement', 'A bigger cache, or restructuring code to reuse data sooner (tiling)'],
            ['**Conflict**', 'Too many hot lines map to the same set, though the cache as a whole has room', 'More ways, or changing strides and alignment'],
          ],
        },
        {
          type: 'p',
          text: 'A practical test: a miss that would also happen in a fully associative cache of the same size is a capacity miss; one that only happens because of the set mapping is a conflict miss. Multicore systems add a fourth C, **coherence** misses, caused by another core writing the line; that is the next unit.',
        },
        {
          type: 'p',
          text: 'When a miss arrives at a full set, the cache must evict one way. The textbook policy is **[[lru|least recently used]] (LRU)**: evict the line whose last use is oldest, betting on temporal locality. Here is LRU inside a single 4-way set:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1500,
  "frames": [
    {
      "note": "One set of a 4-way cache, empty. Letters stand for tags of different lines that all map to this set.",
      "array": [
        "—",
        "—",
        "—",
        "—"
      ],
      "vars": [
        [
          "LRU → MRU",
          "(empty)"
        ],
        [
          "hits / misses",
          "0 / 0"
        ]
      ]
    },
    {
      "note": "`A` misses; way 0 is still empty, so it goes there.",
      "array": [
        "A",
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
          "label": "A"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "A"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`B` misses; way 1 is still empty, so it goes there.",
      "array": [
        "A",
        "B",
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
          "label": "B"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "A B"
        ],
        [
          "hits / misses",
          "0 / 2"
        ]
      ]
    },
    {
      "note": "`C` misses; way 2 is still empty, so it goes there.",
      "array": [
        "A",
        "B",
        "C",
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
          "label": "C"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "A B C"
        ],
        [
          "hits / misses",
          "0 / 3"
        ]
      ]
    },
    {
      "note": "`A` is in way 0: **hit**. It becomes the most recently used.",
      "array": [
        "A",
        "B",
        "C",
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
          "label": "A"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "B C A"
        ],
        [
          "hits / misses",
          "1 / 3"
        ]
      ]
    },
    {
      "note": "`D` misses; way 3 is still empty, so it goes there.",
      "array": [
        "A",
        "B",
        "C",
        "D"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        },
        {
          "index": 1,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "D"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "B C A D"
        ],
        [
          "hits / misses",
          "1 / 4"
        ]
      ]
    },
    {
      "note": "`E` misses and the set is full. The least recently used line is `B` (way 1), so `E` replaces it.",
      "array": [
        "A",
        "E",
        "C",
        "D"
      ],
      "marks": [
        {
          "index": 1,
          "color": "red"
        },
        {
          "index": 2,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "E"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "C A D E"
        ],
        [
          "hits / misses",
          "1 / 5"
        ]
      ]
    },
    {
      "note": "`A` is in way 0: **hit**. It becomes the most recently used.",
      "array": [
        "A",
        "E",
        "C",
        "D"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        },
        {
          "index": 2,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "A"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "C D E A"
        ],
        [
          "hits / misses",
          "2 / 5"
        ]
      ]
    },
    {
      "note": "`B` misses and the set is full. The least recently used line is `C` (way 2), so `B` replaces it.",
      "array": [
        "A",
        "E",
        "B",
        "D"
      ],
      "marks": [
        {
          "index": 2,
          "color": "red"
        },
        {
          "index": 3,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "B"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "D E A B"
        ],
        [
          "hits / misses",
          "2 / 6"
        ]
      ]
    },
    {
      "note": "`F` misses and the set is full. The least recently used line is `D` (way 3), so `F` replaces it.",
      "array": [
        "A",
        "E",
        "B",
        "F"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        },
        {
          "index": 1,
          "color": "gray"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "F"
        }
      ],
      "vars": [
        [
          "LRU → MRU",
          "E A B F"
        ],
        [
          "hits / misses",
          "2 / 7"
        ]
      ]
    },
    {
      "note": "Sequence `A B C A D E A B F`: **2 hits, 7 misses**. `A` survived because it kept being reused; a FIFO policy would have evicted it first, at `E`.",
      "vars": [
        [
          "LRU → MRU",
          "E A B F"
        ],
        [
          "hits / misses",
          "2 / 7"
        ]
      ]
    }
  ],
  "caption": "LRU replacement inside one 4-way set. Green = hit, red = the way that was filled, gray = the current LRU victim-in-waiting."
},
        {
          type: 'callout',
          variant: 'why',
          title: 'Why real caches only approximate LRU',
          text: 'Exact LRU must track the full recency order of all N ways and update it on **every** hit. For 8 or 16 ways, that is a lot of state and logic in the fastest part of the chip. So hardware uses cheap approximations: **tree pseudo-LRU** keeps N−1 bits forming a binary tree that points away from recently used halves. Large shared L3s go further and use adaptive policies that resist being flushed by one big streaming pass, since pure LRU would let a single sweep through a huge array evict everyone\'s hot data.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'A loop sums a 256 KiB `float` array twice in a row on a core with a 32 KiB L1 data cache (8-way, LRU). During the **second** pass, almost every line misses in L1 again. What kind of misses are these?',
      options: [
        {
          text: 'Compulsory misses',
          why: 'Compulsory misses are first-ever touches. Every line was already loaded during the first pass, so second-pass misses are not compulsory.',
        },
        {
          text: 'Conflict misses',
          why: 'A contiguous array spreads evenly over all sets. Even a fully associative 32 KiB cache would miss here, so the set mapping is not to blame.',
        },
        {
          text: 'Capacity misses',
          correct: true,
          why: 'The 256 KiB working set is eight times the cache. By the time the loop returns to the start of the array, those lines were evicted long ago, no matter how they are placed.',
        },
        {
          text: 'Coherence misses',
          why: 'Coherence misses happen when another core writes a line. Nothing here involves a second core.',
        },
      ],
      explanation:
        'With LRU and a sequential sweep larger than the cache, each line is evicted just before it is needed again: the worst case for LRU. The fix is not more associativity but **reuse distance**: do all the work on a chunk of the array while it is cached (for example, two passes over each 16 KiB block), which is the loop-tiling idea in the next lesson. The L2, at 0.5–2 MiB, could hold this array, so these L1 misses would mostly hit in L2.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Writes, and how levels share lines',
      blocks: [
        {
          type: 'p',
          text: 'Loads only copy data into the cache. Stores create a choice: when does the new value reach the next level?',
        },
        {
          type: 'list',
          items: [
            '**[[write-back-cache|Write-through]]**: every store is also sent to the next level immediately. Simple, and the next level is always up to date, but it generates traffic for every store, and a loop that updates one counter a billion times sends a billion writes downstream.',
            '**Write-back**: the store only updates the cached line and sets its **dirty** bit. The line is written to the next level once, when it is evicted. Repeated stores to a hot line cost nothing extra. Modern CPU caches are write-back.',
          ],
        },
        {
          type: 'p',
          text: 'And what happens on a **store miss**? With **[[write-allocate]]**, the cache first fetches the line (on x86 this is a *read for ownership*), then performs the store into it, betting that neighbouring bytes will be written or read soon. With **no-write-allocate**, the store goes straight to the next level and the line is not cached. Write-back caches almost always pair with write-allocate.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Writing a buffer you never read back',
          text: 'With write-allocate, filling a 100 MB buffer first *reads* 100 MB you are about to overwrite, then later writes back 100 MB of dirty lines. For huge one-shot outputs, such as uploading vertex data or clearing a large buffer, x86 offers **non-temporal stores** (`_mm_stream_si128` and friends) that bypass the caches and combine writes into whole lines. Use them only for data you will not read soon, and measure.',
        },
        {
          type: 'p',
          text: 'Between levels there is a second policy decision: may a line be in L2 and L3 at the same time?',
        },
        {
          type: 'table',
          headers: ['Policy', 'Rule', 'Trade-off'],
          rows: [
            ['**[[inclusive-cache|Inclusive]]**', 'Everything in the inner caches is also in the outer one', 'Wastes some outer capacity on duplicates, but the outer cache knows everything cached nearby, which simplifies multicore bookkeeping'],
            ['**Exclusive**', 'A line lives in at most one level', 'Total capacity is the sum of the levels, but lines move back and forth on every miss'],
            ['**Non-inclusive** (NINE)', 'Neither rule is enforced', 'A practical middle ground used by many modern designs'],
          ],
        },
        {
          type: 'p',
          text: 'Real CPUs mix these: Intel\'s older client CPUs used an inclusive L3, Intel\'s server designs since Skylake-SP use a non-inclusive one, and AMD\'s Zen L3 acts as a **victim cache** that is filled with lines evicted from L2.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'truefalse',
      prompt: 'In a write-back cache, a store to a line that is already in L1 immediately updates main memory.',
      answer: false,
      explanation:
        'A write-back cache only updates its own copy and marks the line **dirty**. Main memory sees the new data when the dirty line is eventually evicted (or when another core asks for it). That is the whole point: a hot variable written a million times reaches DRAM once. It also means main memory is frequently *stale*, which is fine for one core and becomes the central problem once several cores have caches, as the next unit shows.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'A cache simulator in C++',
      blocks: [
        {
          type: 'p',
          text: 'Everything so far fits in one small class: a set-associative, write-back, write-allocate cache with true LRU. It tracks tags only, never data, which is all you need to count hits and misses. Simulators like this are a real tool: Valgrind\'s **Cachegrind** runs your program and feeds every memory access through a model of the caches.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <vector>

// A set-associative, write-back, write-allocate cache
// with true LRU replacement. It tracks only tags, not data.
class Cache {
public:
    Cache(std::uint64_t sizeBytes, std::uint64_t lineBytes,
          std::uint64_t ways)
        : line_{lineBytes}, ways_{ways},
          sets_{sizeBytes / (lineBytes * ways)},
          slots_(sets_ * ways) {}

    void access(std::uint64_t addr, bool isWrite) {
        const std::uint64_t block = addr / line_;  // line number
        const std::uint64_t set = block % sets_;   // index
        const std::uint64_t tag = block / sets_;   // the rest
        Slot* ways = &slots_[set * ways_];
        ++clock_;

        Slot* victim = &ways[0];
        for (std::uint64_t w = 0; w < ways_; ++w) {
            Slot& s = ways[w];
            if (s.valid && s.tag == tag) {         // hit
                ++hits;
                s.lastUse = clock_;
                s.dirty = s.dirty || isWrite;
                return;
            }
            if (s.lastUse < victim->lastUse) victim = &s;
        }
        ++misses;                                  // miss
        if (victim->valid && victim->dirty) ++writebacks;
        *victim = Slot{true, isWrite, tag, clock_};
    }

    std::uint64_t hits = 0, misses = 0, writebacks = 0;

private:
    struct Slot {
        bool valid = false;
        bool dirty = false;
        std::uint64_t tag = 0;
        std::uint64_t lastUse = 0;   // 0 = never: LRU picks it
    };
    std::uint64_t line_, ways_, sets_, clock_ = 0;
    std::vector<Slot> slots_;
};

void report(const char* name, const Cache& c) {
    std::cout << name << ": " << c.hits << " hits, " << c.misses
              << " misses, " << c.writebacks << " writebacks\\n";
}

int main() {
    const std::uint64_t seq[] = {0x04, 0x0C, 0x14, 0x44,
                                 0x08, 0x48, 0x18, 0x0C};
    Cache direct{64, 16, 1}, twoWay{64, 16, 2};
    for (std::uint64_t a : seq) {
        direct.access(a, false);
        twoWay.access(a, false);
    }
    report("Toy direct-mapped", direct);
    report("Toy 2-way        ", twoWay);

    // Write a 64 KiB array of ints, then read it back,
    // through a 32 KiB 8-way L1 with 64-byte lines.
    Cache l1{32 * 1024, 64, 8};
    const std::uint64_t n = 64 * 1024 / sizeof(int);
    for (std::uint64_t i = 0; i < n; ++i) l1.access(i * 4, true);
    report("Write pass       ", l1);
    for (std::uint64_t i = 0; i < n; ++i) l1.access(i * 4, false);
    report("After read pass  ", l1);
}`,
          output: "Toy direct-mapped: 2 hits, 6 misses, 0 writebacks\nToy 2-way        : 5 hits, 3 misses, 0 writebacks\nWrite pass       : 15360 hits, 1024 misses, 512 writebacks\nAfter read pass  : 30720 hits, 2048 misses, 1024 writebacks",
          annotations: [
            { lines: '16-18', text: 'The address split in arithmetic form: the line number, then its set (index) and the remaining bits (tag). With power-of-two geometry these divisions are the shifts and masks from earlier.' },
            { lines: '22-32', text: 'Check every way of the set; real hardware does these compares in parallel. On the way through, remember the least recently used slot as the eviction victim.' },
            { lines: 28, text: 'Write-back: a store just marks the line dirty. Nothing is written anywhere yet.' },
            { lines: 35, text: 'A miss in a write-allocate cache always brings the line in, for loads and stores alike.' },
            { lines: 34, text: 'Evicting a dirty line costs a write-back to the next level; a clean line can simply be dropped.' },
            { lines: 45, text: 'Slots that were never used have `lastUse == 0`, so the LRU scan picks empty ways before evicting anything.' },
            { lines: '57-65', text: 'The toy sequence from the animations, run through both organizations: 2/6 and 5/3, matching the step-throughs.' },
            { lines: '67-74', text: 'A 64 KiB array is twice the L1. The write pass has one compulsory miss per line (16 ints per line), and the second half of the array evicts the dirty first half: 512 write-backs. The read pass then misses on every line again (capacity misses) and evicts the remaining 512 dirty lines.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Make it yours',
          text: 'Paste the class into your own experiments: feed it the addresses your loops would generate (`base + index * sizeof(T)`) and compare layouts by miss counts instead of timings. Counts are deterministic, so they make honest A/B comparisons. The next lesson does exactly this for matrix traversals, game entities and linked lists.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'A teammate\'s simulator reports far too few hits for a simple sequential loop, even though the line size is 64 bytes. Tap the faulty line.',
      code: `bool lookup(std::uint64_t addr) {
    const std::uint64_t set = addr % numSets;
    const std::uint64_t tag = addr / lineSize / numSets;
    for (std::uint64_t w = 0; w < ways; ++w) {
        const Slot& s = slots[set * ways + w];
        if (s.valid && s.tag == tag) {
            return true;
        }
    }
    return false;
}`,
      bugLines: [2],
      hint: 'Two addresses in the same 64-byte line must always land in the same set.',
      explanation:
        'Line 2 computes the set from the raw **byte** address, so bytes 0, 1, 2… of one line map to different sets. A sequential loop then never finds the line it just fetched, and spatial locality disappears from the results. The index must come from the **line number**: `(addr / lineSize) % numSets`, which in hardware means skipping the offset bits before taking the index bits. Line 3 is correct: the tag is the line number with the index bits removed.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'Put the steps of a load that **misses** in a set-associative, write-back L1 cache in order.',
      lines: [
        'Split the address into tag, index and offset',
        'Use the index to select one set',
        'Compare the tag with the tag of every valid way in the set: no match',
        'Choose a victim way with the replacement policy, writing it back first if it is dirty',
        'Fetch the line from the next level into the victim way and store its tag',
        'Use the offset to return the requested bytes to the core',
      ],
      linesAreCode: false,
      explanation:
        'The index has to be known before the right set can be read, and the tag compare needs that set\'s tags. Only after the compare fails does the cache pick a victim, and a dirty victim must be saved before its slot is overwritten. Once the new line arrives, the offset selects the bytes. On a hit, the sequence stops after the third step with a match and jumps to the last one.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'numeric',
      prompt: 'The Xeon from the previous lesson reported a 48 KiB, 12-way L1 data cache with 64-byte lines. How many sets does it have?',
      answer: 64,
      unit: 'sets',
      explanation:
        'Sets = 48 × 1024 / (64 × 12) = 49152 / 768 = **64 sets**. So it still uses 6 index bits and 6 offset bits (12 bits in total, the 4 KiB page offset), exactly like a 32 KiB 8-way cache: Intel grew this L1 from 32 KiB to 48 KiB by adding ways, not sets, which keeps the lookup parallel with address translation.',
    },
  ],
  takeaways: [
    'Caches store 64-byte lines; the line of an address is `addr / 64`, and objects can straddle two lines.',
    'An address splits into offset (log₂ line size bits), index (log₂ sets bits) and tag (the rest); sets = size ÷ (line size × ways).',
    'Direct-mapped caches suffer conflict misses; N-way set-associative caches compare N tags in parallel; fully associative caches are for small structures like TLBs.',
    'Misses are compulsory, capacity or conflict (plus coherence on multicore); LRU or an approximation picks the victim.',
    'Modern caches are write-back with write-allocate: stores set a dirty bit, and dirty lines are written back on eviction.',
    'Cache levels can be inclusive, exclusive or neither, which trades capacity against bookkeeping.',
    'A simulator that counts hits and misses gives deterministic, honest comparisons of access patterns.',
  ],
  reading: [
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Section 6.4 builds up direct-mapped, set-associative and fully associative caches with worked address splits.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Section 3 covers cache organization, associativity effects and write policies with measurements.',
    },
    {
      title: 'CPU cache',
      url: 'https://en.wikipedia.org/wiki/CPU_cache',
      source: 'article',
      note: 'A broad reference on cache organization, policies and history, with diagrams of associativity.',
    },
    {
      title: 'Cache replacement policies',
      url: 'https://en.wikipedia.org/wiki/Cache_replacement_policies',
      source: 'article',
      note: 'LRU, pseudo-LRU, RRIP and other policies, with worked examples of how each chooses a victim.',
    },
  ],
};
