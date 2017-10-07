import { QueryBuilder } from 'knex';
import { BaseQuery } from '../../';
import fluorite from '../services/fluorite';

export default class Foo extends fluorite.Model<Foo> {
  static table = 'foo';
  static scopes = {
    firstOne: (q: BaseQuery<Foo>) => q.limit(1),
    lastFew: (q: BaseQuery<Foo>, amount: number) =>
      q.limit(amount).query((knex: QueryBuilder) => knex.orderBy(Foo.idAttribute, 'desc')),
  };
  static columns = ['id', 'name', 'age'];
}
