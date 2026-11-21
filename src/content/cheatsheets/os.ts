import type { CheatSheet } from '../types';

/*
 * Quick-reference sheets for the Operating Systems course. Every number in a
 * worked example was checked with a script; every snippet compiles with
 * g++ -std=c++20 -Wall -Wextra -pthread on Linux (Windows snippets excepted).
 */
export const osCheatSheets: CheatSheet[] = [
  // ------------------------------------------------------------ processes
  {
    id: 'os-process-api',
    title: 'Processes: fork, exec, wait',
    course: 'os',
    icon: '🧬',
    description: 'Creating, replacing and reaping processes on POSIX, redirection, exit statuses, and the Windows equivalent.',
    sections: [
      {
        title: 'Create, replace, wait',
        items: [
          {
            label: 'fork',
            code: `pid_t pid = fork();
if (pid == -1) {
    std::perror("fork");          // no child was created
} else if (pid == 0) {
    // child: a copy of the parent, fork returned 0
} else {
    // parent: pid is the child's process ID
}`,
            text: 'One call, two returns. The child gets copies of memory (copy-on-write), open fds and signal dispositions, but only the calling thread.',
          },
          {
            label: 'exec',
            code: `char* args[] = {const_cast<char*>("ls"),
                const_cast<char*>("-l"), nullptr};
execvp("ls", args);               // replaces this program
std::perror("execvp");            // reached only on failure
_exit(127);`,
            text: 'Suffixes: `v` = argv array, `l` = argument list, `p` = search `PATH`, `e` = pass an environment. Open fds survive `exec` unless opened with `O_CLOEXEC`.',
          },
          {
            label: 'waitpid and the status macros',
            code: `int status = 0;
if (waitpid(pid, &status, 0) == -1) std::perror("waitpid");
if (WIFEXITED(status))
    std::printf("exit code %d\\n", WEXITSTATUS(status));
else if (WIFSIGNALED(status))
    std::printf("killed by signal %d\\n", WTERMSIG(status));`,
          },
          { label: 'Identity', code: `pid_t me = getpid();      // my PID
pid_t parent = getppid(); // my parent's PID` },
          { label: 'Zombie', text: 'A child that has exited but not been waited for. It holds only its PID and exit status; `waitpid` removes it. A parent that never waits leaks PIDs.' },
          { label: 'Orphan', text: 'A child whose parent exited first. It is re-parented to PID 1 (or a designated subreaper), which reaps it.' },
          { label: 'Counting forks', text: '*n* sequential `fork()` calls with no `if` around them leave 2^*n* processes in total (2^*n* − 1 new ones). Each `fork` doubles every process that runs it.' },
        ],
      },
      {
        title: 'Redirection and exit statuses',
        items: [
          {
            label: 'Redirect stdout, then exec',
            code: `int fd = open("log.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
dup2(fd, STDOUT_FILENO);  // fd 1 now refers to log.txt
close(fd);                // fd 1 keeps the file open
execlp("game", "game", "--headless", nullptr);`,
          },
          { label: 'Shell exit status', text: '0 = success, 1–125 = the program\'s own code, 126 = not executable, 127 = not found, 128 + *n* = killed by signal *n*: 134 `SIGABRT`, 137 `SIGKILL`, 139 `SIGSEGV`, 141 `SIGPIPE`.' },
          { label: 'fork in a threaded program', text: 'Only the calling thread exists in the child, and other threads may have held locks (including the allocator\'s). Until `exec`, call only async-signal-safe functions in the child.' },
          { label: 'Process states', text: 'new → ready ⇄ running → terminated (zombie until reaped); running → blocked on I/O or a wait, blocked → ready when it completes.' },
        ],
      },
      {
        title: 'Windows',
        items: [
          {
            label: 'CreateProcess (not POSIX)',
            code: `STARTUPINFOW si{ sizeof si };
PROCESS_INFORMATION pi{};
wchar_t cmd[] = L"tool.exe --bake";
if (CreateProcessW(nullptr, cmd, nullptr, nullptr, FALSE,
                   0, nullptr, nullptr, &si, &pi)) {
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
}`,
            text: 'Windows creates and starts a new program in one call; there is no fork. The command line must be a writable buffer. Close both handles.',
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ scheduling
  {
    id: 'os-scheduling',
    title: 'CPU Scheduling',
    course: 'os',
    icon: '📅',
    description: 'Metrics and their formulas, the classic policies with worked numbers, MLFQ rules, Linux and Windows schedulers, real-time bounds and game timing.',
    sections: [
      {
        title: 'Metrics',
        items: [
          { label: 'Turnaround time', text: '`T_turnaround = T_completion − T_arrival`. Lower is better for batch work.' },
          { label: 'Response time', text: '`T_response = T_first_run − T_arrival`. Lower is better for interactive work.' },
          { label: 'Waiting time', text: 'Turnaround − CPU burst, for jobs that only compute: time spent ready but not running.' },
          { label: 'Averages', text: 'Average each metric over all jobs. Policies trade one against the other: RR minimizes response time and maximizes turnaround.' },
        ],
      },
      {
        title: 'Policies (worked examples from OSTEP)',
        items: [
          { label: 'FIFO', text: 'Run jobs in arrival order. Jobs A = 100, B = 10, C = 10, all at *t* = 0, in order A, B, C: completions 100, 110, 120 → average turnaround **110**. One long job delays everyone: the *convoy effect*.' },
          { label: 'SJF', text: 'Shortest job first (non-preemptive). Same jobs: B, C, A complete at 10, 20, 120 → average turnaround **50**. Optimal for average turnaround when all jobs arrive together.' },
          { label: 'STCF / SRTF', text: 'Preemptive SJF: when a job arrives, run whichever has the least remaining time. Optimal average turnaround with arbitrary arrivals.' },
          { label: 'Round robin', text: 'Run each ready job for one time slice, then rotate. A, B, C = 5 each at *t* = 0, slice 1: average response **1**, average turnaround **14** (FIFO: response 5, turnaround 10). The slice must be large compared with the context-switch cost.' },
          { label: 'MLFQ rules (OSTEP)', text: '1: higher priority runs. 2: equal priority → round robin. 3: new jobs start at the top. 4: a job that uses up its allotment at a level moves down one level. 5: every period *S*, boost all jobs to the top (prevents starvation and gaming).' },
          { label: 'Proportional share', text: 'Lottery (random tickets), stride (deterministic), and Linux CFS: run the task with the smallest *virtual runtime*, which grows more slowly for higher-weight (lower `nice`) tasks.' },
        ],
      },
      {
        title: 'Real systems',
        items: [
          { label: 'Linux', text: 'CFS was the default from 2.6.23; **EEVDF** replaced it in 6.6 (eligibility plus earliest virtual deadline, better latency for short slices). `nice` ranges from −20 (most CPU) to 19. Real-time classes `SCHED_FIFO` and `SCHED_RR` always beat normal tasks.' },
          { label: 'Windows', text: 'Preemptive, priority-based with 32 levels (16–31 real-time); threads at the same priority share in round robin with a quantum of a few clock ticks; foreground windows and threads finishing I/O get temporary boosts.' },
          {
            label: 'Affinity',
            code: `cpu_set_t set;                    // Linux (needs _GNU_SOURCE)
CPU_ZERO(&set);
CPU_SET(2, &set);                 // only core 2
pthread_setaffinity_np(pthread_self(), sizeof set, &set);
// Windows: SetThreadAffinityMask(GetCurrentThread(), 1ull << 2);`,
          },
        ],
      },
      {
        title: 'Real-time and game timing',
        items: [
          { label: 'Utilization', text: '`U = Σ C_i / T_i`: each task\'s compute time per period, summed over the tasks.' },
          { label: 'Rate-monotonic bound', text: 'Fixed priorities, shorter period = higher priority. Schedulable if `U ≤ n(2^(1/n) − 1)`: 1.000 for 1 task, 0.828 for 2, 0.780 for 3, → ln 2 ≈ 0.693. Above the bound, check exactly with response-time analysis.' },
          { label: 'EDF', text: 'Run the job with the earliest deadline. On one CPU with deadlines equal to periods, schedulable if and only if `U ≤ 1`.' },
          { label: 'Windows timer resolution', text: 'The default tick is 15.6 ms, so `Sleep(1)` can sleep ~15 ms. `timeBeginPeriod(1)` raises the resolution for the calling process (per-process since Windows 10 2004); pair it with `timeEndPeriod(1)`.' },
          {
            label: 'Frame limiter: sleep, then spin',
            code: `auto next = clock::now() + frame;
// ... simulate and render ...
std::this_thread::sleep_until(next - 2ms);  // coarse
while (clock::now() < next) {}              // fine
// clock = std::chrono::steady_clock`,
            text: 'Sleeps can overshoot by a scheduler tick; spinning the last stretch trades a little CPU for even frame pacing.',
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ paging
  {
    id: 'os-paging',
    title: 'Paging Arithmetic',
    course: 'os',
    icon: '🧠',
    description: 'Splitting addresses into page number and offset, page-table sizes, x86-64 4-level indices, and effective access time with a TLB and with page faults.',
    sections: [
      {
        title: 'Address split',
        items: [
          { label: 'Offset bits', text: 'offset bits = log₂(page size): 4 KiB → 12, 2 MiB → 21, 16 KiB → 14.' },
          {
            label: 'VPN and offset',
            code: `constexpr std::uint64_t kPage = 4096;
std::uint64_t vpn    = va >> 12;          // va / kPage
std::uint64_t offset = va & (kPage - 1);  // va % kPage
std::uint64_t pa     = (pfn << 12) | offset;`,
            text: 'Example: VA `0x12345678` with 4 KiB pages → VPN `0x12345`, offset `0x678`. Translation replaces the VPN with the frame number and keeps the offset.',
          },
          { label: 'Page size at run time', code: `long page = sysconf(_SC_PAGESIZE);   // 4096 on x86-64 Linux
// Windows: GetSystemInfo(&si); si.dwPageSize` },
        ],
      },
      {
        title: 'Page-table size',
        items: [
          { label: 'Linear table', text: 'entries = 2^(VA bits) / page size; size = entries × PTE size. 32-bit VA, 4 KiB pages, 4-byte PTEs: 2^20 × 4 B = **4 MiB per process**, mostly unused, which is why tables are multi-level.' },
          { label: 'Levels needed', text: 'levels = ⌈(VA bits − offset bits) / log₂(PTEs per page)⌉. x86-64: 4 KiB page / 8-byte PTE = 512 entries = 9 bits per level; (48 − 12) / 9 = **4 levels**.' },
          {
            label: 'x86-64 4-level indices',
            code: `// 48-bit VA: 9 | 9 | 9 | 9 | 12
unsigned pml4 = (va >> 39) & 0x1FF;
unsigned pdpt = (va >> 30) & 0x1FF;
unsigned pd   = (va >> 21) & 0x1FF;
unsigned pt   = (va >> 12) & 0x1FF;
unsigned off  =  va        & 0xFFF;`,
            text: 'Example: `0x7f3a12345678` → indices 254, 232, 145, 325, offset `0x678`. With 5-level paging (LA57) the VA grows to 57 bits.',
          },
          { label: 'TLB reach', text: 'entries × page size. 64 entries × 4 KiB = 256 KiB; the same 64 entries with 2 MiB huge pages cover 128 MiB.' },
        ],
      },
      {
        title: 'Effective access time',
        items: [
          { label: 'With a TLB', text: '`EAT = h × (t_TLB + t_mem) + (1 − h) × (t_TLB + (k + 1) × t_mem)` for a *k*-level table with no other caching of page-table entries; *h* is the TLB hit rate.' },
          { label: 'Example, 1 level', text: '`t_mem` = 100 ns, TLB time negligible: *h* = 80% → 0.8 × 100 + 0.2 × 200 = **120 ns**; *h* = 99% → **101 ns**.' },
          { label: 'Example, 4 levels', text: '*h* = 99%, `t_TLB` = 1 ns, `t_mem` = 100 ns: 0.99 × 101 + 0.01 × 501 = **105 ns**.' },
          { label: 'With page faults', text: '`EAT = (1 − p) × t_mem + p × t_fault`. `t_mem` = 100 ns, `t_fault` = 8 ms, *p* = 1/1000: 99.9 + 8,000 = **8,099.9 ns**, about 81× slower than memory. Page faults must be very rare.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ replacement
  {
    id: 'os-page-replacement',
    title: 'Page Faults and Replacement',
    course: 'os',
    icon: '🔁',
    description: 'What happens on a page fault, the replacement policies with a verified worked example, Belady\'s anomaly, thrashing, and the memory APIs games use.',
    sections: [
      {
        title: 'Handling a page fault',
        items: [
          { label: 'Steps', text: '1. The MMU finds the PTE not present and raises a fault. 2. The kernel checks the address is valid for the process (else `SIGSEGV`). 3. It finds a free frame or evicts a victim (writing it back if dirty). 4. It reads the page from disk or zero-fills it. 5. It updates the PTE and returns. 6. The faulting instruction is retried.' },
          { label: 'Minor vs major', text: 'Minor: the page was already in memory (page cache, copy-on-write, zero page) and only needed mapping. Major: it required disk I/O, costing microseconds to milliseconds.' },
          {
            label: 'Count your faults',
            code: `rusage ru{};
getrusage(RUSAGE_SELF, &ru);
std::printf("minor %ld major %ld\\n", ru.ru_minflt, ru.ru_majflt);`,
          },
        ],
      },
      {
        title: 'Policies',
        items: [
          { label: 'OPT (Belady\'s MIN)', text: 'Evict the page used furthest in the future. Unrealizable, but the yardstick for the others.' },
          { label: 'FIFO', text: 'Evict the oldest loaded page. Simple, ignores use, and suffers Belady\'s anomaly.' },
          { label: 'LRU', text: 'Evict the least recently used page. Good with locality; exact LRU needs a timestamp per access, so kernels approximate it.' },
          { label: 'Clock (second chance)', text: 'Frames in a circle with a use bit set by hardware on access. The hand clears set bits and evicts the first frame whose bit is already 0. Prefer clean pages to avoid write-back.' },
          {
            label: 'Clock in C++',
            code: `std::size_t evict(std::vector<bool>& used,
                  std::size_t& hand) {
    while (used[hand]) {           // second chance
        used[hand] = false;
        hand = (hand + 1) % used.size();
    }
    std::size_t victim = hand;
    hand = (hand + 1) % used.size();
    return victim;
}`,
          },
        ],
      },
      {
        title: 'Worked examples',
        items: [
          { label: 'Classic string, 3 frames', text: '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1: FIFO **15** faults, LRU **12**, OPT **9**.' },
          { label: 'Belady\'s anomaly', text: '1 2 3 4 1 2 5 1 2 3 4 5 under FIFO: 3 frames → **9** faults, 4 frames → **10**. More memory, more faults. LRU (a stack algorithm) never does this: 10 → 8 on the same string.' },
          { label: 'Counting rule', text: 'The first reference to each distinct page is always a fault (compulsory), so faults ≥ number of distinct pages.' },
        ],
      },
      {
        title: 'Thrashing and game memory',
        items: [
          { label: 'Working set', text: 'The pages a process used in the last Δ references. If the sum of working sets exceeds RAM, processes fault constantly and make no progress: thrashing. Fix it by running fewer things, not by faster replacement.' },
          { label: 'Pin memory', code: `mlock(buffer, bytes);           // Linux: never page out
// Windows: VirtualLock(buffer, bytes);`, text: 'For audio buffers and other data that must never stall on a fault. Limited by `RLIMIT_MEMLOCK` / the working-set quota.' },
          { label: 'Hint the kernel', code: `madvise(pak, size, MADV_WILLNEED);   // prefetch
madvise(pak, size, MADV_SEQUENTIAL); // read ahead, drop behind` },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ sync
  {
    id: 'os-sync-primitives',
    title: 'Synchronization in C++',
    course: 'os',
    icon: '🔐',
    description: 'Mutexes and RAII locks, the condition-variable pattern, semaphores, an atomic_flag spinlock, atomics, latches and readers–writer locks.',
    sections: [
      {
        title: 'Mutual exclusion',
        items: [
          {
            label: 'Mutex + lock_guard',
            code: `std::mutex m;
int score = 0;

void addPoints(int p) {
    std::lock_guard lock(m);   // unlocks at scope exit
    score += p;
}`,
          },
          {
            label: 'Several mutexes at once',
            code: `std::scoped_lock lock(a.m, b.m);   // deadlock-free order`,
            text: '`std::scoped_lock` (C++17) locks any number of mutexes with a deadlock-avoidance algorithm.',
          },
          {
            label: 'Spinlock from atomic_flag',
            code: `class Spinlock {
    std::atomic_flag flag;   // clear since C++20
public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire))
            flag.wait(true, std::memory_order_relaxed);
    }
    void unlock() {
        flag.clear(std::memory_order_release);
        flag.notify_one();
    }
};`,
            text: 'Meets the *BasicLockable* requirements, so `std::lock_guard<Spinlock>` works. Spin only for very short critical sections; a plain busy loop without `wait` burns a core while the holder is descheduled.',
          },
          {
            label: 'Atomic counter',
            code: `std::atomic<int> hits{0};
hits.fetch_add(1, std::memory_order_relaxed); // count only
int now = hits.load();                        // seq_cst`,
          },
        ],
      },
      {
        title: 'Waiting for a condition',
        items: [
          {
            label: 'Condition variable: always a loop',
            code: `std::mutex m;
std::condition_variable cv;
std::queue<Job> jobs;

void push(Job j) {
    { std::lock_guard lock(m); jobs.push(std::move(j)); }
    cv.notify_one();
}

Job pop() {
    std::unique_lock lock(m);
    while (jobs.empty())       // not "if": spurious wakeups,
        cv.wait(lock);         // and another thread may win
    Job j = std::move(jobs.front());
    jobs.pop();
    return j;
}`,
            text: 'Equivalent: `cv.wait(lock, [&] { return !jobs.empty(); });`. Change the shared state while holding the mutex, then notify.',
          },
          {
            label: 'Semaphore',
            code: `std::counting_semaphore<8> slots(8);  // 8 free slots
std::counting_semaphore<8> items(0);  // 0 filled

// producer: slots.acquire(); put(); items.release();
// consumer: items.acquire(); take(); slots.release();`,
            text: '`acquire` (P, wait) decrements, blocking at 0; `release` (V, post) increments and wakes a waiter. A bounded buffer still needs a mutex (or a single producer and consumer) around the buffer itself.',
          },
          {
            label: 'Latch and barrier',
            code: `std::latch loaded(4);           // one-shot countdown
// each loader: loaded.count_down();
loaded.wait();                   // main waits for all 4

std::barrier sync(4);            // reusable, per phase
// each worker, each frame: sync.arrive_and_wait();`,
          },
          {
            label: 'Readers–writer lock',
            code: `std::shared_mutex m;
{ std::shared_lock r(m); /* many readers */ }
{ std::unique_lock w(m); /* one writer   */ }`,
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ deadlock
  {
    id: 'os-deadlock',
    title: 'Deadlock and Concurrency Bugs',
    course: 'os',
    icon: '🍝',
    description: 'The four Coffman conditions and how to break each, lock ordering, Banker\'s safety check, detection, livelock, starvation, priority inversion and the common bug patterns.',
    sections: [
      {
        title: 'The four conditions (all are required)',
        items: [
          { label: 'Mutual exclusion', text: 'A resource is held by one thread at a time. Break it with lock-free structures or by not sharing (per-thread data).' },
          { label: 'Hold and wait', text: 'A thread holds one resource while waiting for another. Break it by acquiring everything at once (`std::scoped_lock`) or under one outer lock.' },
          { label: 'No preemption', text: 'Resources cannot be taken away. Break it with `try_lock`: on failure, release what you hold, back off and retry (risk: livelock).' },
          { label: 'Circular wait', text: 'A cycle of threads, each waiting for the next. Break it with a **global lock order**: the most practical fix.' },
        ],
      },
      {
        title: 'Fixes in code',
        items: [
          {
            label: 'Lock ordering',
            code: `void transfer(Account& a, Account& b, int n) {
    // always lock the lower address first
    auto [first, second] = std::less<>{}(&a, &b) ? std::pair{&a, &b}
                                      : std::pair{&b, &a};
    std::lock_guard l1(first->m);
    std::lock_guard l2(second->m);
    a.gold -= n;
    b.gold += n;
}`,
            text: 'Or simply `std::scoped_lock lock(a.m, b.m);`.',
          },
          {
            label: 'Timeouts',
            code: `std::timed_mutex m;
if (m.try_lock_for(5ms)) { /* ... */ m.unlock(); }
else { /* back off, log, retry later */ }`,
          },
          { label: 'Dining philosophers', text: 'Deadlocks when everyone takes the left fork first. Fix: one philosopher takes the right fork first (breaks the cycle), or number the forks and always take the lower number first.' },
        ],
      },
      {
        title: 'Avoidance and detection',
        items: [
          { label: 'Banker\'s algorithm', text: 'Need = Max − Allocation. A state is *safe* if some order lets every process finish: repeatedly find a process with Need ≤ Available, pretend it finishes (Available += its Allocation). Grant a request only if the resulting state is safe.' },
          { label: 'Detection', text: 'Build a wait-for graph (thread → thread it waits on); a cycle with single-instance resources is a deadlock. Recover by killing or rolling back a victim. Debuggers and lock-order checkers (TSan reports *lock-order-inversion*) find potential cycles in tests.' },
        ],
      },
      {
        title: 'Other concurrency bugs',
        items: [
          { label: 'Livelock', text: 'Threads keep reacting to each other (both back off and retry in lockstep) and make no progress. Add randomized backoff.' },
          { label: 'Starvation', text: 'A thread never gets the resource because others always win. Use fair locks, aging or bounded waits.' },
          { label: 'Priority inversion', text: 'A high-priority thread waits for a lock held by a low-priority thread, which a medium-priority thread keeps preempting. Fix: priority inheritance (Mars Pathfinder, 1997, was fixed by enabling it remotely).' },
          { label: 'Atomicity violation', text: 'A check and the action that depends on it are not under the same lock (`if (!q.empty()) q.pop();` from two threads).' },
          { label: 'Order violation', text: 'Thread B uses something before thread A initialized it. Enforce the order with a condition variable, latch, future or `std::call_once`.' },
          { label: 'Calling out while locked', text: 'Invoking callbacks or virtual functions while holding a lock lets unknown code take other locks in any order. Copy what you need, unlock, then call.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ files
  {
    id: 'os-files',
    title: 'Files and File Systems',
    course: 'os',
    icon: '💾',
    description: 'The POSIX file API, crash-safe saves, std::filesystem, links and inodes, inode size arithmetic and journaling.',
    sections: [
      {
        title: 'POSIX file API',
        items: [
          {
            label: 'Open, write all, close',
            code: `int fd = open("save.dat", O_WRONLY | O_CREAT | O_TRUNC |
                         O_CLOEXEC, 0644);
if (fd == -1) { std::perror("open"); return false; }
const char* p = data;
std::size_t left = size;
while (left > 0) {                 // write may be partial
    ssize_t n = write(fd, p, left);
    if (n == -1) {
        if (errno == EINTR) continue;
        std::perror("write"); close(fd); return false;
    }
    p += n; left -= static_cast<std::size_t>(n);
}
if (fsync(fd) == -1) std::perror("fsync");
close(fd);`,
          },
          { label: 'read', text: '`read` returns the number of bytes read (possibly fewer than asked), 0 at end of file, −1 on error with `errno` set.' },
          { label: 'Position', code: `off_t end = lseek(fd, 0, SEEK_END);   // also SEEK_SET, SEEK_CUR
ssize_t n = pread(fd, buf, len, offset);  // read at offset, no seek` },
          { label: 'Durability', text: '`write` only reaches the page cache. `fsync(fd)` forces data and metadata to the device; `fdatasync` skips unneeded metadata. Windows: `FlushFileBuffers`.' },
        ],
      },
      {
        title: 'Crash-safe save',
        items: [
          {
            label: 'Write temp, then rename',
            code: `// 1. write save.tmp completely, fsync it, close it
// 2. atomically replace the old save:
std::filesystem::rename("save.tmp", "save.dat");
// 3. fsync the directory so the rename itself is durable
int dir = open(".", O_RDONLY | O_DIRECTORY);
fsync(dir);
close(dir);`,
            text: '`rename` within one file system atomically replaces the target: after a crash you see the old save or the new one, never half of each. Windows: `MoveFileExW(tmp, dst, MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)` or `ReplaceFileW`.',
          },
          { label: 'TOCTOU', text: 'Do not check a path and then use it (`access` then `open`); the file can change in between. Open first, then inspect the descriptor with `fstat`.' },
        ],
      },
      {
        title: 'std::filesystem',
        items: [
          {
            label: 'Everyday calls',
            code: `namespace fs = std::filesystem;
fs::create_directories("saves/slot1");
if (fs::exists("config.ini")) { /* ... */ }
auto bytes = fs::file_size("level1.pak");
for (const auto& e : fs::directory_iterator("saves"))
    std::cout << e.path().filename() << '\\n';
fs::copy_file("a.sav", "b.sav",
              fs::copy_options::overwrite_existing);
fs::remove_all("cache");`,
            text: 'Most functions throw `fs::filesystem_error`; every one has an overload taking `std::error_code&` that does not throw.',
          },
        ],
      },
      {
        title: 'Inodes and links',
        items: [
          { label: 'Inode', text: 'Holds a file\'s metadata (type, mode, owner, size, times, link count) and block pointers, but **not its name**. A directory is a table of name → inode number.' },
          { label: 'Hard link', text: '`link("a", "b")`: a second name for the same inode; the link count goes to 2. Data is freed when the count reaches 0 *and* no process has it open. Cannot cross file systems.' },
          { label: 'Symbolic link', text: '`symlink("a", "b")`: a small file containing a path. Can dangle, can cross file systems, can point to directories.' },
          { label: 'Max file size', text: 'With block size *B* and pointer size *s*, one block holds *P* = *B*/*s* pointers. With *D* direct pointers plus single, double and triple indirect: `(D + P + P² + P³) × B`. 4 KiB blocks, 4-byte pointers, 12 direct: *P* = 1024 → (12 + 1,024 + 1,048,576 + 1,073,741,824) × 4,096 = 4,402,345,721,856 bytes ≈ **4 TiB**.' },
          { label: 'Which pointer?', text: 'Block index = byte offset / *B*. Index < *D*: direct. Next *P* indices: single indirect. Next *P*²: double. With the inode in memory, reading a data block costs 1 disk read (direct), 2 (single), 3 (double), 4 (triple).' },
          { label: 'Journaling', text: 'Write the transaction (begin block, metadata, and in data mode the data) to the journal; write the commit block once that is on disk; checkpoint the blocks to their real locations; then free the journal space. ext4\'s default *ordered* mode writes data blocks before committing the metadata that points to them.' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ ipc & sockets
  {
    id: 'os-ipc-sockets',
    title: 'IPC and Sockets',
    course: 'os',
    icon: '📡',
    description: 'Pipes, FIFOs, signals, shared memory, TCP and UDP sockets, non-blocking I/O with poll and epoll, and Winsock differences.',
    sections: [
      {
        title: 'Pipes and signals',
        items: [
          {
            label: 'Pipe between parent and child',
            code: `int fds[2];
pipe(fds);                    // fds[0] read, fds[1] write
if (fork() == 0) {
    close(fds[1]);            // child reads
    // read(fds[0], ...) until it returns 0
    _exit(0);
}
close(fds[0]);                // parent writes
write(fds[1], "hi\\n", 3);
close(fds[1]);                // child sees EOF`,
            text: '`read` returns 0 only when **every** write end is closed. Writing with no reader raises `SIGPIPE` (or fails with `EPIPE` if ignored). Linux capacity 64 KiB; writes ≤ `PIPE_BUF` (4,096) are atomic.',
          },
          { label: 'Named pipe', code: `mkfifo("/tmp/game.cmd", 0600);   // then open() like a file
// Windows: CreateNamedPipeW(L"\\\\\\\\.\\\\pipe\\\\Name", ...)` },
          {
            label: 'Signal handler',
            code: `volatile std::sig_atomic_t g_quit = 0;
extern "C" void onTerm(int) { g_quit = 1; }

struct sigaction sa {};
sa.sa_handler = onTerm;
sigemptyset(&sa.sa_mask);
sa.sa_flags = SA_RESTART;
sigaction(SIGTERM, &sa, nullptr);`,
            text: 'In a handler call only async-signal-safe functions (`write`, `_exit`…), never `malloc`, `printf` or `std::cout`. `SIGKILL` and `SIGSTOP` cannot be caught.',
          },
          { label: 'Signal numbers (x86-64 Linux)', text: '`SIGINT` 2, `SIGABRT` 6, `SIGKILL` 9, `SIGUSR1` 10, `SIGSEGV` 11, `SIGPIPE` 13, `SIGTERM` 15, `SIGCHLD` 17.' },
        ],
      },
      {
        title: 'Shared memory',
        items: [
          {
            label: 'POSIX',
            code: `int fd = shm_open("/game_stats", O_CREAT | O_RDWR, 0600);
ftruncate(fd, sizeof(Stats));
void* p = mmap(nullptr, sizeof(Stats),
               PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
close(fd);                    // mapping stays valid
// ... shm_unlink("/game_stats") when done`,
            text: 'Synchronize with lock-free atomics, a `PTHREAD_PROCESS_SHARED` mutex or `sem_open`. Store offsets, never pointers: each process maps the region at its own address.',
          },
          { label: 'Windows', code: `HANDLE h = CreateFileMappingW(INVALID_HANDLE_VALUE, nullptr,
    PAGE_READWRITE, 0, sizeof(Stats), L"Local\\\\GameStats");
void* p = MapViewOfFile(h, FILE_MAP_ALL_ACCESS, 0, 0, 0);` },
        ],
      },
      {
        title: 'Sockets',
        items: [
          {
            label: 'TCP server',
            code: `int lfd = socket(AF_INET, SOCK_STREAM, 0);
int on = 1;
setsockopt(lfd, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on);
sockaddr_in a{};
a.sin_family = AF_INET;
a.sin_addr.s_addr = htonl(INADDR_ANY);
a.sin_port = htons(7777);
bind(lfd, reinterpret_cast<sockaddr*>(&a), sizeof a);
listen(lfd, 16);
int conn = accept(lfd, nullptr, nullptr);   // new fd`,
          },
          { label: 'TCP client', code: `int fd = socket(AF_INET, SOCK_STREAM, 0);
connect(fd, reinterpret_cast<sockaddr*>(&server), sizeof server);
send(fd, buf, len, MSG_NOSIGNAL);   // no SIGPIPE on Linux` },
          { label: 'TCP is a stream', text: 'One `send` ≠ one `recv`. Loop until a whole message has arrived and frame messages yourself (length prefix). `recv` returning 0 means the peer closed.' },
          {
            label: 'UDP',
            code: `int fd = socket(AF_INET, SOCK_DGRAM, 0);
bind(fd, reinterpret_cast<sockaddr*>(&local), sizeof local);
sendto(fd, pkt, n, 0, reinterpret_cast<sockaddr*>(&peer),
       sizeof peer);
sockaddr_in from{};
socklen_t fl = sizeof from;
ssize_t got = recvfrom(fd, buf, sizeof buf, 0,
                       reinterpret_cast<sockaddr*>(&from), &fl);`,
            text: 'One datagram per call; may be lost, duplicated or reordered. Keep payloads ≤ ~1,200 bytes to avoid IP fragmentation.',
          },
          { label: 'TCP vs UDP for games', text: 'TCP: reliable, ordered, head-of-line blocking; use for login, chat, downloads. UDP: unreliable datagrams; use for real-time state, adding sequence numbers, ack bitfields and reliable channels only where needed.' },
          { label: 'Handshake and teardown', text: 'SYN → SYN-ACK → ACK. Close: FIN → ACK in each direction; the side that closes first waits in TIME_WAIT (60 s on Linux).' },
        ],
      },
      {
        title: 'Non-blocking I/O and Winsock',
        items: [
          {
            label: 'Non-blocking + poll',
            code: `fcntl(fd, F_SETFL, fcntl(fd, F_GETFL) | O_NONBLOCK);
pollfd p{fd, POLLIN, 0};
if (poll(&p, 1, 0) > 0) {               // 0 ms: don't wait
    ssize_t n;
    while ((n = recv(fd, buf, sizeof buf, 0)) > 0) { /* ... */ }
    // n == -1 && errno == EAGAIN: drained
}`,
          },
          {
            label: 'epoll (Linux)',
            code: `int ep = epoll_create1(0);
epoll_event ev{};
ev.events = EPOLLIN;
ev.data.fd = fd;
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);
epoll_event ready[64];
int n = epoll_wait(ep, ready, 64, -1);  // only ready fds`,
            text: '`select`: fds < 1,024, O(n) per call. `poll`: no limit, O(n). `epoll`/`kqueue`: O(ready). Windows IOCP and Linux `io_uring` are completion-based.',
          },
          { label: 'Winsock', text: '`WSAStartup(MAKEWORD(2, 2), &wsa)` first and `WSACleanup` last; `SOCKET` and `INVALID_SOCKET` instead of `int` and −1; `closesocket`; `WSAGetLastError()` and `WSAEWOULDBLOCK`; `ioctlsocket(s, FIONBIO, &on)`; link `Ws2_32.lib`.' },
        ],
      },
    ],
  },
];
