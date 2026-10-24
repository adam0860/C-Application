import type { Unit } from '../../types';
import { lesson as cppFunctionsBasics } from './cpp-functions-basics';
import { lesson as cppPassBy } from './cpp-pass-by';
import { lesson as cppOverloadingDefaults } from './cpp-overloading-defaults';
import { lesson as cppDeclarationsHeaders } from './cpp-declarations-headers';
import { lesson as cppScopeLifetimeRecursion } from './cpp-scope-lifetime-recursion';

export const unit: Unit = {
  id: "cpp-u06-functions",
  title: "Functions",
  description: "Breaking programs into reusable pieces: parameters, references, overloading, headers, scope and recursion.",
  icon: "🧩",
  lessons: [cppFunctionsBasics, cppPassBy, cppOverloadingDefaults, cppDeclarationsHeaders, cppScopeLifetimeRecursion],
};
