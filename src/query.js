import { NotFoundError } from './';
import filter from './filter';

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

  count(column = null) {
    return this.knexQuery.count();
  }

  update(attributes) {
    return this.knexQuery.update(attributes);
  }

  remove() {
    return this.knexQuery.delete();
  }
};
