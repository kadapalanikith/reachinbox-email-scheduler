import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';

export const ELASTIC_INDEX_EMAILS = 'emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  maxRetries: 3,
  requestTimeout: 5000,
});

let isElasticsearchConnected = false;

export async function initElasticsearch(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    isElasticsearchConnected = true;
    console.log(`[Elasticsearch] Connected. Cluster status: ${health.status}`);

    const indexExists = await esClient.indices.exists({ index: ELASTIC_INDEX_EMAILS });
    if (!indexExists) {
      await esClient.indices.create({
        index: ELASTIC_INDEX_EMAILS,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            recipient: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } },
            },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            etherealPreviewUrl: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${ELASTIC_INDEX_EMAILS}' created successfully.`);
    }
    return true;
  } catch (error: any) {
    console.warn(`[Elasticsearch Warning]: Initialization failed or Elasticsearch not available (${error.message}). Search features will fall back gracefully.`);
    isElasticsearchConnected = false;
    return false;
  }
}

export function isESAvailable(): boolean {
  return isElasticsearchConnected;
}

export async function indexEmailDocument(document: {
  id: string;
  userId: string;
  senderId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  etherealPreviewUrl?: string | null;
  createdAt: Date | string;
}): Promise<void> {
  if (!isElasticsearchConnected) return;

  try {
    await esClient.index({
      index: ELASTIC_INDEX_EMAILS,
      id: document.id,
      document,
      refresh: 'wait_for',
    });
  } catch (err: any) {
    console.error(`[Elasticsearch] Failed to index email ${document.id}:`, err.message);
  }
}

export async function updateEmailDocument(
  id: string,
  partialDoc: {
    status?: string;
    sentAt?: Date | string | null;
    etherealPreviewUrl?: string | null;
    errorMessage?: string | null;
  }
): Promise<void> {
  if (!isElasticsearchConnected) return;

  try {
    await esClient.update({
      index: ELASTIC_INDEX_EMAILS,
      id,
      doc: partialDoc,
      refresh: 'wait_for',
    });
  } catch (err: any) {
    console.error(`[Elasticsearch] Failed to update email ${id}:`, err.message);
  }
}

export interface SearchEmailParams {
  userId: string;
  query: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function searchEmailsInES(params: SearchEmailParams) {
  const { userId, query, status, limit = 50, offset = 0 } = params;

  if (!isElasticsearchConnected) {
    return null; // Signals caller to fall back if ES is down
  }

  try {
    const mustQueries: any[] = [];
    if (query && query.trim().length > 0) {
      mustQueries.push({
        multi_match: {
          query: query.trim(),
          fields: ['recipient^3', 'subject^2', 'body'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustQueries.push({ match_all: {} });
    }

    const filterQueries: any[] = [{ term: { userId } }];
    if (status) {
      filterQueries.push({ term: { status } });
    }

    const result = await esClient.search({
      index: ELASTIC_INDEX_EMAILS,
      from: offset,
      size: limit,
      query: {
        bool: {
          must: mustQueries,
          filter: filterQueries,
        },
      },
      sort: [{ scheduledAt: { order: 'desc' } }],
    });

    const hits = result.hits.hits.map((hit) => hit._source);
    const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0;

    return { emails: hits, total };
  } catch (error: any) {
    console.error('[Elasticsearch] Search query error:', error.message);
    return null;
  }
}
