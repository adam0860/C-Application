import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'ipc',
    term: 'Inter-Process Communication (IPC)',
    aliases: ['IPC', 'interprocess communication'],
    course: 'os',
    category: 'IPC',
    short: 'Any mechanism that lets separate processes exchange data or notifications: pipes, named pipes, signals, shared memory, message queues and sockets. Because processes have isolated address spaces, all of them go through the kernel.',
    long: 'Mechanisms differ in shape (byte stream, messages, raw shared bytes, bare notifications), in who can use them (related processes only, anyone who knows a name, other machines), and in cost: pipes and sockets copy every byte through the kernel, while shared memory needs the kernel only for setup but leaves synchronization to you.',
    see: ['pipe', 'named-pipe', 'unix-signal', 'shared-memory', 'message-queue', 'socket'],
    reading: [
      { title: 'Interprocess Communications (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/windows/win32/ipc/interprocess-communications', source: 'other', note: 'Every Windows IPC mechanism and when to use each.' },
    ],
  },
  {
    id: 'pipe',
    term: 'Pipe',
    aliases: ['anonymous pipe', 'pipe()'],
    course: 'os',
    category: 'IPC',
    short: 'A one-way byte stream through a kernel buffer, created by `pipe(fds)`: `fds[1]` is the write end and `fds[0]` the read end. Related processes share it by inheriting the descriptors across `fork`.',
    long: '`read` blocks while the pipe is empty and returns 0 (end of file) only when every write-end descriptor in every process has been closed. `write` blocks while the pipe is full (64 KiB by default on Linux) and raises `SIGPIPE` if no read end is open. Writes of up to `PIPE_BUF` bytes (4,096 on Linux) are atomic. A pipe keeps no message boundaries. Windows has anonymous pipes too (`CreatePipe`).',
    example: `int fds[2];
pipe(fds);
if (fork() == 0) {          // child reads
    close(fds[1]);
    /* read(fds[0], ...) until it returns 0 */
}
close(fds[0]);              // parent writes
write(fds[1], "hi\\n", 3);
close(fds[1]);              // child sees EOF`,
    see: ['ipc', 'named-pipe', 'file-descriptor'],
    reading: [
      { title: 'pipe(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/pipe.7.html', source: 'other', note: 'Capacity, atomicity and blocking rules.' },
    ],
  },
  {
    id: 'named-pipe',
    term: 'Named Pipe (FIFO)',
    aliases: ['FIFO', 'mkfifo', 'Windows named pipe', 'CreateNamedPipe'],
    course: 'os',
    category: 'IPC',
    short: 'A pipe with a name, so unrelated processes can find it. On POSIX systems it is a FIFO special file made with `mkfifo`; on Windows it lives under `\\\\.\\pipe\\` and can be two-way, message-based and secured with an ACL.',
    long: 'A POSIX FIFO behaves exactly like a pipe once opened; opening it blocks until both a reader and a writer are present. No data is stored on disk. Windows named pipes (`CreateNamedPipeW`, `ConnectNamedPipe`, client `CreateFileW`) support duplex and message modes and are a common channel between Windows tools and a running game.',
    see: ['pipe', 'ipc', 'socket'],
    reading: [
      { title: 'Named Pipes (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes', source: 'other', note: 'Windows named pipes in depth.' },
      { title: 'fifo(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/fifo.7.html', source: 'other', note: 'POSIX FIFO semantics on Linux.' },
    ],
  },
  {
    id: 'unix-signal',
    term: 'Signal',
    aliases: ['signals', 'POSIX signal', 'SIGTERM', 'SIGKILL', 'sigaction'],
    course: 'os',
    category: 'IPC',
    short: 'An asynchronous notification, just a small number, that the kernel delivers to a process: from another process (`kill`), from the terminal (Ctrl+C sends `SIGINT`) or from the kernel itself (`SIGSEGV`, `SIGCHLD`, `SIGPIPE`).',
    long: 'Each signal has a default action (terminate, core dump, ignore, stop). A process can install a handler with `sigaction`, except for `SIGKILL` and `SIGSTOP`, which cannot be caught, blocked or ignored. Handlers interrupt arbitrary code, so they may call only async-signal-safe functions. A shell reports death by signal n as exit status 128 + n. Windows has no inter-process signals; it uses console control handlers, window messages and `TerminateProcess`.',
    see: ['async-signal-safe', 'ipc'],
    reading: [
      { title: 'signal(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/signal.7.html', source: 'other', note: 'Every signal, its number and default action.' },
    ],
  },
  {
    id: 'async-signal-safe',
    term: 'Async-Signal-Safe',
    aliases: ['async-signal safety', 'signal safety', 'sig_atomic_t'],
    course: 'os',
    category: 'IPC',
    short: 'A function is async-signal-safe if it may be called from a signal handler that interrupted arbitrary code. `write`, `_exit` and `kill` are; `malloc`, `printf` and anything that allocates or takes a lock are not.',
    long: 'A handler can run while the interrupted code holds the allocator\'s lock or is halfway through updating a data structure. Calling an unsafe function from the handler can deadlock or corrupt that state. The standard pattern is for the handler to set a `volatile std::sig_atomic_t` (or lock-free `std::atomic`) flag that the main loop checks, and to save and restore `errno` if it calls anything at all.',
    see: ['unix-signal', 'deadlock'],
    reading: [
      { title: 'signal-safety(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/signal-safety.7.html', source: 'other', note: 'The list of async-signal-safe functions.' },
    ],
  },
  {
    id: 'shared-memory',
    term: 'Shared Memory',
    aliases: ['shm', 'shm_open', 'file mapping', 'CreateFileMapping', 'MAP_SHARED'],
    course: 'os',
    category: 'IPC',
    short: 'IPC where two or more processes map the same physical page frames into their address spaces, so data written by one is directly visible to the others without any copying through the kernel.',
    long: 'On POSIX: `shm_open` a name, `ftruncate` it to a size, and `mmap` it with `MAP_SHARED`. On Windows: `CreateFileMappingW` with `INVALID_HANDLE_VALUE` and a name, then `MapViewOfFile`. It is the fastest IPC, but the kernel provides no synchronization: use lock-free atomics, process-shared mutexes or semaphores. The region usually lands at different virtual addresses in each process, so store offsets, never pointers.',
    see: ['ipc', 'page-table', 'data-race', 'atomic'],
    reading: [
      { title: 'shm_overview(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/shm_overview.7.html', source: 'other', note: 'POSIX shared memory API overview.' },
    ],
  },
  {
    id: 'message-queue',
    term: 'Message Queue',
    aliases: ['POSIX message queue', 'mq_open', 'mq_send'],
    course: 'os',
    category: 'IPC',
    short: 'A kernel-managed queue of discrete messages between processes: each send is received as one whole message, optionally by priority. POSIX offers `mq_open`/`mq_send`/`mq_receive`; System V offers the older `msgget`/`msgsnd`.',
    see: ['ipc', 'pipe'],
    reading: [
      { title: 'mq_overview(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/mq_overview.7.html', source: 'other', note: 'POSIX message queues on Linux.' },
    ],
  },
  {
    id: 'socket',
    term: 'Socket (Network)',
    aliases: ['sockets', 'BSD sockets', 'Unix domain socket', 'AF_UNIX'],
    course: 'os',
    category: 'Networking',
    short: 'An endpoint for communication, represented as a file descriptor (a `SOCKET` handle on Windows). Its address family (`AF_INET`, `AF_INET6`, `AF_UNIX`) and type (`SOCK_STREAM` for TCP, `SOCK_DGRAM` for UDP) decide how it talks.',
    long: 'Servers create a socket, `bind` it to an address and port, `listen`, and `accept` connections, each of which yields a new connected socket. Clients `connect`. Data moves with `send`/`recv` (or `sendto`/`recvfrom` for datagrams). `AF_UNIX` sockets connect processes on the same machine through a filesystem path and are a common, fast local IPC mechanism.',
    see: ['tcp', 'udp', 'port-number', 'file-descriptor', 'winsock'],
    reading: [
      { title: 'socket(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/socket.7.html', source: 'other', note: 'The Linux socket interface and its options.' },
    ],
  },
  {
    id: 'tcp',
    term: 'TCP',
    aliases: ['Transmission Control Protocol', 'SOCK_STREAM'],
    course: 'os',
    category: 'Networking',
    short: 'Transmission Control Protocol: a connection-oriented transport that turns unreliable IP packets into a reliable, ordered byte stream, with flow control and congestion control. It has no message boundaries.',
    long: 'TCP numbers every byte, acknowledges what arrived and retransmits what did not. A connection opens with a three-way handshake and closes each direction with its own FIN. Its in-order guarantee causes head-of-line blocking, which is why real-time games send gameplay state over UDP and use TCP for logins, chat, downloads and other data where every byte matters more than latency.',
    see: ['udp', 'three-way-handshake', 'head-of-line-blocking', 'socket'],
    reading: [
      { title: 'tcp(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/tcp.7.html', source: 'other', note: 'Linux TCP options such as TCP_NODELAY.' },
    ],
  },
  {
    id: 'udp',
    term: 'UDP',
    aliases: ['User Datagram Protocol', 'SOCK_DGRAM', 'datagram'],
    course: 'os',
    category: 'Networking',
    short: 'User Datagram Protocol: a thin, connectionless transport that sends independent datagrams with an 8-byte header. Datagrams keep their boundaries but may be lost, duplicated or reordered.',
    long: 'UDP adds only ports and a checksum to IP. Fast-paced games build exactly the guarantees they need on top of it: sequence numbers, ack bitfields, and separate unreliable and reliable channels, so a lost position update never delays newer ones. QUIC (HTTP/3) is a general-purpose reliable transport built on UDP.',
    see: ['tcp', 'head-of-line-blocking', 'socket', 'replication'],
    reading: [
      { title: 'udp(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/udp.7.html', source: 'other', note: 'Linux UDP sockets.' },
    ],
  },
  {
    id: 'port-number',
    term: 'Port Number',
    aliases: ['port', 'ephemeral port'],
    course: 'os',
    category: 'Networking',
    short: 'A 16-bit number that identifies a socket on a host, so one IP address can serve many programs. A TCP connection is identified by the four-tuple (source IP, source port, destination IP, destination port).',
    long: 'Servers bind well-known or configured ports; clients normally get an ephemeral port chosen by the kernel. Binding to port 0 asks the kernel for any free port. Ports below 1024 traditionally require privileges on Unix-like systems.',
    see: ['socket', 'tcp', 'udp'],
  },
  {
    id: 'three-way-handshake',
    term: 'Three-Way Handshake',
    aliases: ['TCP handshake', 'SYN', 'SYN-ACK'],
    course: 'os',
    category: 'Networking',
    short: 'How TCP opens a connection: the client sends SYN with its initial sequence number, the server replies SYN-ACK with its own number and an acknowledgment, and the client sends ACK. Both sides then know each other\'s starting sequence numbers.',
    long: 'The handshake runs inside the kernel: `connect` returns when it completes, and the server\'s kernel queues the established connection until `accept` returns it. Teardown takes a FIN and an ACK in each direction; the side that closes first waits in TIME_WAIT (60 seconds on Linux).',
    see: ['tcp', 'socket'],
  },
  {
    id: 'head-of-line-blocking',
    term: 'Head-of-Line Blocking',
    aliases: ['HOL blocking'],
    course: 'os',
    category: 'Networking',
    short: 'When one lost or delayed item holds up everything queued behind it. In TCP, one lost segment stops the kernel from delivering any later bytes, even ones that already arrived, until the retransmission comes in.',
    long: 'The stall lasts at least one round trip, and at least the retransmission timeout (200 ms minimum on Linux) if loss is detected by timeout. For real-time game state it means stale data delays fresh data, which is why games use UDP. QUIC avoids it between independent streams.',
    see: ['tcp', 'udp'],
  },
  {
    id: 'nonblocking-socket',
    term: 'Non-Blocking Socket',
    aliases: ['O_NONBLOCK', 'MSG_DONTWAIT', 'EWOULDBLOCK', 'EAGAIN'],
    course: 'os',
    category: 'Networking',
    short: 'A socket on which calls that would have to wait return immediately with the error `EAGAIN`/`EWOULDBLOCK` (Windows: `WSAEWOULDBLOCK`) instead of blocking the thread.',
    long: 'Set it with `fcntl(fd, F_SETFL, O_NONBLOCK)` (Windows: `ioctlsocket(s, FIONBIO, &on)`) or per call with `MSG_DONTWAIT`. Game loops drain non-blocking sockets once per frame; servers combine them with readiness APIs such as `epoll`.',
    see: ['io-multiplexing', 'socket'],
  },
  {
    id: 'io-multiplexing',
    term: 'I/O Multiplexing',
    aliases: ['select', 'poll', 'epoll', 'kqueue', 'IOCP', 'readiness notification'],
    course: 'os',
    category: 'Networking',
    short: 'Waiting on many file descriptors at once and learning which are ready, so one thread can serve many sockets. `select` and `poll` scan every fd on each call; Linux `epoll` and BSD `kqueue` return only the ready ones.',
    long: 'Readiness APIs (`select`, `poll`, `epoll`, `kqueue`) say "this fd can be read now without blocking". Completion APIs (Windows IOCP, Linux `io_uring`) instead let you start operations and tell you when they have finished. `select` is limited to fd numbers below `FD_SETSIZE` (1,024 on Linux).',
    see: ['nonblocking-socket', 'socket', 'iocp', 'io-uring'],
    reading: [
      { title: 'epoll(7) — Linux manual page', url: 'https://man7.org/linux/man-pages/man7/epoll.7.html', source: 'other', note: 'How epoll works and its edge- and level-triggered modes.' },
    ],
  },
  {
    id: 'winsock',
    term: 'Winsock',
    aliases: ['Windows Sockets', 'WSAStartup', 'Ws2_32'],
    course: 'os',
    category: 'Networking',
    short: 'The Windows sockets API, modelled on BSD sockets but with its own plumbing: `WSAStartup`/`WSACleanup`, the `SOCKET` handle type with `INVALID_SOCKET`, `closesocket`, `WSAGetLastError` and `ioctlsocket`.',
    see: ['socket', 'os-handle'],
    reading: [
      { title: 'Getting Started with Winsock (Microsoft Learn)', url: 'https://learn.microsoft.com/en-us/windows/win32/winsock/getting-started-with-winsock', source: 'other', note: 'A complete Winsock client and server.' },
    ],
  },
];
