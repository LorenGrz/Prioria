import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLES } from '../../lib/dynamo.js';
import { getUser } from '../../lib/auth.js';
import { ok, serverError } from '../../lib/response.js';

const DEFAULT_PREFERENCES = {
  sensitivity: 85, // 0-100, Filtros screen
  priorityThreshold: 8, // 1-10, set during onboarding
  autoReadMode: 'critico', // 'critico' | 'todo'
  categories: {
    bancos: true,
    pagos: true,
    trabajo: true,
    seguridad: true,
    clientes: false,
    entregas: true,
  },
  voice: {
    voiceId: 'lucia', // 'lucia' | 'enrique' -> maps to Polly VoiceId Lucia/Enrique
    language: 'es-ES',
    speed: 1.0, // 0.5 - 2.0
  },
};

export const handler = async (event) => {
  try {
    const { userId } = getUser(event);
    const result = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId } }));
    return ok({ ...DEFAULT_PREFERENCES, ...result.Item?.preferences });
  } catch (err) {
    return serverError(err);
  }
};
