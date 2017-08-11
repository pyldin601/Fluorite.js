import knex from './services/knex';
import Foo from './models/Foo';

beforeAll(async () => {
  await knex.schema.createTable('foo', (table) => {
    table.increments();
    table.string('name');
  });

  await knex('foo').insert({ name: 'John Doe' });
  await knex('foo').insert({ name: 'Bob Marley' });
});

describe('Model tests', () => {
  it('Test model instance', async () => {
    const foo = new Foo({ id: 10, name: 'Bob Marley' });
    expect(foo.id).toBe(10);
    expect(foo.get('name')).toBe('Bob Marley');
  });

  it('Test find by id (exists)', async () => {
    const foo1 = await Foo.find(1);
    expect(foo1.attributes).toEqual({ id: 1, name: 'John Doe' });
    expect(foo1.id).toBe(1);
    expect(foo1.get('name')).toBe('John Doe');
  });

  it('Test find by id (not exists)', () => {
    return expect(Foo.find(10)).rejects.toBeInstanceOf(Error);
  });
});
