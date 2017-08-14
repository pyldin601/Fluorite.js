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
  constructor(modelClass, knex = undefined) {
    this.modelClass = modelClass;
    this.knexQuery = knex || modelClass.knex(modelClass.table);

    return new Proxy(this, {
      get(target, property) {
        if (property in target) {
          return target[property];
        }

        if (property in target.modelClass.scopes) {
          const scope = target.modelClass.scopes[property];
          return (...args) => scope(target, ...args);
        }

        return undefined;
      },
    });
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
    return new Query(
      this.modelClass,
      createUniqueQuery(this.knexQuery, callback),
    );
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

  async get(id) {
    return this.filter({ [this.modelClass.idAttribute]: id }).one();
  }

  async getOrCreate(attributes, defaults = {}) {
    try {
      return await this.query(q => q.where(attributes)).one();
    } catch (e) {
      if (e instanceof this.modelClass.NotFoundError) {
        return this.create({ ...defaults, ...attributes });
      }
      throw e;
    }
  }

  async one() {
    const rows = await this.knexQueryTransacting.select();

    if (rows.length === 0) {
      throw new this.modelClass.NotFoundError('Entity not found');
    }

    if (rows.length > 1) {
      throw new this.modelClass.IntegrityError('More than one entity returned');
    }

    return wrap(first(rows), this.modelClass);
  }

  all() {
    return this.knexQueryTransacting
      .select()
      .then(rows => rows.map(row => wrap(row, this.modelClass)));
  }

  pluck(column) {
    return this.knexQueryTransacting.pluck(column);
  }

  async update(attributes) {
    await this.knexQueryTransacting.update(attributes);
  }

  async remove() {
    await this.knexQueryTransacting.delete();
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
}
