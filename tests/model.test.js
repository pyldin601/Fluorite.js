import knex from './services/knex';
import Foo from './models/Foo';
import { NotFoundError } from '../src';

beforeAll(async () => {
  await knex.schema.createTable('foo', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
    table.integer('age').unsigned().notNullable()
  });

  await knex('foo').insert({ name: 'John Doe', age: 46 });
  await knex('foo').insert({ name: 'Bob Marley', age: 72 });
  await knex('foo').insert({ name: 'Billy', age: 12 });
});

describe('Model tests', () => {
  it('Test model instance', async () => {
    const foo = new Foo({ id: 10, name: 'Bob Marley' });
    expect(foo.id).toBe(10);
    expect(foo.get('name')).toBe('Bob Marley');
  });

  it('Test find by id (if exists)', async () => {
    const foo1 = await Foo.find(1);
    expect(foo1.attributes).toEqual({ id: 1, name: 'John Doe', age: 46 });
    expect(foo1.id).toBe(1);
    expect(foo1.get('name')).toBe('John Doe');
  });

  it('Test find by id (if not exists)', async () => {
    expect.assertions(2);
    try {
      await Foo.find(10);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError)
      expect(e.message).toBe('Entity not found');
    }
  });

  it('Test fetchAll', async () => {
    const foos = await Foo.fetchAll();
    expect(foos).toBeInstanceOf(Array);
    expect(foos.length).toBe(3);
    for (const foo of foos) {
      expect(foo).toBeInstanceOf(Foo);
    }
  });

  it('Test serialization', async () => {
    const foos = await Foo.fetchAll();
    const json = JSON.stringify(foos);
    expect(json).toBe(
      '[{"id":1,"name":"John Doe","age":46},{"id":2,"name":"Bob Marley","age":72},{"id":3,"name":"Billy","age":12}]',
    );
  });

  it('Test filter "eq"', async () => {
    const foos = await Foo.filter({ 'age__eq': 12 }).fetchAll();
    expect(foos.length).toBe(1);
  });

  it('Test filter "gt"', async () => {
    const foos = await Foo.filter({ 'age__gt': 18 }).fetchAll();
    expect(foos.length).toBe(2);
  });

  it('Test max aggregation', async () => {
    const maxAge = await Foo.query().max('age');
    expect(maxAge).toBe(72);
  });

  it('Test aggregation on empty collection', async () => {
    const maxAge = await Foo.filter({ 'age_gt': 100 }).max('age');
    expect(maxAge).toBeNull();
  });

  it('Test count on empty collection', async () => {
    const maxAge = await Foo.filter({ 'age_gt': 100 }).count();
    expect(maxAge).toBe(0);
  });

  it('Test clone', async () => {
    const qb1 = Foo.query();
    const qb2 = qb1.clone().filter({ 'age__gt': 18 });
    expect(await qb2.count()).toBe(2);
    expect(await qb1.count()).toBe(3);
  });

  it('Create entity', async () => {
    const foo = new Foo({ name: 'Alan Davey', age: 42 });
    expect(foo.isNew).toBeTruthy();
    expect(await Foo.filter({ 'name__eq': 'Alan Davey' }).count()).toBe(0);

    await foo.save();
    expect(foo.isNew).toBeFalsy();
    expect(await Foo.filter({ 'name__eq': 'Alan Davey' }).count()).toBe(1);
  });

  it('Update entity', async () => {
    const foo = await Foo.find(1);
    foo.set('name', 'Other Guy');
    await foo.save();

    const updatedFoo = await Foo.find(1);
    expect(updatedFoo.get('name')).toBe('Other Guy');
  });

  it('Delete entity', async () => {
    const foo = await Foo.find(1);

    await foo.remove();

    return expect(Foo.find(1)).rejects.toBeInstanceOf(NotFoundError);
  });
});
