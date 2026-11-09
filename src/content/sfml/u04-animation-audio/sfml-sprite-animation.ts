import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-sprite-animation',
  title: 'Spritesheet Animation',
  summary: 'Pack frames into one texture, step through them with time instead of frame counts, flip a sprite correctly, and switch between idle and run clips.',
  minutes: 18,
  objectives: [
    'Describe a spritesheet and pick one frame with `setTextureRect`',
    'Advance animation frames from accumulated delta time',
    'Wrap that logic in a small reusable `Animation` class',
    'Flip a sprite to face left or right without it jumping',
    'Switch between clips (idle, run) by animation state',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'A spritesheet is one texture with many frames',
      blocks: [
        {
          type: 'p',
          text: 'A walking character is just a handful of still pictures shown one after another. Rather than loading one file per picture, artists pack all the frames into a single image called a **spritesheet**, usually in a grid. You load it once into one `sf::Texture`, and tell the sprite which rectangle of it to show with `setTextureRect`.',
        },
        {
          type: 'code',
          code: `sf::Texture sheet("assets/hero.png");   // 4 frames in a row
sf::Sprite hero(sheet);

const sf::Vector2i frameSize{32, 48};

// Frame 0 is at the left edge.
hero.setTextureRect(sf::IntRect({0, 0}, frameSize));

// Frame 3 starts 3 frames to the right.
hero.setTextureRect(sf::IntRect({3 * frameSize.x, 0}, frameSize));`,
          annotations: [
            { lines: 1, text: 'One texture holds every frame. Loading it once means one file read and one piece of graphics memory.' },
            { lines: 7, text: '`IntRect(position, size)`: the top-left pixel of the frame, then its width and height **in pixels**.' },
            { lines: 10, text: 'Frame *n* of a horizontal strip starts at `n * frameWidth`. For a grid, the row adds `row * frameHeight` to y.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one big sheet instead of one file per frame?',
          text: 'Graphics cards are fastest when many sprites share the **same texture**, because the card does not have to switch textures between draws. A sheet also means fewer files to load and track, and lets you slice frames by arithmetic instead of managing dozens of `sf::Texture` objects. This is why almost every 2D game, from tiny hobby projects to commercial releases, packs its art into sheets.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The texture rectangle is not the sprite\'s size',
          text: 'Calling `setTextureRect` changes which part of the texture is shown, and the sprite\'s size follows the rectangle. The sprite\'s position, origin, rotation and scale are untouched, so you can change frames every frame without moving anything.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Each frame is 32 × 32 pixels and the frames sit side by side in one row. Which line shows **frame 3** (counting from 0)?',
      options: [
        { text: 'sprite.setTextureRect(sf::IntRect({96, 0}, {32, 32}));', correct: true, why: '3 × 32 = 96 pixels from the left; the rectangle is one frame in size.' },
        { text: 'sprite.setTextureRect(sf::IntRect({3, 0}, {32, 32}));', why: 'The rectangle is in **pixels**, not frame numbers. This starts 3 pixels from the left edge.' },
        { text: 'sprite.setTextureRect(sf::IntRect({0, 96}, {32, 32}));', why: 'That moves 96 pixels down, which is the fourth *row*, not the fourth column.' },
        { text: 'sprite.setTextureRect(sf::IntRect({96, 0}, {96, 32}));', why: 'The start is right, but a size of 96 pixels wide would show three frames at once.' },
      ],
      codeOptions: true,
      explanation: 'A frame\'s position is its index times the frame size, and the rectangle\'s size is always one frame. Mixing up pixels with frame numbers is the most common sheet bug.',
    },
    {
      kind: 'concept',
      title: 'Animate with time, not with frames',
      blocks: [
        {
          type: 'p',
          text: 'The simplest animation bumps a frame counter once per loop. It looks fine on your machine, then plays twice as fast on a 120 Hz monitor. The fix is the same as for movement: use [[delta-time-sfml|delta time]]. Add each frame\'s `dt` to a timer, and advance to the next picture whenever the timer passes the length of one picture.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <optional>

class Animation {
public:
    Animation(int frameCount, float secondsPerFrame)
        : m_frameCount(frameCount), m_secondsPerFrame(secondsPerFrame) {}

    void update(float dt) {
        m_timer += dt;
        while (m_timer >= m_secondsPerFrame) {
            m_timer -= m_secondsPerFrame;
            m_frame = (m_frame + 1) % m_frameCount;
        }
    }

    int frame() const { return m_frame; }

private:
    int   m_frameCount;
    float m_secondsPerFrame;
    float m_timer = 0.f;
    int   m_frame = 0;
};

int main() {
    // Build a 4-frame sheet in memory so the example needs no files.
    const sf::Vector2i frameSize{48, 48};
    const sf::Color colours[4] = {sf::Color::Red, sf::Color::Yellow,
                                  sf::Color::Green, sf::Color::Cyan};
    sf::Image image(sf::Vector2u(4u * 48u, 48u), sf::Color::Transparent);
    for (unsigned f = 0; f < 4; ++f) {
        const unsigned margin = 4 + f * 3;
        for (unsigned y = margin; y < 48 - margin; ++y) {
            for (unsigned x = f * 48 + margin; x < f * 48 + 48 - margin; ++x) {
                image.setPixel({x, y}, colours[f]);
            }
        }
    }
    sf::Texture sheet;
    if (!sheet.loadFromImage(image)) {
        return 1;
    }

    sf::RenderWindow window(sf::VideoMode({400u, 300u}), "Animation");
    window.setFramerateLimit(60);

    sf::Sprite hero(sheet);
    hero.setTextureRect(sf::IntRect({0, 0}, frameSize));
    hero.setOrigin({24.f, 24.f});
    hero.setPosition({200.f, 150.f});
    hero.setScale({3.f, 3.f});

    Animation run(4, 0.12f);
    sf::Clock clock;

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        const float dt = clock.restart().asSeconds();
        run.update(dt);
        hero.setTextureRect(sf::IntRect({run.frame() * frameSize.x, 0}, frameSize));

        window.clear(sf::Color(20, 20, 40));
        window.draw(hero);
        window.display();
    }
}`,
          annotations: [
            { lines: 10, text: 'Collect elapsed time. The frame changes only when a full frame\'s worth has built up.' },
            { lines: [11, 14], text: '`while`, not `if`: after a lag spike several frames\' worth of time may have built up, and the animation should catch up. Subtracting (rather than zeroing) keeps the leftover time so the rhythm does not drift.' },
            { lines: 13, text: 'The modulo wraps the last frame back to frame 0, so the clip loops.' },
            { lines: [40, 41], text: 'The sheet was drawn with `sf::Image` above, and `loadFromImage` uploads it to the graphics card. A real game would load a PNG here.' },
            { lines: 52, text: 'Scaling up 3× keeps the blocks crisp because texture smoothing is off by default.' },
            { lines: 66, text: 'One call per frame: ask the animation which frame is current, and show that rectangle.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why accumulate time instead of counting frames?',
          text: 'A frame counter ties animation speed to how fast the computer runs the loop. A time accumulator ties it to the **clock**, so a clip that should take 0.48 seconds takes 0.48 seconds on every machine. It also decouples animation speed from movement speed: you can run the same four frames faster or slower by changing a single number, `secondsPerFrame`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Keep animation out of the sprite',
          text: 'The `Animation` class only knows *which frame*, not how to draw it. That keeps it reusable: the same class can drive a sprite, a UI icon or a tile. The caller decides how to turn a frame number into a rectangle.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Increasing the frame number once per loop iteration plays an animation at the same speed on a 60 Hz and a 144 Hz monitor.',
      answer: false,
      explanation: 'The loop runs more often on the faster setup, so the counter reaches the end sooner and the animation plays too fast. Accumulate delta time and advance based on elapsed seconds instead.',
    },
    {
      kind: 'concept',
      title: 'Facing left, and switching clips',
      blocks: [
        {
          type: 'p',
          text: 'Most games draw their character facing right and **mirror** it for left. Mirroring is just a negative x scale. The catch is *where* the mirror line sits: scaling happens around the sprite\'s [[origin]], so with the default top-left origin the sprite flips around its left edge and appears to jump sideways by its own width.',
        },
        {
          type: 'code',
          code: `// Centre the origin once, when you set the sprite up.
hero.setOrigin({frameSize.x / 2.f, frameSize.y / 2.f});

// Each frame, face the direction of travel.
const float s = 3.f;
hero.setScale({facingLeft ? -s : s, s});

// Pick a clip by state: one row of the sheet per state.
if (state != previous) {
    animation.reset();               // start the new clip at frame 0
    previous = state;
}
const int row = static_cast<int>(state);
hero.setTextureRect(sf::IntRect(
    {animation.frame() * frameSize.x, row * frameSize.y}, frameSize));`,
          annotations: [
            { lines: 2, text: 'With the origin in the middle, the sprite mirrors around its own centre and stays put.' },
            { lines: 6, text: 'A **negative** scale mirrors the sprite. The size stays `s`; only the direction changes.' },
            { lines: [9, 12], text: 'Only restart the clip when the state **changes**. Restarting every frame would freeze the animation on frame 0.' },
            { lines: 13, text: 'If the sheet has one row per state (idle = 0, run = 1, ...), an `enum class` converts straight to a row number.' },
          ],
        },
        {
          type: 'table',
          caption: 'A typical hero sheet: one row per state.',
          headers: ['Row', 'State', 'Frames', 'Speed', 'Loops?'],
          rows: [
            ['0', 'Idle', '4', 'slow (0.25 s)', 'Yes'],
            ['1', 'Run', '6', 'fast (0.08 s)', 'Yes'],
            ['2', 'Jump', '3', 'medium', 'No: hold the last frame'],
            ['3', 'Attack', '5', 'fast', 'No: play once, then return to idle'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Looping clips and one-shot clips',
          text: 'A run cycle loops, but an attack should play once and then hand control back. Give each clip a `loops` flag and a "finished" query, so gameplay can wait for the swing to end before allowing the next action.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the `update` function so it advances the frame and wraps to frame 0.',
      template: 'm_timer += dt;\nwhile (m_timer >= ___) {\n    m_timer -= m_secondsPerFrame;\n    m_frame = (m_frame + 1) % ___;\n}',
      blanks: [{ answers: ['m_secondsPerFrame'] }, { answers: ['m_frameCount'] }],
      wordBank: ['m_secondsPerFrame', 'm_frameCount', 'm_timer', 'dt', 'm_frame'],
      explanation: 'The timer is compared with the length of one picture, and the modulo by the total frame count loops the clip. Subtracting the frame length keeps the remainder instead of throwing time away.',
    },
    {
      kind: 'bug',
      prompt: 'When the player turns left, the character jumps a full sprite-width to the right. Tap the line that causes the jump.',
      code: `sprite.setOrigin({0.f, 0.f});
sprite.setPosition(player.position);
if (movingLeft) {
    sprite.setScale({-1.f, 1.f});
} else {
    sprite.setScale({1.f, 1.f});
}`,
      bugLines: [1],
      explanation: 'The origin is the top-left corner, so a negative scale mirrors the sprite around its left edge and it ends up on the *other* side of the position. Set the origin to the sprite\'s centre (or its bottom-centre, for characters standing on the ground), once at setup.',
    },
    {
      kind: 'order',
      prompt: 'Put one frame of animation work in the right order.',
      lines: [
        'Read dt from clock.restart()',
        'Add dt to the animation timer',
        'Advance the frame while the timer is full',
        'Set the sprite\'s texture rectangle',
        'window.draw(sprite)',
      ],
      linesAreCode: false,
      explanation: 'Time passes first, then the animation decides which frame is current, then the sprite is told to show that frame, and only then is it drawn.',
    },
    {
      kind: 'concept',
      title: 'Preparing a sheet that behaves',
      blocks: [
        {
          type: 'p',
          text: 'Most animation bugs that are not code bugs are sheet bugs. A few habits save hours:',
        },
        {
          type: 'list',
          items: [
            '**Same size for every frame.** Equal cells make the maths trivial. Put the feet on the same line in each cell so the character does not bob.',
            '**Leave a gap of transparent pixels** around each frame. When a sprite is scaled or drawn at a fractional position the card can sample a neighbouring cell, which shows up as a thin line of the wrong colour at the edge.',
            '**Keep pixel art unsmoothed.** Texture smoothing blurs hard edges. The default (off) is right for pixel art; turn `setSmooth(true)` on only for painted, high-resolution art.',
            '**Use whole-number scales** (2×, 3×, 4×) for pixel art so every source pixel becomes the same number of screen pixels.',
            '**Write down the frame data.** A small table of rows, frame counts and speeds beats magic numbers scattered through the code, and lets artists add frames without touching C++.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Tools that export sheets for you',
          text: 'Pixel-art editors such as Aseprite can export a spritesheet plus a data file listing every frame\'s rectangle, and packers like TexturePacker do the same for large collections of images. Loading that data instead of hard-coding rectangles lets your artist change the art without you recompiling.',
        },
      ],
    },
  ],
  takeaways: [
    'A spritesheet packs many frames into one texture; `setTextureRect(IntRect(position, size))` picks the frame, in pixels.',
    'Drive animation from accumulated delta time, with `while (timer >= secondsPerFrame)`, so speed is the same on every machine and survives lag spikes.',
    'Keep frame selection in a small `Animation` class and let the caller turn a frame number into a rectangle.',
    'Mirror a sprite with a negative x scale, and set the origin to its centre first so it does not jump.',
    'Restart a clip only when the state changes, and distinguish looping clips from one-shot clips.',
  ],
  reading: [
    { title: 'Sprites and textures', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/sprite/', source: 'other', note: 'Covers texture rectangles and sprite transformations.' },
    { title: 'Measuring time', url: 'https://www.sfml-dev.org/tutorials/3.0/system/time/', source: 'other', note: 'The clock and time types used to drive the animation.' },
  ],
};
