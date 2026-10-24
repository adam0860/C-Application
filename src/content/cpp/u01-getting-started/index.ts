import type { Unit } from '../../types';
import { lesson as cppWhatIsCpp } from './cpp-what-is-cpp';
import { lesson as cppCompilationPipeline } from './cpp-compilation-pipeline';
import { lesson as cppHelloWorld } from './cpp-hello-world';
import { lesson as cppStatementsComments } from './cpp-statements-comments';

export const unit: Unit = {
  id: "cpp-u01-getting-started",
  title: "Getting Started",
  description: "What C++ is, how source code becomes a program, and your first program dissected token by token.",
  icon: "🚀",
  lessons: [cppWhatIsCpp, cppCompilationPipeline, cppHelloWorld, cppStatementsComments],
};
