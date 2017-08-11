import Query from './query';

export default (knex) => class Model {
  static table = null;
  static idAttribute = 'id';
  static scope = {
    first: (qb) => qb.offset(0).limit(1),
  };

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

  serialize() {
    return this.attributes;
  }

  hasMany(relatedClass, foreignKey, foreignKeyTarget) {
    return new Query(relatedClass).filter({ [foreignKey]: this.get(foreignKeyTarget) })
  }

  toJSON() {
    return this.serialize();
  }

  static find(id) {
    return this.query()
      .filter({ [this.idAttribute]: id })
      .fetchOne();
  }

  static query() {
    return new Query(this);
  }

  static filter(attributes) {
    return this.query().filter(attributes);
  }

  static fetchAll() {
    return this.query().fetchAll();
  }

  static fetchOne() {
    return this.query().fetchOne();
  }

  static count() {
    return this.query().count();
  }
};
