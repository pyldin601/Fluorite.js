# Fluorite.js
[![Build Status](https://travis-ci.org/pldin601/Fluorite.js.svg?branch=master)](https://travis-ci.org/pldin601/Fluorite.js)
[![Coverage Status](https://coveralls.io/repos/github/pldin601/Fluorite.js/badge.svg?branch=master)](https://coveralls.io/github/pldin601/Fluorite.js?branch=master)
[![Code Climate](https://codeclimate.com/github/pldin601/Fluorite.js/badges/gpa.svg)](https://codeclimate.com/github/pldin601/Fluorite.js)


Fluorite is a lightweight ORM based on Knex.js query builder.
It features promise based interface, provides transactions support,
bulk updating and deleting, and support for one-to-one, one-to-many and many-to-many relations.

## Requirements
* `node 8+`

## Configuration
First of all you'll need a copy of `knex.js` query builder to be configured.
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
### Creating objects
To create an model object, instantiate it with object representing attributes or
call method `create()` with attributes on a model class and then call `save()`.
```javascript
const user = new User({ name: 'John Doe', age: 28 });
// or
const user = User.create({ name: 'John Doe', age: 28 });

await user.save();
```

### Updating objects
To save changes to an object that is already in the database, call object's method `save()`.

```javascript
user.set('age', 29);
await user.save();
```

You also can also pass an object with attributes to `set` method:
```javascript
user.set({ age: 29, name: 'Bob Doe' });
await user.save();
```

Or shorthand 'set and update':
```javascript
await user.save({ age: 29, name: 'Bob Doe' });
```

### Deleting objects
To delete object from database use method `remove()`.
```javascript
await user.remove();
```

## Querying
### Querying multiple objects
Each Model has `objects` property that by default returns new `MultipleRowsQuery` object that
can be used to retrieve or bulk update group of objects.

### Retrieving all objects
To retrieve all objects use `async/await` or `then` promise syntax on the query:
```javascript
const users = await User.objects;
// or
User.objects.then(users => console.log(users));
```

You can also use experimental `asyncInterator` syntax to iterate over database rows:
```javascript
for await (const user of User.objects) {
  console.log(user.get('name'));
}
```

### Filtering objects
To filter query result use method `filter()` passing to it object with attributes for refining. 

```javascript
const males = await User.objects.filter({ gender: 'male' });
```

By default used `=` operator for comparing. But you alter this behavior.
Just add double underscore and operator name after property name (example: `age__gt`).

#### Supported operators:
* `eq` evaluates to **=** 
* `ne` evaluates to **!=**
* `gt` evaluates to **>**
* `gte` evaluates to **>=**
* `lt` evaluates to **<**
* `lte` evaluates to **<=**
* `in` evaluates to **IN**
* `like` evaluates to **LIKE**

```javascript
const adults = await User.objects.filter({ age__gte: 18 });
const users = await User.objects.filter({ id__in: [1, 2, 3] });
const irishes = await User.objects.filter({ name__like: 'Mac%' });
```

### Chaining filters
```javascript
const adultFemales = await User.objects
  .filter({ age__gte: 18 })
  .filter({ gender: 'female' });
```

All filters are **immutable**. Each time you refine your criteria you get new copy of query.

All filters are **lazy**. It means that query will run only when you call `then` or iterate
over query.

### Limits and Offsets
To limit amount of objects to be returned use `limit()`.
You could also use `offset()` to specify offset for objects query.
```javascript
const firstFiveUsers = await User.objects.limit(5);
const nextFiveUsers = await User.object.limit(5).offset(5);
``` 

### Retrieve single object
There are two different ways to retrieve single object from database.

1. If you want to retrieve single object using primary key:
```javascript
const user = await User.find(5);
```

2. If you expect to retrieve only single row:
```javascript
const user = await User.objects.single({ name: 'John Doe' });
```
It will fail with `User.IntegrityError` if SQL statement returned more than one row.

3. If you want to get only first row in multi-row statement:
```javascript
const user = await User.objects.first({ name: 'John Doe' });
```

If object matching your criteria does not exist `Model.NotFoundError` will be thrown.

## Transactions
Use of transactions is very simple:
```javascript
import { fluorite } from 'fluorite';

await fluorite.transaction(async () => {
  const user = await User.find(10);
  await user.save({ name: 'John Doe' });
});
```

### Nested transactions
You can nest transactions as many as your database supports.
