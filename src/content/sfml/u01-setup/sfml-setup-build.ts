import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'sfml-setup-build',
  title: 'Installing and Building with SFML',
  summary: 'Get SFML 3 compiling in CMake or Visual Studio, understand Debug vs Release libraries, and decode the usual setup errors.',
  minutes: 15,
  objectives: [
    'Choose between the CMake and manual Visual Studio ways of adding SFML',
    'Read and write a minimal CMake file that fetches and links SFML 3',
    'Configure Visual Studio include paths, library paths and linked libraries correctly',
    'Explain why Debug and Release builds must link different SFML libraries',
    'Diagnose a missing include, an unresolved symbol and a missing DLL',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'Three ways to get SFML',
      blocks: [
        {
          type: 'p',
          text: 'Unlike a header-only library, SFML is real compiled code. To use it you need two things: its **headers** (so the compiler knows what `sf::RenderWindow` is) and its **library files** (so the [[linker]] can find the actual machinery). How you obtain and connect those depends on your tools.',
        },
        {
          type: 'table',
          headers: ['Route', 'Best for', 'Trade-off'],
          rows: [
            ['**CMake + FetchContent** (recommended)', 'Any platform; VS Code, CLion, Visual Studio', 'First build compiles SFML from source (a minute or two). Needs Git and CMake.'],
            ['**Manual Visual Studio setup**', 'Visual Studio users who downloaded the prebuilt package', 'You set paths and library names by hand, and must keep Debug and Release straight.'],
            ['**System package manager**', 'Linux (`apt`, `dnf`) or vcpkg', 'Versions can lag; make sure you get SFML **3**, not 2.6.'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does SFML come in a different download for each compiler?',
          text: 'C++ has no standard binary interface. A library built with one compiler version and settings may lay out classes, name functions and manage memory differently from your compiler. That is why SFML\'s Windows downloads are labelled by compiler family and bitness (for example `vc17-64-bit` for the 64-bit Visual Studio 2022 toolset), and why mixing a 32-bit library into a 64-bit project simply will not link. Building from source with CMake sidesteps the problem entirely, because SFML is compiled by *your* compiler.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why does building SFML from source with CMake avoid most "wrong download" problems?',
      options: [
        { text: 'SFML is compiled by your own compiler with your own settings, so everything matches', correct: true, why: 'Compiler, bitness and Debug/Release settings all agree because one toolchain builds both SFML and your game.' },
        { text: 'CMake downloads a prebuilt version that works on every compiler', why: 'No such universal binary exists. C++ has no stable binary interface across compilers.' },
        { text: 'CMake converts SFML into a header-only library', why: 'SFML stays a normal compiled library. CMake just builds it for you.' },
        { text: 'It makes SFML run without needing OpenGL or a window system', why: 'SFML still needs the platform\'s graphics and window libraries. The build method does not change that.' },
      ],
      explanation: 'Binary compatibility in C++ depends on the compiler, its version, the target architecture and Debug/Release settings. Compiling everything with one toolchain removes the whole class of mismatches.',
    },
    {
      kind: 'concept',
      title: 'The CMake way',
      blocks: [
        {
          type: 'p',
          text: 'This is the official SFML project template, trimmed to its essentials. [[cmake]] reads it, downloads SFML 3.1.0 from GitHub, builds it, and links it to your program. You write no paths at all.',
        },
        {
          type: 'code',
          lang: 'cmake',
          title: 'CMakeLists.txt',
          code: `cmake_minimum_required(VERSION 3.28)
project(MyGame LANGUAGES CXX)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/bin)

include(FetchContent)
FetchContent_Declare(SFML
    GIT_REPOSITORY https://github.com/SFML/SFML.git
    GIT_TAG 3.1.0
    GIT_SHALLOW ON
    EXCLUDE_FROM_ALL
    SYSTEM)
FetchContent_MakeAvailable(SFML)

add_executable(main src/main.cpp)
target_compile_features(main PRIVATE cxx_std_17)
target_link_libraries(main PRIVATE SFML::Graphics)`,
          annotations: [
            { lines: 4, text: 'Put the finished program in `build/bin`. Handy later, because DLLs and assets end up next to it.' },
            { lines: [7, 12], text: 'Tell CMake where SFML lives (its Git repository) and which release to use. Pinning `GIT_TAG` means everyone builds the same version.' },
            { lines: [11, 12], text: '`EXCLUDE_FROM_ALL` stops SFML\'s own tests and extras from being built; `SYSTEM` silences warnings from SFML\'s headers so only *your* code produces warnings.' },
            { lines: 13, text: 'Download and add SFML to this project.' },
            { lines: 15, text: 'Your executable, built from `src/main.cpp`.' },
            { lines: 16, text: 'SFML 3 needs at least C++17.' },
            { lines: 17, text: 'Link the Graphics module. CMake automatically links the Window and System modules it depends on.' },
          ],
        },
        {
          type: 'p',
          text: 'Then build from a terminal in the project folder. The first configure step downloads and compiles SFML, so expect a short wait:',
        },
        { type: 'code', lang: 'shell', code: 'cmake -B build\ncmake --build build' },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Using more modules',
          text: 'Add each module you use to `target_link_libraries`, for example `SFML::Graphics SFML::Audio SFML::Network`. A module you never link is a module you do not ship. On Debian or Ubuntu you also need a handful of development packages installed first (for example `libxrandr-dev`, `libudev-dev`, `libfreetype-dev`, `libvorbis-dev`, `libgl1-mesa-dev`); the official template page lists them all.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Prefer an installed SFML?',
          text: 'If SFML is already installed where CMake can find it, replace the `FetchContent` lines with `find_package(SFML 3 REQUIRED COMPONENTS Graphics)`. The `target_link_libraries(... SFML::Graphics)` line stays exactly the same.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the CMake lines so the game links the Graphics and Audio modules from the fetched SFML.',
      template: 'FetchContent_MakeAvailable(___)\ntarget_link_libraries(main PRIVATE SFML::Graphics SFML::___)',
      blanks: [{ answers: ['SFML'] }, { answers: ['Audio'] }],
      wordBank: ['SFML', 'Audio', 'Window', 'main', 'Graphic'],
      explanation: '`FetchContent_MakeAvailable` takes the name given to `FetchContent_Declare` (here `SFML`). Modules are linked as `SFML::<Module>`; you list only the ones you use, because Window and System come along automatically with Graphics.',
    },
    {
      kind: 'concept',
      title: 'The manual Visual Studio way',
      blocks: [
        {
          type: 'p',
          text: 'If you downloaded the prebuilt package (a folder with `include`, `lib` and `bin` inside), Visual Studio needs to be told about each of those. Create an **Empty Project**, add a `main.cpp`, then open **Project Properties** with *All Configurations* selected:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Set the C++ standard', text: '**C/C++ → Language → C++ Language Standard** = *ISO C++17 Standard* (or newer). SFML 3 will not compile in C++14.' },
            { title: 'Add the include folder', text: '**C/C++ → General → Additional Include Directories** = `<your SFML folder>\\include`. This is how `#include <SFML/Graphics.hpp>` is found.' },
            { title: 'Add the library folder', text: '**Linker → General → Additional Library Directories** = `<your SFML folder>\\lib`. This is where the `.lib` files live.' },
            { title: 'Name the libraries, per configuration', text: '**Linker → Input → Additional Dependencies**. Release: `sfml-graphics.lib;sfml-window.lib;sfml-system.lib`. Debug: the same names with `-d` added: `sfml-graphics-d.lib;sfml-window-d.lib;sfml-system-d.lib`.' },
            { title: 'Copy the DLLs', text: 'Copy the `.dll` files from the SFML `bin` folder next to your compiled `.exe` (for dynamic linking, the default). Debug builds need the `-d` DLLs.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Never mix Debug and Release libraries',
          text: 'Release projects link the plain `sfml-*.lib` files and Debug projects link the `sfml-*-d.lib` files. Setting the dependencies for "All Configurations" with only one set is the number-one cause of mysterious crashes and link errors on Windows.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why are there separate Debug libraries at all?',
          text: 'Debug and Release builds use different versions of the C++ runtime library on Windows, with different memory allocators and extra checking in Debug. Passing an object allocated by one runtime to code compiled against the other can corrupt memory. SFML ships both flavours so each of your configurations has a partner that speaks the same runtime.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'Put the manual Visual Studio setup steps in a workable order.',
      lines: [
        'Create an Empty Project and add main.cpp',
        'Set the C++ standard to C++17',
        'Add the SFML include directory',
        'Add the SFML library directory',
        'List the .lib files under Additional Dependencies',
        'Copy the SFML DLLs next to the .exe',
      ],
      explanation: 'The project needs a source file first so Visual Studio treats it as C++ and shows the C/C++ property pages. The compiler settings (standard and include path) come before the linker settings, and the DLLs matter only once you have an executable that runs.',
    },
    {
      kind: 'concept',
      title: 'Prove it works',
      blocks: [
        {
          type: 'p',
          text: 'Before writing any game, confirm the whole chain with a program that draws something. If this window appears, headers, libraries and DLLs are all correct.',
        },
        {
          type: 'code',
          title: 'main.cpp',
          code: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode({400u, 400u}), "SFML works!");
    sf::CircleShape circle(150.f);
    circle.setFillColor(sf::Color::Green);
    circle.setPosition({50.f, 50.f});

    while (window.isOpen()) {
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
        }
        window.clear();
        window.draw(circle);
        window.display();
    }
}`,
          annotations: [
            { lines: 5, text: 'A circle shape with a 150 pixel radius. Shapes are the quickest way to see something on screen without any image files.' },
            { lines: 7, text: 'Position is the **top-left of the circle\'s bounding box**, so a 300-pixel-wide circle at x = 50 is centred in a 400-pixel window.' },
            { lines: 16, text: '`window.draw` adds the shape to this frame. Nothing is visible until `display()` on the next line.' },
          ],
        },
        {
          type: 'table',
          caption: 'Setup errors and what they mean',
          headers: ['Message', 'Stage', 'Usual cause'],
          rows: [
            ['Cannot open include file `SFML/Graphics.hpp`', 'Compile', 'Include directory not set (or set for the wrong configuration)'],
            ['Unresolved external symbol `sf::RenderWindow::...`', 'Link', 'Library directory or `.lib` names missing, wrong bitness, or Debug/Release mismatch'],
            ['"`sfml-graphics-...dll` was not found" at launch', 'Run', 'The DLLs are not next to the `.exe` (or you copied the Release set for a Debug build)'],
            ['Compiler errors inside SFML headers', 'Compile', 'C++ standard is older than C++17'],
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Your Debug build compiles but fails to link with "unresolved external symbol sf::RenderWindow". The Release build works. What is the most likely cause?',
      options: [
        { text: 'The Debug configuration does not list the -d library files under Additional Dependencies', correct: true, why: 'Release and Debug each need their own library names. If only the Release set was entered, Debug has nothing to link against.' },
        { text: 'The program uses C++17', why: 'C++17 is exactly what SFML 3 requires. Using an older standard would cause compile errors, not link errors.' },
        { text: 'The window title contains a space', why: 'Window titles are ordinary strings and can contain anything. They have no effect on linking.' },
        { text: 'The include directory points to the lib folder', why: 'A wrong include path fails at compile time ("cannot open include file"), long before linking starts.' },
      ],
      explanation: '"Unresolved external symbol" is a **linker** message: the compiler was happy with the declarations, but the linker found no library containing the definitions. If one configuration works and the other does not, compare their linker settings.',
    },
    {
      kind: 'bug',
      prompt: 'This program includes `<SFML/Graphics.hpp>` and draws shapes, and it fails to link. Tap the CMake line that is wrong.',
      lang: 'cmake',
      code: `include(FetchContent)
FetchContent_Declare(SFML
    GIT_REPOSITORY https://github.com/SFML/SFML.git
    GIT_TAG 3.1.0)
FetchContent_MakeAvailable(SFML)
add_executable(game src/main.cpp)
target_link_libraries(game PRIVATE SFML::Audio)`,
      bugLines: [7],
      explanation: 'The code uses the Graphics module but the target links only `SFML::Audio`, so every `sf::RenderWindow` and `sf::CircleShape` symbol is missing at link time. The fix is `target_link_libraries(game PRIVATE SFML::Graphics)`, adding `SFML::Audio` only when the game plays sound.',
    },
    {
      kind: 'truefalse',
      prompt: 'If your SFML program builds successfully, it will always run, as long as the executable is on the same computer.',
      answer: false,
      explanation: 'With dynamic linking the `.exe` needs the SFML DLLs at *run* time, located next to it or on the system path. A program can link perfectly and still fail to start with "DLL not found". CMake users avoid this by building static libraries or putting everything in one output folder.',
    },
  ],
  takeaways: [
    'SFML needs both headers and compiled libraries; CMake with `FetchContent` is the easiest route because your compiler builds everything.',
    'Link only the modules you use with `SFML::Graphics`, `SFML::Audio` and so on; Window and System come along automatically.',
    'In Visual Studio, set C++17, the include directory, the library directory, the `.lib` names and then copy the DLLs.',
    'Debug builds link the `-d` libraries and Release builds the plain ones. Mixing them breaks things.',
    '"Cannot open include file" is a compile problem, "unresolved external symbol" a link problem, and "DLL not found" a run-time problem.',
  ],
  reading: [
    { title: 'SFML and Visual Studio', url: 'https://www.sfml-dev.org/tutorials/3.0/getting-started/visual-studio/', source: 'other', note: 'The official manual setup steps, including the static-linking dependency table.' },
    { title: 'SFML with the CMake Project Template', url: 'https://www.sfml-dev.org/tutorials/3.0/getting-started/cmake/', source: 'other', note: 'The recommended setup, plus the Linux packages you need first.' },
    { title: 'SFML and Linux', url: 'https://www.sfml-dev.org/tutorials/3.0/getting-started/linux/', source: 'other', note: 'Installing development packages and compiling by hand with g++.' },
  ],
};
