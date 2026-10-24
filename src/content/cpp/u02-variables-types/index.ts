import type { Unit } from '../../types';
import { lesson as cppVariables } from './cpp-variables';
import { lesson as cppFundamentalTypes } from './cpp-fundamental-types';
import { lesson as cppInitialization } from './cpp-initialization';
import { lesson as cppConstConstexprAuto } from './cpp-const-constexpr-auto';
import { lesson as cppConversions } from './cpp-conversions';

export const unit: Unit = {
  id: "cpp-u02-variables-types",
  title: "Variables and Types",
  description: "How C++ stores data: variables, fundamental types, initialization, const, auto and conversions.",
  icon: "📦",
  lessons: [cppVariables, cppFundamentalTypes, cppInitialization, cppConstConstexprAuto, cppConversions],
};
