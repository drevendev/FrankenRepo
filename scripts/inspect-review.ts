import { readFile } from 'node:fs/promises';
import { MongoCardStore } from '@frankenrepo/adapters';
const store = new MongoCardStore(
  process.env.MONGODB_URI!,
  process.env.MONGODB_DB ?? 'frankenrepo',
);
try {
  const cards = JSON.parse(
    await readFile('.local/qualification-cards.json', 'utf8'),
  ) as { id: string; token: string }[];
  const operations = await store.controls.mutate((l) =>
    l.operations
      .filter((o) => o.kind === 'ultramarine')
      .map((o) => ({ id: o.id, state: o.state, attempts: o.attempts })),
  );
  console.log(JSON.stringify(operations));
  for (const card of cards)
    for (const op of operations) {
      const result = await store.getReview(card.id, op.id);
      if (result) console.log(JSON.stringify({ cardId: card.id, ...result }));
    }
} finally {
  await store.close();
}
