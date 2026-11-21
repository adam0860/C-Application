import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-protection-security",
  title: "Protection and Security",
  summary: "Users, groups and permission bits, least privilege, how a stack buffer overflow becomes an exploit and how canaries, NX, ASLR and CFI fight back, sandboxing, kernel anti-cheat, and secure C++ habits.",
  minutes: 24,
  objectives: [
    "Read and set Unix permission bits, explain how the kernel decides an access, and map the ideas to Windows tokens and ACLs",
    "Apply the principle of least privilege to game clients, launchers and dedicated servers",
    "Explain how a stack buffer overflow hijacks control flow and what canaries, NX/DEP, ASLR and CFI each stop",
    "Describe sandboxing mechanisms such as seccomp and AppContainer, and the trade-offs of kernel-level anti-cheat",
    "Write C++ that treats every external byte as hostile, and harden builds with compiler flags, sanitizers and fuzzing",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Protection versus security",
      blocks: [
        {
          type: 'p',
          text: "**Protection** is the set of mechanisms an OS uses to control who may touch what: which process can read which memory, open which file, signal which other process. **Security** is the larger goal those mechanisms serve: keeping the system's data and behaviour trustworthy even when someone is actively trying to break it. Protection is the lock; security also asks who has keys, what the lock is made of, and what happens when it is picked.",
        },
        {
          type: 'table',
          headers: ["Layer", "Mechanism", "You met it in"],
          rows: [
            ["CPU", "[[kernel-mode|Kernel]] and [[user-mode|user]] mode, privileged instructions", "Kernel mode and system calls"],
            ["Memory", "Per-process [[page-table|page tables]] with read, write, execute and user/supervisor bits", "Paging"],
            ["Identity", "Every process runs as a user (UID) with groups; Windows: an access token with SIDs", "This lesson"],
            ["Access control", "Permission bits and ACLs checked on `open`, `kill`, `connect`…", "This lesson"],
            ["Isolation", "Sandboxes, containers, virtual machines", "This lesson and the next"],
          ],
        },
        {
          type: 'p',
          text: "Every layer exists because the one above it can fail. A game's own code is trusted to follow its rules, but the moment it parses a packet or a save file crafted by someone else, that input may be steering it. The OS assumes any user-mode code could be hostile and checks it at every boundary: each [[system-call]] is a door the kernel guards.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the kernel checks on every call",
          text: "A check performed once at startup would be useless the moment the program was compromised a minute later. So the kernel re-validates on every request: does this process's identity allow opening this file in this mode, sending this signal, mapping this memory as executable? Cheap checks on every crossing are what make \"the program is now evil\" a containable event instead of a total loss.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: "Users, groups and permission bits",
      blocks: [
        {
          type: 'p',
          text: "On Unix-like systems every process carries a user ID and a list of group IDs, inherited from whoever started it. Every file has an owner, a group, and nine **[[unix-permissions|permission bits]]**: read, write and execute for the owner, for members of the group, and for everybody else. Each triple fits in one octal digit (r = 4, w = 2, x = 1), which is why modes are written in octal.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 196">
<text x="260" y="20" font-size="13" text-anchor="middle" font-family="monospace">$ ls -l slot1.sav</text>
<rect x="80" y="34" width="28" height="34" rx="4" class="f-gray" fill-opacity="0.08" stroke="none"/>
<rect x="80" y="34" width="28" height="34" rx="4" fill="none" class="s-gray" stroke-width="1.3"/>
<text x="94.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="110" y="34" width="28" height="34" rx="4" class="f-blue" fill-opacity="0.22" stroke="none"/>
<rect x="110" y="34" width="28" height="34" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="124.0" y="57" font-size="16" font-weight="700" text-anchor="middle">r</text>
<rect x="140" y="34" width="28" height="34" rx="4" class="f-blue" fill-opacity="0.22" stroke="none"/>
<rect x="140" y="34" width="28" height="34" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="154.0" y="57" font-size="16" font-weight="700" text-anchor="middle">w</text>
<rect x="170" y="34" width="28" height="34" rx="4" class="f-blue" fill-opacity="0.08" stroke="none"/>
<rect x="170" y="34" width="28" height="34" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="184.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="200" y="34" width="28" height="34" rx="4" class="f-green" fill-opacity="0.22" stroke="none"/>
<rect x="200" y="34" width="28" height="34" rx="4" fill="none" class="s-green" stroke-width="1.3"/>
<text x="214.0" y="57" font-size="16" font-weight="700" text-anchor="middle">r</text>
<rect x="230" y="34" width="28" height="34" rx="4" class="f-green" fill-opacity="0.08" stroke="none"/>
<rect x="230" y="34" width="28" height="34" rx="4" fill="none" class="s-green" stroke-width="1.3"/>
<text x="244.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="260" y="34" width="28" height="34" rx="4" class="f-green" fill-opacity="0.08" stroke="none"/>
<rect x="260" y="34" width="28" height="34" rx="4" fill="none" class="s-green" stroke-width="1.3"/>
<text x="274.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="290" y="34" width="28" height="34" rx="4" class="f-orange" fill-opacity="0.08" stroke="none"/>
<rect x="290" y="34" width="28" height="34" rx="4" fill="none" class="s-orange" stroke-width="1.3"/>
<text x="304.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="320" y="34" width="28" height="34" rx="4" class="f-orange" fill-opacity="0.08" stroke="none"/>
<rect x="320" y="34" width="28" height="34" rx="4" fill="none" class="s-orange" stroke-width="1.3"/>
<text x="334.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<rect x="350" y="34" width="28" height="34" rx="4" class="f-orange" fill-opacity="0.08" stroke="none"/>
<rect x="350" y="34" width="28" height="34" rx="4" fill="none" class="s-orange" stroke-width="1.3"/>
<text x="364.0" y="57" font-size="16" font-weight="700" text-anchor="middle">-</text>
<text x="388" y="57" font-size="12">ana devs 8 slot1.sav</text>
<text x="124.0" y="84" font-size="10" text-anchor="middle" class="t-gray">4</text>
<text x="154.0" y="84" font-size="10" text-anchor="middle" class="t-gray">2</text>
<text x="184.0" y="84" font-size="10" text-anchor="middle" class="t-gray">1</text>
<text x="214.0" y="84" font-size="10" text-anchor="middle" class="t-gray">4</text>
<text x="244.0" y="84" font-size="10" text-anchor="middle" class="t-gray">2</text>
<text x="274.0" y="84" font-size="10" text-anchor="middle" class="t-gray">1</text>
<text x="304.0" y="84" font-size="10" text-anchor="middle" class="t-gray">4</text>
<text x="334.0" y="84" font-size="10" text-anchor="middle" class="t-gray">2</text>
<text x="364.0" y="84" font-size="10" text-anchor="middle" class="t-gray">1</text>
<path d="M110,94 L110,100 L198,100 L198,94" fill="none" class="s-blue" stroke-width="1.5"/>
<text x="154.0" y="118" font-size="11" font-weight="700" text-anchor="middle" class="t-blue">owner (ana)</text>
<text x="154.0" y="134" font-size="11" text-anchor="middle">4+2+0 = 6</text>
<path d="M200,94 L200,100 L288,100 L288,94" fill="none" class="s-green" stroke-width="1.5"/>
<text x="244.0" y="118" font-size="11" font-weight="700" text-anchor="middle" class="t-green">group (devs)</text>
<text x="244.0" y="134" font-size="11" text-anchor="middle">4+0+0 = 4</text>
<path d="M290,94 L290,100 L378,100 L378,94" fill="none" class="s-orange" stroke-width="1.5"/>
<text x="334.0" y="118" font-size="11" font-weight="700" text-anchor="middle" class="t-orange">others</text>
<text x="334.0" y="134" font-size="11" text-anchor="middle">0+0+0 = 0</text>
<text x="94" y="118" font-size="10" text-anchor="middle" class="t-gray">type</text>
<text x="94" y="132" font-size="10" text-anchor="middle" class="t-gray">(file)</text>
<text x="260" y="164" font-size="13" text-anchor="middle">mode <tspan font-weight="700">0640</tspan>: r = 4, w = 2, x = 1, one octal digit per class</text>
<text x="260" y="186" font-size="10.5" text-anchor="middle" class="t-gray">the kernel checks owner first, then group, then others; the first class that matches decides</text>
</svg>`,
          alt: "The string -rw-r----- split into cells: a file-type dash, then owner r w dash with weights 4 2 1 summing to 6, group r dash dash summing to 4, others dash dash dash summing to 0. Below: mode 0640.",
          caption: "`-rw-r-----` is mode `0640`: the owner may read and write, the group may read, others get nothing. For directories, x means \"may enter and look up names\".",
        },
        {
          type: 'code',
          title: "perms.cpp",
          runnable: true,
          code: `#include <cstdio>
#include <filesystem>
#include <fstream>
#include <string>
#include <sys/stat.h>

namespace fs = std::filesystem;

// Render the 9 permission bits the way \`ls -l\` does.
std::string rwx(unsigned mode) {
    const char* sym = "rwxrwxrwx";
    std::string s(9, '-');
    for (int i = 0; i < 9; ++i)
        if (mode & (0400u >> i)) s[i] = sym[i];
    return s;
}

int main() {
    const fs::path save = "slot1.sav";
    std::ofstream(save) << "level=3\\n";

    // Owner read+write, group read, others nothing: 0640.
    using fs::perms;
    fs::permissions(save, perms::owner_read | perms::owner_write |
                          perms::group_read);

    struct stat st {};
    stat(save.c_str(), &st);
    unsigned bits = st.st_mode & 0777;
    std::printf("%s  octal %03o\\n", rwx(bits).c_str(), bits);

    fs::permissions(save, perms::others_read, fs::perm_options::add);
    stat(save.c_str(), &st);
    bits = st.st_mode & 0777;
    std::printf("%s  octal %03o\\n", rwx(bits).c_str(), bits);
    fs::remove(save);
}`,
          output: "rw-r-----  octal 640\nrw-r--r--  octal 644",
          annotations: [
            { lines: 14, text: "`0400` is the owner-read bit. Shifting it right walks through all nine bits in `ls -l` order: owner rwx, group rwx, others rwx." },
            { lines: '24-25', text: "`std::filesystem::permissions` (C++17) replaces the mode exactly, so the result does not depend on the process's umask." },
            { lines: 28, text: "`stat` reads the inode's metadata; the low 9 bits of `st_mode` are the permission bits." },
            { lines: 32, text: "`perm_options::add` ORs bits in, like `chmod o+r`." },
          ],
        },
        {
          type: 'p',
          text: "The kernel checks the classes **in order**: if you are the owner, only the owner bits count; otherwise, if you are in the group, only the group bits count; otherwise the \"others\" bits. User ID 0, **root**, skips these checks entirely. One special bit matters most for security: a **setuid** program runs with its *file owner's* identity rather than the caller's (that is how `passwd`, owned by root, can update the password database), which makes every setuid-root program a prime target for exploits.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "The Windows model",
          text: "Windows identifies users and groups by security identifiers (SIDs). Each process has an **access token** listing its SIDs and privileges, and each object (file, registry key, named pipe, process) has a security descriptor whose **access control list** (ACL) lists allowed and denied SIDs. Since Vista, an administrator's processes run with a filtered, non-admin token until **UAC** elevation, and **integrity levels** (low, medium, high, system) stop a low-integrity process, such as a browser's sandboxed tab, from writing to higher-integrity objects even when an ACL would allow it.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: "A dedicated server's install directory should be fully usable by its owner, readable and enterable (but not writable) by the `gameops` group, and closed to everyone else: `rwxr-x---`. What octal mode do you pass to `chmod`?",
      answer: 750,
      alsoAccept: ["0750"],
      label: "chmod",
      hint: "Owner: r+w+x. Group: r+x. Others: nothing. Use r = 4, w = 2, x = 1.",
      explanation: "Owner rwx = 4 + 2 + 1 = 7, group r-x = 4 + 0 + 1 = 5, others --- = 0, so `chmod 750`. On a directory the x bit means \"may traverse\": without it the group could list names (with r) but could not open anything inside. Note that 0750 is octal notation; as a plain decimal number it would be a different value entirely, which is why C++ code writes it `0750` with the leading zero.",
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: "`config.ini` is owned by user `ana` and group `devs`, with mode `0066` (`----rw-rw-`). Ana, who is also a member of `devs`, runs `cat config.ini`. What happens?",
      options: [
        { text: "It works, because ana is in `devs` and the group may read", why: "Group bits are consulted only if you are *not* the owner." },
        { text: "It works, because \"others\" may read and everyone counts as others", why: "\"Others\" applies only to processes that match neither the owner nor the group." },
        { text: "Permission denied: ana is the owner, so only the owner bits (`---`) are checked", correct: true, why: "Right. The kernel picks the first class that matches, owner first, and stops there. Ana is locked out of her own file while strangers can read it." },
        { text: "It works, because owners can always read their own files", why: "Owners can always *change* the mode with `chmod`, but until they do, the owner bits apply to them like anyone else. Only root bypasses the checks." },
      ],
      explanation: "The classes are not OR-ed together; exactly one applies. That makes odd modes like this possible, and it is also why a careless `chmod 066` can lock you out. Since she owns the file, ana can fix it with `chmod 640 config.ini`.",
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: "The principle of least privilege",
      blocks: [
        {
          type: 'definition',
          term: "Principle of least privilege",
          text: "Every program and every user should operate with the smallest set of privileges needed to do its job, for the shortest time needed. (Saltzer and Schroeder, *The Protection of Information in Computer Systems*, 1975.)",
        },
        {
          type: 'p',
          text: "**[[least-privilege|Least privilege]]** does not prevent bugs; it limits what a bug can cost. If your game client is exploited through a malformed packet, the attacker gets exactly the rights the game process had. Run as an administrator, that is the whole machine; run as a normal user, it is that user's files; inside a sandbox, it is almost nothing. It is the computing form of need-to-know: access is granted for the task at hand, not because someone is generally trusted.",
        },
        {
          type: 'table',
          headers: ["Situation", "Over-privileged", "Least privilege"],
          rows: [
            ["Game client", "Manifest demands admin \"to be safe\"", "Runs as the user (`asInvoker`); writes only to its own folders"],
            ["Auto-updater", "Whole launcher runs elevated all the time", "A small update service holds the right to write the install folder; the launcher asks it"],
            ["Dedicated server", "Runs as root because \"ports need it\"", "Runs as a dedicated `gameserver` account in a container; game ports such as 7777 need no privilege"],
            ["Service on port 443", "Stays root after binding", "Granted only `CAP_NET_BIND_SERVICE`, or binds then drops to an unprivileged user"],
            ["Build machine", "CI agent can push to production", "Separate credentials per pipeline stage"],
          ],
        },
        {
          type: 'p',
          text: "Linux splits root's power into about forty **capabilities** (`CAP_NET_BIND_SERVICE`, `CAP_SYS_ADMIN`, `CAP_SYS_PTRACE`…) so a program can be given one of them instead of everything. A process can also **drop** privileges permanently, for example calling `setuid(unprivilegedUid)` after binding a privileged port, so that a later compromise inherits nothing.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why \"temporarily\" matters as much as \"minimally\"",
          text: "A privilege held for the whole run is available to every bug in every code path, including ones that run hours later while parsing a player's chat message. A privilege used once at startup and then dropped is available only to bugs in startup code. Shrinking the time window shrinks the attack surface just as shrinking the set does.",
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: "On Linux, a dedicated game server must run as root to receive players on UDP port 7777.",
      answer: false,
      explanation: "Only ports below 1024 are privileged on Linux, and even those need just the single capability `CAP_NET_BIND_SERVICE`, not full root. Port 7777 (Unreal's default game port) or 27015 (Source engine's) can be bound by any user. Running a server that parses untrusted packets from the internet as root would turn any memory-corruption bug into full control of the machine, the opposite of least privilege.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: "From buffer overflow to hijacked control flow",
      blocks: [
        {
          type: 'p',
          text: "The Computer Architecture course showed where a function keeps its locals: below the saved registers and the [[return-address|return address]], in the same [[stack-frame]]. Write past the end of a local array, a **[[buffer-overflow]]**, and you overwrite them. That is [[undefined-behavior]] in C++, and if the bytes come from an attacker, it is often a way to take over the program, because `ret` jumps to whatever address is in that slot.",
        },
        {
          type: 'p',
          text: "Here is a function that trusts a length field from a network packet, attacked twice: once in a build without a [[stack-canary]], once with one.",
        },
        {
  "type": "algo",
  "view": "array",
  "code": "void greet(const char* pkt, size_t len) {\n    char name[16];\n    // prologue: copy canary to rsp+24\n    std::memcpy(name, pkt, len);  // len!\n    std::printf(\"hello, %.16s\\n\", name);\n    // epilogue: canary changed?\n    //   then __stack_chk_fail()\n}   // ret: jump to return address",
  "lang": "cpp",
  "interval": 1800,
  "frames": [
    {
      "note": "**Without** `-fstack-protector`: `greet`'s frame is `name` (16 bytes), the saved `rbx`, then the return address. Lower addresses on the left.",
      "array": [
        "?",
        "?",
        "rbx",
        "main"
      ],
      "marks": [],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "build",
          "-fno-stack-protector"
        ],
        [
          "return addr",
          "0x00005555555551c4"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "The attacker's packet says `len` = 32. `memcpy` copies 32 bytes, with no idea where `name` ends. Bytes 0–7 fill `name[0..7]`.",
      "array": [
        "AAAA",
        "?",
        "rbx",
        "main"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "8"
        ],
        [
          "return addr",
          "0x00005555555551c4"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "Bytes 8–15 fill the rest of `name`. The buffer is full, but the input has not ended.",
      "array": [
        "AAAA",
        "AAAA",
        "rbx",
        "main"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "16"
        ],
        [
          "return addr",
          "0x00005555555551c4"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "Bytes 16–23 overwrite the saved `rbx`. Nothing checks; the copy just keeps going upward.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "main"
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
          "color": "red"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "24"
        ],
        [
          "return addr",
          "0x00005555555551c4"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "Bytes 24–31 overwrite the **return address** with a value the attacker chose.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "evil"
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
          "color": "red"
        },
        {
          "index": 3,
          "color": "red"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "32"
        ],
        [
          "return addr",
          "0x0000000000401256"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "`ret` pops the corrupted return address and jumps there: the attacker now controls the program. (Our real run sent plain `A`s instead, so it jumped to garbage and crashed with `SIGSEGV`.)",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "evil"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "bytes copied",
          "32"
        ],
        [
          "rip",
          "0x0000000000401256"
        ],
        [
          "result",
          "hijacked"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 3,
          "label": "ret",
          "color": "purple"
        }
      ]
    },
    {
      "note": "**With** `-fstack-protector-strong`: the prologue copies a random **canary** from thread-local storage (`fs:0x28`) into the frame, between `name` and the return address.",
      "array": [
        "?",
        "?",
        "?",
        "c4f1",
        "rbx",
        "main"
      ],
      "marks": [
        {
          "index": 3,
          "color": "green"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "build",
          "-fstack-protector-strong"
        ],
        [
          "canary",
          "0x315db7e2a9f1c400"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "The same attack, now with `len` = 48 because the frame is bigger: bytes 0–15 fill `name`.",
      "array": [
        "AAAA",
        "AAAA",
        "?",
        "c4f1",
        "rbx",
        "main"
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 1,
          "color": "orange"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "16"
        ],
        [
          "canary slot",
          "0x315db7e2a9f1c400"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "Bytes 16–23 land in an unused padding slot.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "c4f1",
        "rbx",
        "main"
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
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "24"
        ],
        [
          "canary slot",
          "0x315db7e2a9f1c400"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "Bytes 24–31 smash the **canary**. To reach the return address, the overflow has no choice but to go through it.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "rbx",
        "main"
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
          "color": "red"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "32"
        ],
        [
          "canary slot",
          "0x4141414141414141"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "Bytes 32–47 overwrite the saved `rbx` and the return address, exactly as before.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "evil"
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
          "color": "red"
        },
        {
          "index": 4,
          "color": "red"
        },
        {
          "index": 5,
          "color": "red"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "bytes copied",
          "48"
        ],
        [
          "canary slot",
          "0x4141414141414141"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "The epilogue compares the frame's canary with `fs:0x28`. They differ, so it calls `__stack_chk_fail()` **before** `ret` can use the corrupted address.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "evil"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        }
      ],
      "lines": [
        6,
        7
      ],
      "vars": [
        [
          "frame canary",
          "0x4141414141414141"
        ],
        [
          "fs:0x28",
          "0x315db7e2a9f1c400"
        ],
        [
          "equal?",
          "no"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    },
    {
      "note": "glibc prints `*** stack smashing detected ***` and aborts: `SIGABRT`, exit status 134. A crash, not a takeover; the poisoned return address is never used.",
      "array": [
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "AAAA",
        "evil"
      ],
      "marks": [
        {
          "index": 5,
          "color": "gray"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "result",
          "aborted (SIGABRT)"
        ],
        [
          "ret executed?",
          "never"
        ]
      ],
      "pointers": [
        {
          "index": 0,
          "label": "name",
          "color": "blue"
        },
        {
          "index": 5,
          "label": "ret",
          "color": "purple"
        },
        {
          "index": 3,
          "label": "canary",
          "color": "green"
        }
      ]
    }
  ],
  "caption": "A stack-smashing attack on `greet`, without and with a canary. Each cell is one 8-byte stack slot, in the frame layout g++ 13 `-O1` really produced; the canary value and target address are made up."
},
        {
          type: 'p',
          text: "Now for real. This deliberately broken program (not runnable in the app, since it is meant to crash) is built three ways with g++ 13 on Ubuntu 24.04 and given 40 bytes of `A`. The first build disables both protections, the second keeps only the canary, the third uses Ubuntu's defaults:",
        },
        {
          type: 'code',
          title: "greet.cpp (vulnerable on purpose)",
          code: `#include <cstdio>
#include <cstring>

void greet(const char* pkt, std::size_t len) {
    char name[16];
    std::memcpy(name, pkt, len);       // len comes from the packet!
    std::printf("hello, %.16s\\n", name);
}

int main(int argc, char* argv[]) {
    if (argc > 1) greet(argv[1], std::strlen(argv[1]));
}`,
          annotations: [
            { lines: 6, text: "The bug: `len` is never compared with `sizeof name`. Here it comes from the command line, standing in for a length field in a network packet." },
            { lines: 11, text: "`run.sh` calls it once with `ana` and then with `A40`, a shell variable holding 40 `A` characters." },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: "Real run in a terminal",
          code: `$ g++ -O1 -U_FORTIFY_SOURCE -fno-stack-protector greet.cpp -o greet_plain
$ g++ -O1 -U_FORTIFY_SOURCE -fstack-protector-strong greet.cpp -o greet_canary
$ g++ -O1 greet.cpp -o greet_default
$ bash run.sh
hello, ana
exit status: 0
hello, AAAAAAAAAAAAAAAA
run.sh: line 3: 21422 Segmentation fault      ./greet_plain "$A40"
exit status: 139
hello, AAAAAAAAAAAAAAAA
*** stack smashing detected ***: terminated
run.sh: line 4: 21423 Aborted                 ./greet_canary "$A40"
exit status: 134
*** buffer overflow detected ***: terminated
run.sh: line 5: 21424 Aborted                 ./greet_default "$A40"
exit status: 134`,
          annotations: [
            { lines: '7-9', text: "No protection: the function finished, then `ret` tried to jump to `0x4141414141414141` (the bytes of \"AAAAAAAA\"), a non-canonical address, and faulted. An attacker would have written a real address there instead." },
            { lines: '10-13', text: "With a canary: the function still ran to the end (it printed), but the epilogue noticed the changed canary and aborted before `ret`. Exit 134 = 128 + 6, `SIGABRT`." },
            { lines: '14-16', text: "Ubuntu's default build also defines `_FORTIFY_SOURCE`, which swaps `memcpy` into a fixed-size buffer for a checked `__memcpy_chk`. It caught the overflow *before* any byte was written past `name`." },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "A canary detects; it does not prevent",
          text: "By the time the canary check fails, the overflow has already happened, and anything it overwrote *between* the buffer and the canary, such as other locals or function pointers, may already have been used. A canary also fails if the attacker can first leak its value (it is the same for the whole process) and write it back unchanged. That is why it is one layer among several.",
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'numeric',
      prompt: "In the canary-protected frame from the animation, `name` starts at `rsp+0`, the canary is at `rsp+24`, the saved `rbx` at `rsp+32` and the return address at `rsp+40`, each slot 8 bytes. How many bytes must `memcpy` write, starting at `name[0]`, to replace **all 8 bytes** of the return address?",
      answer: 48,
      unit: "bytes",
      hint: "The return address occupies rsp+40 through rsp+47.",
      explanation: "The return address spans offsets 40 to 47, so the copy must cover 48 bytes (0 through 47). On the way it necessarily overwrites the canary at 24 to 31, which is the whole trick: the canary sits on the only path from the buffer to the return address. Without a canary the same frame is smaller (return address at `rsp+24`), and 32 bytes suffice, as in the first half of the animation.",
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'order',
      prompt: "A function built with `-fstack-protector-strong` is called with an oversized packet. Put the events in order.",
      linesAreCode: false,
      lines: [
        "The prologue copies the canary from thread-local storage (`fs:0x28`) into the frame",
        "`memcpy` writes past `name`, overwriting the canary on its way to the return address",
        "The rest of the function body runs (it prints the greeting)",
        "The epilogue compares the frame's canary with `fs:0x28` and finds a mismatch",
        "`__stack_chk_fail` reports the smashing and the process aborts with `SIGABRT`",
      ],
      distractors: ["`ret` jumps to the attacker's address"],
      explanation: "The canary is planted before any of the function's own code runs, damaged during the overflow, and checked only at the very end, after the body has finished. The check sits immediately before `ret`, and on a mismatch the code jumps to `__stack_chk_fail` instead, so the poisoned return address is never used. That is why the distractor never happens in a canary-protected build.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "The mitigation stack: NX, ASLR, canaries, CFI",
      blocks: [
        {
          type: 'p',
          text: "Exploitation and defense have evolved as an arms race, and modern binaries carry one layer for each round:",
        },
        {
          type: 'list',
          items: [
            "**Round 1:** attackers put machine code (\"shellcode\") into the overflowed buffer and pointed the return address at it. **Defense: [[nx-bit|NX / DEP]].** Pages are writable *or* executable, never both (W^X), using the no-execute bit in page-table entries. The stack and heap are not executable, so injected code cannot run.",
            "**Round 2:** attackers stopped injecting code and reused code already in the program: chains of short instruction sequences ending in `ret` (\"gadgets\"), each return address on the smashed stack pointing at the next one. This is **[[return-oriented-programming]]** (ROP). **Defense: [[aslr|ASLR]]**, so the attacker does not know where the gadgets are.",
            "**Round 3:** attackers first leak one address (via a separate bug), compute the random offset, then build the chain. **Defenses:** stack canaries to make the overwrite detectable, and **[[control-flow-integrity]]** (CFI) so that indirect calls and returns can only go to legitimate targets.",
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: "ASLR, real runs (glibc 2.39, Linux, x86-64)",
          code: `$ ./aslr
code   0x55d635ecc1a9
global 0x55d635ecf014
heap   0x55d64d0a42a0
stack  0x7ffec5c58234
$ ./aslr
code   0x55b4dc57d1a9
global 0x55b4dc580014
heap   0x55b4eed7f2a0
stack  0x7ffee6f44644
$ setarch -R ./aslr       # run with randomization off
code   0x5555555551a9
global 0x555555558014
heap   0x5555555592a0
stack  0x7fffffff6484`,
          annotations: [
            { lines: '2-5', text: "The program prints the address of a function, a global, a `malloc` block and a local." },
            { lines: '7-10', text: "Every region moved. For code, globals and heap the last three hex digits did not: ASLR shifts them by whole pages (4 KiB = 0x1000), so the offset within a page stays the same. Linux also shifts the stack by a random amount within a page, so its low digits change too." },
            { lines: '7-8', text: "Code and globals moved by the *same* amount, because the executable is loaded as one unit. Leak one address inside it and you know all of them." },
            { lines: '11-15', text: "`setarch -R` disables randomization for one run (debuggers such as gdb do this by default). Every run would then be identical and predictable." },
          ],
        },
        {
          type: 'table',
          headers: ["Mitigation", "Stops", "Weakened by", "GCC / Clang", "MSVC"],
          rows: [
            ["Stack canary", "Linear stack overwrites reaching the return address", "Canary leaks; overwrites that skip it", "`-fstack-protector-strong`", "`/GS` (default)"],
            ["Fortified libc calls", "Overflows into buffers of known size", "Sizes the compiler cannot see", "`-D_FORTIFY_SOURCE=3` (with `-O1`+)", "(CRT secure functions)"],
            ["NX / DEP", "Running injected code", "Code reuse (ROP)", "Default for executables", "`/NXCOMPAT` (default)"],
            ["ASLR", "Hard-coded addresses", "Information leaks", "`-fPIE -pie` (Ubuntu default)", "`/DYNAMICBASE` (default)"],
            ["Full RELRO", "Overwriting the GOT's function pointers", "Other writable pointers", "`-Wl,-z,relro,-z,now`", "n/a"],
            ["CFI / shadow stack", "Returns and indirect calls to illegal targets", "Calls to *legal* but unintended targets", "`-fcf-protection=full` (Intel CET)", "`/guard:cf`, `/CETCOMPAT`"],
          ],
        },
        {
          type: 'p',
          text: "The strongest form of CFI is a **shadow stack**: a second, hardware-protected stack (Intel CET, since 2020's Tiger Lake CPUs; AMD since Zen 3) that holds only return addresses. `call` pushes to both stacks; `ret` compares them and faults on a mismatch, so a smashed return address no longer works even without a canary. Windows calls this hardware-enforced stack protection; Linux supports it for user programs since kernel 6.6 with glibc 2.39.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why mitigations are not fixes",
          text: "Every mitigation raises the cost of turning a bug into an exploit; none removes the bug. Microsoft and Google have both reported that about 70% of their serious security bugs are memory-safety bugs, despite all of these layers. The only real fix is not writing past the buffer, which is what the last part of this lesson is about.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: "A format-string bug in your game's chat lets an attacker print one pointer into the game executable's code. Which defense loses most of its value?",
      options: [
        { text: "NX / DEP", why: "NX still prevents running injected code; a leaked address does not make the stack executable." },
        { text: "The stack canary", why: "A code address reveals nothing about the canary's random value, which lives in thread-local storage." },
        { text: "ASLR", correct: true, why: "Right. The whole executable moves by one random offset, so one known address inside it reveals the location of every function and gadget in it." },
        { text: "Control-flow integrity", why: "CFI checks *where* control may go regardless of addresses; knowing the layout does not make an illegal target legal." },
      ],
      explanation: "This is why real exploits are usually chains of two bugs: an information leak to defeat ASLR, then a memory corruption to redirect control. It is also why \"it only prints a number\" bugs, such as passing user text as a `printf` format string, are treated as security bugs: their output is the first link in the chain.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "Sandboxing: assume the code will be compromised",
      blocks: [
        {
          type: 'p',
          text: "Least privilege taken to its limit is a **[[sandbox]]**: run risky code (a browser's web-page renderer, a video decoder, a mod's scripts) in a process that is denied almost everything, so that even full control of that process gets the attacker very little. On Linux the sharpest tool is **[[seccomp]]**, which filters the system calls a process may make. Its strict mode allows only four:",
        },
        {
          type: 'code',
          title: "seccomp_strict.cpp",
          runnable: true,
          code: `#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <linux/seccomp.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        // Child: enter strict mode. From now on only read, write,
        // _exit and sigreturn are allowed.
        prctl(PR_SET_SECCOMP, SECCOMP_MODE_STRICT);
        const char msg[] = "child: sandboxed, write() still works\\n";
        [[maybe_unused]] ssize_t r = write(1, msg, sizeof msg - 1);
        open("secrets.txt", O_RDONLY);       // forbidden system call
        syscall(SYS_exit, 0);                // never reached
    }
    int status = 0;
    waitpid(pid, &status, 0);
    if (WIFSIGNALED(status))
        std::printf("parent: child killed by signal %d (%s)\\n",
                    WTERMSIG(status), strsignal(WTERMSIG(status)));
}`,
          output: "child: sandboxed, write() still works\nparent: child killed by signal 9 (Killed)",
          annotations: [
            { lines: 15, text: "Strict mode allows only `read`, `write`, `_exit` and `sigreturn`, on descriptors that are already open. It cannot be turned off again." },
            { lines: 17, text: "Writing to an already-open descriptor is still allowed: the sandbox can report results through pipes it was handed." },
            { lines: 18, text: "Any other system call, here `openat`, makes the kernel kill the process with `SIGKILL` on the spot." },
            { lines: 19, text: "Even normal exit is forbidden: C++'s `exit` uses `exit_group`. Only the raw `exit` system call is allowed." },
          ],
        },
        {
          type: 'p',
          text: "Real sandboxes use **seccomp-bpf**, a small filter program that allows or denies each call by number and arguments; Chrome, Firefox, Docker and systemd all use it. They combine it with namespaces (next lesson) to hide the file system and network, and with dropped privileges. Windows offers **AppContainer** (used by Microsoft Store apps and browser sandboxes), low-integrity processes, restricted tokens and job objects for the same purpose.",
        },
        {
          type: 'list',
          items: [
            "**Mods and scripting:** expose only a curated API to Lua or WebAssembly and leave out file and OS access (Roblox's Luau is a sandboxed Lua dialect built for running untrusted game scripts).",
            "**Consoles:** games run in a locked-down environment from the first instruction: signed code only, no arbitrary system calls, and on Xbox a dedicated virtual machine for the game, isolated from the console's own OS.",
            "**Tools:** run asset importers and shader compilers in separate, low-privilege processes, so a malformed downloaded asset cannot touch the rest of the editor.",
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: "Kernel-level anti-cheat, and why it is controversial",
      blocks: [
        {
          type: 'p',
          text: "Competitive PC games face an adversary with full control of the machine: the player. Early anti-cheat ran in user mode and scanned the game's memory for known cheats. Cheat developers answered by moving into the kernel, as drivers that read and write game memory from ring 0 where user-mode code cannot see them. So anti-cheat followed them down: **[[kernel-anti-cheat|kernel-level anti-cheat]]** drivers (Easy Anti-Cheat, BattlEye, Riot's Vanguard, EA Javelin) watch process creation, memory access to the game and loaded drivers from inside the kernel. Vanguard loads at boot, before any cheat driver could.",
        },
        {
          type: 'table',
          headers: ["For", "Against"],
          rows: [
            ["Sees cheats that hide from user mode", "Third-party code with full kernel privilege on millions of PCs, for a game"],
            ["Can block known cheat drivers from loading", "A bug crashes the whole machine, not just the game; CrowdStrike's faulty kernel-level update in July 2024 crashed about 8.5 million Windows PCs in one day"],
            ["Raises the cost of cheating substantially", "A signed, vulnerable driver is a gift to attackers: in 2022 ransomware loaded Genshin Impact's anti-cheat driver (`mhyprot2.sys`) to kill antivirus processes"],
            ["Can require Secure Boot and TPM attestation", "Privacy concerns; incompatible with Linux and Steam Deck unless developers enable the user-mode Proton support"],
          ],
        },
        {
          type: 'p',
          text: "The trend is toward **attestation** rather than ever-deeper drivers: requiring Secure Boot, a TPM and memory integrity (hypervisor-protected code integrity), so the OS itself can vouch that no unsigned driver is loaded. The Battlefield 6 beta in 2025, for example, required Secure Boot to be enabled. Server-side detection, which analyses gameplay statistics instead of the player's machine, complements both, and is the only option the cheater cannot tamper with.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the server is the real referee",
          text: "Whatever runs on the player's PC can, with enough effort, be observed and modified by the player: that is what owning the hardware means. Anti-cheat on the client can only raise the cost. A server-authoritative design, where the [[dedicated-server|dedicated server]] simulates the game and treats client messages as requests (\"I'd like to move here\") rather than facts, makes whole classes of cheats impossible no matter what runs on the client.",
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: "Your studio debates shipping a kernel-mode anti-cheat driver. Which is the strongest *technical* argument against it?",
      options: [
        { text: "Kernel drivers cannot read another process's memory", why: "They can read any memory on the machine; that is exactly why both cheats and anti-cheat moved there." },
        { text: "A bug or vulnerability in the driver affects the whole system: it can blue-screen the PC or hand attackers ring-0 access", correct: true, why: "Right. The driver runs with the kernel's full privilege and none of user mode's isolation, so its failure modes are system-wide, as the mhyprot2 abuse and the CrowdStrike outage showed." },
        { text: "Kernel code runs slower than user code, so the game loses frames", why: "Kernel code runs at the same speed; any overhead depends on what the driver does, not on the privilege level." },
        { text: "Windows forbids third-party kernel drivers", why: "Windows allows them if they are signed through Microsoft's driver-signing process, which these products are." },
      ],
      explanation: "The debate is a least-privilege trade-off: kernel privilege is exactly what makes these drivers effective and exactly what makes their bugs catastrophic. Studios weigh the cheating they stop against the risk they place on every player's machine, and increasingly prefer attestation and server-side checks.",
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: "Secure coding habits for C++",
      blocks: [
        {
          type: 'p',
          text: "Every byte that crosses into your process from outside, a packet, a save file, a mod, a downloaded asset, a replay, a config file, is untrusted input, even if your own game wrote it last week. The rules are short: validate sizes before using them, use types that know their bounds, and let tools hunt for what you missed.",
        },
        {
          type: 'code',
          title: "safe_parse.cpp",
          runnable: true,
          code: `#include <cstdint>
#include <cstdio>
#include <optional>
#include <span>
#include <string>
#include <vector>

using Bytes = std::span<const std::uint8_t>;

// Packet layout: [len:1][name bytes...]. Every byte is untrusted.
std::optional<std::string> parseName(Bytes pkt) {
    if (pkt.empty()) return std::nullopt;            // no header
    std::size_t len = pkt[0];
    constexpr std::size_t kMaxName = 15;
    if (len > kMaxName) return std::nullopt;         // policy limit
    if (len > pkt.size() - 1) return std::nullopt;   // lies about size
    auto body = pkt.subspan(1, len);                 // bounds known good
    return std::string(body.begin(), body.end());
}

int main() {
    std::vector<std::vector<std::uint8_t>> packets = {
        {3, 'a', 'n', 'a'},          // honest
        {200, 'x', 'x'},             // claims 200 bytes, sends 2
        {},                          // empty
        {5, 'e', 'v', 'e'},          // claims 5, sends 3
    };
    for (std::size_t i = 0; i < packets.size(); ++i) {
        auto name = parseName(packets[i]);
        std::printf("packet %zu: %s\\n", i + 1,
                    name ? name->c_str() : "rejected");
    }
}`,
          output: "packet 1: ana\npacket 2: rejected\npacket 3: rejected\npacket 4: rejected",
          annotations: [
            { lines: 8, text: "`std::span` carries a pointer *and* a length, so every later operation can be checked against the real size." },
            { lines: 15, text: "A policy limit: even an honest-looking length must fit what the game is willing to accept." },
            { lines: 16, text: "The length field is a claim, not a fact. Compare it with the bytes that actually arrived; write the check as a subtraction so it cannot overflow (`pkt.size() - 1` is safe because the packet is not empty)." },
            { lines: 17, text: "Only after both checks do we take the subspan. Nothing here can read outside the packet." },
          ],
        },
        {
          type: 'list',
          items: [
            "**Prefer bounds-carrying types:** `std::vector`, `std::string`, `std::array`, `std::span`, `std::string_view` over raw pointers and lengths. Never use `gets`, `strcpy` or `sprintf`; use `std::string`, `snprintf` or `std::format`.",
            "**Check size arithmetic:** `offset + size` can wrap around in fixed-width unsigned types; compare `size > total - offset` instead.",
            "**Check every return value** from the OS and from parsers, and handle `errno`; an ignored failure is a state your code was never written to be in.",
            "**Avoid check-then-use races (TOCTOU):** do not `access()` a path and then `open()` it; open first and inspect the open descriptor with `fstat`, because the file can be swapped between the two calls.",
            "**Turn on hardening:** compile with the flags in the table above; in debug and test builds also define `_GLIBCXX_ASSERTIONS` (libstdc++) to bounds-check `operator[]`. C++26 standardizes such a *hardened* library mode.",
            "**Let tools search:** run tests under [[sanitizer|AddressSanitizer and UBSan]] (`-fsanitize=address,undefined`), and **[[fuzzing|fuzz]]** every parser (save files, network messages, asset formats) with libFuzzer or AFL++ in CI.",
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal's network serialization (`FArchive`, `FBitReader`) marks an archive as errored when a read runs past the data, and well-written `NetSerialize` code checks `Ar.IsError()` before trusting what it read. Treat every RPC parameter from a client as untrusted, validate it on the server (`WithValidation` functions exist for this), and keep `TArray` index checks on in development builds.",
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'bug',
      prompt: "This function reads one asset out of a pak file whose table of contents comes from disk (and therefore possibly from an attacker). A crafted pak makes it read far outside `file`. Tap the line with the flaw.",
      code: `// offset and size come straight from the pak's table of contents
bool readChunk(const std::vector<std::uint8_t>& file,
               std::uint32_t offset, std::uint32_t size,
               std::vector<std::uint8_t>& out) {
    if (offset + size > file.size()) return false;   // bounds check
    out.assign(file.begin() + offset,
               file.begin() + offset + size);
    return true;
}`,
      bugLines: [5],
      hint: "What is `0xFFFFFF00u + 0x200u` as a 32-bit unsigned value?",
      explanation: "`offset + size` is computed in 32-bit unsigned arithmetic and wraps around: `0xFFFFFF00 + 0x200` is `0x100` (256), which passes the check for any pak bigger than 256 bytes. Then `file.begin() + offset` points about 4 GiB past the data, and `assign` reads it: an out-of-bounds read that leaks memory or crashes. Fix it with a check that cannot overflow: `if (offset > file.size() || size > file.size() - offset) return false;`. Fuzzers find exactly this kind of bug within minutes.",
    },
  ],
  takeaways: [
    "Protection is the mechanism (modes, page bits, identities, ACLs); security is the goal of staying trustworthy under attack. The kernel re-checks permissions at every system call.",
    "Unix permissions are owner/group/others × rwx, written in octal (r = 4, w = 2, x = 1); exactly one class applies, owner first. Root bypasses checks; setuid programs run as their owner. Windows uses tokens, SIDs, ACLs, UAC and integrity levels.",
    "Least privilege limits what a bug can cost: no admin game clients, unprivileged dedicated servers, capabilities instead of root, and privileges dropped as soon as they are no longer needed.",
    "A stack buffer overflow can overwrite the return address; canaries detect it before `ret`, NX/DEP stops injected code, ASLR hides addresses, and CFI/shadow stacks stop illegal returns. Each is defeated by something, so they are layered.",
    "Sandboxes (seccomp-bpf, AppContainer) assume compromise and remove nearly every privilege; kernel anti-cheat trades system-wide risk for detection, and the server remains the real referee.",
    "Treat every external byte as hostile: validate lengths with overflow-free checks, use `std::span` and containers, check return values, avoid TOCTOU, harden builds, and run sanitizers and fuzzers.",
  ],
  reading: [
    {
      title: "Operating Systems: Three Easy Pieces",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      source: 'book',
      note: "The book's Security section (chapters by Peter Reiher) covers threat models, authentication, access control and design principles such as least privilege.",
    },
    {
      title: "credentials(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/credentials.7.html",
      source: 'other',
      note: "User and group IDs, real versus effective IDs, and how setuid changes them.",
    },
    {
      title: "seccomp(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/seccomp.2.html",
      source: 'other',
      note: "Strict and filter modes, with a complete seccomp-bpf example.",
    },
    {
      title: "Return-oriented programming",
      url: "https://en.wikipedia.org/wiki/Return-oriented_programming",
      source: 'article',
      note: "How ROP chains work and the defenses (ASLR, CFI, shadow stacks) designed against them.",
    },
    {
      title: "Compiler Options Hardening Guide for C and C++ (OpenSSF)",
      url: "https://best.openssf.org/Compiler-Hardening-Guides/Compiler-Options-Hardening-Guide-for-C-and-C++",
      source: 'other',
      note: "Which GCC and Clang hardening flags to enable, what each costs, and why.",
    },
  ],
};
