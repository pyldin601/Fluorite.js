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
  constructor(modelClass, knexQuery = modelClass.knex(modelClass.table)) {
    this.modelClass = modelClass;
    this.knexQuery = knexQuery;

    for (const property of Object.keys(modelClass.scopes)) {
      const scope = modelClass.scopes[property];
      this[property] = (...args) => scope(this, ...args);
    }
  }

  clone() {
    return new this.constructor(
      this.modelClass,
      this.knexQuery.clone(),
    );
  }

  get knexQueryTransacting() {
    if (this.modelClass.fluorite.transaction.isTransacting) {
      return this.knexQuery.clone().transacting(
        this.modelClass.fluorite.transaction.currentTransaction,
      );
    }
    return this.knexQuery;
  }

  filter(attributes) {
    return this.query(q => filter(q, attributes));
  }

  query(callback) {
    const clone = this.clone();
    callback(clone.knexQuery);
    return clone;
  }

  toString() {
    return this.knexQuery.toString();
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
    await this.knexQueryTransacting.update(attributes);
  }

  async remove() {
    await this.knexQueryTransacting.delete();
  }
}

export class SingleRowQuery extends BaseQuery {
  async then(resolve, reject) {
    return this.eval().then(resolve, reject);
  }

  eval() {
    const fluorite = this.modelClass.fluorite;
    return this
      .knexQueryTransacting
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
  async then(resolve, reject) {
    return this.eval().then(resolve, reject);
  }

  count(column = null) {
    return getValue(this.knexQueryTransacting.count(column));
  }

  min(column) {
    return getValue(this.knexQueryTransacting.min(column));
  }

  max(column) {
    return getValue(this.knexQueryTransacting.max(column));
  }

  sum(column) {
    return getValue(this.knexQueryTransacting.sum(column));
  }

  avg(column) {
    return getValue(this.knexQueryTransacting.avg(column));
  }

  pluck(column) {
    return this.knexQueryTransacting.pluck(column);
  }

  single(attributes) {
    if (!isEmpty(attributes)) {
      return this.filter(attributes).first();
    }

    return new SingleRowQuery(this.modelClass, this.knexQuery);
  }

  first(attributes) {
    return this.single(attributes).limit(1);
  }

  eval() {
    const fluorite = this.modelClass.fluorite;
    return this
      .knexQueryTransacting
      .select()
      .then(rows => rows.map(row => fluorite.wrapModel(row, this.modelClass)));
  }

  [Symbol.asyncIterator]() {
    const modelClass = this.modelClass;
    const stream = this
      .knexQueryTransacting
      .select()
      .stream();

    return async function* asyncIterator() {
      for await (const rowData of new StreamToAsync(stream)) {
        yield modelClass.fluorite.wrapModel(rowData, modelClass);
      }
    };
  }
}
