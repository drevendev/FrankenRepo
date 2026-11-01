import { useEffect, useState } from 'react';
import { CardActions } from './CardActions';
import type { MonsterRecord } from '@frankenrepo/core';
type Access = { id: string; token: string; name: string; deleted?: boolean };
const key = 'frankenrepo-private-cards-v1';
function initial(): Access[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value)
      ? value
          .filter(
            (v): v is Access =>
              typeof v?.id === 'string' &&
              /^[0-9a-f-]{36}$/.test(v.id) &&
              typeof v?.token === 'string' &&
              /^[A-Za-z0-9_-]{43}$/.test(v.token) &&
              typeof v?.name === 'string',
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function SavedCards({
  ready,
  jobId,
  monster,
  onOpen,
  onNotice,
  features,
}: {
  ready: boolean;
  jobId?: string;
  monster: MonsterRecord | null;
  onOpen: (monster: MonsterRecord) => void;
  onNotice: (message: string) => void;
  features?: { permalinks?: boolean; reviews?: boolean };
}) {
  const [cards, setCards] = useState<Access[]>(initial);
  const [busy, setBusy] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  useEffect(() => {
    const saved = (event: Event) => {
      const access = (event as CustomEvent<Access>).detail;
      setCards((current) => {
        const next = [
          ...current.filter((c) => c.id !== access.id),
          access,
        ].slice(-20);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* recovery remains possible from current state */
        }
        return next;
      });
    };
    window.addEventListener('frankenrepo-saved', saved);
    return () => window.removeEventListener('frankenrepo-saved', saved);
  }, []);
  const persist = (next: Access[]) => {
    setCards(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      onNotice(
        'Browser storage is unavailable. Download a recovery key before leaving.',
      );
    }
  };
  const call = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message ?? 'The archive is unavailable.');
    return result;
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!ready && !cards.length) return null;
  return (
    <section className="sample-shelf" aria-label="Private specimen archive">
      <h2>Private specimen archive</h2>
      <p>
        Save a card in MongoDB without publishing it. This browser keeps its
        private access key. Download a recovery key before clearing browser
        data. Anyone with that key can open or delete the saved card.
      </p>
      {ready && jobId && monster && (
        <button
          className="button secondary"
          disabled={busy || cards.length >= 20 || savedJobs.includes(jobId)}
          onClick={() =>
            void run(async () => {
              const access = await call('/api/v1/rituals/' + jobId + '/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
              persist([
                ...cards.filter((c) => c.id !== access.id),
                {
                  id: access.id,
                  token: access.token,
                  name: monster.draft.name,
                },
              ]);
              setSavedJobs([...savedJobs, jobId]);
              onNotice(
                'Saved privately in MongoDB. This card is not in a public gallery.',
              );
            })
          }
        >
          {savedJobs.includes(jobId)
            ? 'Saved privately ✓'
            : 'Save card privately'}
        </button>
      )}
      {cards.length === 20 && (
        <p>
          Browser archive limit reached. Keep recovery keys for your saved
          cards.
        </p>
      )}
      {!ready && (
        <p>
          The archive is unavailable. Your access keys remain in this browser.
        </p>
      )}
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <span>{card.name} </span>
            {!card.deleted && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await call('/api/v1/cards/' + card.id, {
                      headers: { Authorization: 'Bearer ' + card.token },
                    });
                    onOpen(result.monster);
                  })
                }
              >
                Open saved card
              </button>
            )}
            {card.deleted && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const status = await call(
                      '/api/v1/cards/' + card.id + '/removal',
                      { headers: { Authorization: 'Bearer ' + card.token } },
                    );
                    if (!status.pending)
                      persist(cards.filter((c) => c.id !== card.id));
                    onNotice(
                      status.pending
                        ? 'Card removed; notebook deletion is still pending. The revoked note cannot enter generation.'
                        : 'Card and notebook removal confirmed.',
                    );
                  })
                }
              >
                Check pending notebook removal
              </button>
            )}
            {' · '}
            <button
              className="text-button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          ...card,
                          origin: location.origin,
                          warning:
                            'Private key: grants read and delete access. Keep secret.',
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = 'frankenrepo-private-key-' + card.id + '.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download recovery key
            </button>
            {' · '}
            {!card.deleted && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      'Permanently delete this saved card from MongoDB?',
                    )
                  )
                    void run(async () => {
                      const result = await call('/api/v1/cards/' + card.id, {
                        method: 'DELETE',
                        headers: { Authorization: 'Bearer ' + card.token },
                      });
                      persist(
                        result.removal?.pending
                          ? cards.map((c) =>
                              c.id === card.id ? { ...c, deleted: true } : c,
                            )
                          : cards.filter((c) => c.id !== card.id),
                      );
                      onNotice(
                        result.removal?.pending
                          ? 'Card deleted. Notebook references are revoked; external deletion is pending. Keep the recovery key to check removal.'
                          : 'Saved card deleted from MongoDB.',
                      );
                    });
                }}
              >
                Delete saved card
              </button>
            )}
            {!card.deleted && (
              <CardActions
                access={card}
                features={features}
                onOpen={onOpen}
                onNotice={onNotice}
              />
            )}
          </li>
        ))}
      </ul>
      <label>
        Restore a private recovery key{' '}
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy || cards.length >= 20}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            void run(async () => {
              if (file.size > 4096)
                throw new Error('Recovery key file is too large.');
              const value = JSON.parse(await file.text());
              if (
                !/^[0-9a-f-]{36}$/.test(value.id ?? '') ||
                !/^[A-Za-z0-9_-]{43}$/.test(value.token ?? '')
              )
                throw new Error('Invalid recovery key.');
              let result;
              try {
                result = await call('/api/v1/cards/' + value.id, {
                  headers: { Authorization: 'Bearer ' + value.token },
                });
              } catch (error) {
                const removal = await call(
                  '/api/v1/cards/' + value.id + '/removal',
                  { headers: { Authorization: 'Bearer ' + value.token } },
                );
                if (removal.cardRemoved && removal.pending) {
                  persist([
                    ...cards.filter((c) => c.id !== value.id),
                    {
                      id: value.id,
                      token: value.token,
                      name:
                        typeof value.name === 'string'
                          ? value.name
                          : 'Removed specimen',
                      deleted: true,
                    },
                  ]);
                  onNotice(
                    'Card removed; external notebook deletion is pending. The revoked note cannot be used.',
                  );
                  return;
                }
                if (removal.cardRemoved) {
                  onNotice(
                    'This card and its notebook references were already removed.',
                  );
                  return;
                }
                throw error;
              }
              persist([
                ...cards.filter((c) => c.id !== value.id),
                {
                  id: value.id,
                  token: value.token,
                  name: result.monster.draft.name,
                },
              ]);
              onOpen(result.monster);
            });
          }}
        />
      </label>
    </section>
  );
}
