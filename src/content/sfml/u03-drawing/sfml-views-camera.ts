import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-views-camera',
  title: 'Views and Cameras',
  summary: 'Scroll a world larger than the window, follow the player, keep the HUD fixed, and handle window resizing with letterboxing.',
  minutes: 18,
  objectives: [
    'Explain what an `sf::View` is and how it differs from the window',
    'Create a camera that follows the player and stays inside the world',
    'Draw a HUD in screen space with a second view',
    'Keep the right aspect ratio when the window is resized using a viewport',
    'Convert mouse positions to the world with the correct view',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'A view is a camera',
      blocks: [
        {
          type: 'p',
          text: 'Until now, SFML mapped world coordinates straight onto window pixels: a shape at (100, 100) appeared 100 pixels from the corner. An `sf::View` breaks that link. It is a **rectangle of the world** (a center and a size) that SFML stretches onto the window. Move the rectangle and the world appears to scroll; shrink it and everything zooms in; rotate it and the whole world turns.',
        },
        {
          type: 'code',
          code: `sf::View camera(sf::Vector2f(400.f, 300.f), sf::Vector2f(800.f, 600.f));

camera.setCenter({1000.f, 700.f});   // look at a different part of the world
camera.move({5.f, 0.f});             // pan right by 5 world units
camera.zoom(0.5f);                   // see half as much: zoom IN 2x
camera.setRotation(sf::degrees(10.f));

window.setView(camera);              // everything drawn from now on uses it`,
          annotations: [
            { lines: 1, text: 'A view is created from its **centre** and **size** in world units. This one looks at an 800 × 600 area centred at (400, 300), identical to the default.' },
            { lines: 5, text: '`zoom(factor)` multiplies the view\'s size. **A factor below 1 shows less of the world, so it zooms in.**' },
            { lines: 8, text: '`setView` takes effect for every later `draw` call, until you set a different view.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a camera instead of moving every object?',
          text: 'To scroll a world of 5,000 objects by moving each one in the opposite direction, you would update 5,000 positions every frame, and your game logic would have to remember "screen offset" everywhere. A view changes **one** rectangle, leaving every object at its true world position. Game logic, collision and AI never need to know where the camera is. This is the same idea as a camera in a 3D engine.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'The default view',
          text: 'A window starts with a default view that covers exactly its pixel area, `(0,0)` to `(width, height)`. `window.getDefaultView()` returns it, and `window.setView(window.getDefaultView())` switches back to it at any time.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: '`camera.zoom(0.5f)` makes everything on screen look half as big.',
      answer: false,
      explanation: '`zoom` scales the size of the **rectangle of world** being shown. Halving it shows half as much world, stretched over the same window, so everything looks twice as big (zoomed in). To zoom out, use a factor above 1, such as `zoom(2.f)`.',
    },
    {
      kind: 'concept',
      title: 'A camera that follows the player',
      blocks: [
        {
          type: 'p',
          text: 'Here a 2400 × 1800 world is explored through an 800 × 600 window. Each frame the camera centres on the player, then is **clamped** so it never shows empty space beyond the world\'s edge:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <algorithm>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Camera");
    window.setFramerateLimit(60);

    const sf::Vector2f worldSize{2400.f, 1800.f};
    sf::View camera(sf::FloatRect({0.f, 0.f}, {800.f, 600.f}));

    sf::RectangleShape player({40.f, 40.f});
    player.setFillColor(sf::Color::Cyan);
    player.setOrigin({20.f, 20.f});
    player.setPosition({1200.f, 900.f});

    sf::RectangleShape tile({100.f, 100.f});
    sf::RectangleShape healthBar({200.f, 20.f});
    healthBar.setFillColor(sf::Color(220, 60, 60));
    healthBar.setPosition({20.f, 20.f});

    sf::Clock clock;
    while (window.isOpen()) {
        const float dt = clock.restart().asSeconds();
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }

        sf::Vector2f dir{0.f, 0.f};
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::W)) { dir.y -= 1.f; }
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::S)) { dir.y += 1.f; }
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::A)) { dir.x -= 1.f; }
        if (sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::D)) { dir.x += 1.f; }
        if (dir.lengthSquared() > 0.f) {
            player.move(dir.normalized() * 400.f * dt);
        }

        const sf::Vector2f half = camera.getSize() / 2.f;
        sf::Vector2f centre = player.getPosition();
        centre.x = std::clamp(centre.x, half.x, worldSize.x - half.x);
        centre.y = std::clamp(centre.y, half.y, worldSize.y - half.y);
        camera.setCenter(centre);

        window.clear(sf::Color(15, 15, 25));

        window.setView(camera);
        for (int y = 0; y < 18; ++y) {
            for (int x = 0; x < 24; ++x) {
                tile.setPosition({x * 100.f, y * 100.f});
                tile.setFillColor((x + y) % 2 == 0 ? sf::Color(40, 60, 90)
                                                    : sf::Color(30, 45, 70));
                window.draw(tile);
            }
        }
        window.draw(player);

        window.setView(window.getDefaultView());
        window.draw(healthBar);

        window.display();
    }
}`,
          annotations: [
            { lines: 9, text: 'The camera shows an 800 × 600 slice. `FloatRect({x, y}, {w, h})` defines it by its top-left corner and size.' },
            { lines: [39, 43], text: 'Centre on the player, but never let the view\'s edge pass the world\'s edge. `clamp` keeps the centre at least half a view away from each side.' },
            { lines: 47, text: 'Switch to the camera for everything in the **world**.' },
            { lines: 56, text: 'The player is drawn in world space, so scrolling needs no extra code.' },
            { lines: [58, 59], text: 'Switch back to the default view for the **HUD**, so the health bar stays glued to the screen.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do HUD elements need their own view?',
          text: 'Anything drawn while the camera view is active moves with the world. A health bar drawn with the camera view would scroll away as the player walks. By switching to the default view (pixel coordinates, never scrolled) you place HUD elements by screen position, unaffected by where the camera is looking. Draw the world first, the HUD last, so the HUD sits on top.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Drawing the whole world is wasteful',
          text: 'The loop draws all 432 tiles even though only about 24 are visible. That is fine here but becomes slow for large maps. The Tilemaps lesson shows how to batch tiles and draw only what the camera can see.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Smooth follow and zoom',
      blocks: [
        {
          type: 'p',
          text: 'Snapping the camera to the player works, but it can feel stiff. A softer camera moves only a **fraction of the remaining gap** each frame, and the mouse wheel can zoom it:',
        },
        {
          type: 'code',
          code: `// Chase the player instead of snapping to them.
