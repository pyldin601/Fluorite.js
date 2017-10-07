// Type definitions for Fluorite.js
// Project: https://github.com/pldin601/Fluorite.js
// Definitions by: Roman Lakhtadyr <roman.lakhtadyr@gmail.com>
// TypeScript Version: 2.5
import * as Knex from 'knex';

declare namespace Fluorite {
  type Scope = (qb: BaseQuery<Model<any>>, ...args: Array<any>) => BaseQuery<Model<any>>;
  type Attributes = { [name: string]: any };
  type OrderDirection = 'DESC' | 'ASC' | 'desc' | 'asc';

  type ModelSubclass<T extends Model<any>> = {
    new(attributes: Attributes, previousAttributes: Attributes): T;
  }

  abstract class Model<T extends Model<any>> {
    static table: string | null;
    static idAttribute: string;
    static scopes: { [name: string]: Scope };

    static fluorite: Fluorite;
    static knex: Knex;

    static find<T extends Model<any>>(id: any): SingleRowQuery<T>;
    static objects<T extends Model<any>>(): MultipleRowsQuery<T>;

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
    ): HasMany<R>;

    belongsTo<R extends Model<any>>(
      relatedClass: ModelSubclass<R>,
      foreignKey?: string,
      foreignKeyTarget?: string,
    ): BelongsTo<R>;

    belongsToMany<R extends Model<any>>(
      relatedClass: ModelSubclass<R>,
      pivotTableName?: string,
      thisForeignKey?: string,
      thatForeignKey?: string,
      thisForeignKeyTarget?: string,
      thatForeignKeyTarget?: string,
    ): BelongsToMany<R>;

    related(name: string): any;
    load(relation: string): Promise<void>;
    setRelatedData(name: string, data: Model<any> | Array<Model<any>>): void;

    static NotFoundError: typeof Error;
    static IntegrityError: typeof Error;
  }

  interface BaseQuery<T extends Model<any>> {
    filter(attributes: Attributes): this;
    query(cb: (qb: Knex.QueryBuilder) => void): this;
    including(...relations: Array<string>): this;
    limit(limit: number): this;
    offset(offset: number): this;
    orderBy(column: string, direction?: OrderDirection): this;

    create(attributes: Attributes): Promise<T>;
    update(attributes: Attributes): Promise<void>;
    remove(): Promise<void>;
  }

  interface MultipleRowsQuery<T extends Model<any>> extends BaseQuery<T>, Promise<Array<T>> {
    count(column?: string): Promise<number>;
    min(column: string): Promise<number | null>;
    max(column: string): Promise<number | null>;
    sum(column: string): Promise<number>;
    avg(column: string): Promise<number | null>;
    pluck(column: string): Promise<Array<T>>;
    single(attributes?: Attributes): SingleRowQuery<T>;
    first(attributes?: Attributes): SingleRowQuery<T>;
  }

  interface SingleRowQuery<T extends Model<any>> extends BaseQuery<T>, Promise<T> {}

  interface BelongsTo<T extends Model<any>> extends SingleRowQuery<T> {}
  interface HasMany<T extends Model<any>> extends MultipleRowsQuery<T> {}
  interface BelongsToMany<T extends Model<any>> extends MultipleRowsQuery<T> {}


  interface Fluorite {
    Model: typeof Fluorite.Model;
    transaction<T>(callback: () => Promise<T>): Promise<T>;
  }
}

declare function Fluorite(knex: Knex): Fluorite.Fluorite;

export = Fluorite;
