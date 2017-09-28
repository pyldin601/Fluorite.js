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

import { find } from 'lodash';
import { SingleRowQuery, MultipleRowsQuery } from './query';
import * as unsafe from './util/unsafe';

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

    this.foreignKey = foreignKey;
    this.foreignKeyTarget = foreignKeyTarget;
  }

  query(callback) {
    return new SingleRowQuery(this.modelClass, [...this.filters, callback], this.relationNames);
  }

  including(...relationNames) {
    return new SingleRowQuery(
      this.modelClass, this.filters, [...this.relationNames, ...relationNames],
    );
  }

  async extractRelatedData(rows, relationName, models, nestedRelations) {
    const that = this;
    const ids = rows.map(row => row[that.foreignKey]);

    let query = this.modelClass.objects
      .filter({ id__in: ids });

    if (nestedRelations) {
      query = query.including(nestedRelations);
    }

    const relatedModels = await query;

    models.map((model) => {
      const relatedModel = find(
        relatedModels,
        m => unsafe.eq(m.get(that.foreignKeyTarget), model.id),
      );
      return model.setRelatedData(relationName, relatedModel);
    });

    return rows;
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
    this.foreignKey = foreignKey;
  }

  query(callback) {
    return new MultipleRowsQuery(this.modelClass, [...this.filters, callback], this.relationNames);
  }

  including(...relationNames) {
    return new MultipleRowsQuery(
      this.modelClass, this.filters, [...this.relationNames, ...relationNames],
    );
  }

  async extractRelatedData(rows, relationName, models, nestedRelations) {
    const that = this;
    const ids = rows.map(row => row.id);

    let query = this.modelClass.objects
      .filter({ [`${this.foreignKey}__in`]: ids });

    if (nestedRelations) {
      query = query.including(nestedRelations);
    }

    const relatedModels = await query;

    models.map((model) => {
      const filteredModels = relatedModels.filter(
        m => unsafe.eq(m.get(that.foreignKey), model.id),
      );
      return model.setRelatedData(relationName, filteredModels);
    });

    return rows;
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
    this.pivotTableName = pivotTableName;
    this.thisForeignKey = thisForeignKey;
    this.thatForeignKey = thatForeignKey;
    this.thatForeignKeyTarget = thatForeignKeyTarget;
  }

  query(callback) {
    return new MultipleRowsQuery(this.modelClass, [...this.filters, callback], this.relationNames);
  }

  including(...relationNames) {
    return new MultipleRowsQuery(
      this.modelClass, this.filters, [...this.relationNames, ...relationNames],
    );
  }

  async extractRelatedData(rows, relationName, models, nestedRelations) {
    const that = this;
    const ids = rows.map(row => row.id);

    let query = this.modelClass
      .query(qb => (
        qb
          .innerJoin(
            that.pivotTableName,
            `${that.pivotTableName}.${that.thatForeignKey}`,
            `${that.modelClass.table}.${that.thatForeignKeyTarget}`,
          )
          .whereIn(`${that.pivotTableName}.${that.thatForeignKey}`, ids)
          .select(`${that.pivotTableName}.${that.thatForeignKey} as __pivot_related_id`)
      ));

    if (nestedRelations) {
      query = query.including(nestedRelations);
    }

    const relatedModels = await query;

    models.map((model) => {
      const filteredModels = relatedModels.filter(
        m => unsafe.eq(m.get('__pivot_related_id'), model.id),
      );
      return model.setRelatedData(relationName, filteredModels);
    });

    return rows;
  }
}
