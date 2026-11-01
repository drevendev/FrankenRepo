import { useState } from 'react';
import type {
  InheritanceReview,
  MonsterRecord,
  RitualJob,
} from '@frankenrepo/core';
export function CardActions({
  access,
  features,
  onOpen,
  onNotice,
}: {
  access: { id: string; token: string };
  features?: { permalinks?: boolean; reviews?: boolean };
  onOpen: (card: MonsterRecord) => void;
  onNotice: (message: string) => void;
}) {
  const [review, setReview] = useState<InheritanceReview | null>(null);
  const [reviewJob, setReviewJob] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [publicPath, setPublicPath] = useState('');
  const request = async (path: string, body?: unknown, method?: string) => {
    const r = await fetch(path, {
      method: method ?? (body ? 'POST' : 'GET'),
      headers: {
        Authorization: 'Bearer ' + access.token,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? 'This action is unavailable.');
    return data;
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      onNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="dna-disclosure">
      <summary>Specimen permissions &amp; second opinion</summary>
      <p>
        Private saving grants no permission for a gallery, training or the
        laboratory notebook.
      </p>
      {features?.permalinks && (
        <>
          <label>
            <input
              type="checkbox"
              checked={sharing}
              onChange={(e) => setSharing(e.target.checked)}
            />{' '}
            I consent to public reading and export of this fictional specimen.
            It will not enter a gallery or training corpus.
          </label>
          <button
            className="button secondary"
            disabled={busy || !sharing}
            onClick={() =>
              void run(async () => {
                const p = await request(
                  '/api/v1/cards/' + access.id + '/publication',
                  { confirmed: true },
                );
                setPublicPath(p.path);
                onNotice(
                  'Public specimen link created. You can revoke it here.',
                );
              })
            }
          >
            Share this specimen
          </button>
          {publicPath && (
            <p>
              <a href={publicPath}>Open public specimen</a> ·{' '}
              <button
                className="text-button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(location.origin + publicPath)
                    .catch(() =>
                      onNotice(
                        'Copy the public specimen address from the link.',
                      ),
                    )
                }
              >
                Copy specimen link
              </button>
            </p>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await request(
                  '/api/v1/cards/' + access.id + '/publication',
                  undefined,
                  'DELETE',
                );
                setPublicPath('');
                setSharing(false);
                onNotice(
                  'Publication revoked. Previously downloaded copies remain with their readers. Notebook references are revoked immediately; external deletion may be pending.',
                );
              })
            }
          >
            Unpublish specimen
          </button>
        </>
      )}
      {features?.reviews && (
        <>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{' '}
            Send this card and its bounded public evidence to Paper Instruments
            for a separate AI interpretation.
          </label>
          <button
            className="button secondary"
            disabled={busy || !consent}
            onClick={() =>
              void run(async () => {
                const job = await request(
                  '/api/v1/cards/' + access.id + '/reviews',
                  { confirmed: true, clientRequestId: crypto.randomUUID() },
                );
                setReviewJob(job.jobId);
                for (let n = 0; n < 45; n++) {
                  await new Promise((r) => setTimeout(r, 1000));
                  const status = await request(
                    '/api/v1/cards/' + access.id + '/reviews/' + job.jobId,
                  );
                  if (status.review) {
                    setReview(status.review);
                    return;
                  }
                  if (status.state === 'unavailable')
                    throw new Error(
                      status.error?.message ??
                        'The second opinion is unavailable. Your original is unchanged.',
                    );
                }
                throw new Error(
                  'Review confirmation timed out. Reopening this action reads the existing attempt without generating again.',
                );
              })
            }
          >
            Second opinion
          </button>
        </>
      )}
      {busy && <p role="status">Consulting the laboratory notes…</p>}
      {review && (
        <div>
          <p className="mini-label">AI INTERPRETATION · {review.model}</p>
          <p>Parent A: {review.interpretation.parentA}</p>
          <p>Parent B: {review.interpretation.parentB}</p>
          <p>Joint mechanism: {review.interpretation.jointMechanism}</p>
          {review.interpretation.unsupportedClaims.map((c, i) => (
            <p key={i}>
              <strong>{c.field}:</strong> {c.claim} — {c.reason} (
              {c.evidenceIds.join(', ')})
            </p>
          ))}
          <p>Proposed prototype: {review.interpretation.proposedMutation}</p>
          <p>
            {review.interpretation.limitation} A reviewer does not prove
            feasibility.
          </p>
          <p>
            Evidence IDs: {review.interpretation.evidenceIds.join(', ')}.{' '}
            {review.cost.basis} cost:{' '}
            {review.cost.usd === null
              ? 'unknown'
              : '$' + review.cost.usd.toFixed(6)}
            .
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const job = await request(
                  '/api/v1/cards/' + access.id + '/revisions',
                  {
                    reviewJobId: reviewJob,
                    clientRequestId: crypto.randomUUID(),
                    confirmed: true,
                  },
                );
                for (let n = 0; n < 200; n++) {
                  await new Promise((r) => setTimeout(r, 1000));
                  const status: RitualJob = await request(
                    '/api/v1/rituals/' + job.ritualId,
                  );
                  if (status.monster && status.state === 'completed') {
                    onOpen(status.monster);
                    const saved = await request(
                      '/api/v1/rituals/' + job.ritualId + '/save',
                      {},
                    );
                    onNotice(
                      'A separate revision was created. Original preserved. Download its recovery key from the private archive after reopening.',
                    );
                    window.dispatchEvent(
                      new CustomEvent('frankenrepo-saved', {
                        detail: { ...saved, name: status.monster.draft.name },
                      }),
                    );
                    return;
                  }
                  if (status.error) throw new Error(status.error.message);
                }
                throw new Error(
                  'Revision confirmation timed out. No automatic new generation was requested.',
                );
              })
            }
          >
            Improve this mutation
          </button>
        </div>
      )}
      <p>
        No apprentice review. Tinker remains experimental until a human-reviewed
        holdout qualifies its checkpoint.
      </p>
    </details>
  );
}
