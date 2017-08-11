export default (knex) => class Model {
  static table = null;
  static idAttribute = 'id';
  static scope = {};

  static get knex() {
    return knex;
  }

  constructor(attributes = {}) {
    this.attributes = attributes;
  }

  get id() {
    return this.attributes[this.constructor.idAttribute];
  }

  get(name) {
    return this.attributes[name];
  }

  static find(id) {
    return knex(this.table)
      .where(this.idAttribute, id)
      .first()
      .then(row => {
        if (!row) {
          return Promise.reject(new Error('Entity not found'));
        }
        return row;
      })
      .then(row => new this(row));
  }
};
