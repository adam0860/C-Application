import type { Unit } from '../../types';
import { lesson as cppFunctionTemplates } from './cpp-function-templates';
import { lesson as cppClassTemplates } from './cpp-class-templates';
import { lesson as cppConcepts } from './cpp-concepts';

export const unit: Unit = {
  id: "cpp-u12-templates",
  title: "Templates",
  description: "Generic programming: function templates, class templates and C++20 concepts.",
  icon: "🧪",
  lessons: [cppFunctionTemplates, cppClassTemplates, cppConcepts],
};
