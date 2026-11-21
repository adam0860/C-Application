import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-ipc",
  title: "Inter-Process Communication",
  summary: "Pipes, FIFOs and Windows named pipes, signals and async-signal safety, shared memory with shm_open and mmap, message queues, and how tools talk to a running game.",
  minutes: 22,
  objectives: [
    "Explain why isolated processes need kernel-mediated IPC and pick a mechanism for a given job",
    "Connect a parent and child with `pipe` and `fork`, close the unused ends, and predict when `read` returns 0",
    "Install a signal handler with `sigaction` that only does async-signal-safe work",
    "Share memory between processes with `shm_open` and `mmap`, and synchronize it with lock-free atomics",
    "Recognize the Windows equivalents (named pipes, file mappings) and how engine tools reach a running game",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Isolation has a price",
      blocks: [
        {
          type: 'p',
          text: "Earlier units built a wall around every process: its own [[virtual-address|virtual address space]], its own [[file-descriptor|file descriptors]], its own threads. That wall is why a crashing tool cannot scribble over your game, and why a browser tab cannot read your password manager. But real software is rarely one [[process]]. Your editor launches the game, a crash reporter watches it, shader compilers run beside it, and a profiler streams data out of it.",
        },
        {
          type: 'p',
          text: "Two processes cannot just exchange a pointer: the address `0x7f3a12345000` means something different in each one, or nothing at all. Every way for processes to cooperate therefore goes through the kernel, which is the only party that can see both sides. That family of mechanisms is called **[[ipc|inter-process communication]]** (IPC).",
        },
        {
          type: 'table',
          headers: ["Mechanism", "Shape of the data", "Who can use it", "Typical job"],
          rows: [
            ["**Pipe**", "One-way byte stream", "Related processes (inherited fds)", "Shell pipelines, capturing a child's output"],
            ["**FIFO / named pipe**", "Byte stream (Windows: also messages)", "Any process that knows the name", "A tool sending commands to a running game"],
            ["**Signal**", "A small number, no payload", "Any process you have permission to signal", "\"Stop\", \"reload config\", \"your child exited\""],
            ["**Shared memory**", "Raw bytes both sides map", "Any process that opens the name", "Large or high-rate data: frames, telemetry"],
            ["**Message queue**", "Discrete messages with priorities", "Any process that opens the name", "Job requests between services"],
            ["**Socket**", "Stream or datagrams", "Same machine or across a network", "Everything networked (next lesson)"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the kernel sits in the middle",
          text: "If the OS let processes poke each other's memory directly, isolation would be meaningless. Routing communication through the kernel lets it enforce permissions (may this process signal that one?), lifetimes (what happens when the reader dies?) and blocking (put the reader to sleep until data arrives, instead of letting it spin). The cost is a [[system-call]] per transfer, which is why shared memory, the one mechanism where the kernel steps aside after setup, is also the fastest.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: "A game can give its level editor access to an array by sending the editor the array's address, as long as both programs run on the same machine.",
      answer: false,
      explanation: "Addresses are *virtual*: each process has its own page table, so the same number maps to different physical memory (or to nothing) in the editor. Dereferencing it would at best crash with a segmentation fault and at worst read unrelated editor data. To share the array, both processes must map the same physical pages through the kernel, which is exactly what shared memory does later in this lesson.",
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: "Pipes: a one-way byte stream through the kernel",
      blocks: [
        {
          type: 'p',
          text: "`pipe(fds)` asks the kernel for a small buffer and returns two file descriptors: `fds[0]` is the **read end** and `fds[1]` is the **write end**. Bytes written to one end come out of the other, in order. Because they are ordinary descriptors, [[fork-syscall|fork]] copies them into the child, and that is how two related processes end up holding opposite ends of the same [[pipe]].",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 250">
<text x="12" y="16" font-size="10.5" class="t-gray">user mode</text>
<rect x="20" y="26" width="190" height="82" rx="8" class="f-blue" fill-opacity="0.10" stroke="none"/>
<rect x="20" y="26" width="190" height="82" rx="8" fill="none" class="s-blue" stroke-width="1.6"/>
<text x="34" y="46" font-size="12.5" font-weight="700" class="t-blue">parent (writer)</text>
<text x="34" y="70" font-size="11" font-family="monospace" opacity="0.5">fd 3  read end</text>
<line x1="34" y1="66" x2="140" y2="66" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
<text x="146" y="70" font-size="10" class="t-red">closed</text>
<text x="34" y="94" font-size="11" font-family="monospace">fd 4  write end</text>
<rect x="310" y="26" width="190" height="82" rx="8" class="f-green" fill-opacity="0.10" stroke="none"/>
<rect x="310" y="26" width="190" height="82" rx="8" fill="none" class="s-green" stroke-width="1.6"/>
<text x="324" y="46" font-size="12.5" font-weight="700" class="t-green">child (reader)</text>
<text x="324" y="70" font-size="11" font-family="monospace">fd 3  read end</text>
<text x="324" y="94" font-size="11" font-family="monospace" opacity="0.5">fd 4  write end</text>
<line x1="324" y1="90" x2="436" y2="90" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
<text x="442" y="94" font-size="10" class="t-red">closed</text>
<line x1="8" y1="128" x2="512" y2="128" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" opacity="0.5"/>
<text x="12" y="146" font-size="10.5" class="t-gray">kernel mode</text>
<rect x="140" y="160" width="240" height="40" rx="20" class="f-orange" fill-opacity="0.12" stroke="none"/>
<rect x="140" y="160" width="240" height="40" rx="20" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="260" y="185" font-size="13" font-family="monospace" text-anchor="middle">r o o f t o p ↵</text>
<text x="260" y="222" font-size="10.5" text-anchor="middle" class="t-gray">pipe buffer: bytes flow one way, in order</text>
<text x="260" y="238" font-size="10.5" text-anchor="middle" class="t-gray">(65,536 bytes by default on Linux)</text>
<path d="M160,100 L160,140 L100,140 L100,180 L128,180" fill="none" class="s-blue" stroke-width="2"/>
<path d="M128,175 L138,180 L128,185 Z" class="f-blue"/>
<text x="92" y="170" font-size="11" font-family="monospace" text-anchor="end" class="t-blue">write()</text>
<path d="M382,180 L508,180 L508,62 L484,62" fill="none" class="s-green" stroke-width="2"/>
<path d="M486,57 L476,62 L486,67 Z" class="f-green"/>
<text x="440" y="172" font-size="11" font-family="monospace" class="t-green">read()</text>
</svg>`,
          alt: "A parent process box holds fd 4, the pipe's write end, with fd 3 crossed out. A child process box holds fd 3, the read end, with fd 4 crossed out. Below a dashed user/kernel line, a pipe buffer containing 'rooftop' receives the parent's write() and feeds the child's read().",
          caption: "After `fork`, each process closes the end it does not use. The data lives in the kernel's buffer, not in either process.",
        },
        {
          type: 'p',
          text: "The rules that make pipes useful are all about blocking (see [pipe(7)](https://man7.org/linux/man-pages/man7/pipe.7.html)):",
        },
        {
          type: 'list',
          items: [
            "**Empty pipe:** `read` blocks until data arrives. It returns whatever is available, up to the size you asked for, so one `read` can return part of a write or several writes glued together. A pipe keeps no message boundaries.",
            "**Full pipe:** `write` blocks until the reader makes room. Linux pipes hold 65,536 bytes by default.",
            "**No writers left:** once *every* write-end descriptor is closed and the buffer is drained, `read` returns **0**, which means end of file.",
            "**No readers left:** `write` raises the `SIGPIPE` signal, which kills the writer by default. If you ignore that signal, `write` fails with `errno` = `EPIPE` instead.",
            "**Atomic writes:** a write of at most `PIPE_BUF` bytes (4,096 on Linux) is never interleaved with other writers' data. Larger writes may be split.",
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: "You have used pipes all along",
          text: "`./game --dump-stats | grep fps` creates a pipe, forks twice, and in each child uses `dup2` to put one end of the pipe on standard output or standard input before `exec` (the redirection trick from the process-API lesson). Neither program knows it is talking to the other.",
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: "Try it: fork, pipe, and close the ends you don't use",
      blocks: [
        {
          type: 'p',
          text: "The parent sends three level names down a pipe; the child counts lines and bytes until end of file. Only one process prints at a time: the child prints and exits, and the parent prints only after `waitpid` has reaped it, so the output is the same on every run.",
        },
        {
          type: 'code',
          title: "pipe_fork.cpp",
          runnable: true,
          code: `#include <cstdio>
#include <cstring>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    int fds[2];                         // [0] read end, [1] write end
    if (pipe(fds) == -1) { std::perror("pipe"); return 1; }

    pid_t pid = fork();
    if (pid == -1) { std::perror("fork"); return 1; }

    if (pid == 0) {                     // child: the reader
        close(fds[1]);                  // never writes: close it!
        char buf[16];
        long total = 0;
        int lines = 0;
        ssize_t n;
        while ((n = read(fds[0], buf, sizeof buf)) > 0) {
            total += n;
            for (ssize_t i = 0; i < n; ++i)
                if (buf[i] == '\\n') ++lines;
        }
        close(fds[0]);                  // read returned 0: EOF
        std::printf("child: %d lines, %ld bytes\\n", lines, total);
        std::fflush(stdout);
        _exit(0);
    }

    close(fds[0]);                      // parent: the writer
    const char* levels[] = {"dock\\n", "warehouse\\n", "rooftop\\n"};
    for (const char* lv : levels) {
        std::size_t len = std::strlen(lv);
        if (write(fds[1], lv, len) != static_cast<ssize_t>(len))
            std::perror("write");
    }
    close(fds[1]);                      // signals EOF to the child

    int status = 0;
    waitpid(pid, &status, 0);           // reap; child has printed
    std::printf("parent: child exited with %d\\n",
                WEXITSTATUS(status));
}`,
          output: "child: 3 lines, 23 bytes\nparent: child exited with 0",
          annotations: [
            { lines: 8, text: "Always check: `pipe` fails with `EMFILE` when the process is out of file descriptors." },
            { lines: 10, text: "Both processes now hold **both** ends. Four descriptors refer to the one pipe." },
            { lines: 14, text: "The crucial line. If the child kept its own write end open, its `read` could never return 0, because a writer (itself) would still exist." },
            { lines: 19, text: "`read` returns up to 16 bytes: maybe a whole line, maybe two lines, maybe half of one. Treat a pipe as a stream and parse what arrives." },
            { lines: '26-27', text: "`_exit` skips `atexit` handlers and stdio flushing, which avoids running the parent's cleanup code twice in a forked child. So flush our own output explicitly first." },
            { lines: 34, text: "`write` returns how many bytes it wrote, or −1. Checking the return value is not optional for system calls." },
            { lines: 37, text: "Closing the last write end is what turns into end of file on the other side." },
            { lines: 40, text: "Reap the child (no [[zombie-process|zombie]]), and get its exit status." },
          ],
        },
        {
  "type": "algo",
  "view": "array",
  "code": "pipe(fds);  pid = fork();\n// child (reader)\nclose(fds[1]);\nwhile ((n = read(fds[0], buf, 16)) > 0) { ... }\n// parent (writer)\nclose(fds[0]);\nwrite(fds[1], \"dock\\n\", 5);\nwrite(fds[1], \"warehouse\\n\", 10);\nwrite(fds[1], \"rooftop\\n\", 8);\nclose(fds[1]);",
  "lang": "cpp",
  "interval": 1700,
  "frames": [
    {
      "note": "After `pipe()` and `fork()`, the empty kernel buffer has **two** write ends open: the parent's copy and the child's.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "2"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "running"
        ]
      ]
    },
    {
      "note": "Each process closes the end it will not use. Now only the parent holds a write end, which matters later for EOF.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        3,
        6
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "running"
        ]
      ]
    },
    {
      "note": "The child calls `read`. The pipe is empty but a writer exists, so the child **blocks**: it sleeps until data arrives.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 0,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "blocked in read"
        ]
      ]
    },
    {
      "note": "The parent writes 5 bytes at `w`. The kernel marks the child runnable, but the parent keeps the CPU for now.",
      "array": [
        "d",
        "o",
        "c",
        "k",
        "↵",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 2,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "r",
          "color": "green"
        },
        {
          "index": 5,
          "label": "w",
          "color": "blue"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "bytes in pipe",
          "5 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "runnable"
        ]
      ]
    },
    {
      "note": "The next 10 bytes fit too: 15 of 16 bytes used. A pipe keeps **no message boundaries**; it is one stream of bytes.",
      "array": [
        "d",
        "o",
        "c",
        "k",
        "↵",
        "w",
        "a",
        "r",
        "e",
        "h",
        "o",
        "u",
        "s",
        "e",
        "↵",
        "·"
      ],
      "marks": [
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "orange"
        },
        {
          "index": 8,
          "color": "orange"
        },
        {
          "index": 9,
          "color": "orange"
        },
        {
          "index": 10,
          "color": "orange"
        },
        {
          "index": 11,
          "color": "orange"
        },
        {
          "index": 12,
          "color": "orange"
        },
        {
          "index": 13,
          "color": "orange"
        },
        {
          "index": 14,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "r",
          "color": "green"
        },
        {
          "index": 15,
          "label": "w",
          "color": "blue"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "bytes in pipe",
          "15 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "runnable"
        ]
      ]
    },
    {
      "note": "`write` of 8 bytes, but only 1 byte is free. Writes of up to `PIPE_BUF` bytes are all-or-nothing, so the parent **blocks** without writing anything.",
      "array": [
        "d",
        "o",
        "c",
        "k",
        "↵",
        "w",
        "a",
        "r",
        "e",
        "h",
        "o",
        "u",
        "s",
        "e",
        "↵",
        "·"
      ],
      "marks": [
        {
          "index": 15,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "r",
          "color": "green"
        },
        {
          "index": 15,
          "label": "w",
          "color": "blue"
        }
      ],
      "lines": [
        9
      ],
      "vars": [
        [
          "bytes in pipe",
          "15 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "blocked in write"
        ],
        [
          "child",
          "runnable"
        ]
      ]
    },
    {
      "note": "The child runs: `read` returns **15** bytes, two of the parent's writes in one read. Freed space wakes the parent.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "green"
        },
        {
          "index": 1,
          "color": "green"
        },
        {
          "index": 2,
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
          "index": 9,
          "color": "green"
        },
        {
          "index": 10,
          "color": "green"
        },
        {
          "index": 11,
          "color": "green"
        },
        {
          "index": 12,
          "color": "green"
        },
        {
          "index": 13,
          "color": "green"
        },
        {
          "index": 14,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 15,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "runnable"
        ],
        [
          "child",
          "got \"dock↵warehouse↵\""
        ],
        [
          "read returned",
          "15"
        ]
      ]
    },
    {
      "note": "The parent's 8-byte write completes. `w` wraps around the end of the ring buffer to index 0.",
      "array": [
        "o",
        "o",
        "f",
        "t",
        "o",
        "p",
        "↵",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "r"
      ],
      "marks": [
        {
          "index": 15,
          "color": "orange"
        },
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 2,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 15,
          "label": "r",
          "color": "green"
        },
        {
          "index": 7,
          "label": "w",
          "color": "blue"
        }
      ],
      "lines": [
        9
      ],
      "vars": [
        [
          "bytes in pipe",
          "8 / 16"
        ],
        [
          "write ends open",
          "1"
        ],
        [
          "parent",
          "running"
        ],
        [
          "child",
          "runnable"
        ]
      ]
    },
    {
      "note": "The parent closes its write end. **No write ends remain open** anywhere.",
      "array": [
        "o",
        "o",
        "f",
        "t",
        "o",
        "p",
        "↵",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "r"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 15,
          "label": "r",
          "color": "green"
        },
        {
          "index": 7,
          "label": "w",
          "color": "blue"
        }
      ],
      "lines": [
        10
      ],
      "vars": [
        [
          "bytes in pipe",
          "8 / 16"
        ],
        [
          "write ends open",
          "0"
        ],
        [
          "parent",
          "in waitpid"
        ],
        [
          "child",
          "runnable"
        ]
      ]
    },
    {
      "note": "The child reads the last 8 bytes.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 15,
          "color": "green"
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
          "index": 2,
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
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "0"
        ],
        [
          "parent",
          "in waitpid"
        ],
        [
          "child",
          "got \"rooftop↵\""
        ],
        [
          "read returned",
          "8"
        ]
      ]
    },
    {
      "note": "Empty buffer **and** zero writers: `read` returns **0**, end of file. The loop ends: 3 lines, 23 bytes.",
      "array": [
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·",
        "·"
      ],
      "marks": [],
      "pointers": [
        {
          "index": 7,
          "label": "r, w",
          "color": "purple"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes in pipe",
          "0 / 16"
        ],
        [
          "write ends open",
          "0"
        ],
        [
          "parent",
          "in waitpid"
        ],
        [
          "child",
          "EOF, loop ends"
        ],
        [
          "read returned",
          "0"
        ]
      ]
    }
  ],
  "caption": "A toy pipe with a 16-byte ring buffer (Linux's default is 65,536 bytes). `w` is where the next byte is written, `r` where the next byte is read."
},
        {
          type: 'callout',
          variant: 'why',
          title: "Why end of file depends on every copy being closed",
          text: "The kernel cannot know whether a process holding a write end *intends* to write again. It only knows whether one exists. So EOF means \"no open write end anywhere in the system\". Every forgotten copy, in the child, in the parent, or in some grandchild that inherited it through another `fork`, keeps the reader waiting forever. On Linux, opening descriptors with `O_CLOEXEC` (or `pipe2(fds, O_CLOEXEC)`) at least stops them leaking into programs you `exec`.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: "A process calls `pipe(fds)` and then `fork()`. Before either process calls `close`, how many open file descriptors, counted across **both** processes, refer to the pipe?",
      answer: 4,
      label: "Descriptors",
      hint: "How many ends does a pipe have, and how many processes hold copies?",
      explanation: "`pipe` creates two descriptors (read end and write end) in the parent. `fork` duplicates the whole descriptor table, so the child gets its own copies of both: 2 × 2 = 4. That is why the pattern is \"fork, then each side closes the end it will not use\": after that, two remain, one write end in the writer and one read end in the reader, and the reader sees EOF as soon as the writer closes its one.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: "The build tool runs an offline shader compiler and collects its output through a pipe. The compiler finishes in a second, but the tool hangs forever in the `read` loop. Tap the line that causes the hang.",
      code: `int fds[2];
pipe(fds);
pid_t pid = fork();
if (pid == 0) {
    close(fds[0]);
    dup2(fds[1], STDOUT_FILENO);   // stdout -> pipe
    close(fds[1]);
    execlp("shadercc", "shadercc", "--all", nullptr);
    _exit(127);                    // exec failed
}
// parent: collect the compiler's output
std::string log;
char buf[4096];
ssize_t n;
while ((n = read(fds[0], buf, sizeof buf)) > 0)
    log.append(buf, static_cast<std::size_t>(n));
waitpid(pid, nullptr, 0);
close(fds[0]);
close(fds[1]);                     // tidy up`,
      bugLines: [19],
      hint: "When can `read` on the parent's side return 0?",
      explanation: "The parent still holds its copy of the write end while it waits in `read`. When the compiler exits, its descriptors close, but the parent's own `fds[1]` is still open, so the kernel sees a live writer and `read` blocks forever (and `waitpid` is never reached). Move `close(fds[1]);` to just after `fork` returns in the parent, before the loop. \"Close the end you don't use, immediately\" is the whole rule.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: "Named pipes: FIFOs and Windows pipes",
      blocks: [
        {
          type: 'p',
          text: "An ordinary pipe has no name, so only processes that inherit its descriptors can use it. A **[[named-pipe|named pipe]]** gives the kernel object a name, so two unrelated programs, say a running game and a debug console you launch later, can find each other.",
        },
        {
          type: 'p',
          text: "On Linux and macOS a named pipe is a **FIFO**, a special file created with `mkfifo(\"/tmp/game.cmd\", 0600)` (or the `mkfifo` shell command). The game opens it for reading, the tool for writing, and from then on it behaves exactly like a pipe. Opening blocks until both a reader and a writer have it open (unless you pass `O_NONBLOCK`), and no data ever touches the disk: the file is just a rendezvous name.",
        },
        {
          type: 'p',
          text: "**Windows named pipes** are more capable: they live in a separate namespace (`\\\\.\\pipe\\Name`), can be two-way, can preserve message boundaries, carry security descriptors, and can even be opened across a network. This is a common way for Windows tools to talk to a game process. The Windows API is not runnable on the course's Linux checker:",
        },
        {
          type: 'code',
          title: "Windows: the game serves a command pipe (not runnable here)",
          code: `#include <windows.h>

HANDLE pipe = CreateNamedPipeW(
    L"\\\\\\\\.\\\\pipe\\\\MyGameDebug",           // \\\\.\\pipe\\MyGameDebug
    PIPE_ACCESS_DUPLEX,                     // read and write
    PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
    1,                                      // one client at a time
    4096, 4096,                             // buffer sizes
    0, nullptr);                            // default timeout, security
if (pipe == INVALID_HANDLE_VALUE) { /* GetLastError() */ }

if (ConnectNamedPipe(pipe, nullptr) ||      // wait for the tool
    GetLastError() == ERROR_PIPE_CONNECTED) {
    char cmd[256];
    DWORD got = 0;
    if (ReadFile(pipe, cmd, sizeof cmd, &got, nullptr)) {
        // one whole message, e.g. "god_mode 1"
    }
}
CloseHandle(pipe);`,
          annotations: [
            { lines: 4, text: "In C++ source each backslash is doubled, so this literal is the pipe name shown in the comment." },
            { lines: 6, text: "Message mode: each `WriteFile` by the client arrives as one `ReadFile` here. A POSIX pipe would give you a byte stream instead." },
            { lines: '12-13', text: "`ConnectNamedPipe` blocks until a client opens the pipe with `CreateFileW`. `ERROR_PIPE_CONNECTED` means the client won the race and connected first, which also counts as success." },
            { lines: 20, text: "Windows calls kernel objects [[os-handle|handles]] and closes them with `CloseHandle`, the counterpart of `close` on a file descriptor." },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "A named pipe is an attack surface",
          text: "Anything that can open the name can send your game commands. Give FIFOs mode `0600` (owner only), and give Windows pipes a security descriptor that admits only the current user; never ship a debug pipe enabled in a release build.",
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: "Put the steps of the parent-writes, child-reads pipe pattern in the only order that works.",
      linesAreCode: false,
      lines: [
        "The parent calls `pipe(fds)`",
        "The parent calls `fork()`",
        "Each process closes the pipe end it will not use",
        "The parent writes its data, then closes its write end",
        "The child's `read` returns 0 (end of file) and the child exits",
        "The parent's `waitpid` reaps the child and collects its exit status",
      ],
      distractors: ["The child calls `pipe(fds)` to connect to the parent's pipe"],
      explanation: "The pipe must exist *before* `fork`, or the two processes would get two unrelated pipes. Closing the unused ends comes next, so that the parent's `close` really is the last write end. Only then can the child see EOF, and only after the child exits can `waitpid` reap it. The distractor is the classic misunderstanding: a second `pipe` call creates a brand-new pipe, it does not join an existing one.",
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: "Signals: software interrupts for processes",
      blocks: [
        {
          type: 'p',
          text: "A **[[unix-signal|signal]]** is a tiny asynchronous notification: just a number, delivered to a process by the kernel. Some come from other processes (`kill(pid, SIGTERM)`, or Ctrl+C in a terminal), some from the kernel itself (`SIGSEGV` for a bad memory access, `SIGCHLD` when a child exits, `SIGPIPE` for a reader-less pipe). Each signal has a default action, and a process can replace most of them with a handler function.",
        },
        {
          type: 'table',
          headers: ["Signal", "Number (x86-64 Linux)", "Default action", "Typical cause"],
          rows: [
            ["`SIGINT`", "2", "Terminate", "Ctrl+C in the terminal"],
            ["`SIGABRT`", "6", "Core dump", "`std::abort`, failed `assert`"],
            ["`SIGKILL`", "9", "Terminate (cannot be caught or ignored)", "`kill -9`, the out-of-memory killer"],
            ["`SIGSEGV`", "11", "Core dump", "Invalid memory access"],
            ["`SIGPIPE`", "13", "Terminate", "Writing to a pipe or socket with no reader"],
            ["`SIGTERM`", "15", "Terminate", "Polite shutdown request (`kill`, container stop)"],
            ["`SIGCHLD`", "17", "Ignore", "A child process stopped or exited"],
          ],
        },
        {
          type: 'p',
          text: "A handler runs *in the middle of whatever your thread was doing*: the kernel pauses the thread, builds a frame on its stack, calls the handler, and resumes afterwards. That makes handlers dangerous. If the signal arrives while your code is inside `malloc` holding the allocator's lock, and the handler calls `malloc` too (through `std::string`, `std::cout`, `printf`…), the thread waits for a lock it already holds: a deadlock. Only **[[async-signal-safe]]** functions, such as `write`, `_exit` and `kill`, may be called from a handler. The safe pattern is to set a flag and let the main loop do the real work:",
        },
        {
          type: 'code',
          title: "signal_flag.cpp",
          runnable: true,
          code: `#include <cerrno>
#include <csignal>
#include <cstdio>
#include <unistd.h>

// Written by the handler, read by the game loop.
volatile std::sig_atomic_t g_quit = 0;

extern "C" void onTerm(int) {
    int savedErrno = errno;           // write() may change errno
    g_quit = 1;
    const char msg[] = "[handler] SIGTERM received\\n";
    [[maybe_unused]] ssize_t r =
        write(STDOUT_FILENO, msg, sizeof msg - 1);  // async-signal-safe
    errno = savedErrno;
}

int main() {
    struct sigaction sa {};
    sa.sa_handler = onTerm;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;         // restart interrupted read() etc.
    sigaction(SIGTERM, &sa, nullptr);

    for (int frame = 1; !g_quit; ++frame) {
        std::printf("frame %d\\n", frame);
        std::fflush(stdout);
        if (frame == 3) raise(SIGTERM);   // stand-in for \`kill <pid>\`
    }
    std::printf("loop ended: saving settings, closing cleanly\\n");
}`,
          output: "frame 1\nframe 2\nframe 3\n[handler] SIGTERM received\nloop ended: saving settings, closing cleanly",
          annotations: [
            { lines: 7, text: "The C++ standard guarantees that a handler may write a `volatile std::sig_atomic_t` (or a lock-free `std::atomic`). Plain `bool` or `int` is not guaranteed." },
            { lines: 9, text: "`extern \"C\"` because the kernel calls it with the C calling convention; a handler gets the signal number as its argument." },
            { lines: '10-15', text: "`write` is async-signal-safe, but it may change `errno`, which the interrupted code might be in the middle of checking. Save and restore it." },
            { lines: '19-23', text: "`sigaction` is the modern, portable API. `SA_RESTART` makes slow system calls that the signal interrupted restart instead of failing with `EINTR`." },
            { lines: 28, text: "`raise` sends the signal to ourselves, and the handler runs before `raise` returns. In real life the server's orchestrator sends `SIGTERM` from outside." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why SIGKILL cannot be caught",
          text: "If every signal could be handled or ignored, a buggy or hostile program could make itself unkillable. `SIGKILL` and `SIGSTOP` are the kernel's guaranteed off-switches. That is why container platforms send `SIGTERM` first, wait a grace period (10 s by default in Docker) for your dedicated server to save and disconnect players, and only then send `SIGKILL`.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Windows has no real signals",
          text: "The C runtime emulates a few (`SIGINT`, `SIGABRT`, `SIGSEGV`…) within one process, but there is no `kill` to send them to another. Windows uses other tools: `SetConsoleCtrlHandler` for Ctrl+C and console close, window messages such as `WM_CLOSE` for a polite shutdown, `TerminateProcess` as the hard stop, and structured exceptions for crashes.",
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: "This dedicated server occasionally freezes forever when an admin sends `SIGUSR1`, with every thread idle. Tap the line responsible.",
      code: `std::vector<std::string> g_events;
volatile std::sig_atomic_t g_dumpStats = 0;

extern "C" void onUsr1(int sig) {
    g_events.push_back("signal " + std::to_string(sig));
    g_dumpStats = 1;
}

int main() {
    struct sigaction sa {};
    sa.sa_handler = onUsr1;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGUSR1, &sa, nullptr);
    runServer();   // allocates constantly
}`,
      bugLines: [5],
      hint: "What does building a `std::string` and growing a vector need from the C++ runtime?",
      explanation: "`std::to_string`, `operator+` and `push_back` all allocate, and the allocator is not async-signal-safe. If `SIGUSR1` lands while the server thread is inside `malloc` holding the heap lock, the handler's own allocation waits for that lock, which will never be released: a self-deadlock (or, with other allocators, heap corruption). It only happens when the timing lines up, which is why it is \"occasional\". Keep only `g_dumpStats = 1;` in the handler and do the logging in the main loop when it sees the flag.",
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: "A build script runs `./asset_lister | head -n 1`. `head` exits after one line, and the shell reports exit status **141** for `asset_lister`. Shells report death by signal *n* as 128 + *n*. Which signal number killed it?",
      answer: 13,
      label: "Signal",
      hint: "Subtract 128, then look at the table.",
      explanation: "141 − 128 = 13, `SIGPIPE`. After `head` exited, the pipe had no reader, so `asset_lister`'s next `write` raised `SIGPIPE`, whose default action is to terminate. For a command-line tool that is usually exactly right (stop producing output nobody reads). For a server writing to sockets it is not: servers ignore `SIGPIPE` (`signal(SIGPIPE, SIG_IGN)`) or pass `MSG_NOSIGNAL` to `send`, and handle the `EPIPE` error instead of dying when a client disconnects.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "Shared memory: the fastest IPC, and the most dangerous",
      blocks: [
        {
          type: 'p',
          text: "Pipes copy every byte twice: from the writer into the kernel, and from the kernel into the reader. For a few commands that is nothing; for a 4K video frame 60 times a second it is a lot. **[[shared-memory|Shared memory]]** removes the copies. Both processes map the *same physical page frames* into their address spaces, and after setup the kernel is not involved at all: a store by one process is a load away for the other.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 260">
<text x="80" y="18" font-size="12" font-weight="700" text-anchor="middle" class="t-blue">game process</text>
<text x="80" y="32" font-size="10" text-anchor="middle" class="t-gray">virtual addresses</text>
<rect x="30" y="42" width="100" height="180" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="80" y="62" font-size="10.5" text-anchor="middle">stack</text>
<line x1="30" y1="72" x2="130" y2="72" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="30" y="94" width="100" height="40" class="f-orange" fill-opacity="0.25" stroke="none"/>
<rect x="30" y="94" width="100" height="40" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="80" y="111" font-size="10.5" text-anchor="middle" font-weight="700">shared</text>
<text x="80" y="126" font-size="9.5" text-anchor="middle" font-family="monospace">0x7f3a…2000</text>
<line x1="30" y1="170" x2="130" y2="170" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="80" y="188" font-size="10.5" text-anchor="middle">heap</text>
<line x1="30" y1="198" x2="130" y2="198" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="80" y="214" font-size="10.5" text-anchor="middle">code</text>
<text x="440" y="18" font-size="12" font-weight="700" text-anchor="middle" class="t-green">tool process</text>
<text x="440" y="32" font-size="10" text-anchor="middle" class="t-gray">virtual addresses</text>
<rect x="390" y="42" width="100" height="180" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="440" y="62" font-size="10.5" text-anchor="middle">stack</text>
<line x1="390" y1="72" x2="490" y2="72" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="390" y="140" width="100" height="40" class="f-orange" fill-opacity="0.25" stroke="none"/>
<rect x="390" y="140" width="100" height="40" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="440" y="157" font-size="10.5" text-anchor="middle" font-weight="700">shared</text>
<text x="440" y="172" font-size="9.5" text-anchor="middle" font-family="monospace">0x7f81…5000</text>
<line x1="390" y1="198" x2="490" y2="198" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="440" y="214" font-size="10.5" text-anchor="middle">code</text>
<text x="260" y="18" font-size="12" font-weight="700" text-anchor="middle">physical RAM</text>
<text x="260" y="32" font-size="10" text-anchor="middle" class="t-gray">page frames</text>
<rect x="215" y="42" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="62" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="82" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="102" width="90" height="20" class="f-orange" fill-opacity="0.25" stroke="none"/>
<rect x="215" y="102" width="90" height="20" fill="none" class="s-orange" stroke-width="1.6"/>
<rect x="215" y="122" width="90" height="20" class="f-orange" fill-opacity="0.25" stroke="none"/>
<rect x="215" y="122" width="90" height="20" fill="none" class="s-orange" stroke-width="1.6"/>
<rect x="215" y="142" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="162" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="182" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="215" y="202" width="90" height="20" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="260" y="116" font-size="10" text-anchor="middle">frame 0x3c1</text>
<text x="260" y="136" font-size="10" text-anchor="middle">frame 0x3c2</text>
<path d="M130,104 L209,110" fill="none" class="s-orange" stroke-width="1.6"/>
<path d="M207,105 L215,110 L207,115 Z" class="f-orange"/>
<path d="M130,124 L209,131" fill="none" class="s-orange" stroke-width="1.6"/>
<path d="M207,126 L215,131 L207,136 Z" class="f-orange"/>
<path d="M390,150 L311,113" fill="none" class="s-orange" stroke-width="1.6"/>
<path d="M314,108 L305,111 L310,117 Z" class="f-orange"/>
<path d="M390,170 L311,134" fill="none" class="s-orange" stroke-width="1.6"/>
<path d="M314,129 L305,132 L310,138 Z" class="f-orange"/>
<text x="260" y="244" font-size="11" text-anchor="middle">Each process's page table points at the same two frames.</text>
<text x="260" y="258" font-size="11" text-anchor="middle" class="t-red">Same bytes, different virtual addresses: store offsets, not pointers.</text>
</svg>`,
          alt: "Two virtual address spaces, a game process and a tool process, each with a region labelled shared at different virtual addresses. Arrows from both regions point to the same two physical page frames in the middle.",
          caption: "The [[page-table|page tables]] of both processes point at the same frames. The region usually lands at different virtual addresses in each process.",
        },
        {
          type: 'p',
          text: "POSIX shared memory takes three calls: `shm_open` creates or opens a named object (on Linux, a file in the RAM-backed `/dev/shm`), `ftruncate` sets its size, and `mmap` with `MAP_SHARED` maps it. The program below forks for brevity, but an unrelated process would simply `shm_open` the same name. Both processes then hammer the same counter:",
        },
        {
          type: 'code',
          title: "shm_counter.cpp",
          runnable: true,
          code: `#include <atomic>
#include <cstdio>
#include <fcntl.h>
#include <new>
#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>

struct Shared {
    std::atomic<int> hits;   // lock-free, so it works across processes
};

int main() {
    const char* name = "/forge_demo_shm";
    int fd = shm_open(name, O_CREAT | O_RDWR, 0600);
    if (fd == -1) { std::perror("shm_open"); return 1; }
    if (ftruncate(fd, sizeof(Shared)) == -1) {  // set its size
        std::perror("ftruncate");
        return 1;
    }

    void* mem = mmap(nullptr, sizeof(Shared), PROT_READ | PROT_WRITE,
                     MAP_SHARED, fd, 0);
    if (mem == MAP_FAILED) { std::perror("mmap"); return 1; }
    close(fd);                        // the mapping stays valid
    shm_unlink(name);                 // remove the name; memory lives on

    static_assert(std::atomic<int>::is_always_lock_free);
    Shared* s = new (mem) Shared{};   // construct in the shared pages

    constexpr int N = 100'000;
    pid_t pid = fork();
    if (pid == -1) { std::perror("fork"); return 1; }
    for (int i = 0; i < N; ++i)       // both processes run this loop
        s->hits.fetch_add(1, std::memory_order_relaxed);
    if (pid == 0) _exit(0);           // child is done

    waitpid(pid, nullptr, 0);         // child's writes now visible
    std::printf("hits: %d (expected %d)\\n", s->hits.load(), 2 * N);
    munmap(mem, sizeof(Shared));
}`,
          output: "hits: 200000 (expected 200000)",
          annotations: [
            { lines: 15, text: "The name must start with `/`. `0600` lets only our user open it. With glibc older than 2.34, link with `-lrt`." },
            { lines: '22-23', text: "`MAP_SHARED` is the whole point: stores go to the shared object. With `MAP_PRIVATE` each process would get a private [[copy-on-write]] copy." },
            { lines: 26, text: "Unlinking removes the name only. The memory lives until the last mapping is gone, so nothing leaks in `/dev/shm` if we crash later." },
            { lines: 28, text: "Cross-process atomics are only guaranteed to work when they are lock-free, because a lock-based fallback might use a lock inside one process's private memory." },
            { lines: 29, text: "Placement `new` starts the object's lifetime inside the mapped bytes instead of allocating new memory." },
            { lines: 35, text: "A hardware atomic read-modify-write on the shared cache line: no update can be lost, whichever process does it." },
          ],
        },
        {
          type: 'compare',
          left: {
            title: "Plain int in shared memory",
            tone: 'bad',
            code: `struct Shared { int hits; };
// both processes:
for (int i = 0; i < N; ++i)
    ++s->hits;    // load, add, store
// prints anything up to 200000`,
          },
          right: {
            title: "Lock-free atomic",
            tone: 'good',
            code: `struct Shared { std::atomic<int> hits; };
// both processes:
for (int i = 0; i < N; ++i)
    s->hits.fetch_add(1);  // one RMW
// always prints 200000`,
          },
        },
        {
          type: 'p',
          text: "The left side is the same [[data-race]] you met with threads, now between processes: two `++` operations interleave and one update is lost. The kernel will not protect you, because after `mmap` it is not involved. For anything bigger than a counter use a real lock that lives in the shared region: a `pthread_mutex_t` initialized with the `PTHREAD_PROCESS_SHARED` attribute, a named semaphore from `sem_open`, or a lock-free ring buffer designed for one producer and one consumer.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Store offsets, never pointers",
          text: "Because the region is mapped at a different address in each process, a raw pointer stored inside it is only valid in the process that wrote it. Store offsets from the start of the region instead (Boost.Interprocess wraps this as `offset_ptr`), and never put `std::string` or `std::vector` there: their heap buffers live in one process's private memory.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: "The level editor and the running game share a region for live tweaking. The editor writes `Entity* selected = &region->entities[5];` into the region, and the game dereferences `region->selected`. What happens in the game?",
      options: [
        { text: "It works, because both processes mapped the same physical memory", why: "They share the physical frames, but each maps them at its own virtual address. The pointer holds the editor's virtual address." },
        { text: "It reads whatever lives at the editor's virtual address in the game's address space: often a crash, sometimes silently wrong data", correct: true, why: "Right. The number is meaningful only in the editor. In the game it may be unmapped (`SIGSEGV`) or happen to point at unrelated game memory, which is worse because nothing visibly fails." },
        { text: "The kernel translates the pointer automatically because the page is marked shared", why: "The kernel never rewrites the contents of your memory. It has no idea which bytes are pointers." },
        { text: "It fails to compile, because pointers cannot be stored in shared memory", why: "The compiler cannot know which memory is shared; it compiles fine and fails at run time." },
      ],
      explanation: "Store `std::uint32_t selectedIndex = 5;` (or a byte offset from the region's start) and let each process add its own base address. The same rule applies to memory-mapped save files and to data sent over a network: an address only means something inside the process that produced it.",
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: "Message queues, Windows file mappings, and choosing a mechanism",
      blocks: [
        {
          type: 'p',
          text: "A **[[message-queue|message queue]]** sits between pipes and shared memory. POSIX queues (`mq_open`, `mq_send`, `mq_receive`) keep **message boundaries** (one send is one receive) and deliver higher-priority messages first. They are handy for job requests between services but rare in games. The older System V queues (`msgget`) still exist in legacy code.",
        },
        {
          type: 'p',
          text: "On Windows, shared memory is a **file mapping** with a name. Passing `INVALID_HANDLE_VALUE` instead of a file handle backs it with the page file, which makes it pure shared memory:",
        },
        {
          type: 'code',
          title: "Windows shared memory (not runnable here)",
          code: `HANDLE map = CreateFileMappingW(
    INVALID_HANDLE_VALUE,          // backed by the page file
    nullptr, PAGE_READWRITE,
    0, sizeof(Telemetry),          // size: high and low 32 bits
    L"Local\\\\MyGameTelemetry");     // per-session name
auto* t = static_cast<Telemetry*>(
    MapViewOfFile(map, FILE_MAP_ALL_ACCESS, 0, 0, sizeof(Telemetry)));
// ... use t->frameTimeMs etc. with atomics ...
UnmapViewOfFile(t);
CloseHandle(map);`,
          annotations: [
            { lines: 5, text: "The `Local\\` prefix scopes the name to the current login session. The other process calls `OpenFileMappingW` with the same name." },
            { lines: 7, text: "The equivalent of `mmap`: map a view of the section into this address space." },
          ],
        },
        {
          type: 'table',
          headers: ["You need…", "Reach for", "Because"],
          rows: [
            ["To capture a child's output", "Pipe + `dup2`", "Free EOF semantics, works with any program"],
            ["Commands from a tool to a running game", "FIFO / Windows named pipe, or a local socket", "Named, unrelated processes, low rate"],
            ["\"Shut down cleanly\" from outside", "`SIGTERM` (Windows: `WM_CLOSE`, console handler)", "Standard, every process manager sends it"],
            ["Megabytes per frame between processes", "Shared memory + atomics or a ring buffer", "No copies through the kernel"],
            ["The same thing, but across machines", "Sockets", "The only option that leaves the box"],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Copies versus synchronization",
          text: "Pipes and sockets cost a system call and a copy per transfer but give you blocking, ordering and EOF for free. Shared memory costs nothing per byte but makes *you* responsible for synchronization and for waking the other side (a [[futex]], a [[semaphore]], or polling). Engines pick shared memory only when the data rate forces them to.",
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: "How tools and editors talk to a running game",
      blocks: [
        {
          type: 'p',
          text: "A modern game in development is surrounded by helper processes, and every one of them uses a mechanism from this lesson or the next:",
        },
        {
          type: 'list',
          items: [
            "**Crash reporters** run as a *separate* process (Unreal's CrashReportClient, Google's Crashpad handler). A crashed process cannot be trusted to report on itself: its heap may be corrupt and its stack smashed. The watcher uses OS debugging APIs to read the dead process's memory, writes a minidump, and uploads it.",
            "**Profilers** such as Unreal Insights stream trace events out of the game over a local TCP socket (or into a file), so the analysis UI can run in another process or on another machine.",
            "**Graphics debuggers** such as RenderDoc inject a library into the game process, then talk to their UI over a local socket to trigger captures and send results back.",
            "**Editors and live-tuning tools** use sockets or named pipes for commands (\"teleport the player\", \"reload this material\"); Unreal's messaging bus, used by its Session Frontend and Multi-User Editing, runs over UDP.",
            "**Asset hot reload** often uses the humblest IPC of all, a file: the editor writes the asset, and the game notices through a file-change notification (`inotify` on Linux, `ReadDirectoryChangesW` on Windows) and reloads it.",
            "**Shader compilers** run as worker processes (Unreal's ShaderCompileWorker), so a compiler crash costs one job instead of the whole editor, and the work spreads across cores.",
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why helpers are processes, not threads",
          text: "A thread shares everything with the game, including its bugs: a crash in a helper thread kills the game, and a crash in the game kills the helper. A separate process gets the OS's isolation for free, can be restarted independently, can run with fewer privileges, and can even run on another machine when the IPC is a socket. The price is that all communication must be explicit, which is a design benefit in its own right.",
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal wraps these mechanisms behind platform-neutral types: `FPlatformProcess::CreatePipe` and `CreateProc` for child processes and their output (used to run tools such as the shader compiler), `FPlatformMemory` for shared-memory regions, and the `Sockets` module (`ISocketSubsystem`) for networking. Read their Windows and Linux implementations once; they are thin layers over exactly the calls in this lesson.",
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: "Why do Crashpad and Unreal's crash reporter run as a separate process instead of as a thread inside the game?",
      options: [
        { text: "Threads cannot write files on Windows", why: "Any thread can write files. The problem is the state of the crashed process, not file access." },
        { text: "A separate process is faster to start when the crash happens", why: "Launching a process at crash time is actually slow and risky; these tools are typically started *before* any crash and wait." },
        { text: "The crashed process's memory may be corrupted, and anything running inside it dies with it; a separate process survives and can inspect it from outside", correct: true, why: "Right. The crash may have smashed the heap or the stack. An outside process with its own address space can still read the dead process's memory through debugging APIs, write a minidump, and upload it." },
        { text: "Signals are delivered only to processes, never to threads", why: "Signals such as `SIGSEGV` are delivered to the faulting thread. Delivery is not the issue; trusting the damaged process to clean up after itself is." },
      ],
      explanation: "This is the general argument for isolation: put the code that must keep working in a different failure domain from the code that might fail. The same reasoning puts the game's launcher, anti-cheat service and patcher in their own processes.",
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'fill',
      prompt: "Complete the safe \"reload the config on `SIGHUP`\" pattern.",
      template: `volatile std::___ g_reload = 0;

extern "C" void onHup(int) { g_reload = 1; }

void installHandler() {
    struct sigaction sa {};
    sa.sa_handler = onHup;
    sigemptyset(&sa.sa_mask);
    ___(SIGHUP, &sa, nullptr);
}

// in the main loop:
if (g_reload) { g_reload = 0; reloadConfig(); }`,
      blanks: [{ answers: ["sig_atomic_t"] }, { answers: ["sigaction"] }],
      wordBank: ["sig_atomic_t", "sigaction", "signal", "raise", "atomic_flag", "kill"],
      explanation: "`volatile std::sig_atomic_t` is the type the standard guarantees a handler can write safely, and `sigaction` installs the handler with well-defined semantics (the older `signal` function takes only two arguments and its behaviour differs between systems). All the real work, `reloadConfig()`, which surely allocates and opens files, happens in the main loop, outside the handler.",
    },
  ],
  takeaways: [
    "Processes cannot exchange pointers; all IPC goes through the kernel, which enforces permissions, lifetimes and blocking. Shared memory is the exception after setup, which is why it is fastest.",
    "A pipe is a one-way kernel byte stream with no message boundaries. `read` returns 0 only when every write-end descriptor is closed, so close unused ends immediately after `fork`.",
    "FIFOs and Windows named pipes give pipes a name so unrelated processes (a game and its debug tool) can connect; secure them.",
    "Signal handlers interrupt arbitrary code: call only async-signal-safe functions, typically just set a `volatile std::sig_atomic_t` flag. `SIGKILL` and `SIGSTOP` cannot be caught.",
    "Shared memory (`shm_open` + `mmap(MAP_SHARED)`, Windows `CreateFileMapping`) needs your own synchronization, such as lock-free atomics or process-shared locks, and must store offsets rather than pointers.",
    "Crash reporters, profilers, graphics debuggers and shader compilers are separate processes for isolation, and they reach the game through pipes, sockets, shared memory and files.",
  ],
  reading: [
    {
      title: "pipe(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/pipe.7.html",
      source: 'other',
      note: "Pipe capacity, PIPE_BUF atomicity, and exactly when reads and writes block or fail.",
    },
    {
      title: "signal-safety(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/signal-safety.7.html",
      source: 'other',
      note: "The full list of async-signal-safe functions and why the rest are unsafe in handlers.",
    },
    {
      title: "shm_overview(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/shm_overview.7.html",
      source: 'other',
      note: "POSIX shared memory: shm_open, ftruncate, mmap and shm_unlink, and how to synchronize access.",
    },
    {
      title: "Named Pipes (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes",
      source: 'other',
      note: "Windows named pipes: byte versus message mode, security, and the server and client APIs.",
    },
    {
      title: "Interprocess Communications (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/ipc/interprocess-communications",
      source: 'other',
      note: "Microsoft's overview of every Windows IPC mechanism, including file mappings, and when to use each.",
    },
  ],
};
