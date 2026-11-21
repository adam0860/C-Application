import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-virtualization",
  title: "Virtual Machines and Containers",
  summary: "Hypervisors of type 1 and 2, trap-and-emulate and VM exits on VT-x, nested page tables, paravirtual I/O, containers built from namespaces and cgroups, WSL2 and Docker on Windows, and the cloud machines your game servers run on.",
  minutes: 22,
  objectives: [
    "Explain how a hypervisor runs guest kernels with trap-and-emulate, and classify hypervisors as type 1 or type 2",
    "Trace a VM exit on Intel VT-x and estimate what frequent exits cost",
    "Compute the cost of a two-dimensional page walk with nested page tables",
    "Explain why paravirtual devices such as virtio are fast, and build a container from namespaces and cgroups",
    "Use WSL2 and Docker sensibly as a Windows game developer, and reason about dedicated servers on cloud VMs",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "Virtualizing a whole machine",
      blocks: [
        {
          type: 'p',
          text: "This course opened with the OS virtualizing the CPU and memory so each process believes it has a machine to itself. A **[[hypervisor]]** (or virtual machine monitor) plays the same trick one level down: it gives each **[[virtual-machine|virtual machine]]** the illusion of a complete computer, with its own CPUs, physical memory and devices, so that an entire operating system, the *guest*, runs inside it unmodified.",
        },
        {
          type: 'p',
          text: "Running a guest kernel in a simulator would be far too slow. In 1974 Popek and Goldberg stated what a practical VM needs: the guest behaves as on real hardware (**equivalence**), the hypervisor keeps control of the real resources (**resource control**), and almost all instructions run directly on the CPU (**efficiency**). The technique is **[[trap-and-emulate]]**: run the guest kernel with reduced privilege; ordinary instructions execute at full speed, and every *sensitive* instruction, one that reads or changes machine state such as page-table registers or interrupt flags, traps to the hypervisor, which emulates its effect on the *virtual* machine.",
        },
        {
          type: 'callout',
          variant: 'history',
          title: "Why x86 needed three tricks before it had hardware help",
          text: "Trap-and-emulate works only if every sensitive instruction traps. Classic x86 broke that rule: about 17 sensitive instructions silently behaved differently in user mode instead of faulting. `popf`, for example, simply ignores an attempt to change the interrupt flag. VMware (1999) worked around it by **binary translation**, rewriting the guest kernel's code on the fly. Xen (2003) used **paravirtualization**, modifying the guest kernel to call the hypervisor directly. Finally Intel VT-x (2005) and AMD-V (2006) added a hardware mode built for guests, which every hypervisor uses today.",
        },
        {
          type: 'list',
          items: [
            "**Consolidation:** one 64-core server runs dozens of VMs, each with its own OS and administrator.",
            "**Isolation:** a compromised or crashed VM cannot touch its neighbours; the hypervisor's interface is far narrower than a kernel's.",
            "**Encapsulation:** a VM is a file. Snapshot it before a risky change, copy it to another host, even move it while it runs.",
            "**Compatibility:** run Linux on a Windows workstation, an old OS for a legacy tool, or a clean test machine per build.",
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'truefalse',
      prompt: "A hypervisor runs a guest operating system by interpreting each of its instructions in software, which is why VMs are typically ten times slower than real hardware.",
      answer: false,
      explanation: "That describes an emulator (such as running a console's ARM code on an x86 PC). A hypervisor runs guest code *directly* on the CPU at full speed and intervenes only when the guest does something sensitive: touching privileged state or a device. CPU-bound code in a modern VM typically runs within a few percent of bare metal; the overheads that remain come from VM exits, I/O and two-level address translation, which the rest of this lesson covers.",
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: "Type 1 and type 2 hypervisors",
      blocks: [
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 254">
<text x="125" y="16" font-size="12.5" font-weight="700" text-anchor="middle">Type 1: bare metal</text>
<rect x="12" y="28" width="70" height="30" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="12" y="28" width="70" height="30" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="47" y="47" font-size="10" text-anchor="middle">apps</text>
<rect x="12" y="62" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="12" y="62" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="47" y="81" font-size="10" text-anchor="middle">guest OS</text>
<rect x="90" y="28" width="70" height="30" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="90" y="28" width="70" height="30" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="125" y="47" font-size="10" text-anchor="middle">apps</text>
<rect x="90" y="62" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="90" y="62" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="125" y="81" font-size="10" text-anchor="middle">guest OS</text>
<rect x="168" y="28" width="70" height="30" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="168" y="28" width="70" height="30" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="203" y="47" font-size="10" text-anchor="middle">apps</text>
<rect x="168" y="62" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="168" y="62" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="203" y="81" font-size="10" text-anchor="middle">guest OS</text>
<text x="47" y="106" font-size="9.5" text-anchor="middle" class="t-gray">VM 1</text>
<text x="125" y="106" font-size="9.5" text-anchor="middle" class="t-gray">VM 2</text>
<text x="203" y="106" font-size="9.5" text-anchor="middle" class="t-gray">VM 3</text>
<rect x="12" y="114" width="226" height="40" rx="5" class="f-orange" fill-opacity="0.2" stroke="none"/>
<rect x="12" y="114" width="226" height="40" rx="5" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="125" y="132" font-size="11.5" font-weight="700" text-anchor="middle">hypervisor</text>
<text x="125" y="146" font-size="9.5" text-anchor="middle">the most privileged software</text>
<rect x="12" y="160" width="226" height="30" rx="5" class="f-gray" fill-opacity="0.2" stroke="none"/>
<rect x="12" y="160" width="226" height="30" rx="5" fill="none" class="s-gray" stroke-width="1.4"/>
<text x="125" y="179" font-size="11" text-anchor="middle">hardware (VT-x / AMD-V)</text>
<text x="125" y="210" font-size="10" text-anchor="middle">Hyper-V, Xen, VMware ESXi,</text>
<text x="125" y="224" font-size="10" text-anchor="middle">KVM (Linux as the hypervisor)</text>
<text x="125" y="244" font-size="9.5" text-anchor="middle" class="t-gray">data centers, consoles, clouds</text>
<line x1="260" y1="10" x2="260" y2="250" stroke="currentColor" stroke-width="1" opacity="0.3"/>
<text x="395" y="16" font-size="12.5" font-weight="700" text-anchor="middle">Type 2: hosted</text>
<rect x="282" y="28" width="70" height="30" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="282" y="28" width="70" height="30" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="317" y="47" font-size="10" text-anchor="middle">apps</text>
<rect x="282" y="62" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="282" y="62" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="317" y="81" font-size="10" text-anchor="middle">guest OS</text>
<rect x="358" y="28" width="70" height="30" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="358" y="28" width="70" height="30" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="393" y="47" font-size="10" text-anchor="middle">apps</text>
<rect x="358" y="62" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="358" y="62" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.2"/>
<text x="393" y="81" font-size="10" text-anchor="middle">guest OS</text>
<rect x="282" y="96" width="146" height="28" rx="4" class="f-orange" fill-opacity="0.2" stroke="none"/>
<rect x="282" y="96" width="146" height="28" rx="4" fill="none" class="s-orange" stroke-width="1.6"/>
<text x="355" y="114" font-size="10.5" font-weight="700" text-anchor="middle">hypervisor app</text>
<rect x="434" y="62" width="74" height="62" rx="4" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="434" y="62" width="74" height="62" rx="4" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="471" y="90" font-size="10" text-anchor="middle">host apps</text>
<text x="471" y="104" font-size="9" text-anchor="middle" class="t-gray">(IDE, browser)</text>
<rect x="282" y="130" width="226" height="24" rx="5" class="f-teal" fill-opacity="0.18" stroke="none"/>
<rect x="282" y="130" width="226" height="24" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="395" y="146" font-size="10.5" text-anchor="middle">host OS kernel (+ hypervisor driver)</text>
<rect x="282" y="160" width="226" height="30" rx="5" class="f-gray" fill-opacity="0.2" stroke="none"/>
<rect x="282" y="160" width="226" height="30" rx="5" fill="none" class="s-gray" stroke-width="1.4"/>
<text x="395" y="179" font-size="11" text-anchor="middle">hardware (VT-x / AMD-V)</text>
<text x="395" y="210" font-size="10" text-anchor="middle">VirtualBox, VMware Workstation,</text>
<text x="395" y="224" font-size="10" text-anchor="middle">Parallels Desktop</text>
<text x="395" y="244" font-size="9.5" text-anchor="middle" class="t-gray">developer desktops and laptops</text>
</svg>`,
          alt: "Left, type 1: three VMs, each with apps over a guest OS, sit on a hypervisor that sits directly on hardware. Examples: Hyper-V, Xen, VMware ESXi, KVM. Right, type 2: two VMs sit on a hypervisor application, beside ordinary host apps, on top of a host OS kernel with a hypervisor driver, on hardware. Examples: VirtualBox, VMware Workstation, Parallels Desktop.",
          caption: "Type 1 runs on the bare hardware; type 2 runs as an application on a host OS (with a kernel driver to reach VT-x or AMD-V).",
        },
        {
          type: 'p',
          text: "A **type 1** (bare-metal) hypervisor is the most privileged software on the machine; operating systems run only as its guests. Data-center and cloud platforms use type 1. A **type 2** (hosted) hypervisor is an application you install on your desktop OS; it loads a kernel driver to use the CPU's virtualization features but relies on the host OS for scheduling, memory and devices.",
        },
        {
          type: 'p',
          text: "Real systems blur the line. **KVM** turns the Linux kernel itself into the hypervisor (a module), and each VM is an ordinary Linux process; it is usually counted as type 1 because the hypervisor is the host kernel. **Hyper-V** is the interesting case for you: when it is enabled (by WSL2, Docker Desktop, Windows Sandbox, or virtualization-based security, on by default on many Windows 11 PCs), the hypervisor boots first and the Windows you log into runs in the privileged *root partition* on top of it. VirtualBox and VMware Workstation then run their VMs through Hyper-V's API instead of their own drivers.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Consoles are virtualized too",
          text: "The Xbox One and Series consoles run a hypervisor at all times. The game runs in its own virtual machine with a slim \"Game OS\", next to a separate VM for the dashboard, apps and system services. Partitioning lets the console guarantee the game its CPU cores and memory regardless of what the system UI is doing, and adds a hard security boundary around the game.",
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: "You enable WSL2 on your Windows 11 development PC. Where does the Windows desktop you are working in run afterwards?",
      options: [
        { text: "Directly on the hardware, exactly as before; only the Linux VM uses the hypervisor", why: "Hyper-V is a type 1 hypervisor: once enabled it boots first and owns the hardware, so Windows can no longer run beneath or beside it." },
        { text: "In Hyper-V's root partition, a privileged guest running on top of the hypervisor", correct: true, why: "Right. The root partition keeps direct access to most devices and manages the other VMs, but it is still a guest of the hypervisor, which is why a few low-level tools and anti-cheat drivers can behave differently with Hyper-V on." },
        { text: "Inside WSL2's Linux kernel, which now hosts Windows", why: "It is the other way round: the WSL2 Linux kernel runs in a lightweight utility VM managed by Windows." },
        { text: "In a type 2 hypervisor that Windows starts as an application", why: "Hyper-V is not an application; it loads before the Windows kernel during boot." },
      ],
      explanation: "This is why enabling virtualization features can change performance characteristics slightly even when no VM is running: memory and interrupt handling for the root partition now go through the hypervisor, whose page tables also constrain what Windows itself can do. It is also what makes virtualization-based security possible: the hypervisor can protect parts of the Windows kernel even from Windows.",
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: "VT-x: guests run on the CPU until they exit",
      blocks: [
        {
          type: 'p',
          text: "Intel VT-x (AMD-V is analogous) adds two CPU modes. The hypervisor runs in **VMX root mode**; guests run in **VMX non-root mode**, where the guest kernel gets its *own* ring 0 and the guest apps their ring 3, so system calls and page faults inside the guest stay inside the guest. A per-vCPU control structure, the **VMCS**, holds the guest's saved state, the host's state, and the rules for which events must leave the guest. When one happens, the CPU performs a **[[vm-exit|VM exit]]**: it saves the guest state, loads the host state and jumps to the hypervisor, recording an *exit reason*.",
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 460,
  "height": 300,
  "nodes": [
    {
      "id": "app",
      "x": 70,
      "y": 50,
      "label": "app"
    },
    {
      "id": "gos",
      "x": 250,
      "y": 50,
      "label": "guest OS"
    },
    {
      "id": "exit",
      "x": 110,
      "y": 160,
      "label": "VM exit"
    },
    {
      "id": "entry",
      "x": 370,
      "y": 160,
      "label": "VM entry"
    },
    {
      "id": "kvm",
      "x": 230,
      "y": 245,
      "label": "KVM"
    },
    {
      "id": "qemu",
      "x": 400,
      "y": 245,
      "label": "QEMU"
    }
  ],
  "edges": [
    {
      "from": "app",
      "to": "gos",
      "label": "syscall"
    },
    {
      "from": "app",
      "to": "exit",
      "directed": true
    },
    {
      "from": "gos",
      "to": "exit",
      "directed": true
    },
    {
      "from": "exit",
      "to": "kvm",
      "label": "host state",
      "directed": true
    },
    {
      "from": "kvm",
      "to": "entry",
      "label": "VMRESUME",
      "directed": true
    },
    {
      "from": "entry",
      "to": "app",
      "directed": true
    },
    {
      "from": "entry",
      "to": "gos",
      "directed": true
    },
    {
      "from": "kvm",
      "to": "qemu",
      "label": "KVM_RUN"
    }
  ],
  "code": "// guest (VMX non-root mode)\nmov  eax, 0x40000000\ncpuid                ; exit reason 10\nout  dx, al          ; exit reason 30\n// host (VMX root mode)\nhandle_exit(reason)  ; KVM, host kernel\nemulate device       ; QEMU, host user space\nVMRESUME             ; back into the guest",
  "lang": "text",
  "interval": 2200,
  "frames": [
    {
      "note": "The guest app runs **directly on the CPU** at full speed in VMX non-root mode. Ordinary instructions, loads and stores never involve the hypervisor.",
      "nodeColors": [
        {
          "id": "app",
          "color": "orange"
        }
      ],
      "edgeColors": [],
      "lines": [
        2
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "guest rip",
          "0x401000"
        ],
        [
          "VM exits",
          "0"
        ]
      ]
    },
    {
      "note": "A system call inside the guest goes to the **guest** kernel through the guest's own trap table. With VT-x this needs no exit either.",
      "nodeColors": [
        {
          "id": "app",
          "color": "green"
        },
        {
          "id": "gos",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "app",
          "to": "gos",
          "color": "orange"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "VM exits",
          "0"
        ]
      ]
    },
    {
      "note": "Back in the app, `cpuid` asks which CPU this is. CPUID **always** causes a VM exit, so the hypervisor controls what the guest believes it runs on.",
      "nodeColors": [
        {
          "id": "app",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "app",
          "to": "exit",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "guest rip",
          "0x401005"
        ],
        [
          "exit reason",
          "10 (CPUID)"
        ]
      ]
    },
    {
      "note": "The CPU performs the **VM exit** in hardware: it saves the guest's registers and `rip` in the VMCS, loads the host's state, and records the exit reason.",
      "nodeColors": [
        {
          "id": "exit",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "exit",
          "to": "kvm",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "CPU mode",
          "VMX root (host)"
        ],
        [
          "VMCS guest rip",
          "0x401005"
        ],
        [
          "exit reason",
          "10 (CPUID)"
        ],
        [
          "VM exits",
          "1"
        ]
      ]
    },
    {
      "note": "KVM, running in the host kernel, reads the exit reason and emulates `cpuid`: it writes `\"KVMKVMKVM\"` into the guest's `ebx`, `ecx`, `edx` and adds 2 (the instruction's length) to the guest `rip`.",
      "nodeColors": [
        {
          "id": "kvm",
          "color": "orange"
        }
      ],
      "edgeColors": [],
      "lines": [
        6
      ],
      "vars": [
        [
          "CPU mode",
          "VMX root (host)"
        ],
        [
          "guest ebx:ecx:edx",
          "\"KVMKVMKVM\""
        ],
        [
          "VMCS guest rip",
          "0x401005 + 2"
        ]
      ]
    },
    {
      "note": "`VMRESUME` loads the guest state back from the VMCS. The app continues at the next instruction with its answer, unaware that it was paused.",
      "nodeColors": [
        {
          "id": "entry",
          "color": "orange"
        },
        {
          "id": "app",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "kvm",
          "to": "entry",
          "color": "orange"
        },
        {
          "from": "entry",
          "to": "app",
          "color": "orange"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "guest rip",
          "0x401007"
        ],
        [
          "VM exits",
          "1"
        ]
      ]
    },
    {
      "note": "Later the guest's disk driver executes `out dx, al` to an emulated disk controller. Port I/O is configured to exit too.",
      "nodeColors": [
        {
          "id": "gos",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "gos",
          "to": "exit",
          "color": "orange"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "exit reason",
          "30 (I/O instruction)"
        ]
      ]
    },
    {
      "note": "Hardware VM exit again: guest state into the VMCS, host state loaded. KVM sees an I/O port it does not emulate in the kernel.",
      "nodeColors": [
        {
          "id": "exit",
          "color": "orange"
        },
        {
          "id": "kvm",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "exit",
          "to": "kvm",
          "color": "orange"
        }
      ],
      "lines": [
        6
      ],
      "vars": [
        [
          "CPU mode",
          "VMX root (host)"
        ],
        [
          "exit reason",
          "30 (I/O instruction)"
        ],
        [
          "VM exits",
          "2"
        ]
      ]
    },
    {
      "note": "So KVM returns from the `ioctl(KVM_RUN)` call that QEMU, an ordinary host process, is blocked in. QEMU emulates the controller, perhaps reading a disk-image file, then calls `KVM_RUN` again.",
      "nodeColors": [
        {
          "id": "kvm",
          "color": "green"
        },
        {
          "id": "qemu",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "kvm",
          "to": "qemu",
          "color": "orange"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "CPU mode",
          "host user mode (QEMU)"
        ],
        [
          "extra cost",
          "2 more mode switches"
        ]
      ]
    },
    {
      "note": "`VMRESUME`: the guest kernel continues after its `out` instruction. This user-space round trip is why paravirtual devices batch many requests per exit.",
      "nodeColors": [
        {
          "id": "entry",
          "color": "orange"
        },
        {
          "id": "gos",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "kvm",
          "to": "entry",
          "color": "orange"
        },
        {
          "from": "entry",
          "to": "gos",
          "color": "orange"
        }
      ],
      "lines": [
        8
      ],
      "vars": [
        [
          "CPU mode",
          "VMX non-root (guest)"
        ],
        [
          "VM exits",
          "2"
        ]
      ]
    }
  ],
  "caption": "Two VM exits under KVM on Intel VT-x: one handled inside the host kernel, one that needs the QEMU process. Exit-reason numbers are Intel's; the guest addresses are made up."
},
        {
          type: 'p',
          text: "Because CPUID always exits, it is also how software asks \"am I in a VM?\". The hypervisor sets bit 31 of ECX in leaf 1 and answers leaf `0x40000000` with its vendor signature:",
        },
        {
          type: 'code',
          title: "cpuid_hv.cpp (x86-64, GCC or Clang)",
          runnable: true,
          code: `#include <cpuid.h>
#include <cstdio>
#include <cstring>

int main() {
    unsigned a, b, c, d;
    __cpuid(1, a, b, c, d);              // leaf 1: feature flags
    bool hv = c & (1u << 31);            // ECX bit 31: "hypervisor"
    std::printf("hypervisor present: %s\\n", hv ? "yes" : "no");
    if (!hv) return 0;

    __cpuid(0x40000000, a, b, c, d);     // hypervisor's own leaf
    char vendor[13] = {};
    std::memcpy(vendor + 0, &b, 4);
    std::memcpy(vendor + 4, &c, 4);
    std::memcpy(vendor + 8, &d, 4);
    std::printf("hypervisor vendor:  \\"%s\\"\\n", vendor);
}`,
          annotations: [
            { lines: 1, text: "GCC's `<cpuid.h>` wraps the `cpuid` instruction; MSVC has `__cpuid` in `<intrin.h>` with a slightly different signature." },
            { lines: 8, text: "CPU vendors reserved this bit for hypervisors to set. Real hardware always reports 0." },
            { lines: 12, text: "Leaves from `0x40000000` up belong to the hypervisor. The 12-byte vendor string comes back in EBX, ECX and EDX." },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: "Output on the Linux VM that built this course",
          code: `hypervisor present: yes
hypervisor vendor:  "KVMKVMKVM"`,
        },
        {
          type: 'p',
          text: "Inside WSL2 the same program prints `\"Microsoft Hv\"`; on a bare-metal PC with Hyper-V disabled it prints only `no`. The output depends on the machine, which is why it has no expected output here.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Exits are the cost of virtualization",
          text: "Guest code that only computes runs at native speed. Each exit, though, saves and loads hundreds of bytes of state, runs hypervisor code and disturbs caches and the [[tlb|TLB]]: a round trip costs from a few hundred nanoseconds to a few microseconds, depending on the CPU and on whether the host's user space (QEMU) has to get involved. Hypervisor design is largely the art of avoiding exits, for example letting the guest handle its own page faults and timer interrupts in hardware.",
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: "A guest's emulated network card causes **200,000 VM exits per second**, and each exit round trip costs **1.5 µs** of host CPU time. What percentage of one CPU core goes to handling these exits?",
      answer: 30,
      tolerance: 0.5,
      unit: "%",
      hint: "Multiply the exits per second by the seconds per exit.",
      explanation: "200,000 × 1.5 µs = 300,000 µs = 0.3 s of CPU time every second, 30% of a core spent entering and leaving the VM rather than moving packets. An emulated real-world NIC needs several register accesses (each one an exit) per packet. A paravirtual NIC such as virtio-net instead queues many packets in shared memory and notifies the host once per batch, cutting the exit rate by orders of magnitude.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'order',
      prompt: "Put the steps of handling a CPUID instruction in a KVM guest on Intel VT-x in order.",
      linesAreCode: false,
      lines: [
        "Guest code executes `cpuid` in VMX non-root mode",
        "The CPU saves the guest's state in the VMCS, loads the host's state, and records exit reason 10",
        "KVM reads the exit reason and the guest's registers from the VMCS",
        "KVM writes the emulated results into the guest's registers and advances its `rip` past the instruction",
        "`VMRESUME` reloads the guest state and the guest continues at the next instruction",
      ],
      distractors: ["The guest kernel's trap table handles the instruction"],
      explanation: "The hardware does the state switch in both directions; software only decides what the instruction *means* for this VM. Advancing `rip` matters: like a system call (and unlike a page fault), the emulated instruction has completed, so the guest must not execute it again. The distractor is wrong because the exit goes to the hypervisor, not to the guest kernel, which never learns the instruction left the VM.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: "Memory: two levels of translation",
      blocks: [
        {
          type: 'p',
          text: "A guest OS manages its \"physical\" memory with its own page tables, but that memory is itself virtual: the hypervisor decides which real frames back it. So there are three kinds of address: guest virtual, guest physical, and host physical.",
        },
        {
          type: 'list',
          items: [
            "**Shadow page tables** (the software approach): the hypervisor write-protects the guest's page tables, traps every change, and maintains a combined guest-virtual to host-physical table that the real [[mmu|MMU]] uses. It works on any CPU but turns page-table updates, frequent in `fork`-heavy workloads, into exits.",
            "**[[nested-paging|Nested paging]]** (Intel EPT, AMD NPT/RVI, since 2007–2008): the MMU walks the guest's page tables *and* the hypervisor's second-level tables itself. The guest edits its page tables freely with no exits at all.",
          ],
        },
        {
          type: 'p',
          text: "Nested paging moves the cost into TLB misses. Every entry the guest's page walk reads lives at a *guest-physical* address, which must itself be translated through the hypervisor's tables before it can be read. With four levels on each side, one miss can take up to 24 memory reads instead of 4. Two fixes keep this cheap in practice: the [[tlb|TLB]] caches the final guest-virtual to host-physical result (tagged with a per-VM ID, VPID or ASID, so switching VMs need not flush it), and [[huge-pages|huge pages]] in the hypervisor's tables remove levels from the walk.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why the hardware took over the walk",
          text: "With shadow paging, the hypervisor must intercept every guest page-table write to keep its copy in sync, which made process creation and memory-hungry workloads painfully slow in VMs. Nested paging trades many expensive exits for occasional longer walks that the TLB mostly hides: a good deal, because TLB hit rates are typically far above 99%.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: "A guest uses 4-level page tables and the hypervisor's nested (EPT) tables also have 4 levels. On a TLB miss with all page-walk caches empty, how many memory reads of page-table entries does the hardware need to translate one guest-virtual address to a host-physical one?",
      answer: 24,
      label: "Reads",
      hint: "Each of the 4 guest page-table entries sits at a guest-physical address that needs a full nested walk before it can be read. And the final guest-physical address needs one too.",
      explanation: "The guest walk reads 4 entries. Before each read, the entry's guest-physical address needs a 4-level nested walk: 4 × (4 + 1) = 20 reads. The resulting guest-physical address of the data needs one more nested walk: +4. Total (4 + 1) × (4 + 1) − 1 = 24, versus 4 on bare metal. That worst case is why the TLB and huge pages matter even more inside VMs.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "Paravirtualization and fast I/O",
      blocks: [
        {
          type: 'p',
          text: "CPU and memory virtualization are now mostly in hardware. Devices are where VMs still lose time. Emulating a real network card or disk controller means trapping every register access the guest driver makes, and real drivers make many. **[[paravirtualization|Paravirtualization]]** drops the pretence: the guest knows it is in a VM and uses devices designed for that situation.",
        },
        {
          type: 'table',
          headers: ["Approach", "How the guest does I/O", "Speed", "Example"],
          rows: [
            ["Full emulation", "Unmodified driver for a real device; every register access exits", "Slow", "QEMU's emulated e1000 NIC, IDE disk"],
            ["Paravirtual devices", "A VM-aware driver puts requests in shared-memory rings and notifies the host once per batch", "Fast", "virtio-net, virtio-blk; Hyper-V's VMBus devices"],
            ["Hypercalls", "The guest kernel calls the hypervisor directly, like a system call one level down", "Fast", "Xen PV, Hyper-V \"enlightenments\""],
            ["Device passthrough", "The VM owns a real device (or a slice of one) through the IOMMU", "Near native", "GPU passthrough, SR-IOV network cards in cloud VMs"],
          ],
        },
        {
          type: 'p',
          text: "**virtio** is the standard on KVM and most clouds. A virtqueue is a ring buffer in memory both sides can see, much like the shared-memory IPC from the previous unit: the guest fills descriptors for, say, 32 packets, then performs a single \"kick\" (one exit) to tell the host. The host can also process the ring without any kick while it is busy. The IOMMU is what makes passthrough safe: it translates and restricts the device's [[direct-memory-access|DMA]] addresses, so a device given to one VM cannot write into another's memory.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "Cloud gaming is passthrough at scale",
          text: "Streaming services render games on data-center GPUs that are passed through to, or shared between, VMs, then encode the frames as video. The guest runs the normal game and driver; the hypervisor's job is to stay out of the frame's way.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'mcq',
      prompt: "Why is a virtio network device in a KVM guest so much faster than an emulated Intel e1000 network card?",
      options: [
        { text: "virtio packets skip the host's network stack entirely and go straight to the physical NIC", why: "Packets still go through the host (or a passthrough device); the saving is in how the guest and host communicate, not in skipping the host." },
        { text: "The guest batches many requests in a shared-memory ring and notifies the host once, instead of trapping on every device register access", correct: true, why: "Right. Exits are the expensive part, and virtio is designed to need very few of them per packet." },
        { text: "virtio uses UDP while the e1000 uses TCP", why: "Both carry whatever the guest sends; transport protocols are above the device layer." },
        { text: "virtio runs the driver in the host instead of the guest", why: "The guest still runs a virtio driver; it is simply written for a virtual device rather than a real chip." },
      ],
      explanation: "This is the same lesson as system-call batching and shared-memory IPC: crossings are expensive, so do more work per crossing. Paravirtual devices are why a modern cloud VM can push tens of gigabits per second.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "Containers: one kernel, many isolated views",
      blocks: [
        {
          type: 'p',
          text: "A VM virtualizes hardware, so each one needs a whole guest kernel. A **[[os-container|container]]** virtualizes the *operating system* instead: it is an ordinary process (or group of processes) on the host kernel, which simply shows it a private view of the system and limits what it may consume. Two kernel features do almost all the work:",
        },
        {
          type: 'list',
          items: [
            "**[[linux-namespace|Namespaces]]** control what a process can *see*. Each type gives it a private copy of one global resource: PIDs (it is PID 1 in its own tree), mounts (its own root file system, usually an image), network (its own interfaces and ports), hostname (UTS), IPC objects, user IDs (root inside, an unprivileged user outside), cgroups and clocks.",
            "**[[cgroup|Control groups]]** (cgroups) control what it can *use*: CPU time, memory, I/O bandwidth and the number of processes, enforced by the scheduler and memory manager.",
          ],
        },
        {
          type: 'p',
          text: "You can build a crude container from the shell. Here, as root on the course's build VM, `unshare` starts a shell in new UTS (hostname), PID and mount namespaces:",
        },
        {
          type: 'code',
          lang: 'shell',
          title: "Real run as root: the commands and their actual output",
          code: `$ hostname
vm
# unshare --uts --pid --fork --mount-proc bash
# hostname arena-07
# hostname
arena-07
# echo $$
1
# ps -e -o pid,comm
    PID COMMAND
      1 bash
      4 ps
$ hostname
vm`,
          annotations: [
            { lines: 3, text: "`--fork` is needed because the first process created in a new PID namespace becomes its PID 1; `--mount-proc` mounts a fresh `/proc` so `ps` sees only this namespace." },
            { lines: '4-6', text: "Changing the hostname affects only the new UTS namespace." },
            { lines: '7-8', text: "The shell is PID 1 inside, although the host knows it by an ordinary PID." },
            { lines: '9-12', text: "Every other process on the machine is invisible from inside." },
            { lines: '13-14', text: "Back in the host's namespaces after that shell exits, the hostname never changed." },
          ],
        },
        {
          type: 'p',
          text: "Limits go in the cgroup file system. On a system with cgroup v2 (this is illustrative, not captured from the build VM, which uses the older v1 layout), giving a game-server container half a CPU and 2 GiB of memory is just writing to files:",
        },
        {
          type: 'code',
          lang: 'shell',
          title: "cgroup v2 limits (illustrative)",
          code: `# mkdir /sys/fs/cgroup/arena-07
# echo "50000 100000" > /sys/fs/cgroup/arena-07/cpu.max
# echo 2G > /sys/fs/cgroup/arena-07/memory.max
# echo $SERVER_PID > /sys/fs/cgroup/arena-07/cgroup.procs`,
          annotations: [
            { lines: 2, text: "At most 50,000 µs of CPU time per 100,000 µs period: half a CPU." },
            { lines: 3, text: "Exceed it and the kernel reclaims memory, then runs the out-of-memory killer inside this cgroup only." },
            { lines: 4, text: "Move the process (and its future children) into the group." },
          ],
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 234">
<text x="125" y="16" font-size="12.5" font-weight="700" text-anchor="middle">Virtual machines</text>
<rect x="12" y="28" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="12" y="28" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="47.0" y="44.5" font-size="10" text-anchor="middle">game server</text>
<rect x="12" y="58" width="70" height="24" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="12" y="58" width="70" height="24" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="47.0" y="73.5" font-size="10" text-anchor="middle">libs</text>
<rect x="12" y="86" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="12" y="86" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.3"/>
<text x="47.0" y="104.5" font-size="10" text-anchor="middle" font-weight="700">guest kernel</text>
<rect x="90" y="28" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="90" y="28" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="125.0" y="44.5" font-size="10" text-anchor="middle">game server</text>
<rect x="90" y="58" width="70" height="24" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="90" y="58" width="70" height="24" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="125.0" y="73.5" font-size="10" text-anchor="middle">libs</text>
<rect x="90" y="86" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="90" y="86" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.3"/>
<text x="125.0" y="104.5" font-size="10" text-anchor="middle" font-weight="700">guest kernel</text>
<rect x="168" y="28" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="168" y="28" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="203.0" y="44.5" font-size="10" text-anchor="middle">game server</text>
<rect x="168" y="58" width="70" height="24" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="168" y="58" width="70" height="24" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="203.0" y="73.5" font-size="10" text-anchor="middle">libs</text>
<rect x="168" y="86" width="70" height="30" rx="4" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="168" y="86" width="70" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.3"/>
<text x="203.0" y="104.5" font-size="10" text-anchor="middle" font-weight="700">guest kernel</text>
<rect x="12" y="124" width="226" height="30" rx="4" class="f-orange" fill-opacity="0.16" stroke="none"/>
<rect x="12" y="124" width="226" height="30" rx="4" fill="none" class="s-orange" stroke-width="1.3"/>
<text x="125.0" y="142.8" font-size="11" text-anchor="middle" font-weight="700">hypervisor</text>
<rect x="12" y="160" width="226" height="28" rx="4" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="12" y="160" width="226" height="28" rx="4" fill="none" class="s-gray" stroke-width="1.3"/>
<text x="125.0" y="177.8" font-size="11" text-anchor="middle">hardware</text>
<text x="125" y="208" font-size="10" text-anchor="middle">a whole OS per VM: GBs, boots in seconds</text>
<text x="125" y="223" font-size="10" text-anchor="middle">boundary: the virtual hardware</text>
<line x1="260" y1="10" x2="260" y2="236" stroke="currentColor" stroke-width="1" opacity="0.3"/>
<text x="395" y="16" font-size="12.5" font-weight="700" text-anchor="middle">Containers</text>
<rect x="282" y="58" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="282" y="58" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="317.0" y="74.5" font-size="10" text-anchor="middle">game server</text>
<rect x="282" y="88" width="70" height="28" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="282" y="88" width="70" height="28" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="317.0" y="105.5" font-size="10" text-anchor="middle">libs</text>
<rect x="360" y="58" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="360" y="58" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="395.0" y="74.5" font-size="10" text-anchor="middle">game server</text>
<rect x="360" y="88" width="70" height="28" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="360" y="88" width="70" height="28" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="395.0" y="105.5" font-size="10" text-anchor="middle">libs</text>
<rect x="438" y="58" width="70" height="26" rx="4" class="f-blue" fill-opacity="0.16" stroke="none"/>
<rect x="438" y="58" width="70" height="26" rx="4" fill="none" class="s-blue" stroke-width="1.3"/>
<text x="473.0" y="74.5" font-size="10" text-anchor="middle">game server</text>
<rect x="438" y="88" width="70" height="28" rx="4" class="f-teal" fill-opacity="0.16" stroke="none"/>
<rect x="438" y="88" width="70" height="28" rx="4" fill="none" class="s-teal" stroke-width="1.3"/>
<text x="473.0" y="105.5" font-size="10" text-anchor="middle">libs</text>
<text x="395" y="44" font-size="9.5" text-anchor="middle" class="t-gray">each sees its own PIDs, mounts, network</text>
<rect x="282" y="124" width="226" height="30" rx="4" class="f-purple" fill-opacity="0.16" stroke="none"/>
<rect x="282" y="124" width="226" height="30" rx="4" fill="none" class="s-purple" stroke-width="1.3"/>
<text x="395.0" y="136.8" font-size="11" text-anchor="middle" font-weight="700">one shared host kernel</text>
<text x="395.0" y="149.8" font-size="9" text-anchor="middle" class="t-gray">namespaces + cgroups</text>
<rect x="282" y="160" width="226" height="28" rx="4" class="f-gray" fill-opacity="0.16" stroke="none"/>
<rect x="282" y="160" width="226" height="28" rx="4" fill="none" class="s-gray" stroke-width="1.3"/>
<text x="395.0" y="177.8" font-size="11" text-anchor="middle">hardware (or a VM)</text>
<text x="395" y="208" font-size="10" text-anchor="middle">only the userland per container: MBs, starts in ms</text>
<text x="395" y="223" font-size="10" text-anchor="middle">boundary: the system-call interface</text>
</svg>`,
          alt: "Left: three VMs, each a game server over its libraries over a guest kernel, on a hypervisor on hardware. Right: three containers, each a game server over its libraries, all sharing one host kernel with namespaces and cgroups, on hardware or a VM.",
          caption: "VMs repeat the kernel; containers share it. Docker adds image layers, [[seccomp]] filters and dropped capabilities on top of namespaces and cgroups.",
        },
        {
          type: 'table',
          headers: ["Property", "Virtual machine", "Container"],
          rows: [
            ["Isolation boundary", "Virtual hardware (small, hardware-enforced)", "The kernel's system-call interface (large)"],
            ["Kernel", "Its own; any OS", "The host's; Linux containers need a Linux kernel"],
            ["Start-up", "Seconds (boot an OS)", "Milliseconds (start a process)"],
            ["Size", "Gigabytes", "Megabytes"],
            ["Typical use", "Separating tenants, different OSes", "Packaging and scaling one service"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why clouds put containers inside VMs",
          text: "A kernel bug is a container escape: every container on the host shares that kernel, and its interface has hundreds of system calls. A VM's interface to the hypervisor is much smaller. So cloud providers isolate *customers* with VMs and let each customer pack *services* into containers inside them; some (such as AWS Firecracker, which runs Lambda) even give each container its own tiny VM.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'fill',
      prompt: "Complete the description of what a Linux container is made of.",
      templateIsCode: false,
      template: "A container is an ordinary process. ___ give it a private view of PIDs, mounts, the network and the hostname; ___ limit how much CPU, memory and I/O it can use; and ___ filters restrict which system calls it may make.",
      blanks: [{ answers: ["Namespaces", "namespaces"] }, { answers: ["cgroups", "Cgroups", "Control groups"] }, { answers: ["seccomp"] }],
      wordBank: ["Namespaces", "cgroups", "seccomp", "Hypervisors", "Page tables", "VMCS"],
      explanation: "Namespaces answer \"what can it see?\", cgroups \"how much can it use?\", and seccomp (plus dropped capabilities) \"what may it ask the kernel to do?\". None of them involves a hypervisor or a second kernel, which is why containers start in milliseconds and also why they share the host kernel's attack surface.",
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: "When you run a Linux container with Docker Desktop on Windows, the container's processes run directly on the Windows NT kernel.",
      answer: false,
      explanation: "Linux containers need a Linux kernel to provide namespaces and cgroups and to execute Linux system calls. Docker Desktop runs them inside a Linux VM, by default the WSL2 utility VM on Hyper-V, so a Linux container on Windows is a container inside a VM. Windows also has its own *Windows containers* for Windows binaries, which share the NT kernel (process isolation) or get a small VM each (Hyper-V isolation).",
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'concept',
      title: "WSL2 and Docker for a Windows game developer",
      blocks: [
        {
          type: 'p',
          text: "**[[wsl2|WSL2]]** gives you a real Linux kernel, maintained by Microsoft, running in a lightweight Hyper-V utility VM that starts in a second or two and grows and shrinks its memory on demand. (The original WSL1 instead translated Linux system calls into NT calls inside Windows, which was clever but never fully compatible.) Docker Desktop uses the same VM to run Linux containers.",
        },
        {
          type: 'table',
          headers: ["Use it for", "Why"],
          rows: [
            ["Building and testing Linux dedicated servers", "Most game servers ship on Linux; reproduce the production environment locally"],
            ["Running the server in the same container image as production", "\"Works on my machine\" becomes \"works in this image\""],
            ["Linux tools: `strace`, `perf`, sanitizers, `gdb`", "Everything in this course's runnable examples works there"],
            ["CI build agents and reproducible toolchains", "A Dockerfile pins compiler and library versions"],
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Keep Linux builds on the Linux file system",
          text: "WSL2's own files live in an ext4 virtual disk and are fast. Your Windows drives appear under `/mnt/c`, but every access crosses the VM boundary through a file-sharing protocol, which makes a large C++ build there several times slower. Clone repositories you build in Linux into your Linux home directory, and reach them from Windows tools via `\\\\wsl$\\` paths when needed.",
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal builds Linux dedicated servers from Windows with Epic's cross-compile toolchain; you can then test the server binary in WSL2 or in a container before uploading it. Epic also publishes official container images for building and running Unreal projects, intended for CI and for packaging dedicated servers.",
        },
      ],
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: "Cloud game servers: containers in VMs on someone else's hypervisor",
      blocks: [
        {
          type: 'p',
          text: "When your multiplayer game launches, its [[dedicated-server|dedicated servers]] will almost certainly run as containers (or plain processes) inside cloud VMs: AWS's Nitro hypervisor is based on KVM, Google Cloud runs KVM, and Azure runs Hyper-V. Orchestrators then start and stop server instances as players come and go: Agones (open source, Kubernetes-based, from Google and Ubisoft), Amazon GameLift and Azure PlayFab Multiplayer Servers.",
        },
        {
          type: 'list',
          items: [
            "**Density:** a 64-vCPU VM can host dozens of match servers as containers, each limited by cgroups to, say, one CPU and 2 GiB, which is far cheaper than a VM per match.",
            "**Steal time:** a vCPU is a thread the hypervisor schedules. When the host runs other VMs' vCPUs on your physical core, your server simply does not run, and Linux reports that as **steal** (`st` in `top`). Burstable instance types that ration CPU credits are especially prone to it, and a server that misses ticks under steal needs dedicated or compute-optimized instances.",
            "**Timers and clocks:** a VM's clock is virtualized too. Servers should use monotonic clocks (`std::chrono::steady_clock`) and tolerate occasional scheduling hiccups, never assume a sleep wakes on time.",
            "**Fast scale-up:** containers start in milliseconds, so a fleet can add matches quickly; pre-warmed VMs absorb launch-day spikes.",
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Partitioning in safety-critical systems",
          text: "The same idea protects lives in avionics and defence electronics. Standards such as ARINC 653 partition one processor's time and memory between applications of different criticality, so that a flight-control partition keeps its guaranteed time slots and memory even if a display or mission partition on the same board misbehaves. Separation kernels and certified hypervisors are built for exactly this, with far smaller code than a general-purpose OS so they can be verified.",
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'mcq',
      prompt: "Your 30 Hz Linux match server (33.3 ms per tick) on a small cloud VM misses ticks at random moments. Inside the VM, `top` shows the server using only 60% of a CPU, but the `st` column regularly reads 25–40%. What is the most likely cause?",
      options: [
        { text: "The Linux scheduler is wasting time switching between the server's threads", why: "Context switches inside the guest show up as system time, not as steal time." },
        { text: "The hypervisor is running other tenants' vCPUs on the physical cores, so your vCPU is not running for those periods", correct: true, why: "Right. Steal time is time your vCPU was ready to run but the hypervisor gave the core to someone else. The fix is an instance type with dedicated cores, not optimizing your code." },
        { text: "The VM's memory is swapping to disk", why: "Swapping shows up as I/O wait and major page faults, not as steal." },
        { text: "Thermal throttling inside the VM", why: "Guests cannot throttle the physical CPU; throttling would show up as lower clock speed for everyone, not as steal." },
      ],
      explanation: "Virtualization's illusion is good enough that ordinary tools inside the guest cannot see why time vanished; steal time is the one counter the hypervisor exposes for it. For a real-time workload like a game server, consistent CPU availability matters more than average throughput, which is why fleets run on compute-optimized, non-burstable instances and keep a margin in their tick budget.",
    },
  ],
  takeaways: [
    "A hypervisor gives each VM the illusion of a whole machine by trap-and-emulate: guest code runs directly on the CPU, and sensitive operations trap to the hypervisor. Classic x86 needed binary translation or paravirtualization until VT-x and AMD-V (2005–2006).",
    "Type 1 hypervisors (Hyper-V, Xen, ESXi, KVM) own the hardware; type 2 (VirtualBox, VMware Workstation) run on a host OS. With Hyper-V enabled, your Windows desktop runs in its root partition.",
    "On VT-x, guests run in non-root mode until a VM exit saves their state in the VMCS and enters the hypervisor; exits cost hundreds of nanoseconds to microseconds, so good designs avoid them.",
    "Nested paging (EPT/NPT) lets guests manage their own page tables without exits, at the price of up to 24 memory reads per TLB miss with 4-level tables on both sides; the TLB and huge pages hide most of it.",
    "Paravirtual devices (virtio, VMBus) batch I/O through shared-memory rings; passthrough with an IOMMU gives a VM a real device.",
    "Containers are host processes isolated by namespaces, limited by cgroups and filtered by seccomp: fast and small, but they share the host kernel, so clouds put them inside VMs. On Windows, WSL2 and Docker Desktop run Linux containers in a Hyper-V VM.",
  ],
  reading: [
    {
      title: "Virtual Machine Monitors (OSTEP appendix)",
      url: "https://pages.cs.wisc.edu/~remzi/OSFEP/vmm-intro.pdf",
      source: 'book',
      note: "Trap-and-emulate, how a VMM virtualizes the CPU and memory, and the cost of virtualizing page tables in software.",
    },
    {
      title: "namespaces(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/namespaces.7.html",
      source: 'other',
      note: "Every namespace type, the system calls that create them, and the /proc files that show them.",
    },
    {
      title: "cgroups(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/cgroups.7.html",
      source: 'other',
      note: "Control groups v1 and v2, controllers and the files that set limits.",
    },
    {
      title: "Comparing WSL Versions (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/wsl/compare-versions",
      source: 'other',
      note: "How WSL1 and WSL2 differ, and why file performance depends on which file system you build in.",
    },
    {
      title: "Popek and Goldberg virtualization requirements",
      url: "https://en.wikipedia.org/wiki/Popek_and_Goldberg_virtualization_requirements",
      source: 'article',
      note: "The 1974 conditions for efficient virtualization and why classic x86 failed them.",
    },
  ],
};
