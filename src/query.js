import { first } from 'lodash';
import { NotFoundError } from './';
import filter from './filter';

const getValue = (qb) => (
  qb.first().then(row => first(Object.values(row)))
);

export default class Query {
  constructor(modelClass) {
    this.modelClass = modelClass;
    this.knexInstance = modelClass.knex;
    this.knexQuery = this.knexInstance(modelClass.table);
  }

  filter(attributes) {
    filter(this.knexQuery, attributes);
    return this;
  }

  cleanFilter() {

  }

  query(callback) {
    callback(this.knexQuery);
    return this;
  }

  async fetchOne() {
    const row = await this.knexQuery.first();

    if (!row) {
      throw new NotFoundError('Entity not found');
    }

    return new this.modelClass(row);
  }

  fetchAll() {
    return this.knexQuery
      .select('*')
      .then(rows => rows.map(row => new this.modelClass(row)));
  }

  pluck(column) {
    return this.knexQuery.pluck(column);
  }

  update(attributes) {
    return this.knexQuery.update(attributes);
  }

  remove() {
    return this.knexQuery.delete();
  }

  count(column = null) {
    return getValue(this.knexQuery.count(column));
  }

  min(column) {
    return getValue(this.knexQuery.min(column));
  }

  max(column) {
    return getValue(this.knexQuery.max(column));
  }

  sum(column) {
    return getValue(this.knexQuery.sum(column));
  }

  avg(column) {
    return getValue(this.knexQuery.avg(column));
  }

  clone() {
    const that = new this.constructor(this.modelClass);
    that.knexQuery = this.knexQuery.clone();
    return that;
  }
};
