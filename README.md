# Fluorite.js
[![Build Status](https://travis-ci.org/pldin601/Fluorite.js.svg?branch=master)](https://travis-ci.org/pldin601/Fluorite.js)
[![Coverage Status](https://coveralls.io/repos/github/pldin601/Fluorite.js/badge.svg?branch=master)](https://coveralls.io/github/pldin601/Fluorite.js?branch=master)
[![Code Climate](https://codeclimate.com/github/pldin601/Fluorite.js/badges/gpa.svg)](https://codeclimate.com/github/pldin601/Fluorite.js)


Fluorite is a lightweight ORM based on Knex.js query builder.
It features promise based interface, provides transactions support,
bulk updating and deleting, and support for one-to-one, one-to-many and many-to-many relations.

## Configuration
First of all you'll need a copy of knex.js query builder to be configured.
Next, you'll need to create a database representing your domain model, and
then create models.

```javascript
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite3',
  },
});

await knex.schema.createTable('users', (table) => {
  table.increments();
  table.string('name');
  table.number('age').unsigned();
});

await knex.schema.createTable('posts', (table) => {
  table.increments();
  table.string('content');
  table.integer('user_id').unsigned().references('users.id');
});

const fluorite = require('fluorite')(knex);

class User extends fluorite.Model {
  static table = 'users';
  
  posts() {
    return this.hasMany(Post);
  }
}

class Post extends fluorite.Model {
  static table = 'posts';
  
  author() {
    return this.belongsTo(User);
  }
}
```

You should use the `fluorite` instance returned throughout your library
because it creates a connection pool for the current database.

## Basic actions
### Creating object
To create an object, instantiate it with object representing attributes values and then call `save()`.
```javascript
const user = User.create({ name: 'John Doe', age: 28 });
await user.save();
```

### Updating objects
To save changes to an object that’s already in the database use `save()`.

```javascript
user.set('age', 29);
await user.save();
```

You also can also pass an object of properties to `set` method:
```javascript
user.set({ age: 29, name: 'Bob Doe' });
await user.save();
```

Or shorthand 'set and update':
```javascript
await user.save({ age: 29, name: 'Bob Doe' });
```

### Delete object
To delete object from database use `remove()`.
```javascript
await user.remove();
```

## Querying
Each Model has `objects` property that returns new `MultipleRowsQuery` object that
can be used to retrieve or bulk update group of objects.

### Retrieving all objects
To retrieve all objects use `async/await` or `then` promise syntax:
```javascript
const users = await User.objects;
User.objects.then(users => console.log(users));
```
This method resolves to `Array` of all objects.

You can also use experimental `asyncInterator` syntax to iterate over database rows:
```javascript
for await (const user of User.objects) {
  console.log(user.get('name'));
}
```

### Retrieving objects with filters
```javascript
const adults = await User.objects.filter({ age__gte: 18 });
```

### Chaining filters
```javascript
const adultFemales = await User.objects
  .filter({ age__gte: 18 })
  .filter({ gender: 'female' })
  .all();
```
All filters are immutable. Each time you refine your criteria you get new copy of query.

### Limits and Offsets
To limit amount of objects to be returned use `limit()`.
You could also use `offset()` to specify offset for objects query.
```javascript
const firstFiveUsers = await User.objects.limit(5);
const nextFiveUsers = await User.object.limit(5).offset(5);
``` 

### Retrieve single object
There are two different ways to retrieve single object from database.

1. If you expect that your query may return only one row:
```javascript
const user = await User.objects.single({ name: 'John Doe' });
```

2. If your query may result in many rows but you want only first:
```javascript
const user = await User.objects.first({ name: 'John Doe' });

```

Difference of this methods is only that `single` will fail with `User.IntegrityError` if SQL statement returned more than one row.
If object matching your criteria does not exist both of it will throw `Model.NotFoundError`.
