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

import { pickBy, isNil, last, isEmpty } from 'lodash';
import Query from './query';
import errors from './errors';
import { BelongsTo, BelongsToMany, HasMany } from './relations';

export default fluorite => class Model {
  static NotFoundError = class NotFoundError extends errors.NotFoundError { };
  static IntegrityError = class IntegrityError extends errors.IntegrityError { };

  static table = null;
  static idAttribute = 'id';
  static scopes = {
  };

  static get fluorite() {
    return fluorite;
  }

  static get knex() {
    return this.fluorite.knex;
  }

  static create(attrs) {
    return new this(attrs);
  }

  constructor(attributes, previousAttributes = {}) {
    this.attributes = attributes;
    this.previousAttributes = previousAttributes;
  }

  get id() {
    return this.attributes[this.constructor.idAttribute];
  }

  get attributesWithoutId() {
    return pickBy(this.attributes, (value, key) => (
      key !== this.constructor.idAttribute
    ));
  }

  get updatedAttributes() {
    return pickBy(this.attributesWithoutId, (value, key) => (
      value !== this.previousAttributes[key]
    ));
  }

  get isNew() {
    return isNil(this.id);
  }

  createKnexQuery() {
    const query = this.constructor.knex(this.constructor.table);
    if (this.constructor.fluorite.transaction.isTransacting) {
      query.transacting(this.constructor.fluorite.transaction.currentTransaction);
    }
    return query;
  }

  get(name) {
    return this.attributes[name];
  }

  set(name, value) {
    if (name instanceof Object) {
      this.attributes = { ...this.attributes, ...name };
    }
    this.attributes[name] = value;
  }

  async save() {
    if (this.isNew) {
      return this.insert();
    }
    return this.update();
  }

  async remove() {
    if (this.isNew) {
      throw new this.constructor.NotFoundError('Can\'t remove new entity');
    }

    return this.createKnexQuery()
      .where(this.constructor.idAttribute, this.id)
      .delete();
  }

  async insert() {
    const ids = await this.createKnexQuery().insert(
      this.attributesWithoutId,
      this.constructor.idAttribute,
    );
    const lastId = last(ids);
    this.attributes[this.constructor.idAttribute] = lastId;
    this.previousAttributes = this.attributes;
    return lastId;
  }

  async update() {
    const updatedAttributes = this.updatedAttributes;
    if (isEmpty(updatedAttributes)) {
      return;
    }
    await this.createKnexQuery()
      .update(updatedAttributes)
      .where({ [this.constructor.idAttribute]: this.id });
    this.previousAttributes = this.attributes;
  }

  serialize() {
    return this.attributes;
  }

  hasMany(relatedClass, foreignKey, foreignKeyTarget) {
    return new HasMany(this, relatedClass, foreignKey, foreignKeyTarget);
  }

  belongsTo(relatedClass, foreignKey, foreignKeyTarget) {
    return new BelongsTo(this, relatedClass, foreignKey, foreignKeyTarget);
  }

  belongsToMany(
    relatedClass,
    pivotTableName,
    thisForeignKey,
    thatForeignKey,
    thisForeignKeyTarget,
    thatForeignKeyTarget,
  ) {
    return new BelongsToMany(
      this,
      relatedClass,
      pivotTableName,
      thisForeignKey,
      thatForeignKey,
      thisForeignKeyTarget,
      thatForeignKeyTarget,
    );
  }

  toJSON() {
    return this.serialize();
  }

  static get objects() {
    return new Query(this);
  }
};
