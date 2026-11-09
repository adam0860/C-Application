import type { CheatSheet } from '../types';

/*
 * Quick-reference sheets for the SFML 3 course. Every snippet was compiled
 * against the SFML 3 headers.
 */
export const sfmlCheatSheets: CheatSheet[] = [
  // -------------------------------------------------------------- migration
  {
    id: 'sfml-2-to-3',
    title: 'SFML 2 → 3 Migration',
    course: 'sfml',
    icon: '🔄',
    description: 'The changes that break old tutorials: events, constructors, enums, vectors and angles.',
    sections: [
      {
        title: 'Windows and events',
        items: [
          {
            label: 'VideoMode takes a vector',
            code: `// SFML 2: sf::VideoMode(800, 600)
sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Title");`,
          },
          {
            label: 'Polling returns std::optional',
            code: `// SFML 2: sf::Event event; while (window.pollEvent(event)) { ... }
while (const std::optional event = window.pollEvent()) {
    if (event->is<sf::Event::Closed>())
        window.close();
}`,
          },
          {
            label: 'Event data with getIf',
            code: `if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
    if (key->code == sf::Keyboard::Key::Escape)
        window.close();
}`,
            text: 'Event types are structs now, not `event.type` plus a union.',
          },
          {
            label: 'Fullscreen is a state',
            code: `sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "Title", sf::State::Fullscreen);`,
          },
        ],
      },
      {
        title: 'Enums and constructors',
        items: [
          {
            label: 'Scoped enums',
            code: `// SFML 2: sf::Keyboard::A, sf::Mouse::Left
sf::Keyboard::Key::A
sf::Mouse::Button::Left`,
          },
          {
            label: 'Resources load in the constructor',
            code: `sf::Texture texture("player.png");   // throws on failure
sf::Font font("arial.ttf");          // throws on failure
sf::SoundBuffer buffer("hit.wav");   // throws on failure`,
            text: 'Use `loadFromFile` or `openFromFile` when you want a `bool` instead of an exception.',
          },
          {
            label: 'Sprite, Text and Sound need an lvalue resource',
            code: `sf::Sprite sprite(texture);
sf::Text text(font, "Score", 24);
sf::Sound sound(buffer);`,
            text: 'There is no default constructor, and temporaries are deleted so they cannot dangle.',
          },
          {
            label: 'Rectangles use position and size',
            code: `sf::IntRect frame({0, 0}, {32, 32});
if (auto hit = a.getGlobalBounds().findIntersection(b.getGlobalBounds())) {
    // hit->position, hit->size
}`,
            text: '`findIntersection` replaces `intersects` and returns a `std::optional`.',
          },
        ],
      },
      {
        title: 'Vectors, angles and primitives',
        items: [
          {
            label: 'Angles are a type',
            code: `// SFML 2: sprite.setRotation(45.f)
sprite.setRotation(sf::degrees(45.f));
float d = sprite.getRotation().asDegrees();`,
          },
          {
            label: 'Vector helpers',
            code: `sf::Vector2f v{3.f, 4.f};
float len  = v.length();         // 5
sf::Vector2f dir = v.normalized(); // asserts if v is zero
sf::Angle a = v.angle();`,
          },
          {
            label: 'No Quads',
            code: `sf::VertexArray quads(sf::PrimitiveType::Triangles, count * 6);`,
            text: 'Build each quad from two triangles (6 vertices).',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------- window and input
  {
    id: 'sfml-window-input',
    title: 'Window, Events & Input',
    course: 'sfml',
    icon: '🪟',
    description: 'Creating a window, the main loop, event handling and real-time keyboard and mouse input.',
    sections: [
      {
        title: 'Window',
        items: [
          {
            label: 'Create and configure',
            code: `sf::RenderWindow window(sf::VideoMode({800u, 600u}), "My Game");
window.setFramerateLimit(60);         // or v-sync, not both
window.setKeyRepeatEnabled(false);
window.setMouseCursorVisible(false);
window.setTitle("New title");`,
          },
          {
            label: 'V-sync',
            code: `window.setVerticalSyncEnabled(true);`,
            text: 'Choose either v-sync or a frame limit. Turn both off when profiling.',
          },
          {
            label: 'The frame',
            code: `while (window.isOpen()) {
    // 1. events   2. update   3. draw
    window.clear(sf::Color(20, 20, 30));
    // window.draw(...);
    window.display();
}`,
          },
        ],
      },
      {
        title: 'Events (happened once)',
        items: [
          {
            label: 'Close and resize',
            code: `while (const std::optional event = window.pollEvent()) {
    if (event->is<sf::Event::Closed>())
        window.close();
    if (const auto* r = event->getIf<sf::Event::Resized>()) {
        sf::Vector2u newSize = r->size;
    }
}`,
          },
          {
            label: 'Key press',
            code: `if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
    if (key->code == sf::Keyboard::Key::Space) { /* jump once */ }
}`,
          },
          {
            label: 'Mouse click',
            code: `if (const auto* m = event->getIf<sf::Event::MouseButtonPressed>()) {
    if (m->button == sf::Mouse::Button::Left) {
        sf::Vector2i pixel = m->position;
    }
}`,
          },
        ],
      },
      {
        title: 'Real-time input (held right now)',
        items: [
          {
            label: 'Keyboard and mouse state',
            code: `if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::A)) { /* move left */ }
if (sf::Mouse::isButtonPressed(sf::Mouse::Button::Left)) { /* firing */ }`,
            text: 'Use events for one-off actions and polling for continuous ones.',
          },
          {
            label: 'Mouse position in the world',
            code: `sf::Vector2i pixel = sf::Mouse::getPosition(window);
sf::Vector2f world = window.mapPixelToCoords(pixel);`,
            text: 'Convert through the view so aiming still works when the camera moves or zooms.',
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- drawing
  {
    id: 'sfml-drawing',
    title: 'Drawing & Transforms',
    course: 'sfml',
    icon: '🎨',
    description: 'Sprites, shapes, text, colours, transforms, views and the geometry helpers you use every day.',
    sections: [
      {
        title: 'Sprites and textures',
        items: [
          {
            label: 'Sprite from a texture',
            code: `sf::Texture tex("hero.png");
sf::Sprite sprite(tex);
sprite.setPosition({100.f, 100.f});`,
            text: 'The texture must outlive every sprite that uses it.',
          },
          {
            label: 'Sprite sheet frame',
            code: `sprite.setTextureRect(sf::IntRect({0, 0}, {32, 32}));`,
          },
          {
            label: 'Tint and fade',
            code: `sprite.setColor(sf::Color(255, 255, 255, 128));  // 50% transparent`,
          },
        ],
      },
      {
        title: 'Shapes and text',
        items: [
          {
            label: 'Shapes',
            code: `sf::RectangleShape rect({50.f, 20.f});
sf::CircleShape circle(10.f);
circle.setFillColor(sf::Color::Red);
circle.setOutlineThickness(2.f);`,
          },
          {
            label: 'Text',
            code: `sf::Font font("arial.ttf");
sf::Text text(font, "Score: 0", 24);
text.setFillColor(sf::Color::White);`,
            text: 'Only call `setString` when the value changes.',
          },
        ],
      },
      {
        title: 'Transforms',
        items: [
          {
            label: 'Move, rotate, scale around the centre',
            code: `sprite.setOrigin({16.f, 16.f});            // pivot point, in local pixels
sprite.setPosition({200.f, 150.f});
sprite.setRotation(sf::degrees(45.f));
sprite.setScale({2.f, 2.f});`,
            text: 'Set the origin first or the object spins around its top-left corner.',
          },
          {
            label: 'Bounds',
            code: `sf::FloatRect local  = sprite.getLocalBounds();   // before transforms
sf::FloatRect global = sprite.getGlobalBounds();  // after transforms`,
          },
        ],
      },
      {
        title: 'Views (camera)',
        items: [
          {
            label: 'Centre and zoom',
            code: `sf::View view = window.getDefaultView();
view.setCenter({400.f, 300.f});
view.zoom(0.5f);                // 2x closer
window.setView(view);`,
          },
          {
            label: 'Draw the HUD in screen space',
            code: `window.setView(camera);
// draw the world
window.setView(window.getDefaultView());
// draw score and health`,
          },
        ],
      },
      {
        title: 'Geometry and collision',
        items: [
          {
            label: 'Rectangle overlap',
            code: `if (auto hit = a.getGlobalBounds().findIntersection(b.getGlobalBounds())) {
    // overlapping; hit->size is the overlap
}`,
          },
          {
            label: 'Distance and direction',
            code: `sf::Vector2f d = target - position;
float dist2 = d.lengthSquared();         // cheaper, no square root
if (dist2 > 0.f) position += d.normalized() * speed * dt;`,
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- audio and time
  {
    id: 'sfml-audio-time',
    title: 'Audio & Time',
    course: 'sfml',
    icon: '🔊',
    description: 'Sound effects, streamed music, volume and pitch, plus clocks and delta time.',
    sections: [
      {
        title: 'Time',
        items: [
          {
            label: 'Delta time',
            code: `sf::Clock clock;
while (window.isOpen()) {
    const float dt = clock.restart().asSeconds();
    position += velocity * dt;   // pixels per second
}`,
          },
          {
            label: 'Clamp big frames',
            code: `const float dt = std::min(clock.restart().asSeconds(), 0.05f);`,
            text: 'Stops one long stall (dragging the window) from teleporting everything.',
          },
          {
            label: 'Time values',
            code: `sf::Time t = sf::seconds(1.f) + sf::milliseconds(250);
float s = t.asSeconds();
int   ms = t.asMilliseconds();`,
          },
        ],
      },
      {
        title: 'Sound effects',
        items: [
          {
            label: 'Buffer plus sound',
            code: `sf::SoundBuffer buffer("hit.wav");
sf::Sound sound(buffer);
sound.setVolume(50.f);     // 0 to 100
sound.play();`,
            text: 'The buffer holds the samples and must outlive the sound.',
          },
          {
            label: 'Vary the pitch',
            code: `sound.setPitch(1.f + (dist(rng) - 0.5f) * 0.1f);   // about ±5%`,
            text: 'Stops repeated effects from sounding robotic.',
          },
        ],
      },
      {
        title: 'Music and global volume',
        items: [
          {
            label: 'Streamed music',
            code: `sf::Music music;
if (!music.openFromFile("theme.ogg"))
    return 1;
music.setLooping(true);
music.play();`,
            text: 'Music streams from disk. It is movable but not copyable.',
          },
          {
            label: 'Master volume',
            code: `sf::Listener::setGlobalVolume(80.f);`,
          },
          {
            label: 'Spatial sound',
            code: `sound.setPosition({x, y, 0.f});
sound.setMinDistance(50.f);
sound.setAttenuation(1.f);`,
            text: 'Spatialisation only works for mono sources.',
          },
        ],
      },
    ],
  },
];
