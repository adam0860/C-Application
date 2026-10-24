import type { ReadingRef } from '../content/types';
import { openExternal } from '../lib/platform';
import { Icon } from './Icon';
import { Inline } from './RichText';

const SOURCE_LABEL: Record<ReadingRef['source'], string> = {
  cppreference: 'cppreference',
  learncpp: 'LearnCpp',
  isocpp: 'isocpp.org',
  'core-guidelines': 'Core Guidelines',
  'unreal-docs': 'Unreal Docs',
  book: 'Book',
  article: 'Article',
  video: 'Video',
  other: 'Web',
};

export function ReadingList({ refs }: { refs: ReadingRef[] }) {
  return (
    <ul className="reading">
      {refs.map((r, i) => (
        <li key={i}>
          <button type="button" className="reading-item" onClick={() => void openExternal(r.url)}>
            <span className={`src-badge src-${r.source}`}>{SOURCE_LABEL[r.source]}</span>
            <span className="reading-main">
              <span className="reading-title">
                {r.title} <Icon name="external" size={13} />
              </span>
              {r.note && (
                <span className="reading-note">
                  <Inline text={r.note} />
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