const sf::Vector2f current = camera.getCenter();
const sf::Vector2f target = player.getPosition();
const float follow = 1.f - std::exp(-8.f * dt);
camera.setCenter(current + (target - current) * follow);

// Zoom with the mouse wheel (inside the event loop).
if (const auto* wheel = event->getIf<sf::Event::MouseWheelScrolled>()) {
    camera.zoom(wheel->delta > 0.f ? 0.9f : 1.1f);
}`,
          annotations: [
            { lines: 4, text: 'This turns the delta time into a 0 to 1 fraction. Using `exp` keeps the smoothness the same at 30 or 144 frames per second.' },
            { lines: 5, text: 'Move the centre a fraction of the way toward the target. It eases in and never overshoots.' },
            { lines: 8, text: '`getIf` returns a pointer to the event data, or `nullptr` if it is a different event type.' },
            { lines: 9, text: 'Scrolling forward shrinks the view (zoom in); scrolling back enlarges it (zoom out).' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Clamp after you ease and after you zoom',
          text: 'Zooming out changes how much world the view covers, so a centre that was safely inside the world can now show empty space past the edge. Clamp the centre and limit the zoom range after both steps.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the draw calls for one frame in the right order for a scrolling game with a HUD.',
      lines: [
        'window.clear(...)',
        'window.setView(camera)',
        'window.draw(player)',
        'window.setView(window.getDefaultView())',
        'window.draw(healthBar)',
        'window.display()',
      ],
      explanation: 'Clear first, then draw the world through the camera view, then switch to the default (screen-space) view for the HUD so it stays fixed and sits on top, and finally display. Drawing the HUD before switching back would make it scroll with the world.',
    },
    {
      kind: 'concept',
      title: 'Resizing the window and letterboxing',
      blocks: [
        {
          type: 'p',
          text: 'When the player drags the window edge, the default view keeps showing the **same pixel area**, so a larger window shows more empty space in the corner. A game view stretches to fit, which distorts shapes if the aspect ratio changes. Most games choose a **virtual resolution** (say 1280 × 720) and keep that aspect ratio, adding black bars where needed. That technique is called **letterboxing**, and it uses the view\'s **viewport**, the part of the window the view is drawn into, as fractions from 0 to 1.',
        },
        {
          type: 'code',
          code: `sf::View makeLetterboxView(sf::Vector2u windowSize, sf::Vector2f virtualSize) {
    sf::View view(sf::FloatRect({0.f, 0.f}, virtualSize));
    const float windowRatio = static_cast<float>(windowSize.x) /
                              static_cast<float>(windowSize.y);
    const float viewRatio = virtualSize.x / virtualSize.y;
    float sizeX = 1.f;
    float sizeY = 1.f;
    float posX = 0.f;
    float posY = 0.f;
    if (windowRatio > viewRatio) {          // window too wide: bars at the sides
        sizeX = viewRatio / windowRatio;
        posX = (1.f - sizeX) / 2.f;
    } else {                                // window too tall: bars top and bottom
        sizeY = windowRatio / viewRatio;
        posY = (1.f - sizeY) / 2.f;
    }
    view.setViewport(sf::FloatRect({posX, posY}, {sizeX, sizeY}));
    return view;
}

