import { Capacitor } from '@capacitor/core';
import { IRoutineRepository } from './repositories/types';
import { SqliteRoutineRepository } from './repositories/sqliteRepository';
import { IndexedDbRoutineRepository } from './repositories/indexedDbRepository';

let repositoryInstance: IRoutineRepository | null = null;

export async function getRoutineRepository(): Promise<IRoutineRepository> {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const sqliteRepo = new SqliteRoutineRepository();
      await sqliteRepo.init();
      repositoryInstance = sqliteRepo;
      console.log('[Database] Initialized SQLite native repository');
      return repositoryInstance;
    } catch (err) {
      console.error('[Database] Failed to init native SQLite, falling back to IndexedDB:', err);
    }
  }

  const idbRepo = new IndexedDbRoutineRepository();
  await idbRepo.init();
  repositoryInstance = idbRepo;
  console.log('[Database] Initialized IndexedDB repository');
  return repositoryInstance;
}

