import { first } from 'lodash';
import knex from './services/knex';
import Foo from './models/Foo';

beforeEach(async () => {
  await knex.schema.createTable('foo', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
    table.integer('age').unsigned().notNullable();
  });

  await knex('foo').insert({ id: 1, name: 'John Doe', age: 46 });
  await knex('foo').insert({ id: 2, name: 'Bob Marley', age: 72 });
  await knex('foo').insert({ id: 3, name: 'Billy', age: 12 });
});

afterEach(async () => {
  await knex.schema.dropTable('foo');
});

describe('Model tests', () => {
  it('Test model instance', async () => {
    const foo = new Foo({ id: 10, name: 'Bob Marley' });
    expect(foo.id).toBe(10);
    expect(foo.get('name')).toBe('Bob Marley');
    expect(foo.isNew).toBeFalsy();
  });

  it('Test find by id (if exists)', async () => {
    const foo1 = await Foo.find(1);
    console.log(foo1.toString());
    expect(foo1.attributes).toEqual({ id: 1, name: 'John Doe', age: 46 });
    expect(foo1.id).toBe(1);
    expect(foo1.get('name')).toBe('John Doe');
  });

  it('Test find by id (if not exists)', async () => {
    expect.assertions(2);
    try {
      const foo = Foo.find(10);
      console.log(foo.toString());
      await foo;
    } catch (e) {
      expect(e).toBeInstanceOf(Foo.NotFoundError);
      expect(e.message).toBe('Entity not found');
    }
  });

  it('Test serialization', async () => {
    const foos = await Foo.objects<Foo>();
    const json = foos.map((foo: Foo) => foo.toJSON());
    expect(json).toEqual(
      [
        { id: 1, name: 'John Doe', age: 46 },
        { id: 2, name: 'Bob Marley', age: 72 },
        { id: 3, name: 'Billy', age: 12 },
      ],
    );
  });

  it('Test filter "eq"', async () => {
    const foos = await Foo.objects().filter({ age__eq: 12 });
    expect(foos.length).toBe(1);
  });

  it('Test filter "gt"', async () => {
    const foos = await Foo.objects().filter({ age__gt: 18 });
    expect(foos.length).toBe(2);
  });

  it('Test max aggregation', async () => {
    const maxAge = await Foo.objects().max('age');
    expect(maxAge).toBe(72);
  });

  it('Test aggregation on empty collection', async () => {
    const maxAge = await Foo.objects().filter({ age__gt: 100 }).max('age');
    expect(maxAge).toBeNull();
  });

  it('Test count on empty collection', async () => {
    const maxAge = await Foo.objects().filter({ age__gt: 100 }).count();
    expect(maxAge).toBe(0);
  });

  it('Test clone', async () => {
    const qb1 = Foo.objects();


    const qb2 = qb1.filter({ age__gt: 18 });

    console.log(await qb1.count());

    expect(await qb1.count()).toBe(3);
    expect(await qb2.count()).toBe(2);
  });

  it('Fetch One', async () => {
    const foo = await Foo.objects().first();
    expect(foo).toBeInstanceOf(Foo);
  });

  it('Fetch One (integrity error)', () => {
    const foo = Foo.objects().single();
    return expect(foo).rejects.toBeInstanceOf(Foo.IntegrityError);
  });


  it('Create entity', async () => {
    const foo = new Foo({ name: 'Alan Davey', age: 42 });
    expect(foo.isNew).toBeTruthy();
    expect(await Foo.objects().filter({ name__eq: 'Alan Davey' }).count()).toBe(0);

    await foo.save();
    expect(foo.isNew).toBeFalsy();
    expect(await Foo.objects().filter({ name__eq: 'Alan Davey' }).count()).toBe(1);
  });

  it('Update entity', async () => {
    const foo = await Foo.find(1);
    foo.set('name', 'Other Guy');
    foo.set({
      name: 'Other Guy',
    });
    await foo.save();

    // Do not update if nothing to update
    await foo.save();

    const updatedFoo = await Foo.find(1);
    expect(updatedFoo.get('name')).toBe('Other Guy');
  });

  it('Delete entity', async () => {
    const foo = await Foo.find(1);

    await foo.remove();

    return expect(Foo.find(1)).rejects.toBeInstanceOf(Foo.NotFoundError);
  });

  it('Fail if deleting new entity', () => (
    expect(new Foo({ name: 'Abc', age: 10 }).remove())
      .rejects.toBeInstanceOf(Foo.NotFoundError)
  ));

  it('Test scopes functionality', async () => {
    const foo1 = await (Foo.objects() as any).firstOne() as Foo[];
    expect(foo1.length).toBe(1);

    const foo2 = await (Foo.objects() as any).lastFew(2) as Foo[];
    expect(first(foo2).id).toBe(3);
    expect(foo2.length).toBe(2);

    expect(() => (Foo.objects() as any).bar()).toThrow(TypeError);
  });

  it('Test refresh() method', async () => {
    const foo = new Foo({ id: 1 });
    await foo.refresh();

    expect(foo.toJSON()).toEqual({
      id: 1,
      age: 46,
      name: 'John Doe',
    });
  });
});
