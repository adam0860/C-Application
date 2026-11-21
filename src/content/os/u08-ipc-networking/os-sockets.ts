import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: "os-sockets",
  title: "Sockets, TCP and UDP",
  summary: "The sockets API from socket() to close(), a real loopback TCP echo, the TCP handshake and teardown, why fast games build their own reliability on UDP, readiness APIs from select to epoll, and Winsock.",
  minutes: 22,
  objectives: [
    "Write a TCP server and client with `socket`, `bind`, `listen`, `accept`, `connect`, `send` and `recv`, handling partial reads",
    "Trace the TCP three-way handshake and four-segment teardown, with sequence and acknowledgment numbers",
    "Explain head-of-line blocking and why fast-paced games send state over UDP with their own sequence numbers and acks",
    "Keep a game loop responsive with non-blocking sockets and readiness APIs (`poll`, `epoll`, IOCP)",
    "Port socket code between POSIX and Winsock",
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: "A socket is a file descriptor for a conversation",
      blocks: [
        {
          type: 'p',
          text: "Pipes connect processes on one machine. A **[[socket]]** generalizes the idea to any two endpoints, on the same machine or across the planet. To your program it is yet another [[file-descriptor]] (a `SOCKET` handle on Windows); behind it, the kernel runs the whole network stack: buffering, retransmission, routing, and the driver that hands frames to the network card by [[direct-memory-access|DMA]].",
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 262">
<rect x="10" y="10" width="220" height="34" rx="6" class="f-blue" fill-opacity="0.14" stroke="none"/>
<rect x="10" y="10" width="220" height="34" rx="6" fill="none" class="s-blue" stroke-width="1.5"/>
<text x="120" y="25" font-size="11.5" font-weight="700" text-anchor="middle" class="t-blue">your game</text>
<text x="120" y="39" font-size="10" text-anchor="middle" font-family="monospace">send(fd, buf, n)</text>
<line x1="4" y1="54" x2="516" y2="54" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" opacity="0.5"/>
<text x="8" y="66" font-size="9.5" class="t-gray">kernel</text>
<rect x="10" y="72" width="220" height="34" rx="6" class="f-orange" fill-opacity="0.14" stroke="none"/>
<rect x="10" y="72" width="220" height="34" rx="6" fill="none" class="s-orange" stroke-width="1.5"/>
<text x="120" y="87" font-size="11.5" font-weight="700" text-anchor="middle">socket layer</text>
<text x="120" y="100" font-size="9.5" text-anchor="middle">fd lookup, send/receive buffers</text>
<rect x="10" y="114" width="106" height="34" rx="6" class="f-purple" fill-opacity="0.14" stroke="none"/>
<rect x="10" y="114" width="106" height="34" rx="6" fill="none" class="s-purple" stroke-width="1.5"/>
<text x="63" y="129" font-size="11.5" font-weight="700" text-anchor="middle">TCP</text>
<text x="63" y="142" font-size="9.5" text-anchor="middle">reliable stream</text>
<rect x="124" y="114" width="106" height="34" rx="6" class="f-teal" fill-opacity="0.14" stroke="none"/>
<rect x="124" y="114" width="106" height="34" rx="6" fill="none" class="s-teal" stroke-width="1.5"/>
<text x="177" y="129" font-size="11.5" font-weight="700" text-anchor="middle">UDP</text>
<text x="177" y="142" font-size="9.5" text-anchor="middle">datagrams</text>
<rect x="10" y="156" width="220" height="34" rx="6" class="f-green" fill-opacity="0.14" stroke="none"/>
<rect x="10" y="156" width="220" height="34" rx="6" fill="none" class="s-green" stroke-width="1.5"/>
<text x="120" y="171" font-size="11.5" font-weight="700" text-anchor="middle">IP</text>
<text x="120" y="184" font-size="9.5" text-anchor="middle">addresses, routing</text>
<rect x="10" y="198" width="220" height="34" rx="6" class="f-gray" fill-opacity="0.14" stroke="none"/>
<rect x="10" y="198" width="220" height="34" rx="6" fill="none" class="s-gray" stroke-width="1.5"/>
<text x="120" y="213" font-size="11.5" font-weight="700" text-anchor="middle">driver + NIC</text>
<text x="120" y="226" font-size="9.5" text-anchor="middle">Ethernet / Wi-Fi frames, DMA</text>
<path d="M120,232 L120,246" class="s-gray" stroke-width="1.5" fill="none"/>
<text x="120" y="258" font-size="10" text-anchor="middle" class="t-gray">to the wire</text>
<text x="370" y="66" font-size="10.5" text-anchor="middle" class="t-gray">what one UDP datagram looks like</text>
<rect x="430" y="76" width="70" height="26" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="430" y="76" width="70" height="26" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="465" y="93" font-size="10" text-anchor="middle">payload</text>
<rect x="388" y="118" width="42" height="26" class="f-teal" fill-opacity="0.18" stroke="none"/>
<rect x="388" y="118" width="42" height="26" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="409" y="135" font-size="10" text-anchor="middle">UDP 8</text>
<rect x="430" y="118" width="70" height="26" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="430" y="118" width="70" height="26" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="465" y="135" font-size="10" text-anchor="middle">payload</text>
<rect x="334" y="160" width="54" height="26" class="f-green" fill-opacity="0.18" stroke="none"/>
<rect x="334" y="160" width="54" height="26" fill="none" class="s-green" stroke-width="1.2"/>
<text x="361" y="177" font-size="10" text-anchor="middle">IPv4 20</text>
<rect x="388" y="160" width="42" height="26" class="f-teal" fill-opacity="0.18" stroke="none"/>
<rect x="388" y="160" width="42" height="26" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="409" y="177" font-size="10" text-anchor="middle">UDP 8</text>
<rect x="430" y="160" width="70" height="26" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="430" y="160" width="70" height="26" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="465" y="177" font-size="10" text-anchor="middle">payload</text>
<rect x="250" y="202" width="48" height="26" class="f-gray" fill-opacity="0.18" stroke="none"/>
<rect x="250" y="202" width="48" height="26" fill="none" class="s-gray" stroke-width="1.2"/>
<text x="274" y="219" font-size="10" text-anchor="middle">Eth 14</text>
<rect x="298" y="202" width="54" height="26" class="f-green" fill-opacity="0.18" stroke="none"/>
<rect x="298" y="202" width="54" height="26" fill="none" class="s-green" stroke-width="1.2"/>
<text x="325" y="219" font-size="10" text-anchor="middle">IPv4 20</text>
<rect x="352" y="202" width="42" height="26" class="f-teal" fill-opacity="0.18" stroke="none"/>
<rect x="352" y="202" width="42" height="26" fill="none" class="s-teal" stroke-width="1.2"/>
<text x="373" y="219" font-size="10" text-anchor="middle">UDP 8</text>
<rect x="394" y="202" width="70" height="26" class="f-blue" fill-opacity="0.18" stroke="none"/>
<rect x="394" y="202" width="70" height="26" fill="none" class="s-blue" stroke-width="1.2"/>
<text x="429" y="219" font-size="10" text-anchor="middle">payload</text>
<rect x="464" y="202" width="40" height="26" class="f-gray" fill-opacity="0.18" stroke="none"/>
<rect x="464" y="202" width="40" height="26" fill="none" class="s-gray" stroke-width="1.2"/>
<text x="484" y="219" font-size="10" text-anchor="middle">FCS 4</text>
<text x="377" y="246" font-size="10" text-anchor="middle" class="t-gray">header sizes in bytes; each layer wraps the one above</text>
</svg>`,
          alt: "Left: a layered stack. Your game in user mode calls send; below the kernel line are the socket layer, TCP and UDP side by side, IP, and the driver plus NIC, going to the wire. Right: one UDP datagram growing as it descends: payload, then UDP header 8 bytes plus payload, then IPv4 20 plus UDP 8 plus payload, then Ethernet 14, IPv4 20, UDP 8, payload and a 4-byte frame check sequence.",
          caption: "Everything below the dashed line is kernel code (and finally hardware). One `send` from your game becomes a frame on the wire, each layer adding its own header.",
        },
        {
          type: 'p',
          text: "When you create a socket you choose three things:",
        },
        {
          type: 'list',
          items: [
            "**Address family:** `AF_INET` (IPv4), `AF_INET6` (IPv6) or `AF_UNIX` (a *Unix domain socket*, a local-only socket named by a file path: the fastest way for two processes on one machine to use the socket API).",
            "**Type:** `SOCK_STREAM`, a reliable, ordered byte stream, which over IP means **[[tcp|TCP]]**; or `SOCK_DGRAM`, independent datagrams that may be lost, duplicated or reordered, which over IP means **[[udp|UDP]]**.",
            "**Protocol:** usually 0, meaning \"the default for that family and type\".",
          ],
        },
        {
          type: 'p',
          text: "An IP address finds the machine; a 16-bit **[[port-number|port]]** finds the socket on it. A TCP connection is identified by four numbers, (client IP, client port, server IP, server port), which is how one server port can serve thousands of clients at once.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why networking lives in the kernel",
          text: "The network card is shared by every process, packets arrive at any moment by [[hardware-interrupt|interrupt]] and must be routed to the right socket, and TCP must keep retransmitting even while your process is descheduled. Only the kernel sees all of that. Putting the stack behind an fd also means sockets work with the same `read`, `write`, `close` and `poll` calls as files and pipes. (High-frequency trading systems and some specialized servers do bypass the kernel for latency; ordinary games do not need to.)",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: "A game server's TCP port is open in `listen` state and three players connect. How many socket file descriptors does the server process hold for this port once it has called `accept` for each of them?",
      options: [
        { text: "1: the listening socket handles all three players", why: "The listening socket never carries player data; it only produces new connections." },
        { text: "3: `listen` turns into the first player's socket, and `accept` creates two more", why: "The listening socket stays a listening socket for its whole life." },
        { text: "4: the listening socket plus one new connected socket per `accept`", correct: true, why: "Right. Each `accept` returns a fresh fd for one connection, identified by the player's address and port, while the listening fd keeps waiting for more." },
        { text: "6: one socket per direction per player", why: "TCP sockets are bidirectional: one fd both sends and receives." },
      ],
      explanation: "This split is fundamental: the listening socket is a factory, connected sockets are conversations. All four share the server's port number; the kernel tells connections apart by the full four-tuple of addresses and ports. Forgetting it leads to the classic bug of calling `recv` on the listening socket.",
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: "The calls, and a real TCP echo",
      blocks: [
        {
          type: 'steps',
          items: [
            { title: "socket()", text: "Both sides: create an endpoint and get an fd." },
            { title: "bind()", text: "Server: attach the socket to a local address and port. Clients usually skip it and let the kernel pick an *ephemeral* port." },
            { title: "listen()", text: "Server: mark the socket as passive. The backlog argument sizes the queue of connections that finished the handshake but have not been accepted yet." },
            { title: "connect()", text: "Client: the kernel performs the TCP handshake; `connect` returns when the connection is established." },
            { title: "accept()", text: "Server: take one established connection off the queue and return a **new** fd for it. Blocks if the queue is empty." },
            { title: "send() / recv()", text: "Both: move bytes into and out of the kernel's socket buffers. `recv` returning 0 means the peer closed its side." },
            { title: "close()", text: "Both: release the fd; for TCP the kernel sends a FIN and finishes the teardown on its own." },
          ],
        },
        {
          type: 'p',
          text: "This program runs a server thread and a client in one process, talking over the loopback interface (`127.0.0.1`, which never leaves the machine). Only the main thread prints, after each reply has fully arrived, so the output is deterministic:",
        },
        {
          type: 'code',
          title: "tcp_echo.cpp",
          runnable: true,
          code: `#include <arpa/inet.h>
#include <cstdio>
#include <netinet/in.h>
#include <string>
#include <sys/socket.h>
#include <thread>
#include <unistd.h>

// TCP is a byte stream: loop until exactly n bytes have arrived.
bool recvAll(int fd, char* buf, std::size_t n) {
    std::size_t got = 0;
    while (got < n) {
        ssize_t r = recv(fd, buf + got, n - got, 0);
        if (r <= 0) return false;     // 0 = peer closed, -1 = error
        got += static_cast<std::size_t>(r);
    }
    return true;
}

void serve(int listenFd) {
    int conn = accept(listenFd, nullptr, nullptr);  // new socket
    char buf[64];
    ssize_t n;
    while ((n = recv(conn, buf, sizeof buf, 0)) > 0)
        send(conn, buf, static_cast<std::size_t>(n), 0);  // echo
    close(conn);                      // recv returned 0: client done
}

int main() {
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);  // 127.0.0.1
    addr.sin_port = htons(0);         // 0: kernel picks a free port
    auto* sa = reinterpret_cast<sockaddr*>(&addr);
    socklen_t len = sizeof addr;

    int lfd = socket(AF_INET, SOCK_STREAM, 0);
    if (bind(lfd, sa, len) == -1 || listen(lfd, 8) == -1) {
        std::perror("bind/listen");
        return 1;
    }
    getsockname(lfd, sa, &len);       // learn the chosen port
    std::jthread server(serve, lfd);

    int cfd = socket(AF_INET, SOCK_STREAM, 0);
    if (connect(cfd, sa, len) == -1) {
        std::perror("connect");
        return 1;
    }
    for (std::string msg : {"JOIN ana", "MOVE 3 4", "QUIT"}) {
        send(cfd, msg.data(), msg.size(), 0);
        std::string reply(msg.size(), '\\0');
        if (recvAll(cfd, reply.data(), reply.size()))
            std::printf("sent %-9s echo %s\\n",
                        msg.c_str(), reply.c_str());
    }
    close(cfd);                       // FIN: server's recv returns 0
    server.join();
    close(lfd);
    std::printf("server finished\\n");
}`,
          output: "sent JOIN ana  echo JOIN ana\nsent MOVE 3 4  echo MOVE 3 4\nsent QUIT      echo QUIT\nserver finished",
          annotations: [
            { lines: '10-18', text: "`recv` may return fewer bytes than you asked for: TCP delivers a stream, not messages. Real protocols loop like this until a whole message (often length-prefixed) has arrived." },
            { lines: 21, text: "`accept` blocks until a connection is queued, then returns a brand-new socket for it. The listening socket stays open for more clients." },
            { lines: 24, text: "Echo until `recv` returns 0 (client closed) or −1 (error). Error checks on `send` are trimmed to keep the example short; real code checks them." },
            { lines: '32-33', text: "Multi-byte fields in socket addresses are in network byte order (big-endian). `htonl` and `htons` convert from host order; see [[endianness]]." },
            { lines: 33, text: "Port 0 asks the kernel for any free port, so the example never collides with something already running." },
            { lines: 38, text: "`listen` comes before the client thread can call `connect`, so the connection cannot be refused." },
            { lines: 42, text: "`getsockname` reads back the address the kernel actually assigned, including the chosen port." },
            { lines: 57, text: "Closing the client sends a FIN; the server's `recv` then returns 0 and its loop ends." },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: "Production servers need two more lines",
          text: "Set `SO_REUSEADDR` before `bind`, or restarting your server right after a shutdown fails with `EADDRINUSE` while old connections sit in TIME_WAIT. And ignore `SIGPIPE` (or pass `MSG_NOSIGNAL` to `send`), or one player disconnecting at the wrong moment kills the whole server process, as the IPC lesson showed.",
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'fill',
      prompt: "Complete the order of calls for a TCP server that serves one client.",
      template: `int lfd = socket(AF_INET, SOCK_STREAM, 0);
___(lfd, addr, addrLen);      // attach to port 7777
___(lfd, 16);                 // become passive, queue 16
int conn = ___(lfd, nullptr, nullptr);
recv(conn, buf, sizeof buf, 0);`,
      blanks: [{ answers: ["bind"] }, { answers: ["listen"] }, { answers: ["accept"] }],
      wordBank: ["bind", "listen", "accept", "connect", "open", "select"],
      explanation: "`bind` gives the socket its local address, `listen` turns it into a passive socket with a queue of completed handshakes, and `accept` dequeues one connection and returns a new fd for it. `connect` is the client's half of the handshake; calling it on a server socket would try to dial out instead of waiting for players.",
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: "TCP: handshake, reliable stream, teardown",
      blocks: [
        {
          type: 'p',
          text: "IP itself promises nothing: packets can be dropped by a congested router, duplicated, or arrive out of order. **TCP** builds a reliable, ordered byte stream on top of that by numbering every byte, having the receiver acknowledge what it has received, and retransmitting what goes unacknowledged. Before any data flows, the two kernels agree on starting sequence numbers with the **[[three-way-handshake|three-way handshake]]**:",
        },
        {
  "type": "algo",
  "view": "graph",
  "width": 440,
  "height": 596,
  "nodes": [
    {
      "id": "C",
      "x": 100,
      "y": 42,
      "label": "client"
    },
    {
      "id": "S",
      "x": 340,
      "y": 42,
      "label": "server"
    },
    {
      "id": "C1",
      "x": 100,
      "y": 112,
      "label": "·"
    },
    {
      "id": "C3",
      "x": 100,
      "y": 212,
      "label": "·"
    },
    {
      "id": "C4",
      "x": 100,
      "y": 262,
      "label": "·"
    },
    {
      "id": "C6",
      "x": 100,
      "y": 362,
      "label": "·"
    },
    {
      "id": "C8",
      "x": 100,
      "y": 462,
      "label": "·"
    },
    {
      "id": "C9",
      "x": 100,
      "y": 512,
      "label": "·"
    },
    {
      "id": "S2",
      "x": 340,
      "y": 162,
      "label": "·"
    },
    {
      "id": "S4",
      "x": 340,
      "y": 262,
      "label": "·"
    },
    {
      "id": "S5",
      "x": 340,
      "y": 312,
      "label": "·"
    },
    {
      "id": "S7",
      "x": 340,
      "y": 412,
      "label": "·"
    },
    {
      "id": "S8",
      "x": 340,
      "y": 462,
      "label": "·"
    },
    {
      "id": "S10",
      "x": 340,
      "y": 562,
      "label": "·"
    }
  ],
  "edges": [
    {
      "from": "C",
      "to": "C1"
    },
    {
      "from": "C1",
      "to": "C3"
    },
    {
      "from": "C3",
      "to": "C4"
    },
    {
      "from": "C4",
      "to": "C6"
    },
    {
      "from": "C6",
      "to": "C8"
    },
    {
      "from": "C8",
      "to": "C9"
    },
    {
      "from": "S",
      "to": "S2"
    },
    {
      "from": "S2",
      "to": "S4"
    },
    {
      "from": "S4",
      "to": "S5"
    },
    {
      "from": "S5",
      "to": "S7"
    },
    {
      "from": "S7",
      "to": "S8"
    },
    {
      "from": "S8",
      "to": "S10"
    },
    {
      "from": "C1",
      "to": "S2",
      "label": "SYN",
      "directed": true
    },
    {
      "from": "S2",
      "to": "C3",
      "label": "SYN-ACK",
      "directed": true
    },
    {
      "from": "C3",
      "to": "S4",
      "label": "ACK",
      "directed": true
    },
    {
      "from": "C4",
      "to": "S5",
      "label": "data",
      "directed": true
    },
    {
      "from": "S5",
      "to": "C6",
      "label": "ACK+data",
      "directed": true
    },
    {
      "from": "C6",
      "to": "S7",
      "label": "FIN",
      "directed": true
    },
    {
      "from": "S7",
      "to": "C8",
      "label": "ACK",
      "directed": true
    },
    {
      "from": "S8",
      "to": "C9",
      "label": "FIN",
      "directed": true
    },
    {
      "from": "C9",
      "to": "S10",
      "label": "ACK",
      "directed": true
    }
  ],
  "code": "server: listen(lfd, 8);\nserver: conn = accept(lfd, ...);\nclient: connect(fd, &addr, len);\nclient: send(fd, \"JOIN ana\", 8);\nserver: recv(conn, ...); send(conn, ...);\nclient: close(fd);\nserver: recv() == 0; close(conn);",
  "lang": "text",
  "interval": 2200,
  "frames": [
    {
      "note": "The server has called `listen()` (state **LISTEN**); the client socket is **CLOSED**. Time runs downward; arrows are segments.",
      "nodeColors": [
        {
          "id": "S",
          "color": "blue"
        }
      ],
      "lines": [
        1,
        2
      ],
      "vars": [
        [
          "client",
          "CLOSED"
        ],
        [
          "server",
          "LISTEN"
        ]
      ]
    },
    {
      "note": "`connect()` makes the kernel send a **SYN** carrying the client's initial sequence number. The SYN itself uses up one sequence number.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "orange"
        },
        {
          "id": "S2",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "C1",
          "to": "S2",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "segment",
          "SYN  seq=1000"
        ],
        [
          "client",
          "SYN_SENT"
        ],
        [
          "server",
          "LISTEN → SYN_RCVD"
        ]
      ]
    },
    {
      "note": "The server's kernel answers **SYN-ACK**: its own initial sequence number, plus `ack` = client seq + 1 (\"I got your SYN\"). No application code runs yet.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "orange"
        },
        {
          "id": "C3",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "S2",
          "to": "C3",
          "color": "orange"
        }
      ],
      "lines": [
        2,
        3
      ],
      "vars": [
        [
          "segment",
          "SYN-ACK  seq=5000 ack=1001"
        ],
        [
          "client",
          "SYN_SENT → ESTABLISHED"
        ],
        [
          "server",
          "SYN_RCVD"
        ]
      ]
    },
    {
      "note": "The client sends the final **ACK** and `connect()` returns. When it arrives, the connection waits in the accept queue until `accept()` hands it out.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "orange"
        },
        {
          "id": "S4",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "C3",
          "to": "S4",
          "color": "orange"
        }
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "segment",
          "ACK  seq=1001 ack=5001"
        ],
        [
          "client",
          "ESTABLISHED"
        ],
        [
          "server",
          "SYN_RCVD → ESTABLISHED"
        ]
      ]
    },
    {
      "note": "`send(fd, \"JOIN ana\", 8)`: 8 bytes of payload. Sequence numbers count **bytes**, so the next client seq is 8 higher.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "orange"
        },
        {
          "id": "S5",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "C4",
          "to": "S5",
          "color": "orange"
        }
      ],
      "lines": [
        4
      ],
      "vars": [
        [
          "segment",
          "data  seq=1001 ack=5001 len=8"
        ],
        [
          "client",
          "ESTABLISHED"
        ],
        [
          "server",
          "ESTABLISHED"
        ]
      ]
    },
    {
      "note": "The server echoes 8 bytes. The same segment acknowledges the client's data (`ack` = 1009), so an ACK can ride along with data.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "orange"
        },
        {
          "id": "C6",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "S5",
          "to": "C6",
          "color": "orange"
        }
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "segment",
          "ACK+data  seq=5001 ack=1009 len=8"
        ],
        [
          "client",
          "ESTABLISHED"
        ],
        [
          "server",
          "ESTABLISHED"
        ]
      ]
    },
    {
      "note": "`close()` on the client sends **FIN**: \"I will send no more.\" The server's next `recv()` will return 0.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "orange"
        },
        {
          "id": "S7",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "C6",
          "to": "S7",
          "color": "orange"
        }
      ],
      "lines": [
        6
      ],
      "vars": [
        [
          "segment",
          "FIN  seq=1009 ack=5009"
        ],
        [
          "client",
          "FIN_WAIT_1"
        ],
        [
          "server",
          "CLOSE_WAIT"
        ]
      ]
    },
    {
      "note": "The server's kernel acknowledges the FIN. The connection is now **half-closed**: the server may still send.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "orange"
        },
        {
          "id": "C8",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "S7",
          "to": "C8",
          "color": "orange"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "segment",
          "ACK  seq=5009 ack=1010"
        ],
        [
          "client",
          "FIN_WAIT_2"
        ],
        [
          "server",
          "CLOSE_WAIT"
        ]
      ]
    },
    {
      "note": "The server application sees `recv()` return 0, calls `close()`, and its kernel sends its own **FIN**.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "green"
        },
        {
          "id": "C8",
          "color": "green"
        },
        {
          "id": "S8",
          "color": "orange"
        },
        {
          "id": "C9",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "S8",
          "to": "C9",
          "color": "orange"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "segment",
          "FIN  seq=5009 ack=1010"
        ],
        [
          "client",
          "FIN_WAIT_2 → TIME_WAIT"
        ],
        [
          "server",
          "LAST_ACK"
        ]
      ]
    },
    {
      "note": "The client ACKs the server's FIN. The server is done; the client lingers in **TIME_WAIT** (60 s on Linux) so a stray old segment cannot confuse a new connection on the same ports.",
      "nodeColors": [
        {
          "id": "C1",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "S2",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "C3",
          "color": "green"
        },
        {
          "id": "S4",
          "color": "green"
        },
        {
          "id": "C4",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "S5",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "C6",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "green"
        },
        {
          "id": "S7",
          "color": "green"
        },
        {
          "id": "C8",
          "color": "green"
        },
        {
          "id": "S8",
          "color": "green"
        },
        {
          "id": "C9",
          "color": "green"
        },
        {
          "id": "C9",
          "color": "orange"
        },
        {
          "id": "S10",
          "color": "blue"
        }
      ],
      "edgeColors": [
        {
          "from": "C9",
          "to": "S10",
          "color": "orange"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "segment",
          "ACK  seq=1010 ack=5010"
        ],
        [
          "client",
          "TIME_WAIT"
        ],
        [
          "server",
          "CLOSED"
        ]
      ]
    }
  ],
  "caption": "One TCP connection from handshake to teardown. Initial sequence numbers 1000 and 5000 are made up (real ones are random); the arithmetic is real."
},
        {
          type: 'p',
          text: "Notice what your code never sees. The handshake happens inside `connect` and before `accept`. Acknowledgments, retransmissions and reordering happen in the kernel. On top of reliability TCP adds **flow control** (the receiver advertises how much buffer space it has, so a fast sender cannot flood a slow reader) and **congestion control** (the sender backs off when packets are lost, so the network is not overloaded).",
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why three segments, not two",
          text: "Each side picks a random initial sequence number, and each must know the other has received its number before trusting the stream. SYN carries the client's number; SYN-ACK acknowledges it and carries the server's; the final ACK acknowledges the server's. Random starting numbers also stop an attacker who cannot see the traffic from injecting forged segments, and stop delayed segments from an old connection being mistaken for new data.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: "Nagle's algorithm and TCP_NODELAY",
          text: "By default TCP may hold back a small segment while earlier data is still unacknowledged, hoping to merge it with the next one (Nagle's algorithm). That saves bandwidth for chatty protocols and adds latency for interactive ones. Games and tools that use TCP for small messages set `TCP_NODELAY` with `setsockopt` to send immediately.",
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'order',
      prompt: "Put the segments of a short TCP connection in order, from handshake to teardown, where the client closes first.",
      linesAreCode: false,
      lines: [
        "Client → server: SYN",
        "Server → client: SYN-ACK",
        "Client → server: ACK (connection established)",
        "Client → server: data, acknowledged by the server",
        "Client → server: FIN",
        "Server → client: ACK of the FIN",
        "Server → client: FIN",
        "Client → server: final ACK, then the client waits in TIME_WAIT",
      ],
      explanation: "Opening takes three segments because both sides must confirm the other's initial sequence number. Closing takes four (sometimes three, when the server's ACK and FIN travel together) because each direction is closed separately: after the client's FIN, the server may still send. The side that closes first lingers in TIME_WAIT, 60 seconds on Linux, so stray segments of this connection cannot be confused with a new one on the same ports.",
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: "If the client calls `send` three times with 8 bytes each, the server's `recv` calls will return exactly three chunks of 8 bytes each.",
      answer: false,
      explanation: "TCP is a byte stream with no message boundaries. The kernel may combine the three sends into one segment (Nagle's algorithm encourages this), split them across segments, and the receiver's `recv` returns whatever is in its buffer at that moment: 24 bytes at once, or 5 and then 19. That is why the echo client loops in `recvAll` and why TCP protocols frame messages themselves, typically with a length prefix. UDP is the opposite: each `sendto` is one datagram and each `recv` returns at most one.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: "TCP versus UDP, and head-of-line blocking",
      blocks: [
        {
          type: 'table',
          headers: ["Property", "TCP", "UDP"],
          rows: [
            ["Connection", "Handshake first, then a stream", "None: each datagram stands alone"],
            ["Reliability", "Lost data is retransmitted until it arrives", "Lost datagrams are simply gone"],
            ["Ordering", "Bytes delivered in order", "Datagrams may arrive reordered or duplicated"],
            ["Boundaries", "None (byte stream)", "Preserved (one send = one datagram)"],
            ["Header", "20 bytes minimum", "8 bytes"],
            ["Congestion control", "Built in", "Up to you"],
            ["Typical game use", "Login, matchmaking, chat, patching, downloads", "Real-time gameplay: inputs, positions, snapshots"],
          ],
        },
        {
          type: 'p',
          text: "TCP's guarantees have a cost that hurts games badly: **[[head-of-line-blocking|head-of-line blocking]]**. Because bytes must be delivered in order, when one segment is lost the kernel holds back *every later byte* it has already received until the retransmission arrives. That takes at least one round trip, and if the loss is only detected by a retransmission timeout, at least 200 ms on Linux.",
        },
        {
          type: 'p',
          text: "For a file download that is fine: you need every byte anyway. For a shooter sending world snapshots 60 times a second it is a disaster. The snapshot that was lost is already obsolete, newer ones have arrived and contain everything the client needs, but TCP will not hand them over until the stale one is repaired. The player sees a freeze, then a burst of catch-up movement.",
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: "One lane, one stalled truck",
          text: "TCP is a single-lane road where every car must arrive in the order it left. If one car breaks down, all the cars behind it wait, even though they are fine and their passengers would happily take a different route. UDP is a fleet of motorbikes: some crash and never arrive, but nobody waits for them.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: "A server sends a snapshot every 1/60 s over TCP. One snapshot is lost, and its retransmission reaches the client **180 ms** later than the original would have. Later snapshots are not lost. How many of the later snapshots arrive at the client but are held back by TCP until the retransmission shows up?",
      answer: 10,
      label: "Snapshots",
      unit: "held back",
      hint: "Snapshots arrive every 16.67 ms after the lost one. Count those that arrive before 180 ms.",
      explanation: "Later snapshots arrive at 16.7, 33.3, … ms after the lost one would have. Those with k × 16.67 ms < 180 ms, k = 1 … 10, are already in the client's receive buffer when the retransmission lands, so all ten are released in one burst together with a snapshot that is 180 ms old. With UDP the client would have used each of those ten on time and simply never missed the lost one, because snapshot k + 1 supersedes snapshot k.",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: "Why fast games use UDP with their own reliability",
      blocks: [
        {
          type: 'p',
          text: "Game data is not one stream; it is several kinds of messages with different needs. A UDP-based game protocol sorts them into **channels** and gives each the guarantees it actually needs:",
        },
        {
          type: 'table',
          headers: ["Channel", "Example", "If a packet is lost"],
          rows: [
            ["Unreliable, newest wins", "Positions, world snapshots, aim direction", "Ignore it; the next one supersedes it"],
            ["Reliable, ordered", "\"Player bought weapon\", chat, reliable RPCs", "Resend until acknowledged; deliver in order within this channel only"],
            ["Reliable, unordered", "\"Explosion at (x, y)\" effects", "Resend, but deliver whenever it arrives"],
          ],
        },
        {
          type: 'p',
          text: "The usual building block, described in Glenn Fiedler's widely read articles, is to put a **sequence number** on every outgoing packet and, in every packet going the other way, an **ack**: the newest sequence received plus a 32-bit field saying which of the 32 before it also arrived. Acks then cost a few bytes per packet and survive the loss of any single packet. When the sender sees that packet 5 was not acked, it does *not* resend packet 5; it puts any *reliable* messages that were in it into the next packet.",
        },
        {
          type: 'code',
          title: "ackbits.cpp",
          runnable: true,
          code: `#include <bitset>
#include <cstdint>
#include <cstdio>
#include <initializer_list>

// Receiver side: remember the newest sequence number and, in a
// 32-bit mask, which of the 32 before it also arrived.
struct AckState {
    std::uint16_t ack = 0;     // newest sequence received
    std::uint32_t bits = 0;    // bit i set => (ack - 1 - i) received

    void onReceive(std::uint16_t seq) {
        if (seq > ack) {                       // newer: shift window
            int shift = seq - ack;
            bits = shift >= 32 ? 0 : (bits << shift);
            if (ack != 0 && shift <= 32) bits |= 1u << (shift - 1);
            ack = seq;
        } else if (seq < ack && ack - seq <= 32) {
            bits |= 1u << (ack - seq - 1);     // late, older packet
        }
    }
};

int main() {
    AckState rx;
    for (std::uint16_t seq : {1, 2, 3, 4, 6, 8})   // 5 and 7 lost
        rx.onReceive(seq);

    std::printf("ack = %u, bits = 0b%s (%u)\\n", rx.ack,
                std::bitset<8>(rx.bits).to_string().c_str(), rx.bits);
    // Sender side: anything in the window whose bit is 0 was lost.
    for (int i = 0; i < 7; ++i)
        if (!(rx.bits & (1u << i)))
            std::printf("seq %d not acked: resend its reliable data\\n",
                        rx.ack - 1 - i);
}`,
          output: "ack = 8, bits = 0b01111010 (122)\nseq 7 not acked: resend its reliable data\nseq 5 not acked: resend its reliable data",
          annotations: [
            { lines: 10, text: "Bit 0 stands for `ack − 1`, bit 1 for `ack − 2`, and so on. One 4-byte field acknowledges 33 packets at once." },
            { lines: '13-17', text: "A newer packet slides the window: shift the old bits up and record the previous newest packet as bit `shift − 1`." },
            { lines: '18-19', text: "A late packet (reordered by the network) sets its bit if it still falls inside the window." },
            { lines: 26, text: "Real code compares sequence numbers with wraparound (65535 is followed by 0), using a \"greater than modulo 2^16\" test." },
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal's networking (the `UNetDriver` and `UIpNetDriver`) is exactly this design: everything runs over UDP, property [[replication]] travels in unreliable packets, and when one is lost the engine sends the properties' *current* values again rather than retransmitting the old packet, and reliable [[rpc|RPCs]] are retransmitted by the engine's own ack system until confirmed. Valve's GameNetworkingSockets, ENet and yojimbo are standalone libraries built the same way.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: "Keep datagrams small",
          text: "An Ethernet frame carries at most 1,500 bytes, so after 20 bytes of IPv4 and 8 of UDP header a datagram larger than 1,472 bytes is split into IP fragments, and losing any fragment loses all of it. Game protocols aim for about 1,200 bytes or less to leave room for tunnels and VPNs; QUIC, the UDP-based transport under HTTP/3, uses the same limit and avoids head-of-line blocking between its independent streams.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: "Using the ack scheme above (bit *i* set means packet `ack − 1 − i` arrived), the client has received packets **96, 97, 99 and 100**, and nothing newer. What value does the 32-bit ack field hold? Answer in decimal, hex or binary.",
      answer: 13,
      alsoAccept: ["0b1101", "0xD"],
      inputBase: 2,
      answerText: "13 (0b1101), with ack = 100",
      label: "bits =",
      hint: "ack = 100. Bit 0 is packet 99, bit 1 is 98, bit 2 is 97, bit 3 is 96.",
      explanation: "The newest packet is 100, so ack = 100. Then bit 0 → 99 (received, 1), bit 1 → 98 (lost, 0), bit 2 → 97 (1), bit 3 → 96 (1): binary 1101 = 13. When this reaches the server, it learns in one packet that 98 is missing and that 96, 97, 99 and 100 arrived, so it re-queues only the reliable messages that were in 98.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: "Never block the game loop: non-blocking sockets and readiness",
      blocks: [
        {
          type: 'p',
          text: "`recv` on an empty socket blocks, which is perfect for a server thread with nothing else to do and fatal for a game's main thread, which must render the next frame in 16 ms whether or not a packet arrived. There are three ways out:",
        },
        {
          type: 'list',
          items: [
            "**A network thread** that blocks in `recv` and hands packets to the game through a queue. Simple, and common on clients.",
            "**[[nonblocking-socket|Non-blocking sockets]]**: set `O_NONBLOCK` (or pass `MSG_DONTWAIT` per call), and `recv` returns −1 with `errno` = `EAGAIN`/`EWOULDBLOCK` instead of waiting. A game client drains its UDP socket like this once per frame.",
            "**[[io-multiplexing|Readiness multiplexing]]**: ask the kernel \"which of these sockets have data?\" in one call, then service only those. This is how one server thread handles thousands of connections.",
          ],
        },
        {
          type: 'code',
          title: "udp_frame.cpp",
          runnable: true,
          code: `#include <arpa/inet.h>
#include <cerrno>
#include <cstdio>
#include <netinet/in.h>
#include <poll.h>
#include <sys/socket.h>
#include <unistd.h>

int main() {
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(0);
    auto* sa = reinterpret_cast<sockaddr*>(&addr);
    socklen_t len = sizeof addr;

    int game = socket(AF_INET, SOCK_DGRAM, 0);   // our "client"
    bind(game, sa, len);
    getsockname(game, sa, &len);                 // its port
    int server = socket(AF_INET, SOCK_DGRAM, 0); // the "server"

    // Frame 1: nothing has been sent. A non-blocking recv must
    // not stall the game loop.
    char buf[64];
    ssize_t n = recv(game, buf, sizeof buf, MSG_DONTWAIT);
    if (n == -1 && (errno == EAGAIN || errno == EWOULDBLOCK))
        std::printf("frame 1: no packets, keep rendering\\n");

    // The server sends three snapshots, one datagram each.
    for (int seq = 1; seq <= 3; ++seq) {
        char msg[32];
        int m = std::snprintf(msg, sizeof msg, "snapshot %d", seq);
        sendto(server, msg, static_cast<std::size_t>(m), 0, sa, len);
    }

    // Frame 2: wait until readable, then drain what arrived.
    pollfd p{game, POLLIN, 0};
    for (int got = 0; got < 3;) {
        if (poll(&p, 1, 1000) <= 0) break;       // 1 s timeout
        while ((n = recv(game, buf, sizeof buf - 1, MSG_DONTWAIT)) > 0) {
            buf[n] = '\\0';
            std::printf("frame 2: %zd-byte datagram \\"%s\\"\\n", n, buf);
            ++got;
        }
    }
    close(server);
    close(game);
}`,
          output: "frame 1: no packets, keep rendering\nframe 2: 10-byte datagram \"snapshot 1\"\nframe 2: 10-byte datagram \"snapshot 2\"\nframe 2: 10-byte datagram \"snapshot 3\"",
          annotations: [
            { lines: '17-19', text: "A UDP socket has no listen or accept: bind it to a port and datagrams addressed to that port land in its receive queue." },
            { lines: '25-27', text: "With `MSG_DONTWAIT` the call returns immediately. `EAGAIN` is not a failure; it means \"nothing yet\", so the frame carries on." },
            { lines: 33, text: "`sendto` names the destination per datagram, because UDP has no connection. Each call sends exactly one datagram." },
            { lines: 39, text: "`poll` sleeps until the socket is readable or 1,000 ms pass. A real client would use a timeout of 0 once per frame; we wait here only to make the output deterministic." },
            { lines: '40-44', text: "Drain everything queued: each `recv` returns exactly one whole datagram, so message boundaries are preserved." },
          ],
        },
        {
          type: 'table',
          headers: ["API", "Platform", "How it works", "Scales to"],
          rows: [
            ["`select`", "Everywhere", "Pass bit sets of fds; the kernel scans them all on every call", "Fd numbers below 1,024 (`FD_SETSIZE`); O(n) per call"],
            ["`poll`", "POSIX (Windows: `WSAPoll`)", "Pass an array of fds; no size limit", "Hundreds of fds; still O(n) per call"],
            ["`epoll`", "Linux", "The kernel keeps an interest list and returns only the ready fds", "Tens of thousands; O(ready) per call"],
            ["`kqueue`", "macOS, BSD", "Like epoll, also covers timers and files", "Tens of thousands"],
            ["[[iocp|IOCP]]", "Windows", "Completion-based: start an operation, get notified when it *finished*", "Tens of thousands; used by most Windows servers"],
            ["[[io-uring|io_uring]]", "Linux 5.1+", "Completion-based, shared submission and completion rings", "Very high rates with few system calls"],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: "Why epoll beats select at scale",
          text: "With `select` and `poll` you hand the kernel your whole list on *every* call, and it checks every socket, even if only one has data: 10,000 connections means 10,000 checks per wake-up. `epoll` registers interest once (`epoll_ctl`), the kernel adds a socket to a ready list when a packet arrives, and `epoll_wait` returns just that list. The work becomes proportional to the activity, not the number of connections.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: "A dedicated server for a 100-player battle royale uses one UDP socket for all players. Which receive strategy fits best on the server's main simulation thread?",
      options: [
        { text: "A blocking `recv` at the start of each tick, waiting for the next packet", why: "If no packet arrives, the whole simulation stalls; if many arrive, it reads only one per tick." },
        { text: "Each tick, drain the socket with non-blocking `recv` (or `recvmmsg`) until it reports `EWOULDBLOCK`, then simulate", correct: true, why: "Right. One socket, so there is nothing to multiplex: just empty the queue each tick without ever waiting, then run the simulation on everything that arrived." },
        { text: "One thread per player, each blocking in `recv` on the shared socket", why: "With one UDP socket every thread would receive whichever datagram comes next, from any player, so per-player threads buy nothing but contention and [[context-switch|context switches]]." },
        { text: "`select` over 100 sockets, one per player", why: "UDP needs no per-player sockets; `recvfrom` tells you which address each datagram came from. And select-style scanning is the slow option." },
      ],
      explanation: "UDP servers usually read one socket and identify players by source address (plus a connection ID in the payload). Readiness APIs like epoll matter when you have many sockets, for example a TCP lobby service with thousands of connections. For the tick-based simulation, \"drain without blocking, then simulate\" keeps frame timing under your control. Linux's `recvmmsg` even reads many datagrams in one system call.",
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: "Winsock: the same API with different spelling",
      blocks: [
        {
          type: 'p',
          text: "Windows sockets (**[[winsock|Winsock]]**) were modelled on BSD sockets, so `socket`, `bind`, `listen`, `accept`, `connect`, `send`, `recv` and `sendto` look the same. The differences are in the plumbing around them, and they are exactly what platform layers in engines hide. This code is not runnable on the course's Linux checker:",
        },
        {
          type: 'code',
          title: "Windows: a non-blocking UDP socket (not runnable here)",
          code: `#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")

int main() {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return 1;

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) { WSACleanup(); return 1; }

    u_long nonBlocking = 1;
    ioctlsocket(s, FIONBIO, &nonBlocking);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(7777);            // INADDR_ANY, port 7777
    bind(s, reinterpret_cast<sockaddr*>(&addr), sizeof addr);

    char buf[1200];
    int n = recv(s, buf, sizeof buf, 0);
    if (n == SOCKET_ERROR && WSAGetLastError() == WSAEWOULDBLOCK) {
        // nothing this frame
    }
    closesocket(s);
    WSACleanup();
}`,
          annotations: [
            { lines: 3, text: "Link the Winsock library (MSVC-specific pragma; in CMake, `target_link_libraries(game ws2_32)`)." },
            { lines: 7, text: "Winsock must be initialized before any socket call and cleaned up at the end; POSIX has no equivalent." },
            { lines: '9-10', text: "`SOCKET` is an unsigned handle type, not an `int`, so failure is `INVALID_SOCKET`, not −1." },
            { lines: '12-13', text: "Non-blocking mode is set with `ioctlsocket`, not `fcntl`." },
            { lines: '15-18', text: "Bind before receiving: on Windows, `recv` on an unbound UDP socket fails with `WSAEINVAL` instead of waiting or reporting \"would block\"." },
            { lines: 22, text: "Errors come from `WSAGetLastError()`, not `errno`, and \"would block\" is `WSAEWOULDBLOCK`." },
            { lines: 25, text: "`closesocket`, not `close`: a socket is not a C runtime file descriptor on Windows." },
          ],
        },
        {
          type: 'table',
          headers: ["Task", "POSIX", "Winsock"],
          rows: [
            ["Start up / shut down", "Nothing", "`WSAStartup` / `WSACleanup`"],
            ["Handle type, failure value", "`int`, −1", "`SOCKET`, `INVALID_SOCKET` / `SOCKET_ERROR`"],
            ["Close", "`close`", "`closesocket`"],
            ["Error code", "`errno`", "`WSAGetLastError()`"],
            ["Non-blocking", "`fcntl(fd, F_SETFL, O_NONBLOCK)`", "`ioctlsocket(s, FIONBIO, &on)`"],
            ["Peer vanished during send", "`SIGPIPE` / `EPIPE`", "No signal; `WSAECONNRESET`"],
            ["Scalable I/O", "`epoll` (Linux), `kqueue`", "IOCP, Registered I/O"],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: "In Unreal Engine",
          text: "Unreal's `Sockets` module gives you `ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->CreateSocket(...)` and an `FSocket` with `Send`, `Recv`, `SetNonBlocking` and `Wait`. Behind it sit BSD sockets on Linux and consoles and Winsock on Windows, with the differences above papered over. When you need raw sockets in an engine plugin, go through that layer rather than `#include <winsock2.h>`.",
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: "The matchmaking client speaks a TCP protocol where every message is a 4-byte big-endian length followed by that many bytes. It works on the developer's machine but garbles messages on real networks. Tap the line with the bad assumption.",
      code: `void readMessages(int fd) {
    char buf[1024];
    while (true) {
        ssize_t n = recv(fd, buf, sizeof buf, 0);
        if (n <= 0) break;
        std::uint32_t len;
        std::memcpy(&len, buf, 4);
        handleMessage(buf + 4, ntohl(len));
    }
}`,
      bugLines: [8],
      hint: "What does one `recv` on a TCP socket correspond to?",
      explanation: "The code treats each `recv` result as exactly one complete message. Over loopback, small writes often do arrive one per `recv`, which hides the bug. On a real network one `recv` can return half a message (so `handleMessage` reads past the bytes that arrived, and `len` may even be split across two reads) or two messages glued together (so the second is silently dropped). It also never checks that `n >= 4 + len`. Fix: append received bytes to a buffer, and while the buffer holds at least 4 bytes plus the decoded length, extract one message and remove it from the front.",
    },
  ],
  takeaways: [
    "A socket is a file descriptor for a network endpoint: `AF_INET`/`AF_INET6`/`AF_UNIX` with `SOCK_STREAM` (TCP) or `SOCK_DGRAM` (UDP). The kernel runs the protocol stack behind it.",
    "Servers `socket` → `bind` → `listen` → `accept` (a new fd per connection); clients `socket` → `connect`. `recv` returning 0 means the peer closed.",
    "TCP is a reliable, ordered byte stream with no message boundaries: loop on `recv` and frame your messages. It opens with SYN, SYN-ACK, ACK and closes each direction with its own FIN.",
    "Head-of-line blocking makes TCP stall all later data behind one lost segment, so fast-paced games send state over UDP and add sequence numbers, ack bitfields and reliable channels only where needed.",
    "Never block the game loop: drain non-blocking sockets each frame, use a network thread, or use readiness and completion APIs (`epoll`, `kqueue`, IOCP, `io_uring`) on servers.",
    "Winsock matches the BSD calls but differs in plumbing: `WSAStartup`, `SOCKET`/`INVALID_SOCKET`, `closesocket`, `WSAGetLastError`, `ioctlsocket`.",
  ],
  reading: [
    {
      title: "Beej's Guide to Network Programming",
      url: "https://beej.us/guide/bgnet/",
      source: 'book',
      note: "The classic free guide to the sockets API, with a chapter on the Windows differences.",
    },
    {
      title: "socket(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/socket.7.html",
      source: 'other',
      note: "Socket options such as SO_REUSEADDR and SO_RCVBUF, and how non-blocking sockets behave.",
    },
    {
      title: "epoll(7) — Linux manual page",
      url: "https://man7.org/linux/man-pages/man7/epoll.7.html",
      source: 'other',
      note: "Edge- versus level-triggered readiness, and the pitfalls the man page warns about.",
    },
    {
      title: "UDP vs. TCP (Gaffer On Games)",
      url: "https://gafferongames.com/post/udp_vs_tcp/",
      source: 'article',
      note: "Glenn Fiedler's explanation of why real-time games avoid TCP; the series continues with reliability and acks over UDP.",
    },
    {
      title: "Getting Started with Winsock (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/windows/win32/winsock/getting-started-with-winsock",
      source: 'other',
      note: "Microsoft's walkthrough of a Winsock client and server, including WSAStartup and error handling.",
    },
  ],
};
