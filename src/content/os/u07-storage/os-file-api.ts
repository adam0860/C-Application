import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-file-api',
  title: 'Files and Directories',
  summary:
    'The file and directory abstractions, file offsets and the open file table, hard and symbolic links, permissions, std::filesystem and Win32, and how to save a game so a crash can never corrupt it.',
  minutes: 22,
  objectives: [
    'Explain files and directories as abstractions: byte arrays with a low-level name (the inode number) and tables that map names to those numbers',
    'Use `lseek`, `pread` and `O_APPEND` correctly, and predict file contents when offsets are shared through `fork` or separate through two `open` calls',
    'Create hard and symbolic links, read a file\'s metadata with `stat`, and explain when a file\'s storage is actually freed',
    'Use `std::filesystem` for portable directory work and name the Win32 equivalents and their differences',
    'Save game data crash-safely: write a temporary file, `fsync` it, `rename` it over the old one, and `fsync` the directory',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Two abstractions: files and directories',
      blocks: [
        {
          type: 'p',
          text: "A disk is a huge array of numbered blocks. Nobody wants to write a game against that. The file system offers two abstractions instead, and almost every storage API you will ever use is built on them.",
        },
        {
          type: 'definition',
          term: 'File',
          text: 'A linear array of bytes that you can read and write at any offset, plus metadata (size, owner, permissions, timestamps). Internally it has a low-level name, its **inode number** on Unix-like systems or its **file ID** on NTFS. The OS does not care what the bytes mean: a `.pak`, a `.png` and a save file are all just bytes.',
        },
        {
          type: 'definition',
          term: 'Directory',
          text: 'A special file whose contents are a list of entries, each mapping a human-readable **name** to a low-level name (an inode number). Because a directory can contain other directories, names form a tree, and a path like `/home/adam/saves/slot1.sav` walks it from the root.',
        },
        {
          type: 'p',
          text: "That split matters more than it seems. The *name* lives in a directory; the *file* (its bytes and metadata) lives in an [[inode]]. One file can therefore have several names, renaming a file never touches its data, and deleting a name is not the same as deleting the file. You will see all three in this lesson.",
        },
        {
          type: 'p',
          text: "Paths starting with `/` are **absolute** and start at the root; others are **relative** to the process's [[working-directory]]. Windows adds drive letters (`C:\\`), accepts both `\\` and `/` as separators, and by default compares names case-insensitively on NTFS, so `Slot1.sav` and `slot1.sav` are the same file there but two different files on Linux. Cross-platform engines normalise paths for exactly this reason.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'What you already know',
          text: "The *System Calls from C++* lesson introduced [[file-descriptor|file descriptors]], `open`/`read`/`write`/`close`, [[errno]] and an RAII wrapper for descriptors. This lesson builds on them: what the kernel keeps behind a descriptor, what names really are, and how to use the API so that data survives crashes.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'The file offset: where the next read happens',
      blocks: [
        {
          type: 'p',
          text: "Every open file has a **current offset**. `read` and `write` start there and advance it by the number of bytes they moved, which is why reading a file in a loop works without you passing positions. `lseek` moves the offset explicitly: relative to the start (`SEEK_SET`), the current position (`SEEK_CUR`) or the end (`SEEK_END`). It does no I/O at all; it only changes a number in the kernel.",
        },
        {
          type: 'code',
          runnable: true,
          title: 'offsets.cpp',
          code: "#include <cstdio>\n#include <cstring>\n#include <fcntl.h>      // open, O_* flags\n#include <string>\n#include <unistd.h>     // read, write, lseek, close, unlink\n\nint main() {\n    const std::string path =      // unique per process\n        \"/tmp/forge_io_\" + std::to_string(getpid()) + \".sav\";\n    int fd = open(path.c_str(), O_RDWR | O_CREAT | O_TRUNC, 0644);\n    if (fd == -1) { std::perror(\"open\"); return 1; }\n    std::printf(\"open returned fd %d\\n\", fd);\n\n    const char rec[] = \"HP=100;XP=2500;LVL=7\";\n    ssize_t n = write(fd, rec, std::strlen(rec));\n    std::printf(\"write: %zd bytes, offset now %lld\\n\", n,\n                (long long)lseek(fd, 0, SEEK_CUR));\n\n    lseek(fd, 7, SEEK_SET);          // jump to \"XP=2500\"\n    char buf[8] = {};\n    n = read(fd, buf, 7);\n    std::printf(\"read at 7: %zd bytes \\\"%s\\\"\\n\", n, buf);\n\n    n = read(fd, buf, sizeof buf);   // offset 14 -> 6 left\n    std::printf(\"next read: %zd bytes\\n\", n);\n    n = read(fd, buf, sizeof buf);   // at end of file\n    std::printf(\"read at EOF: %zd bytes\\n\", n);\n\n    close(fd);\n    unlink(path.c_str());\n}",
          output: "open returned fd 3\nwrite: 20 bytes, offset now 20\nread at 7: 7 bytes \"XP=2500\"\nnext read: 6 bytes\nread at EOF: 0 bytes",
          annotations: [
            { lines: '8-9', text: 'The process ID in the name keeps two copies of this program running at once from sharing one scratch file.' },
            { lines: 10, text: '`O_RDWR` opens for both reading and writing; `O_CREAT` creates the file if needed with mode `0644`; `O_TRUNC` empties it if it already existed.' },
            { lines: 12, text: 'Descriptors 0, 1 and 2 are already taken by stdin, stdout and stderr, and `open` returns the lowest free number, so the first file you open is almost always 3.' },
            { lines: '16-17', text: '`lseek(fd, 0, SEEK_CUR)` is the idiom for "where am I?". The write advanced the offset from 0 to 20.' },
            { lines: 19, text: 'Jump to byte 7. Nothing is read or written yet.' },
            { lines: 24, text: 'Ask for 8 bytes with only 6 left: a **short read** returns 6. Short reads are normal, not errors, which is why reading code must loop.' },
            { lines: 26, text: 'At the end of the file, `read` returns **0**. That, not `-1`, is how you detect end of file.' },
          ],
        },
        {
          type: 'list',
          items: [
            "`pread(fd, buf, n, offset)` and `pwrite` read or write at an explicit offset **without** moving the current one. Several threads can share one descriptor and read different parts of a `.pak` file without racing on the offset. Windows' `ReadFile` takes the offset in an `OVERLAPPED` structure for the same reason.",
            "`O_APPEND` makes every `write` first move the offset to the current end of file, atomically, as part of the same call. Two processes appending to one log file never overwrite each other's lines.",
            "Seeking past the end and writing creates a **hole**: the gap reads as zeros but takes no disk space on most file systems (a *sparse* file).",
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'A program opens an existing **100-byte** file with `O_RDWR` (no `O_APPEND`), then calls, in order: `read(fd, buf, 30)`, `lseek(fd, 10, SEEK_CUR)`, `write(fd, data, 5)`. All calls succeed in full. What is the file offset now?',
      hint: 'The offset starts at 0 after `open`. Each call moves it.',
      answer: 45,
      unit: 'bytes',
      explanation: '`open` sets the offset to 0. The read moves it to 30, `SEEK_CUR` + 10 makes it 40, and writing 5 bytes overwrites bytes 40 to 44 and leaves the offset at **45**. The file is still 100 bytes long: writing inside a file overwrites; only writing past the end grows it. Had the file been opened with `O_APPEND`, the write would have gone to byte 100 instead, leaving the offset at 105.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Behind a descriptor: the open file table',
      blocks: [
        {
          type: 'p',
          text: "Where does the kernel keep that offset? Not in the descriptor, and not in the inode. There are three levels of tables:",
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 310\" xmlns=\"http://www.w3.org/2000/svg\"><text x=\"54\" y=\"30\" font-size=\"11.5\" text-anchor=\"middle\" font-weight=\"700\">parent: fd table</text><rect x=\"14\" y=\"38\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"38\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"54\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">0</text><text x=\"62\" y=\"54\" font-size=\"11\" text-anchor=\"middle\">stdin</text><rect x=\"14\" y=\"62\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"62\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"78\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">1</text><text x=\"62\" y=\"78\" font-size=\"11\" text-anchor=\"middle\">stdout</text><rect x=\"14\" y=\"86\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"86\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"102\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">2</text><text x=\"62\" y=\"102\" font-size=\"11\" text-anchor=\"middle\">stderr</text><rect x=\"14\" y=\"110\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"14\" y=\"110\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.2\"/><text x=\"28\" y=\"126\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">3</text><text x=\"62\" y=\"126\" font-size=\"11\" text-anchor=\"middle\">fd 3</text><rect x=\"14\" y=\"134\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-orange\" fill-opacity=\"0.12\"/><rect x=\"14\" y=\"134\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.2\"/><text x=\"28\" y=\"150\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">4</text><text x=\"62\" y=\"150\" font-size=\"11\" text-anchor=\"middle\">fd 4</text><text x=\"54\" y=\"198\" font-size=\"11.5\" text-anchor=\"middle\" font-weight=\"700\">child: fd table</text><rect x=\"14\" y=\"206\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"206\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"222\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">0</text><text x=\"62\" y=\"222\" font-size=\"11\" text-anchor=\"middle\">stdin</text><rect x=\"14\" y=\"230\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"230\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"246\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">1</text><text x=\"62\" y=\"246\" font-size=\"11\" text-anchor=\"middle\">stdout</text><rect x=\"14\" y=\"254\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-gray\" fill-opacity=\"0.05\"/><rect x=\"14\" y=\"254\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-gray\" stroke-width=\"1.2\"/><text x=\"28\" y=\"270\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">2</text><text x=\"62\" y=\"270\" font-size=\"11\" text-anchor=\"middle\">stderr</text><rect x=\"14\" y=\"278\" width=\"80\" height=\"24\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"14\" y=\"278\" width=\"80\" height=\"24\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.2\"/><text x=\"28\" y=\"294\" font-size=\"11\" text-anchor=\"middle\" class=\"t-gray\">3</text><text x=\"62\" y=\"294\" font-size=\"11\" text-anchor=\"middle\">fd 3</text><text x=\"260\" y=\"22\" font-size=\"11.5\" text-anchor=\"middle\" font-weight=\"700\">system-wide open file table</text><rect x=\"196\" y=\"60\" width=\"128\" height=\"62\" rx=\"3\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"196\" y=\"60\" width=\"128\" height=\"62\" rx=\"3\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.5\"/><text x=\"206\" y=\"77\" font-size=\"11\" text-anchor=\"start\">offset = 13</text><text x=\"206\" y=\"93\" font-size=\"11\" text-anchor=\"start\">flags = O_WRONLY</text><text x=\"206\" y=\"109\" font-size=\"11\" text-anchor=\"start\">refcount = 2</text><rect x=\"196\" y=\"170\" width=\"128\" height=\"62\" rx=\"3\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"196\" y=\"170\" width=\"128\" height=\"62\" rx=\"3\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.5\"/><text x=\"206\" y=\"187\" font-size=\"11\" text-anchor=\"start\">offset = 0</text><text x=\"206\" y=\"203\" font-size=\"11\" text-anchor=\"start\">flags = O_RDONLY</text><text x=\"206\" y=\"219\" font-size=\"11\" text-anchor=\"start\">refcount = 1</text><text x=\"440\" y=\"22\" font-size=\"11.5\" text-anchor=\"middle\" font-weight=\"700\">inode (v-node) table</text><rect x=\"380\" y=\"100\" width=\"124\" height=\"86\" rx=\"3\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"380\" y=\"100\" width=\"124\" height=\"86\" rx=\"3\" fill=\"none\" class=\"s-green\" stroke-width=\"1.5\"/><text x=\"390\" y=\"120\" font-size=\"11\" text-anchor=\"start\" font-weight=\"700\">inode 1337</text><text x=\"390\" y=\"136\" font-size=\"11\" text-anchor=\"start\">slot1.sav</text><text x=\"390\" y=\"152\" font-size=\"11\" text-anchor=\"start\">size, mode, links</text><text x=\"390\" y=\"168\" font-size=\"11\" text-anchor=\"start\">block pointers</text><line x1=\"94\" y1=\"122\" x2=\"150\" y2=\"122\" class=\"s-blue\" stroke-width=\"1.6\"/><line x1=\"150\" y1=\"122\" x2=\"150\" y2=\"82\" class=\"s-blue\" stroke-width=\"1.6\"/><line x1=\"150\" y1=\"82\" x2=\"186\" y2=\"82\" class=\"s-blue\" stroke-width=\"1.6\"/><path d=\"M194 82 L186 86 L186 78 Z\" class=\"f-blue\"/><line x1=\"94\" y1=\"290\" x2=\"160\" y2=\"290\" class=\"s-blue\" stroke-width=\"1.6\"/><line x1=\"160\" y1=\"290\" x2=\"160\" y2=\"104\" class=\"s-blue\" stroke-width=\"1.6\"/><line x1=\"160\" y1=\"104\" x2=\"186\" y2=\"104\" class=\"s-blue\" stroke-width=\"1.6\"/><path d=\"M194 104 L186 108 L186 100 Z\" class=\"f-blue\"/><line x1=\"94\" y1=\"146\" x2=\"140\" y2=\"146\" class=\"s-orange\" stroke-width=\"1.6\"/><line x1=\"140\" y1=\"146\" x2=\"140\" y2=\"200\" class=\"s-orange\" stroke-width=\"1.6\"/><line x1=\"140\" y1=\"200\" x2=\"186\" y2=\"200\" class=\"s-orange\" stroke-width=\"1.6\"/><path d=\"M194 200 L186 204 L186 196 Z\" class=\"f-orange\"/><line x1=\"324\" y1=\"96\" x2=\"371.2\" y2=\"125.7\" class=\"s-green\" stroke-width=\"1.6\"/><path d=\"M378 130 L369.1 129.1 L373.4 122.4 Z\" class=\"f-green\"/><line x1=\"324\" y1=\"200\" x2=\"371.6\" y2=\"164.8\" class=\"s-green\" stroke-width=\"1.6\"/><path d=\"M378 160 L374 168 L369.2 161.5 Z\" class=\"f-green\"/><text x=\"260\" y=\"262\" font-size=\"11\" text-anchor=\"middle\" class=\"t-blue\">fork() copies the fd table,</text><text x=\"260\" y=\"277\" font-size=\"11\" text-anchor=\"middle\" class=\"t-blue\">so both fd 3s share one entry</text><text x=\"260\" y=\"292\" font-size=\"11\" text-anchor=\"middle\" class=\"t-blue\">(and one offset)</text><text x=\"440\" y=\"214\" font-size=\"11\" text-anchor=\"middle\" class=\"t-orange\">a 2nd open() of the</text><text x=\"440\" y=\"229\" font-size=\"11\" text-anchor=\"middle\" class=\"t-orange\">same file: new entry,</text><text x=\"440\" y=\"244\" font-size=\"11\" text-anchor=\"middle\" class=\"t-orange\">own offset, same inode</text></svg>",
          alt: 'Three columns. Left: a parent and a child process, each with a per-process descriptor table. The parent\'s fd 3 and the child\'s fd 3 both point to one entry in the system-wide open file table holding offset 13, flags O_WRONLY and refcount 2. The parent\'s fd 4 points to a second entry with offset 0, O_RDONLY and refcount 1. Both entries point to the same inode, 1337, for slot1.sav.',
          caption: 'Descriptor tables are per process; the [[open-file-table]] is shared by the whole system; each entry points to one in-memory inode.',
        },
        {
          type: 'list',
          items: [
            '**Per-process descriptor table**: small integers → pointers to open-file entries. `close` removes one row.',
            '**System-wide open file table**: one entry per `open` call, holding the **offset**, the access mode and flags such as `O_APPEND`, and a reference count. (Linux calls this `struct file`; POSIX calls it an *open file description*.)',
            "**Inode table**: one in-memory copy of each open file's inode, however many times it is open.",
          ],
        },
        {
          type: 'p',
          text: "[[fork-syscall|fork]] copies the parent's descriptor table, so parent and child point to the **same** open-file entries and share one offset. `dup` and `dup2` do the same within a process; that is how a shell's `2>&1` sends errors to wherever output goes. A second `open` of the same file creates a **new** entry with its own offset. This program shows both cases:",
        },
        {
          type: 'code',
          runnable: true,
          title: 'shared_offset.cpp',
          code: "#include <cstdio>\n#include <cstring>\n#include <fcntl.h>\n#include <string>\n#include <sys/wait.h>\n#include <unistd.h>\n\nconst std::string kPath =           // unique per process\n    \"/tmp/forge_offsets_\" + std::to_string(getpid()) + \".log\";\n\nvoid put(int fd, const char* s) {    // write, checking the result\n    if (write(fd, s, std::strlen(s)) == -1) std::perror(\"write\");\n}\n\nvoid show(const char* title) {       // print the file's bytes\n    char buf[64] = {};\n    int fd = open(kPath.c_str(), O_RDONLY);\n    ssize_t n = read(fd, buf, sizeof buf - 1);\n    close(fd);\n    std::printf(\"%s: \\\"%.*s\\\"\\n\", title, (int)n, buf);\n}\n\nint main() {\n    // A: fork after open -> both share ONE open file entry.\n    int fd = open(kPath.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0644);\n    if (fork() == 0) {               // child\n        put(fd, \"child;\");\n        _exit(0);\n    }\n    wait(nullptr);                   // parent waits, then writes\n    put(fd, \"parent;\");\n    close(fd);\n    show(\"after fork\");\n\n    // B: two separate open() calls -> two entries, two offsets.\n    int a = open(kPath.c_str(), O_WRONLY | O_TRUNC);\n    int b = open(kPath.c_str(), O_WRONLY);\n    put(a, \"AAAAAA\");\n    put(b, \"bb\");                    // b's offset is still 0\n    close(a);\n    close(b);\n    show(\"two opens\");\n    unlink(kPath.c_str());\n}",
          output: "after fork: \"child;parent;\"\ntwo opens: \"bbAAAA\"",
          annotations: [
            { lines: '8-9', text: 'The process ID in the name lets several copies of this demo run at once without sharing a file.' },
            { lines: 11, text: 'A tiny helper that checks `write`\'s result. Ignoring it hides full disks and short writes (and g++ warns about it).' },
            { lines: '25-29', text: 'The child inherits descriptor 3, pointing at the same open-file entry. It writes 6 bytes, advancing the **shared** offset to 6, and exits.' },
            { lines: '30-31', text: 'The parent waits (so the order is fixed), then writes at offset 6, not 0. Nothing was overwritten.' },
            { lines: '36-37', text: 'Two separate `open` calls: two open-file entries, each with its own offset starting at 0.' },
            { lines: '38-39', text: '`a` writes six A\'s at offsets 0 to 5; `b`, still at offset 0, overwrites the first two. Same file, independent offsets.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why share offsets across fork?',
          text: "Think of a shell script whose output goes to a log: `(step1; step2) > build.log`. Each step is a child process writing to the same inherited descriptor. If each child had its own offset, step2 would start at byte 0 and overwrite step1's output. Sharing the open-file entry makes sequential writers cooperate automatically. Windows has the same structure: a handle points to a kernel *file object* that holds the current byte offset, and duplicated or inherited handles share it.",
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'mcq',
      prompt: 'A game launcher opens `launch.log` (with `O_TRUNC`), then calls `fork`. The child writes `"child\\n"` and exits; the parent waits for it and then writes `"parent\\n"`. What does the log contain?',
      options: [
        { text: '`parent\\n` only: the parent\'s write starts at offset 0 and overwrites the child\'s', why: 'That would happen with two separate `open` calls. After `fork`, both descriptors share one open-file entry and its offset.' },
        { text: '`child\\nparent\\n`', correct: true, why: 'The child advanced the shared offset to 6, so the parent\'s write lands after it.' },
        { text: '`parent\\nchild\\n`', why: 'The parent waited for the child, so the child\'s write happened first.' },
        { text: 'Nothing: the child\'s copy of the descriptor is closed when it exits, and that discards the file', why: 'Exiting closes the child\'s descriptor and drops the reference count from 2 to 1. The file and the parent\'s descriptor are unaffected.' },
      ],
      explanation: '`fork` duplicates the descriptor *table*, not the open-file entries behind it, so both processes share one offset. Writes from the two processes therefore append to each other instead of overwriting. If the two processes wrote concurrently without the `wait`, the lines could come out in either order, but neither would overwrite the other.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Names, inodes and links',
      blocks: [
        {
          type: 'p',
          text: "`stat` returns a file's metadata from its inode: type, permissions, owner, size, timestamps, inode number and the **link count**, the number of directory entries that name this inode. That count is the key to two kinds of links:",
        },
        {
          type: 'list',
          items: [
            'A [[hard-link]] (`link`, or `ln a b`) adds another directory entry for the **same inode**. Both names are equally real; neither is the "original". The link count goes up by one.',
            'A [[symbolic-link]] (`symlink`, or `ln -s a b`) is a tiny separate file whose contents are a **path**. Opening it makes the kernel follow that path. If the target is renamed or deleted, the symlink dangles.',
          ],
        },
        {
          type: 'code',
          runnable: true,
          title: 'links.cpp',
          code: "#include <cerrno>\n#include <cstdio>\n#include <cstdlib>\n#include <cstring>\n#include <fcntl.h>\n#include <sys/stat.h>\n#include <unistd.h>\n\nvoid info(const char* path) {\n    struct stat st;\n    if (stat(path, &st) == -1) {     // stat follows symlinks\n        std::printf(\"%-11s stat failed: %s\\n\", path,\n                    std::strerror(errno));\n        return;\n    }\n    std::printf(\"%-11s links=%lu size=%lld mode=%o\\n\", path,\n                (unsigned long)st.st_nlink, (long long)st.st_size,\n                (unsigned)(st.st_mode & 0777));\n}\n\nint main() {\n    char dir[] = \"/tmp/forge_links_XXXXXX\";   // private folder\n    if (!mkdtemp(dir) || chdir(dir) == -1) return 1;\n    const char* a = \"slot1.sav\";\n    const char* h = \"backup.sav\";\n    const char* s = \"latest.sav\";\n\n    umask(022);                       // so the mode is predictable\n    int fd = open(a, O_WRONLY | O_CREAT, 0666);\n    if (write(fd, \"LVL=7\", 5) != 5) std::perror(\"write\");\n    close(fd);\n\n    if (link(a, h) == -1) std::perror(\"link\");     // 2nd name\n    if (symlink(a, s) == -1) std::perror(\"symlink\");\n    info(a); info(h); info(s);\n\n    struct stat sa, sh;\n    stat(a, &sa); stat(h, &sh);\n    std::printf(\"same inode: %s\\n\",\n                sa.st_ino == sh.st_ino ? \"yes\" : \"no\");\n\n    unlink(a);                        // remove the original name\n    std::printf(\"-- after unlink(%s)\\n\", a);\n    info(h); info(s);\n\n    char target[64] = {};\n    ssize_t n = readlink(s, target, sizeof target - 1);\n    std::printf(\"%s -> %.*s\\n\", s, (int)n, target);\n    unlink(h); unlink(s);\n    if (chdir(\"/\") == 0) rmdir(dir);  // remove the folder\n}",
          output: "slot1.sav   links=2 size=5 mode=644\nbackup.sav  links=2 size=5 mode=644\nlatest.sav  links=2 size=5 mode=644\nsame inode: yes\n-- after unlink(slot1.sav)\nbackup.sav  links=1 size=5 mode=644\nlatest.sav  stat failed: No such file or directory\nlatest.sav -> slot1.sav",
          annotations: [
            { lines: 11, text: '`stat` follows symlinks and reports on the target. `lstat` would report on the link itself.' },
            { lines: '22-23', text: '`mkdtemp` creates a fresh, uniquely named folder, and the program moves into it, so the short relative names below cannot collide with another run.' },
            { lines: 28, text: 'The *umask* clears permission bits from every newly created file. With `022`, the requested `0666` becomes `0644`. Setting it here makes the output the same on every machine.' },
            { lines: 35, text: 'All three names report 2 links: `slot1` and `backup` are two names for one inode, and the symlink shows its target\'s details.' },
            { lines: '37-40', text: 'The proof: both names have the same inode number.' },
            { lines: 42, text: '`unlink` removes a *name*. The inode survives because another name still refers to it (link count 1).' },
            { lines: '44-48', text: 'The hard link still works. The symlink now points at a path that no longer exists: `stat` fails with `ENOENT`, yet `readlink` shows the stored path is unchanged.' },
          ],
        },
        {
          type: 'p',
          text: "There is no system call that deletes a *file*. `unlink` (what `rm` calls) removes a name and decrements the link count. The kernel frees the inode and its blocks only when the link count is 0 **and** no process still has the file open. That second condition allows a classic Unix trick: create a scratch file, open it, unlink it at once, and keep using it. Nobody else can find it, and it disappears automatically when your process exits, even if it crashes.",
        },
        {
          type: 'table',
          headers: ['Property', 'Hard link', 'Symbolic link'],
          rows: [
            ['Points to', 'An inode', 'A path (text)'],
            ['Across file systems or drives', 'No: inode numbers are only unique within one file system', 'Yes'],
            ['To a directory', 'No (it could create cycles in the tree)', 'Yes'],
            ['If the target name is deleted', 'Still works', 'Dangles'],
            ['Windows (NTFS)', '`CreateHardLinkW`', '`CreateSymbolicLinkW` (needs a privilege or Developer Mode); also *junctions* for directories'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'On Linux, calling `unlink("level3.pak")` while the game still has that file open immediately frees the file\'s disk blocks, so the game\'s next `read` fails.',
      answer: false,
      explanation: "`unlink` only removes the directory entry. The inode and its data stay allocated while any open-file entry refers to it; the game keeps reading normally, and the blocks are freed when the last descriptor is closed. This is also how Linux package managers replace a running program's files safely. Windows traditionally behaves differently: by default you cannot delete a file that another handle has open unless that handle was opened with `FILE_SHARE_DELETE`.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Permissions, briefly',
      blocks: [
        {
          type: 'p',
          text: "Every inode stores an owner, a group and nine permission bits: read, write and execute (`rwx`) for the **user** who owns it, its **group**, and **others**. They are usually written in octal, one digit per class: `0644` is `rw-r--r--` (owner reads and writes, everyone else only reads), `0755` is `rwxr-xr-x`. On a directory, `r` lets you list names, `w` lets you create and delete entries, and `x` lets you *pass through* it while resolving a path.",
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Reading the bits in ls -l',
          code: `-rw-r--r--  1 adam  adam  12 slot1.sav     # 0644
drwxr-xr-x  2 adam  adam  80 saves         # 0755, a directory
lrwxrwxrwx  1 adam  adam  20 latest.sav -> slot1.sav`,
          annotations: [
            { lines: 1, text: 'The first character is the type (`-` regular file, `d` directory, `l` symlink), then three `rwx` triples. The number after them is the link count.' },
            { lines: 3, text: 'Symlink permissions are always shown as `rwxrwxrwx` and ignored; the target\'s permissions decide.' },
          ],
        },
        {
          type: 'p',
          text: "The kernel checks permissions **once, at `open`**, and records the granted access mode in the open-file entry. Later `read` and `write` calls only check that mode. Windows uses access control lists (ACLs) on NTFS instead of nine bits, and checks them when the handle is created in the same way. The *Protection and Security* unit covers users, privilege and ACLs properly.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Check-then-act is a race',
          text: "Because the file system is shared, anything you learn about a path can be stale by the time you act on it. Code that checks `exists(path)` and then creates the file, or checks `access(path, R_OK)` and then opens it, has a **TOCTOU** bug (time of check to time of use): another process can create, delete or swap the file, or plant a symlink, in between. The cure is to let one system call do both, atomically: `open` with `O_CREAT | O_EXCL` fails if the file exists; `open` itself does the permission check.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'bug',
      prompt: 'This function is meant to ensure only one copy of a dedicated game server runs per machine. Two servers started at the same moment both sometimes acquire the lock. Tap the line where the race begins.',
      code: `#include <filesystem>
#include <fcntl.h>
#include <unistd.h>

bool acquireServerLock() {
    const char* path = "/tmp/mygame-server.lock";
    if (std::filesystem::exists(path))
        return false;               // another server has it
    int fd = open(path, O_WRONLY | O_CREAT, 0644);
    if (fd == -1)
        return false;
    // keep fd open for the server's lifetime
    return true;
}`,
      bugLines: [7],
      explanation: "This is a TOCTOU race. Both servers can run line 7, both see that the file does not exist, and both reach line 9, where `O_CREAT` without `O_EXCL` happily opens the file the other one just created. The check and the creation must be **one** atomic operation: delete lines 7 and 8 and open with `O_WRONLY | O_CREAT | O_EXCL`, which fails with `EEXIST` if the file is already there. (A robust version also handles a lock file left behind by a crashed server, for example with `flock` on the descriptor, which the kernel releases automatically when the process dies.)",
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'std::filesystem: the portable layer',
      blocks: [
        {
          type: 'p',
          text: "C++17's `<filesystem>` wraps directory work in a portable API: paths, iteration, creating and removing directories, copying, renaming, sizes and permissions. Under the hood it makes the same system calls (`openat`, `getdents64`, `rename`, `unlink` on Linux; `CreateFileW`, `FindFirstFileW`, `MoveFileExW` on Windows).",
        },
        {
          type: 'code',
          runnable: true,
          title: 'fs_demo.cpp',
          code: "#include <algorithm>\n#include <filesystem>\n#include <fstream>\n#include <iostream>\n#include <random>\n#include <string>\n#include <system_error>\n#include <vector>\n\nnamespace fs = std::filesystem;\n\nint main() {\n    const fs::path root = fs::temp_directory_path() /   // unique\n        (\"forge_fs_\" + std::to_string(std::random_device{}()));\n    fs::remove_all(root);                     // clean old runs\n    fs::create_directories(root / \"saves\" / \"auto\");\n\n    std::ofstream(root / \"saves\" / \"slot1.sav\") << \"LVL=7;HP=100\";\n    std::ofstream(root / \"saves\" / \"slot2.sav\") << \"LVL=9;HP=40\";\n    std::ofstream(root / \"saves\" / \"auto\" / \"a1.sav\") << \"LVL=6\";\n\n    // Directory order is unspecified: collect, then sort.\n    std::vector<fs::path> found;\n    for (const auto& e : fs::recursive_directory_iterator(root))\n        if (e.is_regular_file())\n            found.push_back(fs::relative(e.path(), root));\n    std::sort(found.begin(), found.end());\n    for (const auto& p : found)\n        std::cout << p.generic_string() << \"  \"\n                  << fs::file_size(root / p) << \" bytes\\n\";\n\n    fs::rename(root / \"saves\" / \"slot2.sav\",   // replaces slot1\n               root / \"saves\" / \"slot1.sav\");\n    std::string text;\n    std::ifstream(root / \"saves\" / \"slot1.sav\") >> text;\n    std::cout << \"slot1 now: \" << text << '\\n';\n\n    std::error_code ec;                        // no-throw overload\n    auto size = fs::file_size(root / \"missing.sav\", ec);\n    if (ec) std::cout << \"missing: \" << ec.message() << '\\n';\n    else std::cout << size << '\\n';\n\n    std::cout << \"removed \" << fs::remove_all(root)\n              << \" entries\\n\";\n}",
          output: "saves/auto/a1.sav  5 bytes\nsaves/slot1.sav  12 bytes\nsaves/slot2.sav  11 bytes\nslot1 now: LVL=9;HP=40\nmissing: No such file or directory\nremoved 5 entries",
          annotations: [
            { lines: '13-14', text: '`operator/` joins path components with the right separator for the platform. `temp_directory_path` reads `TMPDIR` on Linux and `GetTempPathW` on Windows. The random suffix keeps two runs of the program from sharing (and deleting) one folder.' },
            { lines: 16, text: 'Like `mkdir -p`: creates every missing directory on the way.' },
            { lines: '22-27', text: 'Directory iteration returns entries in whatever order the file system stores them: hash order on ext4, B-tree order on NTFS. Never rely on it. Sort if order matters.' },
            { lines: '32-33', text: '`rename` follows POSIX semantics: if the target exists, it is replaced in one step. This is the basis of crash-safe saving, later in this lesson.' },
            { lines: '38-41', text: 'Every operation has two overloads. The default one throws `filesystem_error`; the one taking a `std::error_code&` never throws, which suits code paths where failure is expected, such as probing for an optional file.' },
            { lines: '43-44', text: '`remove_all` returns how many entries it deleted: two directories plus the root plus two files.' },
          ],
        },
        {
          type: 'table',
          headers: ['Task', '`std::filesystem`', 'POSIX', 'Win32'],
          rows: [
            ['Metadata', '`status`, `file_size`, `last_write_time`', '`stat`, `fstat`', '`GetFileInformationByHandle`'],
            ['List a directory', '`directory_iterator`', '`opendir`/`readdir`', '`FindFirstFileW`/`FindNextFileW`'],
            ['Rename or replace', '`rename`', '`rename`', '`MoveFileExW(…, MOVEFILE_REPLACE_EXISTING)`'],
            ['Delete', '`remove`, `remove_all`', '`unlink`, `rmdir`', '`DeleteFileW`, `RemoveDirectoryW`'],
            ['Links', '`create_hard_link`, `create_symlink`', '`link`, `symlink`', '`CreateHardLinkW`, `CreateSymbolicLinkW`'],
            ['Flush to disk', '(none)', '`fsync`', '`FlushFileBuffers`'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'What std::filesystem cannot do',
          text: "There is no portable way to `fsync` a file or a directory, and `std::ofstream` does not expose its descriptor or handle. For anything that must survive power loss (saves, settings, a downloaded patch) you need a few lines of platform code. Engines wrap them once: Unreal's `IPlatformFile` and `FPlatformFileManager` are exactly such a layer.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete this function that lists the save files in a folder, without throwing if the folder does not exist.',
      template: `std::vector<std::string> listSaves(const fs::path& dir) {
    std::vector<std::string> names;
    std::___ ec;
    for (const auto& e : fs::___(dir, ec))
        if (e.path().extension() == ".sav")
            names.push_back(e.path().filename().string());
    std::___(names.begin(), names.end());
    return names;
}`,
      blanks: [
        { answers: ['error_code'] },
        { answers: ['directory_iterator'] },
        { answers: ['sort'] },
      ],
      wordBank: ['error_code', 'directory_iterator', 'sort', 'exception', 'recursive_mutex', 'unique', 'filesystem_error'],
      explanation: "The `std::error_code&` overload of the `directory_iterator` constructor reports a missing directory through `ec` instead of throwing, and then behaves as an empty range, so the loop simply does not run. A plain `directory_iterator` is enough here because saves are not nested (use `recursive_directory_iterator` when they are). Sorting is required because the iteration order is unspecified and differs between file systems; a save-slot menu that reorders itself between runs is a real bug players notice. `filesystem_error` is the exception the *throwing* overloads use.",
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The same ideas on Windows',
      blocks: [
        {
          type: 'p',
          text: "Windows names an open file with an [[os-handle|handle]] instead of a descriptor, but the model underneath is the one you just learned: a per-process handle table, a kernel file object holding the offset and access mode, and a file control block per file. The API looks different, and three behaviours differ in ways that bite game developers:",
        },
        {
          type: 'code',
          title: 'save_win32.cpp (Windows only, not runnable here)',
          code: `#include <windows.h>

bool replaceSave(const wchar_t* tmp, const wchar_t* final,
                 const void* data, DWORD size) {
    HANDLE h = CreateFileW(tmp, GENERIC_WRITE,
                           0,              // share mode: none
                           nullptr, CREATE_ALWAYS,
                           FILE_ATTRIBUTE_NORMAL, nullptr);
    if (h == INVALID_HANDLE_VALUE) return false;
    DWORD written = 0;
    BOOL ok = WriteFile(h, data, size, &written, nullptr)
              && written == size
              && FlushFileBuffers(h);      // like fsync
    CloseHandle(h);
    if (!ok) { DeleteFileW(tmp); return false; }
    return MoveFileExW(tmp, final,
                       MOVEFILE_REPLACE_EXISTING |
                       MOVEFILE_WRITE_THROUGH) != 0;
}`,
          annotations: [
            { lines: 6, text: '**Share modes**: the third argument says what *other* handles may do while this one is open. `0` means nobody else may open the file at all. A sync client or virus scanner holding a file open is the classic cause of `ERROR_SHARING_VIOLATION` when a game tries to overwrite its save.' },
            { lines: 7, text: '`CREATE_ALWAYS` creates the file or truncates an existing one, like `O_CREAT | O_TRUNC`.' },
            { lines: '11-13', text: 'Check the byte count as well as the return value. `FlushFileBuffers` writes the file\'s cached data and asks the drive to flush its cache: the Windows counterpart of `fsync`.' },
            { lines: '16-18', text: '`MOVEFILE_REPLACE_EXISTING` replaces the old save in one step. `MOVEFILE_WRITE_THROUGH` makes the call return only after the move has been flushed to disk.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Sharing and deletion.** POSIX lets anyone rename or unlink a file that others have open. Windows checks share modes at open time and, by default, refuses to delete or replace a file another handle holds without `FILE_SHARE_DELETE`.',
            '**Path length.** Classic Win32 paths are limited to `MAX_PATH` (260 characters) unless the app opts in to long paths or uses the `\\\\?\\` prefix. Deep asset folders in a game\'s build tree hit this regularly.',
            '**Case.** NTFS preserves case but compares names case-insensitively by default, so code that works on a Windows dev machine can fail to find `Textures/Rock.png` on a Linux build server or a case-sensitive console file system.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Saving without corrupting: temp, fsync, rename',
      blocks: [
        {
          type: 'p',
          text: "The obvious way to save is to open `slot1.sav` with `O_TRUNC` and write the new data. Now imagine the power fails, the game crashes or the console is unplugged halfway through. The truncate already happened, so the file holds nothing, or the first half of the new save. The player's 40-hour campaign is gone. Overwriting in place can never be crash-safe, because there is a moment when neither the old nor the new version exists.",
        },
        {
          type: 'p',
          text: "The standard fix relies on one guarantee: [[atomic-rename|`rename` replaces the target atomically]]. Any process that opens the name sees the complete old file or the complete new one, never a mixture and never nothing. So write the new save somewhere else first:",
        },
        {
          type: 'code',
          runnable: true,
          title: 'atomic_save.cpp',
          code: "#include <cerrno>\n#include <cstddef>\n#include <cstdio>\n#include <cstdlib>\n#include <fcntl.h>\n#include <string>\n#include <unistd.h>\n\n// Write all bytes, retrying short writes and EINTR.\nbool writeAll(int fd, const char* p, std::size_t n) {\n    while (n > 0) {\n        ssize_t w = write(fd, p, n);\n        if (w == -1) {\n            if (errno == EINTR) continue;\n            return false;\n        }\n        p += w;\n        n -= std::size_t(w);\n    }\n    return true;\n}\n\n// Replace `path` with `data` so that after a crash the file\n// holds either the old save or the new one, never a mix.\nbool saveAtomically(const std::string& dir,\n                    const std::string& name,\n                    const std::string& data) {\n    std::string path = dir + \"/\" + name;\n    std::string tmp = path + \".tmp\";\n    int fd = open(tmp.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0644);\n    if (fd == -1) return false;\n    bool ok = writeAll(fd, data.data(), data.size())\n              && fsync(fd) == 0;          // data is on the disk\n    ok = (close(fd) == 0) && ok;\n    if (!ok || rename(tmp.c_str(), path.c_str()) == -1) {\n        unlink(tmp.c_str());\n        return false;\n    }\n    int dfd = open(dir.c_str(), O_RDONLY | O_DIRECTORY);\n    if (dfd == -1) return false;\n    ok = fsync(dfd) == 0;                 // the rename is too\n    close(dfd);\n    return ok;\n}\n\nint main() {\n    char dir[] = \"/tmp/forge_save_XXXXXX\";   // private folder\n    if (!mkdtemp(dir)) return 1;\n    for (int level : {7, 8}) {\n        std::string data = \"LVL=\" + std::to_string(level);\n        bool ok = saveAtomically(dir, \"slot1.sav\", data);\n        std::printf(\"save level %d: %s\\n\", level,\n                    ok ? \"ok\" : \"FAILED\");\n    }\n    const std::string path = std::string(dir) + \"/slot1.sav\";\n    char buf[32] = {};\n    int fd = open(path.c_str(), O_RDONLY);\n    ssize_t n = read(fd, buf, sizeof buf - 1);\n    close(fd);\n    std::printf(\"on disk: %.*s\\n\", (int)n, buf);\n    unlink(path.c_str());\n    rmdir(dir);\n}",
          output: "save level 7: ok\nsave level 8: ok\non disk: LVL=8",
          annotations: [
            { lines: '10-21', text: '`write` may write fewer bytes than asked, or be interrupted by a signal (`EINTR`). Loop until everything is written; give up only on a real error.' },
            { lines: 30, text: 'Write to `slot1.sav.tmp`, in the **same directory** as the target: `rename` is only atomic within one file system.' },
            { lines: 33, text: '`fsync` returns only when the file\'s data and metadata are on stable storage. Without it, the rename below could reach the disk before the data, and after a crash `slot1.sav` would be the new, **empty** file.' },
            { lines: 35, text: 'The atomic switch. Before it, `slot1.sav` is the old save; after it, the new one. On failure, clean up the temp file and keep the old save.' },
            { lines: '39-42', text: 'The rename changed the *directory*, and that change sits in the cache too. `fsync` on the directory makes the new name durable, so the save cannot "un-happen" after a power cut.' },
            { lines: '47-48', text: 'The demo saves into a fresh folder from `mkdtemp`, so several copies can run at once without touching each other\'s files.' },
          ],
        },
        {
          type: 'code',
          lang: 'shell',
          title: 'Real strace of the first save',
          code: `openat(AT_FDCWD, "/tmp/forge_atomic.sav.tmp", O_WRONLY|O_CREAT|O_TRUNC, 0644) = 3
write(3, "LVL=7", 5)                    = 5
fsync(3)                                = 0
close(3)                                = 0
rename("/tmp/forge_atomic.sav.tmp", "/tmp/forge_atomic.sav") = 0
openat(AT_FDCWD, "/tmp", O_RDONLY|O_DIRECTORY) = 3
fsync(3)                                = 0
close(3)                                = 0`,
          annotations: [
            { lines: '1-8', text: 'Eight system calls, two of them `fsync`. That is the cost of a crash-safe save: fine once per checkpoint, far too slow to do every frame.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'The ext4 zero-length-file bug of 2009',
          text: "Many Linux programs once saved with write-temp-then-rename but **without** `fsync`, and on ext3 they got away with it, because ext3 happened to write data before metadata. When ext4 introduced *delayed allocation*, data could reach the disk up to a minute after the rename. Users who crashed found their desktop settings replaced by empty files. The kernel added a heuristic that flushes data on rename-over-existing-file, but the lesson stands: only `fsync` is a promise; everything else is luck.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Belt and braces for save games',
          text: "Shipping games usually add two more layers: a **checksum** in the save header, so a corrupted file (bad sector, bad RAM, a bug) is detected instead of loaded, and a **previous copy** (`slot1.bak`) kept by renaming the old save before replacing it, so a detected corruption can fall back one save instead of to nothing. Console save-data APIs usually provide atomic updates of a save container for you; on PC it is your job.",
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'order',
      prompt: 'Put the steps of a crash-safe save of `slot1.sav` in order.',
      linesAreCode: false,
      lines: [
        'Write the complete new save to slot1.sav.tmp in the same directory',
        'fsync the temporary file',
        'rename slot1.sav.tmp to slot1.sav',
        'fsync the directory that contains slot1.sav',
      ],
      distractors: ['Open slot1.sav with O_TRUNC so the old data cannot get in the way'],
      explanation: "The data must be durable *before* the name points at it, so `fsync` comes before `rename`; otherwise a crash can leave the new name pointing at an empty or partial file. The `rename` is the commit point: before it the old save is intact, after it the new one is. The final directory `fsync` makes the rename itself durable. Truncating the real save is exactly what this scheme avoids: from that moment until the write finishes, no valid save exists.",
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'bug',
      prompt: 'Players report that after changing settings, the game sometimes fails to parse `settings.ini`: garbage appears after the last line. The file is always written by this function. Tap the faulty line.',
      code: `#include <fcntl.h>
#include <string>
#include <unistd.h>

bool saveSettings(const std::string& text) {
    int fd = open("settings.ini", O_WRONLY | O_CREAT, 0644);
    if (fd == -1)
        return false;
    bool ok = write(fd, text.data(), text.size())
              == static_cast<ssize_t>(text.size());
    return close(fd) == 0 && ok;
}`,
      bugLines: [6],
      explanation: "Without `O_TRUNC`, opening an existing file keeps its contents and its size. Writing a **shorter** text overwrites only the beginning, so the tail of the old file survives after the new last line, exactly the garbage players see. Adding `O_TRUNC` fixes the symptom, but then a crash between the truncate and the write leaves an empty settings file. The robust fix is the write-temp-fsync-rename sequence from this lesson.",
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'mcq',
      prompt: '`write()` returned the full byte count for your save data, and you did not call `fsync`. Which event can still lose that data?',
      options: [
        { text: 'The game crashes with a segmentation fault a moment later', why: 'Once `write` returns, the bytes are in the kernel\'s page cache, which belongs to the OS, not your process. The kernel writes them to disk later whether or not your game is still running.' },
        { text: 'The player quits the game normally', why: 'Process exit closes descriptors but does not discard the kernel\'s cached data, which is written back in the background.' },
        { text: 'The PC loses power before the kernel writes the dirty pages back', correct: true, why: 'Until writeback (Linux typically starts it within about 30 seconds) the only copy is in RAM. A power cut or kernel crash loses it.' },
        { text: 'Another process opens and reads the file', why: 'Readers see the new data immediately, served from the same page cache.' },
      ],
      explanation: "`write` copies data into kernel memory and returns; durability is a separate step. That design makes writes fast and lets the kernel batch them, but it means a successful `write` protects you against *your* crash, not the *machine's*. `fsync` (or `FlushFileBuffers`) is the point at which you trade speed for that guarantee. The last lesson of this unit looks at the page cache and the cost of `fsync` in detail.",
    },
  ],
  takeaways: [
    'A file is a byte array with a low-level name (inode number or NTFS file ID); a directory maps names to those numbers, so names and files are separate things.',
    'Each `open` creates a system-wide open-file entry holding the offset and mode; descriptors point to it, `fork` and `dup` share it, and a second `open` gets its own.',
    '`read` returns 0 at end of file and may return less than asked; use `pread`/`pwrite` for positional I/O from several threads and `O_APPEND` for atomic appends.',
    'Hard links are extra names for one inode; symlinks store a path and can dangle; storage is freed only when the link count is 0 and nobody has the file open.',
    'Permissions are checked once, at `open`; check-then-act on paths is a TOCTOU race, so let one atomic call (`O_CREAT | O_EXCL`, `open` itself) do both.',
    '`std::filesystem` is a portable wrapper with unspecified iteration order, throwing and `error_code` overloads, and no `fsync`.',
    'Save crash-safely: write a temp file in the same directory, `fsync` it, `rename` it over the old file, `fsync` the directory (on Windows: `FlushFileBuffers`, then `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`).',
  ],
  reading: [
    {
      title: 'OSTEP chapter 39: Files and Directories',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf',
      source: 'book',
      note: 'The whole POSIX file API with strace walkthroughs, including the open file table, fsync, rename and links.',
    },
    {
      title: 'rename(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/rename.2.html',
      source: 'other',
      note: 'The atomic-replacement guarantee is in the first paragraphs of the description.',
    },
    {
      title: 'fsync(2) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man2/fsync.2.html',
      source: 'other',
      note: 'Explains why syncing a file does not sync its directory entry, and what fdatasync skips.',
    },
    {
      title: 'Filesystem library (cppreference)',
      url: 'https://en.cppreference.com/w/cpp/filesystem',
      source: 'cppreference',
      note: 'Every std::filesystem function with its throwing and error_code overloads.',
    },
    {
      title: 'MoveFileExW function (Microsoft Learn)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw',
      source: 'other',
      note: 'The flags MOVEFILE_REPLACE_EXISTING and MOVEFILE_WRITE_THROUGH used for safe saves on Windows.',
    },
    {
      title: 'The Linux Programming Interface (Michael Kerrisk)',
      url: 'https://man7.org/tlpi/',
      source: 'book',
      note: 'Chapters 4, 5 and 18 cover file I/O, the open file table and links in depth.',
    },
  ],
};
