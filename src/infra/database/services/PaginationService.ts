import { Injectable } from '@kernel/decorators/Injectable';

type StartKey = Record<string, string>;

@Injectable()
export class PaginationService {
  encode(lastEvaluatedKey: StartKey): string {
    return Buffer.from(JSON.stringify(lastEvaluatedKey), 'utf-8').toString('base64');
  }

  decode(signature: string): StartKey {
    return JSON.parse(Buffer.from(signature, 'base64').toString('utf-8'));
  }
}
