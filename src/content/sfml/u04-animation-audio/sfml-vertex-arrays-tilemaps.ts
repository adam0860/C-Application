import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-vertex-arrays-tilemaps',
  title: 'Vertex Arrays and Tilemaps',
  summary: 'Understand draw calls, build quads out of triangles, and batch thousands of tiles into one drawable that you can scroll, scale and cull.',
  minutes: 20,
  objectives: [
    'Explain why many small `draw` calls are slower than one batched call',
    'Describe an `sf::Vertex` and build a textured quad from two triangles',
    'Write a `TileMap` class that derives from `sf::Drawable` and `sf::Transformable`',
    'Choose a primitive type for lines, points and fans',
    'Draw only the part of a large map that the camera can see',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Why a thousand sprites can be slow',
      blocks: [
        {
          type: 'p',
          text: 'Suppose a level is 100 × 100 tiles. Drawing it with one `sf::Sprite` per tile means **10,000 calls** to `window.draw` every frame. Each call has a fixed cost on the CPU, because SFML must set up state, hand the data to the graphics driver and ask it to render. The graphics card itself could draw those 10,000 little squares in no time; it is the **bookkeeping per call** that adds up. A [[draw-call]] is that request, and reducing how many you make is called [[batching]].',
        },
        {
          type: 'p',
          text: 'The cure is `sf::VertexArray`. Instead of 10,000 objects, you describe all the geometry in **one list of points** and draw it with one call. A point in that list is an `sf::Vertex`: a position, a colour and a pair of [[texture-coordinates]] saying which pixel of the texture sits at that corner.',
        },
        {
          type: 'code',
          code: `sf::VertexArray triangle(sf::PrimitiveType::Triangles, 3);

triangle[0].position = {100.f, 100.f};
triangle[1].position = {300.f, 100.f};
triangle[2].position = {200.f, 300.f};

triangle[0].color = sf::Color::Red;
triangle[1].color = sf::Color::Green;
triangle[2].color = sf::Color::Blue;

window.draw(triangle);`,
          annotations: [
            { lines: 1, text: 'The primitive type says how to read the points. `Triangles` means every **three** vertices form one triangle.' },
            { lines: [3, 5], text: 'Positions are in world coordinates, just like a shape\'s points, so a view or transform applies to them.' },
            { lines: [7, 9], text: 'Colours are given per vertex, and the graphics card blends them across the triangle, giving a smooth gradient for free.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why is the cost per call, not per triangle?',
          text: 'The CPU and the graphics card run asynchronously. Every draw call makes the CPU gather state and talk to the driver, which is slow compared with the card\'s raw drawing speed. A card can render millions of triangles per frame, but a CPU can only issue so many calls before the frame is over. One call with 60,000 vertices therefore finishes far sooner than 10,000 calls with six vertices each, even though the card does the same pixel work.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'A game draws 5,000 identical grass tiles as 5,000 separate sprites and runs slowly. What is the most likely reason, and the fix?',
      options: [
        { text: 'Too many draw calls; batch the tiles into one `sf::VertexArray`.', correct: true, why: 'The cost is mostly per-call overhead on the CPU. One vertex array drawn once removes almost all of it.' },
        { text: 'The texture is too small; load a larger texture.', why: 'Texture size does not change how many draw calls are made.' },
        { text: 'The sprites are rotating; stop rotating them.', why: 'Transforms are cheap. The issue is the number of separate draws.' },
        { text: 'The window is too large; make it smaller.', why: 'Window size affects pixel work, but the CPU overhead is the same at any size.' },
      ],
      explanation: 'When a lot of identical, rarely changing sprites use one texture, they are the ideal candidate for batching. Measure first, but this is the textbook case.',
    },
    {
      kind: 'concept',
      title: 'Building a quad, and a TileMap class',
      blocks: [
        {
          type: 'p',
          text: 'A tile is a square, but the graphics card only draws triangles, lines and points. SFML 3 therefore has **no quad primitive** (`Quads` existed in SFML 2). A square is two triangles that share a diagonal, which means **six vertices per tile**. Give each corner the matching texture coordinate and the card paints the right piece of the tileset onto it.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <optional>
#include <vector>

class TileMap : public sf::Drawable, public sf::Transformable {
public:
    void load(const sf::Texture& tileset, sf::Vector2u tileSize,
              const std::vector<int>& tiles, unsigned width, unsigned height) {
        m_tileset = &tileset;
        m_vertices.setPrimitiveType(sf::PrimitiveType::Triangles);
        m_vertices.resize(static_cast<std::size_t>(width) * height * 6);

        const unsigned perRow = tileset.getSize().x / tileSize.x;
        const float tw = static_cast<float>(tileSize.x);
        const float th = static_cast<float>(tileSize.y);

        for (unsigned y = 0; y < height; ++y) {
            for (unsigned x = 0; x < width; ++x) {
                const unsigned tile = static_cast<unsigned>(tiles[x + y * width]);
                const float tu = static_cast<float>(tile % perRow) * tw;
                const float tv = static_cast<float>(tile / perRow) * th;
                const float px = static_cast<float>(x) * tw;
                const float py = static_cast<float>(y) * th;

                sf::Vertex* t = &m_vertices[(x + y * width) * 6];
                t[0].position = {px, py};            t[0].texCoords = {tu, tv};
                t[1].position = {px + tw, py};       t[1].texCoords = {tu + tw, tv};
                t[2].position = {px, py + th};       t[2].texCoords = {tu, tv + th};
                t[3].position = {px, py + th};       t[3].texCoords = {tu, tv + th};
                t[4].position = {px + tw, py};       t[4].texCoords = {tu + tw, tv};
                t[5].position = {px + tw, py + th};  t[5].texCoords = {tu + tw, tv + th};
            }
        }
    }

private:
    void draw(sf::RenderTarget& target, sf::RenderStates states) const override {
        states.transform *= getTransform();
        states.texture = m_tileset;
        target.draw(m_vertices, states);
    }

    sf::VertexArray m_vertices;
    const sf::Texture* m_tileset = nullptr;
};

int main() {
    // Make a 4-tile tileset in memory so the example needs no files.
    constexpr unsigned tileSize = 32;
    const sf::Color base[4] = {sf::Color(60, 160, 60), sf::Color(50, 100, 200),
                               sf::Color(230, 210, 130), sf::Color(130, 130, 140)};
    sf::Image image(sf::Vector2u(4 * tileSize, tileSize), sf::Color::Black);
    for (unsigned f = 0; f < 4; ++f) {
        for (unsigned y = 1; y < tileSize - 1; ++y) {
            for (unsigned x = f * tileSize + 1; x < (f + 1) * tileSize - 1; ++x) {
                image.setPixel({x, y}, base[f]);
            }
        }
    }
    sf::Texture tileset;
    if (!tileset.loadFromImage(image)) {
        return 1;
    }

    constexpr unsigned width = 16;
    constexpr unsigned height = 12;
    std::vector<int> level(width * height, 0);               // 0 = grass
    for (unsigned y = 0; y < height; ++y) {
        for (unsigned x = 0; x < width; ++x) {
            int t = 0;
            if (x >= 5 && x <= 10 && y >= 3 && y <= 8) t = 2;   // sand
            if (x >= 6 && x <= 9 && y >= 4 && y <= 7) t = 1;    // water
            if (x == 0 || y == 0 || x == width - 1 || y == height - 1) t = 3;   // stone
            level[x + y * width] = t;
        }
    }

    TileMap map;
    map.load(tileset, {tileSize, tileSize}, level, width, height);

    sf::RenderWindow window(sf::VideoMode({width * tileSize, height * tileSize}), "Tile map");
    window.setFramerateLimit(60);
    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        window.clear();
        window.draw(map);
        window.display();
    }
}`,
          annotations: [
            { lines: 5, text: 'Deriving from `sf::Drawable` lets `window.draw(map)` work, and `sf::Transformable` gives the map a position, scale and rotation for free.' },
            { lines: 9, text: 'The map **points at** the tileset; it does not own it. As with sprites, the texture must outlive the map.' },
            { lines: 11, text: 'Six vertices per tile: two triangles. The array is sized once, up front.' },
            { lines: 13, text: 'How many tiles fit across the tileset. This turns a tile number into a column and row.' },
            { lines: [19, 23], text: 'The tile number picks where in the tileset to read (`tu`, `tv`) and where in the world to put it (`px`, `py`).' },
            { lines: [26, 31], text: 'The corners of the two triangles. Each position is paired with the texture coordinate for the same corner, in **pixels** of the texture.' },
            { lines: [38, 40], text: 'The `draw` override: apply the map\'s transform, attach the tileset texture, and draw the whole map in **one call**.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must states.texture be set?',
          text: 'A vertex array does not know about textures; it is only positions, colours and coordinates. The texture comes from the `RenderStates` passed to `draw`. If you leave it null, the coordinates are ignored and every tile is drawn as a flat white (or vertex-coloured) square. It also means one array can be drawn with different textures, depending on the state you give it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Build once, draw many times',
          text: 'Filling the vertices is the slow part; drawing them is fast. Do it in `load`, not every frame. If a single tile changes (a door opens), update just those six vertices\' texture coordinates in place rather than rebuilding the map.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'In SFML 3, you can draw a rectangle directly with `sf::PrimitiveType::Quads`.',
      answer: false,
      explanation: 'SFML 3 removed the `Quads` primitive, because modern graphics APIs do not support it natively. Build each rectangle from two triangles (six vertices), or use a triangle strip.',
    },
    {
      kind: 'concept',
      title: 'Choosing a primitive type',
      blocks: [
        {
          type: 'p',
          text: 'The primitive type tells SFML how to group the vertices. Triangles are the workhorse, but the others are handy for debugging and effects:',
        },
        {
          type: 'table',
          headers: ['Type', 'Reads vertices as', 'Good for'],
          rows: [
            ['`Points`', 'Each vertex is one dot', 'Particles, star fields, sparkle'],
            ['`Lines`', 'Every 2 vertices make a line', 'Debug rays, laser sights, grids'],
            ['`LineStrip`', 'Each vertex joins the previous one', 'Trails, paths, graphs'],
            ['`Triangles`', 'Every 3 vertices make a triangle', 'Tile maps, custom shapes (most common)'],
            ['`TriangleStrip`', 'Each vertex adds a triangle', 'Ribbons and long bands, in fewer vertices'],
            ['`TriangleFan`', 'Fan around the first vertex', 'Pie slices, discs, cones'],
          ],
        },
        {
          type: 'code',
          code: `// A debug line from the player to the mouse.
sf::VertexArray ray(sf::PrimitiveType::Lines, 2);
ray[0] = sf::Vertex{player.getPosition(), sf::Color::Red};
ray[1] = sf::Vertex{mouseWorld, sf::Color::Red};
window.draw(ray);`,
          annotations: [
            { lines: 2, text: 'Two vertices make one line.' },
            { lines: [3, 4], text: '`sf::Vertex{position, colour}` sets those two fields and leaves the texture coordinates at zero.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Lines are always one pixel thick',
          text: 'There is no thickness setting for `Lines` or `LineStrip`; they stay thin no matter how you zoom. For a thick line, draw a rotated `sf::RectangleShape`, or build a thin quad out of two triangles.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the lines that turn a tile number into the pixel position of its top-left corner in the tileset.',
      template: 'const unsigned perRow = tileset.getSize().x / tileSize.x;\nconst float tu = static_cast<float>(tile % ___) * tw;\nconst float tv = static_cast<float>(tile / ___) * th;',
      blanks: [{ answers: ['perRow'] }, { answers: ['perRow'] }],
      wordBank: ['perRow', 'tw', 'th', 'width', 'tile'],
      explanation: 'The remainder after dividing by the number of tiles per row is the column, and the quotient is the row. Both use `perRow`, so tile 5 in a 4-wide tileset is column 1, row 1.',
    },
    {
      kind: 'bug',
      prompt: 'Nothing but half of each tile appears on screen. Tap the line with the mistake.',
      code: `m_vertices.setPrimitiveType(sf::PrimitiveType::Triangles);
m_vertices.resize(width * height * 4);
for (unsigned i = 0; i < width * height; ++i) {
    sf::Vertex* t = &m_vertices[i * 6];
    // ... fill six vertices ...
}`,
      bugLines: [2],
      explanation: 'With `Triangles`, each tile needs two triangles = **six** vertices, and the loop writes six per tile. The array was sized with four, so the later tiles write past the end. Size it with `width * height * 6`.',
    },
    {
      kind: 'concept',
      title: 'Drawing only what the camera sees',
      blocks: [
        {
          type: 'p',
          text: 'One vertex array for a 100 × 100 map is a single draw call, which is fine. But the card still processes all 60,000 vertices each frame even if only a small corner is visible. For very large maps, split the map into **chunks**, such as 16 × 16 tiles each with its own `sf::VertexArray`, and draw only the chunks that overlap the camera. Skipping the rest is called [[culling]].',
        },
        {
          type: 'code',
          code: `const sf::FloatRect viewRect(camera.getCenter() - camera.getSize() / 2.f,
                             camera.getSize());

window.setView(camera);
for (const Chunk& chunk : chunks) {
    if (viewRect.findIntersection(chunk.vertices.getBounds())) {
        window.draw(chunk.vertices, states);
    }
}`,
          annotations: [
            { lines: [1, 2], text: 'The camera\'s rectangle in world coordinates: top-left corner, then size.' },
            { lines: 6, text: '`findIntersection` returns an `std::optional`, which is empty when the rectangles do not touch, so the `if` is true only for visible chunks.' },
            { lines: 7, text: 'Skipped chunks cost nothing: no vertices are sent to the card.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Measure before you chunk',
          text: 'A single array of a few thousand tiles is fast on any modern card, and chunking adds code. Reach for it when a map is huge (hundreds of tiles each way) or when profiling shows tile drawing taking a meaningful share of the frame. A common middle path is one array per **layer** (ground, objects, roof), so you can draw the player between layers.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does skipping offscreen geometry help if the card clips it anyway?',
          text: 'The card does throw away triangles outside the view, but only after your program has sent every vertex and the card has transformed it. Culling at chunk level avoids sending and transforming those vertices at all. At small scale the saving is invisible; at large scale it is the difference between a steady frame rate and a stuttering one.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the steps of building and showing a tile map in order.',
      lines: [
        'Load the tileset texture',
        'Set the primitive type and resize the vertex array',
        'Fill each tile\'s six vertices with positions and texture coordinates',
        'In draw(): apply the transform and set states.texture',
        'Draw the vertex array with one call',
      ],
      linesAreCode: false,
      explanation: 'The texture must exist before the map points at it. The geometry is built once, up front. Every frame you only set the render states and draw the array in a single call.',
    },
  ],
  takeaways: [
    'Each `window.draw` call has fixed CPU overhead; batching many quads into one `sf::VertexArray` is the standard cure for slow tile and particle drawing.',
    'An `sf::Vertex` holds a position, a colour and texture coordinates; SFML 3 has no `Quads`, so a square is two triangles (six vertices).',
    'A `TileMap` derives from `sf::Drawable` and `sf::Transformable`, builds its vertices once in `load`, and sets `states.texture` in `draw`.',
    'Pick the primitive that fits: `Points`, `Lines`/`LineStrip`, `Triangles`, `TriangleStrip` or `TriangleFan`. Lines are always one pixel thick.',
    'For large worlds, split into chunks and draw only those overlapping the camera (culling), but measure before adding that complexity.',
  ],
  reading: [
    { title: 'Designing your own entities with vertex arrays', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/vertex-array/', source: 'other', note: 'Includes the official tile map example this lesson is based on.' },
    { title: 'Position, rotation, scale: transforming entities', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/transform/', source: 'other', note: 'How sf::Transformable and render states combine.' },
  ],
};
