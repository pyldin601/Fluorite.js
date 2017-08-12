import Foo from './models/Foo';
import knex from './services/knex';

beforeEach(async () => {
  await knex.schema.createTable('foo', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
    table.integer('age').unsigned().notNullable();
  });

  await knex('foo').insert({ name: 'John Doe', age: 46 });
  await knex('foo').insert({ name: 'Bob Marley', age: 72 });
  await knex('foo').insert({ name: 'Billy', age: 12 });
});

afterEach(async () => {
  await knex.schema.dropTable('foo');
});

describe('Query Tests', () => {
  it('Should fetch all', async () => {
    const foos = await Foo.fetchAll();
    expect(foos).toBeInstanceOf(Array);
    expect(foos.map(foo => foo.toJSON())).toEqual([
      { age: 46, id: 1, name: 'John Doe' },
      { age: 72, id: 2, name: 'Bob Marley' },
      { age: 12, id: 3, name: 'Billy' },
    ]);
  });

  it('Should fetch with offsets', async () => {
    const foos = await Foo.models().offset(1).fetchAll();
    expect(foos).toBeInstanceOf(Array);
    expect(foos.map(foo => foo.toJSON())).toEqual([
      { age: 72, id: 2, name: 'Bob Marley' },
      { age: 12, id: 3, name: 'Billy' },
    ]);
  });

  it('Should fetch with limits and offsets', async () => {
    const foos = await Foo.models()
      .limit(1)
      .offset(1)
      .fetchAll();
    expect(foos).toBeInstanceOf(Array);
    expect(foos.map(foo => foo.toJSON())).toEqual([
      { age: 72, id: 2, name: 'Bob Marley' },
    ]);
  });

  it('Test simple filter', async () => {
    const foos = await Foo.filter({ id__eq: 1 }).fetchAll();
    expect(foos.length).toBe(1);
  });

  it('Test wrong operator', () => {
    expect(() => Foo.filter({ id__foo: 1 })).toThrow(TypeError);
  });


  it('Test IN filter', async () => {
    const query = Foo.filter({ id__in: [1, 2] });
    const foos = await query.pluck('id');
    expect(foos).toEqual([1, 2]);
  });

  it('Test Count', async () => {
    const count = await Foo.models().filter({ id__gt: 1 }).count();
    expect(count).toBe(2);
  });

  it('Test Max', async () => {
    const max = await Foo.models().max('age');
    expect(max).toBe(72);
  });

  it('Test Min', async () => {
    const min = await Foo.models().min('age');
    expect(min).toBe(12);
  });

  it('Test Sum', async () => {
    const sum = await Foo.models().sum('age');
    expect(sum).toBe(130);
  });

  it('Test Average', async () => {
    const avg = await Foo.models().avg('age').then(Math.floor);
    expect(avg).toBe(43);
  });

  it('Bulk Update', async () => {
    await Foo.models().update({ age: 20 });
    const count = await Foo.filter({ age__eq: 20 }).count();
    expect(count).toBe(3);
  });

  it('Bulk Delete', async () => {
    await Foo.filter({ age__lt: 18 }).remove();
    const count = await Foo.count();
    expect(count).toBe(2);
  });

  it('Pluck names', async () => {
    const names = await Foo.filter({ age__gt: 18 }).pluck('name');
    expect(JSON.stringify(names)).toBe('["John Doe","Bob Marley"]');
  });
});
