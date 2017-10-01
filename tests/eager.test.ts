import knex from './services/knex';
import fluorite from './services/fluorite';

class Address extends fluorite.Model<Address> {
  static table = 'addresses';
  static columns = ['id', 'address'];

  places() {
    return this.hasMany(Place);
  }
}

class Place extends fluorite.Model<Address> {
  static table = 'places';
  static columns = ['id', 'place', 'address_id'];

  address() {
    return this.belongsTo(Address);
  }

  users() {
    return this.hasMany(User);
  }
}

class Thing extends fluorite.Model<Address> {
  static table = 'things';
  static columns = ['id', 'title', 'user_id'];
}

class Club extends fluorite.Model<Address> {
  static table = 'clubs';
  static columns = ['id', 'title'];
}

class User extends fluorite.Model<Address> {
  static table = 'users';
  static columns = ['id', 'name', 'place_id'];

  things() {
    return this.hasMany(Thing);
  }

  place() {
    return this.belongsTo(Place);
  }

  clubs() {
    return this.belongsToMany(Club);
  }
}

beforeEach(async () => {
  await knex.schema.createTable('addresses', (table) => {
    table.increments();
    table.string('address').notNullable();
  });

  await knex('addresses').insert({ id: 1, address: 'Peschanaya' });
  await knex('addresses').insert({ id: 2, address: 'Khreschatyk' });

  await knex.schema.createTable('places', (table) => {
    table.increments();
    table.string('place').notNullable();
    table.integer('address_id').unsigned().notNullable().references('addresses.id');
  });

  await knex('places').insert({ id: 1, place: 'Home', address_id: 1 });
  await knex('places').insert({ id: 2, place: 'Work', address_id: 2 });

  await knex.schema.createTable('users', (table) => {
    table.increments();
    table.string('name').notNullable();
    table.integer('place_id').unsigned().notNullable().references('places.id');
  });

  await knex('users').insert({ id: 1, name: 'John Doe', place_id: 1 });
  await knex('users').insert({ id: 2, name: 'Bob Marley', place_id: 1 });
  await knex('users').insert({ id: 3, name: 'Billy', place_id: 2 });

  await knex.schema.createTable('things', (table) => {
    table.increments();
    table.string('title').notNullable();
    table.integer('user_id').unsigned().notNullable().references('users.id');
  });

  await knex('things').insert({ id: 1, title: 'Book', user_id: 1 });
  await knex('things').insert({ id: 2, title: 'Pen', user_id: 1 });
  await knex('things').insert({ id: 3, title: 'Phone', user_id: 2 });

  await knex.schema.createTable('clubs', (table) => {
    table.increments();
    table.string('title').notNullable();
  });

  await knex('clubs').insert({ id: 1, title: 'Readers Club' });
  await knex('clubs').insert({ id: 2, title: 'Vegan Club' });
  await knex('clubs').insert({ id: 3, title: 'Night Club' });

  await knex.schema.createTable('clubs_users', (table) => {
    table.increments();
    table.string('user_id').unsigned().notNullable().references('users.id');
    table.string('club_id').unsigned().notNullable().references('clubs.id');
  });

  await knex('clubs_users').insert({ user_id: 1, club_id: 1 });
  await knex('clubs_users').insert({ user_id: 1, club_id: 2 });
  await knex('clubs_users').insert({ user_id: 1, club_id: 3 });
  await knex('clubs_users').insert({ user_id: 2, club_id: 1 });
  await knex('clubs_users').insert({ user_id: 2, club_id: 3 });
});

afterEach(async () => {
  await knex.schema.dropTable('clubs_users');
  await knex.schema.dropTable('clubs');
  await knex.schema.dropTable('things');
  await knex.schema.dropTable('users');
  await knex.schema.dropTable('places');
  await knex.schema.dropTable('addresses');
});


describe('Eager Function Tests', () => {
  it('Fetch user without relations', async () => {
    const user = await User.find(1);
    expect(user.toJSON()).toEqual({
      id: 1,
      name: 'John Doe',
      place_id: 1,
    });
  });

  it('Fetch user with single relation', async () => {
    const user = await User.find(1).including('place');
    expect(user.toJSON()).toEqual({
      id: 1,
      name: 'John Doe',
      place_id: 1,
      place: {
        address_id: 1,
        id: 1,
        place: 'Home',
      },
    });
  });

  it('Fetch user with nested relation', async () => {
    const user = await User.find(1).including('place.address', 'things');
    expect(user.toJSON()).toEqual({
      id: 1,
      name: 'John Doe',
      place_id: 1,
      place: {
        address_id: 1,
        id: 1,
        place: 'Home',
        address: {
          id: 1,
          address: 'Peschanaya',
        },
      },
      things: [
        { id: 1, title: 'Book', user_id: 1 },
        { id: 2, title: 'Pen', user_id: 1 },
      ],
    });
  });


  it('Fetch user with all relations', async () => {
    const user = await User.find(1).including('place.address');
    expect(user.toJSON()).toEqual({
      id: 1,
      name: 'John Doe',
      place_id: 1,
      place: {
        address_id: 1,
        id: 1,
        place: 'Home',
        address: {
          id: 1,
          address: 'Peschanaya',
        },
      },
    });
  });

  it('Test "Belongs To Many" eager load', async () => {
    const user = await User.find(1).including('clubs');
    expect(user.toJSON()).toEqual({
      id: 1,
      name: 'John Doe',
      place_id: 1,
      clubs: [
        { id: 1, title: 'Readers Club' },
        { id: 2, title: 'Vegan Club' },
        { id: 3, title: 'Night Club' },
      ],
    });
  });

  it('Test "Has Many" eager load', async () => {
    const address = await Address.find(1).including('places.users');
    expect(address.toJSON()).toEqual({
      id: 1,
      address: 'Peschanaya',
      places: [
        {
          id: 1,
          address_id: 1,
          place: 'Home',
          users: [
            { id: 1, name: 'John Doe', place_id: 1 },
            { id: 2, name: 'Bob Marley', place_id: 1 },
          ],
        },
      ],
    });
  });
});
