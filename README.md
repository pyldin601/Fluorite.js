# Fluorite.js
[![Build Status](https://travis-ci.org/pldin601/Fluorite.js.svg?branch=master)](https://travis-ci.org/pldin601/Fluorite.js)
[![Coverage Status](https://coveralls.io/repos/github/pldin601/Fluorite.js/badge.svg?branch=master)](https://coveralls.io/github/pldin601/Fluorite.js?branch=master)
[![Code Climate](https://codeclimate.com/github/pldin601/Fluorite.js/badges/gpa.svg)](https://codeclimate.com/github/pldin601/Fluorite.js)


Fluorite is a lightweight ORM based on Knex.js query builder.
It features promise based interface, provides transactions support,
bulk updating and deleting, and support for one-to-one, one-to-many and many-to-many relations.

## Configuration
First of all you need a copy of knex.js query builder to be configured.

```javascript
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
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
because it creates a connection pool for the current database and for
transactions to work correctly.
