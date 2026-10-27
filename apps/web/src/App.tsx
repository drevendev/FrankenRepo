import { useEffect, useRef, useState } from 'react';
import { LabAudio } from './lab-audio';
import { LabAtmosphere, FlaskBubbles, LabInstruments } from './LabEffects';
import {
  FLAVORS,
  certificateSvg,
  monsterAlt,
  monsterSvg,
  spriteRecipe,
  type DonorGenome,
  type MonsterRecord,
  type RitualJob,
  type RitualMode,
} from '@frankenrepo/core';
const SAMPLES = [
  ['withastro/astro', 'excalidraw/excalidraw'],
  ['pallets/flask', 'jqlang/jq'],
  ['drevendev/Devostasis', 'drevendev/CompostClub'],
] as const;
type Capability = { model: 'disabled' | 'unknown' | 'ready'; storage: string };
type ApiError = Error & { code?: string };
async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    ...(body !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      typeof data.message === 'string'
        ? data.message
        : 'The lab could not complete the request.',
    ) as ApiError;
    error.code = data.code;
    throw error;
  }
  return data as T;
}
const svgData = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportPng(m: MonsterRecord) {
  const svg = certificateSvg(m);
  const img = new Image();
  img.src = svgData(svg);
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * 2;
  canvas.height = img.naturalHeight * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable in this browser.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error('Could not export the image.')),
      'image/png',
    ),
  );
  saveBlob(blob, 'frankenrepo-' + m.id + '.png');
}
function Apparatus({
  busy,
  monster,
  skip,
}: {
  busy: boolean;
  monster: MonsterRecord | null;
  skip: () => void;
}) {
  return (
    <div
      className={
        'apparatus ' + (busy ? 'is-working' : '') + (monster ? ' is-born' : '')
      }
      aria-label="The reanimation table"
    >
      <div className="apparatus-top">
        <span>
          <i /> CHAMBER 01
        </span>
        <span>HANDLE WITH CURIOSITY</span>
      </div>
      <div className="machine-art">
        <svg
          className="lab-scene"
          viewBox="0 0 560 430"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="flask-left">
              <rect x="53" y="307" width="46" height="29" />
            </clipPath>
            <clipPath id="flask-right">
              <rect x="462" y="304" width="41" height="32" />
            </clipPath>
            <pattern
              id="grid"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path d="M28 0H0V28" stroke="#728278" strokeOpacity=".1" />
            </pattern>
            <radialGradient id="chamber">
              <stop stopColor="#a2d478" stopOpacity=".17" />
              <stop offset="1" stopColor="#a2d478" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="560" height="430" fill="url(#grid)" />
          <circle
            className="chamber-aura"
            cx="280"
            cy="210"
            r="185"
            fill="url(#chamber)"
          />
          <path
            d="M113 326V138h49M447 326V138h-49"
            stroke="#626b60"
            strokeWidth="9"
          />
          <path d="M100 326h26M434 326h26" stroke="#b6bd9b" strokeWidth="3" />
          <path
            d="M144 136h31m-31-10h31m-31-10h31m-31-10h31m-31-10h31M385 136h31m-31-10h31m-31-10h31m-31-10h31m-31-10h31"
            stroke="#a2a997"
            strokeWidth="4"
          />
          <path d="M159 96V75M401 96V75" stroke="#bac1a4" strokeWidth="5" />
          <circle
            className="coil-light coil-left"
            cx="159"
            cy="68"
            r="8"
            fill="#c4e99b"
          />
          <circle
            className="coil-light coil-right"
            cx="401"
            cy="68"
            r="8"
            fill="#c4e99b"
          />
          <path
            className="electric-arc"
            d="M166 67l31 24 26-31 31 30 24-32 33 28 28-25 31 26 23-20"
            stroke="#c9f99a"
            strokeWidth="3"
          />
          <path
            d="M202 323v-148a78 78 0 0 1 156 0v148"
            stroke="#8c9c80"
            strokeWidth="2"
          />
          <path
            d="M211 323V175a69 69 0 0 1 138 0v148"
            stroke="#bdd498"
            strokeOpacity=".35"
          />
          <path
            d="M223 180v109"
            stroke="#d3e6bd"
            strokeOpacity=".13"
            strokeWidth="5"
          />
          <ellipse
            cx="280"
            cy="325"
            rx="96"
            ry="15"
            fill="#354238"
            stroke="#818d70"
          />
          <path
            d="M184 325v14c0 21 192 21 192 0v-14"
            fill="#3b4539"
            stroke="#899579"
          />
          <path d="M177 352h206v16H177z" fill="#5a6550" />
          <path d="M160 369h240v16H160z" fill="#343d32" />
          <path
            d="M89 338H51v-60h17v-24h16v24h17v60z"
            fill="#333d35"
            stroke="#819571"
          />
          <path d="M53 309h46v27H53z" fill="#a9d878" fillOpacity=".6" />
          <path
            d="M468 338h37v-65h-15v-19h-15v19h-15v65z"
            fill="#333d35"
            stroke="#819571"
          />
          <path d="M462 306h41v30h-41z" fill="#b497cf" fillOpacity=".6" />
          <circle cx="76" cy="322" r="3" fill="#d5ef9e" />
          <circle cx="481" cy="319" r="3" fill="#dac9eb" />
          <FlaskBubbles />
          <LabInstruments />
          <path d="M119 371H45m398 0h73" stroke="#606e59" strokeWidth="2" />
          <text
            x="33"
            y="406"
            fill="#7a8977"
            fontFamily="monospace"
            fontSize="10"
          >
            FIG. A — CONTROLLED BAD IDEA
          </text>
          <text
            x="437"
            y="406"
            fill="#7a8977"
            fontFamily="monospace"
            fontSize="10"
          >
            NO. 0001
          </text>
        </svg>
        <img
          className="specimen"
          src={svgData(
            monsterSvg(
              monster?.sprite ?? spriteRecipe('the-first-little-monster'),
            ),
          )}
          alt={
            monster
              ? monsterAlt(monster)
              : 'Illustrated specimen: a little stitched creature inside the reanimation chamber. This is not a model result.'
          }
        />
        <span className="specimen-note">
          {monster ? 'IMAGINARY DESCENDANT' : 'ILLUSTRATED SPECIMEN'}
        </span>
      </div>
      <div className="apparatus-bottom">
        <span className="handwritten">
          {busy
            ? 'Something is stirring…'
            : monster
              ? 'A questionable success.'
              : 'What could possibly go wrong?'}
        </span>
        <span className="voltage">{busy ? '⚡ SPLICING' : '⚡ STANDBY'}</span>
      </div>
      {monster && (
        <button className="skip-reveal" onClick={skip}>
          Skip animation
        </button>
      )}
    </div>
  );
}
function DonorFacts({ donor, slot }: { donor: DonorGenome; slot: string }) {
  return (
    <article className="observed-donor">
      <div className="facts-head">
        <span className="mini-label">DONOR {slot} · OBSERVED</span>
        <a href={donor.url} target="_blank" rel="noreferrer">
          {donor.ref} ↗
        </a>
      </div>
      <p>{donor.description ?? 'Description unknown.'}</p>
      <div className="gene-tags">
        {[...donor.languages, ...donor.topics.slice(0, 3)].map((g) => (
          <span key={g}>{g}</span>
        ))}
      </div>
      <small>
        Observed {new Date(donor.observedAt).toLocaleString()} · {donor.license}
      </small>
      {donor.warnings.map((w) => (
        <small className="source-warning" key={w}>
          {w}
        </small>
      ))}
    </article>
  );
}
function BirthCertificate({
  monster,
  onRemix,
  onNotice,
}: {
  monster: MonsterRecord;
  onRemix: () => void;
  onNotice: (s: string) => void;
}) {
  const m = monster;
  const exportName = 'frankenrepo-' + m.id;
  const share =
    m.draft.name +
    ' — ' +
    m.draft.hook +
    ' Fictional creature inspired by ' +
    m.parents.map((p) => p.ref + ' (' + p.url + ')').join(' + ') +
    '. Generated with ' +
    m.model.id +
    '.';
  return (
    <section
      className="birth-section"
      id="birth-certificate"
      aria-labelledby="birth-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE EXPERIMENT HAS A NAME</span>
          <h2 id="birth-title">It’s alive. More or less.</h2>
        </div>
        <span className="edition">ONE VERY ORIGINAL PROBLEM</span>
      </div>
      <div className="certificate">
        <div className="certificate-art">
          <span className="mini-label">MONSTER BIRTH CERTIFICATE</span>
          <img src={svgData(monsterSvg(m.sprite))} alt={monsterAlt(m)} />
          <span className="stamp">
            CERTIFIED
            <br />
            IMAGINARY
          </span>
          <small>It {FLAVORS[m.sprite.flavor]}.</small>
        </div>
        <div className="certificate-copy">
          <span className="mini-label">
            AI INTERPRETATION · {m.mode.toUpperCase()} RITUAL
          </span>
          <h3>{m.draft.name}</h3>
          <p className="hook">{m.draft.hook}</p>
          <blockquote>“{m.draft.firstWords}”</blockquote>
          <div className="traits">
            {(['brain', 'body', 'curse'] as const).map((slot) => (
              <div key={slot}>
                <span>{slot}</span>
                <p>{m.draft[slot].text}</p>
                <small>
                  Inspired by{' '}
                  {m.draft[slot].evidenceIds.map((id, i) => {
                    const atom = m.evidence.find((e) => e.id === id);
                    return atom ? (
                      <a
                        key={id}
                        href={atom.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {i ? ', ' : ''}
                        {id}
                      </a>
                    ) : null;
                  })}
                </small>
              </div>
            ))}
          </div>
          <div className="mutation">
            <span className="mini-label">POTENTIALLY USEFUL MUTATION</span>
            <p>{m.draft.usefulMutation}</p>
            <small>
              Speculative, not an evaluated recommendation.{' '}
              {m.draft.uncertainty}
            </small>
          </div>
          <p className="provenance">
            Generated with {m.model.provider} / {m.model.id}
            <br />
            {new Date(m.createdAt).toLocaleString()} · Source analysis: bounded
            GitHub public data.
          </p>
        </div>
      </div>
      <div className="export-bar">
        <div>
          <span className="mini-label">TAKE YOUR MONSTER HOME</span>
          <p>Ephemeral experiment. Download it before leaving.</p>
        </div>
        <div className="export-buttons">
          <button
            className="button primary"
            onClick={() =>
              void exportPng(m).catch((e) => onNotice((e as Error).message))
            }
          >
            Save PNG ↓
          </button>
          <button
            className="button secondary"
            onClick={() =>
              saveBlob(
                new Blob([certificateSvg(m)], { type: 'image/svg+xml' }),
                exportName + '.svg',
              )
            }
          >
            Save SVG ↓
          </button>
          <button
            className="text-button"
            onClick={() =>
              void navigator.clipboard
                .writeText(share)
                .then(() => onNotice('Share text copied.'))
                .catch(() =>
                  onNotice(
                    'Clipboard unavailable; you can still download the card.',
                  ),
                )
            }
          >
            Copy share text
          </button>
          <button
            className="text-button"
            onClick={() =>
              saveBlob(
                new Blob([monsterAlt(m)], { type: 'text/plain' }),
                exportName + '-alt.txt',
              )
            }
          >
            Alt text ↓
          </button>
        </div>
      </div>
      <p className="sharing-note">
        Sharing link unavailable — permanent storage and public gallery are not
        enabled.
      </p>
      <details className="dna-disclosure">
        <summary>
          View DNA{' '}
          <span>Facts, sources &amp; a little scientific humility</span>
        </summary>
        <p>
          This creature is fiction. The observations below come from bounded
          public GitHub data. Missing data is unknown; it says nothing about
          software health or its owners.
        </p>
        <div className="evidence-grid">
          {m.parents.map((p, i) => (
            <div key={p.ref}>
              <DonorFacts donor={p} slot={i ? 'B' : 'A'} />
              <p className="mono">Commit: {p.commitSha ?? 'UNKNOWN'}</p>
              {p.evidence.map((e) => (
                <div className="atom" key={e.id}>
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                    {e.id} ↗
                  </a>
                  <small>
                    {e.status} · {e.observedAt}
                  </small>
                  <p>{e.value}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
      <button className="button secondary remix" onClick={onRemix}>
        ↻ Remix these parents
      </button>
    </section>
  );
}
export function App() {
  const [inputs, setInputs] = useState<[string, string]>(['', '']);
  const [mode, setMode] = useState<RitualMode>('cursed');
  const [capability, setCapability] = useState<Capability | null>(null);
  const [connection, setConnection] = useState('Connecting to the lab…');
  const [donors, setDonors] = useState<[DonorGenome, DonorGenome] | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [job, setJob] = useState<RitualJob | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sound, setSound] = useState(false);
  const [music, setMusic] = useState(true);
  const [volume, setVolume] = useState(22);
  const [audioSettings, setAudioSettings] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const audio = useRef<LabAudio | null>(null);
  const [skip, setSkip] = useState(false);
  const polling = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const latestJob = useRef<string | null>(null);
  const inspectController = useRef<AbortController | null>(null);
  const loadCapabilities = async () => {
    setConnection('Connecting to the lab…');
    try {
      const c = await request<Capability>(
        '/readyz',
        undefined,
        AbortSignal.timeout(5000),
      );
      setCapability(c);
      setConnection(
        c.model === 'disabled'
          ? 'Live Gemma unavailable'
          : 'Live Gemma configured · connection unverified',
      );
    } catch {
      setConnection('The lab is offline. Your inputs stay here.');
      setCapability(null);
    }
  };
  useEffect(() => {
    void loadCapabilities();
    return () => {
      polling.current?.abort();
      inspectController.current?.abort();
      void audio.current?.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(query.matches);
    query.addEventListener('change', change);
    const visibility = () => {
      void audio.current?.setHidden(document.hidden).catch(() => {});
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const toggleSound = async () => {
    if (sound) {
      audio.current?.disable();
      setSound(false);
      return;
    }
    try {
      audio.current ??= new LabAudio();
      audio.current.setVolume(volume / 100);
      audio.current.setMusic(music);
      await audio.current.enable();
      setSound(true);
      audio.current.play('bubble');
    } catch {
      setNotice(
        'Audio is unavailable in this browser. The laboratory still works.',
      );
    }
  };
  const edit = (values: [string, string]) => {
    inspectController.current?.abort();
    sequence.current++;
    setInputs(values);
    setDonors(null);
    setError('');
    setInspecting(false);
  };
  const inspect = async () => {
    inspectController.current?.abort();
    const controller = new AbortController();
    inspectController.current = controller;
    const seq = ++sequence.current;
    setInspecting(true);
    setError('');
    setDonors(null);
    audio.current?.play('inspect');
    try {
      const result = await request<{ donors: [DonorGenome, DonorGenome] }>(
        '/api/v1/donors/inspect',
        { donors: inputs },
        AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
      );
      if (seq === sequence.current) {
        setDonors(result.donors);
        audio.current?.play('ready');
      }
    } catch (e) {
      if (!controller.signal.aborted && seq === sequence.current)
        setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setInspecting(false);
    }
  };
  const ritual = async () => {
    audio.current?.play('lever');
    setPending(true);
    setError('');
    setJob(null);
    setSkip(false);
    latestJob.current = null;
    polling.current?.abort();
    const controller = new AbortController();
    polling.current = controller;
    try {
      const start = await request<{
        ritualId: string;
        state: RitualJob['state'];
      }>(
        '/api/v1/rituals',
        { donors: inputs, mode, clientRequestId: crypto.randomUUID() },
        controller.signal,
      );
      latestJob.current = start.ritualId;
      setJob({
        ritualId: start.ritualId,
        state: start.state,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 240_000).toISOString(),
      });
      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            controller.signal.removeEventListener('abort', abort);
            resolve();
          }, 1000);
          const abort = () => {
            clearTimeout(timer);
            reject(new DOMException('Cancelled', 'AbortError'));
          };
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) abort();
        });
        const result = await request<RitualJob>(
          '/api/v1/rituals/' + start.ritualId,
          undefined,
          AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
        );
        setJob(result);
        if (result.state === 'completed') {
          try {
            audio.current?.play('reveal');
          } catch {
            /* Audio is optional. */
          }
          return;
        }
        if (result.state === 'failed') {
          audio.current?.play('error');
          setError(
            result.error?.message ??
              'The ritual failed. Your donor facts are preserved.',
          );
          return;
        }
        if (result.state === 'cancelled') return;
      }
      throw new Error(
        'The ritual exceeded the waiting limit. Cancel it before trying again.',
      );
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  const cancel = async () => {
    polling.current?.abort();
    setPending(false);
    if (latestJob.current) {
      try {
        setJob(
          await request<RitualJob>(
            '/api/v1/rituals/' + latestJob.current + '/cancel',
            {},
          ),
        );
        setNotice('Ritual cancelled. Your donors are preserved.');
      } catch {
        setError(
          'Could not confirm cancellation. The server may still be finishing this ritual.',
        );
      }
    }
  };
  const monster = job?.state === 'completed' ? (job.monster ?? null) : null;
  useEffect(() => {
    if (job?.state === 'splicing') audio.current?.play('spark');
  }, [job?.state]);
  const stages = ['inspecting', 'splicing', 'validating', 'completed'];
  const stage = job ? stages.indexOf(job.state) : -1;
  return (
    <div
      className={
        'site ' +
        (skip ? 'skip-motion ' : '') +
        (motionPaused || reducedMotion ? 'motion-paused' : '')
      }
      onClickCapture={(event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest<
          HTMLButtonElement | HTMLInputElement
        >('button,input[type="radio"]');
        if (!control || control.matches(':disabled')) return;
        if (!control.classList.contains('sound-button'))
          audio.current?.play(
            control.tagName === 'INPUT' ? 'switch' : 'bubble',
          );
        if (control.tagName === 'BUTTON') {
          control.classList.remove('is-bubbling');
          void control.offsetWidth;
          control.classList.add('is-bubbling');
        }
      }}
      onAnimationEnd={(event) => {
        if (
          event.animationName === 'button-bloop' &&
          event.target instanceof Element
        )
          event.target.classList.remove('is-bubbling');
      }}
    >
      <LabAtmosphere />
      <a className="skip-link" href="#lab">
        Skip to the laboratory
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="FrankenRepo home">
          <span className="brand-icon">
            F<span>+</span>
          </span>
          Franken<span>Repo</span>
          <sup>™</sup>
        </a>
        <div className="header-note">
          THE REANIMATION LAB<span>INDEPENDENT EXPERIMENT · MMXXVI</span>
        </div>
        <div className="sound-controls">
          <button
            className="sound-button"
            onClick={() => void toggleSound()}
            aria-pressed={sound}
            title="Quiet music and laboratory sounds"
          >
            <span className="audio-meter" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>Sound {sound ? 'on' : 'off'}</span>
          </button>
          <button
            className="sound-settings"
            aria-label="Audio settings"
            aria-expanded={audioSettings}
            aria-controls="lab-audio-settings"
            onClick={() => setAudioSettings((s) => !s)}
          >
            ☷
          </button>
          {audioSettings && (
            <div
              className="audio-panel"
              id="lab-audio-settings"
              role="group"
              aria-label="Laboratory audio"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAudioSettings(false);
                  document
                    .querySelector<HTMLButtonElement>('.sound-settings')
                    ?.focus();
                }
              }}
            >
              <span className="mini-label">SOUNDS FROM THE BASEMENT</span>
              <label htmlFor="lab-volume">
                Lab volume <output>{volume}%</output>
              </label>
              <input
                id="lab-volume"
                type="range"
                min="0"
                max="50"
                value={volume}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  audio.current?.setVolume(next / 100);
                }}
              />
              <button
                className="music-switch"
                aria-pressed={music}
                onClick={() => {
                  setMusic(!music);
                  audio.current?.setMusic(!music);
                }}
              >
                Music {music ? 'on' : 'off'}{' '}
                <span aria-hidden="true">{music ? '♪' : '—'}</span>
              </button>
              <small>
                {sound
                  ? 'A quiet, original haunted music box.'
                  : 'Sound is off. Switch it on to listen.'}
              </small>
            </div>
          )}
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-main">
            <span className="eyebrow">
              <i /> OPEN-WEIGHT AI. QUESTIONABLE INTENTIONS.
            </span>
            <h1>
              Good repos.
              <br />
              <em>Bad chemistry.</em>
            </h1>
            <p>
              Stitch two repositories.
              <br className="mobile-break" /> Summon something that should not
              exist.
            </p>
            <p className="hero-detail">
              A little of this. A little of that. One beautifully strange
              monster,
              <br className="desktop-break" /> with the source code in its
              family tree.
            </p>
          </div>
          <aside className="field-note">
            <span className="note-pin">✳</span>
            <span className="mini-label">A NOTE FROM THE LAB</span>
            <p>
              Two repos enter.
              <br />
              One monster leaves.
            </p>
            <span className="handwritten">
              Occasionally, it has
              <br />a useful idea.
            </span>
            <span className="note-number">EXPERIMENT No. 001</span>
          </aside>
        </section>
        <section
          className={'lab' + (pending || inspecting ? ' lab-active' : '')}
          id="lab"
          aria-labelledby="lab-title"
        >
          <div className="lab-toolbar">
            <h2 id="lab-title">
              <span>01 /</span> Assemble your donors
            </h2>
            <div className="lab-toolbar-actions">
              <button
                className="motion-toggle"
                aria-pressed={!motionPaused && !reducedMotion}
                disabled={reducedMotion}
                title={
                  reducedMotion
                    ? 'Reduced motion follows your system setting'
                    : 'Pause decorative laboratory animations'
                }
                onClick={() => setMotionPaused((p) => !p)}
              >
                Motion {!motionPaused && !reducedMotion ? 'on' : 'off'}
              </button>
              <span
                className={
                  'status-pill ' +
                  (capability?.model === 'disabled' ? 'amber' : '')
                }
              >
                <i />
                {connection}
              </span>
            </div>
          </div>
          <div className="lab-layout">
            <div className="controls">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void inspect();
                }}
              >
                <div className="donor-input">
                  <div className="input-label">
                    <label htmlFor="donor-a">
                      <span className="donor-letter">A</span> The brain
                    </label>
                    <span>IDEAS &amp; INSTINCTS</span>
                  </div>
                  <div className="repo-field">
                    <span aria-hidden="true">⌘</span>
                    <input
                      id="donor-a"
                      placeholder="owner/repository"
                      value={inputs[0]}
                      onChange={(e) => edit([e.target.value, inputs[1]])}
                      disabled={pending}
                      required
                      maxLength={180}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
                <div className="splice-divider">
                  <span />
                  <button
                    type="button"
                    className="swap-button"
                    disabled={pending}
                    onClick={() => edit([inputs[1], inputs[0]])}
                    aria-label="Swap donors"
                  >
                    ⇅
                  </button>
                  <span />
                </div>
                <div className="donor-input">
                  <div className="input-label">
                    <label htmlFor="donor-b">
                      <span className="donor-letter purple">B</span> The body
                    </label>
                    <span>SHAPE &amp; BEHAVIOR</span>
                  </div>
                  <div className="repo-field">
                    <span aria-hidden="true">⌘</span>
                    <input
                      id="donor-b"
                      placeholder="owner/repository"
                      value={inputs[1]}
                      onChange={(e) => edit([inputs[0], e.target.value])}
                      disabled={pending}
                      required
                      maxLength={180}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
                <p className="input-hint">
                  Public GitHub repos only. We read a little. We run none of it.
                </p>
                <div className="sample-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={pending}
                    onClick={() => {
                      edit([...SAMPLES[0]]);
                      setNotice(
                        'Sample donors selected. Inspect them to fetch current public facts.',
                      );
                    }}
                  >
                    ↗ Use sample donors
                  </button>
                  <button
                    type="button"
                    className="text-button subdued"
                    disabled={pending}
                    onClick={() =>
                      edit([
                        ...SAMPLES[Math.floor(Math.random() * SAMPLES.length)],
                      ])
                    }
                  >
                    Shuffle samples ↻
                  </button>
                </div>
                <button
                  className="button inspect-button"
                  disabled={pending || inspecting}
                >
                  {inspecting
                    ? 'Inspecting public sources…'
                    : donors
                      ? '↻ Inspect again'
                      : 'Inspect donors ↗'}
                </button>
              </form>
              <fieldset className="modes" disabled={pending}>
                <legend>
                  <span className="step-number">02 /</span> Choose your
                  chemistry
                </legend>
                <div className="mode-options">
                  {(
                    [
                      {
                        value: 'useful',
                        icon: '✦',
                        label: 'Useful',
                        description: 'A spark of sense',
                      },
                      {
                        value: 'cursed',
                        icon: '☾',
                        label: 'Cursed',
                        description: 'Delightfully wrong',
                      },
                      {
                        value: 'chaotic',
                        icon: '⁂',
                        label: 'Chaotic',
                        description: 'Let it get weird',
                      },
                    ] as const
                  ).map((m) => (
                    <label
                      className={'mode ' + (mode === m.value ? 'selected' : '')}
                      key={m.value}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={m.value}
                        checked={mode === m.value}
                        onChange={() => setMode(m.value)}
                      />
                      <span className="mode-icon">{m.icon}</span>
                      <strong>{m.label}</strong>
                      <small>{m.description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                className="button lever-button"
                disabled={
                  !donors ||
                  pending ||
                  !capability ||
                  capability.model === 'disabled'
                }
                onClick={() => void ritual()}
              >
                <span className="lever-icon">ϟ</span>
                {pending ? 'The experiment is underway…' : 'Pull the lever'}
                <span>→</span>
              </button>
              <p className="lever-hint">
                {!donors
                  ? 'Inspect both donors before pulling the lever.'
                  : capability?.model === 'disabled'
                    ? 'Your donor facts are ready. Live Gemma needs operator setup.'
                    : 'Creates a fictional creature with your configured Gemma model.'}
              </p>
              {pending && (
                <button
                  className="text-button cancel"
                  onClick={() => void cancel()}
                >
                  Cancel ritual
                </button>
              )}
              <div className="live-status" role="status" aria-live="polite">
                {pending
                  ? 'Current stage: ' + (job?.state ?? 'requesting') + '.'
                  : notice}
              </div>
              {error && (
                <div className="error-box" role="alert">
                  <strong>The experiment needs a moment.</strong>
                  <p>{error}</p>
                </div>
              )}
            </div>
            <div className="machine-column">
              <Apparatus
                busy={pending}
                monster={monster}
                skip={() => setSkip(true)}
              />
              <div className="source-legend">
                <span>
                  <i className="green-dot" /> Real repository DNA
                </span>
                <span>
                  <i className="purple-dot" /> Entirely fictional offspring
                </span>
              </div>
            </div>
          </div>
          <div className="process-strip">
            {[
              'Inspect donors',
              'Extract their DNA',
              'Splice with Gemma',
              'Meet your monster',
            ].map((s, i) => (
              <div className={stage >= i ? 'active' : ''} key={s}>
                <span>0{i + 1}</span>
                {s}
                <span className="process-arrow">→</span>
              </div>
            ))}
          </div>
        </section>
        {donors && (
          <section className="donor-results" aria-labelledby="sources-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE FACTUAL PART</span>
                <h2 id="sources-title">A little donor DNA.</h2>
              </div>
              <span className="edition">OBSERVED · SOURCE LINKED</span>
            </div>
            <div className="evidence-grid">
              {donors.map((d, i) => (
                <DonorFacts key={d.ref} donor={d} slot={i ? 'B' : 'A'} />
              ))}
            </div>
          </section>
        )}
        {monster && (
          <BirthCertificate
            monster={monster}
            onNotice={setNotice}
            onRemix={() => {
              setJob(null);
              setSkip(false);
              document
                .getElementById('lab')
                ?.scrollIntoView({ behavior: 'instant' });
            }}
          />
        )}
        {(capability?.model === 'disabled' || !capability) && (
          <div className="setup-note">
            <span className="setup-symbol">⌁</span>
            <div>
              <strong>
                {capability
                  ? 'The machine is built. The spark is missing.'
                  : 'The laboratory is resting.'}
              </strong>
              <p>
                {capability
                  ? 'Live Gemma is not configured. You can inspect real public donors. No recorded model results are available yet.'
                  : 'Start the local API to inspect donors and check model availability.'}
              </p>
              <details>
                <summary>Operator setup</summary>
                <p>
                  Follow the project README: install and select a local Gemma
                  model in Ollama, set MODEL_PROVIDER=ollama in .env, then
                  restart the API. Or configure an explicitly authorized free
                  Cloudflare account. No paid fallback.
                </p>
              </details>
            </div>
            <button
              className="text-button"
              onClick={() => void loadCapabilities()}
            >
              Check again ↻
            </button>
          </div>
        )}
        <section className="lab-principles">
          <div>
            <span>↗</span>
            <h3>Real genes. Weird offspring.</h3>
            <p>
              Every observed trait links to a source. The monster’s personality
              is pure fiction.
            </p>
          </div>
          <div>
            <span>⌘</span>
            <h3>Your code stays in its coffin.</h3>
            <p>
              Public metadata and a small README excerpt. No cloning. No running
              donor code.
            </p>
          </div>
          <div>
            <span>↓</span>
            <h3>Keep the little abomination.</h3>
            <p>
              Download a birth certificate. No sign-up. No leaderboard. Just bad
              science.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-brand">
          FrankenRepo{' '}
          <span>Made of open source &amp; questionable decisions.</span>
        </div>
        <span>A small experiment in bringing ideas to life.</span>
      </footer>
    </div>
  );
}
