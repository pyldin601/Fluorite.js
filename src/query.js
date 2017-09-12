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

import { first, last, isEmpty, flatMap } from 'lodash';
import StreamToAsync from 'stream-to-async-iterator';
import filter from './filter';
import { createModelRelationsMap } from './eager';

const relatedRegExp = /^__rel(\d+)__col(\d+)$/;

const getValue = qb => (
  qb.first().then(row => first(Object.values(row)))
);

class BaseQuery {
  constructor(modelClass, filters = [], relationNames = []) {
    this.modelClass = modelClass;
    this.filters = filters;
    this.relationNames = relationNames;
    this.fluorite = modelClass.fluorite;
    this.transaction = this.fluorite.transaction;

    this.relationsMap = createModelRelationsMap(modelClass, this.relationNames);

    this.applyScopes();

    this.then = this.modelClass.fluorite.ns.bind(this.then);
  }

  applyScopes() {
    for (const property of Object.keys(this.modelClass.scopes)) {
      const scope = this.modelClass.scopes[property];
      this[property] = (...args) => scope(this, ...args);
    }
  }

  makeModel(rowData) {
    const deflated = this.extractRelationData(rowData, this.relationsMap, []);
    return this.fluorite.wrapModel(deflated, this.modelClass);
  }

  prepareQuery() {
    const knexQuery = this.knexQueryTransacting();
    this.filters.forEach(f => f(knexQuery));
    return knexQuery;
  }

  knexQueryTransacting() {
    if (this.transaction.isTransacting()) {
      return this.transaction.currentTransaction().from(this.modelClass.table);
    }

    return this.modelClass.knex(this.modelClass.table);
  }

  filter(attributes) {
    return this.query(filter(attributes, this.modelClass.table));
  }

  query(callback) {
    return new this.constructor(
      this.modelClass, [...this.filters, callback], this.relationNames,
    );
  }

  including(...relationNames) {
    return new this.constructor(
      this.modelClass, this.filters, [...this.relationNames, ...relationNames],
    );
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

  applyRelation(query, relationData, path, parent = null) {
    const { table, columns, type, relations } = relationData;

    if (path.length === 0) {
      const toSelect = columns.map(column => `${table}.${column} as __${column}`);
      query.select(toSelect);
    } else if (type === 'belongsTo') {
      const toSelect = columns.map(column => `${table}.${column} as __${path.join('__')}__${column}`);
      query.select(toSelect);
      query.innerJoin(table, `${table}.id`, `${parent.table}.${last(path)}_id`);
    }

    Object.keys(relations).forEach(
      relationName => this.applyRelation(
        query, relations[relationName], [...path, relationName], relationData,
      ),
    );
  }

  extractRelationData(rowData, { columns, type }, path) {
    return columns.reduce(
      (acc, column) => ({
        ...acc,
        [column]: rowData[`__${column}`],
      }),
      {},
    );
  }

  applyRelationsToQuery(query) {
    query.clearSelect();
    this.applyRelation(query, this.relationsMap, []);
  }

  async prepareSelectQuery() {
    const query = this.prepareQuery();
    this.applyRelationsToQuery(query);
    console.log(query.toString());
    return query;
  }

  // eslint-disable-next-line class-methods-use-this
  async eval() {
    throw new Error('Method not implemented');
  }

  async then(resolve, reject) {
    try {
      const result = await this.eval();
      return resolve(result);
    } catch (e) {
      return reject(e);
    }
  }
}

export class SingleRowQuery extends BaseQuery {
  async eval() {
    const query = this.prepareSelectQuery();

    const rows = (await query);

    if (rows.length === 1) {
      return this.makeModel(first(rows));
    }

    if (rows.length === 0) {
      throw new this.modelClass.NotFoundError('Entity not found');
    }

    throw new this.modelClass.IntegrityError('More than one entity returned');
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

  async eval() {
    const query = this.prepareSelectQuery();

    return query.then(rows => rows.map(row => this.makeModel(row)));
  }

  [Symbol.asyncIterator]() {
    const query = this.prepareSelectQuery();

    return async function* asyncIterator() {
      for await (const rowData of new StreamToAsync(query.stream())) {
        yield this.makeModel(rowData);
      }
    }.bind(this);
  }
}
