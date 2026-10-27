import {
  LabError,
  normalizeRepo,
  type DonorGenome,
  type EvidenceAtom,
} from '@frankenrepo/core';
import {
  boundedRequest,
  cleanText,
  jsonValue,
  objectValue,
  type Fetcher,
} from './http';
type Options = {
  fetcher?: Fetcher;
  token?: string;
  ttlMs?: number;
  now?: () => number;
};
export class GitHubAdapter {
  private fetcher: Fetcher;
  private cache = new Map<string, { expires: number; value: DonorGenome }>();
  private inflight = new Map<string, Promise<DonorGenome>>();
  private conditional = new Map<string, { etag: string; text: string }>();
  private now: () => number;
  constructor(private options: Options = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }
  async inspect(
    input: string,
    slot: 'A' | 'B',
    signal?: AbortSignal,
  ): Promise<DonorGenome> {
    const ref = normalizeRepo(input);
    const key = ref.toLowerCase();
    const cached = this.cache.get(key);
    let genome: DonorGenome;
    if (cached && cached.expires > this.now()) genome = cached.value;
    else {
      let pending = this.inflight.get(key);
      // Cancellation is scoped to the request which initiated a cache miss.
      if (!pending) {
        pending = this.load(ref, signal);
        this.inflight.set(key, pending);
        void pending.finally(() => this.inflight.delete(key)).catch(() => {});
      }
      genome = await pending;
    }
    return {
      ...genome,
      evidence: genome.evidence.map((e) => ({
        ...e,
        id: slot + ':' + e.field,
      })),
    };
  }
  private async request(
    path: string,
    raw = false,
    signal?: AbortSignal,
  ): Promise<string> {
    const url = 'https://api.github.com/repos/' + path;
    const key = (raw ? 'raw:' : 'json:') + path;
    const prior = this.conditional.get(key);
    const headers: Record<string, string> = {
      Accept: raw
        ? 'application/vnd.github.raw+json'
        : 'application/vnd.github+json',
      'User-Agent': 'FrankenRepo/0.1',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.options.token)
      headers.Authorization = 'Bearer ' + this.options.token;
    if (prior) headers['If-None-Match'] = prior.etag;
    const { response, text } = await boundedRequest(
      this.fetcher,
      url,
      { headers },
      { signal },
    );
    if (response.status === 304 && prior) return prior.text;
    if (response.status === 404)
      throw new LabError(
        'REPO_NOT_FOUND',
        'Repository not found or private. Only public GitHub repositories are supported.',
        404,
      );
    if (response.status === 403 || response.status === 429)
      throw new LabError(
        'GITHUB_RATE_LIMIT',
        'Public GitHub data is temporarily rate limited. Try again later.',
        429,
        true,
      );
    if (!response.ok)
      throw new LabError(
        'GITHUB_UNAVAILABLE',
        'Public GitHub data is temporarily unavailable.',
        503,
        true,
      );
    const etag = response.headers.get('etag');
    if (etag) {
      if (this.conditional.size >= 512)
        this.conditional.delete(this.conditional.keys().next().value!);
      this.conditional.set(key, { etag, text });
    }
    return text;
  }
  private async load(ref: string, signal?: AbortSignal): Promise<DonorGenome> {
    const meta = objectValue(jsonValue(await this.request(ref, false, signal)));
    if (
      meta.private !== false ||
      (meta.visibility !== undefined && meta.visibility !== 'public')
    )
      throw new LabError(
        'REPO_NOT_PUBLIC',
        'Only public repositories are supported.',
        404,
      );
    if (
      typeof meta.full_name !== 'string' ||
      meta.full_name.toLowerCase() !== ref.toLowerCase()
    )
      throw new LabError(
        'REPO_MOVED',
        'The repository identity changed. Enter its current canonical owner/repo.',
        409,
        true,
      );
    const canonical = normalizeRepo(meta.full_name);
    const url = 'https://github.com/' + canonical;
    const branch =
      typeof meta.default_branch === 'string'
        ? cleanText(meta.default_branch, 200)
        : 'UNKNOWN';
    const [languagesResult, commitResult] = await Promise.allSettled([
      this.request(canonical + '/languages', false, signal),
      this.request(canonical + '/commits?per_page=1', false, signal),
    ]);
    if (signal?.aborted)
      throw new LabError('CANCELLED', 'The inspection was cancelled.', 409);
    const observedAt = new Date(this.now()).toISOString();
    const warnings: string[] = [];
    let languages: string[] = [],
      readme: string | null = null,
      commitSha: string | null = null;
    if (languagesResult.status === 'fulfilled') {
      try {
        const obj = objectValue(jsonValue(languagesResult.value));
        languages = Object.entries(obj)
          .filter(([, v]) => typeof v === 'number')
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 3)
          .map(([k]) => cleanText(k, 60));
      } catch {
        warnings.push('Languages could not be read: UNKNOWN.');
      }
    } else
      warnings.push(
        'Languages unavailable: UNKNOWN (' +
          (languagesResult.reason instanceof LabError
            ? languagesResult.reason.code
            : 'UPSTREAM_UNAVAILABLE') +
          ').',
      );
    if (commitResult.status === 'fulfilled') {
      try {
        const list = jsonValue(commitResult.value);
        if (
          Array.isArray(list) &&
          typeof list[0]?.sha === 'string' &&
          /^[a-f0-9]{40}$/.test(list[0].sha)
        )
          commitSha = list[0].sha as string;
      } catch {
        /* absence stays unknown */
      }
    }
    if (!commitSha) warnings.push('Commit SHA unavailable: UNKNOWN.');
    try {
      readme = cleanText(
        await this.request(
          canonical + '/readme' + (commitSha ? '?ref=' + commitSha : ''),
          true,
          signal,
        ),
        1500,
      );
    } catch (err) {
      warnings.push(
        'README unavailable: PARTIAL (' +
          (err instanceof LabError ? err.code : 'UPSTREAM_UNAVAILABLE') +
          ').',
      );
    }
    if (signal?.aborted)
      throw new LabError('CANCELLED', 'The inspection was cancelled.', 409);
    const description =
      typeof meta.description === 'string'
        ? cleanText(meta.description, 350)
        : null;
    const topics = Array.isArray(meta.topics)
      ? meta.topics
          .filter((t): t is string => typeof t === 'string')
          .slice(0, 8)
          .map((t) => cleanText(t, 50))
      : [];
    const licenseObject =
      meta.license && typeof meta.license === 'object'
        ? (meta.license as Record<string, unknown>)
        : {};
    const license =
      typeof licenseObject.spdx_id === 'string' &&
      /^[A-Za-z0-9.+-]{1,80}$/.test(licenseObject.spdx_id) &&
      licenseObject.spdx_id !== 'NOASSERTION'
        ? licenseObject.spdx_id
        : 'UNKNOWN';
    const atom = (
      field: string,
      value: string | null,
      sourceUrl: string,
      status: EvidenceAtom['status'] = 'observed',
    ): EvidenceAtom => ({
      id: 'A:' + field,
      field,
      value: value ?? 'UNKNOWN',
      sourceUrl,
      observedAt,
      status: value === null ? 'unknown' : status,
    });
    const source = 'https://api.github.com/repos/' + canonical;
    const evidence = [
      atom('description', description, url),
      atom('topics', topics.length ? topics.join(', ') : null, url),
      atom(
        'languages',
        languages.length ? languages.join(', ') : null,
        source + '/languages',
      ),
      atom(
        'readme',
        readme,
        source + '/readme' + (commitSha ? '?ref=' + commitSha : ''),
        'partial',
      ),
      atom('license', license === 'UNKNOWN' ? null : license, url),
    ];
    const value: DonorGenome = {
      ref: canonical,
      url,
      observedAt,
      defaultBranch: branch,
      commitSha,
      license,
      description,
      topics,
      languages,
      readme,
      evidence,
      warnings,
    };
    if (this.cache.size >= 128)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(ref.toLowerCase(), {
      expires: this.now() + (this.options.ttlMs ?? 43_200_000),
      value,
    });
    return value;
  }
}
