export const SAMPLE_REPOS = [
  {
    ref: 'drevendev/HungryCrab',
    label: 'Hungry Crab',
    collection: 'Dreven',
  },
  {
    ref: 'drevendev/Scriptorium',
    label: 'Scriptorium',
    collection: 'Dreven',
  },
  {
    ref: 'drevendev/Playmancer',
    label: 'Playmancer',
    collection: 'Dreven',
  },
  {
    ref: 'drevendev/Dayflare',
    label: 'Dayflare',
    collection: 'Dreven',
  },
  {
    ref: 'DenisSergeevitch/ex-ussr-kinship-research',
    label: 'Kinship Research',
    collection: 'Guests',
  },
  {
    ref: 'DenisSergeevitch/desktop-fly',
    label: 'Desktop Fly',
    collection: 'Guests',
  },
  {
    ref: 'withastro/astro',
    label: 'Astro',
    collection: 'Community',
  },
  {
    ref: 'excalidraw/excalidraw',
    label: 'Excalidraw',
    collection: 'Community',
  },
  {
    ref: 'pallets/flask',
    label: 'Flask',
    collection: 'Community',
  },
  {
    ref: 'jqlang/jq',
    label: 'jq',
    collection: 'Community',
  },
  {
    ref: 'godotengine/godot',
    label: 'Godot',
    collection: 'Community',
  },
  {
    ref: 'blender/blender',
    label: 'Blender',
    collection: 'Community',
  },
  {
    ref: 'ollama/ollama',
    label: 'Ollama',
    collection: 'Community',
  },
  {
    ref: 'processing/p5.js',
    label: 'p5.js',
    collection: 'Community',
  },
  {
    ref: 'vitejs/vite',
    label: 'Vite',
    collection: 'Community',
  },
  {
    ref: 'sveltejs/svelte',
    label: 'Svelte',
    collection: 'Community',
  },
] as const;
export const SAMPLE_COLLECTIONS = ['Dreven', 'Guests', 'Community'] as const;
export function randomDonors(
  previous?: readonly [string, string],
  random: () => number = Math.random,
): [string, string] {
  const count = SAMPLE_REPOS.length;
  const a = Math.floor(random() * count);
  let b = Math.floor(random() * (count - 1));
  if (b >= a) b++;
  const pair: [string, string] = [SAMPLE_REPOS[a].ref, SAMPLE_REPOS[b].ref];
  if (
    previous &&
    pair.every((ref) =>
      previous.some((old) => old.toLowerCase() === ref.toLowerCase()),
    )
  ) {
    do {
      b = (b + 1) % count;
    } while (b === a);
    pair[1] = SAMPLE_REPOS[b].ref;
  }
  return pair;
}
