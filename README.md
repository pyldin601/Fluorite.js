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

### Delete object
To delete object from database use `remove()`.
```javascript
await user.remove();
```

## Querying
Each Model has `objects` property that returns new `Query` object that
can be used to retrieve or bulk update groups of objects.

### Retrieving all objects
To retrieve all objects from table use `all()`
```javascript
const users = await User.objects.all();
```
This method returns promise that resolves to `Array` of all objects.

### Retrieving objects with filters
```javascript
const adults = await User.objects.filter({ age__gte: 18 }).all();
```

### Chaining filters
```javascript
const adultFemales = await User.objects
  .filter({ age__gte: 18 })
  .filter({ gender: 'female' })
  .all();
```
All filters and immutable. Each time you refine `Query` you get new copy of `Query`.

### Limits and Offsets
To limit amount of objects to be returned use `limit()`.
You could also use `offset()` to specify offset for objects query.
```javascript
const firstFiveUsers = await User.objects.limit(5).all();
const nextFiveUsers = await User.object.limit(5).offset(5).all();
``` 

### Retrieve single object
To retrieve single object use `get()`.
You call `get()` with primitive value (`string`, `integer`, `boolean`) and it will look for
object by primary key with given value.
```javascript
const user = await User.objects.get(1);
```
It will throw `User.NotFoundError` if object does not exist in table or `User.IntegrityError` if SQL statement returned more than one row.
