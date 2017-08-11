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

import { pickBy, isNil, last, isEmpty, sortBy } from 'lodash';
import Query from './query';
import { NotFoundError } from './error';

export default (knex) => class Model {
  static table = null;
  static idAttribute = 'id';
  static scope = {
    first: (qb) => qb.offset(0).limit(1),
  };

  static get knex() {
    return knex;
  }

  constructor(attributes = {}, storedAttributes = {}) {
    this.attributes = attributes;
    this.storedAttributes = storedAttributes;
  }

  get id() {
    return this.attributes[this.constructor.idAttribute];
  }

  get attributesWithoutId() {
    return pickBy(this.attributes, (value, key) => {
      return key !== this.constructor.idAttribute;
    });
  }

  get updatedAttributes() {
    return pickBy(this.attributesWithoutId, (value, key) => {
      return value !== this.storedAttributes[key];
    });
  }

  get isNew() {
    return isNil(this.id);
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
      throw new NotFoundError(`Can't remove new entity`);
    }

    return this.constructor.knex(this.constructor.table)
      .where(this.constructor.idAttribute, this.id)
      .delete();
  }

  async insert() {
    const ids = await this.constructor
      .knex(this.constructor.table)
      .insert(this.attributesWithoutId, this.constructor.idAttribute);
    const lastId = last(ids);
    this.attributes[this.constructor.idAttribute] = lastId;
    return lastId;
  }

  async update() {
    const updatedAttributes = this.updatedAttributes;
    if (isEmpty(updatedAttributes)) {
      return;
    }
    return this.constructor
      .knex(this.constructor.table)
      .update(updatedAttributes)
      .where({ [this.constructor.idAttribute]: this.id });
  }

  serialize() {
    return this.attributes;
  }

  hasMany(relatedClass, foreignKey, foreignKeyTarget) {
    const fk = foreignKey || `${this.constructor.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || this.constructor.idAttribute;
    return new Query(relatedClass).filter({ [fk]: this.get(fkt) });
  }

  belongsTo(relatedClass, foreignKey, foreignKeyTarget) {
    const fk = foreignKey || `${relatedClass.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || relatedClass.idAttribute;
    return new Query(relatedClass).filter({ [fkt]: this.get(fk) });
  }

  belongsToMany(
    relatedClass,
    pivotTableName,
    thisForeignKey,
    thatForeignKey,
    thisForeignKeyTarget,
    thatForeignKeyTarget,
  ) {
    const pivotTn = pivotTableName || sortBy([this.constructor.table, relatedClass.table]).join('_');
    const thisFk = thisForeignKey || `${this.constructor.name.toLowerCase()}_id`;
    const thatFk = thatForeignKey || `${relatedClass.name.toLowerCase()}_id`;
    const thisFkt = thisForeignKeyTarget || this.constructor.idAttribute;
    const thatFkt = thatForeignKeyTarget || relatedClass.idAttribute;

    return new Query(relatedClass)
      .query(q => q
        .innerJoin(pivotTn, `${pivotTn}.${thatFk}`, `${relatedClass.table}.${thatFkt}`)
        .select(`${relatedClass.table}.*`)
        .where({ [`${pivotTn}.${thisFk}`]: this.get(thisFkt) }),
      );
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
