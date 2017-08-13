import knex from './services/knex';
import User from './models/User';
import Post from './models/Post';
import fluorite from './services/fluorite';

beforeEach(async () => {
  await knex.schema.createTable('users', (table) => {
    table.increments();
    table.string('name').unsigned().notNullable();
  });

  await knex('users').insert({ name: 'John Doe' });
  await knex('users').insert({ name: 'Bob Marley' });
  await knex('users').insert({ name: 'Billy Boy' });

  await knex.schema.createTable('posts', (table) => {
    table.increments();
    table.string('title').notNullable();
    table.integer('user_id').unsigned().notNullable().references('users.id');
  });

  await knex('posts').insert({ title: 'Post #1', user_id: 1 });
  await knex('posts').insert({ title: 'Post #2', user_id: 1 });
  await knex('posts').insert({ title: 'Post #3', user_id: 2 });
});

afterEach(async () => {
  await knex.schema.dropTable('posts');
  await knex.schema.dropTable('users');
});

describe('Transactions', () => {
  it('Single action', async () => {
    fluorite.transaction(async () => {
      const user = await User.objects.get(1);
      user.set({ name: 'Billy Idol' });
      await user.save();
    });
  });

  it('Multiple action', async () => {
    await fluorite.transaction(async () => {
      const user = await User.objects.get(1);
      await user.posts().update({ title: 'New Title' });
    });
  });

  it('Return value from transaction', async () => {
    const posts = await fluorite.transaction(async () => {
      const user = await User.objects.get(1);
      await user.posts().update({ title: 'New Title' });
      return user.posts().all();
    });
    expect(posts).toBeInstanceOf(Array);
  });
});
