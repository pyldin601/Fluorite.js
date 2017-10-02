// Type definitions for Fluorite.js
// Project: https://github.com/pldin601/Fluorite.js
// Definitions by: Roman Lakhtadyr <roman.lakhtadyr@gmail.com>
// TypeScript Version: 2.5

import Knex = require('knex');

declare function Fluorite(knex: Knex): Fluorite;

export default Fluorite;

interface Fluorite {
  Model: typeof Fluorite.Model;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

declare namespace Fluorite {
  type Scope = (qb: Knex.QueryBuilder, ...args: Array<any>) => Knex.QueryBuilder;
  type Attributes = { [name: string]: any };
  type OrderDirection = 'DESC' | 'ASC' | 'desc' | 'asc';
  type Scopes = { [name: string]: Scope };

  type ModelSubclass<T extends Model<any>> = {
    new(attributes: Attributes, previousAttributes: Attributes): T;
  }

  export abstract class Model<T extends Model<any>> {
    static table: string | null;
    static idAttribute: string;
    static scopes: Scopes;

    static fluorite: Fluorite;
    static knex: Knex;

    static find<T extends Model<any>>(id: any): SingleRowQuery<T>;
    static objects: MultipleRowsQuery<Model<any>>;

    id: any;
    attributes: Attributes;
    isNew: boolean;

    constructor(attributes: Attributes, previousAttributes?: Attributes);

    get(column: string): any;

    set(column: string, value: any): void;
    set(attributes: Attributes): void;

    save(): Promise<void>;
    save(name: string, value: any): Promise<void>;
    save(attributes: Attributes): Promise<void>;

    remove(): Promise<void>;
    refresh(): Promise<void>;

    toJSON(): any;

    hasMany<R extends Model<any>>(
      relatedClass: ModelSubclass<R>,
      foreignKey?: string,
      foreignKeyTarget?: string,
    ): MultipleRowsQuery<R>;

    belongsTo<R extends Model<any>>(
      relatedClass: ModelSubclass<R>,
      foreignKey?: string,
      foreignKeyTarget?: string,
    ): SingleRowQuery<R>;

    belongsToMany<R extends Model<any>>(
      relatedClass: ModelSubclass<R>,
      pivotTableName?: string,
      thisForeignKey?: string,
      thatForeignKey?: string,
      thisForeignKeyTarget?: string,
      thatForeignKeyTarget?: string,
    ): MultipleRowsQuery<R>;

    related(name: string): any;
    load(relation: string): Promise<void>;

    static NotFoundError: typeof Error;
    static IntegrityError: typeof Error;
  }

  interface BaseQuery<T extends Model<any>> {
    filter(attributes: Attributes): this;
    query(cb: (qb: Knex.QueryBuilder) => void): this;
    including(...relations: Array<string>): this;
    limit(limit: number): this;
    offset(offset: number): this;
    orderBy(column: string, direction?: OrderDirection);

    create(attributes: Attributes): Promise<T>;
    update(attributes: Attributes): Promise<void>;
    remove(): Promise<void>;
  }

  export interface MultipleRowsQuery<T extends Model<any>> extends BaseQuery<T>, Promise<Array<T>> {
    count(column?: string): Promise<number>;
    min(column: string): Promise<number | null>;
    max(column: string): Promise<number | null>;
    sum(column: string): Promise<number>;
    avg(column: string): Promise<number | null>;
    pluck(column: string): Promise<Array<any>>;
    single(attributes?: Attributes): SingleRowQuery<T>;
    first(attributes?: Attributes): SingleRowQuery<T>;
  }

  export interface SingleRowQuery<T extends Model<any>> extends BaseQuery<T>, Promise<T> {}
}
