import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'cache-coherence',
    term: 'Cache Coherence',
    aliases: ['coherence', 'coherence protocol', 'snooping', 'directory protocol', 'snoop filter', 'SWMR'],
    course: 'arch',
    category: 'Multicore',
    short: 'The guarantee that all cores\' private caches agree about each memory location: at any time a line has either one writer or any number of readers, and every read returns the latest write.',
    long: 'Without a coherence protocol, a core with a write-back cache could keep reading its own stale copy of a variable after another core wrote it. Protocols enforce the single-writer/multiple-reader (SWMR) invariant per cache line, usually by invalidating other copies before a write.\n\nSnooping protocols broadcast every miss to all caches; directory protocols (and the snoop filters in modern L3 caches) track which cores may hold each line and contact only those. Coherence is per location: the order in which writes to *different* locations become visible is the memory consistency model.',
    see: ['mesi-protocol', 'false-sharing', 'memory-consistency-model', 'cache-line'],
    reading: [
      {
        title: 'Cache coherence',
        url: 'https://en.wikipedia.org/wiki/Cache_coherence',
        source: 'article',
        note: 'Definitions, snooping vs directory mechanisms, and the major protocols.',
      },
    ],
  },
  {
    id: 'mesi-protocol',
    term: 'MESI Protocol',
    aliases: ['MESI', 'MOESI', 'MESIF', 'Modified', 'Exclusive', 'Shared', 'Invalid', 'read for ownership'],
    course: 'arch',
    category: 'Multicore',
    short: 'The common cache coherence protocol that tags every cached line Modified (dirty, only copy), Exclusive (clean, only copy), Shared (clean, maybe other copies) or Invalid.',
    long: 'A read miss fetches the line in E if no other cache has it, otherwise in S (a Modified owner supplies the data). A write to an E line silently becomes M; a write to an S or I line first invalidates all other copies, with an upgrade or a read for ownership (RFO). The E state makes private data free of coherence traffic.\n\nAMD uses MOESI, whose Owned state lets a dirty line be shared without writing it back; Intel uses MESIF, whose Forward state designates one sharer to answer requests.',
    see: ['cache-coherence', 'false-sharing', 'write-back-cache'],
    reading: [
      {
        title: 'MESI protocol',
        url: 'https://en.wikipedia.org/wiki/MESI_protocol',
        source: 'article',
        note: 'States, transitions and bus operations, with a worked example.',
      },
    ],
  },
  {
    id: 'false-sharing',
    term: 'False Sharing',
    aliases: ['cache line ping-pong', 'cache line bouncing'],
    course: 'arch',
    category: 'Multicore',
    short: 'A slowdown that occurs when threads on different cores write different variables that happen to share one cache line, so the coherence protocol bounces the whole line between them.',
    long: 'Coherence works on whole lines, so every write by one thread invalidates the other cores\' copies even though the threads never touch each other\'s data. The program stays correct (it is not a data race), but it can slow down dramatically and scale worse as threads are added.\n\nFixes: pad independently written per-thread data to separate lines with `alignas(64)` or `std::hardware_destructive_interference_size`, accumulate in local variables and publish once, and partition work into contiguous chunks. Linux `perf c2c` and Intel VTune can detect it.',
    example: `struct alignas(64) WorkerStats {   // one line per worker
    std::atomic<long> jobsDone{0};
};
WorkerStats stats[8];`,
    see: ['cache-coherence', 'cache-line', 'mesi-protocol', 'memory-alignment'],
    reading: [
      {
        title: 'std::hardware_destructive_interference_size',
        url: 'https://en.cppreference.com/w/cpp/thread/hardware_destructive_interference_size',
        source: 'cppreference',
        note: 'The C++17 constants for padding against false sharing.',
      },
    ],
  },
  {
    id: 'store-buffer',
    term: 'Store Buffer',
    aliases: ['write buffer', 'store-to-load forwarding', 'store forwarding'],
    course: 'arch',
    category: 'Multicore',
    short: 'A small FIFO queue in each core that holds stores until they can be written into the L1 cache, so the core does not stall while a store waits for its cache line.',
    long: 'A load first checks its own core\'s store buffer and takes the newest matching value (store-to-load forwarding), so single-threaded code never notices. Other cores, however, see a store only once it drains into the cache, which lets a core\'s later loads become visible before its earlier stores. This store→load reordering is the one relaxation in x86-TSO; preventing it requires a full fence or a `seq_cst` store (`xchg` or a locked instruction on x86).',
    see: ['x86-tso', 'memory-fence', 'memory-consistency-model'],
  },
  {
    id: 'memory-consistency-model',
    term: 'Memory Consistency Model',
    aliases: ['memory model', 'hardware memory model', 'weak ordering', 'litmus test'],
    course: 'arch',
    category: 'Multicore',
    short: 'The rules saying in which orders one thread\'s memory operations to different addresses may become visible to other threads. Architectures (x86-TSO, ARMv8) and languages (the C++ memory model) each define one.',
    long: 'Sequential consistency allows no reordering; x86-TSO allows a later load to pass an earlier store; weakly ordered architectures such as ARMv8, RISC-V and POWER allow loads and stores to different addresses to be reordered in almost any way unless the program uses barriers or acquire/release instructions. Small programs called litmus tests (store buffering, message passing) show the differences.\n\nThe C++ memory model sits above all of these: code that is free of data races and uses `std::atomic` with appropriate memory orders behaves the same on every CPU.',
    see: ['sequential-consistency', 'x86-tso', 'memory-order', 'store-buffer'],
  },
  {
    id: 'sequential-consistency',
    term: 'Sequential Consistency',
    aliases: ['SC'],
    course: 'arch',
    category: 'Multicore',
    short: 'The memory model in which every execution looks like some interleaving of all threads\' operations, with each thread\'s operations in program order. Defined by Leslie Lamport in 1979.',
    long: 'It matches how most people imagine threads, but no mainstream CPU provides it by default because it forbids store buffers and many out-of-order optimizations. C++ offers it for data-race-free programs that use only `seq_cst` atomics, which is why `memory_order_seq_cst` is the default order.',
    see: ['memory-consistency-model', 'memory-order', 'x86-tso'],
  },
  {
    id: 'x86-tso',
    term: 'x86-TSO (Total Store Order)',
    aliases: ['TSO', 'total store order'],
    course: 'arch',
    category: 'Multicore',
    short: 'The memory model of x86 processors: all cores agree on one order of all stores, and the only visible reordering is that a load may complete before an earlier store to a different address (because of store buffers).',
    long: 'Under TSO, loads are not reordered with loads and stores are not reordered with loads or stores before them, so message passing (write data, then flag) works in hardware without barriers. Patterns like Dekker\'s algorithm (store my flag, then load yours) still need a full fence. Consequently, C++ acquire loads and release stores compile to plain `mov` instructions on x86, and only `seq_cst` stores and fences cost extra.',
    see: ['memory-consistency-model', 'store-buffer', 'sequential-consistency'],
  },
  {
    id: 'memory-fence',
    term: 'Memory Fence',
    aliases: ['memory barrier', 'fence', 'barrier', 'std::atomic_thread_fence', 'mfence', 'dmb'],
    course: 'arch',
    category: 'Multicore',
    short: 'An instruction or operation that restricts how memory operations before and after it may be reordered. In C++, `std::atomic_thread_fence` with a memory order.',
    long: 'A release fence before a relaxed store makes that store act like a release store; an acquire fence after a relaxed load makes it act like an acquire load. A `seq_cst` fence additionally prevents store→load reordering. GCC on x86-64 implements a `seq_cst` fence as a locked no-op (`lock or` on the stack) and Clang on AArch64 as `dmb ish`. Fences let code pay for ordering once for many variables, or only on the path that needs it.',
    example: `payload = compute();
std::atomic_thread_fence(std::memory_order_release);
ready.store(true, std::memory_order_relaxed);`,
    see: ['memory-order', 'store-buffer', 'atomic'],
    reading: [
      {
        title: 'std::atomic_thread_fence',
        url: 'https://en.cppreference.com/w/cpp/atomic/atomic_thread_fence',
        source: 'cppreference',
        note: 'Fence-to-fence and fence-to-atomic synchronization rules.',
      },
    ],
  },
];
