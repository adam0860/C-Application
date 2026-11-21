import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-syscalls-in-cpp",
  title: "System Calls from C++",
  summary: "Calling the OS directly from C++: file descriptors, open/read/write/close, errno and RAII wrappers, how printf and std::cout buffer above write, the Win32 equivalents, and watching it all with strace.",
  minutes: 20,
  objectives: [
    "Use POSIX `open`, `read`, `write` and `close` with file descriptors, and predict which descriptor number `open` returns",
    "Detect and report failures correctly with return values, `errno` and `std::system_error`",
    "Wrap descriptors in an RAII class and write a correct `writeAll` loop for partial writes and `EINTR`",
    "Explain how `printf` and `std::cout` buffer above `write`, and predict output order when they are mixed",
    "Translate the POSIX calls to their Win32 equivalents (`CreateFileW`, `WriteFile`, `CloseHandle`) and compare handles with descriptors",
    "Use `strace` to see which system calls a program really makes",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "File descriptors: small numbers for open things",
      blocks: [
        {
          type: 'p',
          text: "In the last lesson you saw the machine-level side of a system call. Now let's use them as a C++ programmer. On POSIX systems (Linux, macOS, the BSDs behind PlayStation's OS) the central idea is the [[file-descriptor]]: a small non-negative integer that names something the process has open. Files, pipes, sockets, terminals and many devices all appear as descriptors, so the same `read` and `write` calls work on all of them. That is Unix's \"everything is a file\".",
        },
        {
          type: 'p',
          text: "Every process starts with three descriptors already open, inherited from whoever launched it:",
        },
        {
          type: 'table',
          headers: ["fd", "Name", "C++ stream", "Usually"],
          rows: [
            ["0", "standard input (`STDIN_FILENO`)", "`std::cin`", "keyboard, or a file or pipe"],
            ["1", "standard output (`STDOUT_FILENO`)", "`std::cout`", "terminal, or a file or pipe"],
            ["2", "standard error (`STDERR_FILENO`)", "`std::cerr`", "terminal, even when output is redirected"],
          ],
        },
        {
          type: 'code',
          title: "hello_write.cpp",
          runnable: true,
          code: `#include <unistd.h>

int main() {
    const char msg[] = "Hello, kernel!\\n";
    if (write(STDOUT_FILENO, msg, sizeof msg - 1) == -1) {
        return 1;
    }
}`,
          output: "Hello, kernel!",
          annotations: [
            { lines: 1, text: "`<unistd.h>` declares the POSIX wrappers. It is not part of standard C++, which is why this compiles on Linux and macOS but not with plain MSVC." },
            { lines: 4, text: "`sizeof msg` counts the terminating `'\\0'`, hence the `- 1`. `write` sends raw bytes and knows nothing about C strings." },
            { lines: 5, text: "`write(fd, buffer, count)` returns the number of bytes written, or −1 on failure. glibc marks it `warn_unused_result`, so ignoring the result triggers a compiler warning with optimization on." },
          ],
        },
        {
          type: 'p',
          text: "Each descriptor is an index into a per-process **descriptor table** that the kernel keeps. The entry points to an *open-file object* holding the current offset and the access mode. Your process only ever sees the number; the kernel checks it on every call, so a made-up number such as 42 simply fails with `EBADF`.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why an integer instead of a pointer?",
          text: "The kernel cannot hand user code a pointer to its own data: user code could forge one, or read kernel memory through it. An index into a table that only the kernel can read is unforgeable in a useful way. The worst a bad number can do is name *another file this process already has open*. That is also why the standard C++ library can wrap a descriptor (`std::ofstream`) without knowing anything about the kernel's internals.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: "open, write, read, close",
      blocks: [
        {
          type: 'p',
          text: "Here is a complete round trip: create a save file, write it, read it back, delete it, then try to open it again. All output goes through `printf` so you can focus on the system calls.",
        },
        {
          type: 'code',
          title: "file_round_trip.cpp",
          runnable: true,
          code: `#include <cerrno>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <unistd.h>

int main() {
    const char* path = "/tmp/forge_save.txt";

    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd == -1) {
        std::perror("open for writing");
        return 1;
    }
    const char data[] = "level=3 hp=87\\n";
    ssize_t n = write(fd, data, sizeof data - 1);
    std::printf("fd %d, wrote %zd bytes\\n", fd, n);
    close(fd);

    fd = open(path, O_RDONLY);
    if (fd == -1) return 1;
    char buf[64];
    n = read(fd, buf, sizeof buf);
    std::printf("fd %d, read %zd bytes: %.*s", fd, n,
                static_cast<int>(n), buf);
    n = read(fd, buf, sizeof buf);
    std::printf("second read returned %zd (end of file)\\n", n);
    close(fd);
    unlink(path);

    fd = open(path, O_RDONLY);  // the file is gone now
    if (fd == -1) {
        std::printf("open failed: errno %d (%s)\\n",
                    errno, std::strerror(errno));
    }
}`,
          output: "fd 3, wrote 14 bytes\nfd 3, read 14 bytes: level=3 hp=87\nsecond read returned 0 (end of file)\nopen failed: errno 2 (No such file or directory)",
          annotations: [
            { lines: 10, text: "Flags are ORed bits: open for writing, create if missing, truncate to zero length if it exists. The fourth argument is the permission mode for a *new* file (owner read/write, everyone else read), further masked by the process's `umask`." },
            { lines: 11, text: "On failure `open` returns −1 and stores the reason in [[errno]]. `perror` prints your message plus the text for the current `errno`." },
            { lines: 17, text: "The descriptor is 3: `open` always returns the **lowest unused** number, and 0, 1, 2 are taken." },
            { lines: 18, text: "Closing frees slot 3, so the next `open` gets 3 again." },
            { lines: 23, text: "`read` returns how many bytes it actually got, which may be fewer than you asked for. You asked for 64, the file has 14." },
            { lines: '26-27', text: "A return of **0** means end of file. It is not an error; −1 would be." },
            { lines: 29, text: "`unlink` removes the name from the directory. (The data is freed once no descriptor refers to it any more.)" },
            { lines: '31-35', text: "Now `open` fails with `ENOENT` (2), \"No such file or directory\". Read `errno` immediately after the failing call, before anything else can change it." },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: "Every byte is a byte",
          text: "`read` and `write` move raw bytes with no formatting, no text conversion and no null terminator. That is why line 24 prints with `%.*s` and an explicit length instead of `%s`: the buffer is not a C string.",
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: "A process has descriptors 0, 1 and 2 open. It opens `a.txt`, `b.txt` and `c.txt` in that order, closes `b.txt`, then opens `d.txt`. Which descriptor number does `d.txt` get?",
      answer: 4,
      label: "fd =",
      hint: "`open` returns the lowest unused number.",
      explanation: "`a`, `b` and `c` get 3, 4 and 5. Closing `b` frees 4, and POSIX requires `open` to return the lowest free descriptor, so `d.txt` gets 4 (we checked this with a real run). Shells rely on this rule: close descriptor 1, open a file, and the file *becomes* standard output. You will see that trick, and its cleaner replacement `dup2`, in the next unit.",
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: "Errors: return values first, then errno",
      blocks: [
        {
          type: 'p',
          text: "POSIX calls report failure through their **return value** (usually −1) and the reason through `errno`. The order matters: `errno` is only meaningful right after a call has *told you* it failed. Successful calls are allowed to leave old garbage in it, or even to change it.",
        },
        {
          type: 'table',
          headers: ["errno", "Meaning", "Typical cause in a game"],
          rows: [
            ["`ENOENT`", "No such file or directory", "missing save slot or config file"],
            ["`EACCES`", "Permission denied", "writing into the install directory"],
            ["`EEXIST`", "File exists", "`O_CREAT | O_EXCL` on a lock file that is already there"],
            ["`EBADF`", "Bad file descriptor", "using an fd after closing it"],
            ["`EMFILE`", "Too many open files", "a descriptor leak hit the per-process limit"],
            ["`ENOSPC`", "No space left on device", "disk full while writing a save"],
            ["`EINTR`", "Interrupted system call", "a signal arrived during a blocking call; just retry"],
            ["`EAGAIN`", "Try again", "non-blocking socket or pipe has no data yet"],
          ],
        },
        {
          type: 'p',
          text: "In C++ you rarely want to pass `-1` around. The standard library already has the right tool: `std::system_error` carries an `std::error_code`, and `std::generic_category()` knows the POSIX error numbers and their messages.",
        },
        {
          type: 'code',
          title: "throwing on failure (fragment)",
          code: `[[noreturn]] void fail(const std::string& what) {
    throw std::system_error(errno, std::generic_category(), what);
}

int fd = ::open(path, O_RDONLY);
if (fd == -1) fail(std::string{"open "} + path);`,
          annotations: [
            { lines: 2, text: "Capture `errno` immediately; `what()` becomes e.g. `\"open save.dat: No such file or directory\"`." },
            { lines: 5, text: "The leading `::` makes it explicit that this is the global POSIX function, not some `open` member or overload in scope." },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why errno is thread-local",
          text: "Originally `errno` was one global `int`. With threads, one thread's failure could overwrite another's before it was read: a data race on the error code itself. Since C11 and POSIX threads, `errno` is a per-thread variable (in glibc a macro that reads thread-local storage, the `fs:` access you saw in the disassembly last lesson). Your render thread and your loading thread each see their own.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Do not test errno to detect failure",
          text: "`if (errno != 0)` after a call is a bug: a successful call may leave a stale value from long ago. Always check the return value first, and only then look at `errno`. If you must know whether a call that has no error return set it (rare, e.g. `strtol`), set `errno = 0` immediately before the call.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: "After a long play session the game logs `open failed: Too many open files` and can no longer save. Tap the line responsible.",
      code: `std::optional<Settings> loadSettings(const char* path) {
    int fd = open(path, O_RDONLY);
    if (fd == -1) return std::nullopt;
    char buf[512];
    ssize_t n = read(fd, buf, sizeof buf);
    if (n <= 0) return std::nullopt;
    close(fd);
    return parseSettings(buf, static_cast<std::size_t>(n));
}`,
      bugLines: [6],
      hint: "Follow every path out of the function after `open` succeeds.",
      explanation: "When `read` fails or the file is empty, line 6 returns without closing the descriptor. Each call leaks one fd, and once the process hits its descriptor limit (often 1,024 by default on desktop Linux) every `open`, `socket` and `pipe` fails with `EMFILE`. The fix is not \"remember to close\" but RAII: wrap the descriptor in an object whose destructor closes it, so every return path, including exceptions, cleans up. The next card builds one.",
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: "RAII for descriptors, and writing everything",
      blocks: [
        {
          type: 'p',
          text: "A descriptor is a resource exactly like heap memory: acquire it once, release it exactly once. You already know the C++ answer from `std::unique_ptr`: a move-only owner whose destructor releases. Two more details make raw I/O correct: `write` may write **fewer** bytes than requested (pipes, sockets, a full disk, a signal), and a blocking call can fail with `EINTR` if a signal arrives, in which case you simply try again.",
        },
        {
          type: 'code',
          title: "unique_fd.cpp",
          runnable: true,
          code: `#include <cerrno>
#include <fcntl.h>
#include <iostream>
#include <string>
#include <string_view>
#include <system_error>
#include <unistd.h>
#include <utility>

// Owns one file descriptor; closes it exactly once.
class UniqueFd {
public:
    explicit UniqueFd(int fd) : fd_{fd} {}
    UniqueFd(UniqueFd&& o) noexcept : fd_{std::exchange(o.fd_, -1)} {}
    UniqueFd& operator=(UniqueFd&& o) noexcept {
        if (this != &o) { reset(); fd_ = std::exchange(o.fd_, -1); }
        return *this;
    }
    ~UniqueFd() { reset(); }
    int get() const { return fd_; }
private:
    void reset() { if (fd_ != -1) ::close(fd_); fd_ = -1; }
    int fd_ = -1;
};

[[noreturn]] void fail(const std::string& what) {
    throw std::system_error(errno, std::generic_category(), what);
}

UniqueFd openOrThrow(const char* path, int flags, mode_t mode = 0) {
    int fd = ::open(path, flags, mode);
    if (fd == -1) fail(std::string{"open "} + path);
    return UniqueFd{fd};
}

// write() may write fewer bytes than asked, or be interrupted.
void writeAll(int fd, std::string_view data) {
    while (!data.empty()) {
        ssize_t n = ::write(fd, data.data(), data.size());
        if (n == -1) {
            if (errno == EINTR) continue;   // interrupted: retry
            fail("write");
        }
        data.remove_prefix(static_cast<std::size_t>(n));
    }
}

int main() {
    const char* path = "/tmp/forge_uniquefd.sav";
    {
        UniqueFd out = openOrThrow(path, O_WRONLY | O_CREAT | O_TRUNC,
                                   0644);
        writeAll(out.get(), "slot=1 gold=250\\n");
    }   // closed here, even if writeAll threw
    try {
        UniqueFd in = openOrThrow("/tmp/forge_missing.sav", O_RDONLY);
    } catch (const std::system_error& e) {
        std::cout << "caught: " << e.what() << '\\n';
        std::cout << "errno value: " << e.code().value() << '\\n';
    }
    ::unlink(path);
}`,
          output: "caught: open /tmp/forge_missing.sav: No such file or directory\nerrno value: 2",
          annotations: [
            { lines: '11-24', text: "The [[rule-of-five]] in miniature: copying is implicitly deleted (a user-declared move constructor suppresses the copy operations), moving transfers ownership and leaves `-1` behind, and the destructor closes. Two owners of one fd would mean a double close, which can close an *unrelated* file that reused the number." },
            { lines: 22, text: "We ignore `close`'s own result here. For files you have written, `close` (or better `fsync` before it) can report a late write error; unit 7 covers crash-safe saves properly." },
            { lines: '37-46', text: "`writeAll` keeps calling `write` until every byte is out, advancing past what was written. Regular files on a local disk almost always take everything at once; pipes and sockets often do not." },
            { lines: 41, text: "`EINTR` is not a real failure: a signal handler ran while the call was blocked. Retrying is the standard response." },
            { lines: 54, text: "The scope ends, `out` is destroyed, the file is closed, on every path." },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "When to go this low",
          text: "For ordinary file I/O, `std::ofstream`, `std::ifstream` and `std::filesystem` are portable and already buffered. Drop to descriptors when you need something the streams cannot express: pipes to a child process, sockets, `O_EXCL` lock files, `fsync` for crash safety, `mmap`, non-blocking I/O, or when you are measuring exactly which system calls happen.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: "Complete the code that opens an append-only log, creating it if needed, and reports failure correctly.",
      template: `int fd = open("game.log", O_WRONLY | ___ | O_APPEND, 0644);
if (fd == ___) {
    std::fprintf(stderr, "open: %s\\n", std::strerror(___));
}`,
      blanks: [
        { answers: ["O_CREAT"] },
        { answers: ["-1"] },
        { answers: ["errno"] },
      ],
      wordBank: ["O_CREAT", "O_TRUNC", "-1", "0", "errno", "fd", "nullptr"],
      explanation: "`O_CREAT` creates the file if it does not exist (and is the reason the mode argument is needed); `O_TRUNC` would wipe the existing log, the opposite of appending. Failure is signalled by −1, not 0: descriptor 0 is a perfectly valid result (standard input) if fd 0 happens to be closed. The reason for the failure is in `errno`, which `std::strerror` turns into text such as \"Permission denied\".",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: "printf and std::cout sit above write",
      blocks: [
        {
          type: 'p',
          text: "Your C++ rarely calls `write` directly. Formatted output passes through two user-space libraries first, and each can **buffer**: collect bytes in memory and hand them to the kernel later, in one larger `write`.",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 330">
<text x="160" y="16" font-size="12" font-weight="700" text-anchor="middle">Linux</text>
<text x="400" y="16" font-size="12" font-weight="700" text-anchor="middle">Windows</text>
<text x="6" y="52" font-size="9.5" class="t-gray">your code</text>
<text x="6" y="104" font-size="9.5" class="t-gray">C++ library</text>
<text x="6" y="156" font-size="9.5" class="t-gray">C runtime</text>
<text x="6" y="208" font-size="9.5" class="t-gray">system DLL</text>
<text x="6" y="286" font-size="9.5" class="t-gray">kernel</text>
<rect x="92" y="30" width="136" height="36" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="92" y="30" width="136" height="36" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="160.0" y="45.0" font-size="10" font-weight="700" text-anchor="middle">std::cout &lt;&lt; hp</text>
<text x="160.0" y="58.0" font-size="10" text-anchor="middle">printf · std::ofstream</text>
<rect x="92" y="82" width="136" height="36" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="92" y="82" width="136" height="36" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="160.0" y="97.0" font-size="10" font-weight="700" text-anchor="middle">libstdc++</text>
<text x="160.0" y="110.0" font-size="10" text-anchor="middle">formatting, stream buffer</text>
<rect x="92" y="134" width="136" height="36" rx="5" class="f-teal" fill-opacity="0.14" stroke="none"/>
<rect x="92" y="134" width="136" height="36" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="160.0" y="149.0" font-size="10" font-weight="700" text-anchor="middle">glibc</text>
<text x="160.0" y="162.0" font-size="10" text-anchor="middle">stdio buffer · write()</text>
<rect x="332" y="30" width="136" height="36" rx="5" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="332" y="30" width="136" height="36" rx="5" fill="none" class="s-blue" stroke-width="1.4"/>
<text x="400.0" y="45.0" font-size="10" font-weight="700" text-anchor="middle">std::cout &lt;&lt; hp</text>
<text x="400.0" y="58.0" font-size="10" text-anchor="middle">fprintf · std::ofstream</text>
<rect x="332" y="82" width="136" height="36" rx="5" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="332" y="82" width="136" height="36" rx="5" fill="none" class="s-purple" stroke-width="1.4"/>
<text x="400.0" y="97.0" font-size="10" font-weight="700" text-anchor="middle">MSVC STL</text>
<text x="400.0" y="110.0" font-size="10" text-anchor="middle">formatting, stream buffer</text>
<rect x="332" y="134" width="136" height="36" rx="5" class="f-teal" fill-opacity="0.14" stroke="none"/>
<rect x="332" y="134" width="136" height="36" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="400.0" y="149.0" font-size="10" font-weight="700" text-anchor="middle">UCRT</text>
<text x="400.0" y="162.0" font-size="10" text-anchor="middle">stdio buffer → WriteFile</text>
<rect x="332" y="186" width="136" height="36" rx="5" class="f-teal" fill-opacity="0.14" stroke="none"/>
<rect x="332" y="186" width="136" height="36" rx="5" fill="none" class="s-teal" stroke-width="1.4"/>
<text x="400.0" y="201.0" font-size="10" font-weight="700" text-anchor="middle">kernelbase → ntdll</text>
<text x="400.0" y="214.0" font-size="10" text-anchor="middle">NtWriteFile → syscall</text>
<line x1="160" y1="66" x2="160" y2="76" stroke="currentColor" stroke-width="1.3"/>
<path d="M160,82 L156.5,74 L163.5,74 Z" fill="currentColor"/>
<line x1="160" y1="118" x2="160" y2="128" stroke="currentColor" stroke-width="1.3"/>
<path d="M160,134 L156.5,126 L163.5,126 Z" fill="currentColor"/>
<line x1="400" y1="66" x2="400" y2="76" stroke="currentColor" stroke-width="1.3"/>
<path d="M400,82 L396.5,74 L403.5,74 Z" fill="currentColor"/>
<line x1="400" y1="118" x2="400" y2="128" stroke="currentColor" stroke-width="1.3"/>
<path d="M400,134 L396.5,126 L403.5,126 Z" fill="currentColor"/>
<line x1="400" y1="170" x2="400" y2="180" stroke="currentColor" stroke-width="1.3"/>
<path d="M400,186 L396.5,178 L403.5,178 Z" fill="currentColor"/>
<line x1="160" y1="170" x2="160" y2="256" stroke="currentColor" stroke-width="1.3"/>
<path d="M160,262 L156.5,254 L163.5,254 Z" fill="currentColor"/>
<line x1="400" y1="222" x2="400" y2="256" stroke="currentColor" stroke-width="1.3"/>
<path d="M400,262 L396.5,254 L403.5,254 Z" fill="currentColor"/>
<line x1="80" y1="240" x2="516" y2="240" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4"/>
<text x="278" y="234" font-size="9.5" text-anchor="middle" font-style="italic">syscall instruction: user mode → kernel mode</text>
<rect x="92" y="262" width="136" height="52" rx="5" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="92" y="262" width="136" height="52" rx="5" fill="none" class="s-orange" stroke-width="1.4"/>
<text x="160.0" y="278.5" font-size="10" font-weight="700" text-anchor="middle">Linux kernel</text>
<text x="160.0" y="291.5" font-size="10" text-anchor="middle">syscall table → VFS</text>
<text x="160.0" y="304.5" font-size="10" text-anchor="middle">→ ext4 / pipe / tty → driver</text>
<rect x="332" y="262" width="136" height="52" rx="5" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="332" y="262" width="136" height="52" rx="5" fill="none" class="s-orange" stroke-width="1.4"/>
<text x="400.0" y="278.5" font-size="10" font-weight="700" text-anchor="middle">NT kernel</text>
<text x="400.0" y="291.5" font-size="10" text-anchor="middle">SSDT → I/O manager</text>
<text x="400.0" y="304.5" font-size="10" text-anchor="middle">→ NTFS / pipe → driver</text>
</svg>`,
          alt: "Two stacks of layers. Linux: your code (std::cout, printf, std::ofstream) above libstdc++, above glibc with its stdio buffer and write wrapper, crossing the syscall boundary into the Linux kernel: syscall table, VFS, file system or pipe or tty, driver. Windows: your code above the MSVC STL, above the UCRT stdio buffer, above kernelbase and ntdll with NtWriteFile, crossing into the NT kernel: SSDT, I/O manager, NTFS or pipe, driver.",
          caption: "Everything above the dashed line runs in your process in user mode. Buffers in the C and C++ libraries decide *when* the kernel hears about your output.",
        },
        {
          type: 'p',
          text: "The C library chooses a buffering mode for `stdout` when the program starts, based on where it points:",
        },
        {
          type: 'list',
          items: [
            "**Line buffered** when `stdout` is a terminal: flushed at every `'\\n'`, so you see lines as they are printed.",
            "**Fully buffered** when `stdout` is a file or a pipe: flushed only when the buffer (typically 4 KiB here) fills, on `fflush`, or at normal exit.",
            "`stderr` is **unbuffered**: every write goes straight to the kernel, so error messages are never lost in a crash.",
          ],
        },
        {
          type: 'p',
          text: "By default `std::cout` is *synchronized* with C stdio (`std::ios::sync_with_stdio(true)`): it forwards into the same `stdout` buffer as `printf`, so the two keep their relative order. Raw `write(1, …)` bypasses both buffers. Mixing them shows the layers clearly:",
        },
        {
          type: 'code',
          title: "who_goes_first.cpp",
          runnable: true,
          code: `#include <cstdio>
#include <iostream>
#include <unistd.h>

int main() {
    // Make stdout fully buffered, as it is when
    // output goes to a file or a pipe.
    std::setvbuf(stdout, nullptr, _IOFBF, BUFSIZ);

    std::printf("1: printf\\n");
    std::cout << "2: std::cout\\n";
    const char msg[] = "3: write\\n";
    if (write(STDOUT_FILENO, msg, sizeof msg - 1) == -1) {
        return 1;
    }
    std::cout << "4: std::cout again\\n";
}   // exit flushes the stdio buffer here`,
          output: "3: write\n1: printf\n2: std::cout\n4: std::cout again",
          annotations: [
            { lines: 8, text: "We force full buffering so the result is the same whether you run this in a terminal or redirect it to a file." },
            { lines: '10-11', text: "Both land in the same stdio buffer, in order. No system call yet." },
            { lines: 13, text: "`write` goes straight to the kernel, so line 3 reaches the output **first**." },
            { lines: 17, text: "Returning from `main` runs `exit`, which flushes stdio: lines 1, 2 and 4 go out in a single `write` of 42 bytes." },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: "Real strace of the program above",
          code: `$ strace -e trace=write ./who_goes_first > /dev/null
write(1, "3: write\\n", 9)               = 9
write(1, "1: printf\\n2: std::cout\\n4: std::c"..., 42) = 42
+++ exited with 0 +++`,
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Buffers die with the process",
          text: "Buffered output only reaches the kernel when it is flushed. If the program crashes, calls `_exit`, or is killed, whatever is still in the buffer is lost. That is why crash logs go to `stderr` or are flushed explicitly, and why a log that \"stops just before the crash\" may be missing the most useful lines. On Windows the same holds for the UCRT's `stdout` buffer.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      codeOptions: true,
      prompt: "What does this program print? (`write` is checked for errors in the real program; the checks are omitted here.)",
      code: `std::setvbuf(stdout, nullptr, _IOFBF, BUFSIZ);
std::printf("A");
write(1, "B", 1);
std::printf("C\\n");
write(1, "D\\n", 2);`,
      options: [
        { text: "AB\nCD", why: "That is the source order, which would only happen if `printf` sent its bytes to the kernel immediately (unbuffered output)." },
        { text: "BD\nAC", correct: true, why: "The `write` calls reach the kernel at once: `B`, then `D` and a newline. The `printf` output (`A`, `C`, newline) waits in the full buffer until `exit` flushes it." },
        { text: "BAC\nD", why: "With full buffering the newline in `\"C\\n\"` does not trigger a flush; that only happens in line-buffered mode (a terminal)." },
        { text: "AC\nBD", why: "The buffered text cannot come first: it is still in user-space memory when the two `write` calls complete." },
      ],
      explanation: "Output order on the screen is the order of *system calls*, not of source lines. Everything that goes through stdio waits in its buffer; anything written with `write` overtakes it. We verified the output, `BD` then `AC`, with a real run. In real code, avoid mixing raw descriptors and buffered streams on the same descriptor, or call `std::fflush(stdout)` before switching.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "Watching system calls with strace",
      blocks: [
        {
          type: 'p',
          text: "[[strace]] runs a program and prints each system call with its arguments and result. It is the fastest way to answer \"what is my program *actually* asking the OS for?\". Here is a real comparison of a loop that prints 1,000 lines to a file, first with `'\\n'` and then with `std::endl`:",
        },
        {
          type: 'code',
          title: "lines.cpp (the loop being traced)",
          code: `for (int i = 0; i < 1000; ++i) {
    if (useEndl) std::cout << "frame " << i << std::endl;
    else         std::cout << "frame " << i << '\\n';
}`,
          annotations: [
            { lines: 2, text: "`std::endl` = `'\\n'` plus a flush, so one `write` per line." },
            { lines: 3, text: "`'\\n'` just appends to the buffer." },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: "Real strace -c summaries (output redirected to a file)",
          code: `$ strace -c -e trace=write ./lines > out.txt
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
  0.00    0.000000           0         3           write

$ strace -c -e trace=write ./lines endl > out.txt
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
100.00    0.000257           0      1000           write`,
          annotations: [
            { lines: 4, text: "9,890 bytes in **3** writes: 4096 + 4096 + 1698. The stdio buffer did its job." },
            { lines: 9, text: "Same bytes, **1,000** writes, one per flush." },
          ],
        },
        {
          type: 'list',
          items: [
            "`strace ./prog` traces everything, including the dozens of calls the dynamic loader makes before `main` (a C++ hello-world with `std::cout` makes about 60 system calls in total; only one is its own `write`).",
            "`-e trace=openat,read,write,close` filters; `-f` follows threads and child processes; `-o trace.txt` keeps the trace apart from the program's output.",
            "Failures are shown decoded, e.g. `openat(AT_FDCWD, \"/tmp/forge_save.txt\", O_RDONLY) = -1 ENOENT (No such file or directory)`.",
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "strace is for seeing, not timing",
          text: "strace stops the program at every system call to inspect it, which can slow it down many times over. Use it to find *which* calls happen and how many; use a profiler (or `perf trace` on Linux) to measure how long they take. On Windows, Sysinternals Process Monitor shows file, registry and process activity in a similar way, and Event Tracing for Windows (ETW) captures system-call-level detail for performance work.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'truefalse',
      prompt: "When you redirect a program's output with `./game > log.txt 2> err.txt`, both `stdout` and `stderr` become fully buffered, so error messages may be lost if the game crashes.",
      answer: false,
      explanation: "Only `stdout` switches to full buffering when it is not a terminal. `stderr` stays unbuffered no matter where it points, precisely so that diagnostics reach the kernel immediately and survive a crash. (`std::cerr` is likewise unit-buffered: it flushes after every output operation.) That makes `stderr` the right place for crash breadcrumbs, and an explicit flush the right habit for anything important on `stdout`.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "The same thing on Windows: handles",
      blocks: [
        {
          type: 'p',
          text: "Windows is where you develop and where PC games ship, so you should recognise the Win32 version of everything above. It is **not runnable** in this course's Linux checker, but it compiles with MSVC:",
        },
        {
          type: 'code',
          title: "save_win32.cpp (Windows only, not runnable here)",
          code: `#include <windows.h>
#include <cstdio>

int main() {
    HANDLE h = CreateFileW(L"C:\\\\Saves\\\\slot1.sav",
                           GENERIC_WRITE,
                           0,              // no sharing while open
                           nullptr,        // default security
                           CREATE_ALWAYS,  // like O_CREAT | O_TRUNC
                           FILE_ATTRIBUTE_NORMAL,
                           nullptr);
    if (h == INVALID_HANDLE_VALUE) {
        std::printf("CreateFileW failed: %lu\\n", GetLastError());
        return 1;
    }
    const char data[] = "level=3 hp=87\\n";
    DWORD written = 0;
    if (!WriteFile(h, data, sizeof data - 1, &written, nullptr)) {
        std::printf("WriteFile failed: %lu\\n", GetLastError());
    }
    CloseHandle(h);
}`,
          annotations: [
            { lines: 5, text: "The `W` version takes UTF-16 paths (`wchar_t`). Prefer it over `CreateFileA`, which goes through the current code page and can mangle non-ASCII player names in save paths." },
            { lines: 7, text: "Windows locks files by default: share mode 0 means nobody else may open it while you hold it. POSIX has no such mandatory locking, a frequent porting surprise." },
            { lines: '12-15', text: "Failure is the special value `INVALID_HANDLE_VALUE` (−1 cast to a pointer type), and the reason comes from `GetLastError()`, the Windows counterpart of `errno` (also per thread)." },
            { lines: 18, text: "`WriteFile` returns a `BOOL` and reports the byte count through an out-parameter. The last argument is for overlapped (asynchronous) I/O, which unit 7 uses for streaming." },
            { lines: 21, text: "`CloseHandle` closes any kind of handle: files, threads, processes, events." },
          ],
        },
        {
          type: 'table',
          headers: ["Aspect", "POSIX", "Windows"],
          rows: [
            ["Name of an open object", "`int` [[file-descriptor]]", "`HANDLE` (opaque, pointer-sized): [[os-handle]]"],
            ["Numbering", "lowest free integer, 0/1/2 are std streams", "opaque values; std streams via `GetStdHandle`"],
            ["Covers", "files, pipes, sockets, devices", "files, pipes, sockets, **and** threads, processes, events, mutexes, …"],
            ["Error report", "return −1, reason in `errno`", "return `FALSE`/`INVALID_HANDLE_VALUE`/`NULL`, reason in `GetLastError()`"],
            ["Release", "`close(fd)`", "`CloseHandle(h)`"],
            ["Into the kernel", "glibc wrapper → `syscall`", "`kernelbase.dll` → `ntdll.dll` `NtWriteFile` → `syscall`"],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Two different failure values",
          text: "`CreateFileW` fails with `INVALID_HANDLE_VALUE`, but `CreateThread`, `CreateEventW` and many others fail with `NULL`. Checking the wrong one is a classic Windows bug: the error goes unnoticed and a later call fails mysteriously. A small RAII wrapper that knows its own invalid value, like `UniqueFd` above, removes the problem for good.",
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Engine code rarely calls `CreateFileW` or `open` directly. `IPlatformFile` and `IFileManager` wrap them per platform, so the same `FFileHelper::SaveStringToFile` call becomes `CreateFileW`/`WriteFile` on Windows and `open`/`write` on Linux, Android or a POSIX-based console OS. When a save fails on one platform only, the platform file layer is where you look, and a system-call tracer is how you see what it really did.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: "A teammate ports a save routine from Linux to Windows and writes `if (h == nullptr) { /* report error */ }` right after `CreateFileW`. Opening fails because the folder does not exist. What happens?",
      options: [
        { text: "The check catches it, because every Windows API returns `NULL` on failure", why: "Many do, but `CreateFileW` is the famous exception: it returns `INVALID_HANDLE_VALUE`, which is not `NULL`." },
        { text: "The check misses it; the code goes on to call `WriteFile` with `INVALID_HANDLE_VALUE`, which fails, and the original error is easy to lose", correct: true, why: "`INVALID_HANDLE_VALUE` is −1 cast to `HANDLE`, so the `nullptr` test is false. The later failure has its own `GetLastError()` value, overwriting the useful one (`ERROR_PATH_NOT_FOUND`)." },
        { text: "Windows throws a C++ exception when `CreateFileW` fails", why: "Win32 is a C API. It never throws C++ exceptions; it reports failure through return values and `GetLastError()`." },
        { text: "`CreateFileW` creates the missing folder automatically because of `CREATE_ALWAYS`", why: "`CREATE_ALWAYS` concerns the file, not its directory. Missing folders must be created first, for example with `std::filesystem::create_directories`." },
      ],
      explanation: "Each API family has its own error convention, and the convention is part of the contract you must check. POSIX: −1 plus `errno`. Win32: usually `FALSE` or `NULL`, but `INVALID_HANDLE_VALUE` for `CreateFileW`, plus `GetLastError()`. Read the error code immediately, before another call overwrites it. Portable C++ (`std::filesystem`, which reports through `std::error_code` or `std::filesystem::filesystem_error`) hides these differences.",
    },
  ],
  takeaways: [
    "A POSIX file descriptor is a small integer indexing the kernel's per-process table; 0, 1, 2 are the standard streams and `open` returns the lowest free number.",
    "`open`/`read`/`write`/`close` move raw bytes; `read` returning 0 means end of file, and −1 means failure with the reason in the thread-local `errno`.",
    "Check the return value before reading `errno`; wrap descriptors in RAII owners and loop on partial writes and `EINTR`.",
    "`printf` and `std::cout` buffer in user space (line-buffered to a terminal, fully buffered to files and pipes, `stderr` unbuffered); output order is the order of `write` calls, not of source lines.",
    "Win32 uses `HANDLE`s for every kernel object, `CreateFileW`/`WriteFile`/`CloseHandle` for files, and `GetLastError()`; watch out for `INVALID_HANDLE_VALUE` versus `NULL`.",
    "`strace` (Linux) and Process Monitor (Windows) show what a program really asks the OS for; use them to count calls, not to time them.",
  ],
  reading: [
    {
      title: "open(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/open.2.html",
      source: 'other',
      note: "Every flag, the mode argument, and the difference between a descriptor and an open-file description.",
    },
    {
      title: "write(2) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man2/write.2.html",
      source: 'other',
      note: "When partial writes happen and every error `write` can return.",
    },
    {
      title: "errno(3) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man3/errno.3.html",
      source: 'other',
      note: "The rules for using errno and the full list of error names.",
    },
    {
      title: "strace(1) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man1/strace.1.html",
      source: 'other',
      note: "Filtering, following children, timing and summary options.",
    },
    {
      title: "CreateFileW function (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew",
      source: 'other',
      note: "Creation dispositions, share modes and the INVALID_HANDLE_VALUE return.",
    },
    {
      title: "std::system_error (cppreference)",
      url: "https://en.cppreference.com/w/cpp/error/system_error",
      source: 'cppreference',
      note: "How to turn errno values into C++ exceptions with error codes and categories.",
    },
  ],
};
