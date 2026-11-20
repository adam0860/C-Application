import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-gpu-architecture',
  title: 'GPU Architecture',
  summary: 'Why GPUs trade latency for throughput: SIMT warps, streaming multiprocessors, divergence, memory coalescing, and how the CPU feeds the GPU in a game frame.',
  minutes: 20,
  objectives: [
    'Explain why GPUs are built for throughput and hide latency with thousands of threads instead of caches and speculation',
    'Describe SIMT execution: warps and wavefronts, streaming multiprocessors and compute units, and occupancy',
    'Predict the cost of branch divergence within a warp and of uncoalesced memory access',
    'Describe the CPU–GPU split in a frame: command buffers, draw calls and frames in flight',
    'Recognize which game workloads belong in compute shaders',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Why GPUs exist',
      blocks: [
        {
          type: 'p',
          text: 'A 4K frame has 8.3 million pixels. Shading each one means running the same small program (sample a few textures, do some lighting math) with different inputs, and the pixels barely depend on each other. Do that 60 times a second and you need hundreds of billions of simple operations per second, with almost no branching between them and enormous amounts of independent work.',
        },
        {
          type: 'p',
          text: 'A CPU core is the wrong shape for that job. Most of its silicon goes into making **one** thread fast: big caches to avoid waiting on memory, branch predictors, out-of-order windows of hundreds of instructions, speculative execution. A GPU spends its silicon the other way: as many simple arithmetic lanes as possible, and just enough control logic to keep them fed.',
        },
        {
          type: 'table',
          headers: ['Feature', 'Desktop CPU', 'High-end GPU (e.g. RTX 4090)', 'PS5 GPU'],
          rows: [
            ['Cores / multiprocessors', '8–24 cores', '128 SMs', '36 compute units'],
            ['FP32 lanes', '~8–32 per core (SIMD units)', '16,384', '2,304'],
            ['Memory bandwidth', '~60–100 GB/s (DDR5)', '~1 TB/s (GDDR6X)', '448 GB/s (GDDR6, shared with the CPU)'],
            ['Designed for', 'Latency of one thread', 'Throughput of many threads', 'Throughput of many threads'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just a CPU with more cores?',
          text: 'Out-of-order machinery, big caches and branch predictors cost area and power *per core*, and they only pay off when one thread must run fast. Graphics has so much independent work that you can instead hide each thread\'s delays behind other threads\' work. Dropping the latency machinery frees room for hundreds of times more arithmetic lanes per chip. The price: a single GPU thread is slow, and branchy, serial, pointer-chasing code runs badly.',
        },
        {
          type: 'p',
          text: 'The same trade-off you met for CPUs, latency versus throughput, is here taken to the extreme. Everything else in this lesson follows from it.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Throughput design: hide latency, do not avoid it',
      blocks: [
        {
          type: 'p',
          text: 'A load from GPU memory takes hundreds of cycles. A CPU fights that latency with caches, prefetchers and out-of-order execution. A GPU mostly accepts it and **switches to other work**: each multiprocessor keeps dozens of groups of threads resident at once, and every cycle its scheduler issues an instruction from any group whose operands are ready. While one group waits for memory, others compute.',
        },
        {
          type: 'p',
          text: 'Switching is free because nothing is saved or restored: every resident thread keeps its own registers in a huge on-chip **register file**, 256 KB per multiprocessor on NVIDIA\'s Ampere, many times larger than its L1 cache. Compare an operating-system context switch on a CPU, which saves and restores a thread\'s registers and typically costs microseconds.',
        },
        {
          type: 'definition',
          term: 'Little\'s law, applied',
          text: 'To keep a unit busy, the number of operations in flight must be at least **latency × throughput**. If a memory access takes 400 cycles and each group of threads does 10 cycles of math between accesses, the scheduler needs about 400 / 10 = 40 other groups ready to run to hide one wait.',
        },
        {
          type: 'p',
          text: 'That is why GPU code wants *lots* of threads, far more than there are lanes, and why [[gpu-occupancy|occupancy]], the number of thread groups resident per multiprocessor, matters. Too few resident groups and the lanes sit idle during every memory access.',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A restaurant kitchen',
          text: 'A CPU is a master chef who prepares one dish at a time as fast as possible, prepping ahead and guessing the next order. A GPU is a kitchen of a hundred cooks working from the same recipe card: when one waits for the oven, another plates. No single dish comes out faster, but the kitchen serves a stadium.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'numeric',
      prompt: 'A shader\'s thread groups each do 20 cycles of math between memory loads, and a load takes 600 cycles. Using latency ÷ work per group, how many thread groups must a scheduler have ready to keep its lanes busy while one group waits?',
      answer: 30,
      alsoAccept: [31],
      unit: 'groups',
      explanation: '600 / 20 = **30** other groups, each contributing 20 cycles of work, cover the 600-cycle wait (31 counting the waiting group itself, so both are accepted). If the hardware can only hold, say, 16 groups because each uses many registers, the lanes go idle for part of every memory access, which is a low-occupancy, latency-bound shader. The fixes are to use fewer registers per thread, or to do more independent math per load.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'SIMT: threads that march in lockstep',
      blocks: [
        {
          type: 'p',
          text: 'You write GPU code for **one** thread: one pixel, one vertex, one particle. The hardware groups 32 consecutive threads into a [[gpu-warp|warp]] (NVIDIA\'s term) and runs them on 32 lanes with a single instruction stream. AMD calls the group a *wavefront*: 64 threads on its older GCN GPUs, 32 or 64 on RDNA, which is what PS5 and Xbox Series consoles use. This model is called [[simt]], single instruction, multiple threads.',
        },
        {
          type: 'code',
          lang: 'text',
          title: 'Heal.hlsl (a compute shader in HLSL)',
          code: `RWStructuredBuffer<float> hp : register(u0);

cbuffer Params : register(b0) {
    float healAmount;
    uint count;
};

[numthreads(64, 1, 1)]
void HealCS(uint3 id : SV_DispatchThreadID) {
    uint i = id.x;                 // this thread's index
    if (i >= count) return;        // last group may overhang
    hp[i] = min(hp[i] + healAmount, 100.0f);
}`,
          annotations: [
            { lines: 1, text: 'A read-write buffer in GPU memory, bound by the CPU before the dispatch.' },
            { lines: 8, text: 'Threads come in groups of 64. The CPU launches `ceil(count / 64)` groups; the hardware runs each group as two 32-wide warps (or one wave64 or two wave32 on AMD).' },
            { lines: 10, text: 'Each thread gets its own index and its own registers. The code is scalar, but 32 threads execute each instruction together.' },
            { lines: 11, text: 'A bounds check, because the thread count is rounded up to whole groups. Only the last group\'s overhanging threads take this exit.' },
          ],
        },
        {
          type: 'p',
          text: 'Compare this with the SSE code from the CPU lessons. There, *you* packed four floats into a register and wrote `_mm_add_ps`. Here, the compiler and hardware do the packing: each "thread" is really one lane of a 32-wide vector unit. The programming model looks like threads; the execution is SIMD.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why lockstep groups?',
          text: 'Fetching, decoding and scheduling an instruction costs about as much energy as executing it. Sharing one instruction among 32 lanes divides that overhead by 32, which is a large part of how GPUs get so much arithmetic per watt. The cost is that the 32 threads of a warp are not truly independent, as the divergence card shows.',
        },
        {
          type: 'deepdive',
          title: 'Independent thread scheduling',
          blocks: [
            {
              type: 'p',
              text: 'Since the Volta generation (2017), NVIDIA GPUs keep a program counter per thread, so threads of one warp may diverge and reconverge more flexibly and can even wait on each other without deadlocking. Divergent paths still execute one after the other on the shared lanes, so the performance model in this lesson still holds.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Inside a streaming multiprocessor',
      blocks: [
        {
          type: 'p',
          text: 'The building block of a GPU is the [[streaming-multiprocessor]] (NVIDIA) or *compute unit* (AMD). A big GPU is dozens of them sharing an L2 cache and the memory controllers. Each one is a small throughput machine:',
        },
        {
  "type": "figure",
  "svg": "<svg viewBox=\"0 0 520 462\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\">\n<rect x=\"10\" y=\"10\" width=\"500\" height=\"352\" rx=\"10\" stroke-width=\"2\"/>\n<text x=\"260\" y=\"32\" text-anchor=\"middle\" font-size=\"15\" font-weight=\"700\" stroke=\"none\">Streaming Multiprocessor (SM)</text>\n<rect x=\"24\" y=\"42\" width=\"472\" height=\"24\" rx=\"5\" class=\"s-gray\"/>\n<text x=\"260\" y=\"59\" text-anchor=\"middle\" font-size=\"12\" stroke=\"none\">Instruction cache</text>\n<rect x=\"24\" y=\"74\" width=\"234\" height=\"114\" rx=\"7\" class=\"s-gray\"/>\n<rect x=\"32\" y=\"82\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-orange\"/>\n<text x=\"141.0\" y=\"96\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">Warp scheduler + dispatch</text>\n<rect x=\"32\" y=\"108\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-purple\"/>\n<text x=\"141.0\" y=\"122\" text-anchor=\"middle\" font-size=\"11\" class=\"t-purple\" stroke=\"none\">Register file (64 KB)</text>\n<rect x=\"32.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"32.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"43.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"43.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"55.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"55.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"66.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"66.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"78.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"78.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"90.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"90.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"101.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"101.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"113.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"113.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"124.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"124.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"136.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"136.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"148.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"148.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"159.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"159.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"171.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"171.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"182.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"182.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"194.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"194.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"206.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"206.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<text x=\"141.0\" y=\"171\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-blue\" stroke=\"none\">32 FP32 lanes (16 also do INT32)</text>\n<text x=\"141.0\" y=\"183\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">+ load/store and special-function units</text>\n<rect x=\"262\" y=\"74\" width=\"234\" height=\"114\" rx=\"7\" class=\"s-gray\"/>\n<rect x=\"270\" y=\"82\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-orange\"/>\n<text x=\"379.0\" y=\"96\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">Warp scheduler + dispatch</text>\n<rect x=\"270\" y=\"108\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-purple\"/>\n<text x=\"379.0\" y=\"122\" text-anchor=\"middle\" font-size=\"11\" class=\"t-purple\" stroke=\"none\">Register file (64 KB)</text>\n<rect x=\"270.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"270.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"281.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"281.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"293.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"293.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"304.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"304.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"316.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"316.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"328.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"328.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"339.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"339.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"351.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"351.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"362.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"362.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"374.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"374.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"386.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"386.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"397.6\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"397.6\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"409.2\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"409.2\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"420.8\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"420.8\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"432.4\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"432.4\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"444.0\" y=\"134\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"444.0\" y=\"146\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<text x=\"379.0\" y=\"171\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-blue\" stroke=\"none\">32 FP32 lanes (16 also do INT32)</text>\n<text x=\"379.0\" y=\"183\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">+ load/store and special-function units</text>\n<rect x=\"24\" y=\"196\" width=\"234\" height=\"114\" rx=\"7\" class=\"s-gray\"/>\n<rect x=\"32\" y=\"204\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-orange\"/>\n<text x=\"141.0\" y=\"218\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">Warp scheduler + dispatch</text>\n<rect x=\"32\" y=\"230\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-purple\"/>\n<text x=\"141.0\" y=\"244\" text-anchor=\"middle\" font-size=\"11\" class=\"t-purple\" stroke=\"none\">Register file (64 KB)</text>\n<rect x=\"32.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"32.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"43.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"43.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"55.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"55.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"66.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"66.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"78.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"78.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"90.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"90.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"101.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"101.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"113.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"113.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"124.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"124.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"136.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"136.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"148.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"148.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"159.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"159.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"171.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"171.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"182.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"182.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"194.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"194.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"206.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"206.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<text x=\"141.0\" y=\"293\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-blue\" stroke=\"none\">32 FP32 lanes (16 also do INT32)</text>\n<text x=\"141.0\" y=\"305\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">+ load/store and special-function units</text>\n<rect x=\"262\" y=\"196\" width=\"234\" height=\"114\" rx=\"7\" class=\"s-gray\"/>\n<rect x=\"270\" y=\"204\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-orange\"/>\n<text x=\"379.0\" y=\"218\" text-anchor=\"middle\" font-size=\"11\" class=\"t-orange\" stroke=\"none\">Warp scheduler + dispatch</text>\n<rect x=\"270\" y=\"230\" width=\"218\" height=\"20\" rx=\"4\" class=\"s-purple\"/>\n<text x=\"379.0\" y=\"244\" text-anchor=\"middle\" font-size=\"11\" class=\"t-purple\" stroke=\"none\">Register file (64 KB)</text>\n<rect x=\"270.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"270.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"281.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"281.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"293.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"293.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"304.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"304.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"316.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"316.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"328.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"328.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"339.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"339.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"351.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"351.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"362.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"362.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"374.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"374.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"386.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"386.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"397.6\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"397.6\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"409.2\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"409.2\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"420.8\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"420.8\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"432.4\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"432.4\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"444.0\" y=\"256\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<rect x=\"444.0\" y=\"268\" width=\"9\" height=\"9\" rx=\"1.5\" class=\"s-blue f-blue\" fill-opacity=\"0.25\"/>\n<text x=\"379.0\" y=\"293\" text-anchor=\"middle\" font-size=\"10.5\" class=\"t-blue\" stroke=\"none\">32 FP32 lanes (16 also do INT32)</text>\n<text x=\"379.0\" y=\"305\" text-anchor=\"middle\" font-size=\"10\" class=\"t-gray\" stroke=\"none\">+ load/store and special-function units</text>\n<rect x=\"24\" y=\"320\" width=\"330\" height=\"30\" rx=\"5\" class=\"s-green\"/>\n<text x=\"189\" y=\"339\" text-anchor=\"middle\" font-size=\"12\" class=\"t-green\" stroke=\"none\">L1 data cache / shared memory (128 KB)</text>\n<rect x=\"362\" y=\"320\" width=\"134\" height=\"30\" rx=\"5\" class=\"s-teal\"/>\n<text x=\"429\" y=\"339\" text-anchor=\"middle\" font-size=\"12\" class=\"t-teal\" stroke=\"none\">Texture units</text>\n<line x1=\"260\" y1=\"362\" x2=\"260\" y2=\"380\"/>\n<path d=\"M255 376 L260 384 L265 376 Z\" fill=\"currentColor\" stroke=\"none\"/>\n<rect x=\"60\" y=\"386\" width=\"400\" height=\"26\" rx=\"5\" class=\"s-green\"/>\n<text x=\"260\" y=\"403\" text-anchor=\"middle\" font-size=\"12\" stroke=\"none\">L2 cache, shared by all SMs</text>\n<line x1=\"260\" y1=\"412\" x2=\"260\" y2=\"426\"/>\n<path d=\"M255 422 L260 430 L265 422 Z\" fill=\"currentColor\" stroke=\"none\"/>\n<rect x=\"60\" y=\"432\" width=\"400\" height=\"26\" rx=\"5\" class=\"s-red\"/>\n<text x=\"260\" y=\"449\" text-anchor=\"middle\" font-size=\"12\" stroke=\"none\">VRAM (GDDR6 / GDDR6X): hundreds of GB/s</text>\n</svg>",
  "alt": "Block diagram of a GPU streaming multiprocessor: an instruction cache, four partitions each with a warp scheduler, a 64 KB register file and 32 FP32 lanes, a shared L1/shared-memory block and texture units, connected below to a chip-wide L2 cache and then VRAM.",
  "caption": "One SM, modeled on NVIDIA Ampere (GA10x). Big GPUs have dozens of SMs; AMD calls the equivalent block a compute unit."
},
        {
          type: 'list',
          items: [
            '**Warp schedulers:** each picks a ready warp every cycle and issues its next instruction. Four schedulers per SM in this design.',
            '**Register file:** 64 KB per partition, 256 KB per SM: 65,536 32-bit registers shared among all resident threads.',
            '**ALU lanes:** the arithmetic units. On Ampere, each partition has 32 FP32 lanes, half of which can also do integer math, plus load/store and special-function units (sin, rsqrt).',
            '**L1 / shared memory:** 128 KB of fast on-chip memory, split between an L1 cache and *shared memory* that threads in one group can explicitly read and write to cooperate.',
          ],
        },
        {
          type: 'p',
          text: 'Registers are the scarce resource that sets occupancy. Every resident thread needs all of its registers in the file at once, so the more registers a shader uses, the fewer threads fit. On Ampere\'s consumer GPUs an SM holds at most 48 warps (1,536 threads): a shader using 32 registers per thread fits all 48, while one using 64 registers fits only 65,536 / 64 = 1,024 threads, 32 warps.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'More registers is not always worse',
          text: 'Lower occupancy hurts only if there are not enough ready warps to hide latency. A shader that does lots of independent math per memory access can run at full speed with few warps, and using more registers to keep values on chip can beat spilling them to memory. GPU profilers such as PIX, Nsight and Radeon GPU Profiler report occupancy and *why* it is limited, so you can decide with data.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'numeric',
      prompt: 'An SM has 65,536 registers and holds at most 48 warps of 32 threads. A shader needs 80 registers per thread. Ignoring allocation granularity, how many full warps fit on one SM?',
      hint: 'First find how many threads fit in the register file, then divide by 32 and round down.',
      answer: 25,
      unit: 'warps',
      explanation: '65,536 / 80 = 819.2 threads, so 819 threads, which is 819 / 32 = 25.6, so **25** full warps. That is 25 / 48 ≈ 52% occupancy. (Real hardware allocates registers in chunks, so the true number can be a little lower; the profiler shows the exact figure.) Getting the shader down to 64 registers would allow 32 warps.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Divergence: when a warp disagrees',
      blocks: [
        {
          type: 'p',
          text: 'All 32 threads of a warp share one instruction stream. So what happens at an `if` where some threads go one way and some the other? The warp executes **both** paths, one after the other, with an *active mask* that switches off the lanes that did not take the current path. This is [[warp-divergence]]. Step through a warp (drawn with 8 lanes) running a heal-or-decay branch:',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 1500,
  "caption": "One warp, drawn with 8 lanes instead of 32. Cells are each lane's `hp`. Lanes under a mask are faded: they occupy their slot but do no useful work.",
  "code": "float v = hp[lane];\nif (v < 50.0f) {\n    v = heal(v);    // 20 instrs\n} else {\n    v = decay(v);   // 10 instrs\n}\nhp[lane] = v;",
  "frames": [
    {
      "note": "Divergent warp: every lane loads its own `hp` value. One instruction, issued once, executed by all 8 lanes.",
      "array": [
        80,
        30,
        45,
        90,
        10,
        60,
        35,
        70
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
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "orange"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "active",
          "8/8"
        ],
        [
          "issued",
          "1"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "The comparison runs in all lanes. 4 lanes (blue) want the `if` path, 4 want the `else` path.",
      "array": [
        80,
        30,
        45,
        90,
        10,
        60,
        35,
        70
      ],
      "marks": [
        {
          "index": 0,
          "color": "gray"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "gray"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "gray"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "gray"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "mask",
          "01101010"
        ],
        [
          "issued",
          "2"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "The warp runs the `if` path with the mask on: only the blue lanes write results; the others sit idle for all 20 instructions.",
      "array": [
        80,
        55,
        70,
        90,
        35,
        60,
        60,
        70
      ],
      "marks": [
        {
          "index": 1,
          "color": "orange"
        },
        {
          "index": 2,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        }
      ],
      "dim": [
        0,
        3,
        5,
        7
      ],
      "lines": [
        3
      ],
      "vars": [
        [
          "active",
          "4/8"
        ],
        [
          "issued",
          "22"
        ],
        [
          "lane use",
          "55%"
        ]
      ]
    },
    {
      "note": "Then it runs the `else` path with the mask flipped. The two paths are serialized: their costs add up.",
      "array": [
        75,
        55,
        70,
        85,
        35,
        55,
        60,
        65
      ],
      "marks": [
        {
          "index": 0,
          "color": "orange"
        },
        {
          "index": 3,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "orange"
        }
      ],
      "dim": [
        1,
        2,
        4,
        6
      ],
      "lines": [
        5
      ],
      "vars": [
        [
          "active",
          "4/8"
        ],
        [
          "issued",
          "32"
        ],
        [
          "lane use",
          "53%"
        ]
      ]
    },
    {
      "note": "The lanes reconverge and store together. Total: 33 instructions issued, lanes busy 55% of the time.",
      "array": [
        75,
        55,
        70,
        85,
        35,
        55,
        60,
        65
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
        },
        {
          "index": 7,
          "color": "green"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "active",
          "8/8"
        ],
        [
          "issued",
          "33"
        ],
        [
          "lane use",
          "55%"
        ]
      ]
    },
    {
      "note": "Coherent warp: every lane loads its own `hp` value. One instruction, issued once, executed by all 8 lanes.",
      "array": [
        20,
        30,
        45,
        10,
        35,
        40,
        25,
        15
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
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "orange"
        }
      ],
      "lines": [
        1
      ],
      "vars": [
        [
          "active",
          "8/8"
        ],
        [
          "issued",
          "1"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "The comparison runs in all lanes. 8 lanes (blue) want the `if` path, 0 want the `else` path.",
      "array": [
        20,
        30,
        45,
        10,
        35,
        40,
        25,
        15
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
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        }
      ],
      "lines": [
        2
      ],
      "vars": [
        [
          "mask",
          "11111111"
        ],
        [
          "issued",
          "2"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "Every lane takes the `if` path, so the warp runs it once with all lanes busy.",
      "array": [
        45,
        55,
        70,
        35,
        60,
        65,
        50,
        40
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
          "index": 3,
          "color": "orange"
        },
        {
          "index": 4,
          "color": "orange"
        },
        {
          "index": 5,
          "color": "orange"
        },
        {
          "index": 6,
          "color": "orange"
        },
        {
          "index": 7,
          "color": "orange"
        }
      ],
      "dim": [],
      "lines": [
        3
      ],
      "vars": [
        [
          "active",
          "8/8"
        ],
        [
          "issued",
          "22"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "No lane needs the `else` path, so the warp skips it entirely: a uniform branch costs nothing extra.",
      "array": [
        45,
        55,
        70,
        35,
        60,
        65,
        50,
        40
      ],
      "marks": [],
      "lines": [
        4,
        5,
        6
      ],
      "vars": [
        [
          "active",
          "0/8"
        ],
        [
          "issued",
          "22"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    },
    {
      "note": "The lanes reconverge and store together. Total: 23 instructions issued, lanes busy 100% of the time.",
      "array": [
        45,
        55,
        70,
        35,
        60,
        65,
        50,
        40
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
        },
        {
          "index": 7,
          "color": "green"
        }
      ],
      "lines": [
        7
      ],
      "vars": [
        [
          "active",
          "8/8"
        ],
        [
          "issued",
          "23"
        ],
        [
          "lane use",
          "100%"
        ]
      ]
    }
  ]
},
        {
          type: 'code',
          runnable: true,
          title: 'warp_divergence.cpp',
          code: `#include <bitset>
#include <cstdint>
#include <cstdio>

// Model one 32-lane warp running:
//   if (hp < 50) { heal: 20 instructions }
//   else         { decay: 10 instructions }
// The warp issues each instruction once for all its lanes;
// lanes whose mask bit is 0 sit idle for that instruction.
struct Result { int issued, useful; };

Result run(std::uint32_t takenMask) {
    std::bitset<32> taken(takenMask);
    int issued = 0, useful = 0;
    if (taken.any()) {                      // then-path
        issued += 20;
        useful += 20 * static_cast<int>(taken.count());
    }
    if ((~taken).any()) {                   // else-path
        issued += 10;
        useful += 10 * static_cast<int>((~taken).count());
    }
    return {issued, useful};
}

void report(const char* name, std::uint32_t mask) {
    Result r = run(mask);
    std::printf("%-12s issued %2d  lane use %5.1f%%\\n", name,
                r.issued, 100.0 * r.useful / (32 * r.issued));
}

int main() {
    report("all heal", 0xFFFFFFFFu);
    report("all decay", 0x00000000u);
    report("alternating", 0x55555555u);
    report("one lane", 0x00000001u);
}`,
          output: `all heal     issued 20  lane use 100.0%
all decay    issued 10  lane use 100.0%
alternating  issued 30  lane use  50.0%
one lane     issued 30  lane use  34.4%`,
          annotations: [
            { lines: '15-18', text: 'If any lane wants the `if` path, the whole warp spends 20 issue slots on it.' },
            { lines: '19-22', text: 'If any lane wants the `else` path, the warp spends another 10. Divergent paths add up instead of overlapping.' },
            { lines: '33-34', text: 'Uniform branches cost only the path taken: a branch that every lane agrees on is free.' },
            { lines: 36, text: 'One stubborn lane forces 31 lanes to sit through the whole `if` path: the warp pays 30 issue slots for what is mostly 10-instruction work.' },
          ],
        },
        {
          type: 'p',
          text: 'What matters is not whether a shader branches, but whether threads **in the same warp** disagree. A branch on a per-draw constant (a material flag) or on something that varies smoothly across the screen (most neighboring pixels agree) is cheap. A branch on per-pixel noise, or on which of many materials a ray hit, can halve throughput or worse. Engines respond by sorting or binning work so that neighbors agree: for example, deferred renderers classify screen tiles by which lighting paths they need, and ray tracers can sort hits by material.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'Four compute shaders each contain one `if` with a 50-instruction body and no `else`. In which one does the branch waste the most lane time?',
      options: [
        { text: '`if (materialFlags & kSnow)`, where `materialFlags` is a constant for the whole dispatch', why: 'Every lane of every warp sees the same value, so each warp either runs the body with all lanes or skips it. No divergence.' },
        { text: '`if (groupIndex == 0)`, where only the first group of the dispatch takes the branch', why: 'All threads of a group share `groupIndex`, so every warp is uniform: one group\'s warps run the body fully, the rest skip it.' },
        { text: '`if (threadIndex % 2 == 0)`, true for every other thread', correct: true, why: 'Every warp contains both even and odd threads, so every warp runs the 50 instructions with half its lanes masked off: the worst case for this branch.' },
        { text: '`if (pixel.y < screenHeight / 2)`, true for the top half of the screen', why: 'Warps usually cover small, compact blocks of pixels, so only the few warps straddling the middle row diverge. Nearly all warps are uniform.' },
      ],
      explanation: 'Divergence is about agreement **within a warp**. Branches on constants, group indices or smoothly varying screen position give uniform warps almost everywhere. A condition that alternates between neighboring threads splits every warp, so every warp pays for the body while half its lanes idle.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'GPU memory: coalescing and the hierarchy',
      blocks: [
        {
          type: 'p',
          text: 'When a warp executes a load, its 32 threads each supply an address. The memory system does not serve 32 separate requests; it gathers the addresses and fetches the 32-byte **sectors** (parts of 128-byte [[cache-line|cache lines]]) that contain them. If the 32 addresses are consecutive, a handful of sectors serve the whole warp: the access is *coalesced*. If they are scattered, the warp needs up to 32 separate sectors and wastes most of each one. This is [[memory-coalescing]]:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'coalescing.cpp',
          code: `#include <cstdint>
#include <cstdio>
#include <set>

// How many 32-byte memory sectors does one warp touch
// when each of its 32 threads loads one float?
template <class AddrOf>
int sectors(AddrOf addrOf) {
    std::set<std::uint64_t> touched;
    for (int lane = 0; lane < 32; ++lane)
        touched.insert(addrOf(lane) / 32);
    return static_cast<int>(touched.size());
}

int main() {
    const std::uint64_t base = 0x10000;     // 128-B aligned
    // SoA: thread i reads x[i] (4-byte stride)
    int soa = sectors([&](int i) { return base + 4 * i; });
    // AoS: thread i reads particles[i].x, 32-byte struct
    int aos = sectors([&](int i) { return base + 32 * i; });
    // Gather: thread i reads x[(i * 977) % 4096]
    int gather = sectors([&](int i) {
        return base + 4 * ((i * 977) % 4096);
    });
    std::printf("useful bytes: %d\\n", 32 * 4);
    std::printf("SoA    %2d sectors = %4d bytes moved\\n", soa,
                soa * 32);
    std::printf("AoS    %2d sectors = %4d bytes moved\\n", aos,
                aos * 32);
    std::printf("gather %2d sectors = %4d bytes moved\\n",
                gather, gather * 32);
}`,
          output: `useful bytes: 128
SoA     4 sectors =  128 bytes moved
AoS    32 sectors = 1024 bytes moved
gather 32 sectors = 1024 bytes moved`,
          annotations: [
            { lines: '8-13', text: 'Collect the distinct 32-byte sectors the warp\'s 32 addresses fall into.' },
            { lines: 18, text: 'Consecutive floats: 128 bytes in 4 sectors, all used. One fully coalesced access.' },
            { lines: 20, text: 'One field of a 32-byte struct per thread: every thread lands in a different sector, so 8× the traffic for the same data. The [[structure-of-arrays|AoS-versus-SoA]] lesson from the CPU applies on the GPU too, more strongly.' },
            { lines: '22-24', text: 'A scattered gather: every address in its own sector. Lookups through index buffers or random textures cost this much.' },
          ],
        },
        {
          type: 'table',
          headers: ['Level', 'Scope', 'Roughly'],
          rows: [
            ['Registers', 'One thread', 'Fastest; 256 KB per SM in total, more than its L1'],
            ['Shared memory / L1', 'One SM (shared memory: one thread group)', 'Tens of cycles; 100+ KB per SM'],
            ['L2 cache', 'Whole GPU', 'A few hundred cycles; several MB, tens of MB on the newest GPUs'],
            ['VRAM (GDDR6/6X)', 'Whole GPU', 'Hundreds of cycles of latency, but hundreds of GB/s to ~1 TB/s of bandwidth'],
          ],
          caption: 'GPU memory hierarchy, from fastest to slowest. Exact sizes and latencies vary by generation and vendor.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Textures are special',
          text: 'Texture fetches go through dedicated texture units and caches tuned for 2D locality, and textures are usually stored *swizzled* (tiled) in memory so that pixels near each other on screen are near each other in memory, whichever direction the shader walks. That is why sampling neighboring texels from neighboring threads is cheap.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'Each of a warp\'s 32 threads loads one 16-byte `float4` from consecutive elements of an array that starts on a 128-byte boundary. How many 32-byte sectors does the warp\'s load touch?',
      answer: 16,
      unit: 'sectors',
      explanation: '32 threads × 16 bytes = 512 contiguous bytes, and 512 / 32 = **16 sectors**, every byte of them used. That is still a perfectly coalesced access, just a wider one. Compare reading only the `.x` of each `float4`: still 16 sectors, but only 128 of the 512 bytes useful, which is the AoS waste again.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'The CPU–GPU split in a game frame',
      blocks: [
        {
          type: 'p',
          text: 'The CPU does not draw anything. It **records commands** into a [[command-buffer]] in memory: bind this pipeline (shaders plus fixed-function state), bind these buffers and textures, draw this mesh, dispatch this compute shader, insert this barrier. Then it submits the buffer to a GPU queue, and the GPU executes it later, in order. Each "draw this mesh" is a [[draw-call]].',
        },
        {
          type: 'code',
          runnable: true,
          title: 'command_buffer.cpp',
          code: `#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <vector>

// A toy command buffer: the CPU records commands into
// memory; the GPU will execute them later, in order.
enum class Op : std::uint8_t { SetPipeline, Draw };
struct Cmd { Op op; std::uint32_t arg; };

struct DrawItem { std::uint32_t material, mesh; };

std::vector<Cmd> record(const std::vector<DrawItem>& items) {
    std::vector<Cmd> cmds;
    std::uint32_t bound = ~0u;              // nothing bound
    for (const DrawItem& d : items) {
        if (d.material != bound) {          // state change
            cmds.push_back({Op::SetPipeline, d.material});
            bound = d.material;
        }
        cmds.push_back({Op::Draw, d.mesh});
    }
    return cmds;
}

int countOps(const std::vector<Cmd>& cmds, Op op) {
    return static_cast<int>(std::count_if(cmds.begin(),
        cmds.end(), [op](const Cmd& c) { return c.op == op; }));
}

int main() {
    std::vector<DrawItem> scene;
    std::uint32_t s = 1;
    for (std::uint32_t mesh = 0; mesh < 2000; ++mesh) {
        s = s * 1103515245u + 12345u;       // fixed PRNG
        scene.push_back({(s >> 16) % 12, mesh});  // 12 mats
    }
    auto unsorted = record(scene);
    std::sort(scene.begin(), scene.end(),
              [](const DrawItem& a, const DrawItem& b) {
                  return a.material < b.material;
              });
    auto sorted = record(scene);
    std::printf("draws: %d\\n", countOps(sorted, Op::Draw));
    std::printf("pipeline changes, scene order: %d\\n",
                countOps(unsorted, Op::SetPipeline));
    std::printf("pipeline changes, sorted:      %d\\n",
                countOps(sorted, Op::SetPipeline));
}`,
          output: `draws: 2000
pipeline changes, scene order: 1807
pipeline changes, sorted:      12`,
          annotations: [
            { lines: '8-9', text: 'Real command buffers are packed binary formats defined by the driver, but the idea is the same: a list of small records in memory.' },
            { lines: '17-20', text: 'Only emit a state change when the material actually changes. Pipeline changes are among the more expensive commands for both the CPU and the GPU.' },
            { lines: '38-41', text: 'Sorting draws by material (real engines sort by a packed key: render pass, pipeline, material, depth) turns 1,807 state changes into 12.' },
          ],
        },
        {
          type: 'p',
          text: 'Modern APIs (Direct3D 12, Vulkan, and the console APIs) let several CPU threads record command buffers in parallel, one per pass or per chunk of the scene, which is how engines spread render submission across cores. Older APIs did much of this work inside the driver on one thread, which is why "too many draw calls" used to be a CPU bottleneck and why [[batching]] and instancing matter.',
        },
        {
          type: 'p',
          text: 'Because the GPU executes commands later, the CPU and GPU form a **pipeline across frames**: while the GPU renders frame *N*, the CPU is already simulating and recording frame *N + 1*. Engines usually allow one or two frames in flight, and fences tell the CPU when the GPU has finished with a buffer it wants to reuse, which is the same idea as [[double-buffering]].',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Reading results back stalls the pipeline',
          text: 'If the CPU needs a GPU result *this frame* (an occlusion query, a GPU physics result), it must wait for the GPU to catch up, draining the frames-in-flight pipeline. Engines either read results a frame or two late or keep the consumer on the GPU too, for example with indirect draws whose arguments a compute shader writes (GPU-driven rendering).',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'truefalse',
      prompt: 'When a Direct3D 12 or Vulkan draw command returns on the CPU, the GPU has finished drawing that mesh.',
      answer: false,
      explanation: 'Recording a draw only appends a few bytes to a command buffer in memory; nothing has been drawn. Even after submission the GPU runs the commands asynchronously, typically a frame or more behind the CPU. That asynchrony is the point: CPU and GPU work in parallel. To know when the GPU is done, you wait on a fence, and waiting too eagerly stalls both processors.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Compute shaders: the GPU as a coprocessor',
      blocks: [
        {
          type: 'p',
          text: 'Graphics shaders are fixed into the rendering pipeline: vertex shaders run per vertex, pixel shaders per pixel. A [[compute-shader]] is a general data-parallel kernel: the CPU (or the GPU itself) dispatches a grid of thread groups, and each thread does whatever the code says with buffers and textures. `HealCS` earlier in this lesson was one.',
        },
        {
          type: 'list',
          items: [
            '**Particles and simulation:** updating millions of particles, cloth or fluid grids every frame.',
            '**Culling and GPU-driven rendering:** testing thousands of objects against the view frustum and writing the draw arguments for the visible ones, so the CPU never sees them.',
            '**Post-processing:** bloom, tone mapping, temporal anti-aliasing and upscaling.',
            '**Rendering itself:** Unreal Engine 5\'s Nanite rasterizes many small triangles in a compute shader instead of the fixed-function rasterizer.',
          ],
        },
        {
          type: 'p',
          text: 'Two compute features have no direct CPU equivalent. **Shared memory** (`groupshared` in HLSL) is a scratchpad that the threads of one group read and write together, synchronized with a group barrier; it is how a 5×5 blur loads a tile of pixels once and lets each pixel be reused by 25 threads. **Async compute** lets compute work run on a separate queue alongside graphics work, filling ALU lanes the graphics passes leave idle; consoles and modern PC APIs both expose it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'What belongs on the GPU',
          text: 'Move work to the GPU when it is massively data-parallel, branches little within a warp, and its results are consumed by the GPU anyway. Keep it on the CPU when it is serial, branchy or pointer-heavy (AI decisions, gameplay scripting, most physics broad phases on small scenes), or when the CPU needs the answer this frame.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'Which of these tasks is the best fit for a compute shader?',
      options: [
        { text: 'Running the behavior trees of 20 boss enemies', why: 'Twenty independent, branch-heavy decision processes give a GPU almost no parallelism and maximal divergence. This is CPU work.' },
        { text: 'Parsing JSON level files at load time', why: 'Parsing is serial and branchy and its output is needed by CPU code. A GPU would be slower, and the results would have to be read back.' },
        { text: 'Updating the positions and lifetimes of 2 million smoke particles that are then rendered', correct: true, why: 'The same small update for millions of independent elements, data that can live in SoA buffers, and results consumed by the GPU\'s own draw calls: the ideal compute workload.' },
        { text: 'Writing the save game to disk', why: 'This is I/O, not computation. The GPU cannot do file I/O and the data lives on the CPU side.' },
      ],
      explanation: 'Compute shaders shine with lots of uniform, independent work whose results stay on the GPU. Particles tick every box: millions of elements, identical code, coalesced SoA access, and output that feeds rendering directly without a readback.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'numeric',
      prompt: 'The PS5 GPU has 36 compute units of 64 FP32 lanes each, running at up to 2.23 GHz. Counting a fused multiply-add as 2 floating-point operations per lane per cycle, what is its peak FP32 throughput in TFLOPS? Round to 2 decimal places.',
      hint: 'lanes × 2 × clock. Remember that 1 TFLOPS is 10¹² operations per second.',
      answer: 10.28,
      tolerance: 0.006,
      unit: 'TFLOPS',
      explanation: '36 × 64 = 2,304 lanes; 2,304 × 2 × 2.23 × 10⁹ ≈ 10.28 × 10¹² FLOPS, Sony\'s quoted **10.28 TFLOPS**. The Xbox Series X\'s 52 CUs at 1.825 GHz give 52 × 64 × 2 × 1.825 × 10⁹ ≈ 12.1 TFLOPS. Peak FLOPS assumes every lane does an FMA every cycle: no divergence, no stalls, perfect occupancy. Real shaders reach a fraction of it, which is why everything else in this lesson matters.',
    },
    // ------------------------------------------------------------------ 16
    {
      kind: 'fill',
      prompt: 'Complete the summary of how GPUs execute threads.',
      templateIsCode: false,
      template: 'NVIDIA runs threads in groups of 32 called a ___; AMD calls its group a ___. When memory is slow, the scheduler hides the wait by ___ to another ready group.',
      blanks: [{ answers: ['warp'] }, { answers: ['wavefront'] }, { answers: ['switching'] }],
      wordBank: ['warp', 'wavefront', 'switching', 'speculating', 'prefetching', 'thread pool'],
      explanation: 'A warp (NVIDIA) or wavefront (AMD) shares one instruction stream across its lanes. Instead of the CPU\'s speculation and big caches, a GPU keeps many warps resident and switches between them every cycle at no cost, because their registers never leave the chip. Enough ready warps means the arithmetic lanes never notice the memory latency.',
    },
  ],
  takeaways: [
    'GPUs spend silicon on arithmetic lanes instead of latency-hiding machinery, so they excel at huge amounts of uniform, independent work and are poor at serial, branchy code.',
    'Latency is hidden by switching among many resident warps every cycle; registers per thread limit how many fit (occupancy).',
    'SIMT: you write scalar code for one thread; hardware runs 32 (NVIDIA warp) or 32/64 (AMD wavefront) threads per instruction.',
    'Divergence within a warp serializes both sides of a branch; only disagreement inside a warp costs anything.',
    'Coalesced access (consecutive threads, consecutive addresses) moves only useful bytes; SoA layouts matter even more on GPUs than on CPUs.',
    'The CPU records command buffers (draws, dispatches, state changes) that the GPU executes a frame or more later; sorting by state and avoiding readbacks keeps both busy.',
  ],
  reading: [
    {
      title: 'Graphics processing unit',
      url: 'https://en.wikipedia.org/wiki/Graphics_processing_unit',
      source: 'article',
      note: 'History from fixed-function graphics chips to general-purpose compute, with the major architectures.',
    },
    {
      title: 'Single instruction, multiple threads',
      url: 'https://en.wikipedia.org/wiki/Single_instruction,_multiple_threads',
      source: 'article',
      note: 'The SIMT execution model, warps and wavefronts, and how it relates to SIMD.',
    },
    {
      title: 'CUDA C++ Programming Guide',
      url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/',
      source: 'other',
      note: 'The "Hardware Implementation" and "Performance Guidelines" chapters cover warps, divergence, occupancy and coalescing in detail.',
    },
    {
      title: 'Computer Systems: A Programmer\'s Perspective',
      url: 'https://csapp.cs.cmu.edu/',
      source: 'book',
      note: 'For contrast: the CPU side of the latency-versus-throughput trade-off, with caches and out-of-order execution.',
    },
  ],
};
