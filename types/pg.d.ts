declare module "pg" {
  export interface PoolClient {
    query(text: string, values?: any[]): Promise<any>;
    release(): void;
  }

  export class Pool {
    constructor(config?: any);
    query(text: string, values?: any[]): Promise<any>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
