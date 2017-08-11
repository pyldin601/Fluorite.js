import fluorite from '../services/fluorite';

export default class Foo extends fluorite.Model {
  static table = 'foo';
  static scope = {
    first: q => q.limit(1),
    last: (q, amount) => q.limit(amount).query(knex => knex.orderBy(Foo.idAttribute, 'desc'))
  };
}
