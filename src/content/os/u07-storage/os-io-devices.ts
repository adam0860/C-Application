import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-io-devices',
  title: 'I/O Devices and Drivers',
  summary:
    "How the kernel talks to hardware: device registers, polling, interrupts and DMA from the OS's side, why drivers cause most kernel crashes, the layered I/O stack, and how disks and SSDs shape I/O scheduling.",
  minutes: 20,
  objectives: [
    "Describe a device's interface (status, command and data registers) and the polling protocol the OS uses to drive it",
    'Trace a blocking read through the kernel: submit, block, context switch, DMA, interrupt, wake-up',
    'Explain what the OS must do to make DMA safe: pinned pages, scatter-gather lists and the IOMMU',
    'Explain why device drivers are the largest and least reliable part of a monolithic kernel, and how systems contain them',
    'Name the layers of the Linux and Windows I/O stacks and compute disk access times and head movement for classic I/O schedulers',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why I/O belongs to the operating system',
      blocks: [
        {
          type: 'p',
          text: "A computer that cannot read a disk, a gamepad or a network card is a space heater. Yet every device is different: an NVMe SSD, a USB controller and a GPU have nothing in common except that the CPU must somehow tell them what to do. The operating system takes on three jobs here, the same three it takes on for the CPU and memory: **abstraction** (one `read` call works on any disk), **protection** (your game cannot scribble over another program's files or reprogram the disk controller) and **performance** (keep the CPU busy while slow devices work).",
        },
        {
          type: 'p',
          text: 'Seen from the OS, every device looks roughly the same. OSTEP calls it the *canonical device*: a small **interface** of registers that software reads and writes, and hidden **internals** that do the real work.',
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 172\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"110\" y=\"14\" width=\"300\" height=\"150\" rx=\"4\" class=\"f-gray\" fill-opacity=\"0.06\"/><rect x=\"110\" y=\"14\" width=\"300\" height=\"150\" rx=\"4\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.5\"/><text x=\"260\" y=\"32\" font-size=\"12\" text-anchor=\"middle\" class=\"t-gray\" font-weight=\"700\">a device</text><rect x=\"128\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"128\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.5\"/><text x=\"169\" y=\"61\" font-size=\"12.5\" text-anchor=\"middle\" class=\"t-blue\" font-weight=\"700\">Status</text><text x=\"169\" y=\"77\" font-size=\"10.5\" text-anchor=\"middle\">busy? error?</text><rect x=\"222\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"222\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.5\"/><text x=\"263\" y=\"61\" font-size=\"12.5\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">Command</text><text x=\"263\" y=\"77\" font-size=\"10.5\" text-anchor=\"middle\">what to do</text><rect x=\"316\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"316\" y=\"42\" width=\"82\" height=\"44\" rx=\"4\" fill=\"none\" class=\"s-green\" stroke-width=\"1.5\"/><text x=\"357\" y=\"61\" font-size=\"12.5\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">Data</text><text x=\"357\" y=\"77\" font-size=\"10.5\" text-anchor=\"middle\">bytes in or out</text><text x=\"420\" y=\"68\" font-size=\"11.5\" text-anchor=\"start\" class=\"t-blue\">interface</text><text x=\"420\" y=\"82\" font-size=\"10.5\" text-anchor=\"start\">(what the OS sees)</text><line x1=\"118\" y1=\"96\" x2=\"402\" y2=\"96\" class=\"s-gray\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/><rect x=\"128\" y=\"106\" width=\"264\" height=\"46\" rx=\"4\" class=\"f-purple\" fill-opacity=\"0.1\"/><rect x=\"128\" y=\"106\" width=\"264\" height=\"46\" rx=\"4\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.5\"/><text x=\"260\" y=\"125\" font-size=\"11\" text-anchor=\"middle\">micro-controller, firmware, DRAM cache,</text><text x=\"260\" y=\"141\" font-size=\"11\" text-anchor=\"middle\">flash chips or platters</text><text x=\"420\" y=\"127\" font-size=\"11.5\" text-anchor=\"start\" class=\"t-purple\">internals</text><text x=\"420\" y=\"141\" font-size=\"10.5\" text-anchor=\"start\">(hidden)</text><text x=\"14\" y=\"58\" font-size=\"12\" text-anchor=\"start\" font-weight=\"700\">OS driver</text><line x1=\"80\" y1=\"64\" x2=\"118\" y2=\"64\" class=\"s-blue\" stroke-width=\"1.6\"/><path d=\"M126 64 L118 68 L118 60 Z\" class=\"f-blue\"/><text x=\"14\" y=\"76\" font-size=\"10.5\" text-anchor=\"start\">reads / writes</text><text x=\"14\" y=\"90\" font-size=\"10.5\" text-anchor=\"start\">registers</text></svg>",
          alt: 'A device drawn as a box. Its top half is the interface: Status, Command and Data registers that the OS driver reads and writes. Its bottom half is hidden internals: a micro-controller, firmware, a DRAM cache and flash chips or platters.',
          caption: 'The canonical device. The OS only ever sees the registers; the firmware and media behind them are the device maker\'s business.',
          maxWidth: 520,
        },
        {
          type: 'p',
          text: "The CPU reaches those registers in one of two ways. Older x86 devices use **port-mapped I/O**: special `in` and `out` instructions with their own small address space. Almost everything modern uses [[memory-mapped-io]]: the registers have physical addresses, so ordinary loads and stores reach the device. Either way, these instructions or addresses are only usable in [[kernel-mode]]: `in`/`out` are privileged, and device addresses are simply never mapped into a user process's page tables.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why your game cannot talk to the SSD directly',
          text: "If every program could program the disk controller, any bug (or any cheat) could overwrite another program's files, the file system's own bookkeeping, or the kernel itself. Sharing would be impossible too: two programs sending commands to one device at once would corrupt each other's requests. Funnelling every request through the kernel gives one place to check permissions, one queue per device, and one cache in front of it. The price is a [[system-call]] per request, which is exactly the overhead that newer APIs such as io_uring and DirectStorage work to shrink (you will meet them in the last lesson of this unit).",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The canonical protocol, and what it wastes',
      blocks: [
        {
          type: 'p',
          text: 'The simplest way for a driver to use such a device is four steps: wait until the device is idle, hand it the data, give it a command, and wait until it has finished. Here is that protocol as kernel-style C++ (a sketch: real kernel code is C, and the registers come from the device\'s datasheet):',
        },
        {
          type: 'code',
          title: 'polling_driver.cpp (kernel sketch, not runnable)',
          code: `struct DeviceRegs {               // mapped at a physical address
    volatile std::uint32_t status;    // bit 0: BUSY
    volatile std::uint32_t command;
    volatile std::uint32_t data;
};
constexpr std::uint32_t BUSY = 1;

void writeSector(DeviceRegs* dev, const std::uint32_t* words,
                 int count, std::uint32_t cmd) {
    while (dev->status & BUSY) {}     // 1. wait until idle
    for (int i = 0; i < count; ++i)   // 2. copy the data in,
        dev->data = words[i];         //    one word at a time
    dev->command = cmd;               // 3. start the operation
    while (dev->status & BUSY) {}     // 4. wait until it is done
}`,
          annotations: [
            { lines: '1-5', text: 'The registers are `volatile` because the device, not this code, changes `status`. The compiler must load it on every loop iteration.' },
            { lines: 10, text: '**Polling**: the CPU spins on the status register. While the device is busy with someone else\'s request, a whole core does nothing useful.' },
            { lines: '11-12', text: '**Programmed I/O (PIO)**: the CPU moves every word itself. Each store crosses the bus to the device, so a 4 KiB sector costs a thousand slow uncached stores.' },
            { lines: 14, text: 'Polling again, for the entire duration of the operation: milliseconds on a hard disk, during which this core could have run millions of instructions of game code.' },
          ],
        },
        {
          type: 'p',
          text: 'Two inefficiencies hide in those four steps, and the two classic hardware features each fix one of them:',
        },
        {
          type: 'table',
          headers: ['Waste', 'Fix', 'What the OS gains'],
          rows: [
            ['Spinning on `status` (steps 1 and 4)', 'An [[hardware-interrupt|interrupt]] when the device finishes', 'The waiting thread can sleep while another one runs'],
            ['Copying every word by hand (step 2)', '[[direct-memory-access|DMA]]: the device copies to or from RAM itself', 'The CPU only describes the transfer and handles the completion'],
          ],
        },
        {
          type: 'p',
          text: 'The Computer Architecture course showed both mechanisms from the hardware side, including when polling still wins (very fast devices, or events that arrive constantly). The rest of this lesson looks at what the **kernel** has to do around them.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'A driver already uses interrupts instead of polling, but profiling shows the CPU still spends most of an I/O operation inside the driver. Which change helps most?',
      options: [
        { text: 'Raise the interrupt priority of the device', why: 'Priority decides which handler runs first when several are pending. It does not change how much work the CPU does per transfer.' },
        { text: 'Switch the transfer from programmed I/O to DMA', correct: true, why: 'With PIO the CPU itself copies every word to the device register, so it is busy for the whole transfer even if it never polls. DMA hands the copying to the device.' },
        { text: 'Go back to polling, because interrupts are expensive', why: 'Polling makes the waiting cost worse, and does nothing about the copying cost, which is where the time goes here.' },
        { text: 'Use a larger CPU cache', why: 'Device registers are uncached memory-mapped I/O. A bigger cache does not make stores to them faster.' },
      ],
      explanation: 'Interrupts and DMA solve different problems. Interrupts remove the *waiting* (steps 1 and 4 of the protocol); DMA removes the *copying* (step 2). A driver that interrupts but still moves data word by word through a register keeps the CPU busy for the entire transfer.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'A blocking read, from the kernel\'s side',
      blocks: [
        {
          type: 'p',
          text: "Here is what really happens when your loader thread calls `read` on a file whose data is not in memory. The key move is step 4: the kernel does not wait. It marks the thread **blocked**, puts it on a wait queue attached to the request, and lets the scheduler run something else through an ordinary [[context-switch]]. The interrupt later turns the blocked thread back into a ready one.",
        },
        {
          "type": "algo",
          "view": "graph",
          "width": 430,
          "height": 250,
          "interval": 1500,
          "caption": "One blocking `read()` that misses the page cache, from the OS's side.",
          "nodes": [
            {
              "id": "A",
              "x": 70,
              "y": 50,
              "label": "loader"
            },
            {
              "id": "K",
              "x": 215,
              "y": 50,
              "label": "kernel"
            },
            {
              "id": "DRV",
              "x": 360,
              "y": 50,
              "label": "driver"
            },
            {
              "id": "SSD",
              "x": 360,
              "y": 200,
              "label": "SSD"
            },
            {
              "id": "S",
              "x": 215,
              "y": 200,
              "label": "sched"
            },
            {
              "id": "B",
              "x": 70,
              "y": 200,
              "label": "game"
            }
          ],
          "edges": [
            {
              "to": "K",
              "from": "A"
            },
            {
              "to": "DRV",
              "from": "K"
            },
            {
              "to": "SSD",
              "from": "DRV"
            },
            {
              "to": "S",
              "from": "K"
            },
            {
              "to": "B",
              "from": "S"
            },
            {
              "to": "A",
              "from": "S"
            }
          ],
          "frames": [
            {
              "note": "The loader thread calls `read(fd, buf, 65536)`. A trap switches the CPU into the kernel.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "orange"
                },
                {
                  "id": "K",
                  "color": "blue"
                }
              ],
              "edgeColors": [
                {
                  "from": "A",
                  "to": "K",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "read()"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "running"
                ],
                [
                  "game thread",
                  "ready"
                ],
                [
                  "CPU runs",
                  "loader"
                ]
              ]
            },
            {
              "note": "The page cache misses, so the file system maps the file offset to disk blocks and builds a request.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "gray"
                },
                {
                  "id": "K",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "K",
                  "to": "DRV",
                  "color": "blue"
                }
              ],
              "nodeNotes": [
                {
                  "id": "K",
                  "text": "cache miss"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "in kernel"
                ],
                [
                  "game thread",
                  "ready"
                ],
                [
                  "CPU runs",
                  "loader (kernel)"
                ]
              ]
            },
            {
              "note": "The driver writes a command into the NVMe submission queue and rings the doorbell register.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "gray"
                },
                {
                  "id": "DRV",
                  "color": "orange"
                },
                {
                  "id": "SSD",
                  "color": "blue"
                }
              ],
              "edgeColors": [
                {
                  "from": "DRV",
                  "to": "SSD",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "DRV",
                  "text": "doorbell"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "in kernel"
                ],
                [
                  "game thread",
                  "ready"
                ],
                [
                  "CPU runs",
                  "loader (kernel)"
                ]
              ]
            },
            {
              "note": "Nothing to do until the data arrives, so the kernel **blocks** the loader on a wait queue and calls the scheduler.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "red"
                },
                {
                  "id": "S",
                  "color": "orange"
                },
                {
                  "id": "SSD",
                  "color": "blue"
                }
              ],
              "edgeColors": [
                {
                  "from": "K",
                  "to": "S",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "blocked"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "blocked"
                ],
                [
                  "game thread",
                  "ready"
                ],
                [
                  "CPU runs",
                  "scheduler"
                ]
              ]
            },
            {
              "note": "The scheduler switches to the game thread. Meanwhile the SSD DMAs the 64 KiB straight into RAM.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "red"
                },
                {
                  "id": "B",
                  "color": "green"
                },
                {
                  "id": "SSD",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "S",
                  "to": "B",
                  "color": "green"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "blocked"
                },
                {
                  "id": "SSD",
                  "text": "DMA…"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "blocked"
                ],
                [
                  "game thread",
                  "running"
                ],
                [
                  "CPU runs",
                  "game"
                ]
              ]
            },
            {
              "note": "Done: the SSD raises an **interrupt**. The CPU pauses the game thread and runs the driver's handler.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "red"
                },
                {
                  "id": "B",
                  "color": "gray"
                },
                {
                  "id": "DRV",
                  "color": "orange"
                },
                {
                  "id": "SSD",
                  "color": "green"
                }
              ],
              "edgeColors": [
                {
                  "from": "DRV",
                  "to": "SSD",
                  "color": "red"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "blocked"
                },
                {
                  "id": "DRV",
                  "text": "ISR"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "blocked"
                ],
                [
                  "game thread",
                  "interrupted"
                ],
                [
                  "CPU runs",
                  "interrupt handler"
                ]
              ]
            },
            {
              "note": "The handler (or its deferred half) completes the request and **wakes** the loader: it moves to the ready queue.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "blue"
                },
                {
                  "id": "B",
                  "color": "green"
                },
                {
                  "id": "DRV",
                  "color": "gray"
                }
              ],
              "edgeColors": [
                {
                  "from": "S",
                  "to": "A",
                  "color": "blue"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "ready"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "ready"
                ],
                [
                  "game thread",
                  "running"
                ],
                [
                  "CPU runs",
                  "game"
                ]
              ]
            },
            {
              "note": "At the next scheduling decision the loader runs again and `read` returns 65536. The game thread lost only the interrupt time.",
              "nodeColors": [
                {
                  "id": "A",
                  "color": "green"
                },
                {
                  "id": "B",
                  "color": "blue"
                }
              ],
              "edgeColors": [
                {
                  "from": "A",
                  "to": "K",
                  "color": "green"
                }
              ],
              "nodeNotes": [
                {
                  "id": "A",
                  "text": "65536"
                }
              ],
              "vars": [
                [
                  "loader thread",
                  "running"
                ],
                [
                  "game thread",
                  "ready"
                ],
                [
                  "CPU runs",
                  "loader"
                ]
              ]
            }
          ]
        },
        {
          type: 'p',
          text: "This is why I/O-heavy and CPU-heavy work overlap so well: while the SSD works, the game thread keeps simulating. From your C++ code's point of view, though, `read` simply took a while. A blocking call is synchronous for the *calling thread*, not for the machine.",
        },
        {
          type: 'heading',
          text: 'Top halves and bottom halves',
        },
        {
          type: 'p',
          text: "An interrupt handler runs at an awkward moment: it has preempted whatever was running, it cannot sleep, and while it runs, further interrupts on that CPU may be held off. So kernels split interrupt handling in two. The **top half** (Linux's hard IRQ handler, Windows' ISR) does the minimum: acknowledge the device, note which requests finished. The **bottom half** does the rest later, with interrupts enabled: Linux uses softirqs, tasklets, workqueues or threaded IRQs; Windows queues a *Deferred Procedure Call* (DPC). Completing the request and waking the waiting thread happens there.",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output: interrupt counts on a Linux 6.18 VM (excerpt)',
          code: `$ cat /proc/interrupts
           CPU0       CPU1
 26:          6          0  IO-APIC   4-edge      ttyS0
 36:          0      15923  PCI-MSIX-0000:00:02.0   1-edge   virtio1-req.0
LOC:      80400      79354   Local timer interrupts`,
          annotations: [
            { lines: 3, text: 'The serial port: six interrupts since boot.' },
            { lines: 4, text: 'The virtual disk\'s request queue. It uses MSI-X (an interrupt delivered as a memory write over PCIe) and is steered to CPU1, so all 15,923 completions landed there.' },
            { lines: 5, text: 'The local timer that drives scheduling ticks, for comparison.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'When the device is faster than the interrupt',
          text: "A context switch plus an interrupt costs a few microseconds. A fast NVMe SSD can answer a 4 KiB read in about ten. At that scale, sleeping and being woken is a noticeable fraction of the latency, so Linux can *poll* NVMe completion queues for latency-critical I/O, and networking code switches between interrupts and polling depending on load. The trade-off from the hardware course reappears at OS level: polling burns a core, interrupts add latency.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'order',
      prompt: 'Put the life of a blocking `read()` that misses the page cache in order.',
      linesAreCode: false,
      lines: [
        'The thread traps into the kernel, and the page cache has no copy of the data',
        'The driver places a command in the device\'s queue and rings its doorbell register',
        'While the transfer is in progress, the kernel blocks the thread and switches to another one',
        'The device finishes moving the data into RAM by DMA and raises an interrupt',
        'The interrupt handling code completes the request and makes the thread ready',
        'The scheduler runs the thread again and read() returns the byte count',
      ],
      distractors: ['The CPU copies the data from the device\'s data register into the buffer'],
      explanation: "Each step needs the previous one: there is no request to submit before the cache misses, nothing to wait for before submitting, no completion to signal before the transfer ends, and nothing to return before the thread is woken and scheduled. Waking a thread does not run it immediately: it joins the ready queue, and the scheduler decides when. The distractor describes programmed I/O, which modern storage does not use: the SSD writes RAM itself by DMA.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'DMA from the kernel\'s side',
      blocks: [
        {
          type: 'p',
          text: "DMA looks simple from the hardware side: give the device an address and a length. But the device speaks **physical** (bus) addresses, while your buffer lives at a [[virtual-address]] that only makes sense through your process's [[page-table]]. Before the kernel can let a device write into your `std::vector`, it has to deal with four problems:",
        },
        {
          type: 'table',
          headers: ['Problem', 'What the kernel does'],
          rows: [
            ['The buffer\'s pages could be swapped out or moved while the device writes them', '**Pins** the pages: marks them unmovable until the transfer completes'],
            ['A 64 KiB buffer that is contiguous in virtual memory may sit in 16 scattered physical frames', 'Builds a **scatter-gather list** of (physical address, length) pairs, which NVMe and most devices accept'],
            ['A buggy or malicious device could DMA anywhere in RAM', 'Programs the **IOMMU**, a page table for devices, so it can only reach the buffers it was given'],
            ['The CPU cache may hold stale copies of the buffer', 'On x86, PCIe DMA is cache-coherent; on many ARM systems the driver must flush or invalidate the cache by hand'],
          ],
        },
        {
          type: 'p',
          text: "Most of the time the kernel avoids all of this for ordinary `read` calls: the device DMAs into the kernel's own page cache, and the kernel then copies from there into your buffer. That extra copy is cheap compared with the disk and makes caching possible. Programs that want to skip it (databases, some engine streaming systems) ask for *direct I/O*, and then they inherit the rules: aligned buffers, sizes in whole sectors. The last lesson of this unit returns to that trade-off.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'DMA attacks',
          text: "Before IOMMUs were common, a device plugged into an external port with DMA access (FireWire, later Thunderbolt) could read all of RAM, including disk-encryption keys, without the OS noticing. Windows' *Kernel DMA Protection* and Linux's IOMMU support exist to close exactly this hole. It is a good example of a recurring OS theme: every agent that can touch memory, CPU or device, needs a translation layer the kernel controls.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'If a 16 KiB I/O buffer occupies four consecutive virtual pages, the kernel can give the device one physical start address and a length of 16 KiB.',
      answer: false,
      explanation: "Consecutive virtual pages can map to any four physical frames, in any order. The kernel looks up each page's frame and hands the device a scatter-gather list with up to four (address, length) entries, or programs the IOMMU so that a contiguous *device* address range maps onto the scattered frames. Assuming physical contiguity is a classic driver bug that silently corrupts whatever happens to live in the next frame.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Device drivers: most of the kernel, most of the crashes',
      blocks: [
        {
          type: 'definition',
          term: 'Device driver',
          text: 'Kernel code that knows one device\'s registers and protocol and presents it to the rest of the kernel through a generic interface: a block device, a network interface, a character device. The rest of the kernel never needs to know which SSD you bought.',
        },
        {
          type: 'p',
          text: 'Every kind of device needs its own [[device-driver]], so drivers pile up. OSTEP cites studies finding that **over 70% of Linux\'s source code is drivers**. That code is also the least tested: a driver may run on only a few thousand machines with that exact hardware, and is often written by the device vendor rather than kernel experts. Chou et al. (2001) found error rates in Linux drivers several times higher than in the rest of the kernel, and Swift et al. (2003) reported that drivers caused **85% of recent Windows XP crashes**.',
        },
        {
          type: 'p',
          text: 'Here is how a Linux driver plugs into the kernel: it fills in a table of function pointers, and the generic file layer calls them when someone uses the device file.',
        },
        {
          type: 'code',
          title: 'gamepad_driver.c (Linux kernel C sketch, not runnable here)',
          code: `static ssize_t pad_read(struct file* f, char __user* buf,
                        size_t len, loff_t* off) {
    struct pad_state s;
    if (len < sizeof s)
        return -EINVAL;
    read_pad_registers(&s);           // talk to the hardware
    if (copy_to_user(buf, &s, sizeof s))
        return -EFAULT;               // bad user pointer
    return sizeof s;
}

static const struct file_operations pad_fops = {
    .owner = THIS_MODULE,
    .read  = pad_read,                // called for read(fd, ...)
};`,
          annotations: [
            { lines: 1, text: '`__user` marks a pointer that came from a user process. The kernel must never dereference it directly: the process could pass any address at all, including one inside the kernel.' },
            { lines: '4-5', text: 'Errors are returned as negative `errno` values; the system call layer turns `-EINVAL` into `-1` with [[errno]] set to `EINVAL` in your process.' },
            { lines: '7-8', text: '`copy_to_user` checks the destination and handles a fault safely. A plain `memcpy` here would let any program crash, or take over, the kernel.' },
            { lines: '12-15', text: 'This table is the driver\'s whole contract with the rest of the kernel. It is the C version of a C++ virtual function table: the generic layer calls through it without knowing which driver is behind it.' },
          ],
        },
        {
          type: 'p',
          text: "In a [[monolithic-kernel]] such as Linux or Windows, that driver runs in kernel mode with the kernel's full privileges. A null-pointer dereference that would merely crash your game takes down the whole machine. On **19 July 2024**, a faulty content update read by CrowdStrike's Falcon security driver crashed about 8.5 million Windows PCs (Microsoft's estimate), grounding flights and closing hospital systems, because the driver loaded at boot and crashed every time.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Anti-cheat drivers',
          text: "Kernel-level anti-cheat systems such as Riot Vanguard, Easy Anti-Cheat and BattlEye install drivers for the same reason security software does: a cheat running in kernel mode can hide from anything in user mode, so the defender wants equal privilege. The cost is the same too. Their code runs with full kernel privileges on millions of players' machines, so a bug there is a blue screen, and a vulnerability there is a way into the kernel. Studios weigh that risk every time they ship one.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Containing drivers',
          text: "Systems fight back in several ways. A [[microkernel]] runs drivers as ordinary user processes, so a crashing driver is restarted instead of crashing the system; QNX and seL4 do this, and it is one reason microkernels are popular in safety-critical and military embedded systems. Windows moves many drivers into user mode with the User-Mode Driver Framework, requires kernel drivers to be signed, and ships *Driver Verifier* to stress-test them. Linux has accepted Rust as a second kernel language, with drivers as the first users (initial support merged in 6.1, late 2022), to rule out whole classes of memory bugs. All of these trade some performance or flexibility for isolation.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'Your game dereferences a dangling pointer and crashes, but the PC keeps running. A graphics driver does the same thing and the PC shows a blue screen. What is the essential difference?',
      options: [
        { text: 'Drivers are written in C, which has no exceptions', why: 'Your game\'s bug was not caught by an exception either: a bad dereference is undefined behavior in C++ too, and it crashed the process.' },
        { text: 'The driver runs in kernel mode, inside the one address space that every process depends on', correct: true, why: 'A user process has its own address space; the OS can kill it and reclaim its resources. A fault in kernel mode means the kernel itself may be corrupt, so the only safe response is to stop the machine.' },
        { text: 'The GPU raised an interrupt that could not be handled', why: 'The crash is a software fault in the CPU running driver code. The device did nothing wrong.' },
        { text: 'Windows treats graphics drivers as more important than games', why: 'Importance has nothing to do with it. The difference is privilege: what the faulting code was able to touch.' },
      ],
      explanation: 'Isolation is per address space and per privilege level. A user-mode fault is contained by the hardware and handled by the kernel: it kills the process, closes its handles, frees its memory. A kernel-mode fault has no one above it to clean up, and the kernel cannot know what the buggy code already overwrote. This is the whole case for running drivers outside the kernel, and why Windows moved most graphics driver code into user mode, so that only a small kernel part can blue-screen the PC.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'The I/O stack',
      blocks: [
        {
          type: 'p',
          text: "Between your `read` call and the flash chips sit several layers, each hiding the details of the one below. Linux and Windows draw the lines in slightly different places, but the stack has the same shape:",
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 378\" xmlns=\"http://www.w3.org/2000/svg\"><text x=\"282\" y=\"16\" font-size=\"12\" text-anchor=\"middle\" font-weight=\"700\">Linux</text><text x=\"432\" y=\"16\" font-size=\"12\" text-anchor=\"middle\" font-weight=\"700\">Windows</text><rect x=\"14\" y=\"24\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"24\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.5\"/><text x=\"24\" y=\"47\" font-size=\"12\" text-anchor=\"start\" class=\"t-blue\" font-weight=\"700\">Your game</text><text x=\"282\" y=\"47\" font-size=\"11\" text-anchor=\"middle\">read(fd, buf, n)</text><text x=\"432\" y=\"47\" font-size=\"11\" text-anchor=\"middle\">ReadFile(h, buf, …)</text><line x1=\"60\" y1=\"60\" x2=\"60\" y2=\"66\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 72 L56.5 66 L63.5 66 Z\" class=\"f-gray\"/><rect x=\"14\" y=\"72\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"72\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.5\"/><text x=\"24\" y=\"95\" font-size=\"12\" text-anchor=\"start\" class=\"t-blue\" font-weight=\"700\">C/C++ runtime</text><text x=\"282\" y=\"95\" font-size=\"11\" text-anchor=\"middle\">glibc, libstdc++</text><text x=\"432\" y=\"95\" font-size=\"11\" text-anchor=\"middle\">UCRT, MSVC STL</text><line x1=\"60\" y1=\"108\" x2=\"60\" y2=\"126\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 132 L56.5 126 L63.5 126 Z\" class=\"f-gray\"/><text x=\"80\" y=\"124\" font-size=\"10.5\" text-anchor=\"start\" class=\"t-red\">system call boundary: user mode above, kernel mode below</text><line x1=\"392\" y1=\"120\" x2=\"506\" y2=\"120\" class=\"s-red\" stroke-width=\"1.4\" stroke-dasharray=\"5 4\"/><rect x=\"14\" y=\"132\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-purple\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"132\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.5\"/><text x=\"24\" y=\"155\" font-size=\"12\" text-anchor=\"start\" class=\"t-purple\" font-weight=\"700\">Generic file layer</text><text x=\"282\" y=\"155\" font-size=\"11\" text-anchor=\"middle\">VFS</text><text x=\"432\" y=\"155\" font-size=\"11\" text-anchor=\"middle\">I/O Manager (IRPs)</text><line x1=\"60\" y1=\"168\" x2=\"60\" y2=\"174\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 180 L56.5 174 L63.5 174 Z\" class=\"f-gray\"/><rect x=\"14\" y=\"180\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"180\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-green\" stroke-width=\"1.5\"/><text x=\"24\" y=\"203\" font-size=\"12\" text-anchor=\"start\" class=\"t-green\" font-weight=\"700\">File system + cache</text><text x=\"282\" y=\"203\" font-size=\"11\" text-anchor=\"middle\">ext4, XFS · page cache</text><text x=\"432\" y=\"203\" font-size=\"11\" text-anchor=\"middle\">NTFS · Cache Manager</text><line x1=\"60\" y1=\"216\" x2=\"60\" y2=\"222\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 228 L56.5 222 L63.5 222 Z\" class=\"f-gray\"/><rect x=\"14\" y=\"228\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-teal\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"228\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-teal\" stroke-width=\"1.5\"/><text x=\"24\" y=\"251\" font-size=\"12\" text-anchor=\"start\" class=\"t-teal\" font-weight=\"700\">Block layer</text><text x=\"282\" y=\"251\" font-size=\"11\" text-anchor=\"middle\">blk-mq, I/O scheduler</text><text x=\"432\" y=\"251\" font-size=\"11\" text-anchor=\"middle\">volume, disk.sys</text><line x1=\"60\" y1=\"264\" x2=\"60\" y2=\"270\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 276 L56.5 270 L63.5 270 Z\" class=\"f-gray\"/><rect x=\"14\" y=\"276\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"276\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.5\"/><text x=\"24\" y=\"299\" font-size=\"12\" text-anchor=\"start\" class=\"t-orange\" font-weight=\"700\">Device driver</text><text x=\"282\" y=\"299\" font-size=\"11\" text-anchor=\"middle\">nvme, ahci</text><text x=\"432\" y=\"299\" font-size=\"11\" text-anchor=\"middle\">storport + stornvme</text><line x1=\"60\" y1=\"312\" x2=\"60\" y2=\"330\" class=\"s-gray\" stroke-width=\"1.4\"/><path d=\"M60 336 L56.5 330 L63.5 330 Z\" class=\"f-gray\"/><text x=\"80\" y=\"328\" font-size=\"10.5\" text-anchor=\"start\" class=\"t-gray\">hardware boundary: MMIO, DMA, interrupts</text><line x1=\"300\" y1=\"324\" x2=\"506\" y2=\"324\" class=\"s-gray\" stroke-width=\"1.2\" stroke-dasharray=\"2 3\"/><rect x=\"14\" y=\"336\" width=\"492\" height=\"36\" rx=\"4\" class=\"f-gray\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"336\" width=\"492\" height=\"36\" rx=\"4\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.5\"/><text x=\"24\" y=\"359\" font-size=\"12\" text-anchor=\"start\" class=\"t-gray\" font-weight=\"700\">Hardware</text><text x=\"330\" y=\"359\" font-size=\"11\" text-anchor=\"middle\">NVMe SSD or SATA disk: registers, DMA, interrupts</text></svg>",
          alt: 'Seven stacked layers from the game down to the hardware: the game, the C/C++ runtime, then the system call boundary, then the generic file layer (VFS on Linux, the I/O Manager with IRPs on Windows), the file system and cache, the block layer, the device driver, then the hardware boundary and the device.',
          caption: 'The I/O stack. Everything above the red line runs in your process; everything below runs in the kernel and is shared by all processes.',
        },
        {
          type: 'list',
          items: [
            "The **generic file layer** gives one API for every file system. Linux calls it the [[vfs]]: every file system supplies the same set of operations (open, read, write, lookup…), much like the driver table above. On Windows, the **I/O Manager** packages each request as an *I/O request packet* (IRP) and passes it down a stack of drivers. Filter drivers can sit in that stack: antivirus scanners, backup tools and anti-cheat systems inspect file I/O this way.",
            '**File systems** turn "bytes 0 to 65,535 of `level3.pak`" into "disk blocks 811,200 to 811,215", and they own the file cache (the next lessons cover both).',
            'The **block layer** queues, merges and schedules requests to each disk, regardless of which file system produced them.',
            'The **driver** turns block requests into commands for one controller: NVMe, SATA (AHCI), USB storage.',
          ],
        },
        {
          type: 'p',
          text: "Unix sorts devices into three families. A [[block-device]] (a disk) is read and written in fixed-size blocks at any position, and its data can be cached. A **character device** (a terminal, a mouse, `/dev/null`) is a stream of bytes. **Network devices** are a third family, reached through sockets rather than files. You can see the first two in `/dev`:",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output: device files on a Linux VM',
          code: `$ ls -l /dev/vda /dev/loop0 /dev/null /dev/tty
brw------- 1 root root 254, 0 Nov 19 21:47 /dev/vda
brw------- 1 root root   7, 0 Nov 19 21:47 /dev/loop0
crw-rw-rw- 1 root root   1, 3 Nov 19 21:47 /dev/null
crw-rw-rw- 1 root root   5, 0 Nov 19 21:47 /dev/tty`,
          annotations: [
            { lines: '2-3', text: 'The leading `b` marks a block device: the virtual disk and a loop device (a file pretending to be a disk). Only root may open them, because raw disk access bypasses every file permission.' },
            { lines: '4-5', text: 'A leading `c` marks a character device. Anyone may write to `/dev/null`.' },
            { lines: '2-5', text: 'The two numbers are the *major* number (which driver) and the *minor* number (which device that driver manages). Opening the file routes your `read` and `write` calls to that driver\'s operations table.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the description of the I/O stack.',
      templateIsCode: false,
      template: 'An SSD appears to the kernel as a ___ device, read and written in fixed-size units at any position. A keyboard is a ___ device: a stream of bytes. The code that knows one controller\'s registers is its ___, and on Linux the layer that gives every file system the same API is the ___.',
      blanks: [
        { answers: ['block'] },
        { answers: ['character'] },
        { answers: ['driver', 'device driver'] },
        { answers: ['VFS', 'vfs'] },
      ],
      wordBank: ['block', 'character', 'driver', 'VFS', 'network', 'page cache', 'firmware'],
      explanation: "Block devices are addressable and cacheable, which is why file systems live on them; character devices deliver bytes in order and usually cannot seek. The driver hides one controller's protocol behind a generic interface, and the VFS hides each file system's on-disk format behind generic file operations. Firmware runs *inside* the device, below the interface the OS sees, and the page cache is part of the file layer, not the device.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'Disks and SSDs: what the OS has to care about',
      blocks: [
        {
          type: 'p',
          text: "You met the hardware in the architecture course. For the OS, what matters is the **cost model**, because file systems and schedulers are built around it.",
        },
        {
          type: 'p',
          text: "A **hard disk** pays a mechanical price for every random access: a *seek* to move the arm to the right track, then *rotational latency* while the sector spins under the head, then the transfer itself. For a random 4 KiB read the first two dominate completely:",
        },
        {
          type: 'definition',
          term: 'HDD access time',
          text: '`T_io = T_seek + T_rotation + T_transfer`. Average rotational latency is half a rotation: 60 / rpm / 2 seconds. Random I/O per second is `1 / T_io`.',
        },
        {
          type: 'p',
          text: "So a disk that streams 200 MB/s sequentially manages well under 1 MB/s of random 4 KiB reads. Everything clever in classic file systems, from placing a directory's files near each other (BSD's Fast File System and its *cylinder groups*) to the elevator scheduler below, exists to turn random I/O into sequential I/O.",
        },
        {
          type: 'p',
          text: "An **SSD** has no arm, so random reads are cheap, but flash has its own rules. It reads and writes in *pages* of a few KiB, cannot overwrite a page in place, and can only erase whole *erase blocks* of hundreds of pages. A [[flash-translation-layer]] in the SSD's firmware therefore writes every update to a fresh page, remaps the address, and garbage-collects old blocks in the background. Three consequences reach the OS:",
        },
        {
          type: 'table',
          headers: ['SSD property', 'What the OS does about it'],
          rows: [
            ['The drive cannot know which blocks a file system no longer uses', 'Sends **TRIM** (ATA) or **Deallocate** (NVMe) commands for freed blocks: Linux `fstrim` or the `discard` mount option, Windows "Optimize Drives"'],
            ['Internal parallelism across many flash chips', 'Keeps many requests in flight: NVMe\'s many deep queues, one per CPU core in Linux\'s multi-queue block layer'],
            ['Writes smaller than a flash page cost a read-modify-write', 'Aligns partitions and file-system blocks to 4 KiB (or larger) boundaries'],
            ['Flash cells wear out after a limited number of erases', 'Avoids needless writes; the firmware spreads wear across blocks'],
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Atomic sectors',
          text: 'Disks promise only that a *single sector* (512 bytes or 4 KiB) is written completely or not at all when the power fails. Anything bigger can be torn: half old, half new. Keep this in mind: it is the foundation of crash consistency in the file-system lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'numeric',
      prompt: 'A server hard disk has an average seek time of **4 ms**, spins at **10,000 rpm** and transfers **200 MB/s** (use 1 MB = 10^6 bytes). How many random **4 KiB** (4,096-byte) reads can it serve per second? Round to the nearest whole number.',
      hint: 'Average rotational latency is half of 60 / 10,000 s. The transfer of 4,096 bytes at 200 MB/s is tiny but count it.',
      answer: 142,
      tolerance: 1,
      unit: 'reads/s',
      explanation: 'One rotation takes 60 / 10,000 s = 6 ms, so the average rotational latency is 3 ms. The transfer takes 4,096 / 200,000,000 s ≈ 0.02 ms. So `T_io` ≈ 4 + 3 + 0.02 = 7.02 ms, and 1 / 7.02 ms ≈ **142** reads per second, about 0.58 MB/s. The same disk streams 200 MB/s sequentially: random access is over 300 times slower, which is why HDD-era games stored each level\'s assets contiguously.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'I/O scheduling',
      blocks: [
        {
          type: 'p',
          text: "When many requests wait for a hard disk, the order matters enormously. **FCFS** (first come, first served) sends the arm zig-zagging. **SSTF** (shortest seek time first) always picks the nearest track: fast, but a steady stream of nearby requests can starve a far-away one forever. The **elevator** family (SCAN, and its practical variant LOOK) sweeps the arm in one direction serving everything on the way, then reverses, so every request is reached within two sweeps:",
        },
        {
          "type": "algo",
          "view": "array",
          "caption": "The elevator (LOOK) disk scheduler on a queue of track numbers.",
          "code": "sort(pending); start = head\nfor t in pending where t >= start:  // sweep up\n    moved += t - head; head = t\nfor t in pending where t < start, descending:\n    moved += head - t; head = t",
          "interval": 1100,
          "frames": [
            {
              "note": "The head is at track **53** (purple) with eight requests pending. Sort them by track number.",
              "array": [
                14,
                37,
                53,
                65,
                67,
                98,
                122,
                124,
                183
              ],
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                }
              ],
              "pointers": [
                {
                  "index": 2,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                1
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "0"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **65**, moving 12 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 3,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "12"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **67**, moving 2 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 4,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "14"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **98**, moving 31 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 5,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "45"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **122**, moving 24 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 6,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "69"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **124**, moving 2 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 7,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 7,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "71"
                ]
              ]
            },
            {
              "note": "Sweep up: serve track **183**, moving 59 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 7,
                  "color": "green"
                },
                {
                  "index": 8,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 8,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                2,
                3
              ],
              "vars": [
                [
                  "direction",
                  "up"
                ],
                [
                  "tracks moved",
                  "130"
                ]
              ]
            },
            {
              "note": "Nothing is left above, so reverse (LOOK turns at the last request instead of the disk edge). Serve **37**: 146 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 7,
                  "color": "green"
                },
                {
                  "index": 8,
                  "color": "green"
                },
                {
                  "index": 1,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 1,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                4,
                5
              ],
              "vars": [
                [
                  "direction",
                  "down"
                ],
                [
                  "tracks moved",
                  "276"
                ]
              ]
            },
            {
              "note": "Sweep down: serve track **14**, moving 23 tracks.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 1,
                  "color": "green"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 7,
                  "color": "green"
                },
                {
                  "index": 8,
                  "color": "green"
                },
                {
                  "index": 0,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "lines": [
                4,
                5
              ],
              "vars": [
                [
                  "direction",
                  "down"
                ],
                [
                  "tracks moved",
                  "299"
                ]
              ]
            },
            {
              "note": "All served after **299** tracks. FCFS order would need 640; SSTF gets 236 here but can starve far-away requests.",
              "marks": [
                {
                  "index": 2,
                  "color": "purple"
                },
                {
                  "index": 0,
                  "color": "green"
                },
                {
                  "index": 1,
                  "color": "green"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 7,
                  "color": "green"
                },
                {
                  "index": 8,
                  "color": "green"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "head",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "direction",
                  "done"
                ],
                [
                  "tracks moved",
                  "299"
                ]
              ]
            }
          ]
        },
        {
          type: 'code',
          runnable: true,
          title: 'disk_sched.cpp',
          code: "#include <algorithm>\n#include <cstdio>\n#include <cstdlib>\n#include <vector>\n\n// Total head movement (in tracks) to serve a request queue.\nusing Queue = std::vector<int>;\n\nint fcfs(int head, Queue q) {\n    int moved = 0;\n    for (int t : q) { moved += std::abs(t - head); head = t; }\n    return moved;\n}\n\nint sstf(int head, Queue q) {          // nearest request next\n    int moved = 0;\n    while (!q.empty()) {\n        auto it = std::min_element(q.begin(), q.end(),\n            [head](int a, int b) {\n                return std::abs(a - head) < std::abs(b - head);\n            });\n        moved += std::abs(*it - head);\n        head = *it;\n        q.erase(it);\n    }\n    return moved;\n}\n\nint look(int head, Queue q) {   // elevator: sweep up, then down\n    std::sort(q.begin(), q.end());\n    const int start = head;\n    int moved = 0;\n    for (int t : q)                               // upward pass\n        if (t >= start) { moved += t - head; head = t; }\n    for (auto it = q.rbegin(); it != q.rend(); ++it)  // downward\n        if (*it < start) { moved += head - *it; head = *it; }\n    return moved;\n}\n\nint main() {\n    const Queue q{98, 183, 37, 122, 14, 124, 65, 67};\n    const int head = 53;\n    std::printf(\"FCFS  %d tracks\\n\", fcfs(head, q));\n    std::printf(\"SSTF  %d tracks\\n\", sstf(head, q));\n    std::printf(\"LOOK  %d tracks\\n\", look(head, q));\n}",
          output: "FCFS  640 tracks\nSSTF  236 tracks\nLOOK  299 tracks",
          annotations: [
            { lines: 11, text: 'FCFS: serve in arrival order, paying whatever distance the next request happens to be.' },
            { lines: '18-21', text: 'SSTF: pick the pending request closest to the current head position. Greedy, so it is not optimal either, and it can starve requests at the edges.' },
            { lines: '33-36', text: 'LOOK: one upward pass over the sorted queue from the starting position, then one downward pass. Comparing against `start`, not the moving `head`, makes sure each request is served exactly once.' },
            { lines: '41-42', text: 'The classic textbook queue (from Silberschatz) with the head at track 53.' },
          ],
        },
        {
          type: 'p',
          text: "Modern Linux has a multi-queue block layer with pluggable schedulers: `none`, `mq-deadline` (sorts requests but guarantees each a deadline, preventing starvation), `bfq` (fair shares between processes, good for desktops on slow disks) and `kyber` (latency targets for fast devices). For NVMe SSDs the usual default is **`none`**: there is no arm to optimise for, and the drive schedules its own flash chips better than the kernel could.",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real output: the scheduler of a virtual disk on Linux 6.18',
          code: `$ cat /sys/block/vda/queue/scheduler
none [mq-deadline] kyber bfq`,
          annotations: [
            { lines: 2, text: 'The bracketed entry is active. Root can switch schedulers at run time by writing a name into this file.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'I/O priority in games',
          text: "Schedulers can also weigh *who* asked. Linux has `ionice` classes, and Windows lets a program mark a file handle's I/O as low priority (`SetFileInformationByHandle` with `FileIoPriorityHintInfo`), which background work such as search indexing uses. Engine streaming systems apply the same idea one level up: a texture the player is about to see outranks a sound for the next level, so they keep their own priority queues and feed the OS only a few requests at a time.",
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'numeric',
      prompt: 'A disk head is at track **50**. Pending requests, in arrival order: 82, 170, 43, 140, 24, 16, 190. Using **SSTF**, how many tracks does the head move in total to serve them all?',
      hint: 'From 50, the nearest is 43. Keep choosing the nearest remaining request and add up the distances.',
      answer: 208,
      unit: 'tracks',
      explanation: 'SSTF visits 43 (7), 24 (19), 16 (8), then the nearest remaining is 82 (66), then 140 (58), 170 (30), 190 (20): 7 + 19 + 8 + 66 + 58 + 30 + 20 = **208** tracks. FCFS would move 642 tracks and LOOK (upward first) 314. SSTF happens to win here, but notice how it abandoned the high tracks while low ones were nearby: with a steady stream of requests near track 30, the request for track 190 could wait indefinitely.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: 'Why do Linux distributions usually configure NVMe SSDs with the `none` I/O scheduler rather than an elevator?',
      options: [
        { text: 'NVMe drives cannot accept more than one request at a time', why: 'The opposite: NVMe supports up to 65,535 queues with up to 65,536 commands each, and works best with many requests in flight.' },
        { text: 'There is no seek to minimise, and the drive schedules work across its flash chips itself', correct: true, why: 'Reordering to save arm movement is pointless without an arm, and every microsecond the kernel spends sorting adds latency to a device that answers in microseconds.' },
        { text: 'The elevator algorithm only works on drives smaller than 2 TB', why: 'Elevators work on any size of disk. The issue is that the cost model they optimise does not exist on flash.' },
        { text: 'Scheduling is done by the file system instead', why: 'File systems decide where data goes on disk, but they do not order the queue of requests sent to the device.' },
      ],
      explanation: 'An I/O scheduler is worth its overhead only when reordering saves more time than it costs. On an HDD, saving a 5 ms seek is worth almost any CPU work. On an NVMe SSD, there are no seeks and the hardware already runs many requests in parallel, so the best policy is usually to get out of the way. Schedulers like `mq-deadline` or `bfq` still help on slow devices, or when fairness between processes matters more than raw speed.',
    },
  ],
  takeaways: [
    'A device exposes a small interface of registers (status, command, data) reached through privileged port I/O or memory-mapped I/O; the kernel owns them so it can protect, share and cache.',
    'Interrupts remove the waiting (the requesting thread blocks and another runs), DMA removes the copying; kernels split interrupt work into a short top half and a deferred bottom half (Linux softirqs and workqueues, Windows DPCs).',
    'For DMA the kernel pins pages, builds scatter-gather lists and programs the IOMMU, because devices see physical addresses, not your virtual ones.',
    'Drivers are most of the kernel and cause most kernel crashes; microkernels, user-mode driver frameworks, signing, verifiers and safer languages all try to contain them.',
    'The I/O stack runs from your call through the VFS or I/O Manager, the file system and cache, the block layer and the driver to the device.',
    'HDD cost is seek + rotation + transfer, so schedulers like LOOK and file-system layouts fight for sequential access; SSDs need TRIM, alignment and deep queues instead, and usually run with no kernel scheduler at all.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 36: I/O Devices',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf',
      source: 'book',
      note: 'The canonical device, polling, interrupts, DMA and the driver statistics, in twelve readable pages.',
    },
    {
      title: 'OSTEP chapter 37: Hard Disk Drives',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-disks.pdf',
      source: 'book',
      note: 'Derives the access-time formula and works through SSTF, SCAN and C-SCAN with worked numbers.',
    },
    {
      title: 'OSTEP chapter 44: Flash-based SSDs',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-ssd.pdf',
      source: 'book',
      note: 'How a flash translation layer, garbage collection and wear leveling work, and why TRIM exists.',
    },
    {
      title: 'Multi-Queue Block IO Queueing Mechanism (blk-mq)',
      url: 'https://docs.kernel.org/block/blk-mq.html',
      source: 'other',
      note: 'The Linux kernel documentation for the multi-queue block layer that sits between file systems and NVMe drivers.',
    },
    {
      title: 'Driver Verifier (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/driver-verifier',
      source: 'other',
      note: 'The Windows tool that stress-tests kernel drivers for the bugs that cause blue screens.',
    },
  ],
};
