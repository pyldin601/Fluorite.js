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

import { SingleRowQuery, MultipleRowsQuery } from './query';

export const BELONGS_TO_RELATION = 'belongsTo';
export const HAS_MANY_RELATION = 'hasMany';
export const BELONGS_TO_MANY_RELATION = 'belongsToMany';

export class BelongsTo extends SingleRowQuery {
  constructor(
    sourceEntity,
    relatedClass,
    foreignKey,
    foreignKeyTarget,
  ) {
    super(relatedClass, [qb => qb.where({ [foreignKeyTarget]: sourceEntity.get(foreignKey) })]);
    this.relationType = BELONGS_TO_RELATION;
  }

  query(callback) {
    return new SingleRowQuery(this.modelClass, [...this.filters, callback]);
  }
}

export class HasMany extends MultipleRowsQuery {
  constructor(
    sourceEntity,
    relatedClass,
    foreignKey,
    foreignKeyTarget,
  ) {
    super(relatedClass, [qb => qb.where({ [foreignKey]: sourceEntity.get(foreignKeyTarget) })]);
    this.relationType = HAS_MANY_RELATION;
  }

  query(callback) {
    return new MultipleRowsQuery(this.modelClass, [...this.filters, callback]);
  }
}

export class BelongsToMany extends MultipleRowsQuery {
  constructor(
    sourceEntity,
    relatedClass,
    pivotTableName,
    thisForeignKey,
    thatForeignKey,
    thisForeignKeyTarget,
    thatForeignKeyTarget,
  ) {
    super(relatedClass, [qb => qb
      .innerJoin(
        pivotTableName,
        `${pivotTableName}.${thatForeignKey}`,
        `${relatedClass.table}.${thatForeignKeyTarget}`,
      )
      .select(`${relatedClass.table}.*`)
      .where({ [`${pivotTableName}.${thisForeignKey}`]: sourceEntity.get(thisForeignKeyTarget) }),
    ]);
    this.relationType = BELONGS_TO_MANY_RELATION;
  }

  query(callback) {
    return new MultipleRowsQuery(this.modelClass, [...this.filters, callback]);
  }
}
