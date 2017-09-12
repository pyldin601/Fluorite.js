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

import { first, isEmpty, flatMap } from 'lodash';
import StreamToAsync from 'stream-to-async-iterator';
import filter from './filter';

const relatedRegExp = /^__rel(\d+)__col(\d+)$/;

const getValue = qb => (
  qb.first().then(row => first(Object.values(row)))
);

class BaseQuery {
  constructor(modelClass, filters = []) {
    this.modelClass = modelClass;
    this.filters = filters;
    this.fluorite = modelClass.fluorite;
    this.transaction = this.fluorite.transaction;

    this.relMap = this.buildRelationMap();

    this.applyScopes();

    this.then = this.modelClass.fluorite.ns.bind(this.then);
  }

  applyScopes() {
    for (const property of Object.keys(this.modelClass.scopes)) {
      const scope = this.modelClass.scopes[property];
      this[property] = (...args) => scope(this, ...args);
    }
  }

  buildRelationMap() {
    const table = this.modelClass.table;
    const columns = this.modelClass.columns;
    return [
      { table, columns },
    ];
  }

  makeModel(rowData) {
    const deflated = this.deflateRowData(rowData);
    const modelData = deflated[this.modelClass.table];
    return this.fluorite.wrapModel(modelData, this.modelClass);
  }

  buildSelect() {
    return flatMap(
      this.relMap,
      ({ table, columns }, tableIndex) => (
        columns.map((column, columnIndex) => (
          `${table}.${column} as __rel${tableIndex}__col${columnIndex}`
        ))
      ),
    );
  }

  deflateRowData(rowData) {
    return Object.keys(rowData).reduce((acc, key) => {
      const [, tableIndex, columnIndex] = key.match(relatedRegExp);
      const relation = this.relMap[tableIndex];
      if (relation.table in acc) {
        return {
          ...acc,
          [relation.table]: {
            ...acc[relation.table],
            [this.relMap[tableIndex].columns[columnIndex]]: rowData[key],
          },
        };
      }

      return {
        ...acc,
        [relation.table]: {
          [this.relMap[tableIndex].columns[columnIndex]]: rowData[key],
        },
      };
    }, {});
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
    const select = this.buildSelect();
    const query = this.prepareQuery();

    query.clearSelect();
    query.select(select);

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
    const query = this.prepareQuery();
    const select = this.buildSelect();

    query.clearSelect();
    query.select(select);

    return query.then(rows => rows.map(row => this.makeModel(row)));
  }

  [Symbol.asyncIterator]() {
    const query = this.prepareQuery();
    const select = this.buildSelect();

    query.clearSelect();
    query.select(select);

    return async function* asyncIterator() {
      for await (const rowData of new StreamToAsync(query.stream())) {
        yield this.makeModel(rowData);
      }
    }.bind(this);
  }
}
