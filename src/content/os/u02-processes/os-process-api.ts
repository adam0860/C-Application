import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-process-api",
  title: "Creating and Managing Processes",
  summary: "fork, exec and waitpid from C++: how a process copies itself, becomes another program and reports back, why Unix splits creation in two, zombies and orphans, posix_spawn, Windows' CreateProcess, and how a shell runs your command.",
  minutes: 22,
  objectives: [
    "Use `fork` and predict how many processes a sequence of forks creates",
    "Replace a process's program with the `exec` family and explain what survives an `exec`",
    "Collect a child's exit status with `waitpid` and decode it with `WIFEXITED`, `WEXITSTATUS` and `WIFSIGNALED`",
    "Explain zombies and orphans, and avoid leaking either",
    "Explain why Unix splits creation into fork + exec, how a shell uses the gap for redirection, and when to prefer `posix_spawn` or Windows' `CreateProcessW`",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "fork: one call, two returns",
      blocks: [
        {
          type: 'p',
          text: "On POSIX systems a new process is born by copying an existing one. [[fork-syscall|`fork()`]] creates a **child** that is a near-exact duplicate of the caller (the **parent**): same code, same variables, same open files, same position in the program. Both continue from the instruction right after `fork`. The only difference is the return value, and that is how each copy knows which one it is.",
        },
        {
          type: 'code',
          title: "fork_basics.cpp",
          runnable: true,
          code: `#include <iostream>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    int lives = 3;
    std::cout << "before fork: one process" << std::endl;

    pid_t pid = fork();
    if (pid == -1) {
        std::perror("fork");
        return 1;
    }
    if (pid == 0) {                      // child
        lives = 99;
        std::cout << "child:  fork returned 0, lives = "
                  << lives << '\\n';
        return 0;                        // child exits here
    }
    waitpid(pid, nullptr, 0);            // parent: wait for child
    std::cout << "parent: fork returned a PID > 0: "
              << std::boolalpha << (pid > 0)
              << ", lives = " << lives << '\\n';
}`,
          output: "before fork: one process\nchild:  fork returned 0, lives = 99\nparent: fork returned a PID > 0: true, lives = 3",
          annotations: [
            { lines: 7, text: "`std::endl` flushes *before* forking. Anything left in the stream buffer would be copied into the child and printed twice (you will hunt exactly that bug later in this lesson)." },
            { lines: 9, text: "Called once, returns twice: the child's PID in the parent, 0 in the child, or −1 (in the parent only) if no child could be created." },
            { lines: '14-18', text: "The child's `lives` is its own copy. Changing it cannot affect the parent, just like the `g_gold` demo in unit 1." },
            { lines: 20, text: "Without this wait, the parent and child would race and the two lines could come out in either order. Waiting makes the output deterministic." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Copying a whole process sounds expensive. Why is fork fast?",
          text: "The kernel does not copy memory at `fork` time. It copies the page *tables*, marks every writable page read-only in both processes, and lets them share the physical pages. The first time either one writes to a page, the CPU raises a page fault and the kernel gives the writer a private copy of just that page. This trick is called **copy-on-write**. A child that immediately calls `exec` copies almost nothing. A child of a 20 GB editor process still has to copy 20 GB worth of page tables, though, which is one reason big programs avoid plain `fork`.",
        },
        {
          type: 'table',
          headers: ["The child gets a copy of…", "…but its own new…"],
          rows: [
            ["the address space (code, globals, heap, stack), copy-on-write", "PID, and its parent PID is the forker"],
            ["the descriptor table: same open files, **shared** file offsets", "CPU-time accounting, starting at zero"],
            ["the current directory, environment, user ID, signal handlers", "set of pending signals (empty)"],
            ["only the thread that called `fork`", "nothing for the other threads: they do not exist in the child"],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: "Counting processes: forks multiply",
      blocks: [
        {
          type: 'p',
          text: "Because the child continues from the same point, a `fork` inside a loop is executed by every process that reaches it, including the children of earlier iterations. Step through a real run of a three-iteration loop:",
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 460,
  "height": 270,
  "nodes": [
    {
      "id": "P",
      "x": 230,
      "y": 36,
      "label": "P"
    },
    {
      "id": "P0",
      "x": 110,
      "y": 106,
      "label": "P0"
    },
    {
      "id": "P1",
      "x": 270,
      "y": 106,
      "label": "P1"
    },
    {
      "id": "P2",
      "x": 400,
      "y": 106,
      "label": "P2"
    },
    {
      "id": "P01",
      "x": 60,
      "y": 176,
      "label": "P01"
    },
    {
      "id": "P02",
      "x": 160,
      "y": 176,
      "label": "P02"
    },
    {
      "id": "P12",
      "x": 270,
      "y": 176,
      "label": "P12"
    },
    {
      "id": "P012",
      "x": 60,
      "y": 240,
      "label": "P012"
    }
  ],
  "edges": [
    {
      "from": "P",
      "to": "P0",
      "label": "i=0",
      "directed": true
    },
    {
      "from": "P",
      "to": "P1",
      "label": "i=1",
      "directed": true
    },
    {
      "from": "P0",
      "to": "P01",
      "label": "i=1",
      "directed": true
    },
    {
      "from": "P",
      "to": "P2",
      "label": "i=2",
      "directed": true
    },
    {
      "from": "P0",
      "to": "P02",
      "label": "i=2",
      "directed": true
    },
    {
      "from": "P01",
      "to": "P012",
      "label": "i=2",
      "directed": true
    },
    {
      "from": "P1",
      "to": "P12",
      "label": "i=2",
      "directed": true
    }
  ],
  "code": "for (int i = 0; i < 3; ++i) {\n    fork();\n}\n// every process reaches here",
  "interval": 1500,
  "frames": [
    {
      "note": "One process, `P`, is about to enter the loop.",
      "hidden": [
        "P0",
        "P1",
        "P2",
        "P01",
        "P02",
        "P12",
        "P012"
      ],
      "nodeColors": [
        {
          "id": "P",
          "color": "orange"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "i",
          "0"
        ],
        [
          "processes",
          "1"
        ]
      ]
    },
    {
      "note": "Iteration `i = 0`: `P` calls `fork()` and gets child `P0`, a copy that continues the same loop.",
      "hidden": [
        "P1",
        "P2",
        "P01",
        "P02",
        "P12",
        "P012"
      ],
      "nodeColors": [
        {
          "id": "P",
          "color": "blue"
        },
        {
          "id": "P0",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "P",
          "to": "P0",
          "color": "orange"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "i",
          "0"
        ],
        [
          "processes",
          "1 → 2"
        ]
      ]
    },
    {
      "note": "Iteration `i = 1`: every live process (`P`, `P0`) calls `fork()`, and each gets one child.",
      "hidden": [
        "P2",
        "P02",
        "P12",
        "P012"
      ],
      "nodeColors": [
        {
          "id": "P",
          "color": "blue"
        },
        {
          "id": "P0",
          "color": "blue"
        },
        {
          "id": "P1",
          "color": "orange"
        },
        {
          "id": "P01",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "P",
          "to": "P1",
          "color": "orange"
        },
        {
          "from": "P0",
          "to": "P01",
          "color": "orange"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "i",
          "1"
        ],
        [
          "processes",
          "2 → 4"
        ]
      ]
    },
    {
      "note": "Iteration `i = 2`: every live process (`P`, `P0`, `P01`, `P1`) calls `fork()`, and each gets one child.",
      "hidden": [],
      "nodeColors": [
        {
          "id": "P",
          "color": "blue"
        },
        {
          "id": "P0",
          "color": "blue"
        },
        {
          "id": "P01",
          "color": "blue"
        },
        {
          "id": "P1",
          "color": "blue"
        },
        {
          "id": "P2",
          "color": "orange"
        },
        {
          "id": "P02",
          "color": "orange"
        },
        {
          "id": "P012",
          "color": "orange"
        },
        {
          "id": "P12",
          "color": "orange"
        }
      ],
      "edgeColors": [
        {
          "from": "P",
          "to": "P2",
          "color": "orange"
        },
        {
          "from": "P0",
          "to": "P02",
          "color": "orange"
        },
        {
          "from": "P01",
          "to": "P012",
          "color": "orange"
        },
        {
          "from": "P1",
          "to": "P12",
          "color": "orange"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "i",
          "2"
        ],
        [
          "processes",
          "4 → 8"
        ]
      ]
    },
    {
      "note": "The loop ends in all 8 processes. A child starts with the loop index it inherited, so `P2` (born at `i = 2`) never forks.",
      "hidden": [],
      "nodeColors": [
        {
          "id": "P",
          "color": "green"
        },
        {
          "id": "P0",
          "color": "green"
        },
        {
          "id": "P1",
          "color": "green"
        },
        {
          "id": "P2",
          "color": "green"
        },
        {
          "id": "P01",
          "color": "green"
        },
        {
          "id": "P02",
          "color": "green"
        },
        {
          "id": "P12",
          "color": "green"
        },
        {
          "id": "P012",
          "color": "green"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "processes",
          "8"
        ],
        [
          "fork() calls",
          "7"
        ]
      ]
    }
  ],
  "caption": "Generated from a real run of this loop, with each process logging its forks under a logical name (PIDs differ every run)."
},
        {
          type: 'p',
          text: "Each iteration doubles the number of processes, so *n* iterations give 2ⁿ processes, 2ⁿ − 1 of them new. Notice the names: a child inherits the parent's loop variable, so `P2` (born during the last iteration) never forks at all, while `P` forks three times.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Fork bombs",
          text: "`while (true) fork();` doubles the process count until the machine runs out of PIDs or memory and becomes unusable. Systems defend with per-user process limits (`ulimit -u` on Linux). An accidental fork bomb usually comes from a child that forgets to `exit` and falls back into the parent's loop, so always end the child's branch explicitly.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: "How many processes exist in total (counting the original) when this code finishes, assuming every `fork` succeeds?",
      code: `int main() {
    if (fork() == 0) {
        fork();
    }
    fork();
}`,
      answer: 6,
      label: "Processes:",
      hint: "Draw the tree. Only the first child takes the `if` branch.",
      explanation: "The original `P` forks child `C`. Only `C` sees 0 and enters the `if`, where it forks grandchild `G`. Now three processes (P, C, G) all reach the last `fork`, and each creates one more: 3 + 3 = 6. We checked it by having every process write one byte to a pipe and counting the bytes. Counting questions are easiest with a tree: one level per `fork`, one branch per process that executes it.",
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: "exec: becoming a different program",
      blocks: [
        {
          type: 'p',
          text: "`fork` alone can only make copies of the *same* program. To run something else, a process calls one of the [[exec-syscall|`exec`]] functions, which throw away the current program and load a new one *into the same process*: same PID, same parent, same open descriptors, brand-new code, data, heap and stack.",
        },
        {
          type: 'code',
          title: "fork_exec.cpp",
          runnable: true,
          code: `#include <cstdio>
#include <iostream>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    std::cout << "launching echo..." << std::endl;
    pid_t pid = fork();
    if (pid == -1) return 1;
    if (pid == 0) {
        // Replace this program with /bin/echo. On success,
        // execlp never returns.
        execlp("echo", "echo", "hello from a new program", nullptr);
        std::perror("execlp");           // only reached on failure
        _exit(127);
    }
    int status = 0;
    waitpid(pid, &status, 0);
    if (WIFEXITED(status)) {
        std::cout << "echo exited with code "
                  << WEXITSTATUS(status) << '\\n';
    }
}`,
          output: "launching echo...\nhello from a new program\necho exited with code 0",
          annotations: [
            { lines: 13, text: "`l` = arguments as a list, `p` = search `PATH` for the program. By convention the first argument (`argv[0]`) repeats the program's name. The list must end with a null pointer." },
            { lines: '14-15', text: "If `exec` returns at all, it failed (for example the program does not exist). The child must then exit; otherwise it would carry on running the *parent's* code." },
            { lines: 15, text: "`_exit` ends the child at once without running `atexit` handlers or flushing stdio buffers copied from the parent. 127 is the shell's conventional \"command not found\" code." },
          ],
        },
        {
          type: 'table',
          headers: ["Function", "Arguments", "Finds the program", "Environment"],
          rows: [
            ["`execl`", "list", "full path", "inherited"],
            ["`execlp`", "list", "searches `PATH`", "inherited"],
            ["`execv`", "array `char* argv[]`", "full path", "inherited"],
            ["`execvp`", "array", "searches `PATH`", "inherited"],
            ["`execve`", "array", "full path", "explicit `envp` (the real system call; the others are library wrappers)"],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Descriptors survive exec, unless you say otherwise",
          text: "Every open descriptor stays open across `exec`, so a launched tool silently inherits your save file, your sockets and your pipes. Open things with `O_CLOEXEC` (or set `FD_CLOEXEC`) so they close automatically on `exec`. Modern code makes close-on-exec the default and keeps only what it deliberately hands to the child, such as 0, 1 and 2.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'truefalse',
      prompt: "`execvp` creates a new process to run the program, and the calling process continues with the next line once the program has started.",
      answer: false,
      explanation: "`exec` creates nothing. It replaces the program running in the *current* process, keeping its PID, and never returns on success: the code that called it is gone. That is why the pattern is always `fork` first (make a new process) and then `exec` in the child (change what it runs), while the parent continues and usually waits.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: "waitpid and exit statuses",
      blocks: [
        {
          type: 'p',
          text: "A parent learns how its child ended with `waitpid(pid, &status, options)`. It blocks until that child has finished (or returns immediately with `WNOHANG`), then fills `status`, a packed integer you decode with macros:",
        },
        {
          type: 'code',
          title: "exit_status.cpp",
          runnable: true,
          code: `#include <csignal>
#include <cstdlib>
#include <iostream>
#include <sys/wait.h>
#include <unistd.h>

// Run job() in a child, wait for it, describe how it ended.
template <class Job>
void runAndReport(const char* name, Job job) {
    pid_t pid = fork();
    if (pid == -1) std::exit(1);
    if (pid == 0) {
        job();
        _exit(0);
    }
    int status = 0;
    waitpid(pid, &status, 0);
    std::cout << name << ": ";
    if (WIFEXITED(status))
        std::cout << "exited, code " << WEXITSTATUS(status) << '\\n';
    else if (WIFSIGNALED(status))
        std::cout << "killed by signal " << WTERMSIG(status) << '\\n';
}

int main() {
    runAndReport("clean   ", [] {});
    runAndReport("error   ", [] { _exit(3); });
    runAndReport("too big ", [] { _exit(300); });
    runAndReport("killed  ", [] { raise(SIGKILL); });
}`,
          output: "clean   : exited, code 0\nerror   : exited, code 3\ntoo big : exited, code 44\nkilled  : killed by signal 9",
          annotations: [
            { lines: '12-15', text: "Children always leave through `_exit`, never by returning into the parent's code. `_exit` also avoids flushing the copy of `std::cout`'s buffer the child inherited, which would print the parent's pending text twice." },
            { lines: 19, text: "`WIFEXITED`: the child called `exit`/`_exit` or returned from `main`. Then `WEXITSTATUS` gives the code." },
            { lines: 21, text: "`WIFSIGNALED`: a signal killed it (a crash such as `SIGSEGV`, or `SIGKILL` from outside). Then `WTERMSIG` names the signal." },
            { lines: 28, text: "Only the low 8 bits of an exit code survive: 300 mod 256 = 44. Keep codes in 0–255, and use 0 for success." },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "Exit codes are an API",
          text: "Build systems, CI, launchers and test runners decide success or failure from your exit code alone. Return 0 only on success, use small distinct non-zero codes for distinct failures, and document them. A cooking or packaging tool that returns 0 after an error lets a broken build ship.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'numeric',
      prompt: "A child process ends with `std::exit(-1)`. What value does the parent's `WEXITSTATUS(status)` report?",
      answer: 255,
      hint: "Only the low 8 bits are kept. What is −1 in 8-bit two's complement, read as unsigned?",
      explanation: "The kernel keeps `code & 0xFF`. −1 is all ones in two's complement, so the low byte is `0xFF` = 255. That is why shells show 255 for programs that \"return -1\", and why −1 is a poor exit code: it collides with real codes. Use `EXIT_FAILURE` (1) or your own documented small positive values.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: "Zombies and orphans",
      blocks: [
        {
          type: 'p',
          text: "When a process exits, the kernel frees its memory and descriptors at once, but it cannot throw away the PCB yet: the parent may still want the exit status. Until the parent calls `wait`/`waitpid`, the dead child remains a [[zombie-process|zombie]]: state `Z`, holding a PID and a few hundred bytes of kernel memory. This program catches its child in that state by waiting with `WNOWAIT`, which reports the exit without reaping:",
        },
        {
          type: 'code',
          title: "zombie.cpp",
          runnable: true,
          code: `#include <fstream>
#include <iostream>
#include <string>
#include <sys/wait.h>
#include <unistd.h>

// The state from /proc/<pid>/status, or a note if it is gone.
std::string stateOf(pid_t pid) {
    std::ifstream in{"/proc/" + std::to_string(pid) + "/status"};
    for (std::string line; std::getline(in, line);) {
        if (line.rfind("State:", 0) == 0) return line.substr(7);
    }
    return "(no such process)";
}

int main() {
    pid_t pid = fork();
    if (pid == -1) return 1;
    if (pid == 0) {
        _exit(7);                       // child dies at once
    }
    // Wait until the child has exited, but do NOT reap it.
    siginfo_t info{};
    waitid(P_PID, pid, &info, WEXITED | WNOWAIT);
    std::cout << "before waitpid: " << stateOf(pid) << '\\n';

    int status = 0;
    waitpid(pid, &status, 0);           // reap: the zombie goes
    std::cout << "exit code:      " << WEXITSTATUS(status) << '\\n';
    std::cout << "after waitpid:  " << stateOf(pid) << '\\n';
}`,
          output: "before waitpid: Z (zombie)\nexit code:      7\nafter waitpid:  (no such process)",
          annotations: [
            { lines: 11, text: "The line looks like `State:\\tZ (zombie)`; `substr(7)` skips the key and the tab." },
            { lines: 24, text: "`waitid` with `WNOWAIT` blocks until the child has exited but leaves it unreaped, so we can observe the zombie without any sleeping or timing." },
            { lines: 28, text: "The real reap. Afterwards the PID is free for reuse and `/proc/<pid>` is gone." },
          ],
        },
        {
          type: 'p',
          text: "The reverse case is an [[orphan-process|orphan]]: the parent dies first. Linux re-parents the orphan to PID 1 (`init`/`systemd`) or to the nearest ancestor that declared itself a **subreaper**, and that process reaps it when it exits. Orphans are harmless by themselves; it is unreaped zombies that leak.",
        },
        {
          type: 'deepdive',
          title: "Watching an orphan get adopted",
          blocks: [
            {
              type: 'code',
              title: "orphan.cpp (Linux)",
              runnable: true,
              code: `#include <iostream>
#include <sched.h>
#include <sys/prctl.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    // Ask to adopt orphaned descendants (Linux-specific).
    prctl(PR_SET_CHILD_SUBREAPER, 1);
    const pid_t me = getpid();

    pid_t middle = fork();
    if (middle == 0) {
        if (fork() == 0) {                    // grandchild
            while (getppid() != me) {         // wait until orphaned
                sched_yield();
            }
            std::cout << "grandchild: my parent is gone; "
                         "the subreaper adopted me\\n";
            return 0;
        }
        _exit(0);                             // middle exits at once
    }
    waitpid(middle, nullptr, 0);              // reap the middle
    pid_t adopted = wait(nullptr);            // now our child too
    std::cout << "top: reaped the middle and the adopted "
                 "grandchild: " << std::boolalpha << (adopted > 0)
              << '\\n';
}`,
              output: "grandchild: my parent is gone; the subreaper adopted me\ntop: reaped the middle and the adopted grandchild: true",
              annotations: [
                { lines: 9, text: "Without this, the orphan would be adopted by PID 1 (or whatever subreaper the session already has, such as `systemd --user`)." },
                { lines: '15-17', text: "`getppid()` changes the moment the middle process dies and the kernel re-parents the grandchild." },
                { lines: 25, text: "The adopted grandchild is now *our* child, so a plain `wait` reaps it. The top process prints only after both waits, which keeps the output order fixed." },
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'bug',
      prompt: "An editor tool launches a short-lived converter for each imported texture. After importing 30,000 textures, `ps` shows thousands of `<defunct>` entries and launching eventually fails with `EAGAIN`. Tap the line that needs fixing (the fix may be to add a call right after it).",
      code: `void convertAsync(const std::string& path) {
    pid_t pid = fork();
    if (pid == -1) {
        throw std::system_error(errno, std::generic_category(),
                                "fork");
    }
    if (pid == 0) {
        execlp("texconv", "texconv", path.c_str(), nullptr);
        _exit(127);
    }
    pendingImports.push_back(pid);   // remember it, never wait
}`,
      bugLines: [11],
      hint: "What does the kernel keep for a child that has exited until somebody asks about it?",
      explanation: "Nobody ever calls `waitpid` on the children, so each finished converter stays a zombie holding a PID. When the user's process limit or the PID space runs out, `fork` fails with `EAGAIN`. Fix it by reaping: poll `waitpid(pid, &status, WNOHANG)` for the remembered PIDs each frame (which also tells you which imports finished and whether they succeeded), or reap in a `SIGCHLD` handler. If you truly never care about the result, setting `SIGCHLD` to `SIG_IGN` makes Linux reap automatically, but then you also lose the exit codes.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "Why fork and exec are separate: how a shell runs a command",
      blocks: [
        {
          type: 'p',
          text: "Splitting creation in two looks clumsy, but the gap between `fork` and `exec` is the point. In that gap the child is still running *your* code, so it can set up the new program's world with ordinary system calls: redirect descriptors, close others, change directory, lower its priority, drop privileges. The new program inherits the result without knowing any of it happened. Here is what a shell does for `ls > out.txt`:",
        },
        {
  "type": "algo",
  "view": "array",
  "code": "pid_t pid = fork();\nif (pid == 0) {          // child\n    int fd = open(\"out.txt\", flags, 0644);\n    dup2(fd, STDOUT_FILENO);\n    close(fd);\n    execvp(\"ls\", argv);\n}\nwaitpid(pid, &status, 0); // parent",
  "interval": 1700,
  "frames": [
    {
      "note": "The shell's descriptor table: 0, 1 and 2 (stdin, stdout, stderr) all refer to the terminal.",
      "array": [
        "tty",
        "tty",
        "tty",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        }
      ],
      "pointers": [],
      "lines": [
        1
      ],
      "vars": [
        [
          "process",
          "shell"
        ]
      ]
    },
    {
      "note": "`fork()` gives the child an identical copy of the table. Same open files, same positions.",
      "array": [
        "tty",
        "tty",
        "tty",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "gray"
        },
        {
          "index": 2,
          "color": "gray"
        }
      ],
      "pointers": [],
      "lines": [
        1
      ],
      "vars": [
        [
          "process",
          "child (still the shell program)"
        ]
      ]
    },
    {
      "note": "The child opens `out.txt` (`flags` = write, create, truncate). `open` always returns the **lowest free** descriptor: 3.",
      "array": [
        "tty",
        "tty",
        "tty",
        "out",
        "·"
      ],
      "marks": [
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "fd"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "process",
          "child"
        ],
        [
          "fd",
          "3"
        ]
      ]
    },
    {
      "note": "`dup2(fd, 1)` closes descriptor 1 and makes it refer to the same open file as 3. Standard output now goes to `out.txt`.",
      "array": [
        "tty",
        "out",
        "tty",
        "out",
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "stdout"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "process",
          "child"
        ]
      ]
    },
    {
      "note": "`close(fd)` drops the extra descriptor. Leaving it open would leak it into `ls`.",
      "array": [
        "tty",
        "out",
        "tty",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 3,
          "color": "red"
        }
      ],
      "pointers": [],
      "lines": [
        5
      ],
      "vars": [
        [
          "process",
          "child"
        ]
      ]
    },
    {
      "note": "`execvp(\"ls\")` replaces the program but **keeps the table**. `ls` writes to fd 1 as always, unaware it is a file.",
      "array": [
        "tty",
        "out",
        "tty",
        "·",
        "·"
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
          "label": "ls writes"
        }
      ],
      "lines": [
        6
      ],
      "vars": [
        [
          "process",
          "child, now running ls"
        ]
      ]
    },
    {
      "note": "Meanwhile the parent waits in `waitpid`. When `ls` exits, the shell collects its status and prints the next prompt. The shell's own table (0, 1, 2: terminal) never changed.",
      "array": [
        "tty",
        "out",
        "tty",
        "·",
        "·"
      ],
      "marks": [
        {
          "index": 1,
          "color": "gray"
        }
      ],
      "pointers": [],
      "lines": [
        8
      ],
      "vars": [
        [
          "process",
          "child exited"
        ]
      ]
    }
  ],
  "caption": "The child's file-descriptor table (indices are descriptor numbers) while a shell runs `ls > out.txt`."
},
        {
          type: 'p',
          text: "`dup2(old, new)` makes descriptor `new` refer to the same open file as `old`, closing whatever `new` was before. The same trick, in a runnable program that captures a child's output into a file and reads it back:",
        },
        {
          type: 'code',
          title: "redirect.cpp",
          runnable: true,
          code: `#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <string>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    const char* path = "/tmp/forge_redirect.txt";
    pid_t pid = fork();
    if (pid == -1) return 1;
    if (pid == 0) {                       // child: like \`echo ... > file\`
        int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
        if (fd == -1) _exit(126);
        dup2(fd, STDOUT_FILENO);          // fd 1 now means the file
        close(fd);                        // the copy at fd 1 is enough
        execlp("echo", "echo", "level 3 loaded", nullptr);
        _exit(127);                       // exec failed
    }
    int status = 0;
    waitpid(pid, &status, 0);

    std::ifstream in{path};
    std::string line;
    std::getline(in, line);
    std::cout << "child exit code: " << WEXITSTATUS(status) << '\\n'
              << "file contains:   " << line << '\\n';
    unlink(path);
}`,
          output: "child exit code: 0\nfile contains:   level 3 loaded",
          annotations: [
            { lines: '13-16', text: "Open, duplicate onto 1, close the original: three ordinary calls that rewire the child before `exec`. `echo` has no idea its output is a file." },
            { lines: 21, text: "The parent waits before reading, so the file is complete." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "The design trade-off",
          text: "With fork + exec, the API for launching a program needs no options at all: every possible setting is just a system call made in the gap, including ones invented decades later. The cost: `fork` must duplicate the address space (even lazily, the page tables of a large process are expensive), and it interacts badly with threads. Microsoft Research's 2019 paper \"A fork() in the road\" argues that `fork` is now more trouble than it is worth outside shells.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'order',
      prompt: "A shell runs `ls > out.txt`. Put these events in order.",
      linesAreCode: false,
      lines: [
        "The shell calls `fork()`; in the child it returns 0",
        "The child opens `out.txt` and gets descriptor 3",
        "The child calls `dup2(3, 1)` so standard output is the file",
        "The child closes descriptor 3",
        "The child calls `execvp(\"ls\", …)` and becomes `ls`",
        "`ls` writes its listing to descriptor 1 and exits",
        "The shell's `waitpid` returns and it prints the next prompt",
      ],
      explanation: "All of the rewiring happens in the child between `fork` and `exec`, so the shell's own descriptors are never touched and `ls` starts with the file already in place as its standard output. The parent's `waitpid` can only return after `ls` has exited, which is why it is last.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: "When run with its output redirected to a file, this prints `Loading level...` **twice**. Tap the line that causes the duplication.",
      code: `#include <cstdio>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    std::printf("Loading level... ");
    pid_t pid = fork();
    if (pid == 0) {
        std::printf("[child]\\n");
        return 0;
    }
    waitpid(pid, nullptr, 0);
    std::printf("[parent]\\n");
}`,
      bugLines: [7, 6],
      hint: "Where are the bytes of the first `printf` when `fork` runs?",
      explanation: "The first `printf` only put its text into the stdio buffer, in user-space memory. `fork` copies that memory, buffer included, so both processes later flush `Loading level... ` (we saw `Loading level... [child]` and `Loading level... [parent]` in a real run). Fix: call `std::fflush(stdout)` (or `std::cout.flush()`) immediately before `fork`, and end children with `_exit` when they must not flush inherited buffers. Lines 6 and 7 are both accepted: the bug is forking with unflushed output.",
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: "posix_spawn, threads, and Windows' CreateProcess",
      blocks: [
        {
          type: 'p',
          text: "`fork` copies only the calling thread. If another thread held a lock at that moment (the heap allocator's lock, say), that lock stays locked forever in the child, and the child deadlocks the first time it calls `malloc`. POSIX therefore allows a forked child of a multithreaded program to call only *async-signal-safe* functions until it calls `exec`. Games and editors are always multithreaded, so they should launch programs with `posix_spawn`, which does fork + exec as one operation:",
        },
        {
          type: 'code',
          title: "spawn.cpp",
          runnable: true,
          code: `#include <iostream>
#include <spawn.h>
#include <sys/wait.h>
#include <unistd.h>

extern char** environ;   // the current environment, passed on

int main() {
    std::cout << "spawning..." << std::endl;
    char arg0[] = "echo";
    char arg1[] = "built by posix_spawn";
    char* argv[] = {arg0, arg1, nullptr};

    pid_t pid = 0;
    int err = posix_spawnp(&pid, "echo", nullptr, nullptr,
                           argv, environ);
    if (err != 0) {                       // returns the error number
        std::cout << "posix_spawnp failed: " << err << '\\n';
        return 1;
    }
    int status = 0;
    waitpid(pid, &status, 0);
    std::cout << "child exited with code " << WEXITSTATUS(status)
              << '\\n';
}`,
          output: "spawning...\nbuilt by posix_spawn\nchild exited with code 0",
          annotations: [
            { lines: '10-12', text: "`argv` is `char* const[]`, not `const char*`, for historical reasons, so we build writable strings instead of casting literals." },
            { lines: 15, text: "The two `nullptr`s are optional *file actions* (open, close, `dup2` in the child) and *attributes* (process group, signal mask). They replace the code you would have written between `fork` and `exec`." },
            { lines: 17, text: "Unlike most POSIX calls, `posix_spawn` returns the error number directly instead of setting `errno`." },
          ],
        },
        {
          type: 'p',
          text: "glibc implements `posix_spawn` with a `vfork`-style `clone` that shares memory with the parent until the `exec`, so no page tables are copied however large the parent is. Windows never had `fork`. Its one call, `CreateProcessW`, takes everything up front:",
        },
        {
          type: 'code',
          title: "launch_win32.cpp (Windows only, not runnable here)",
          code: `#include <windows.h>
#include <cstdio>

int main() {
    wchar_t cmd[] = L"ShaderCompiler.exe -input scene.hlsl";
    STARTUPINFOW si{};
    si.cb = sizeof si;
    PROCESS_INFORMATION pi{};

    if (!CreateProcessW(nullptr, cmd, nullptr, nullptr,
                        FALSE,          // inherit no handles
                        0, nullptr, nullptr, &si, &pi)) {
        std::printf("CreateProcessW failed: %lu\\n", GetLastError());
        return 1;
    }
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);
    std::printf("exit code %lu\\n", code);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
}`,
          annotations: [
            { lines: 5, text: "The command line must be a *writable* buffer: `CreateProcessW` may modify it temporarily. Passing a string literal is a documented crash." },
            { lines: '6-8', text: "`STARTUPINFOW` carries what a Unix child would set up itself in the fork–exec gap: standard handles, window settings. `PROCESS_INFORMATION` receives handles and IDs for the new process and its first thread." },
            { lines: 11, text: "Handle inheritance is opt-in and all-or-nothing per handle (marked inheritable), the counterpart of `O_CLOEXEC`." },
            { lines: 16, text: "A process handle becomes *signaled* when the process ends, so the generic wait function doubles as `waitpid`." },
            { lines: '20-21', text: "Closing the handles is the Windows analogue of reaping: the kernel keeps the exited process object (and its exit code) alive as long as any handle to it is open." },
          ],
        },
        {
          type: 'table',
          headers: ["Need", "POSIX", "Windows"],
          rows: [
            ["Start a program", "`fork` + `exec`, or `posix_spawn`", "`CreateProcessW`"],
            ["Wait and get the exit code", "`waitpid` + `WEXITSTATUS`", "`WaitForSingleObject` + `GetExitCodeProcess`"],
            ["Avoid leaks", "reap every child", "close `hProcess` and `hThread`"],
            ["Keep a handle/fd out of the child", "`O_CLOEXEC`", "do not mark it inheritable"],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: "Your editor (40 threads, 12 GB resident) must launch an external texture compressor many times a minute on Linux. Which approach is best?",
      options: [
        { text: "`fork()`, then in the child build the argument list with `std::string` and `std::vector`, then `execvp`", why: "Allocating in the child of a multithreaded program can deadlock on an allocator lock held by another thread at fork time. Between `fork` and `exec` only async-signal-safe calls are allowed." },
        { text: "`posix_spawnp`, with file actions for any redirection, and `waitpid` (or `WNOHANG` polling) to collect results", correct: true, why: "It is safe in multithreaded programs, avoids copying 12 GB worth of page tables, and still lets you redirect descriptors through file actions." },
        { text: "`std::system(\"texconv \" + path)`", why: "`std::system` runs `/bin/sh -c` with your string, so a path containing spaces or `;` is interpreted by the shell (a classic injection bug), and it blocks until the command finishes." },
        { text: "Create a thread and call `execvp` from it, so the editor keeps running", why: "`exec` replaces the program of the **whole process**, every thread included. Your editor would vanish and become the compressor." },
      ],
      explanation: "For tools launched from big multithreaded programs, `posix_spawn` (or a library built on it) is the modern default on POSIX, and `CreateProcessW` on Windows. Pass arguments as an array, never through a shell, and always collect the child's status. Unreal wraps the same choice in `FPlatformProcess::CreateProc`, which the editor uses for workers such as `ShaderCompileWorker`.",
    },
  ],
  takeaways: [
    "`fork` returns twice (child PID in the parent, 0 in the child) and gives the child a copy-on-write copy of memory and a copy of the descriptor table; forks inside loops multiply processes.",
    "`exec` replaces the program in the current process, keeps the PID and open descriptors (unless close-on-exec), and returns only on failure.",
    "`waitpid` collects how a child ended: `WIFEXITED`/`WEXITSTATUS` (low 8 bits of the code) or `WIFSIGNALED`/`WTERMSIG`.",
    "An exited child stays a zombie until reaped; an orphan is adopted by PID 1 or a subreaper. Always reap your children.",
    "The fork–exec gap is where shells set up redirection with `dup2`; flush stdio before forking, and use `posix_spawn` (POSIX) or `CreateProcessW` (Windows) from multithreaded programs.",
  ],
  reading: [
    {
      title: "OSTEP chapter 5: Interlude: Process API",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf",
      source: 'book',
      note: "fork, exec and wait with tiny C programs, plus the shell-redirection example in detail.",
    },
    {
      title: "fork(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/fork.2.html",
      source: 'other',
      note: "Exactly what the child inherits and what it does not, including the multithreading caveat.",
    },
    {
      title: "wait(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/wait.2.html",
      source: 'other',
      note: "waitpid, waitid, WNOHANG, WNOWAIT and every status macro.",
    },
    {
      title: "posix_spawn(3) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man3/posix_spawn.3.html",
      source: 'other',
      note: "File actions and attributes, and how glibc implements spawning.",
    },
    {
      title: "CreateProcessW function (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw",
      source: 'other',
      note: "Every parameter of the Windows process-creation call, including the writable command-line rule.",
    },
    {
      title: "A fork() in the road (HotOS 2019)",
      url: "https://www.microsoft.com/en-us/research/publication/a-fork-in-the-road/",
      source: 'article',
      note: "Why fork's design causes problems today, from the authors' experience with OS research and Windows.",
    },
  ],
};
