import knex from './services/knex';
import User from './models/User';
import Item from './models/Thing';
import { NotFoundError } from '../src';

beforeAll(async () => {
  await knex.schema.createTable('users', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
  });

  await knex('users').insert({ name: 'John Doe' });
  await knex('users').insert({ name: 'Bob Marley' });
  await knex('users').insert({ name: 'Billy Boy' });

  await knex.schema.createTable('things', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable().references('users.id');
  });

  await knex('things').insert({ name: 'Thing #1', user_id: 1 });
  await knex('things').insert({ name: 'Thing #2', user_id: 1 });
  await knex('things').insert({ name: 'Thing #3', user_id: 2 });
});

describe('Test relations', () => {
  it('Test hasMany relation #1', async () => {
    const user = await User.find(1);
    const things = await user.things().fetchAll();

    expect(JSON.stringify(things)).toBe(
      '[{"id":1,"name":"Thing #1","user_id":1},{"id":2,"name":"Thing #2","user_id":1}]',
    );
  });
  it('Test hasMany relation #2', async () => {
    const user = await User.find(2);
    const things = await user.things().fetchAll();

    expect(JSON.stringify(things)).toBe(
      '[{"id":3,"name":"Thing #3","user_id":2}]',
    );
  });
  it('Test hasMany relation #2', async () => {
    const user = await User.find(3);
    const things = await user.things().fetchAll();

    expect(things.length).toBe(0);
  });
});
