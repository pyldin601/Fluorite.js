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

import { sortBy } from 'lodash';
import Query from './query';

export class BelongsTo extends Query {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const fk = foreignKey || `${relatedClass.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || relatedClass.idAttribute;
    return this.filter({ [fkt]: this.sourceEntity.get(fk) });
  }
}

export class HasMany extends Query {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const fk = foreignKey || `${sourceEntity.constructor.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || sourceEntity.constructor.idAttribute;
    return this.filter({ [fk]: this.sourceEntity.get(fkt) });
  }
}

export class BelongsToMany extends Query {
  constructor(
    sourceEntity,
    relatedClass,
    pivotTableName,
    thisForeignKey,
    thatForeignKey,
    thisForeignKeyTarget,
    thatForeignKeyTarget,
  ) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const pivotTn = pivotTableName || sortBy([this.sourceEntity.constructor.table, relatedClass.table]).join('_');
    const thisFk = thisForeignKey || `${this.sourceEntity.constructor.name.toLowerCase()}_id`;
    const thatFk = thatForeignKey || `${relatedClass.name.toLowerCase()}_id`;
    const thisFkt = thisForeignKeyTarget || this.sourceEntity.constructor.idAttribute;
    const thatFkt = thatForeignKeyTarget || relatedClass.idAttribute;

    return this
      .query(q => q
        .innerJoin(pivotTn, `${pivotTn}.${thatFk}`, `${relatedClass.table}.${thatFkt}`)
        .select(`${relatedClass.table}.*`)
        .where({ [`${pivotTn}.${thisFk}`]: this.sourceEntity.get(thisFkt) }),
      );
  }
}
