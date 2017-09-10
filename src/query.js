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
import { first, isEmpty } from 'lodash';
import StreamToAsync from 'stream-to-async-iterator';
import filter from './filter';

const getValue = qb => (
  qb.first().then(row => first(Object.values(row)))
);

class BaseQuery {
  constructor(modelClass, filters = []) {
    this.modelClass = modelClass;
    this.filters = filters;

    this.applyScopes();
  }

  applyScopes() {
    for (const property of Object.keys(this.modelClass.scopes)) {
      const scope = this.modelClass.scopes[property];
      this[property] = (...args) => scope(this, ...args);
    }
  }

  prepareQuery() {
    const knexQuery = this.knexQueryTransacting();
    this.filters.forEach(f => f(knexQuery));
    return knexQuery;
  }

  knexQueryTransacting() {
    const knexQuery = this.modelClass.knex(this.modelClass.table);
    if (this.modelClass.fluorite.transaction.isTransacting()) {
      return knexQuery.transacting(
        this.modelClass.fluorite.transaction.currentTransaction(),
      );
    }
    return knexQuery;
  }

  filter(attributes) {
    return this.query(filter(attributes));
  }

  query(callback) {
    return new this.constructor(this.modelClass, [...this.filters, callback]);
  }

  toString() {
    return this.prepareQuery().toString();
  }

  limit(number) {
    return this.query(q => q.limit(number));
  }

  offset(number) {
    return this.query(q => q.offset(number));
  }

  async create(attributes) {
    const model = this.modelClass.create(attributes);
    await model.save();
    return model;
  }

  async update(attributes) {
    await this.prepareQuery().update(attributes);
  }

  async remove() {
    await this.prepareQuery().delete();
  }

  async then(resolve, reject) {
    try {
      resolve(await this.eval());
    } catch (e) {
      reject(e);
    }
  }
}

export class SingleRowQuery extends BaseQuery {
  eval() {
    const fluorite = this.modelClass.fluorite;
    return this
      .prepareQuery()
      .select()
      .then(async (rows) => {
        if (rows.length === 1) {
          return fluorite.wrapModel(first(rows), this.modelClass);
        }

        if (rows.length === 0) {
          throw new this.modelClass.NotFoundError('Entity not found');
        }

        throw new this.modelClass.IntegrityError('More than one entity returned');
      });
  }
}

export class MultipleRowsQuery extends BaseQuery {
  count(column = null) {
    return getValue(this.prepareQuery().count(column));
  }

  min(column) {
    return getValue(this.prepareQuery().min(column));
  }

  max(column) {
    return getValue(this.prepareQuery().max(column));
  }

  sum(column) {
    return getValue(this.prepareQuery().sum(column));
  }

  avg(column) {
    return getValue(this.prepareQuery().avg(column));
  }

  pluck(column) {
    return this.prepareQuery().pluck(column);
  }

  single(attributes = {}) {
    if (!isEmpty(attributes)) {
      return this.filter(attributes).single();
    }

    return new SingleRowQuery(this.modelClass, this.filters);
  }

  first(attributes = {}) {
    return this.single(attributes).limit(1);
  }

  eval() {
    const fluorite = this.modelClass.fluorite;
    return this
      .prepareQuery()
      .select()
      .then(rows => rows.map(row => fluorite.wrapModel(row, this.modelClass)));
  }

  [Symbol.asyncIterator]() {
    const modelClass = this.modelClass;
    const stream = this
      .prepareQuery()
      .select()
      .stream();

    return async function* asyncIterator() {
      for await (const rowData of new StreamToAsync(stream)) {
        yield modelClass.fluorite.wrapModel(rowData, modelClass);
      }
    };
  }
}
