import type { ConceptStep } from '../content/types';
import { Blocks } from './Blocks';
import { Icon } from './Icon';
import { Inline } from './RichText';

export function ConceptCard({ step, label = 'Learn' }: { step: ConceptStep; label?: string }) {
  return (
    <article className="concept">
      <div className="q-kind concept-kind">
        <Icon name="book-open" size={14} /> {label}
      </div>
      <h2 className="concept-title">
        <Inline text={step.title} />
      </h2>
      <Blocks blocks={step.blocks} />
    </article>
  );
}
