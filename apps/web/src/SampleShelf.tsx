import { SAMPLE_REPOS, SAMPLE_COLLECTIONS } from './samples';
export function SampleShelf({
  inputs,
  disabled,
  select,
}: {
  inputs: [string, string];
  disabled: boolean;
  select: (pair: [string, string]) => void;
}) {
  return (
    <details className="sample-shelf">
      <summary>
        Open the specimen cabinet{' '}
        <span>{SAMPLE_REPOS.length} public repos</span>
      </summary>
      <p>
        Pick your ingredients, or keep typing your own above. Selection does not
        run AI.
      </p>
      <div className="sample-selectors">
        {(['A', 'B'] as const).map((slot, index) => {
          const selected = SAMPLE_REPOS.find(
            (repo) => repo.ref.toLowerCase() === inputs[index].toLowerCase(),
          );
          return (
            <label key={slot} htmlFor={'sample-' + slot}>
              Donor {slot} specimen
              <select
                id={'sample-' + slot}
                value={selected?.ref ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const pair: [string, string] = [...inputs];
                  pair[index] = e.target.value;
                  select(pair);
                }}
              >
                <option value="" disabled>
                  Custom repository above
                </option>
                {SAMPLE_COLLECTIONS.map((collection) => (
                  <optgroup
                    key={collection}
                    label={
                      collection === 'Dreven'
                        ? 'Dreven’s shelf'
                        : collection === 'Guests'
                          ? 'Guest specimens'
                          : 'Community favorites'
                    }
                  >
                    {SAMPLE_REPOS.filter(
                      (repo) => repo.collection === collection,
                    ).map((repo) => (
                      <option
                        key={repo.ref}
                        value={repo.ref}
                        disabled={
                          repo.ref.toLowerCase() ===
                          inputs[1 - index].toLowerCase()
                        }
                      >
                        {repo.label} · {repo.ref}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <small>
        Curated repository references, not recorded model results. Facts are
        fetched only when you inspect.
      </small>
    </details>
  );
}
