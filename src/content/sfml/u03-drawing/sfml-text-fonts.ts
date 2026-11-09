import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-text-fonts',
  title: 'Text and Fonts',
  summary: 'Load fonts, draw and update text for scores and menus, centre it correctly, and avoid the font-lifetime trap.',
  minutes: 14,
  objectives: [
    'Load an `sf::Font` and create an `sf::Text` from it',
    'Style text with size, colour, outline and the `Bold`/`Italic` flags',
    'Update text efficiently when a value changes',
    'Centre or right-align text using its local bounds',
    'Explain why a font must outlive every text that uses it',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Font and Text',
      blocks: [
        {
          type: 'p',
          text: 'Text follows the same pattern as images: a heavy resource and a light object that points at it. An `sf::Font` is a loaded font file (TTF, OTF and a few other formats). An `sf::Text` is a string drawn with a font at a given size and colour. The font owns the glyph shapes; the text only borrows them.',
        },
        {
          type: 'code',
          code: `sf::Font font;
if (!font.openFromFile("assets/DejaVuSans.ttf")) {
    return 1;
}

sf::Text score(font, "Score: 0", 32);
score.setFillColor(sf::Color::White);
score.setOutlineColor(sf::Color::Black);
score.setOutlineThickness(2.f);
score.setStyle(sf::Text::Bold | sf::Text::Italic);
score.setPosition({20.f, 10.f});`,
          annotations: [
            { lines: 2, text: 'Fonts use `openFromFile` (they stay open for lazy glyph loading), not `loadFromFile`. It returns `false` on failure.' },
            { lines: 6, text: 'The constructor takes the font, the string and the character size **in pixels**, in that order in SFML 3.' },
            { lines: [7, 9], text: 'Text has fill and outline colours like a shape. An outline keeps white text readable over any background.' },
            { lines: 10, text: 'Style flags combine with `|`. Available: `Regular`, `Bold`, `Italic`, `Underlined`, `StrikeThrough`.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'SFML does not ship a default font',
          text: 'You must provide a font file yourself, and mind its licence before you distribute it. Free options include fonts under the SIL Open Font License or Apache licence (for example the Google Fonts collection). Copy the file into your `assets` folder and load it from there; do not rely on system font paths, which differ per machine.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must the font outlive the text?',
          text: 'Exactly the same reason as textures: an `sf::Text` keeps a pointer to its `sf::Font` and reads glyphs from it every time it is drawn. If the font is destroyed (for example it was a local variable in a function that returned), drawing the text reads freed memory. SFML 3 even **deletes** the constructor that accepts a temporary font, so `sf::Text(sf::Font("a.ttf"), ...)` will not compile.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which SFML 3 line correctly creates a 24-pixel text object?',
      options: [
        { text: 'sf::Text label(font, "Hello", 24);', correct: true, why: 'SFML 3 takes the font first, then the string, then the character size.' },
        { text: 'sf::Text label("Hello", font, 24);', why: 'That is the SFML 2 argument order. In SFML 3 the font comes first.' },
        { text: 'sf::Text label; label.setFont(font);', why: 'SFML 3 has no default constructor for text; a font is required to construct it.' },
        { text: 'sf::Text label(font); label.setSize(24);', why: 'There is no `setSize`; the function is `setCharacterSize`.' },
      ],
      codeOptions: true,
      explanation: 'In SFML 3 a `Text` always has a font from the moment it exists (font, string, size). It removes the "forgot to set the font" mistake that SFML 2 allowed.',
    },
    {
      kind: 'concept',
      title: 'Changing text, and what it costs',
      blocks: [
        {
          type: 'p',
          text: 'To show a changing value, call `setString` with a new string. `std::to_string` converts numbers:',
        },
        {
          type: 'code',
          code: `int score = 0;
int shownScore = -1;     // forces the first update

// ... in the game loop ...
if (score != shownScore) {
    scoreText.setString("Score: " + std::to_string(score));
    shownScore = score;
}
window.draw(scoreText);`,
          annotations: [
            { lines: 2, text: 'Remember what is *currently displayed*, separately from the real score.' },
            { lines: 5, text: 'Only rebuild the text when the value has actually changed.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'setString rebuilds geometry',
          text: 'Changing the string, size, style or font makes the text regenerate its triangles the next time it is drawn. That costs a little each time, which is nothing for one score label but adds up if you re-set 200 labels every frame. Compare the new value with the old one and only call `setString` when something changed. A text you never change costs almost nothing per frame.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Non-English text',
          text: '`sf::String` stores Unicode. A plain `std::string` is interpreted using the current locale, which can garble accented or non-Latin characters. For UTF-8 data, build the string with `sf::String::fromUtf8(begin, end)`, and make sure your font actually contains the glyphs you need.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'Calling `scoreText.setString(...)` with the same string every frame is free, because SFML detects that nothing changed.',
      answer: false,
      explanation: 'Do not rely on that. Setting a string, size or style can force the text to rebuild its geometry. Keep a record of the value you last displayed and skip `setString` when it has not changed, so only real changes cost anything.',
    },
    {
      kind: 'concept',
      title: 'Centring and aligning text',
      blocks: [
        {
          type: 'p',
          text: 'SFML text has no alignment option; you position it yourself. Because letters have internal spacing, the exact box around the glyphs does not start at (0, 0). That is why centring uses the **local bounds**, including their `position`:',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>
#include <iostream>

int main() {
    sf::RenderWindow window(sf::VideoMode({800u, 600u}), "Title screen");
    window.setFramerateLimit(60);

    sf::Font font;
    if (!font.openFromFile("assets/DejaVuSans.ttf")) {
        std::cerr << "Missing font\\n";
        return 1;
    }

    sf::Text title(font, "SPACE RAIDERS", 64);
    title.setFillColor(sf::Color(255, 220, 90));

    const sf::FloatRect b = title.getLocalBounds();
    title.setOrigin(b.position + b.size / 2.f);
    title.setPosition({400.f, 200.f});

    sf::Text prompt(font, "Press Enter to start", 28);
    const sf::FloatRect pb = prompt.getLocalBounds();
    prompt.setOrigin({pb.position.x + pb.size.x, 0.f});   // right-align
    prompt.setPosition({780.f, 540.f});

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        window.clear(sf::Color(12, 12, 28));
        window.draw(title);
        window.draw(prompt);
        window.display();
    }
}`,
          annotations: [
            { lines: 17, text: 'The local bounds are the box around the **drawn glyphs**, before the text\'s own transform.' },
            { lines: 18, text: '`position + size / 2` is the centre of that box. Using it as the origin makes `setPosition` place the **middle** of the text.' },
            { lines: [23, 24], text: 'For right alignment, put the origin at the box\'s right edge. The text then grows leftward from the position.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why add bounds.position as well as half the size?',
          text: 'The local bounds start slightly to the right of and below the origin, because the first letter has a left-side bearing and the line has some ascent above the baseline. If you only use half the width and height, the text sits a few pixels off-centre, visible on large titles. Adding `position` corrects for it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Size with the character size, not scale',
          text: 'Prefer `setCharacterSize` over `setScale` to make text bigger. SFML renders glyphs at the requested pixel size, so they stay sharp; scaling stretches an already-rendered bitmap and looks blurry.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Several lines, and spacing',
      blocks: [
        {
          type: 'p',
          text: 'A newline character inside the string starts a new line, so a whole help panel can be one `sf::Text`. Two spacing knobs adjust how it looks. Both are **factors**, where `1.f` means "whatever the font normally does":',
        },
        {
          type: 'code',
          code: `sf::Text help(font, "Arrows: move\\nSpace: shoot\\nEsc: quit", 20);
help.setLineSpacing(1.3f);
help.setLetterSpacing(1.1f);
help.setPosition({20.f, 480.f});
window.draw(help);`,
          annotations: [
            { lines: 1, text: '`\\n` ends a line. The text is still **one object**, with one position and one set of bounds.' },
            { lines: 2, text: 'Line spacing scales the gap between lines: `1.3f` is 30% more air than the font\'s default.' },
            { lines: 3, text: 'Letter spacing scales the gap between characters. Slightly above 1 helps small, bold text stay readable.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Keep one Text per block of words, not per line',
          text: 'Prefer a single multi-line `sf::Text` over many one-line texts. It is fewer objects to position, and centring or right-aligning the block with its local bounds treats all the lines together.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the code that centres a text object on the window\'s middle.',
      template: 'const sf::FloatRect b = label.getLocalBounds();\nlabel.setOrigin(b.position + b.size / ___);\nlabel.setPosition({400.f, ___});',
      blanks: [{ answers: ['2.f', '2'] }, { answers: ['300.f', '300'] }],
      wordBank: ['2.f', '300.f', '0.f', '800.f', '4.f'],
      explanation: 'Half the bounds\' size (plus its offset) puts the origin in the middle of the glyphs. On an 800 × 600 window the centre is (400, 300), so that is the position.',
    },
    {
      kind: 'bug',
      prompt: 'This function builds a label, but drawing it later crashes or shows garbage. Tap the line that causes it.',
      code: `sf::Text makeLabel(const std::string& words) {
    sf::Font font;
    if (!font.openFromFile("assets/DejaVuSans.ttf")) {
        std::exit(1);
    }
    return sf::Text(font, words, 24);
}`,
      bugLines: [6],
      explanation: '`font` is a local variable that is destroyed when the function returns, but the returned `sf::Text` still points at it. Keep the font somewhere that outlives every text: a member declared before the text, a static, or an asset manager that owns all fonts.',
    },
    {
      kind: 'order',
      prompt: 'Put the steps of a score display in the order they must happen.',
      lines: [
        'Open the font with openFromFile',
        'Construct the sf::Text from that font',
        'Compare the score with the one on screen',
        'Call setString only if it changed',
        'window.draw(scoreText)',
      ],
      linesAreCode: false,
      explanation: 'The font must exist before the text that borrows it. Each frame you then check for a change, update the string only when needed, and finally draw.',
    },
  ],
  takeaways: [
    'An `sf::Text` is built from a font, a string and a pixel size (in that order in SFML 3), and the font must outlive it.',
    'SFML does not provide a font; ship a licensed TTF/OTF in your assets folder and load it with `openFromFile`.',
    '`setString` rebuilds the text\'s geometry, so only call it when the displayed value changes.',
    'Centre or align text by setting its origin from `getLocalBounds()` (including `position`), then calling `setPosition`.',
    'Make text larger with `setCharacterSize`, not `setScale`, so it stays crisp.',
  ],
  reading: [
    { title: 'Text and fonts', url: 'https://www.sfml-dev.org/tutorials/3.0/graphics/text/', source: 'other', note: 'The official guide, including styles and bounds.' },
    { title: 'Google Fonts', url: 'https://fonts.google.com/', source: 'other', note: 'A large collection of freely licensed fonts. Always check the licence of the one you pick.' },
  ],
};
