import type { Unit } from '../../types';
import { lesson as cppConsoleIo } from './cpp-console-io';
import { lesson as cppStdString } from './cpp-std-string';
import { lesson as cppStringView } from './cpp-string-view';

export const unit: Unit = {
  id: "cpp-u04-strings-io",
  title: "Strings and Console I/O",
  description: "Talking to the user: streams, std::string, and efficient text handling with std::string_view.",
  icon: "💬",
  lessons: [cppConsoleIo, cppStdString, cppStringView],
};
