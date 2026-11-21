import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'os-file-system-implementation',
  title: 'File System Implementation',
  summary:
    'How a file system lays out a disk: superblock, bitmaps, inodes with direct and indirect blocks, directories and path lookup, FAT vs ext4 vs NTFS, and how journaling and copy-on-write keep it consistent through crashes. Includes a tiny file system in C++.',
  minutes: 24,
  objectives: [
    'Describe the on-disk layout of a simple file system and locate an inode from its number',
    'Follow direct, single, double and triple indirect pointers to a data block, and compute the maximum file size they allow',
    'Explain extents and compare FAT, ext4 and NTFS at a high level',
    'Count the disk reads needed to resolve a path, and explain what the dentry cache saves',
    'Explain the crash-consistency problem and how fsck, data journaling, ordered (metadata) journaling and copy-on-write each solve it',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'A disk full of blocks',
      blocks: [
        {
          type: 'p',
          text: "The previous lesson used files and directories from the outside. Now open one up. A file system is two things: **data structures** on the disk that record which bytes belong to which file, and **access methods** that turn `open`, `read` and `write` into reads and writes of those structures. OSTEP's teaching file system, *vsfs*, has everything real Unix file systems have, at toy size: a 64-block disk with 4 KiB blocks.",
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 160\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"14\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-purple\" fill-opacity=\"0.14\"/><rect x=\"14\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.2\"/><text x=\"32\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-purple\" font-weight=\"700\">S</text><text x=\"32\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">0</text><rect x=\"50\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-blue\" fill-opacity=\"0.14\"/><rect x=\"50\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.2\"/><text x=\"68\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-blue\" font-weight=\"700\">i</text><text x=\"68\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">1</text><rect x=\"86\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-teal\" fill-opacity=\"0.14\"/><rect x=\"86\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-teal\" stroke-width=\"1.2\"/><text x=\"104\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-teal\" font-weight=\"700\">d</text><text x=\"104\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">2</text><rect x=\"122\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"122\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-green\" stroke-width=\"1.2\"/><text x=\"140\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">I</text><text x=\"140\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">3</text><rect x=\"158\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"158\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-green\" stroke-width=\"1.2\"/><text x=\"176\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">I</text><text x=\"176\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">4</text><rect x=\"194\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"194\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-green\" stroke-width=\"1.2\"/><text x=\"212\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">I</text><text x=\"212\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">5</text><rect x=\"230\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"230\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-green\" stroke-width=\"1.2\"/><text x=\"248\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">I</text><text x=\"248\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">6</text><rect x=\"266\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" class=\"f-green\" fill-opacity=\"0.14\"/><rect x=\"266\" y=\"40\" width=\"36\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-green\" stroke-width=\"1.2\"/><text x=\"284\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">I</text><text x=\"284\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">7</text><rect x=\"302\" y=\"40\" width=\"204\" height=\"40\" rx=\"1\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"302\" y=\"40\" width=\"204\" height=\"40\" rx=\"1\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.2\"/><line x1=\"327.5\" y1=\"40\" x2=\"327.5\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"353\" y1=\"40\" x2=\"353\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"378.5\" y1=\"40\" x2=\"378.5\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"404\" y1=\"40\" x2=\"404\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"429.5\" y1=\"40\" x2=\"429.5\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"455\" y1=\"40\" x2=\"455\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><line x1=\"480.5\" y1=\"40\" x2=\"480.5\" y2=\"80\" class=\"s-orange\" stroke-width=\"0.8\"/><text x=\"314.8\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"340.2\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"365.8\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"391.2\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"416.8\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">…</text><text x=\"442.2\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"467.8\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"493.2\" y=\"65\" font-size=\"13\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">D</text><text x=\"302\" y=\"34\" font-size=\"10\" text-anchor=\"middle\" class=\"t-gray\">8</text><text x=\"506\" y=\"34\" font-size=\"10\" text-anchor=\"end\" class=\"t-gray\">63</text><line x1=\"16\" y1=\"96\" x2=\"120\" y2=\"96\" class=\"s-gray\" stroke-width=\"1.3\"/><line x1=\"16\" y1=\"91\" x2=\"16\" y2=\"96\" class=\"s-gray\" stroke-width=\"1.3\"/><line x1=\"120\" y1=\"91\" x2=\"120\" y2=\"96\" class=\"s-gray\" stroke-width=\"1.3\"/><text x=\"14\" y=\"111\" font-size=\"11\" text-anchor=\"start\" class=\"t-purple\" font-weight=\"700\">S</text><text x=\"26\" y=\"111\" font-size=\"10.5\" text-anchor=\"start\">= superblock</text><text x=\"14\" y=\"125\" font-size=\"11\" text-anchor=\"start\" class=\"t-blue\" font-weight=\"700\">i</text><text x=\"26\" y=\"125\" font-size=\"10.5\" text-anchor=\"start\">= inode bitmap</text><text x=\"14\" y=\"139\" font-size=\"11\" text-anchor=\"start\" class=\"t-teal\" font-weight=\"700\">d</text><text x=\"26\" y=\"139\" font-size=\"10.5\" text-anchor=\"start\">= data bitmap</text><line x1=\"124\" y1=\"96\" x2=\"300\" y2=\"96\" class=\"s-green\" stroke-width=\"1.3\"/><line x1=\"124\" y1=\"91\" x2=\"124\" y2=\"96\" class=\"s-green\" stroke-width=\"1.3\"/><line x1=\"300\" y1=\"91\" x2=\"300\" y2=\"96\" class=\"s-green\" stroke-width=\"1.3\"/><text x=\"212\" y=\"111\" font-size=\"11\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">inode table</text><text x=\"212\" y=\"125\" font-size=\"11\" text-anchor=\"middle\">5 blocks × 16 inodes</text><text x=\"212\" y=\"139\" font-size=\"11\" text-anchor=\"middle\">= 80 inodes (256 B each)</text><line x1=\"304\" y1=\"96\" x2=\"504\" y2=\"96\" class=\"s-orange\" stroke-width=\"1.3\"/><line x1=\"304\" y1=\"91\" x2=\"304\" y2=\"96\" class=\"s-orange\" stroke-width=\"1.3\"/><line x1=\"504\" y1=\"91\" x2=\"504\" y2=\"96\" class=\"s-orange\" stroke-width=\"1.3\"/><text x=\"404\" y=\"111\" font-size=\"11\" text-anchor=\"middle\" class=\"t-orange\" font-weight=\"700\">data region</text><text x=\"404\" y=\"125\" font-size=\"11\" text-anchor=\"middle\">56 blocks of 4 KiB: file contents,</text><text x=\"404\" y=\"139\" font-size=\"11\" text-anchor=\"middle\">directory entries, indirect blocks</text><text x=\"260\" y=\"18\" font-size=\"11.5\" text-anchor=\"middle\" class=\"t-gray\">a 64-block disk, 4 KiB per block (256 KiB in all)</text></svg>",
          alt: 'A row of 64 disk blocks. Block 0 is the superblock S, block 1 the inode bitmap i, block 2 the data bitmap d, blocks 3 to 7 the inode table, and blocks 8 to 63 the data region.',
          caption: 'The vsfs layout. Metadata sits at the start; most of the disk holds file contents.',
        },
        {
          type: 'list',
          items: [
            'The [[superblock]] describes the file system itself: its type (a "magic number"), how many inodes and blocks it has, and where each region starts. Mounting begins by reading it.',
            'Two **bitmaps** record what is free: bit *n* of the inode bitmap says whether inode *n* is in use, bit *n* of the data bitmap does the same for data block *n*. One 4 KiB bitmap block tracks 32,768 objects.',
            'The **inode table** is an array of fixed-size inodes (256 bytes here, so 16 per block and 80 in all). An [[inode]] number is simply an index into it.',
            'The **data region** holds everything else: file contents, directory contents, and the pointer blocks you will meet shortly.',
          ],
        },
        {
          type: 'p',
          text: "Because inodes have a fixed size and sit in one array, finding inode *i* is arithmetic, not a search: its byte address is `inodeTableStart + i × inodeSize`, and the block holding it is that address divided by the block size. Real file systems such as ext4 split the disk into **block groups**, each with its own bitmaps and slice of the inode table, so a file's inode, its data and its directory can sit near each other. That locality came from BSD's Fast File System (1984), designed when every seek cost milliseconds.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a fixed number of inodes?',
          text: "Preallocating the inode table makes lookup by number trivial and keeps metadata in a known place, but it fixes the maximum number of files when the file system is created. Format a drive for a few huge video files and then fill it with millions of tiny files, and you can run out of inodes with gigabytes free (`df -i` shows it). Newer designs (XFS, Btrfs, NTFS's growable Master File Table) allocate inodes dynamically to avoid this.",
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'In a file system with **4 KiB** blocks, the inode table starts at **block 3** (byte 12,288) and each inode is **256 bytes**. Which block number holds **inode 37**?',
      hint: 'Byte address = 12,288 + 37 × 256. Divide by 4,096 and keep the whole part.',
      answer: 5,
      label: 'block',
      explanation: 'Inode 37 starts at byte 12,288 + 37 × 256 = 21,760. 21,760 / 4,096 = 5.3, so it lives in **block 5**, at byte 1,280 within that block. The disk cannot read 256 bytes alone, so the file system reads all of block 5 (16 inodes) and keeps it in memory, which is cheap and often useful because neighbouring inodes tend to be used together.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Inodes and the multi-level index',
      blocks: [
        {
          type: 'p',
          text: "An inode holds everything about a file **except its name**: type and permissions, owner, size, timestamps, link count, and, most importantly, where its data is. The classic Unix design (ext2 and ext3 use it exactly) stores **12 direct pointers** to data blocks, then three pointers to blocks that contain only more pointers:",
        },
        {
          type: 'figure',
          svg: "<svg viewBox=\"0 0 520 362\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"14\" y=\"14\" width=\"150\" height=\"324\" rx=\"4\" class=\"f-green\" fill-opacity=\"0.08\"/><rect x=\"14\" y=\"14\" width=\"150\" height=\"324\" rx=\"4\" fill=\"none\" class=\"s-green\" stroke-width=\"1.5\"/><text x=\"89\" y=\"32\" font-size=\"13\" text-anchor=\"middle\" class=\"t-green\" font-weight=\"700\">inode</text><text x=\"24\" y=\"52\" font-size=\"10.5\" text-anchor=\"start\">mode (type + rwx)</text><text x=\"24\" y=\"67\" font-size=\"10.5\" text-anchor=\"start\">owner uid, gid</text><text x=\"24\" y=\"82\" font-size=\"10.5\" text-anchor=\"start\">size in bytes</text><text x=\"24\" y=\"97\" font-size=\"10.5\" text-anchor=\"start\">a/m/c times</text><text x=\"24\" y=\"112\" font-size=\"10.5\" text-anchor=\"start\">link count</text><rect x=\"24\" y=\"134\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"134\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"89\" y=\"149\" font-size=\"10.5\" text-anchor=\"middle\">direct[0]</text><rect x=\"24\" y=\"160\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"160\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"89\" y=\"175\" font-size=\"10.5\" text-anchor=\"middle\">direct[1]</text><rect x=\"24\" y=\"186\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"186\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"89\" y=\"201\" font-size=\"10.5\" text-anchor=\"middle\">…</text><rect x=\"24\" y=\"212\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"212\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"89\" y=\"227\" font-size=\"10.5\" text-anchor=\"middle\">direct[11]</text><rect x=\"24\" y=\"244\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-purple\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"244\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.1\"/><text x=\"89\" y=\"259\" font-size=\"10.5\" text-anchor=\"middle\">single indirect</text><rect x=\"24\" y=\"278\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-orange\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"278\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.1\"/><text x=\"89\" y=\"293\" font-size=\"10.5\" text-anchor=\"middle\">double indirect</text><rect x=\"24\" y=\"312\" width=\"130\" height=\"22\" rx=\"2\" class=\"f-red\" fill-opacity=\"0.12\"/><rect x=\"24\" y=\"312\" width=\"130\" height=\"22\" rx=\"2\" fill=\"none\" class=\"s-red\" stroke-width=\"1.1\"/><text x=\"89\" y=\"327\" font-size=\"10.5\" text-anchor=\"middle\">triple indirect</text><rect x=\"200\" y=\"135\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.18\"/><rect x=\"200\" y=\"135\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"220\" y=\"149\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"154\" y1=\"145\" x2=\"192\" y2=\"145\" class=\"s-blue\" stroke-width=\"1.2\"/><path d=\"M198 145 L192 148 L192 142 Z\" class=\"f-blue\"/><rect x=\"200\" y=\"161\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.18\"/><rect x=\"200\" y=\"161\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"220\" y=\"175\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"154\" y1=\"171\" x2=\"192\" y2=\"171\" class=\"s-blue\" stroke-width=\"1.2\"/><path d=\"M198 171 L192 174 L192 168 Z\" class=\"f-blue\"/><rect x=\"200\" y=\"213\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-blue\" fill-opacity=\"0.18\"/><rect x=\"200\" y=\"213\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-blue\" stroke-width=\"1.1\"/><text x=\"220\" y=\"227\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"154\" y1=\"223\" x2=\"192\" y2=\"223\" class=\"s-blue\" stroke-width=\"1.2\"/><path d=\"M198 223 L192 226 L192 220 Z\" class=\"f-blue\"/><text x=\"220\" y=\"201\" font-size=\"12\" text-anchor=\"middle\" class=\"t-blue\">⋮</text><rect x=\"200\" y=\"241\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-purple\" fill-opacity=\"0.14\"/><rect x=\"200\" y=\"241\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.1\"/><text x=\"222\" y=\"254\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"222\" y=\"265\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"154\" y1=\"255\" x2=\"192\" y2=\"255\" class=\"s-purple\" stroke-width=\"1.2\"/><path d=\"M198 255 L192 258 L192 252 Z\" class=\"f-purple\"/><rect x=\"262\" y=\"245\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-purple\" fill-opacity=\"0.18\"/><rect x=\"262\" y=\"245\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-purple\" stroke-width=\"1.1\"/><text x=\"282\" y=\"259\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"244\" y1=\"255\" x2=\"254\" y2=\"255\" class=\"s-purple\" stroke-width=\"1.1\"/><path d=\"M260 255 L254 258 L254 252 Z\" class=\"f-purple\"/><rect x=\"200\" y=\"275\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"200\" y=\"275\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.1\"/><text x=\"222\" y=\"288\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"222\" y=\"299\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"154\" y1=\"289\" x2=\"192\" y2=\"289\" class=\"s-orange\" stroke-width=\"1.2\"/><path d=\"M198 289 L192 292 L192 286 Z\" class=\"f-orange\"/><rect x=\"262\" y=\"275\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-orange\" fill-opacity=\"0.14\"/><rect x=\"262\" y=\"275\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.1\"/><text x=\"284\" y=\"288\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"284\" y=\"299\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"244\" y1=\"289\" x2=\"254\" y2=\"289\" class=\"s-orange\" stroke-width=\"1.1\"/><path d=\"M260 289 L254 292 L254 286 Z\" class=\"f-orange\"/><rect x=\"324\" y=\"279\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-orange\" fill-opacity=\"0.18\"/><rect x=\"324\" y=\"279\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-orange\" stroke-width=\"1.1\"/><text x=\"344\" y=\"293\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"306\" y1=\"289\" x2=\"316\" y2=\"289\" class=\"s-orange\" stroke-width=\"1.1\"/><path d=\"M322 289 L316 292 L316 286 Z\" class=\"f-orange\"/><rect x=\"200\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-red\" fill-opacity=\"0.14\"/><rect x=\"200\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-red\" stroke-width=\"1.1\"/><text x=\"222\" y=\"322\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"222\" y=\"333\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"154\" y1=\"323\" x2=\"192\" y2=\"323\" class=\"s-red\" stroke-width=\"1.2\"/><path d=\"M198 323 L192 326 L192 320 Z\" class=\"f-red\"/><rect x=\"262\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-red\" fill-opacity=\"0.14\"/><rect x=\"262\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-red\" stroke-width=\"1.1\"/><text x=\"284\" y=\"322\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"284\" y=\"333\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"244\" y1=\"323\" x2=\"254\" y2=\"323\" class=\"s-red\" stroke-width=\"1.1\"/><path d=\"M260 323 L254 326 L254 320 Z\" class=\"f-red\"/><rect x=\"324\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" class=\"f-red\" fill-opacity=\"0.14\"/><rect x=\"324\" y=\"309\" width=\"44\" height=\"28\" rx=\"2\" fill=\"none\" class=\"s-red\" stroke-width=\"1.1\"/><text x=\"346\" y=\"322\" font-size=\"9.5\" text-anchor=\"middle\">1024</text><text x=\"346\" y=\"333\" font-size=\"9.5\" text-anchor=\"middle\">ptrs</text><line x1=\"306\" y1=\"323\" x2=\"316\" y2=\"323\" class=\"s-red\" stroke-width=\"1.1\"/><path d=\"M322 323 L316 326 L316 320 Z\" class=\"f-red\"/><rect x=\"386\" y=\"313\" width=\"40\" height=\"20\" rx=\"2\" class=\"f-red\" fill-opacity=\"0.18\"/><rect x=\"386\" y=\"313\" width=\"40\" height=\"20\" rx=\"2\" fill=\"none\" class=\"s-red\" stroke-width=\"1.1\"/><text x=\"406\" y=\"327\" font-size=\"9.5\" text-anchor=\"middle\">data</text><line x1=\"368\" y1=\"323\" x2=\"378\" y2=\"323\" class=\"s-red\" stroke-width=\"1.1\"/><path d=\"M384 323 L378 326 L378 320 Z\" class=\"f-red\"/><text x=\"506\" y=\"201\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-blue\" font-weight=\"700\">12 blocks = 48 KiB</text><text x=\"506\" y=\"259\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-purple\" font-weight=\"700\">1024 blocks = 4 MiB</text><text x=\"506\" y=\"293\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-orange\" font-weight=\"700\">1024² blocks = 4 GiB</text><text x=\"506\" y=\"351\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-red\" font-weight=\"700\">1024³ blocks = 4 TiB</text><text x=\"506\" y=\"34\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-gray\">4 KiB blocks, 4-byte block numbers:</text><text x=\"506\" y=\"49\" font-size=\"10.5\" text-anchor=\"end\" class=\"t-gray\">one block holds 4096 / 4 = 1024 pointers</text></svg>",
          alt: 'An inode with metadata fields and pointer slots. Twelve direct pointers lead to data blocks. A single indirect pointer leads to a block of 1024 pointers, then data. A double indirect pointer leads through two pointer blocks to data, and a triple indirect pointer through three.',
          caption: 'With 4 KiB blocks and 4-byte pointers, each level multiplies the reach by 1024.',
        },
        {
          type: 'p',
          text: "This is a deliberately **unbalanced tree**. Studies of real file systems keep finding the same thing: most files are small, but most *bytes* belong to a few large files. Small files (configs, scripts, most source files) are served entirely by the direct pointers, with no extra reads. Only large files pay for [[indirect-block|indirect blocks]], and the cost grows slowly: one extra read per level.",
        },
        {
          "type": "algo",
          "view": "graph",
          "width": 440,
          "height": 250,
          "interval": 1500,
          "caption": "Finding the disk block for a byte offset: 4 KiB blocks, 12 direct pointers, 1024 pointers per indirect block. Block numbers are examples.",
          "nodes": [
            {
              "id": "IN",
              "x": 50,
              "y": 135,
              "label": "inode"
            },
            {
              "id": "DA",
              "x": 390,
              "y": 35,
              "label": "data"
            },
            {
              "id": "IND",
              "x": 230,
              "y": 135,
              "label": "ind"
            },
            {
              "id": "DB",
              "x": 390,
              "y": 135,
              "label": "data"
            },
            {
              "id": "DIND",
              "x": 160,
              "y": 215,
              "label": "dind"
            },
            {
              "id": "L2",
              "x": 275,
              "y": 215,
              "label": "ind"
            },
            {
              "id": "DC",
              "x": 390,
              "y": 215,
              "label": "data"
            }
          ],
          "edges": [
            {
              "from": "IN",
              "to": "DA",
              "directed": true,
              "label": "direct"
            },
            {
              "from": "IN",
              "to": "IND",
              "directed": true,
              "label": "single"
            },
            {
              "from": "IND",
              "to": "DB",
              "directed": true
            },
            {
              "from": "IN",
              "to": "DIND",
              "directed": true,
              "label": "double"
            },
            {
              "from": "DIND",
              "to": "L2",
              "directed": true
            },
            {
              "from": "L2",
              "to": "DC",
              "directed": true
            }
          ],
          "frames": [
            {
              "note": "Byte 40,000 lies in logical block 40,000 / 4096 = **9**. The inode is already in memory.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "orange"
                }
              ],
              "edgeColors": [],
              "nodeNotes": [],
              "vars": [
                [
                  "byte offset",
                  "40,000"
                ],
                [
                  "logical block",
                  "9"
                ],
                [
                  "via",
                  "?"
                ],
                [
                  "disk reads",
                  "0"
                ]
              ]
            },
            {
              "note": "9 < 12, so `direct[9]` in the inode holds the disk block number. One read fetches the data.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "DA",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "DA",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "DA",
                  "text": "blk 8,217"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "40,000"
                ],
                [
                  "logical block",
                  "9"
                ],
                [
                  "via",
                  "direct"
                ],
                [
                  "disk reads",
                  "1"
                ]
              ]
            },
            {
              "note": "Byte 2,000,000 is in logical block **488**. That is past the 12 direct pointers, and 488 − 12 = 476 < 1024: single indirect.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "orange"
                }
              ],
              "edgeColors": [],
              "nodeNotes": [],
              "vars": [
                [
                  "byte offset",
                  "2,000,000"
                ],
                [
                  "logical block",
                  "488"
                ],
                [
                  "via",
                  "single"
                ],
                [
                  "disk reads",
                  "0"
                ]
              ]
            },
            {
              "note": "Read the single-indirect block and take entry **476** from its 1024 pointers.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "IND",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "IND",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "IND",
                  "text": "[476]"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "2,000,000"
                ],
                [
                  "logical block",
                  "488"
                ],
                [
                  "via",
                  "single"
                ],
                [
                  "disk reads",
                  "1"
                ]
              ]
            },
            {
              "note": "That entry names the data block. Read it: two disk reads in all.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "IND",
                  "color": "green"
                },
                {
                  "id": "DB",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "IND",
                  "color": "green"
                },
                {
                  "from": "IND",
                  "to": "DB",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "IND",
                  "text": "[476]"
                },
                {
                  "id": "DB",
                  "text": "blk 20,931"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "2,000,000"
                ],
                [
                  "logical block",
                  "488"
                ],
                [
                  "via",
                  "single"
                ],
                [
                  "disk reads",
                  "2"
                ]
              ]
            },
            {
              "note": "Byte 5,000,000 is in logical block **1220**. 1220 − 12 − 1024 = 184, so it is in the double-indirect range.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "orange"
                }
              ],
              "edgeColors": [],
              "nodeNotes": [],
              "vars": [
                [
                  "byte offset",
                  "5,000,000"
                ],
                [
                  "logical block",
                  "1220"
                ],
                [
                  "via",
                  "double"
                ],
                [
                  "disk reads",
                  "0"
                ]
              ]
            },
            {
              "note": "Read the double-indirect block. Entry 184 / 1024 = **0** points to a second-level indirect block.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "DIND",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "DIND",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "DIND",
                  "text": "[0]"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "5,000,000"
                ],
                [
                  "logical block",
                  "1220"
                ],
                [
                  "via",
                  "double"
                ],
                [
                  "disk reads",
                  "1"
                ]
              ]
            },
            {
              "note": "Read that block and take entry 184 mod 1024 = **184**.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "DIND",
                  "color": "green"
                },
                {
                  "id": "L2",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "DIND",
                  "color": "green"
                },
                {
                  "from": "DIND",
                  "to": "L2",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "DIND",
                  "text": "[0]"
                },
                {
                  "id": "L2",
                  "text": "[184]"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "5,000,000"
                ],
                [
                  "logical block",
                  "1220"
                ],
                [
                  "via",
                  "double"
                ],
                [
                  "disk reads",
                  "2"
                ]
              ]
            },
            {
              "note": "Finally read the data block: **three** disk reads. Triple indirect would need four, which is why big files want extents.",
              "nodeColors": [
                {
                  "id": "IN",
                  "color": "green"
                },
                {
                  "id": "DIND",
                  "color": "green"
                },
                {
                  "id": "L2",
                  "color": "green"
                },
                {
                  "id": "DC",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "IN",
                  "to": "DIND",
                  "color": "green"
                },
                {
                  "from": "DIND",
                  "to": "L2",
                  "color": "green"
                },
                {
                  "from": "L2",
                  "to": "DC",
                  "color": "orange"
                }
              ],
              "nodeNotes": [
                {
                  "id": "DIND",
                  "text": "[0]"
                },
                {
                  "id": "L2",
                  "text": "[184]"
                },
                {
                  "id": "DC",
                  "text": "blk 61,002"
                }
              ],
              "vars": [
                [
                  "byte offset",
                  "5,000,000"
                ],
                [
                  "logical block",
                  "1220"
                ],
                [
                  "via",
                  "double"
                ],
                [
                  "disk reads",
                  "3"
                ]
              ]
            }
          ]
        },
        {
          type: 'code',
          runnable: true,
          title: 'max_file_size.cpp',
          code: "#include <cstdint>\n#include <cstdio>\n#include <initializer_list>\n\n// Largest file an ext2-style inode can address: 12 direct\n// pointers, then single, double and triple indirect blocks.\nint main() {\n    for (std::uint64_t block : {1024, 4096}) {\n        std::uint64_t p = block / 4;          // 4-byte pointers\n        std::uint64_t blocks = 12 + p + p * p + p * p * p;\n        double gib = double(blocks * block) / (1ull << 30);\n        std::printf(\"%4llu-byte blocks: %llu ptrs/block, \"\n                    \"%llu blocks, %.1f GiB\\n\",\n                    (unsigned long long)block,\n                    (unsigned long long)p,\n                    (unsigned long long)blocks, gib);\n    }\n}",
          output: "1024-byte blocks: 256 ptrs/block, 16843020 blocks, 16.1 GiB\n4096-byte blocks: 1024 ptrs/block, 1074791436 blocks, 4100.0 GiB",
          annotations: [
            { lines: 9, text: 'Each pointer is a 4-byte block number, so a block of pointers holds `block / 4` of them.' },
            { lines: 10, text: 'Direct + single + double + triple indirect. The triple-indirect term dominates completely.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Other limits get there first',
          text: 'The pointer structure allows about 4 TiB per file with 4 KiB blocks, but ext2 and ext3 actually cap files at 2 TiB, because the inode counts the blocks a file uses in 512-byte units in a 32-bit field. Real maximum sizes come from whichever field overflows first, which is why they look so irregular across file systems.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'An ext2-style inode has 12 direct pointers plus single, double and triple indirect pointers. Blocks are **2 KiB** and block pointers are **4 bytes**. What is the largest file the pointers can address, in GiB (2^30 bytes)? Round to 1 decimal place.',
      hint: 'A 2 KiB block holds 2,048 / 4 = 512 pointers. Count 12 + 512 + 512² + 512³ blocks, then multiply by 2,048 bytes.',
      answer: 256.5,
      tolerance: 0.05,
      unit: 'GiB',
      explanation: 'Each pointer block holds 512 pointers, so the inode reaches 12 + 512 + 262,144 + 134,217,728 = 134,480,396 blocks. Times 2,048 bytes that is 275,415,851,008 bytes ≈ **256.5 GiB**. Halving the block size cut the maximum by a factor of about 16, because the block size enters both the pointers-per-block (cubed) and the bytes per block. That is one reason file systems moved to larger blocks as disks grew.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'Same layout as the animation: 4 KiB blocks, 12 direct pointers, 1024 pointers per indirect block. The inode is already in memory and nothing else is cached. How many disk reads does it take to read the block that contains **byte 3,000,000** of the file?',
      hint: 'Find the logical block (3,000,000 / 4,096), then decide which pointer level covers it.',
      answer: 2,
      unit: 'reads',
      explanation: 'Byte 3,000,000 is in logical block 732. That is past the 12 direct blocks, and 732 − 12 = 720 is less than 1024, so it is reached through the **single indirect** block: one read for the indirect block (entry 720), one for the data block, **2** in all. In practice the kernel caches indirect blocks, so reading the next block of the file costs only one read.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Extents, and three real file systems',
      blocks: [
        {
          type: 'p',
          text: "Pointer-per-block has a cost: a 1 GiB file needs 262,144 pointers (about 1 MiB of indirect blocks) even when its data is perfectly contiguous on disk. Modern file systems describe data with [[extent|extents]] instead: *(start block, length)* pairs. ext4's inode holds four extents directly, each covering up to 32,768 blocks (128 MiB with 4 KiB blocks); bigger or more fragmented files grow a small B-tree of extents. A freshly copied 1 GiB `.pak` file typically needs a handful of extents instead of a quarter of a million pointers.",
        },
        {
          type: 'table',
          headers: ['Aspect', 'FAT32 / exFAT', 'ext4', 'NTFS'],
          rows: [
            ['Where file metadata lives', 'In the directory entry (name, size, first cluster)', 'Inodes in an inode table', 'One record per file in the Master File Table (MFT), usually 1 KiB'],
            ['How data is found', 'A linked list: the File Allocation Table gives the next cluster of each cluster (exFAT can skip it for contiguous files)', 'Extents (a tree for large files)', 'Data *runs* (extents); files of a few hundred bytes live inside the MFT record itself'],
            ['Directories', 'Unsorted list of entries', 'Hashed B-tree (*htree*) for large directories', 'B+ tree index'],
            ['Crash safety', 'None built in (run a repair tool)', 'Journal (metadata by default)', 'Journal of metadata (`$LogFile`)'],
            ['Permissions, links', 'None', 'Unix owner, mode bits, hard and symbolic links', 'ACLs, hard links, symlinks, junctions'],
            ['Typical use', 'SD cards, USB sticks, cameras; FAT32 caps files at 4 GiB − 1 byte', 'Linux, Android, Steam Deck', 'Windows system and game drives'],
          ],
        },
        {
          type: 'p',
          text: "FAT survives because it is simple enough for a camera or a console's firmware to implement, and every OS can read it. But its linked list makes random access slow: to find cluster 10,000 of a file you follow 10,000 links (fast only if the whole table is cached in RAM), and it has no journal, so pulling a USB stick mid-write can corrupt the whole table.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Fragmentation and game installs',
          text: "Extents work best when files are contiguous. A file system that has to squeeze a 40 GB game into scattered free space produces many small extents; on a hard disk each extent boundary can mean a seek. That is why defragmenters existed and why game launchers often preallocate the full size of a download before writing it (`fallocate` on Linux, `SetFileInformationByHandle` with an allocation size on Windows): the file system can then pick large free runs up front.",
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'mcq',
      prompt: 'A video player seeks to the last minute of a 3.5 GiB movie on a FAT32 USB stick, and the first read after the seek is noticeably slow. The same seek on ext4 is instant. Why?',
      options: [
        { text: 'FAT32 does not support files larger than 2 GiB, so the player reads it in pieces', why: 'FAT32 allows files up to 4 GiB − 1 byte, so a 3.5 GiB file is valid.' },
        { text: 'To find a cluster near the end, FAT must follow the chain of next-cluster links from the start of the file', correct: true, why: 'FAT stores the location of each cluster only in the entry of the previous cluster, so random access walks the list. ext4 jumps through a few extents directly.' },
        { text: 'FAT32 has no journal, so every read must be verified', why: 'A journal protects metadata updates against crashes. It plays no part in reading.' },
        { text: 'USB sticks cannot seek; they always read from the start', why: 'Flash storage reads any block equally fast. The slowness comes from the file system\'s data structure, not the device.' },
      ],
      explanation: "FAT is a linked list of clusters: the table entry for cluster *n* holds the number of the next cluster. Reaching byte offset *x* needs about *x* / cluster-size table lookups, tens of thousands for a large file, and each table sector not yet cached costs a read. Inode-based file systems keep an index (pointers or extents) in the inode, so they compute the location of any block with at most a few reads.",
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Directories and path lookup',
      blocks: [
        {
          type: 'p',
          text: "A directory is just a file with a known format. In ext2 its data blocks hold a list of entries: inode number, record length, name length, name. Every directory also contains `.` (itself) and `..` (its parent), which is why a directory's link count is 2 plus its number of subdirectories. ext4 adds a hashed index (*htree*) so a directory with 100,000 entries does not have to be scanned linearly, and NTFS keeps directory entries in a B+ tree sorted by name.",
        },
        {
          type: 'p',
          text: "To open a path, the kernel walks it one component at a time. Starting from the root's inode (a fixed number: 2 on ext4), it reads the directory's data, finds the next name, reads that inode, checks permissions, and repeats:",
        },
        {
          "type": "algo",
          "view": "graph",
          "width": 440,
          "height": 250,
          "interval": 1400,
          "caption": "Path resolution: every component costs an inode read and a directory read.",
          "nodes": [
            {
              "id": "I2",
              "x": 45,
              "y": 55,
              "label": "ino 2"
            },
            {
              "id": "Dr",
              "x": 110,
              "y": 195,
              "label": "/ dir"
            },
            {
              "id": "I31",
              "x": 175,
              "y": 55,
              "label": "ino 31"
            },
            {
              "id": "Dg",
              "x": 240,
              "y": 195,
              "label": "games"
            },
            {
              "id": "I77",
              "x": 305,
              "y": 55,
              "label": "ino 77"
            },
            {
              "id": "Ds",
              "x": 370,
              "y": 195,
              "label": "saves"
            },
            {
              "id": "I140",
              "x": 400,
              "y": 55,
              "label": "ino 140"
            }
          ],
          "edges": [
            {
              "from": "I2",
              "to": "Dr",
              "directed": true
            },
            {
              "from": "Dr",
              "to": "I31",
              "directed": true,
              "label": "games"
            },
            {
              "from": "I31",
              "to": "Dg",
              "directed": true
            },
            {
              "from": "Dg",
              "to": "I77",
              "directed": true,
              "label": "saves"
            },
            {
              "from": "I77",
              "to": "Ds",
              "directed": true
            },
            {
              "from": "Ds",
              "to": "I140",
              "directed": true,
              "label": "slot1.sav"
            }
          ],
          "frames": [
            {
              "note": "`open(\"/games/saves/slot1.sav\")` with cold caches. Each step is one disk read: an inode or a directory's data block.",
              "nodeColors": [],
              "vars": [
                [
                  "disk reads",
                  "0"
                ],
                [
                  "found",
                  "—"
                ]
              ]
            },
            {
              "note": "Read the root directory's inode. Its number is fixed and well known (2 on ext4), so the walk can start without a lookup.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "orange"
                }
              ],
              "edgeColors": [],
              "vars": [
                [
                  "disk reads",
                  "1"
                ],
                [
                  "found",
                  "—"
                ]
              ]
            },
            {
              "note": "Read the root directory's data block and scan its entries for **games**: it maps to inode 31.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "2"
                ],
                [
                  "found",
                  "games → 31"
                ]
              ]
            },
            {
              "note": "Read inode 31: it is a directory, and you have search (x) permission, so continue.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "green"
                },
                {
                  "id": "I31",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "green"
                },
                {
                  "from": "Dr",
                  "to": "I31",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "3"
                ],
                [
                  "found",
                  "games → 31"
                ]
              ]
            },
            {
              "note": "Read the data of `/games` and find **saves** → inode 77.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "green"
                },
                {
                  "id": "I31",
                  "color": "green"
                },
                {
                  "id": "Dg",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "green"
                },
                {
                  "from": "Dr",
                  "to": "I31",
                  "color": "green"
                },
                {
                  "from": "I31",
                  "to": "Dg",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "4"
                ],
                [
                  "found",
                  "saves → 77"
                ]
              ]
            },
            {
              "note": "Read inode 77 (`/games/saves`), check its permissions…",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "green"
                },
                {
                  "id": "I31",
                  "color": "green"
                },
                {
                  "id": "Dg",
                  "color": "green"
                },
                {
                  "id": "I77",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "green"
                },
                {
                  "from": "Dr",
                  "to": "I31",
                  "color": "green"
                },
                {
                  "from": "I31",
                  "to": "Dg",
                  "color": "green"
                },
                {
                  "from": "Dg",
                  "to": "I77",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "5"
                ],
                [
                  "found",
                  "saves → 77"
                ]
              ]
            },
            {
              "note": "…read its data and find **slot1.sav** → inode 140.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "green"
                },
                {
                  "id": "I31",
                  "color": "green"
                },
                {
                  "id": "Dg",
                  "color": "green"
                },
                {
                  "id": "I77",
                  "color": "green"
                },
                {
                  "id": "Ds",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "green"
                },
                {
                  "from": "Dr",
                  "to": "I31",
                  "color": "green"
                },
                {
                  "from": "I31",
                  "to": "Dg",
                  "color": "green"
                },
                {
                  "from": "Dg",
                  "to": "I77",
                  "color": "green"
                },
                {
                  "from": "I77",
                  "to": "Ds",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "6"
                ],
                [
                  "found",
                  "slot1.sav → 140"
                ]
              ]
            },
            {
              "note": "Read inode 140: the file itself. `open` can now build the open-file entry.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "green"
                },
                {
                  "id": "Dr",
                  "color": "green"
                },
                {
                  "id": "I31",
                  "color": "green"
                },
                {
                  "id": "Dg",
                  "color": "green"
                },
                {
                  "id": "I77",
                  "color": "green"
                },
                {
                  "id": "Ds",
                  "color": "green"
                },
                {
                  "id": "I140",
                  "color": "orange"
                }
              ],
              "edgeColors": [
                {
                  "from": "I2",
                  "to": "Dr",
                  "color": "green"
                },
                {
                  "from": "Dr",
                  "to": "I31",
                  "color": "green"
                },
                {
                  "from": "I31",
                  "to": "Dg",
                  "color": "green"
                },
                {
                  "from": "Dg",
                  "to": "I77",
                  "color": "green"
                },
                {
                  "from": "I77",
                  "to": "Ds",
                  "color": "green"
                },
                {
                  "from": "Ds",
                  "to": "I140",
                  "color": "orange"
                }
              ],
              "vars": [
                [
                  "disk reads",
                  "7"
                ],
                [
                  "found",
                  "slot1.sav → 140"
                ]
              ]
            },
            {
              "note": "Seven reads before the first byte of the file. Open it again and the kernel's **dentry and inode caches** answer every step from RAM: zero reads.",
              "nodeColors": [
                {
                  "id": "I2",
                  "color": "blue"
                },
                {
                  "id": "Dr",
                  "color": "blue"
                },
                {
                  "id": "I31",
                  "color": "blue"
                },
                {
                  "id": "Dg",
                  "color": "blue"
                },
                {
                  "id": "I77",
                  "color": "blue"
                },
                {
                  "id": "Ds",
                  "color": "blue"
                },
                {
                  "id": "I140",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "disk reads (warm)",
                  "0"
                ],
                [
                  "found",
                  "slot1.sav → 140"
                ]
              ]
            }
          ]
        },
        {
          type: 'p',
          text: "Every component costs at least two reads (more if a directory spans several blocks), so deep paths are expensive with cold caches. Linux therefore keeps a [[dentry-cache]] of recent name → inode lookups, including *negative* entries recording that a name does **not** exist, plus an inode cache. With warm caches a path lookup touches no disk at all. Creating a file costs more: read and update the inode bitmap, initialise the new inode, add an entry to the directory's data, and update the directory's inode (size, modification time). One small `open(…, O_CREAT)` updates four or five different blocks.",
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why engines pack assets',
          text: "Open 20,000 loose files at load time and you pay 20,000 path walks, 20,000 permission checks and 20,000 inode reads, plus per-file overhead in every layer of the I/O stack (on Windows, filter drivers such as antivirus scanners inspect every `CreateFile`). Packing assets into a few large archive files turns all of that into a handful of opens and offset arithmetic inside the engine. The last lesson of this unit comes back to pak files.",
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: "With completely cold caches, how many disk reads does `open(\"/home/adam/saves/slot1.sav\", O_RDONLY)` need? Assume every directory fits in one data block, and count the read of the file's own inode but none of its data.",
      hint: 'Root inode, root data, then an inode and a data block for each directory on the path, then the file\'s inode.',
      answer: 9,
      unit: 'reads',
      explanation: 'Root inode and root data (2), then `home` inode and data (4), `adam` inode and data (6), `saves` inode and data (8), then the inode of `slot1.sav` (**9**). The file\'s data is not read until you call `read`, and the inode is needed now to check permissions and build the open-file entry. With a warm dentry cache the same `open` costs zero disk reads.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'A tiny file system in C++',
      blocks: [
        {
          type: 'p',
          text: "Everything so far fits in about 150 lines. This simulator keeps a 32-block \"disk\" of 64-byte blocks in memory, with an inode bitmap, a data bitmap, inodes with 4 direct pointers and 1 indirect pointer, directories stored as files of fixed-size entries, and a counter of the inode and block reads a real disk would need.",
        },
        {
          type: 'code',
          runnable: true,
          title: 'tinyfs.cpp',
          code: "#include <algorithm>\n#include <array>\n#include <bitset>\n#include <cstdio>\n#include <cstring>\n#include <string>\n\n// A toy inode file system that lives in memory.\nconstexpr int kBlockSize = 64;          // bytes (tiny on purpose)\nconstexpr int kBlocks = 32, kInodes = 16, kDirect = 4;\nconstexpr int kPtrsPerBlock = kBlockSize / int(sizeof(int));\n\nstruct Inode {\n    bool isDir = false;\n    int size = 0;                       // bytes\n    std::array<int, kDirect> direct{-1, -1, -1, -1};\n    int indirect = -1;                  // block full of pointers\n};\nstruct DirEntry { char name[12]; int inum; };   // 16 bytes\n\nclass TinyFs {\npublic:\n    std::array<std::array<char, kBlockSize>, kBlocks> disk{};\n    std::bitset<kBlocks> dataMap;       // 1 = block in use\n    std::bitset<kInodes> inodeMap;      // 1 = inode in use\n    std::array<Inode, kInodes> inodes{};\n    int reads = 0;                      // inode + block reads\n\n    TinyFs() { inodeMap[0] = true; inodes[0].isDir = true; }\n\n    int allocBlock() {\n        for (int b = 0; b < kBlocks; ++b)\n            if (!dataMap[b]) { dataMap[b] = true; return b; }\n        return -1;\n    }\n    // Map a file's logical block number to a disk block.\n    int blockFor(Inode& in, int logical, bool alloc) {\n        if (logical < kDirect) {\n            if (in.direct[logical] < 0 && alloc)\n                in.direct[logical] = allocBlock();\n            return in.direct[logical];\n        }\n        if (in.indirect < 0) {\n            if (!alloc) return -1;\n            in.indirect = allocBlock();\n            for (int i = 0; i < kPtrsPerBlock; ++i)\n                setPtr(in.indirect, i, -1);\n        }\n        ++reads;                        // read the indirect block\n        int p = getPtr(in.indirect, logical - kDirect);\n        if (p < 0 && alloc) {\n            p = allocBlock();\n            setPtr(in.indirect, logical - kDirect, p);\n        }\n        return p;\n    }\n    // Pointers inside a block are raw bytes: copy them out/in.\n    int getPtr(int blk, int i) {\n        int p;\n        std::memcpy(&p, disk[blk].data() + i * sizeof p, sizeof p);\n        return p;\n    }\n    void setPtr(int blk, int i, int p) {\n        std::memcpy(disk[blk].data() + i * sizeof p, &p, sizeof p);\n    }\n    void write(int inum, const std::string& data) {\n        Inode& in = inodes[inum];\n        const int n = int(data.size());\n        for (int off = 0; off < n; off += kBlockSize) {\n            int b = blockFor(in, off / kBlockSize, true);\n            data.copy(disk[b].data(), kBlockSize, off);\n        }\n        in.size = n;\n    }\n    std::string read(int inum) {\n        Inode& in = inodes[inum];\n        ++reads;                        // read the inode\n        std::string out;\n        for (int off = 0; off < in.size; off += kBlockSize) {\n            int b = blockFor(in, off / kBlockSize, false);\n            ++reads;                    // read the data block\n            int n = std::min(kBlockSize, in.size - off);\n            out.append(disk[b].data(), n);\n        }\n        return out;\n    }\n    int lookup(int dir, const std::string& name) {\n        std::string bytes = read(dir);  // a directory is a file\n        for (std::size_t i = 0; i < bytes.size();\n             i += sizeof(DirEntry)) {\n            DirEntry e;\n            std::memcpy(&e, bytes.data() + i, sizeof e);\n            if (name == e.name) return e.inum;\n        }\n        return -1;\n    }\n    int resolve(const std::string& path) {  // \"/a/b\" -> inum\n        int inum = 0;                   // the root's inode number\n        std::size_t start = 1;\n        while (inum >= 0 && start < path.size()) {\n            std::size_t end = path.find('/', start);\n            if (end == std::string::npos) end = path.size();\n            inum = lookup(inum, path.substr(start, end - start));\n            start = end + 1;\n        }\n        return inum;\n    }\n    int create(int dir, const char* name, bool isDir) {\n        int inum = 1;\n        while (inum < kInodes && inodeMap[inum]) ++inum;\n        inodeMap[inum] = true;\n        inodes[inum].isDir = isDir;\n        DirEntry e{};\n        std::strncpy(e.name, name, sizeof e.name - 1);\n        e.inum = inum;\n        std::string bytes = read(dir);  // append the new entry\n        bytes.append(reinterpret_cast<char*>(&e), sizeof e);\n        write(dir, bytes);\n        return inum;\n    }\n};\n\nint main() {\n    TinyFs fs;\n    int saves = fs.create(0, \"saves\", true);\n    int slot = fs.create(saves, \"slot1.sav\", false);\n    std::string data;\n    while (data.size() < 300) data += \"LVL=7;\";\n    fs.write(slot, data);\n\n    const Inode& in = fs.inodes[slot];\n    std::printf(\"slot1.sav: inode %d, %d bytes, direct =\", slot,\n                in.size);\n    for (int b : in.direct) std::printf(\" %d\", b);\n    std::printf(\", indirect = %d\\n\", in.indirect);\n    std::printf(\"inode bitmap \");\n    for (int i = 0; i < kInodes; ++i)\n        std::printf(\"%d\", int(fs.inodeMap[i]));\n    std::printf(\"\\ndata bitmap  \");\n    for (int b = 0; b < kBlocks; ++b)\n        std::printf(\"%d\", int(fs.dataMap[b]));\n    std::printf(\"\\n\");\n\n    fs.reads = 0;\n    int found = fs.resolve(\"/saves/slot1.sav\");\n    std::printf(\"resolve -> inode %d with %d reads\\n\", found,\n                fs.reads);\n    fs.reads = 0;\n    bool same = fs.read(found) == data;\n    std::printf(\"read back %s with %d reads\\n\",\n                same ? \"OK\" : \"WRONG\", fs.reads);\n    std::printf(\"max file size: %d bytes\\n\",\n                (kDirect + kPtrsPerBlock) * kBlockSize);\n}",
          output: "slot1.sav: inode 2, 300 bytes, direct = 2 3 4 5, indirect = 6\ninode bitmap 1110000000000000\ndata bitmap  11111111000000000000000000000000\nresolve -> inode 2 with 4 reads\nread back OK with 7 reads\nmax file size: 1280 bytes",
          annotations: [
            { lines: '9-11', text: 'Tiny blocks keep the numbers readable: a 64-byte block holds 16 four-byte pointers, so the maximum file size is (4 + 16) × 64 = 1,280 bytes.' },
            { lines: '13-18', text: 'The inode: type, size and the block index. No name: names live in directories.' },
            { lines: 19, text: 'A directory entry maps a name to an inode number. Four entries fit in one 64-byte block.' },
            { lines: '31-35', text: 'Allocation scans the bitmap for the first free block. Real file systems search near related data (the same block group) to keep files contiguous.' },
            { lines: '37-56', text: 'The index lookup from the animation: logical blocks 0–3 are direct, later ones go through the indirect block, which is allocated on first use and counts as an extra read.' },
            { lines: '57-65', text: 'Pointers stored *inside* a data block are raw bytes. Copying them with `memcpy` avoids the alignment and strict-aliasing problems of casting the block to `int*`.' },
            { lines: '87-96', text: 'A directory is read like any file and scanned entry by entry. This linear scan is what ext4\'s htree replaces for large directories.' },
            { lines: '97-107', text: 'Path resolution: start at the root\'s inode (0 here, 2 on ext4) and look up one component at a time.' },
            { lines: '108-120', text: 'Creating a file touches the inode bitmap, the new inode, the directory\'s data and the directory\'s inode: four separate structures that must all change together. Remember that for the next card.' },
            { lines: '144-151', text: 'Resolving needs 4 reads (inode and data of `/`, then of `/saves`). Reading the 300-byte file needs 7: its inode, 5 data blocks and the indirect block.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Extend it',
          text: "Good exercises: add `unlink` (clear the entry, free the blocks in the bitmap), a double-indirect pointer, or a block cache that remembers the last 4 blocks read and watch the read counts drop. Then simulate a crash by returning halfway through `create`, and see which bitmaps and inodes disagree. That is the next topic.",
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'numeric',
      prompt: 'In `tinyfs.cpp`, suppose you change `kBlockSize` to **128** and leave everything else alone (4 direct pointers, one indirect pointer, 4-byte pointers). What is the new maximum file size in bytes?',
      hint: 'A 128-byte indirect block holds 128 / 4 pointers. Add the direct pointers and multiply by the block size.',
      answer: 4608,
      unit: 'bytes',
      explanation: 'The indirect block now holds 128 / 4 = 32 pointers, so a file can have 4 + 32 = 36 blocks of 128 bytes: **4,608** bytes. Doubling the block size more than tripled the maximum, because it doubles both the number of pointers per indirect block and the size of every block. With double and triple indirect blocks the effect is even stronger, as the 1 KiB vs 4 KiB comparison above showed.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The crash-consistency problem',
      blocks: [
        {
          type: 'p',
          text: "Appending one block to a file changes **three** structures: the new data block, the inode (new size, new pointer) and the data bitmap (block now in use). They live in different places on the disk, and the disk writes one block at a time, in whatever order its scheduler prefers. If the power fails between those writes, only some of them happen:",
        },
        {
          type: 'table',
          headers: ['Only these reached the disk', 'Result'],
          rows: [
            ['Data block', 'Fine: nothing points to it, and the bitmap still says it is free. The update is simply lost.'],
            ['Inode', 'Inode points to a block with **garbage** (old data from another file), and the bitmap disagrees with the inode.'],
            ['Bitmap', 'A block is marked used but nothing points to it: a **space leak**.'],
            ['Inode + bitmap', 'Metadata is consistent, but the file contains **garbage**. Nothing can detect this.'],
            ['Inode + data', 'Correct file, but the bitmap says the block is free: it may be handed to another file later.'],
            ['Bitmap + data', 'Leak again: the block is in use, filled, and unreachable.'],
          ],
        },
        {
          type: 'p',
          text: "The early answer was [[fsck]] (\"file system check\"): after an unclean shutdown, scan **every** inode, every directory and every bitmap, and repair whatever disagrees. Rebuild the bitmaps from the inodes, fix link counts by counting directory entries, move orphaned inodes into `lost+found`. It works, but it has two flaws. It is slow, proportional to the size of the whole disk rather than to the few blocks that were being written: hours on large volumes. And it cannot fix the inode-plus-bitmap case, because a block of garbage looks exactly like a block of data.",
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just write in a careful order?',
          text: "Ordering helps (writing data before the inode avoids the garbage cases), and some systems are built on it (*soft updates* in FreeBSD). But updates often form cycles: creating a file in a directory and moving another out of it can need each block written \"before\" the other. And the disk itself may reorder writes in its cache. A general, simple solution needs a way to make several writes appear **atomic**.",
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'mcq',
      prompt: 'After a power cut during an append, the inode and the data bitmap reached the disk but the new data block did not. What will a player opening the file see, and can `fsck` repair it?',
      options: [
        { text: 'The file is shorter than expected; fsck restores the missing block', why: 'The inode, with its new size, did reach the disk, so the file is not shorter. And fsck has no copy of the missing data to restore.' },
        { text: 'The file has the right size but its last block holds old, unrelated data; fsck cannot tell', correct: true, why: 'All metadata agrees: the inode points to the block, and the bitmap says it is in use. Nothing is inconsistent for fsck to find, yet the contents are whatever the block held before.' },
        { text: 'The file system refuses to mount until fsck rebuilds the bitmap', why: 'Inode and bitmap agree here, so there is nothing to rebuild.' },
        { text: 'A space leak: the block is marked used but unreachable', why: 'That is the bitmap-only (or bitmap + data) case. Here the inode does point to the block.' },
      ],
      explanation: 'This is the nastiest of the crash cases because the metadata is perfectly consistent. fsck checks structure, not contents, so it reports nothing, and the game reads stale bytes, possibly another file\'s data (a privacy problem as well as corruption). Ordered journaling exists largely to rule this case out: it writes the data block before the metadata that points to it can commit.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Journaling: write it down first',
      blocks: [
        {
          type: 'p',
          text: "[[journaling|Journaling]] borrows *write-ahead logging* from databases. Before touching the real structures, write a description of the whole update to a reserved area, the **journal**. Once that description is safely on disk, apply it. After a crash, recovery reads the journal and redoes any complete transaction. Incomplete ones are ignored, because none of their changes reached their real locations yet.",
        },
        {
          type: 'p',
          text: "In **data journaling** the transaction holds copies of all the blocks: a begin block (TxB), the new inode, bitmap **and data**, then an end block (TxE). That is safe but writes every byte of file data twice. Most systems therefore use **ordered (metadata) journaling**, the ext4 default (`data=ordered`): data blocks go straight to their final locations *before* the metadata that points to them commits, and only metadata goes through the journal:",
        },
        {
          "type": "algo",
          "view": "array",
          "interval": 1600,
          "caption": "Appending a block under ordered (metadata) journaling, the default mode of ext4. Cells 0–3 are the journal; 4–6 are the blocks' final locations.",
          "code": "write(D -> final location)     // data first\nwrite(TxB, I', B' -> journal)\nbarrier()   // wait until both are on disk\nwrite(TxE -> journal)          // commit point\ncheckpoint(I', B' -> final)\nfree(transaction)",
          "frames": [
            {
              "note": "Appending one block needs three updates: the data block **D**, the inode **I** (new size and pointer) and the data bitmap **B**. The journal (cells 0–3) is empty.",
              "array": [
                "·",
                "·",
                "·",
                "·",
                "I v1",
                "B v1",
                "free"
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "vars": [
                [
                  "committed",
                  "no"
                ],
                [
                  "after a crash",
                  "old file, consistent"
                ]
              ]
            },
            {
              "note": "Ordered mode writes the **data** to its final, still-free block first. Nothing points to it yet, so a crash now loses nothing.",
              "array": [
                "·",
                "·",
                "·",
                "·",
                "I v1",
                "B v1",
                "D"
              ],
              "marks": [
                {
                  "index": 6,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                1
              ],
              "vars": [
                [
                  "committed",
                  "no"
                ],
                [
                  "after a crash",
                  "old file, consistent"
                ]
              ]
            },
            {
              "note": "At the same time, write the transaction-begin block and the **new** inode and bitmap into the journal.",
              "array": [
                "TxB",
                "I v2",
                "B v2",
                "·",
                "I v1",
                "B v1",
                "D"
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
                  "index": 6,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                2
              ],
              "vars": [
                [
                  "committed",
                  "no"
                ],
                [
                  "after a crash",
                  "old file, consistent"
                ]
              ]
            },
            {
              "note": "Wait until all of these are durable (a cache flush). The disk may have written them in any order, so we cannot commit yet.",
              "array": [
                "TxB",
                "I v2",
                "B v2",
                "·",
                "I v1",
                "B v1",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "green"
                },
                {
                  "index": 1,
                  "color": "green"
                },
                {
                  "index": 2,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                3
              ],
              "vars": [
                [
                  "committed",
                  "no"
                ],
                [
                  "after a crash",
                  "replay skips it: no TxE"
                ]
              ]
            },
            {
              "note": "Write **TxE**, a single sector the disk writes atomically. The instant it is on disk, the transaction is committed.",
              "array": [
                "TxB",
                "I v2",
                "B v2",
                "TxE",
                "I v1",
                "B v1",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "green"
                },
                {
                  "index": 1,
                  "color": "green"
                },
                {
                  "index": 2,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 3,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                4
              ],
              "vars": [
                [
                  "committed",
                  "yes"
                ],
                [
                  "after a crash",
                  "replay I v2, B v2"
                ]
              ]
            },
            {
              "note": "**Checkpoint**: copy the new inode and bitmap to their real homes. A crash mid-way is fine: recovery just replays the journal again.",
              "array": [
                "TxB",
                "I v2",
                "B v2",
                "TxE",
                "I v2",
                "B v2",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "color": "green"
                },
                {
                  "index": 1,
                  "color": "green"
                },
                {
                  "index": 2,
                  "color": "green"
                },
                {
                  "index": 3,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                },
                {
                  "index": 4,
                  "color": "orange"
                },
                {
                  "index": 5,
                  "color": "orange"
                }
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                5
              ],
              "vars": [
                [
                  "committed",
                  "yes"
                ],
                [
                  "after a crash",
                  "replay (harmless)"
                ]
              ]
            },
            {
              "note": "Mark the transaction free in the journal superblock so the space can be reused. The append is complete.",
              "array": [
                "TxB",
                "I v2",
                "B v2",
                "TxE",
                "I v2",
                "B v2",
                "D"
              ],
              "marks": [
                {
                  "index": 4,
                  "color": "green"
                },
                {
                  "index": 5,
                  "color": "green"
                },
                {
                  "index": 6,
                  "color": "green"
                }
              ],
              "dim": [
                0,
                1,
                2,
                3
              ],
              "pointers": [
                {
                  "index": 0,
                  "label": "journal",
                  "color": "purple"
                },
                {
                  "index": 4,
                  "label": "final",
                  "color": "blue"
                }
              ],
              "lines": [
                6
              ],
              "vars": [
                [
                  "committed",
                  "yes"
                ],
                [
                  "after a crash",
                  "new file, consistent"
                ]
              ]
            }
          ]
        },
        {
          type: 'p',
          text: "Two details make it work. First, TxE is written **only after** everything else in the transaction is durable; if all the blocks were sent together, the disk could write TxE first and a crash would make garbage look committed. Second, TxE fits in **one sector**, which the disk writes atomically (remember the atomic-sector guarantee from the I/O devices lesson), so a transaction is either committed or not, never half.",
        },
        {
          type: 'table',
          headers: ['ext4 mode', 'Goes through the journal', 'Guarantee after a crash'],
          rows: [
            ['`data=journal`', 'Metadata and data', 'Files and metadata are consistent; data written twice'],
            ['`data=ordered` (default)', 'Metadata; data is written first', 'Metadata consistent and never points to garbage'],
            ['`data=writeback`', 'Metadata only, data in any order', 'Metadata consistent, but files may contain stale data'],
          ],
        },
        {
          type: 'p',
          text: "Recovery is fast because it reads only the journal (by default at most 1 GiB on ext4), not the whole disk. To amortise the cost of commits, ext4 groups many updates into one transaction and commits every 5 seconds by default (or when `fsync` forces it). NTFS journals metadata in its `$LogFile`; XFS, JFS and Apple's HFS+ journal too.",
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'order',
      prompt: 'Put the steps of appending a block under ordered (metadata) journaling in order.',
      linesAreCode: false,
      lines: [
        'Write the data block to its final location and write TxB, the new inode and the new bitmap into the journal, then wait until all are on disk',
        'Write the TxE commit block into the journal',
        'Checkpoint: write the new inode and bitmap to their final locations',
        'Mark the transaction as free in the journal superblock',
      ],
      distractors: ['Write TxB, the metadata and TxE in one request so the transaction commits faster'],
      explanation: "The data write and the journal writes may run in parallel, but both must be durable **before** the commit, so no committed metadata can ever point to unwritten data. TxE is the commit point; only then is it safe to overwrite the real inode and bitmap, because a crash during checkpointing is repaired by replaying the journal. Freeing the transaction comes last. Sending TxE together with the other blocks is the classic mistake: the disk may write TxE first, and a crash would then make an incomplete transaction look valid.",
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'concept',
      title: 'Copy-on-write: never overwrite anything',
      blocks: [
        {
          type: 'p',
          text: "Journaling writes metadata twice. A [[cow-file-system|copy-on-write file system]] avoids the second write by never updating a block in place, the file-system cousin of [[copy-on-write]] pages after `fork`. To change a data block, it writes a **new** block elsewhere, then a new copy of the pointer block that refers to it, then of *its* parent, all the way up the tree to a new root. Finally it overwrites one small, fixed location (ZFS calls it the *uberblock*) to point at the new root. That single atomic write is the commit: before it, the whole old tree is intact; after it, the whole new one.",
        },
        {
          type: 'list',
          items: [
            '**Snapshots are nearly free.** Keep a pointer to an old root and you have a frozen, consistent copy of the entire file system; unchanged blocks are shared between versions. Btrfs, ZFS, APFS and Windows\' ReFS all build snapshots this way.',
            '**Checksums fit naturally.** Since every pointer is rewritten anyway, ZFS stores a checksum of each child next to the pointer to it (Btrfs keeps checksums in block headers and a checksum tree), so silently corrupted blocks are detected on read.',
            '**The cost is fragmentation and write amplification.** A small overwrite in the middle of a big file moves that block elsewhere, so files that are rewritten in place (databases, VM disk images) scatter over time.',
          ],
        },
        {
          type: 'p',
          text: "Taken to the extreme, a file system can treat the whole disk as one append-only log: the *log-structured file system* (LFS, 1991), and today F2FS on Android phones. It is no coincidence that this suits flash: the SSD's own flash translation layer is a log-structured system inside the drive, for exactly the reason that flash cannot overwrite in place.",
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Consoles and save data',
          text: "You rarely choose a file system for a game, but you inherit its guarantees. Whatever the platform underneath, the safe-save recipe from the previous lesson works because every one of these designs makes `rename` (or the platform's save-container commit) atomic and durable after a flush. Journaling or copy-on-write protects the file system's *own* structures; protecting *your* data is still your job.",
        },
      ],
    },
    // ------------------------------------------------------------------ 17
    {
      kind: 'truefalse',
      prompt: 'Taking a snapshot of a 2 TB copy-on-write file system (such as Btrfs or ZFS) takes time and space proportional to the 2 TB of data, because every block must be copied.',
      answer: false,
      explanation: "A snapshot is just a saved pointer to the current root of the tree, so it takes about as long as one metadata write. Both versions share every block that has not changed. Space is consumed only later, as new writes create new blocks while the snapshot keeps the old ones alive. This is why CoW file systems can take snapshots every few minutes, and why build servers and backup systems love them.",
    },
    // ------------------------------------------------------------------ 18
    {
      kind: 'mcq',
      prompt: 'A server crashes. Which approach brings its 20 TB ext4 volume back to a consistent state fastest, and why?',
      options: [
        { text: 'A full fsck, because it checks every structure', why: 'fsck must read every inode, directory and bitmap: time proportional to the volume, potentially hours for 20 TB.' },
        { text: 'Journal replay, because it reads only the journal and redoes committed transactions', correct: true, why: 'Recovery time depends on the size of the journal (by default at most 1 GiB), not on the size of the disk.' },
        { text: 'Neither: ext4 cannot become inconsistent', why: 'Without the journal, an ext4 crash could leave exactly the inconsistencies in the table above. The journal is what prevents them.' },
        { text: 'Reformatting and restoring from a snapshot', why: 'ext4 has no built-in snapshots, and restoring 20 TB would take far longer than either repair method.' },
      ],
      explanation: "Journaling changed recovery from O(size of disk) to O(size of recent activity). That trade, a little extra writing during normal operation for near-instant recovery, is why every mainstream file system since the late 1990s journals or uses copy-on-write. fsck is still run occasionally to catch corruption from hardware faults or bugs, which no journal can prevent.",
    },
  ],
  takeaways: [
    'A file system stores a superblock, inode and data bitmaps, an inode table and a data region; an inode number is an index, so finding an inode is arithmetic.',
    'Inodes hold metadata and a block index but no name: 12 direct pointers plus single, double and triple indirect blocks give small files fast access and large files one extra read per level.',
    'Extents (start, length) replace per-block pointers in ext4 and NTFS; FAT\'s linked list makes random access slow and has no journal.',
    'Directories are files mapping names to inode numbers; resolving a path costs an inode read and a directory read per component, which the dentry and inode caches eliminate when warm.',
    'One update touches several blocks, and a crash can leave any subset written; fsck repairs structure slowly and cannot detect garbage data.',
    'Journaling writes a transaction (TxB, blocks, then TxE in one atomic sector) before checkpointing it; ordered mode, the ext4 default, writes data before committing metadata.',
    'Copy-on-write file systems never overwrite in place and commit by switching a root pointer, which gives cheap snapshots and checksums at the cost of fragmentation.',
  ],
  reading: [
    {
      title: 'OSTEP chapter 40: File System Implementation',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf',
      source: 'book',
      note: 'The vsfs layout, inodes, multi-level indexes and the I/O timelines for reading and creating files.',
    },
    {
      title: 'OSTEP chapter 42: Crash Consistency: FSCK and Journaling',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf',
      source: 'book',
      note: 'All the crash scenarios, data vs metadata journaling, and why TxE must be written separately.',
    },
    {
      title: 'OSTEP chapter 43: Log-structured File Systems',
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-lfs.pdf',
      source: 'book',
      note: 'Never overwriting in place, taken to its logical conclusion; the ancestor of copy-on-write designs.',
    },
    {
      title: 'ext4 Data Structures and Algorithms (kernel.org)',
      url: 'https://docs.kernel.org/filesystems/ext4/index.html',
      source: 'other',
      note: 'The real on-disk format: block groups, inodes, extent trees, htree directories and the journal.',
    },
    {
      title: 'inode(7) — Linux manual page',
      url: 'https://man7.org/linux/man-pages/man7/inode.7.html',
      source: 'other',
      note: 'Every field of an inode as seen through stat, including link counts and timestamps.',
    },
  ],
};
