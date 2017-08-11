import knex from './services/knex';
import User from './models/User';
import Thing from './models/Thing';

beforeEach(async () => {
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

  await knex.schema.createTable('addresses', (table) => {
    table.increments();
    table.string('street').notNullable();
    table.string('building').notNullable();
    table.string('flat').notNullable();
  });

  await knex('addresses').insert({ street: 'Kutuzova', building: '2', flat: 52 });
  await knex('addresses').insert({ street: 'Michurina', building: '2', flat: 21 });
  await knex('addresses').insert({ street: 'Lumumby', building: 13, flat: 55 });

  await knex.schema.createTable('addresses_users', (table) => {
    table.integer('address_id').unsigned().notNullable().references('addresses.id');
    table.integer('user_id').unsigned().notNullable().references('users.id');

    table.unique(['address_id', 'user_id']);
  });

  await knex('addresses_users').insert({ user_id: 1, address_id: 1 });
  await knex('addresses_users').insert({ user_id: 1, address_id: 2 });
  await knex('addresses_users').insert({ user_id: 1, address_id: 3 });

  await knex('addresses_users').insert({ user_id: 2, address_id: 1 });
  await knex('addresses_users').insert({ user_id: 2, address_id: 3 });
});

afterEach(async () => {
  await knex.schema.dropTable('addresses_users');
  await knex.schema.dropTable('addresses');
  await knex.schema.dropTable('things');
  await knex.schema.dropTable('users');
});

describe('Test relations', () => {
  it('Test hasMany relation #1', async () => {
    const user = await User.find(1);

    expect(user).toBeInstanceOf(User);

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
  it('Test hasMany relation #3', async () => {
    const user = await User.find(3);
    const things = await user.things().fetchAll();

    expect(things.length).toBe(0);
  });

  it('Test belongsTo relation #1', async () => {
    const thing = await Thing.find(3);
    const user = await thing.user().fetchOne();

    expect(user.id).toBe(2);
  });

  it('Test belongsToMany relation #1', async () => {
    const user = await User.find(1);
    const addresses = await user.addresses().fetchAll();

    expect(JSON.stringify(addresses)).toBe(
      '[{"id":1,"street":"Kutuzova","building":"2","flat":"52"},' +
       '{"id":2,"street":"Michurina","building":"2","flat":"21"},' +
       '{"id":3,"street":"Lumumby","building":"13","flat":"55"}]',
    );
  });

  it('Test belongsToMany relation #2', async () => {
    const user = await User.find(2);
    const addresses = await user.addresses().fetchAll();

    expect(JSON.stringify(addresses)).toBe(
      '[{"id":1,"street":"Kutuzova","building":"2","flat":"52"},' +
      '{"id":3,"street":"Lumumby","building":"13","flat":"55"}]',
    );
  });

  it('Test belongsToMany relation #3', async () => {
    const user = await User.find(3);
    const addresses = await user.addresses().fetchAll();

    expect(addresses.length).toBe(0);
  });
});
