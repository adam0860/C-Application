import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-textures-sprites',
  title: 'Textures and Sprites',
  summary: 'Load images safely, understand why a sprite must never outlive its texture, fix asset-path problems, and crop, flip, tint and scale.',
  minutes: 18,
  objectives: [
    'Explain the difference between an `sf::Texture` and an `sf::Sprite`',
    'Load a texture, handle failure, and create a sprite from it',
    'Avoid dangling-texture bugs by respecting lifetimes',
    'Diagnose "file not found" caused by the working directory and copy assets next to the executable',
    'Use `setTextureRect`, scale, colour tint and `setSmooth` for cropping, flipping, fading and pixel art',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Texture and sprite: the picture and the picture frame',
      blocks: [
        {
          type: 'p',
          text: 'Two classes cooperate to put an image on screen. An `sf::Texture` is the **pixel data**, uploaded into the graphics card\'s memory. An `sf::Sprite` is a lightweight object that says "draw *that* texture, *here*, at *this* size and angle". A sprite owns no pixels; it holds only a reference to a texture plus the usual position, rotation, scale and origin.',
        },
        {
          type: 'compare',
          left: {
            title: 'sf::Texture',
            tone: 'neutral',
            text: 'Heavy. Holds the image in GPU memory. Load it **once**. Cannot be drawn by itself.',
          },
          right: {
            title: 'sf::Sprite',
            tone: 'neutral',
            text: 'Light. Points at a texture and adds a transform. Make as many as you like; they can all share one texture.',
          },
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate them?',
          text: 'A level may contain 500 identical trees. Loading the image 500 times would waste memory and time uploading to the GPU. Instead you load **one** texture and create 500 cheap sprites that all point at it, each with its own position. Sharing one texture also lets the graphics card draw them efficiently.',
        },
        {
          type: 'definition',
          term: 'Texture memory',
          text: 'Images used for drawing live in video memory as textures. Their size is rounded up internally to what the GPU supports, and there is a maximum texture size (often 8192 or 16384 pixels per side). `sf::Texture::getMaximumSize()` tells you the limit on the current machine.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Each `sf::Sprite` makes its own copy of the image pixels, so 500 sprites use 500 times the memory of one.',
      answer: false,
      explanation: 'A sprite holds only a *reference* to a texture and its transform. Five hundred sprites that share one texture use one copy of the pixels. That sharing is the whole point of the texture/sprite split, and the reason the texture must stay alive as long as any sprite uses it.',
    },
    {
      kind: 'concept',
      title: 'Loading and drawing',
      blocks: [
        {
          type: 'p',
          text: 'Load a texture with `loadFromFile`. It returns `bool` and is marked `[[nodiscard]]`, so the compiler warns if you ignore a failure. (SFML 3 also offers a constructor, `sf::Texture texture("player.png");`, which instead throws `sf::Exception` on failure.) In SFML 3 a sprite **requires** a texture at construction, so you can never have an "untextured" sprite.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <iostream>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Sprites");
    window.setFramerateLimit(60);

    sf::Texture texture;
    if (!texture.loadFromFile("assets/player.png")) {
        std::cerr << "Could not load assets/player.png\\n";
        return 1;
    }

    sf::Sprite player(texture);
    player.setOrigin(player.getLocalBounds().size / 2.f);
    player.setPosition({400.f, 300.f});

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        window.clear(sf::Color(30, 40, 60));
        window.draw(player);
        window.display();
    }
}`,
          annotations: [
            { lines: 8, text: 'The texture is declared **before** the sprite and lives until the end of `main`. It outlives every sprite that uses it.' },
            { lines: [9, 12], text: '`loadFromFile` returns `false` if the file is missing or not a valid image. Always check, and stop with a clear message.' },
            { lines: 14, text: 'A sprite is created *from* a texture. There is no empty sprite in SFML 3.' },
            { lines: 15, text: 'The sprite\'s origin is its top-left by default. Centre it so `setPosition` and rotation work around the middle.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does SFML 3 refuse to make a sprite without a texture?',
          text: 'In SFML 2 you could write `sf::Sprite s;` and forget `setTexture`, then wonder why nothing appeared. SFML 3 makes the "no texture" state impossible to construct, and even deletes the constructor overload that accepts a temporary texture. Mistakes that used to be silent now fail at compile time.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the loading code with proper error handling.',
      template: 'sf::Texture texture;\nif (!texture.___("assets/hero.png")) {\n    return 1;\n}\nsf::___ hero(texture);',
      blanks: [{ answers: ['loadFromFile'] }, { answers: ['Sprite'] }],
      wordBank: ['loadFromFile', 'Sprite', 'openFromFile', 'Image', 'Texture'],
      explanation: '`Texture::loadFromFile` loads an image into the texture (fonts use `openFromFile` instead). A texture only holds pixels; to draw it you wrap it in an `sf::Sprite`.',
    },
    {
      kind: 'concept',
      title: 'The lifetime rule: a texture must outlive its sprites',
      blocks: [
        {
          type: 'p',
          text: 'Because a sprite stores only a **reference** to its texture, destroying the texture while a sprite still points at it leaves a [[dangling-reference]]. The result is [[undefined-behavior]]: a white box, garbage pixels, or a crash that appears far from the real mistake. It is the single most common SFML beginner bug.',
        },
        {
          type: 'compare',
          left: {
            title: 'Dangling texture',
            tone: 'bad',
            code: `sf::Sprite makePlayer() {
    sf::Texture texture;
    (void)texture.loadFromFile("p.png");
    return sf::Sprite(texture);
}   // texture destroyed here`,
            text: 'The sprite is returned, but the local texture dies at the closing brace.',
          },
          right: {
            title: 'Texture owned elsewhere',
            tone: 'good',
            code: `struct Player {
    sf::Texture texture;
    sf::Sprite sprite;
    Player()
        : texture("p.png"), sprite(texture) {}
    Player(const Player&) = delete;
};`,
            text: 'The texture is a member declared **before** the sprite, so it lives as long as it. Copying is deleted because a copy\'s sprite would point at the *original\'s* texture.',
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Texture stored in a std::vector',
          text: 'If you keep textures in a `std::vector<sf::Texture>` and call `push_back`, the vector may reallocate and **move** every texture to new memory. Sprites that pointed at the old addresses now dangle. Store textures somewhere with stable addresses (a `std::map`, `std::deque`, or `std::unique_ptr`), which the Resource Management lesson builds into a proper asset manager.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does SFML not simply copy the texture into each sprite?',
          text: 'Copying defeats the reason textures are shared: memory use and GPU uploads would multiply. SFML chooses speed and small memory, and in return asks the programmer to guarantee the texture lives long enough. This is the same [[ownership]] contract as a raw pointer or reference. Making ownership explicit (a member declared first, or a central manager) is the fix.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'The returned sprite shows a white square or crashes. Tap the line that causes the problem.',
      code: `sf::Sprite loadEnemy() {
    sf::Texture texture;
    if (!texture.loadFromFile("assets/enemy.png")) {
        std::exit(1);
    }
    return sf::Sprite(texture);
}`,
      bugLines: [6],
      explanation: '`texture` is a local variable, destroyed when `loadEnemy` returns, but the returned sprite still points at it. The sprite now references freed memory. The texture must live somewhere that outlasts the sprite: a member of a longer-lived object, a global/static asset store, or an asset manager.',
    },
    {
      kind: 'concept',
      title: 'Why "file not found" only on some machines: the working directory',
      blocks: [
        {
          type: 'p',
          text: 'A relative path such as `"assets/player.png"` is resolved against the **working directory** of the running program, not the folder the `.exe` lives in. Those are often different: Visual Studio runs your program from the *project folder*, a double-clicked `.exe` runs from *its own* folder, and a terminal runs from wherever you typed the command. A game that works from the IDE can fail to find any image once you launch it elsewhere.',
        },
        {
          type: 'table',
          headers: ['How you launch it', 'Working directory is'],
          rows: [
            ['Visual Studio, F5 or Ctrl+F5', 'The project folder (configurable under Debugging → Working Directory)'],
            ['Double-click the .exe', 'The folder containing the .exe'],
            ['Terminal: `./build/bin/main`', 'The folder the terminal is currently in'],
          ],
        },
        {
          type: 'p',
          text: 'The reliable fix with CMake is to copy the assets folder next to the executable on every build, so the files travel with the program:',
        },
        {
          type: 'code',
          lang: 'cmake',
          code: `add_custom_command(TARGET main POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
            \${CMAKE_SOURCE_DIR}/assets
            $<TARGET_FILE_DIR:main>/assets)`,
          annotations: [
            { lines: 1, text: 'Run this step **after** the `main` target is built, every time.' },
            { lines: [2, 4], text: 'Copy the whole `assets` folder into the folder that holds the executable.' },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Print where you are',
          text: 'When a file will not load, print `std::filesystem::current_path()` (from `<filesystem>`). Nine times out of ten the path SFML is searching is not the one you assumed. SFML also prints a "Failed to load image" message to the error stream, which is worth reading.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Your game loads `assets/player.png` fine from Visual Studio but prints "Failed to load image" when you double-click the .exe in the Release folder. What is the most likely cause?',
      options: [
        { text: 'The working directory is different, and there is no `assets` folder next to the .exe', correct: true, why: 'Relative paths are resolved against the working directory. Visual Studio uses the project folder; double-clicking uses the .exe\'s folder, which has no assets.' },
        { text: 'The Release build cannot load PNG files', why: 'Both configurations load PNGs the same way. The image format is not the problem.' },
        { text: 'The texture was created before the sprite', why: 'That is the correct order and is not related to loading.' },
        { text: 'Double-clicking the .exe disables the GPU', why: 'The GPU is unaffected. The failure is in finding the file, not in using the graphics card.' },
      ],
      explanation: 'The program\'s working directory differs between launch methods, so a relative path can point at nothing. Copy the assets next to the executable (a post-build step), or open the project\'s working-directory setting and align it.',
    },
    {
      kind: 'concept',
      title: 'Crop, flip, tint and scale',
      blocks: [
        {
          type: 'p',
          text: 'A sprite does not have to show its whole texture. `setTextureRect` selects a rectangle of pixels from the texture, which is the foundation of spritesheets (covered in the Animation lesson). Scale, colour and smoothing complete the toolbox:',
        },
        {
          type: 'code',
          code: `// Show only a 32 x 32 region starting at (64, 0).
sprite.setTextureRect(sf::IntRect({64, 0}, {32, 32}));

// Flip horizontally: a negative x scale (origin must be centred).
sprite.setScale({-1.f, 1.f});

// Draw the image at half opacity and tinted red.
sprite.setColor(sf::Color(255, 120, 120, 128));

// Make a 16-pixel sprite appear 64 px wide (scale by 4).
sprite.setScale({4.f, 4.f});

// Crisp pixel art (this is the default); true gives smooth blending.
texture.setSmooth(false);`,
          annotations: [
            { lines: 2, text: '`sf::IntRect({x, y}, {width, height})` is a rectangle of **texture pixels**: position then size.' },
            { lines: 5, text: 'Flipping is just scaling by -1. It mirrors around the origin, so centre the origin first or the sprite will jump sideways.' },
            { lines: 8, text: 'The colour is **multiplied** with the image. White leaves it unchanged, and a lower alpha fades it.' },
            { lines: 14, text: 'Pixel art should stay sharp when enlarged, so keep smoothing off and prefer whole-number scales.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is smoothing off by default?',
          text: 'When a texture is drawn bigger or smaller than its real size, the GPU must decide each on-screen pixel\'s colour. "Nearest" picks the closest texel, keeping hard edges (right for pixel art). "Linear" blends neighbouring texels, which looks soft (right for painted or high-resolution art). SFML defaults to nearest, so pixel art works out of the box; call `setSmooth(true)` when you want the soft look.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'You want to show only the **top-left 32 × 32 pixels** of a larger texture on a sprite. Which call does it?',
      options: [
        { text: 'sprite.setTextureRect(sf::IntRect({0, 0}, {32, 32}));', correct: true, why: 'An `IntRect` takes a position and a size. {0, 0} is the texture\'s top-left corner and {32, 32} is the size of the region.' },
        { text: 'sprite.setScale({32.f, 32.f});', why: 'That would enlarge the sprite 32 times. It does not select a region.' },
        { text: 'sprite.setOrigin({32.f, 32.f});', why: 'Origin moves the sprite\'s pivot point. It has no effect on which pixels are shown.' },
        { text: 'texture.resize({32u, 32u});', why: 'That would destroy the texture\'s contents and make it 32 x 32. It does not crop what a sprite shows.' },
      ],
      codeOptions: true,
      explanation: '`setTextureRect` chooses *which part of the texture* the sprite displays. Scale changes the on-screen size, and origin changes the pivot. Cropping a shared texture lets one image hold many frames or tiles.',
    },
  ],
  takeaways: [
    'A texture holds pixels in GPU memory; a sprite is a cheap reference to a texture plus a transform. Load once, make many sprites.',
    'Check `loadFromFile` (or catch `sf::Exception` from the constructor), and always create the texture before the sprites that use it.',
    'A sprite stores a pointer to its texture, so a texture that is destroyed, or moved inside a growing `std::vector`, leaves the sprite dangling.',
    'Relative asset paths use the working directory, which differs between the IDE and a double-clicked .exe; copy assets next to the executable.',
    '`setTextureRect` crops, a negative scale flips, `setColor` tints and fades, and smoothing is off by default for crisp pixel art.',
  ],
  reading: [
    { title: 'Sprites and textures', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/sprite/', source: 'other', note: 'The official guide, including the lifetime warning.' },
    { title: 'cppreference: std::filesystem::current_path', url: 'https://en.cppreference.com/w/cpp/filesystem/current_path', source: 'cppreference', note: 'Print the working directory when a file will not load.' },
    { title: 'Drawing 2D stuff', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/draw/', source: 'other', note: 'How drawables, render states and textures fit together.' },
  ],
};