// In the event loop:
//   if (event->is<sf::Event::Resized>()) {
//       view = makeLetterboxView(window.getSize(), {1280.f, 720.f});
//   }`,
          annotations: [
            { lines: 2, text: 'The view always covers the **virtual** 1280 × 720 world, whatever the window size.' },
            { lines: [10, 12], text: 'A wider-than-needed window: shrink the viewport\'s width and centre it, which leaves vertical bars at the sides.' },
            { lines: [13, 15], text: 'A taller-than-needed window: shrink the height instead, which leaves horizontal bars.' },
            { lines: 17, text: 'The viewport is in **fractions of the window** (0 to 1), not pixels.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not simply stretch to fill the window?',
          text: 'Stretching a 16:9 picture into a 4:3 window squashes circles into ovals and makes the player look different on every monitor. Letterboxing keeps the shape of everything correct at the cost of some black bars. Some games instead reveal more or less world at the sides, but that changes what players can see, which is unfair in competitive games.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Remember to clear the bars',
          text: 'The areas outside the viewport are not drawn to, so clear the window to black each frame (`window.clear(sf::Color::Black)`) before setting the view. Otherwise stale pixels may show in the bars.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'The camera has scrolled right. The player clicks at pixel (200, 100). Which gives the **world** position under that click?',
      options: [
        { text: 'window.mapPixelToCoords(sf::Mouse::getPosition(window), camera)', correct: true, why: 'Passing the camera as the second argument converts the pixel using that view\'s position, zoom and rotation.' },
        { text: 'sf::Vector2f(200.f, 100.f)', why: 'That treats pixels as world coordinates, only correct when the camera has not moved or zoomed.' },
        { text: 'camera.getCenter()', why: 'That is the world point at the **middle** of the screen, not the point under the click.' },
        { text: 'window.getDefaultView().getCenter()', why: 'That is the centre of the default (pixel) view, which has nothing to do with where the camera is looking.' },
      ],
      codeOptions: true,
      explanation: '`mapPixelToCoords` has an overload that takes the view to convert against. With no view argument it uses whichever view is currently set on the window, so remember to pass the **game camera** if you have since switched to the HUD view.',
    },
    {
      kind: 'fill',
      prompt: 'Complete the viewport so this view fills only the **left half** of the window (for split screen).',
      template: 'view.setViewport(sf::FloatRect({0.f, 0.f}, {___, ___}));',
      blanks: [{ answers: ['0.5f', '0.5'] }, { answers: ['1.f', '1.0f', '1'] }],
      wordBank: ['0.5f', '1.f', '0.f', '2.f', '800.f'],
      explanation: 'A viewport is in fractions of the window. Half the width (0.5) and the full height (1) covers the left half. The second player\'s view would start at x = 0.5.',
    },
    {
      kind: 'bug',
      prompt: 'The score bar scrolls off screen as the player walks. Tap the line that causes it.',
      code: `window.clear();
window.setView(camera);
window.draw(level);
window.draw(player);
window.draw(scoreBar);
window.display();`,
      bugLines: [5],
      explanation: '`scoreBar` is drawn while the camera view is still active, so it is placed in world space and scrolls away. Insert `window.setView(window.getDefaultView());` before drawing HUD elements so they use fixed screen coordinates.',
    },
  ],
  takeaways: [
    'An `sf::View` is a rectangle of the world shown in the window; moving, zooming or rotating the view is a camera, and objects keep their true world positions.',
    '`zoom(factor)` multiplies the view\'s size: below 1 zooms in, above 1 zooms out.',
    'Follow the player with `setCenter`, and clamp the centre so the view never leaves the world.',
    'Draw the world with the camera view, then switch to `window.getDefaultView()` to draw a HUD that does not scroll.',
    'Letterbox with `setViewport` (fractions of the window) so a resized window never distorts the picture; use `mapPixelToCoords(pixel, view)` for clicks.',
  ],
  reading: [
    { title: 'Controlling the 2D camera with views', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/view/', source: 'other', note: 'Covers viewports, minimaps, split screen and coordinate conversion.' },
    { title: 'Drawing 2D stuff', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/draw/', source: 'other', note: 'Places views in the wider drawing pipeline.' },
  ],
};
