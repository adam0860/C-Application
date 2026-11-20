import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-io-systems',
  title: 'Buses, I/O and Console Hardware',
  summary: 'How the CPU talks to devices: PCIe, memory-mapped registers, polling and interrupts, DMA, SSDs and NVMe, DirectStorage-style streaming, and the unified memory of PS5 and Xbox Series consoles.',
  minutes: 20,
  objectives: [
    'Describe how a PC connects its CPU, memory, GPU and storage, and compute PCIe bandwidth from lanes and generation',
    'Explain memory-mapped I/O and why device registers need `volatile` in C++',
    'Compare polling and interrupts, and explain how DMA frees the CPU from moving data',
    'Compare HDDs, SATA SSDs and NVMe SSDs, and explain what DirectStorage-style streaming changes',
    'Describe the PS5 and Xbox Series X hardware and how unified memory changes engine design',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Buses and PCIe: how the parts are wired',
      blocks: [
        {
          type: 'p',
          text: 'So far this course has lived inside the CPU and its caches. But a game also reads an SSD, uploads textures to a GPU and polls a controller. Those devices connect to the CPU through **buses** and **links**, and their bandwidth and latency shape how engines are built.',
        },
        {
  "type": "figure",
  "svg": "<svg viewBox=\"0 0 520 400\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\">\n<rect x=\"170\" y=\"130\" width=\"180\" height=\"120\" rx=\"10\" stroke-width=\"2\"/>\n<text x=\"260\" y=\"152\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"700\" stroke=\"none\">CPU</text>\n<rect x=\"184\" y=\"162\" width=\"152\" height=\"22\" rx=\"4\" class=\"s-blue\"/>\n<text x=\"260\" y=\"177\" text-anchor=\"middle\" font-size=\"11\" class=\"t-blue\" stroke=\"none\">cores + caches</text>\n<rect x=\"184\" y=\"190\" width=\"70\" height=\"48\" rx=\"4\" class=\"s-purple\"/>\n<text x=\"219\" y=\"210\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-purple\" stroke=\"none\">memory</text>\n<text x=\"219\" y=\"224\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-purple\" stroke=\"none\">controller</text>\n<rect x=\"262\" y=\"190\" width=\"74\" height=\"48\" rx=\"4\" class=\"s-orange\"/>\n<text x=\"299\" y=\"210\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-orange\" stroke=\"none\">PCIe root</text>\n<text x=\"299\" y=\"224\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-orange\" stroke=\"none\">complex</text>\n<rect x=\"14\" y=\"170\" width=\"110\" height=\"60\" rx=\"6\" class=\"s-purple\"/>\n<text x=\"69\" y=\"196\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">DDR5 RAM</text>\n<text x=\"69\" y=\"214\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-gray\" stroke=\"none\">~60–100 GB/s</text>\n<line x1=\"126\" y1=\"214\" x2=\"182\" y2=\"214\" stroke-width=\"3\" class=\"s-purple\"/>\n<path d=\"M182.0 214.0 L173.0 219.0 L173.0 209.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<path d=\"M126.0 214.0 L135.0 209.0 L135.0 219.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<rect x=\"372\" y=\"14\" width=\"136\" height=\"80\" rx=\"8\" class=\"s-green\"/>\n<text x=\"440\" y=\"38\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">GPU</text>\n<rect x=\"384\" y=\"48\" width=\"112\" height=\"36\" rx=\"4\" class=\"s-green\"/>\n<text x=\"440\" y=\"64\" text-anchor=\"middle\" font-size=\"10.5\" stroke=\"none\">VRAM</text>\n<text x=\"440\" y=\"77\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">~0.5–1 TB/s</text>\n<rect x=\"392\" y=\"170\" width=\"116\" height=\"60\" rx=\"6\" class=\"s-teal\"/>\n<text x=\"450\" y=\"196\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">NVMe SSD</text>\n<text x=\"450\" y=\"214\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-gray\" stroke=\"none\">~7 GB/s (Gen4)</text>\n<line x1=\"338\" y1=\"214\" x2=\"390\" y2=\"214\" stroke-width=\"3\" class=\"s-orange\"/>\n<path d=\"M390.0 214.0 L381.0 219.0 L381.0 209.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<path d=\"M338.0 214.0 L347.0 209.0 L347.0 219.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<text x=\"364\" y=\"206\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">x4</text>\n<rect x=\"190\" y=\"300\" width=\"140\" height=\"44\" rx=\"6\" class=\"s-gray\"/>\n<text x=\"260\" y=\"320\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">Chipset</text>\n<text x=\"260\" y=\"336\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">more PCIe lanes, hub</text>\n<line x1=\"299\" y1=\"252\" x2=\"280\" y2=\"298\" stroke-width=\"3\" class=\"s-orange\"/>\n<path d=\"M280.0 298.0 L278.8 287.8 L288.1 291.6 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<path d=\"M299.0 252.0 L300.2 262.2 L290.9 258.4 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<text x=\"300\" y=\"282\" font-size=\"10.5\" class=\"t-orange\" stroke=\"none\">PCIe-based link</text>\n<rect x=\"40\" y=\"364\" width=\"80\" height=\"28\" rx=\"5\" class=\"s-gray\"/>\n<text x=\"80\" y=\"383\" text-anchor=\"middle\" font-size=\"11.5\" stroke=\"none\">USB</text>\n<line x1=\"80\" y1=\"362\" x2=\"260\" y2=\"346\" class=\"s-gray\"/>\n<rect x=\"160\" y=\"364\" width=\"80\" height=\"28\" rx=\"5\" class=\"s-gray\"/>\n<text x=\"200\" y=\"383\" text-anchor=\"middle\" font-size=\"11.5\" stroke=\"none\">SATA</text>\n<line x1=\"200\" y1=\"362\" x2=\"260\" y2=\"346\" class=\"s-gray\"/>\n<rect x=\"280\" y=\"364\" width=\"80\" height=\"28\" rx=\"5\" class=\"s-gray\"/>\n<text x=\"320\" y=\"383\" text-anchor=\"middle\" font-size=\"11.5\" stroke=\"none\">Network</text>\n<line x1=\"320\" y1=\"362\" x2=\"260\" y2=\"346\" class=\"s-gray\"/>\n<rect x=\"400\" y=\"364\" width=\"80\" height=\"28\" rx=\"5\" class=\"s-gray\"/>\n<text x=\"440\" y=\"383\" text-anchor=\"middle\" font-size=\"11.5\" stroke=\"none\">Audio</text>\n<line x1=\"440\" y1=\"362\" x2=\"260\" y2=\"346\" class=\"s-gray\"/>\n<line x1=\"338\" y1=\"196\" x2=\"412\" y2=\"102\" stroke-width=\"3\" class=\"s-orange\"/>\n<path d=\"M412.0 102.0 L410.4 112.2 L402.5 106.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<path d=\"M338.0 196.0 L339.6 185.8 L347.5 192.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<text x=\"398\" y=\"140\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">PCIe x16</text>\n<text x=\"398\" y=\"153\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">~32 GB/s (Gen4)</text>\n</svg>",
  "alt": "PC system diagram: the CPU contains cores and caches, a memory controller connected to DDR5 RAM, and a PCIe root complex with a x16 link to the GPU, a x4 link to an NVMe SSD and a link to the chipset, which fans out to USB, SATA, network and audio.",
  "caption": "A modern PC: memory hangs off the CPU's memory controller; the GPU and fast SSDs connect directly to the CPU's PCIe lanes; slower devices share the chipset."
},
        {
          type: 'p',
          text: 'In a modern PC, DRAM connects straight to the memory controller inside the CPU. Fast devices (the GPU and NVMe SSDs) connect directly to the CPU\'s [[pcie]] lanes, and slower ones hang off the chipset, which shares a single link to the CPU.',
        },
        {
          type: 'p',
          text: 'PCI Express is a set of point-to-point serial **lanes**. Each lane is a pair of one-bit differential links, one per direction, so traffic flows both ways at once. A slot bundles lanes: x16 for a graphics card, x4 for an NVMe SSD. Each generation doubles the transfer rate per lane:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'pcie_bandwidth.cpp',
          code: `#include <cstdio>

// Usable PCIe bandwidth per direction, gens 3-5:
// transfers/s per lane x 128/130 encoding / 8 bits.
struct Gen { int gen; double gtPerSec; };

int main() {
    const Gen gens[] = {{3, 8.0}, {4, 16.0}, {5, 32.0}};
    std::printf("gen    per lane    x4 (SSD)   x16 (GPU)\\n");
    for (const Gen& g : gens) {
        double lane = g.gtPerSec * 128.0 / 130.0 / 8.0;
        std::printf("%3d  %5.2f GB/s %6.2f GB/s %6.2f GB/s\\n",
                    g.gen, lane, 4 * lane, 16 * lane);
    }
}`,
          output: `gen    per lane    x4 (SSD)   x16 (GPU)
  3   0.98 GB/s   3.94 GB/s  15.75 GB/s
  4   1.97 GB/s   7.88 GB/s  31.51 GB/s
  5   3.94 GB/s  15.75 GB/s  63.02 GB/s`,
          annotations: [
            { lines: 8, text: 'GT/s, gigatransfers per second: raw bits per second per lane. Gen 3 is 8 GT/s, and each generation doubles it.' },
            { lines: 11, text: 'Since Gen 3, every 128 data bits travel as a 130-bit block (the 2 extra bits help the receiver stay in sync), so about 1.5% is overhead. Divide by 8 for bytes.' },
            { lines: 12, text: 'These are per direction: an x16 Gen 4 link can move ~31.5 GB/s to the GPU and ~31.5 GB/s back at the same time.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why serial lanes replaced wide parallel buses',
          text: 'The original PCI bus was 32 wires wide, shared by all devices, and ran at 33 MHz: 133 MB/s for the whole machine. Making a wide parallel bus faster gets hard, because the bits on different wires arrive at slightly different times (skew) and only one device can talk at once. A serial lane embeds its clock in the data stream and is point-to-point, so it can run at billions of transfers per second; for more bandwidth you add lanes, which are independent of each other.',
        },
        {
          type: 'p',
          text: 'Notice the gap in the figure: a GPU reads its own VRAM at up to ~1 TB/s, but data crossing PCIe from system RAM moves at ~32 GB/s, about 30 times slower. Keep that ratio in mind for the console section.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'A capture card uses a PCIe **Gen 4 x8** link. What is its usable bandwidth per direction in GB/s? Use 16 GT/s per lane and 128b/130b encoding, and round to 1 decimal place.',
      hint: 'Per lane: 16 × 128 / 130 / 8 GB/s. Then multiply by the number of lanes.',
      answer: 15.8,
      tolerance: 0.051,
      unit: 'GB/s',
      explanation: 'One Gen 4 lane carries 16 × 128 / 130 / 8 ≈ 1.969 GB/s per direction, so 8 lanes give ≈ **15.75 GB/s**, which rounds to 15.8. That equals a Gen 3 x16 link: each generation doubles per-lane speed, so you can halve the lanes for the same bandwidth.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Memory-mapped I/O: device registers at addresses',
      blocks: [
        {
          type: 'p',
          text: 'How does the CPU tell an SSD "read block 9,000" or ask a serial port "is your transmit buffer empty"? Most devices expose a small set of **registers**: status, control, data, command. With [[memory-mapped-io]], each register is given a physical address. An ordinary load or store to that address does not go to DRAM; the system routes it to the device, which reacts.',
        },
        {
          type: 'code',
          title: 'uart.cpp (bare-metal embedded C++)',
          code: `#include <cstdint>

struct UartRegs {                    // the device's layout
    volatile std::uint32_t status;   // bit 7: TX empty
    volatile std::uint32_t data;     // write: send a byte
};

constexpr std::uintptr_t kUartBase = 0x4001'3800;
constexpr std::uint32_t kTxEmpty = 1u << 7;

void sendByte(std::uint8_t b) {
    auto* uart = reinterpret_cast<UartRegs*>(kUartBase);
    while ((uart->status & kTxEmpty) == 0) {
        // spin: the hardware will set the bit
    }
    uart->data = b;                  // a store the device sees
}`,
          annotations: [
            { lines: '3-6', text: 'A struct that mirrors the device\'s register layout from its datasheet: status at offset 0, data at offset 4.' },
            { lines: '4-5', text: '`volatile` tells the compiler every read and write is an observable side effect: it must perform each one, in program order, and may not cache the value in a register, merge writes or delete "useless" reads.' },
            { lines: 8, text: 'A fixed physical address from the chip\'s memory map. On a microcontroller without virtual memory, the program uses it directly.' },
            { lines: '13-15', text: 'Each iteration really reads the status register. Without `volatile`, the compiler could load it once and spin forever on a stale copy.' },
          ],
        },
        {
          type: 'p',
          text: 'On a PC or console, games never touch device registers: the OS kernel maps them only into drivers, and user code talks to devices through system calls and APIs. But the mechanism underneath is the same, and it is everyday code in embedded systems. The CPU also marks these address ranges **uncacheable**, because a cached copy of a status register would be useless: the device changes it behind the cache\'s back. (x86 additionally has a separate, older I/O address space reached with `in` and `out` instructions, now used mostly by legacy devices.)',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: '`volatile` is for hardware, not for threads',
          text: '`volatile` forces the compiler to perform each access, but it gives no atomicity and no ordering between threads, so sharing a `volatile bool` between threads is still a [[data-race]] and undefined behavior. For threads use [[atomic|std::atomic]]. For memory-mapped registers use `volatile`. They solve different problems.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Embedded and defense systems',
          text: 'Flight computers, radios and weapons systems are full of code like this: microcontrollers and processors talking to sensors and actuators through memory-mapped registers, with no OS or a small real-time one. Systems that must survive radiation use radiation-hardened processors, such as BAE Systems\' RAD750 (a hardened PowerPC 750 flown on NASA\'s Curiosity and Perseverance rovers), together with error-correcting memory and watchdog timers, trading clock speed for reliability.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'bug',
      prompt: 'This bare-metal sensor driver works at `-O0`. At `-O2` it returns values without ever waiting for the "ready" bit. Tap the line that causes it.',
      code: `#include <cstdint>

struct SensorRegs {
    std::uint32_t status;     // bit 0: sample ready
    std::uint32_t value;      // the measured sample
};

constexpr std::uintptr_t kSensorBase = 0x4000'1000;

std::uint32_t readSample() {
    auto* s = reinterpret_cast<SensorRegs*>(kSensorBase);
    while ((s->status & 1u) == 0) {
        // wait for the sensor
    }
    return s->value;
}`,
      bugLines: [4],
      explanation: '`status` is a plain `std::uint32_t`, so the compiler assumes nothing but this program changes it, and nothing in the loop does. A loop that would spin forever without side effects is undefined behavior in C++ (the forward-progress rule), so the optimizer may assume the loop ends at once: g++ 13 at `-O2` compiles `readSample` to a single load of `value` and a `ret`. Another compiler might instead load `status` once and spin forever on the stale copy. Either way, the register must be declared `volatile std::uint32_t status;` (and `value` too, so it is read exactly where the code says). `std::atomic` is not the fix: the other "writer" is hardware, not a C++ thread.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Polling vs interrupts',
      blocks: [
        {
          type: 'p',
          text: 'The UART loop above is **polling**: the CPU repeatedly reads a status register until the device is ready. The alternative is an [[hardware-interrupt|interrupt]]: the device signals the CPU when something happens. The CPU finishes its current instruction, saves enough state to resume, and jumps to a handler through a table of handlers (on x86, the interrupt descriptor table). On PCIe, an interrupt is itself just a small memory write to a special address (MSI-X), so it travels over the same links as data.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'poll_vs_irq.cpp',
          code: `#include <cstdio>
#include <initializer_list>

// CPU cost of noticing device events, per second, on a
// 3 GHz core. Costs are modeled round numbers.
const double kHz = 3e9;
const double kPollCost = 200;   // one status-register read
const double kPollsPerSec = 100'000;  // check every 10 us
const double kIrqCost = 5'000;  // interrupt entry+handler+exit

int main() {
    std::printf("events/s   polling   interrupts\\n");
    for (double rate : {100.0, 10'000.0, 1'000'000.0}) {
        double poll = kPollsPerSec * kPollCost / kHz;
        double irq = rate * kIrqCost / kHz;
        std::printf("%9.0f  %7.2f%%  %10.2f%%\\n", rate,
                    100 * poll, 100 * irq);
    }
}`,
          output: `events/s   polling   interrupts
      100     0.67%        0.02%
    10000     0.67%        1.67%
  1000000     0.67%      166.67%`,
          annotations: [
            { lines: '7-8', text: 'Polling pays a fixed cost whether or not anything happened: here, an uncached register read every 10 µs.' },
            { lines: 9, text: 'An interrupt costs more per event (saving state, running the handler, returning, plus cache and pipeline disruption), but nothing at all when the device is quiet.' },
            { lines: 15, text: 'Interrupt cost grows with the event rate.' },
            { lines: '16-17', text: 'At a million events per second, interrupts would need more than one whole core: the machine would do nothing but handle them (*interrupt livelock*).' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Polling', 'Interrupts'],
          rows: [
            ['Cost when idle', 'Constant: the CPU keeps checking', 'Zero'],
            ['Cost per event', 'Low (the check was happening anyway)', 'High: entry, handler, exit, disrupted caches'],
            ['Latency', 'Up to one polling interval', 'Short, but unpredictable relative to your code'],
            ['Best for', 'Very frequent events, or a loop that already runs (a game loop)', 'Rare or irregular events'],
          ],
        },
        {
          type: 'p',
          text: 'Real systems mix both. Network drivers take an interrupt for the first packet, then switch to polling while traffic is heavy (Linux calls this NAPI), and devices *coalesce* interrupts, raising one per batch. Games are natural pollers: the engine reads input state once per frame in the [[game-loop]]. Even a USB gamepad never interrupts the CPU on its own; the USB host controller polls it at a fixed rate (often 125 to 1,000 times per second), stores the reports in memory and tells the OS when new data has arrived.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'A 100 Gb/s network card in a game server can deliver millions of packets per second under load, and almost nothing at night. Which strategy fits best?',
      options: [
        { text: 'One interrupt per packet, always', why: 'At millions of packets per second the per-interrupt cost would consume more than a core: interrupt livelock.' },
        { text: 'A core that busy-polls the card all the time', why: 'This gives the lowest latency under load (some trading and packet-processing systems do it), but it burns a full core all night when there is no traffic.' },
        { text: 'Interrupts when traffic is light, switching to polling in batches when it is heavy', correct: true, why: 'Each method is used where it is cheapest: no cost when idle, and amortized per-packet cost under load. This is what Linux NAPI and interrupt coalescing do.' },
        { text: 'DMA, so the CPU no longer needs to know when packets arrive', why: 'DMA moves the packet data without the CPU, but the CPU still has to learn that new packets are in memory, by interrupt or by polling.' },
      ],
      explanation: 'Polling has a fixed cost and interrupts have a per-event cost, so the crossover depends on the event rate. A device whose rate swings from almost zero to millions per second gets the best of both by switching between them. DMA is complementary: it decides *who moves the data*, not *how the CPU finds out*.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'DMA: let the device move the data',
      blocks: [
        {
          type: 'p',
          text: 'Interrupts tell the CPU *when* to act. But if the CPU then copies every byte from a device register into memory (**programmed I/O**), it is still the bottleneck: each register read is an uncached access across PCIe. With [[direct-memory-access]] (DMA), the device itself reads and writes system memory. The CPU only describes the transfer and later handles one completion. Compare the two for three blocks of data:',
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 420,
  "height": 250,
  "interval": 1300,
  "caption": "Loading three blocks from an SSD, first by programmed I/O, then by DMA. The counters are the CPU's time: steps spent on I/O versus steps of game work.",
  "nodes": [
    {
      "id": "CPU",
      "x": 80,
      "y": 60
    },
    {
      "id": "SSD",
      "x": 340,
      "y": 60
    },
    {
      "id": "RAM",
      "x": 210,
      "y": 196
    }
  ],
  "edges": [
    {
      "from": "CPU",
      "to": "SSD"
    },
    {
      "from": "CPU",
      "to": "RAM"
    },
    {
      "from": "SSD",
      "to": "RAM"
    }
  ],
  "frames": [
    {
      "note": "**Programmed I/O:** the CPU moves the data itself, one chunk at a time. We load 3 blocks.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "idle"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "0"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU reads block 1 from the SSD's data register (an uncached load across PCIe).",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "SSD",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "SSD",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "1"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU stores block 1 into RAM. No game code runs while it does this.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "2"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU reads block 2 from the SSD's data register (an uncached load across PCIe).",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "SSD",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "SSD",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "3"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU stores block 2 into RAM. No game code runs while it does this.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "4"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU reads block 3 from the SSD's data register (an uncached load across PCIe).",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "SSD",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "SSD",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "5"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The CPU stores block 3 into RAM. No game code runs while it does this.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "red"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "copying"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "6"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "Done: 6 CPU steps went into copying and the game made no progress.",
      "nodeColors": [
        {
          "id": "RAM",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "RAM",
          "text": "3 blocks"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "6"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "**DMA:** the CPU writes one command (source, RAM address, length) to the SSD's doorbell register.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "orange"
        },
        {
          "id": "SSD",
          "color": "orange"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "setup"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "SSD",
          "color": "orange"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "1"
        ],
        [
          "game work done",
          "0"
        ]
      ]
    },
    {
      "note": "The SSD's DMA engine writes block 1 straight into RAM while the CPU runs game code.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "green"
        },
        {
          "id": "SSD",
          "color": "blue"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "game code"
        },
        {
          "id": "SSD",
          "text": "DMA"
        }
      ],
      "edgeColors": [
        {
          "from": "SSD",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "1"
        ],
        [
          "game work done",
          "1"
        ]
      ]
    },
    {
      "note": "The SSD's DMA engine writes block 2 straight into RAM while the CPU runs game code.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "green"
        },
        {
          "id": "SSD",
          "color": "blue"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "game code"
        },
        {
          "id": "SSD",
          "text": "DMA"
        }
      ],
      "edgeColors": [
        {
          "from": "SSD",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "1"
        ],
        [
          "game work done",
          "2"
        ]
      ]
    },
    {
      "note": "The SSD's DMA engine writes block 3 straight into RAM while the CPU runs game code.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "green"
        },
        {
          "id": "SSD",
          "color": "blue"
        },
        {
          "id": "RAM",
          "color": "blue"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "game code"
        },
        {
          "id": "SSD",
          "text": "DMA"
        }
      ],
      "edgeColors": [
        {
          "from": "SSD",
          "to": "RAM",
          "color": "blue"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "1"
        ],
        [
          "game work done",
          "3"
        ]
      ]
    },
    {
      "note": "Transfer complete: the SSD raises an interrupt, and the CPU runs a short completion handler.",
      "nodeColors": [
        {
          "id": "CPU",
          "color": "orange"
        },
        {
          "id": "SSD",
          "color": "red"
        }
      ],
      "nodeNotes": [
        {
          "id": "CPU",
          "text": "interrupt"
        }
      ],
      "edgeColors": [
        {
          "from": "CPU",
          "to": "SSD",
          "color": "red"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "2"
        ],
        [
          "game work done",
          "3"
        ]
      ]
    },
    {
      "note": "Same data in RAM, but the CPU spent only 2 steps on I/O and did 3 steps of game work meanwhile.",
      "nodeColors": [
        {
          "id": "RAM",
          "color": "green"
        },
        {
          "id": "CPU",
          "color": "green"
        }
      ],
      "nodeNotes": [
        {
          "id": "RAM",
          "text": "3 blocks"
        }
      ],
      "vars": [
        [
          "CPU steps on I/O",
          "2"
        ],
        [
          "game work done",
          "3"
        ]
      ]
    }
  ]
},
        {
          type: 'steps',
          items: [
            { title: 'Describe', text: 'The driver writes a command into a queue in RAM: what to read, where in RAM to put it, how many bytes.' },
            { title: 'Ring the doorbell', text: 'One memory-mapped store to the device\'s *doorbell* register says "new commands are waiting".' },
            { title: 'Transfer', text: 'The device fetches the command and moves the data to or from RAM itself, as large bursts over PCIe. The CPU runs other code.' },
            { title: 'Complete', text: 'The device writes a completion entry to RAM and raises an interrupt (or the driver polls the completion queue).' },
          ],
        },
        {
          type: 'p',
          text: 'This is exactly how NVMe SSDs work: submission and completion queues in RAM, doorbell registers, DMA in both directions. GPUs have dedicated DMA *copy engines* too, which is what the copy queue in Direct3D 12 and Vulkan feeds, so uploads can overlap rendering.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'DMA and caches',
          text: 'The device writes RAM, but the CPU may hold an old copy of those addresses in its cache. On x86 PCs, PCIe DMA is cache-coherent: the hardware snoops the caches, so software does not notice. Many embedded ARM systems are not coherent, and the driver must explicitly clean (write back) the cache before a device reads a buffer and invalidate it before the CPU reads what a device wrote. Forgetting this gives "the data is sometimes stale" bugs. Modern systems also put an IOMMU between devices and memory, so a device can only reach the buffers it was given.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'The main benefit of DMA is that the CPU no longer has to spend its own time moving the data, so it can run other work while the transfer happens.',
      answer: true,
      explanation: 'With programmed I/O, every word passes through the CPU (often as slow uncached reads), so the CPU is busy for the whole transfer. With DMA, the CPU spends a few steps to set up the transfer and one interrupt to finish it, and the device moves the data in large, efficient bursts in the meantime. For a game, that means loading assets while the game thread keeps simulating.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Storage: from spinning disks to NVMe',
      blocks: [
        {
          type: 'p',
          text: 'A **hard disk** stores data on spinning platters read by a head on a moving arm. Reading a random block needs a *seek* (move the arm, several milliseconds) plus *rotational latency* (wait for the sector to come around: at 7,200 rpm one rotation takes 8.33 ms, half a rotation 4.17 ms on average). Sequential reads stream at 100–250 MB/s, but each random read costs about 10 ms: around 100 random reads per second.',
        },
        {
          type: 'p',
          text: 'An **SSD** stores data in NAND flash chips with no moving parts. Random reads take tens of microseconds, and the controller reads many flash chips in parallel. SATA SSDs still speak the old disk protocol over a 6 Gb/s link, which caps them near 550 MB/s. [[nvme]] SSDs sit directly on PCIe lanes and use a protocol designed for flash: up to 65,535 I/O queues of up to 65,536 commands each, versus one queue of 32 commands for SATA\'s AHCI, so many CPU cores can keep thousands of requests in flight.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'load_times.cpp',
          code: `#include <cstdio>

// Time to stream a 4 GB level, plus 20,000 small random
// reads, on typical drives (illustrative round numbers).
struct Drive {
    const char* name;
    double seqGBs;       // sequential read, GB/s
    double randomMs;     // one small random read, ms
};

int main() {
    const Drive drives[] = {
        {"HDD 7200 rpm", 0.15, 10.0},
        {"SATA SSD", 0.55, 0.1},
        {"NVMe Gen4 SSD", 7.0, 0.05},
    };
    for (const Drive& d : drives) {
        double seq = 4.0 / d.seqGBs;
        double rnd = 20'000 * d.randomMs / 1000.0;
        std::printf("%-14s level %5.1f s, random %6.1f s\\n",
                    d.name, seq, rnd);
    }
}`,
          output: `HDD 7200 rpm   level  26.7 s, random  200.0 s
SATA SSD       level   7.3 s, random    2.0 s
NVMe Gen4 SSD  level   0.6 s, random    1.0 s`,
          annotations: [
            { lines: '12-14', text: 'Round, typical figures. Real drives vary, but the orders of magnitude are right.' },
            { lines: 19, text: 'This models one request at a time. An HDD cannot do better (one head), but an NVMe drive with dozens of requests in flight serves hundreds of thousands of random reads per second, so its 20,000 reads finish in a small fraction of a second.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'How HDDs shaped game data',
          text: 'Because seeks were so expensive, PS4-era games laid out data on disk in the order it would be read, packed assets into big archive files and even **duplicated** assets so that everything a level section needed sat together and could be streamed without seeking. Install sizes grew as a result. Fast SSDs made random reads cheap, which is why current-generation consoles require them and engines can stream far more aggressively.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A laptop hard disk spins at **5,400 rpm**. What is its average rotational latency (half a rotation) in milliseconds? Round to 2 decimal places.',
      hint: 'One rotation takes 60 / 5,400 seconds.',
      answer: 5.56,
      tolerance: 0.006,
      unit: 'ms',
      explanation: 'One rotation takes 60 / 5,400 s ≈ 11.11 ms, so on average the sector is half a rotation away: **≈ 5.56 ms**, before adding the seek time. An NVMe SSD answers a random read in tens of microseconds, around a hundred times faster, which is why "random access" stopped being a dirty word in asset streaming.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Streaming assets: DirectStorage and console I/O',
      blocks: [
        {
          type: 'p',
          text: 'Raw drive speed is only half the story. Here is the classic path a texture takes on a PC:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Read', text: 'The game asks the OS for a file range; the SSD DMAs the compressed bytes into a buffer in system RAM.' },
            { title: 'Decompress', text: 'CPU cores decompress the data (assets are compressed to save disk space and read bandwidth) into another RAM buffer.' },
            { title: 'Upload', text: 'The data is copied over PCIe into VRAM, often through a staging buffer.' },
            { title: 'Use', text: 'The GPU samples the texture while rendering.' },
          ],
        },
        {
          type: 'p',
          text: 'At 7 GB/s of compressed input, step 2 alone would keep several CPU cores busy, and traditional file APIs add per-request overhead that adds up over tens of thousands of small reads. [[directstorage]], Microsoft\'s storage API for Windows and Xbox, attacks both: games submit large batches of requests that map onto NVMe queues with little per-request cost, and since DirectStorage 1.1 (2022) the data can be decompressed **on the GPU** with the GDeflate format, so it moves from SSD to VRAM without CPU cores decompressing it.',
        },
        {
          type: 'p',
          text: 'Consoles went further and put decompression into **dedicated hardware**. The PS5\'s SSD reads 5.5 GB/s raw, and its custom decompression unit (for the Kraken format) delivers a typical 8–9 GB/s of decompressed data, according to Sony. The Xbox Series X reads 2.4 GB/s raw and decompresses to about 4.8 GB/s with its own hardware block (for zlib and the texture format BCPack). Either way, the CPU cores barely notice the I/O.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'What fast I/O changes in engines',
          text: 'When the drive can deliver data within a frame or two, engines can keep less in memory "just in case": stream texture mips and mesh detail levels based on what the camera sees, load the next area as the player turns rather than behind a corridor or elevator, and shrink loading screens to seconds. The bottleneck moves from the drive to everything around it, which is why the request path and decompression had to change too. Engines expose this as [[async-loading]] systems and streaming budgets per frame.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'order',
      prompt: 'Put the classic PC path of a compressed texture, from disk to screen, in order.',
      linesAreCode: false,
      lines: [
        'The SSD DMAs the compressed bytes into a buffer in system RAM',
        'CPU cores decompress the data into another RAM buffer',
        'The decompressed data is copied over PCIe into VRAM',
        'The GPU samples the texture while rendering a frame',
      ],
      distractors: ['The SSD writes the texture straight into the GPU\'s L2 cache'],
      explanation: 'Each step consumes the previous one\'s output: you cannot decompress bytes not yet in RAM, upload data not yet decompressed, or sample a texture not yet in VRAM. DirectStorage with GPU decompression shortens this path (compressed data goes to VRAM and the GPU decompresses it), and consoles skip the PCIe upload entirely because CPU and GPU share one memory. No path writes into a GPU cache directly.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Inside the PS5 and Xbox Series X',
      blocks: [
        {
          type: 'p',
          text: 'Both current consoles are built around a custom AMD **APU**: a single chip that holds an 8-core Zen 2 CPU and an RDNA 2 GPU. Both chips connect to one shared pool of GDDR6 memory.',
        },
        {
          type: 'table',
          headers: ['Component', 'PlayStation 5', 'Xbox Series X'],
          rows: [
            ['CPU', '8 Zen 2 cores (16 threads), up to 3.5 GHz', '8 Zen 2 cores, 3.8 GHz (3.66 GHz with SMT)'],
            ['GPU', 'RDNA 2, 36 CUs, up to 2.23 GHz, 10.28 TFLOPS', 'RDNA 2, 52 CUs, 1.825 GHz, 12 TFLOPS'],
            ['Memory', '16 GB GDDR6, 256-bit, 448 GB/s', '16 GB GDDR6, 320-bit: 10 GB at 560 GB/s + 6 GB at 336 GB/s'],
            ['Storage', '825 GB NVMe SSD, 5.5 GB/s raw, typically 8–9 GB/s with hardware decompression', '1 TB NVMe SSD, 2.4 GB/s raw, 4.8 GB/s with hardware decompression'],
          ],
          caption: 'Launch specifications (2020) as published by Sony and Microsoft. PS5 clocks are maximums; the console varies them with power draw.',
        },
        {
  "type": "figure",
  "svg": "<svg viewBox=\"0 0 520 330\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\">\n<text x=\"128\" y=\"22\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"700\" stroke=\"none\">Gaming PC: two pools</text>\n<text x=\"392\" y=\"22\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"700\" stroke=\"none\">PS5 / Xbox Series: one pool</text>\n<line x1=\"260\" y1=\"10\" x2=\"260\" y2=\"320\" class=\"s-gray\" stroke-dasharray=\"4 4\"/>\n<rect x=\"14\" y=\"44\" width=\"90\" height=\"62\" rx=\"7\" class=\"s-blue\"/>\n<text x=\"59\" y=\"72\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">CPU</text>\n<text x=\"59\" y=\"90\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">big caches</text>\n<rect x=\"156\" y=\"44\" width=\"90\" height=\"62\" rx=\"7\" class=\"s-green\"/>\n<text x=\"201\" y=\"72\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" stroke=\"none\">GPU</text>\n<text x=\"201\" y=\"90\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">discrete card</text>\n<line x1=\"106\" y1=\"75\" x2=\"154\" y2=\"75\" stroke-width=\"3\" class=\"s-orange\"/>\n<path d=\"M154.0 75.0 L145.0 80.0 L145.0 70.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<path d=\"M106.0 75.0 L115.0 70.0 L115.0 80.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-orange\"/>\n<text x=\"130\" y=\"128\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-orange\" stroke=\"none\">PCIe: ~32 GB/s</text>\n<line x1=\"59\" y1=\"108\" x2=\"59\" y2=\"178\" stroke-width=\"3\" class=\"s-purple\"/>\n<path d=\"M59.0 178.0 L54.0 169.0 L64.0 169.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<path d=\"M59.0 108.0 L64.0 117.0 L54.0 117.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<line x1=\"201\" y1=\"108\" x2=\"201\" y2=\"178\" stroke-width=\"3\" class=\"s-green\"/>\n<path d=\"M201.0 178.0 L196.0 169.0 L206.0 169.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-green\"/>\n<path d=\"M201.0 108.0 L206.0 117.0 L196.0 117.0 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-green\"/>\n<rect x=\"14\" y=\"180\" width=\"90\" height=\"70\" rx=\"7\" class=\"s-purple\"/>\n<text x=\"59\" y=\"206\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"600\" stroke=\"none\">DDR5</text>\n<text x=\"59\" y=\"222\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">16–64 GB</text>\n<text x=\"59\" y=\"237\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">~60–100 GB/s</text>\n<rect x=\"156\" y=\"180\" width=\"90\" height=\"70\" rx=\"7\" class=\"s-green\"/>\n<text x=\"201\" y=\"206\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"600\" stroke=\"none\">VRAM</text>\n<text x=\"201\" y=\"222\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">8–24 GB</text>\n<text x=\"201\" y=\"237\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">~0.5–1 TB/s</text>\n<text x=\"130\" y=\"280\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">Textures and meshes are loaded</text>\n<text x=\"130\" y=\"295\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">into RAM, then copied over PCIe</text>\n<text x=\"130\" y=\"310\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">into VRAM before the GPU uses them.</text>\n<rect x=\"282\" y=\"40\" width=\"222\" height=\"96\" rx=\"9\" stroke-width=\"2\"/>\n<text x=\"393\" y=\"58\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" stroke=\"none\">APU: one chip</text>\n<rect x=\"292\" y=\"66\" width=\"96\" height=\"60\" rx=\"6\" class=\"s-blue\"/>\n<text x=\"340\" y=\"88\" text-anchor=\"middle\" font-size=\"11.5\" font-weight=\"600\" stroke=\"none\">8 Zen 2</text>\n<text x=\"340\" y=\"103\" text-anchor=\"middle\" font-size=\"11.5\" font-weight=\"600\" stroke=\"none\">cores</text>\n<rect x=\"398\" y=\"66\" width=\"96\" height=\"60\" rx=\"6\" class=\"s-green\"/>\n<text x=\"446\" y=\"88\" text-anchor=\"middle\" font-size=\"11.5\" font-weight=\"600\" stroke=\"none\">RDNA 2</text>\n<text x=\"446\" y=\"103\" text-anchor=\"middle\" font-size=\"11.5\" font-weight=\"600\" stroke=\"none\">GPU</text>\n<line x1=\"340\" y1=\"128\" x2=\"360\" y2=\"178\" stroke-width=\"3\" class=\"s-purple\"/>\n<path d=\"M360.0 178.0 L352.0 171.5 L361.3 167.8 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<path d=\"M340.0 128.0 L348.0 134.5 L338.7 138.2 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<line x1=\"446\" y1=\"128\" x2=\"426\" y2=\"178\" stroke-width=\"3\" class=\"s-purple\"/>\n<path d=\"M426.0 178.0 L424.7 167.8 L434.0 171.5 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<path d=\"M446.0 128.0 L447.3 138.2 L438.0 134.5 Z\" stroke=\"none\" fill=\"currentColor\" class=\"f-purple\"/>\n<rect x=\"282\" y=\"180\" width=\"222\" height=\"70\" rx=\"7\" class=\"s-purple\"/>\n<text x=\"393\" y=\"204\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"600\" stroke=\"none\">16 GB GDDR6, shared</text>\n<text x=\"393\" y=\"221\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">PS5: 448 GB/s</text>\n<text x=\"393\" y=\"236\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">Series X: 10 GB @ 560 + 6 GB @ 336 GB/s</text>\n<text x=\"393\" y=\"280\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">CPU and GPU address the same</text>\n<text x=\"393\" y=\"295\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">physical memory: no PCIe copy,</text>\n<text x=\"393\" y=\"310\" text-anchor=\"middle\" font-size=\"11\" stroke=\"none\">but they compete for bandwidth.</text>\n</svg>",
  "alt": "Left: a gaming PC with a CPU attached to DDR5 and a discrete GPU attached to its own VRAM, linked by PCIe. Right: a console APU containing 8 Zen 2 cores and an RDNA 2 GPU on one chip, both attached to one shared 16 GB GDDR6 pool.",
  "caption": "Two memory pools joined by PCIe versus one shared pool. Bandwidth figures are approximate for the PC and official for the consoles."
},
        {
          type: 'p',
          text: 'Why does the Series X have two speeds? Its memory bus is 320 bits wide, made of ten 32-bit chips: six 2 GB chips and four 1 GB chips. The first gigabyte of every chip can be interleaved across all ten (10 GB at full width, 560 GB/s); the second gigabyte exists only on the six larger chips (6 GB at 6/10 of the width, 336 GB/s). Microsoft reserves part of the slower region for the OS and gives games 13.5 GB in total, with the fast 10 GB intended for GPU data.',
        },
        {
          type: 'p',
          text: 'Unified memory changes engine design in several ways:',
        },
        {
          type: 'list',
          items: [
            '**No upload step.** On a PC, a texture lives in RAM and then gets copied over PCIe into VRAM. On a console, the CPU (or the SSD\'s DMA) writes it once, where the GPU will read it. Engines on consoles stream assets straight into their final location.',
            '**One budget.** The CPU and GPU share the same 13–16 GB. There is no separate "VRAM budget": a bigger texture pool means less memory for gameplay, audio and animation, and console teams negotiate one memory budget for everything.',
            '**Shared bandwidth.** CPU memory traffic takes bandwidth from the GPU. Cache-unfriendly CPU code on a console does not only slow the CPU: it can cost rendering time too.',
            '**Explicit coherence.** Sharing memory does not mean sharing caches. When the CPU writes data the GPU will read, or the reverse, the engine must flush or invalidate caches at the right moments with barriers and fences, just as with DMA.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why PCs do not just do the same',
          text: 'A PC must work with any GPU from any vendor, upgraded independently of the CPU. Discrete GPUs get their huge bandwidth from wide, short connections to memory soldered right next to the GPU on the card, which a socketed CPU and replaceable DIMMs cannot match. A console is one fixed design, so it can use fast GDDR6 for everything and put CPU and GPU on one chip. Laptop and phone chips (Apple silicon, AMD and Intel APUs) also use unified memory, for the same efficiency reasons, with lower bandwidth.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'numeric',
      prompt: 'GDDR6 bandwidth = bus width in bits × data rate per pin ÷ 8. The PS5 uses a **256-bit** bus at **14 Gb/s** per pin. What is its bandwidth in GB/s?',
      answer: 448,
      unit: 'GB/s',
      explanation: '256 × 14 / 8 = **448 GB/s**, Sony\'s published figure. The Series X uses the same 14 Gb/s chips on a 320-bit bus: 320 × 14 / 8 = 560 GB/s for its 10 GB region. Bandwidth scales with bus width, which is why wide memory buses (and the many memory chips they need) are a large part of a console\'s cost.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'You are porting a PC engine to a console with unified memory. Which change makes the most sense?',
      options: [
        { text: 'Keep two copies of every texture, one for the CPU and one for the GPU, as on PC', why: 'There is no separate VRAM to copy into. Two copies would waste the shared budget and burn bandwidth on a pointless copy.' },
        { text: 'Load textures directly into the memory the GPU will read, skipping the staging copy', correct: true, why: 'With one physical memory, the data can be written once in its final place, saving memory, bandwidth and a frame or more of upload latency.' },
        { text: 'Stop worrying about CPU cache misses, because unified memory is fast', why: 'CPU misses still cost latency, and on a console they also consume bandwidth the GPU needs. Cache-friendly code matters as much as ever.' },
        { text: 'Remove all cache flushes and barriers, because CPU and GPU see the same memory', why: 'Same memory, different caches. Without the right barriers, the GPU can read stale data the CPU wrote but has not yet written back, or vice versa.' },
      ],
      explanation: 'Unified memory removes the upload copy and the separate VRAM budget, but it keeps the caches and shares the bandwidth. Good console engines write data once into its final location, budget memory as one pool, keep CPU code cache-friendly so it does not starve the GPU, and keep their synchronization explicit.',
    },
  ],
  takeaways: [
    'DRAM hangs off the CPU\'s memory controller; GPUs and NVMe SSDs use point-to-point PCIe lanes (~2 GB/s per Gen 4 lane per direction); slower devices share the chipset.',
    'Memory-mapped I/O turns device registers into addresses; C++ must access them through `volatile`, which is for hardware and never a substitute for `std::atomic`.',
    'Polling costs a fixed amount, interrupts cost per event; real systems switch between them, and games naturally poll once per frame.',
    'DMA lets devices move data to and from RAM themselves; the CPU only queues commands and handles completions, and on non-coherent systems it must manage caches.',
    'NVMe SSDs answer random reads in tens of microseconds with deep parallel queues; DirectStorage and console decompression hardware remove the CPU from the streaming path.',
    'PS5 and Xbox Series X pair 8 Zen 2 cores and an RDNA 2 GPU on one chip with one GDDR6 pool: no upload copies, one shared budget, shared bandwidth and explicit coherence.',
  ],
  reading: [
    {
      title: 'PCI Express',
      url: 'https://en.wikipedia.org/wiki/PCI_Express',
      source: 'article',
      note: 'Lanes, link widths, encodings and the bandwidth table for every generation.',
    },
    {
      title: 'Direct memory access',
      url: 'https://en.wikipedia.org/wiki/Direct_memory_access',
      source: 'article',
      note: 'Third-party versus bus-mastering DMA, scatter-gather, and the cache-coherence problem.',
    },
    {
      title: 'NVM Express',
      url: 'https://en.wikipedia.org/wiki/NVM_Express',
      source: 'article',
      note: 'How NVMe\'s submission and completion queues and doorbells differ from AHCI, with the queue limits.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'Chapter 6 covers disk geometry, seek and rotational latency, SSDs and I/O buses from a programmer\'s view.',
    },
    {
      title: 'volatile (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/language/cv',
      source: 'cppreference',
      note: 'What `volatile` does and does not guarantee, and why it is not a synchronization tool.',
    },
  ],
};
