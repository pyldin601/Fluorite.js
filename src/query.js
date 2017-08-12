/*
 * Copyright (c) 2017 Roman Lakhtadyr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { first } from 'lodash';
import { NotFoundError } from './';
import filter from './filter';

const getValue = qb => (
  qb.first().then(row => first(Object.values(row)))
);

const wrap = (row, ModelClass) =>
  new ModelClass(row, Object.assign({}, row));

const createUniqueQuery = (knexQuery, callback) => {
  const newQuery = knexQuery.clone();
  callback(newQuery);
  return newQuery;
};

export default class Query {
  constructor(modelClass, knexQuery) {
    this.modelClass = modelClass;
    this.knexInstance = modelClass.knex;
    this.knexQuery = knexQuery || this.knexInstance(modelClass.table);
  }

  filter(attributes) {
    return new Query(
      this.modelClass,
      createUniqueQuery(this.knexQuery, q => filter(q, attributes)),
    );
  }

  limit(number) {
    return new Query(
      this.modelClass,
      createUniqueQuery(this.knexQuery, q => q.limit(number)),
    );
  }

  offset(number) {
    return new Query(
      this.modelClass,
      createUniqueQuery(this.knexQuery, q => q.offset(number)),
    );
  }

  query(callback) {
    return new Query(
      this.modelClass,
      createUniqueQuery(this.knexQuery, callback),
    );
  }

  async fetchOne() {
    const row = await this.knexQuery.first();

    if (!row) {
      throw new NotFoundError('Entity not found');
    }

    return wrap(row, this.modelClass);
  }

  fetchAll() {
    return this.knexQuery
      .select()
      .then(rows => rows.map(row => wrap(row, this.modelClass)));
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
}
