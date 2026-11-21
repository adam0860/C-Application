import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'fiber',
    term: 'Fiber',
    aliases: ['fibers', 'user-level thread', 'green thread', 'coroutine stack'],
    course: 'os',
    category: 'Concurrency',
    short: 'A lightweight execution context (a stack plus saved registers) that is switched **cooperatively in user mode**: a fiber runs until it explicitly yields to another, and the kernel never sees the switch.',
    long: 'Fibers are user-level threads. Switching between them only saves the callee-saved registers and swaps the stack pointer, so it costs about as much as a function call. Windows provides them directly (`ConvertThreadToFiber`, `CreateFiber`, `SwitchToFiber`); POSIX systems have the older `ucontext` functions, and libraries such as Boost.Context implement fast switches in assembly.\n\nGame engines such as Naughty Dog\'s run every job on a fiber so that a job waiting for other jobs can park its fiber and let the worker thread run something else. The catches: a fiber that makes a blocking system call blocks its whole thread, and a fiber may resume on a different thread, so OS mutexes and `thread_local` variables must not be held across a switch.',
    example: `void* mainFiber = ConvertThreadToFiber(nullptr);
void* job = CreateFiber(64 * 1024, JobEntry, nullptr);
SwitchToFiber(job);        // runs until JobEntry yields back`,
    see: ['thread', 'context-switch', 'user-level-thread', 'thread-pool'],
    reading: [
      {
        title: 'Fibers (Win32)',
        url: 'https://learn.microsoft.com/en-us/windows/win32/procthread/fibers',
        source: 'other',
        note: 'Microsoft\'s description of fibers, fiber local storage and how they relate to threads.',
      },
    ],
  },
  {
    id: 'user-level-thread',
    term: 'User-Level vs Kernel Threads',
    aliases: ['kernel thread', 'user thread', '1:1 threading', 'N:1 threading', 'M:N threading', 'threading model'],
    course: 'os',
    category: 'Concurrency',
    short: 'A **kernel thread** is scheduled by the OS; a **user-level thread** is switched by a library inside the process. Threading models map user threads to kernel threads 1:1, N:1 or M:N.',
    long: 'Linux (NPTL), Windows and every mainstream C++ standard library use the 1:1 model: each `std::thread` is a kernel thread, so blocking calls block only that thread and threads run in parallel on several cores. N:1 libraries switch threads cheaply in user space but cannot use more than one core, and one blocking system call stalls them all. M:N systems such as Go\'s goroutines multiplex many user threads onto several kernel threads, at the price of a second scheduler.',
    see: ['thread', 'fiber', 'context-switch'],
  },
  {
    id: 'thread-control-block',
    term: 'Thread Control Block (TCB)',
    aliases: ['TCB', 'task_struct', 'ETHREAD', 'KTHREAD'],
    course: 'os',
    category: 'Concurrency',
    short: 'The kernel\'s record of one thread: its saved registers, scheduling state, priority and affinity, kernel stack, and a link to the process it belongs to.',
    long: 'When a thread is not running, its CPU state lives in its TCB; a [[context-switch]] saves the outgoing thread\'s registers there and loads the incoming one\'s. On Linux every thread is a `task_struct`, and threads of one process share an address space through the `clone` flags they were created with. Windows separates the process object (`EPROCESS`) from thread objects (`ETHREAD`/`KTHREAD`).',
    see: ['thread', 'process-control-block', 'context-switch'],
  },
  {
    id: 'thread-local-storage',
    term: 'Thread-Local Storage (TLS)',
    aliases: ['thread_local', 'TLS', '__declspec(thread)', 'TlsAlloc'],
    course: 'os',
    category: 'Concurrency',
    short: 'Variables with one instance per thread. In C++ they are declared `thread_local`; each thread sees and modifies only its own copy, so they need no locking.',
    long: 'On x86-64 Linux, each thread\'s TLS block is reached through the `fs` segment register, which the kernel sets per thread, so accessing a `thread_local` costs about the same as a global. On x64 Windows the `gs` register points at the Thread Environment Block, which holds the TLS slots. A block-scope `thread_local` is constructed the first time each thread reaches it and destroyed when that thread exits. `errno` is thread-local for the same reason: so one thread\'s failure cannot clobber another\'s error code.',
    example: `thread_local std::vector<int> scratch;   // per worker

void job() {
    scratch.clear();          // no lock needed
}`,
    see: ['thread', 'errno', 'fiber'],
    reading: [
      {
        title: 'Storage class specifiers (thread_local)',
        url: 'https://en.cppreference.com/w/cpp/language/storage_duration',
        source: 'cppreference',
        note: 'Thread storage duration and when thread-local objects are constructed and destroyed.',
      },
    ],
  },
  {
    id: 'spinlock',
    term: 'Spinlock',
    aliases: ['spin lock', 'busy waiting', 'test-and-test-and-set'],
    course: 'os',
    category: 'Concurrency',
    short: 'A lock whose waiters loop ("spin") checking it until it becomes free, instead of sleeping. Cheap for very short critical sections when the owner is running on another core; wasteful otherwise.',
    long: 'A minimal spinlock is a `std::atomic_flag` acquired with `test_and_set(acquire)` and released with `clear(release)`. Spinning on a read-only check (test-and-test-and-set) and adding a `pause` hint reduce cache-line traffic. Spinlocks are essential inside kernels, where interrupt handlers cannot sleep, but in user space a spinning thread can waste whole time slices if the owner is preempted. Most real mutexes spin briefly and then block.',
    see: ['test-and-set', 'ticket-lock', 'futex', 'mutex'],
  },
  {
    id: 'test-and-set',
    term: 'Test-and-Set',
    aliases: ['atomic exchange', 'xchg', 'TAS'],
    course: 'os',
    category: 'Concurrency',
    short: 'An atomic instruction that writes a new value to a memory location and returns the old one in a single indivisible step. Enough to build a lock: whoever sees the old value "clear" owns it.',
    long: 'On x86 it is `xchg` (implicitly locked); C++ exposes it as `std::atomic_flag::test_and_set` and `std::atomic<T>::exchange`. Its relatives are [[compare-exchange|compare-and-swap]] and fetch-and-add. ARM implements all of them with load-linked/store-conditional pairs or, on newer cores, single atomic instructions.',
    see: ['spinlock', 'compare-exchange', 'atomic'],
  },
  {
    id: 'ticket-lock',
    term: 'Ticket Lock',
    aliases: ['FIFO spinlock'],
    course: 'os',
    category: 'Concurrency',
    short: 'A fair spinlock built from two counters: `fetch_add` on "next ticket" gives each arriving thread a number, and the lock admits threads when "now serving" reaches their number, in strict arrival order.',
    long: 'Ticket locks fix the unfairness of test-and-set spinlocks (bounded waiting), and Linux used them for kernel spinlocks from 2.6.25 until queued spinlocks replaced them in 4.2. Their weakness is oversubscription: if the thread whose turn it is has been preempted, every other waiter must spin until it runs again.',
    see: ['spinlock', 'test-and-set'],
  },
  {
    id: 'futex',
    term: 'Futex',
    aliases: ['fast userspace mutex', 'FUTEX_WAIT', 'FUTEX_WAKE', 'WaitOnAddress'],
    course: 'os',
    category: 'Concurrency',
    short: 'A Linux system call that lets a thread sleep on an integer in its own memory ("sleep if this word still equals X") and lets another thread wake sleepers on that word. Locks keep their state in the word and call the kernel only when they must sleep or wake someone.',
    long: 'Futexes are why an uncontended `std::mutex` costs one atomic instruction and no [[system-call]]: the fast path is a compare-and-swap in user space. Only when the lock is busy does a thread call `futex(FUTEX_WAIT)`, and the kernel compares the word before sleeping, so a wake that happens just before cannot be lost. glibc builds mutexes, condition variables, semaphores and barriers on futexes. Windows offers the same idea as `WaitOnAddress` and `WakeByAddressSingle`, and C++20 as `std::atomic<T>::wait` and `notify_one`.',
    see: ['mutex', 'spinlock', 'system-call'],
    reading: [
      {
        title: 'futex(2) — Linux manual page',
        url: 'https://man7.org/linux/man-pages/man2/futex.2.html',
        source: 'other',
        note: 'The futex operations and their exact semantics.',
      },
    ],
  },
  {
    id: 'mesa-semantics',
    term: 'Mesa Semantics',
    aliases: ['Hoare semantics', 'signal as a hint'],
    course: 'os',
    category: 'Concurrency',
    short: 'The rule, used by every real condition-variable implementation, that a notification is only a **hint**: the woken thread competes for the mutex like any other, so the condition may be false again by the time it runs. Hence waits go in a `while` loop.',
    long: 'Hoare\'s original monitors (1974) handed the lock straight to the signalled thread, guaranteeing the condition held. Xerox\'s Mesa language, as Lampson and Redell described it in 1980, made signalling cheaper by just making the waiter runnable. Combined with permitted spurious wakeups, this means `if (!ready) cv.wait(lock);` is a bug and `while (!ready) cv.wait(lock);` (or the predicate overload) is required.',
    see: ['condition-variable', 'bounded-buffer'],
  },
  {
    id: 'bounded-buffer',
    term: 'Bounded Buffer (Producer/Consumer)',
    aliases: ['producer-consumer problem', 'ring buffer', 'circular buffer'],
    course: 'os',
    category: 'Concurrency',
    short: 'A fixed-capacity queue shared by producer threads, which must wait while it is full, and consumer threads, which must wait while it is empty. The classic synchronization exercise and an everyday engine structure.',
    long: 'Solved with one mutex and two condition variables (not full, not empty), or with two counting semaphores (free slots, filled slots) plus a mutex for the indices. Pipes, audio buffers, render command queues and job queues are all bounded buffers. With exactly one producer and one consumer it can be made lock-free with two atomic indices.',
    see: ['condition-variable', 'semaphore', 'mesa-semantics'],
  },
  {
    id: 'semaphore',
    term: 'Semaphore',
    aliases: ['counting semaphore', 'binary semaphore', 'std::counting_semaphore', 'P and V', 'sem_wait'],
    course: 'os',
    category: 'Concurrency',
    short: 'A counter of permits with two atomic operations: `acquire` (P, wait) takes a permit, sleeping while there are none, and `release` (V, signal) returns one, waking a sleeper. Invented by Dijkstra in the 1960s.',
    long: 'Unlike a condition variable, a semaphore remembers releases that happen when nobody is waiting. Initialized to 1 it works as a lock, to 0 as an event signal, and to *N* it limits concurrency or counts free slots. C++20 provides `std::counting_semaphore<Max>` and `std::binary_semaphore`; POSIX has `sem_init`/`sem_wait`/`sem_post`, and Windows `CreateSemaphore`/`ReleaseSemaphore`. A semaphore has no owner, so prefer a mutex for mutual exclusion.',
    example: `std::counting_semaphore<4> slots{4};
slots.acquire();     // take a slot (sleeps if none)
useSlot();
slots.release();     // give it back`,
    see: ['mutex', 'condition-variable', 'bounded-buffer'],
    reading: [
      {
        title: 'std::counting_semaphore',
        url: 'https://en.cppreference.com/w/cpp/thread/counting_semaphore',
        source: 'cppreference',
        note: 'The C++20 semaphore API.',
      },
    ],
  },
  {
    id: 'thread-barrier',
    term: 'Barrier and Latch',
    aliases: ['std::barrier', 'std::latch', 'pthread_barrier'],
    course: 'os',
    category: 'Concurrency',
    short: 'Group synchronization points. A **latch** is a one-shot countdown that threads wait on until it reaches zero; a **barrier** makes a fixed group of threads wait until all have arrived, then releases them together and resets for the next phase.',
    long: 'C++20 provides `std::latch` (`count_down`, `wait`, `arrive_and_wait`) and `std::barrier` (`arrive_and_wait`, `arrive_and_drop`, plus an optional completion function that runs once per phase before anyone is released). Barriers suit lockstep phases such as simulation substeps; because everyone waits for the slowest thread, engines with uneven work prefer job systems with dependency counters.',
    see: ['thread', 'semaphore', 'task-graph'],
  },
];
